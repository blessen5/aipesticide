import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.models import Field, Zone, Plant
from app.services.demo_data_service import seed_demo_data

def add_zones():
    db = SessionLocal()
    field = db.query(Field).first()
    if not field:
        seed_demo_data(db, force_reseed=True)
        field = db.query(Field).first()

    # Create 4 zones if not exist
    zones = db.query(Zone).filter(Zone.field_id == field.id).all()
    if not zones:
        z1 = Zone(field_id=field.id, name="Zone A (North)", latitude=30.9015, longitude=75.8570, crop="Wheat", status="HEALTHY")
        z2 = Zone(field_id=field.id, name="Zone B (East Hotspot)", latitude=30.9010, longitude=75.8580, crop="Wheat", status="HIGH")
        z3 = Zone(field_id=field.id, name="Zone C (South)", latitude=30.9005, longitude=75.8573, crop="Wheat", status="MODERATE")
        z4 = Zone(field_id=field.id, name="Zone D (West)", latitude=30.9010, longitude=75.8565, crop="Wheat", status="LOW")
        db.add_all([z1, z2, z3, z4])
        db.commit()
        zones = [z1, z2, z3, z4]
    
    # Update plants to assign zone_id if missing (we don't strictly need it for UI unless used, but UI might need zone)
    print("Zones updated!")

if __name__ == "__main__":
    add_zones()
