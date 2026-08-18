"""
Demo Mode router — POST /api/demo/reset and GET /api/demo/status
Provides a clean, forced re-seed of the SIH 2026 demo dataset.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Field, Plant, Prescription, SprayEvent, Detection
from app.services.demo_data_service import seed_demo_data

demo_router = APIRouter(tags=["Demo Mode"])


@demo_router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db)):
    """
    POST /api/demo/reset

    Wipes all existing data and re-seeds the SIH 2026 demo dataset from scratch.
    Call this before each live demonstration to ensure a clean, known state.
    Safe to call multiple times.
    """
    result = seed_demo_data(db, force_reseed=True)
    return result


@demo_router.get("/demo/status")
def demo_status(db: Session = Depends(get_db)):
    """
    GET /api/demo/status

    Returns current counts and the primary demo field info.
    Useful for frontend to know what demo field ID to use.
    """
    field = db.query(Field).first()
    return {
        "demo_ready": field is not None,
        "demo_field_id": field.id if field else None,
        "demo_field_name": field.name if field else None,
        "fields_count": db.query(Field).count(),
        "plants_count": db.query(Plant).count(),
        "detections_count": db.query(Detection).count(),
        "prescriptions_count": db.query(Prescription).count(),
        "spray_events_count": db.query(SprayEvent).count(),
    }
