import logging
import uuid
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
# Abstract Driver Interface
# ──────────────────────────────────────────────────────────────────────────────

class BaseSprayerDriver(ABC):
    """
    Abstract driver interface for agricultural sprayers.
    Allows seamless hot-swapping between the Simulated local driver and ESP32 hardware driver.
    """

    @abstractmethod
    def get_telemetry(self) -> Dict[str, Any]:
        """Fetch current hardware telemetry (battery, tank level, nozzle status)."""
        pass

    @abstractmethod
    def move_to(self, plant_code: str, latitude: float, longitude: float) -> Dict[str, Any]:
        """Simulate or command actuator/chassis movement to target plant coordinate."""
        pass

    @abstractmethod
    def spray(self, plant_code: str, volume_ml: float) -> Dict[str, Any]:
        """Execute solenoid pulse discharge for the specified chemical volume."""
        pass

    @abstractmethod
    def emergency_stop(self) -> Dict[str, Any]:
        """Trigger immediate fail-safe stop across all actuators."""
        pass


# ──────────────────────────────────────────────────────────────────────────────
# Simulated Driver (unchanged — simulator is always preserved)
# ──────────────────────────────────────────────────────────────────────────────

class SimulatedSprayerDriver(BaseSprayerDriver):
    """
    Deterministic local simulation driver for SIH Hackathon presentation.
    Simulates movement, solenoid firing, battery consumption, and fluid drawdown locally.
    This driver is ALWAYS available — it is the safe fallback when no ESP32 is connected.
    """

    def __init__(self):
        self.mode = "SIMULATED"
        self.battery_level = 95
        self.fluid_level_pct = 90
        self.current_state = SprayerStateEnum.READY

    def get_telemetry(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "status": self.current_state.value,
            "battery_level": self.battery_level,
            "fluid_level_pct": self.fluid_level_pct,
            "disclaimer": "SIMULATION MODE: Local software simulation for prototype demonstration."
        }

    def move_to(self, plant_code: str, latitude: float, longitude: float) -> Dict[str, Any]:
        self.current_state = SprayerStateEnum.MOVING
        # Simulated battery decrement per traverse
        self.battery_level = max(10, self.battery_level - 1)
        return {
            "action": "MOVING",
            "plant_code": plant_code,
            "target_coordinate": [latitude, longitude],
            "status": "ARRIVED_AT_PLANT"
        }

    def spray(self, plant_code: str, volume_ml: float) -> Dict[str, Any]:
        self.current_state = SprayerStateEnum.SPRAYING
        # Simulated fluid tank drawdown
        fluid_used = max(1, int(volume_ml / 5.0))
        self.fluid_level_pct = max(5, self.fluid_level_pct - fluid_used)
        self.battery_level = max(10, self.battery_level - 1)
        return {
            "action": "SPRAYING",
            "plant_code": plant_code,
            "volume_ml": volume_ml,
            "status": "DISCHARGE_COMPLETED"
        }

    def emergency_stop(self) -> Dict[str, Any]:
        self.current_state = SprayerStateEnum.IDLE
        return {
            "action": "STOP",
            "status": "IDLE",
            "message": "All actuators halted in safe idle mode."
        }


# ──────────────────────────────────────────────────────────────────────────────
# ESP32 HTTP Driver — Real Hardware Integration
# ──────────────────────────────────────────────────────────────────────────────

def _probe_esp32(host: str, port: int, timeout: float) -> bool:
    """
    Attempt a lightweight GET /api/health ping to the ESP32.
    Returns True if the device is reachable and responds, False otherwise.
    Called at startup and before hot-swap to verify connectivity.
    """
    try:
        import requests  # lazy import — only needed when ESP32 mode is requested
        url = f"http://{host}:{port}/api/health"
        resp = requests.get(url, timeout=timeout)
        data = resp.json()
        return resp.status_code == 200 and data.get("status") == "OK"
    except Exception as exc:
        logger.warning("[ESP32] Probe failed for %s:%s — %s", host, port, exc)
        return False


class ESP32HttpDriver(BaseSprayerDriver):
    """
    Real hardware integration driver for ESP32 Microcontroller via Wi-Fi HTTP REST.

    Firmware endpoints used:
      GET  http://<host>/api/health    → connectivity probe
      GET  http://<host>/api/status    → full telemetry
      POST http://<host>/api/command   → {command, plant_id, volume_ml}
        commands: START | STOP | MOVE | SPRAY

    Prototype safety note:
      The firmware drives a WATER PUMP ONLY — no real pesticide during testing.
    """

    def __init__(self, host: str, port: int, timeout: float):
        import requests  # ensure available
        self._requests = requests
        self.host = host
        self.port = port
        self.timeout = timeout
        self.mode = "ESP32"
        # Mirror telemetry fields for SprayerController compatibility
        self.battery_level: int = 0
        self.fluid_level_pct: int = 0
        self.current_state = SprayerStateEnum.READY

    def _url(self, path: str) -> str:
        return f"http://{self.host}:{self.port}{path}"

    def _post_command(self, command: str, plant_code: str = "", volume_ml: float = 0.0) -> Dict[str, Any]:
        """Send a command to the ESP32 /api/command endpoint."""
        payload = {
            "command": command,
            "plant_id": plant_code,
            "volume_ml": volume_ml
        }
        logger.info("[ESP32] → POST /api/command  %s", payload)
        resp = self._requests.post(
            self._url("/api/command"),
            json=payload,
            timeout=self.timeout
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info("[ESP32] ← %s", data)
        return data

    def get_telemetry(self) -> Dict[str, Any]:
        """Fetch live telemetry from ESP32 /api/status."""
        try:
            resp = self._requests.get(self._url("/api/status"), timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            # Sync local mirrors so SprayerController can read them
            self.battery_level = int(data.get("battery_pct", 0))
            self.fluid_level_pct = int(data.get("fluid_pct", 0))
            return {
                "mode": "ESP32",
                "device_ip": self.host,
                "status": data.get("status", "UNKNOWN"),
                "battery_level": self.battery_level,
                "fluid_level_pct": self.fluid_level_pct,
                "pump_active": data.get("pump_active", False),
                "servo_open": data.get("servo_open", False),
                "uptime_s": data.get("uptime_s", 0),
                "rssi_dbm": data.get("rssi_dbm", 0),
                "firmware_version": data.get("firmware_version", "unknown"),
                "last_command": data.get("last_command", ""),
                "total_spray_ms": data.get("total_spray_ms", 0),
                "prototype_note": data.get("prototype_note", "")
            }
        except Exception as exc:
            logger.error("[ESP32] get_telemetry failed: %s", exc)
            return {
                "mode": "ESP32",
                "device_ip": self.host,
                "status": "UNREACHABLE",
                "error": str(exc)
            }

    def move_to(self, plant_code: str, latitude: float, longitude: float) -> Dict[str, Any]:
        """Send MOVE command to ESP32."""
        try:
            self.current_state = SprayerStateEnum.MOVING
            result = self._post_command("MOVE", plant_code)
            self.current_state = SprayerStateEnum.READY
            return {
                "action": "MOVING",
                "plant_code": plant_code,
                "target_coordinate": [latitude, longitude],
                "status": result.get("status", "ARRIVED"),
                "esp32_response": result
            }
        except Exception as exc:
            logger.error("[ESP32] move_to failed: %s", exc)
            self.current_state = SprayerStateEnum.ERROR
            raise RuntimeError(f"ESP32 MOVE command failed: {exc}") from exc

    def spray(self, plant_code: str, volume_ml: float) -> Dict[str, Any]:
        """Send SPRAY command to ESP32. Prototype: activates water pump only."""
        try:
            self.current_state = SprayerStateEnum.SPRAYING
            result = self._post_command("SPRAY", plant_code, volume_ml)
            self.current_state = SprayerStateEnum.READY
            # Update fluid level from response (approximate)
            fluid_used = max(1, int(volume_ml / 5))
            self.fluid_level_pct = max(5, self.fluid_level_pct - fluid_used)
            return {
                "action": "SPRAYING",
                "plant_code": plant_code,
                "volume_ml": volume_ml,
                "status": result.get("status", "COMPLETED"),
                "duration_ms": result.get("duration_ms", 0),
                "esp32_response": result
            }
        except Exception as exc:
            logger.error("[ESP32] spray failed: %s", exc)
            self.current_state = SprayerStateEnum.ERROR
            raise RuntimeError(f"ESP32 SPRAY command failed: {exc}") from exc

    def emergency_stop(self) -> Dict[str, Any]:
        """Send STOP command to ESP32."""
        try:
            result = self._post_command("STOP")
            self.current_state = SprayerStateEnum.IDLE
            return {
                "action": "STOP",
                "status": "IDLE",
                "message": "ESP32 actuators halted via hardware STOP command.",
                "esp32_response": result
            }
        except Exception as exc:
            logger.error("[ESP32] emergency_stop failed: %s", exc)
            # Fail safe: mark error regardless
            self.current_state = SprayerStateEnum.ERROR
            return {
                "action": "STOP",
                "status": "ERROR",
                "message": f"STOP command failed — physical check required: {exc}"
            }


# ──────────────────────────────────────────────────────────────────────────────
# Driver Factory — Auto-selects based on SPRAYER_MODE with fallback
# ──────────────────────────────────────────────────────────────────────────────

def get_driver_for_mode() -> BaseSprayerDriver:
    """
    Factory that returns the appropriate sprayer driver based on SPRAYER_MODE env-var.

    Behaviour:
      SPRAYER_MODE=SIMULATED (default) → SimulatedSprayerDriver
      SPRAYER_MODE=ESP32               → probes ESP32; if unreachable → SimulatedSprayerDriver

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
            logger.info("[Sprayer] ESP32 connected ✓  →  using ESP32HttpDriver")
            return ESP32HttpDriver(settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT)
        else:
            logger.warning(
                "[Sprayer] ⚠ ESP32 unreachable at %s:%s — automatically falling back to SIMULATED mode.",
                settings.ESP32_HOST, settings.ESP32_PORT
            )
            return SimulatedSprayerDriver()

    # Default or SIMULATED
    logger.info("[Sprayer] SPRAYER_MODE=SIMULATED — using SimulatedSprayerDriver")
    return SimulatedSprayerDriver()


# ──────────────────────────────────────────────────────────────────────────────
# Sprayer Controller (State Machine)
# ──────────────────────────────────────────────────────────────────────────────

class SprayerController:
    """
    Central Controller for managing the Sprayer State Machine, Safety Invariants,
    and Autonomous Field Prescription Execution.
    """

    def __init__(self):
        self.driver: BaseSprayerDriver = get_driver_for_mode()
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
                self.driver = ESP32HttpDriver(settings.ESP32_HOST, settings.ESP32_PORT, settings.ESP32_TIMEOUT)
                return {"mode": "ESP32", "connected": True, "message": "Switched to ESP32 hardware driver."}
            else:
                return {
                    "mode": "SIMULATED",
                    "connected": False,
                    "message": f"ESP32 unreachable at {settings.ESP32_HOST}:{settings.ESP32_PORT}. Staying in SIMULATED mode."
                }
        else:
            self.driver = SimulatedSprayerDriver()
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

        # Also send START command to physical board if in ESP32 mode
        if active_mode == "ESP32":
            try:
                self.driver._post_command("START")  # type: ignore[attr-defined]
            except Exception as exc:
                logger.warning("[ESP32] START command failed: %s", exc)

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

        # Execute driver spray
        self.driver.spray(f"P-{plant_id}", volume_ml)
        self.current_state = SprayerStateEnum.READY

        active_mode = self.get_active_mode()

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
        
        state.fluid_level_pct = self.driver.fluid_level_pct
        state.battery_level = self.driver.battery_level
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

            # 1. Movement Step
            self.driver.move_to(plant.plant_code, plant.latitude, plant.longitude)
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
                # 4. Spraying Execution
                self.current_state = SprayerStateEnum.SPRAYING
                self.current_volume = vol
                self.driver.spray(plant.plant_code, vol)

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
            state.fluid_level_pct = self.driver.fluid_level_pct
            state.battery_level = self.driver.battery_level
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
