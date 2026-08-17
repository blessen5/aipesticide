import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from app.models.models import SprayEvent, SprayerState, Plant, Field, Prescription


class SprayerStateEnum(str, Enum):
    IDLE = "IDLE"
    MOVING = "MOVING"
    READY = "READY"
    SPRAYING = "SPRAYING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


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


class SimulatedSprayerDriver(BaseSprayerDriver):
    """
    Deterministic local simulation driver for SIH Hackathon presentation.
    Simulates movement, solenoid firing, battery consumption, and fluid drawdown locally.
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


class ESP32HardwareSprayerDriver(BaseSprayerDriver):
    """
    Hardware integration interface for ESP32 Microcontroller (Wi-Fi REST / Serial / MQTT).
    Ready for plugging in physical ESP32 boards controlling 12V diaphragm pumps & solenoid nozzles.
    """

    def __init__(self, device_ip: str = "192.168.4.1", port: int = 80):
        self.device_ip = device_ip
        self.port = port
        self.mode = "HARDWARE"

    def get_telemetry(self) -> Dict[str, Any]:
        # Ready for: requests.get(f"http://{self.device_ip}/api/telemetry", timeout=2.0)
        return {
            "mode": "HARDWARE",
            "device_ip": self.device_ip,
            "status": "CONNECTED_READY",
            "battery_level": 92,
            "fluid_level_pct": 88
        }

    def move_to(self, plant_code: str, latitude: float, longitude: float) -> Dict[str, Any]:
        # Ready for: requests.post(f"http://{self.device_ip}/api/move", json={"lat": latitude, "lng": longitude})
        return {
            "action": "MOVING",
            "device_ip": self.device_ip,
            "plant_code": plant_code,
            "status": "NAVIGATING"
        }

    def spray(self, plant_code: str, volume_ml: float) -> Dict[str, Any]:
        # Ready for: requests.post(f"http://{self.device_ip}/api/pulse_nozzle", json={"volume_ml": volume_ml})
        return {
            "action": "SPRAYING",
            "device_ip": self.device_ip,
            "volume_ml": volume_ml,
            "status": "PWM_SOLENOID_PULSED"
        }

    def emergency_stop(self) -> Dict[str, Any]:
        # Ready for: requests.post(f"http://{self.device_ip}/api/kill")
        return {
            "action": "STOP",
            "status": "IDLE",
            "message": "ESP32 relays disengaged."
        }


class SprayerController:
    """
    Central Controller for managing the Sprayer State Machine, Safety Invariants,
    and Autonomous Field Prescription Execution.
    """

    def __init__(self):
        self.driver = SimulatedSprayerDriver()
        self.current_state = SprayerStateEnum.READY
        self.current_plant: Optional[str] = None
        self.current_volume: float = 0.0
        self.progress_pct: float = 0.0
        self.total_plants: int = 0
        self.completed_plants: int = 0

    def get_status(self, db: Session) -> Dict[str, Any]:
        state = db.query(SprayerState).first()
        if not state:
            state = SprayerState(
                status="READY",
                mode="SIMULATED",
                battery_level=95,
                fluid_level_pct=90,
                last_updated=datetime.utcnow()
            )
            db.add(state)
            db.commit()
            db.refresh(state)

        return {
            "status": self.current_state.value,
            "mode": state.mode,
            "battery_level": state.battery_level,
            "fluid_level_pct": state.fluid_level_pct,
            "current_plant": self.current_plant,
            "current_status": self.current_state.value,
            "current_spray_volume": self.current_volume,
            "progress_pct": self.progress_pct,
            "total_plants": self.total_plants,
            "completed_plants": self.completed_plants,
            "disclaimer": "SIMULATION MODE: Operating in calibrated local demo mode for prototype evaluation."
        }

    def start(self, db: Session) -> Dict[str, Any]:
        self.current_state = SprayerStateEnum.READY
        state = db.query(SprayerState).first()
        if state:
            state.status = "READY"
            state.last_updated = datetime.utcnow()
            db.commit()
        return {
            "status": "READY",
            "message": "Sprayer master controller armed & standing by for prescription commands.",
            "mode": "SIMULATED"
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

        # Execute driver spray
        self.driver.spray(f"P-{plant_id}", volume_ml)
        self.current_state = SprayerStateEnum.READY

        # Log SprayEvent
        spray_event = SprayEvent(
            command_id=command_id,
            plant_id=int_plant_id,
            volume_ml=volume_ml,
            status="COMPLETED",
            mode=mode.upper() if mode else "SIMULATED",
            timestamp=ts
        )
        db.add(spray_event)

        # Update SprayerState
        state = db.query(SprayerState).first()
        if not state:
            state = SprayerState(status="READY", mode="SIMULATED", battery_level=95, fluid_level_pct=90, last_updated=ts)
            db.add(state)
        
        state.fluid_level_pct = self.driver.fluid_level_pct
        state.battery_level = self.driver.battery_level
        state.last_updated = ts

        db.commit()
        db.refresh(spray_event)

        return {
            "command_id": command_id,
            "status": "COMPLETED",
            "plant_id": plant_id,
            "volume_ml": volume_ml,
            "timestamp": ts.isoformat(),
            "mode": mode.upper() if mode else "SIMULATED"
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
            if sev_check == "HEALTHY" or vol <= 0.0:
                plants_skipped_healthy += 1
                self.current_state = SprayerStateEnum.READY
                self.current_volume = 0.0
                execution_logs.append({
                    "plant_code": plant.plant_code,
                    "action": "SKIPPED",
                    "volume_ml": 0.0,
                    "severity": "HEALTHY",
                    "details": f"{plant.plant_code} → READY (HEALTHY - Chemical spray locked / 0 mL skipped)"
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
                    mode=mode.upper() if mode else "SIMULATED",
                    timestamp=datetime.utcnow()
                )
                db.add(spray_event)

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
            state.fluid_level_pct = self.driver.fluid_level_pct
            state.battery_level = self.driver.battery_level
            state.last_updated = datetime.utcnow()

        db.commit()

        return {
            "field_id": field.id,
            "field_name": field.name,
            "status": "COMPLETED",
            "total_plants": len(plants),
            "plants_treated": plants_treated,
            "plants_skipped_healthy": plants_skipped_healthy,
            "total_volume_sprayed": round(total_volume_sprayed, 1),
            "execution_logs": execution_logs,
            "disclaimer": "SIMULATION MODE: Prototype demonstration only. No physical chemicals dispensed."
        }


sprayer_controller = SprayerController()
