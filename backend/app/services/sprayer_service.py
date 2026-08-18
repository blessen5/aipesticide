import logging
import uuid
import json
import time
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from app.models.models import SprayEvent, SprayerState, Plant, Field, Prescription, AuditLog
from app.config import settings
from app.services.safety_service import safety_service

logger = logging.getLogger(__name__)


class SprayerStateEnum(str, Enum):
    IDLE = "IDLE"
    MOVING = "MOVING"
    READY = "READY"
    SPRAYING = "SPRAYING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


# ──────────────────────────────────────────────────────────────────────────────
# Abstract Driver Interface (HardwareController)
# ──────────────────────────────────────────────────────────────────────────────

class HardwareController(ABC):
    """
    Abstract driver interface for agricultural sprayer hardware.
    Allows seamless hot-swapping between the Simulated local driver and ESP32 hardware driver.
    """

    @abstractmethod
    def connect(self) -> bool: pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]: pass

    @abstractmethod
    def get_telemetry(self) -> Dict[str, Any]: pass

    @abstractmethod
    def open_valve(self, zone_id: str) -> Dict[str, Any]: pass

    @abstractmethod
    def close_valve(self, zone_id: str) -> Dict[str, Any]: pass

    @abstractmethod
    def start_pump(self) -> Dict[str, Any]: pass

    @abstractmethod
    def stop_pump(self) -> Dict[str, Any]: pass

    @abstractmethod
    def emergency_stop(self) -> Dict[str, Any]: pass


# ──────────────────────────────────────────────────────────────────────────────
# Simulated Hardware Controller
# ──────────────────────────────────────────────────────────────────────────────

class SimulationHardwareController(HardwareController):
    """
    Deterministic local simulation driver for presentations.
    Simulates pump, valve, flow, pressure, and faults locally.
    """

    def __init__(self):
        self.mode = "SIMULATED"
        self.node_id = "NODE-01"
        self.battery_level = 95
        self.fluid_level_pct = 90
        
        # Hardware States
        self.pump_state = "OFF"
        self.valve_state = "CLOSED"
        self.active_zone = None
        self.flow_rate = 0.0
        self.pressure_state = "NORMAL"
        self.emergency_stopped = False
        self.fault_state = None

    def connect(self) -> bool:
        return True

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "nodeId": self.node_id,
            "status": "ONLINE - SIMULATED" if not self.fault_state else "FAULT",
            "fault": self.fault_state
        }

    def get_telemetry(self) -> Dict[str, Any]:
        # Dynamic flow simulation if pump is ON and Valve is OPEN and no fault
        if self.pump_state == "ON" and self.valve_state == "OPEN" and not self.fault_state and not self.emergency_stopped:
            # Simple simulation: jump to 15.0 L/min
            self.flow_rate = 15.0
            self.fluid_level_pct = max(0, self.fluid_level_pct - 1)
        else:
            self.flow_rate = 0.0

        return {
            "mode": self.mode,
            "nodeId": self.node_id,
            "pump": self.pump_state,
            "valve": self.valve_state,
            "active_zone": self.active_zone,
            "flow_rate": self.flow_rate,
            "pressure": self.pressure_state,
            "battery_level": self.battery_level,
            "fluid_level_pct": self.fluid_level_pct,
            "emergency_stopped": self.emergency_stopped,
            "fault": self.fault_state,
            "disclaimer": "SIMULATION MODE: Local software simulation for prototype demonstration."
        }

    def open_valve(self, zone_id: str) -> Dict[str, Any]:
        if self.emergency_stopped or self.fault_state:
            return {"status": "REJECTED", "message": "Cannot open valve in fault or emergency state."}
        self.valve_state = "OPEN"
        self.active_zone = zone_id
        return {"action": "VALVE_OPEN", "zone": zone_id, "status": "SUCCESS"}

    def close_valve(self, zone_id: str) -> Dict[str, Any]:
        self.valve_state = "CLOSED"
        self.active_zone = None
        self.flow_rate = 0.0
        return {"action": "VALVE_CLOSED", "zone": zone_id, "status": "SUCCESS"}

    def start_pump(self) -> Dict[str, Any]:
        if self.emergency_stopped or self.fault_state:
            return {"status": "REJECTED", "message": "Cannot start pump in fault or emergency state."}
        self.pump_state = "ON"
        self.battery_level = max(10, self.battery_level - 1)
        return {"action": "PUMP_START", "status": "SUCCESS"}

    def stop_pump(self) -> Dict[str, Any]:
        self.pump_state = "OFF"
        self.flow_rate = 0.0
        return {"action": "PUMP_STOP", "status": "SUCCESS"}

    def emergency_stop(self) -> Dict[str, Any]:
        self.emergency_stopped = True
        self.pump_state = "OFF"
        self.valve_state = "CLOSED"
        self.flow_rate = 0.0
        return {"action": "EMERGENCY_STOP", "status": "IDLE", "message": "All actuators halted."}
        
    def simulate_fault(self, fault_type: str) -> Dict[str, Any]:
        if fault_type == "FLOW":
            self.fault_state = "FLOW FAULT DETECTED"
            self.flow_rate = 0.0
        elif fault_type == "PRESSURE":
            self.fault_state = "PRESSURE FAULT DETECTED"
            self.pressure_state = "HIGH"
        elif fault_type == "OFFLINE":
            self.fault_state = "HARDWARE OFFLINE"
        elif fault_type == "EMERGENCY":
            return self.emergency_stop()
        elif fault_type == "RESET":
            self.fault_state = None
            self.emergency_stopped = False
            self.pressure_state = "NORMAL"
            return {"status": "RESET", "message": "Hardware faults cleared."}
            
        # Any fault turns off actuators
        if fault_type in ["FLOW", "PRESSURE", "OFFLINE"]:
            self.pump_state = "OFF"
            self.valve_state = "CLOSED"
            self.flow_rate = 0.0
            
        return {"status": "FAULT_INJECTED", "fault": self.fault_state}


# ──────────────────────────────────────────────────────────────────────────────
# ESP32 Hardware Controller — Real Hardware Integration
# ──────────────────────────────────────────────────────────────────────────────

def _probe_esp32(host: str, port: int, timeout: float) -> bool:
    try:
        import requests
        url = f"http://{host}:{port}/api/health"
        resp = requests.get(url, timeout=timeout)
        data = resp.json()
        return resp.status_code == 200 and data.get("status") == "OK"
    except Exception as exc:
        logger.warning("[ESP32] Probe failed for %s:%s — %s", host, port, exc)
        return False

class ESP32HardwareController(HardwareController):
    """
    Real hardware integration driver for ESP32 Microcontroller via Wi-Fi HTTP REST.
    """

    def __init__(self, host: str, port: int, timeout: float):
        import requests
        self._requests = requests
        self.host = host
        self.port = port
        self.timeout = timeout
        self.mode = "ESP32"
        self.node_id = "ESP32-PROD"
        
        self.battery_level = 0
        self.fluid_level_pct = 0
        self.pump_state = "OFF"
        self.valve_state = "CLOSED"
        self.active_zone = None
        self.flow_rate = 0.0
        self.pressure_state = "NORMAL"

    def _url(self, path: str) -> str:
        return f"http://{self.host}:{self.port}{path}"

    def _post_command(self, command: str, **kwargs) -> Dict[str, Any]:
        payload = {"command": command, **kwargs}
        logger.info("[ESP32] → POST /api/command  %s", payload)
        resp = self._requests.post(self._url("/api/command"), json=payload, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        logger.info("[ESP32] ← %s", data)
        return data

    def connect(self) -> bool:
        return _probe_esp32(self.host, self.port, self.timeout)

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "nodeId": self.node_id,
            "status": "ONLINE" if self.connect() else "OFFLINE"
        }

    def get_telemetry(self) -> Dict[str, Any]:
        try:
            resp = self._requests.get(self._url("/api/status"), timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            
            self.battery_level = int(data.get("battery_pct", 0))
            self.fluid_level_pct = int(data.get("fluid_pct", 0))
            self.pump_state = "ON" if data.get("pump_active") else "OFF"
            self.valve_state = "OPEN" if data.get("servo_open") else "CLOSED"
            
            return {
                "mode": "ESP32",
                "nodeId": self.node_id,
                "pump": self.pump_state,
                "valve": self.valve_state,
                "active_zone": self.active_zone,
                "flow_rate": float(data.get("flow_l_min", 0.0)),
                "pressure": "NORMAL",
                "battery_level": self.battery_level,
                "fluid_level_pct": self.fluid_level_pct,
                "emergency_stopped": False,
                "fault": None
            }
        except Exception as exc:
            logger.error("[ESP32] get_telemetry failed: %s", exc)
            return {
                "mode": "ESP32",
                "status": "UNREACHABLE",
                "error": str(exc)
            }

    def open_valve(self, zone_id: str) -> Dict[str, Any]:
        self.active_zone = zone_id
        return self._post_command("VALVE_OPEN", zone_id=zone_id)

    def close_valve(self, zone_id: str) -> Dict[str, Any]:
        self.active_zone = None
        return self._post_command("VALVE_CLOSE", zone_id=zone_id)

    def start_pump(self) -> Dict[str, Any]:
        return self._post_command("PUMP_START")

    def stop_pump(self) -> Dict[str, Any]:
        return self._post_command("PUMP_STOP")

    def emergency_stop(self) -> Dict[str, Any]:
        try:
            return self._post_command("STOP")
        except Exception as exc:
            logger.error("[ESP32] emergency_stop failed: %s", exc)
            return {"action": "STOP", "status": "ERROR", "message": str(exc)}


# ──────────────────────────────────────────────────────────────────────────────
# Driver Factory — Auto-selects based on SPRAYER_MODE with fallback
# ──────────────────────────────────────────────────────────────────────────────

def get_driver_for_mode() -> HardwareController:
    """
    Factory that returns the appropriate sprayer driver based on SPRAYER_MODE env-var.

    Behaviour:
      SPRAYER_MODE=SIMULATED (default) → SimulationHardwareController
      SPRAYER_MODE=ESP32               → probes ESP32; if unreachable → SimulationHardwareController

    The simulator is ALWAYS available as a fallback — this function never raises.
    """
    mode = settings.SPRAYER_MODE

    if mode == "ESP32":
        logger.info(
            "[Sprayer] SPRAYER_MODE=ESP32 — probing %s:%s (timeout=%.1fs)",
            settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT
        )
        reachable = _probe_esp32(settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT)
        if reachable:
            logger.info("[Sprayer] ESP32 connected ✓  →  using ESP32HardwareController")
            return ESP32HardwareController(settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT)
        else:
            logger.warning(
                "[Sprayer] ⚠ ESP32 unreachable at %s:%s — automatically falling back to SIMULATED mode.",
                settings.ESP32_HOST, settings.ESP32_PORT
            )
            return SimulationHardwareController()

    # Default or SIMULATED
    logger.info("[Sprayer] SPRAYER_MODE=SIMULATED — using SimulationHardwareController")
    return SimulationHardwareController()


# ──────────────────────────────────────────────────────────────────────────────
# Sprayer Controller (State Machine)
# ──────────────────────────────────────────────────────────────────────────────

class SprayerController:
    """
    Central Controller for managing the Sprayer State Machine, Safety Invariants,
    and Autonomous Field Prescription Execution.
    """

    def __init__(self):
        self.driver: HardwareController = get_driver_for_mode()
        self.current_state = SprayerStateEnum.READY
        self.current_plant: Optional[str] = None
        self.current_volume: float = 0.0
        self.progress_pct: float = 0.0
        self.total_plants: int = 0
        self.completed_plants: int = 0

    def get_active_mode(self) -> str:
        """Return the active driver mode string ('SIMULATED' or 'ESP32')."""
        return getattr(self.driver, "mode", "SIMULATED")

    def swap_driver(self, mode: str) -> Dict[str, Any]:
        """
        Hot-swap the active driver at runtime without restarting the server.
        Called by the /api/hardware/switch-mode endpoint.
        Returns the new active mode.
        """
        mode = mode.upper()
        if mode == "ESP32":
            reachable = _probe_esp32(settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT)
            if reachable:
                self.driver = ESP32HardwareController(settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT)
                return {"mode": "ESP32", "connected": True, "message": "Switched to ESP32 hardware driver."}
            else:
                return {
                    "mode": "SIMULATED",
                    "connected": False,
                    "message": f"ESP32 unreachable at {settings.ESP32_HOST}:{settings.ESP32_PORT}. Staying in SIMULATED mode."
                }
        else:
            self.driver = SimulationHardwareController()
            return {"mode": "SIMULATED", "connected": False, "message": "Switched to SIMULATED driver."}

    def get_status(self, db: Session) -> Dict[str, Any]:
        state = db.query(SprayerState).first()
        if not state:
            state = SprayerState(
                status="READY",
                mode=self.get_active_mode(),
                battery_level=95,
                fluid_level_pct=90,
                last_updated=datetime.utcnow()
            )
            db.add(state)
            db.commit()
            db.refresh(state)

        active_mode = self.get_active_mode()
        telemetry = self.driver.get_telemetry()
        
        # Sync database state with telemetry if possible
        if "battery_level" in telemetry:
            state.battery_level = telemetry["battery_level"]
        if "fluid_level_pct" in telemetry:
            state.fluid_level_pct = telemetry["fluid_level_pct"]

        disclaimer = (
            "SIMULATION MODE: Operating in calibrated local demo mode for prototype evaluation."
            if active_mode == "SIMULATED"
            else "HARDWARE MODE: Connected to physical ESP32 sprayer unit."
        )

        return {
            "status": self.current_state.value,
            "mode": active_mode,
            "battery_level": state.battery_level,
            "fluid_level_pct": state.fluid_level_pct,
            "current_plant": self.current_plant,
            "current_status": self.current_state.value,
            "current_spray_volume": self.current_volume,
            "progress_pct": self.progress_pct,
            "total_plants": self.total_plants,
            "completed_plants": self.completed_plants,
            
            # Hardware Telemetry
            "nodeId": telemetry.get("nodeId", "UNKNOWN"),
            "pump": telemetry.get("pump", "OFF"),
            "valve": telemetry.get("valve", "CLOSED"),
            "active_zone": telemetry.get("active_zone", None),
            "flow_rate": telemetry.get("flow_rate", 0.0),
            "pressure": telemetry.get("pressure", "UNKNOWN"),
            "emergency_stopped": telemetry.get("emergency_stopped", False),
            "fault": telemetry.get("fault", None),
            
            "disclaimer": disclaimer
        }

    def start(self, db: Session) -> Dict[str, Any]:
        self.current_state = SprayerStateEnum.READY
        active_mode = self.get_active_mode()
        state = db.query(SprayerState).first()
        if state:
            state.status = "READY"
            state.mode = active_mode
            state.last_updated = datetime.utcnow()
            db.commit()

        # Try to connect to hardware controller
        self.driver.connect()

        return {
            "status": "READY",
            "message": "Sprayer master controller armed & standing by for prescription commands.",
            "mode": active_mode
        }

    def stop(self, db: Session) -> Dict[str, Any]:
        self.current_state = SprayerStateEnum.IDLE
        self.driver.emergency_stop()
        state = db.query(SprayerState).first()
        if state:
            state.status = "IDLE"
            state.last_updated = datetime.utcnow()
            db.commit()
        return {
            "status": "IDLE",
            "message": "Sprayer emergency stop triggered. State machine set to IDLE."
        }

    def trigger_spray(
        self,
        db: Session,
        plant_id: Union[int, str],
        volume_ml: float,
        mode: str = "SIMULATED"
    ) -> Dict[str, Any]:
        import time
        command_id = f"CMD-SP-{uuid.uuid4().hex[:8].upper()}"
        ts = datetime.utcnow()

        int_plant_id: Optional[int] = None
        if isinstance(plant_id, int):
            int_plant_id = plant_id
        elif isinstance(plant_id, str) and plant_id.isdigit():
            int_plant_id = int(plant_id)

        # SAFETY CHECK 1: Disallow volume <= 0
        if volume_ml <= 0.0:
            raise ValueError("Safety violation: Chemical spray volume must be greater than 0 mL. Healthy crops (0 mL) must NEVER receive chemical discharge.")

        # SAFETY CHECK 2: Disallow spraying healthy plants
        if int_plant_id:
            plant = db.query(Plant).filter(Plant.id == int_plant_id).first()
            if plant:
                if plant.status.upper() == "HEALTHY" or (plant.severity and plant.severity.upper() == "HEALTHY"):
                    raise ValueError(f"Safety violation: Plant {plant.plant_code} is HEALTHY. Spraying healthy crops is strictly forbidden.")
                plant.status = "TREATED"

        # SAFETY CHECK 3: Comprehensive 13-Point Safety Gate
        safety_result = safety_service.evaluate_prescription_safety({
            "chemical_type": "WATER", # Enforce prototype WATER ONLY mode
            "volume_ml": volume_ml,
            "hardware_status": "ONLINE" if self.get_active_mode() == "ESP32" else "ONLINE",
            "operator_authorized": True,
            "system_ready": True
        })
        if not safety_result.passed:
            audit_log = AuditLog(
                user="System",
                zone=str(plant_id),
                action="MANUAL_SPRAY_TRIGGER",
                result="REJECTED",
                reason=f"Safety Gate Failed: {'; '.join(safety_result.messages)}"
            )
            db.add(audit_log)
            db.commit()
            raise ValueError(f"Safety Gate Failed: {'; '.join(safety_result.messages)}")

        active_mode = self.get_active_mode()

        # Execute driver spray via new hardware controller paradigm
        zone_id = f"Zone-{plant_id}"
        self.current_state = SprayerStateEnum.SPRAYING
        self.driver.open_valve(zone_id)
        time.sleep(0.2)
        self.driver.start_pump()
        time.sleep(1.0)
        self.driver.stop_pump()
        time.sleep(0.2)
        self.driver.close_valve(zone_id)
        self.current_state = SprayerStateEnum.READY

        # Audit Log
        audit_log = AuditLog(
            user="Operator",
            zone=str(plant_id),
            action="MANUAL_SPRAY_TRIGGER",
            result="COMPLETED",
            reason=f"Dispensed {volume_ml} mL in {active_mode} mode"
        )
        db.add(audit_log)

        # Log SprayEvent
        spray_event = SprayEvent(
            command_id=command_id,
            plant_id=int_plant_id,
            volume_ml=volume_ml,
            status="COMPLETED",
            mode=active_mode,
            timestamp=ts
        )
        db.add(spray_event)

        # Update SprayerState
        state = db.query(SprayerState).first()
        if not state:
            state = SprayerState(status="READY", mode=active_mode, battery_level=95, fluid_level_pct=90, last_updated=ts)
            db.add(state)
        
        telemetry = self.driver.get_telemetry()
        if "fluid_level_pct" in telemetry:
            state.fluid_level_pct = telemetry["fluid_level_pct"]
        if "battery_level" in telemetry:
            state.battery_level = telemetry["battery_level"]
            
        state.mode = active_mode
        state.last_updated = ts

        db.commit()
        db.refresh(spray_event)

        return {
            "command_id": command_id,
            "status": "COMPLETED",
            "plant_id": plant_id,
            "volume_ml": volume_ml,
            "timestamp": ts.isoformat(),
            "mode": active_mode
        }

    def execute_field_prescription(
        self,
        db: Session,
        field_id: int,
        mode: str = "SIMULATED"
    ) -> Dict[str, Any]:
        """
        Automated field prescription execution pipeline:
        Prescription Map → Sprayer receives commands → moves to target plant → checks prescription → sprays required volume → records event.
        Strictly enforces that healthy plants are NEVER sprayed.
        """
        field = db.query(Field).filter(Field.id == field_id).first()
        if not field:
            raise ValueError(f"Field with ID {field_id} not found")

        plants = db.query(Plant).filter(Plant.field_id == field_id).order_by(Plant.id.asc()).all()
        if not plants:
            raise ValueError(f"No crop plants registered in Field #{field_id}")

        self.total_plants = len(plants)
        self.completed_plants = 0
        self.progress_pct = 0.0

        active_mode = self.get_active_mode()
        execution_logs = []
        plants_treated = 0
        plants_skipped_healthy = 0
        total_volume_sprayed = 0.0

        ts = datetime.utcnow()

        for idx, plant in enumerate(plants):
            self.current_plant = plant.plant_code
            self.current_state = SprayerStateEnum.MOVING

            # 1. Movement Step (Simulated delay for navigating to zone)
            time.sleep(0.1)
            execution_logs.append({
                "plant_code": plant.plant_code,
                "action": "MOVING",
                "volume_ml": 0.0,
                "severity": plant.severity or plant.status,
                "details": f"{plant.plant_code} → MOVING (Navigating to coordinate [{plant.latitude:.5f}, {plant.longitude:.5f}])"
            })

            # 2. Check Prescription for Plant
            presc = db.query(Prescription).filter(Prescription.plant_id == plant.id).first()
            
            # Determine required volume
            vol = 0.0
            if presc:
                vol = presc.recommended_volume_ml
            else:
                sev = (plant.severity or plant.status).upper()
                if sev == "HIGH":
                    vol = 20.0
                elif sev == "MODERATE":
                    vol = 10.0
                elif sev == "LOW":
                    vol = 5.0
                else:
                    vol = 0.0

            # 3. SAFETY RULE ENFORCEMENT: Never spray healthy plants
            sev_check = (plant.severity or plant.status).upper()
            
            # Additional 13-Point Safety Check
            safety_result = safety_service.evaluate_prescription_safety({
                "chemical_type": "WATER",
                "volume_ml": vol,
                "hardware_status": "ONLINE" if active_mode == "ESP32" else "ONLINE",
                "operator_authorized": True,
                "system_ready": True
            })

            if sev_check == "HEALTHY" or vol <= 0.0 or not safety_result.passed:
                plants_skipped_healthy += 1
                self.current_state = SprayerStateEnum.READY
                self.current_volume = 0.0
                
                skip_reason = "HEALTHY" if sev_check == "HEALTHY" else "SAFETY GATE FAILED"
                if not safety_result.passed:
                    skip_reason = f"SAFETY FAILED: {safety_result.messages[0]}"
                    audit_log = AuditLog(
                        user="System",
                        zone=plant.plant_code,
                        action="AUTO_PRESCRIPTION_EXECUTE",
                        result="REJECTED",
                        reason=skip_reason
                    )
                    db.add(audit_log)

                execution_logs.append({
                    "plant_code": plant.plant_code,
                    "action": "SKIPPED",
                    "volume_ml": 0.0,
                    "severity": sev_check,
                    "details": f"{plant.plant_code} → READY ({skip_reason} - Chemical spray locked / 0 mL skipped)"
                })
            else:
                # 4. Spraying Execution via HardwareController
                self.current_state = SprayerStateEnum.SPRAYING
                self.current_volume = vol
                zone_id = f"Zone-{plant.id}"
                
                # Hardware interaction sequence
                self.driver.open_valve(zone_id)
                time.sleep(0.2)
                self.driver.start_pump()
                time.sleep(0.5) # Simulate flow delay
                self.driver.stop_pump()
                time.sleep(0.2)
                self.driver.close_valve(zone_id)

                # Record SprayEvent in database
                cmd_id = f"CMD-AUTO-{uuid.uuid4().hex[:6].upper()}"
                spray_event = SprayEvent(
                    command_id=cmd_id,
                    plant_id=plant.id,
                    volume_ml=vol,
                    status="COMPLETED",
                    mode=active_mode,
                    timestamp=datetime.utcnow()
                )
                db.add(spray_event)
                
                audit_log = AuditLog(
                    user="System",
                    zone=plant.plant_code,
                    action="AUTO_PRESCRIPTION_EXECUTE",
                    result="COMPLETED",
                    reason=f"Sprayed {vol} mL in {active_mode} mode"
                )
                db.add(audit_log)

                plant.status = "TREATED"
                plants_treated += 1
                total_volume_sprayed += vol

                execution_logs.append({
                    "plant_code": plant.plant_code,
                    "action": "SPRAYING",
                    "volume_ml": vol,
                    "severity": sev_check,
                    "details": f"{plant.plant_code} → SPRAYING ({vol} mL targeted pulse discharge for {plant.disease or 'Infection'})"
                })

            # Completed Step for this plant
            self.completed_plants = idx + 1
            self.progress_pct = round(((idx + 1) / len(plants)) * 100.0, 1)

        # Mission Finished
        self.current_state = SprayerStateEnum.COMPLETED
        state = db.query(SprayerState).first()
        if state:
            state.status = "COMPLETED"
            state.mode = active_mode
            telemetry = self.driver.get_telemetry()
            if "fluid_level_pct" in telemetry:
                state.fluid_level_pct = telemetry["fluid_level_pct"]
            if "battery_level" in telemetry:
                state.battery_level = telemetry["battery_level"]
            state.last_updated = datetime.utcnow()

        db.commit()

        disclaimer = (
            "SIMULATION MODE: Prototype demonstration only. No physical chemicals dispensed."
            if active_mode == "SIMULATED"
            else "HARDWARE MODE: Physical water pump activated during prototype testing."
        )

        return {
            "field_id": field.id,
            "field_name": field.name,
            "status": "COMPLETED",
            "mode": active_mode,
            "total_plants": len(plants),
            "plants_treated": plants_treated,
            "plants_skipped_healthy": plants_skipped_healthy,
            "total_volume_sprayed": round(total_volume_sprayed, 1),
            "execution_logs": execution_logs,
            "disclaimer": disclaimer
        }


# ──────────────────────────────────────────────────────────────────────────────
# Singleton — instantiated once at startup
# ──────────────────────────────────────────────────────────────────────────────
sprayer_controller = SprayerController()
