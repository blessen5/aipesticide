import uuid
from datetime import datetime
from typing import Optional, Union
from sqlalchemy.orm import Session
from app.models.models import SprayEvent, SprayerState, Plant

class SprayerController:
    """
    Interface for controlling Precision Sprayers (Simulated & ESP32 hardware).
    """

    @staticmethod
    def get_status(db: Session) -> dict:
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
            "status": state.status,
            "mode": state.mode,
            "battery_level": state.battery_level,
            "fluid_level_pct": state.fluid_level_pct
        }

    @staticmethod
    def trigger_spray(
        db: Session,
        plant_id: Union[int, str],
        volume_ml: float,
        mode: str = "SIMULATED"
    ) -> dict:
        command_id = f"CMD-SP-{uuid.uuid4().hex[:8].upper()}"
        ts = datetime.utcnow()

        # Parse plant_id if int
        int_plant_id: Optional[int] = None
        if isinstance(plant_id, int):
            int_plant_id = plant_id
        elif isinstance(plant_id, str) and plant_id.isdigit():
            int_plant_id = int(plant_id)

        # Enforce Safety Rule: Healthy plants or 0 mL volume must NEVER be sprayed
        if volume_ml <= 0.0:
            raise ValueError("Invalid spray volume: Spray volume must be greater than 0 mL. Healthy plants must not receive chemical spray.")

        # Verify plant if valid integer
        if int_plant_id:
            plant = db.query(Plant).filter(Plant.id == int_plant_id).first()
            if plant:
                if plant.status.upper() == "HEALTHY" or plant.severity.upper() == "HEALTHY":
                    raise ValueError(f"Safety restriction: Plant {plant.plant_code} is HEALTHY and cannot receive a spray command.")
                plant.status = "TREATED"

        # Create new SprayEvent
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
            state = SprayerState(
                status="READY",
                mode="SIMULATED",
                battery_level=95,
                fluid_level_pct=90,
                last_updated=ts
            )
            db.add(state)
        
        # Deduct fluid and battery
        fluid_deduction = max(1, int(volume_ml / 10.0))
        state.fluid_level_pct = max(5, state.fluid_level_pct - fluid_deduction)
        state.battery_level = max(10, state.battery_level - 1)
        state.last_updated = ts

        db.commit()
        db.refresh(spray_event)

        return {
            "command_id": command_id,
            "status": "COMPLETED",
            "plant_id": plant_id,
            "volume_ml": volume_ml,
            "timestamp": ts.isoformat(),
            "mode": spray_event.mode
        }

sprayer_controller = SprayerController()
