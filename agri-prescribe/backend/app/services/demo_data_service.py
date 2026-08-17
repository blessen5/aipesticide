import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import User, Field, Plant, Detection, Prescription, SprayEvent, SprayerState
from app.services.prescription_service import prescription_engine

def seed_demo_data(db: Session, force_reseed: bool = False):
    """
    Seeds initial realistic agriculture prototype data with at least 20 plants
    with varied infection levels, detections, prescriptions, and spray history.
    """
    if not force_reseed and db.query(Field).first():
        return {
            "message": "Demo data already exists.",
            "fields_count": db.query(Field).count(),
            "plants_count": db.query(Plant).count(),
            "prescriptions_count": db.query(Prescription).count()
        }

    # If force reseed, clean existing tables
    if force_reseed:
        db.query(SprayEvent).delete()
        db.query(Prescription).delete()
        db.query(Detection).delete()
        db.query(Plant).delete()
        db.query(Field).delete()
        db.query(SprayerState).delete()
        db.query(User).delete()
        db.commit()

    # 1. Create Demo User
    user = User(
        name="Ramesh Patel (Farm Administrator)",
        email="ramesh.patel@agriprescribe.in",
        role="Farmer"
    )
    db.add(user)
    db.flush()

    # 2. Create Realistic Fields
    field1 = Field(
        user_id=user.id,
        name="Ludhiana Green Valley - North Sector",
        crop_type="Wheat",
        area=2.5,
        latitude=30.9010,
        longitude=75.8573
    )
    field2 = Field(
        user_id=user.id,
        name="Nagpur Precision Farm - Sector 3",
        crop_type="Cotton",
        area=4.0,
        latitude=21.1458,
        longitude=79.0882
    )
    field3 = Field(
        user_id=user.id,
        name="Cauvery Delta Paddy Field - Block 1",
        crop_type="Rice",
        area=1.8,
        latitude=10.7870,
        longitude=79.1378
    )

    db.add_all([field1, field2, field3])
    db.flush()

    # 3. Create at least 20 Plants with varied infection levels
    crops_and_diseases = [
        ("Wheat", "Wheat Stripe Rust (Puccinia striiformis)"),
        ("Cotton", "Cotton Bacterial Blight (Xanthomonas)"),
        ("Rice", "Rice Brown Spot (Bipolaris oryzae)"),
        ("Tomato", "Tomato Early Blight (Alternaria solani)"),
        ("Potato", "Potato Late Blight (Phytophthora infestans)")
    ]

    plant_specs = [
        # (field, code, lat_offset, lng_offset, crop, status, inf_pct, disease, severity)
        (field1, "WHEAT-001", 0.0001, 0.0001, "Wheat", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        (field1, "WHEAT-002", 0.0003, 0.0002, "Wheat", "HIGH", 68.5, "Wheat Stripe Rust (Puccinia striiformis)", "HIGH"),
        (field1, "WHEAT-003", 0.0005, 0.0004, "Wheat", "MODERATE", 35.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
        (field1, "WHEAT-004", 0.0002, 0.0006, "Wheat", "LOW", 12.0, "Wheat Stripe Rust (Puccinia striiformis)", "LOW"),
        (field1, "WHEAT-005", 0.0007, 0.0003, "Wheat", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        (field1, "WHEAT-006", 0.0009, 0.0005, "Wheat", "MODERATE", 28.0, "Wheat Stripe Rust (Puccinia striiformis)", "MODERATE"),
        (field1, "WHEAT-007", 0.0004, 0.0008, "Wheat", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),

        (field2, "COTN-001", 0.0001, 0.0002, "Cotton", "HIGH", 75.0, "Cotton Bacterial Blight (Xanthomonas)", "HIGH"),
        (field2, "COTN-002", 0.0004, 0.0003, "Cotton", "LOW", 15.5, "Cotton Bacterial Blight (Xanthomonas)", "LOW"),
        (field2, "COTN-003", 0.0002, 0.0005, "Cotton", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        (field2, "COTN-004", 0.0006, 0.0001, "Cotton", "MODERATE", 42.0, "Cotton Bacterial Blight (Xanthomonas)", "MODERATE"),
        (field2, "COTN-005", 0.0008, 0.0004, "Cotton", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        (field2, "COTN-006", 0.0003, 0.0007, "Cotton", "HIGH", 82.0, "Cotton Bacterial Blight (Xanthomonas)", "HIGH"),
        (field2, "COTN-007", 0.0005, 0.0009, "Cotton", "LOW", 9.0, "Cotton Bacterial Blight (Xanthomonas)", "LOW"),

        (field3, "RICE-001", 0.0002, 0.0001, "Rice", "LOW", 14.0, "Rice Brown Spot (Bipolaris oryzae)", "LOW"),
        (field3, "RICE-002", 0.0005, 0.0003, "Rice", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        (field3, "RICE-003", 0.0001, 0.0004, "Rice", "MODERATE", 31.5, "Rice Brown Spot (Bipolaris oryzae)", "MODERATE"),
        (field3, "RICE-004", 0.0007, 0.0002, "Rice", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        (field3, "RICE-005", 0.0004, 0.0006, "Rice", "HIGH", 64.0, "Rice Brown Spot (Bipolaris oryzae)", "HIGH"),
        (field3, "RICE-006", 0.0008, 0.0005, "Rice", "LOW", 8.5, "Rice Brown Spot (Bipolaris oryzae)", "LOW"),
        (field3, "RICE-007", 0.0003, 0.0008, "Rice", "HEALTHY", 0.0, "Healthy Crop", "HEALTHY"),
        (field3, "RICE-008", 0.0006, 0.0007, "Rice", "MODERATE", 38.0, "Rice Brown Spot (Bipolaris oryzae)", "MODERATE")
    ]

    created_plants = []
    for fld, pcode, dlat, dlng, crp, stat, inf, dis, sev in plant_specs:
        p = Plant(
            field_id=fld.id,
            plant_code=pcode,
            latitude=round(fld.latitude + dlat, 6),
            longitude=round(fld.longitude + dlng, 6),
            crop_type=crp,
            status=stat,
            infection_percentage=inf,
            disease=dis,
            severity=sev,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 10))
        )
        db.add(p)
        created_plants.append(p)

    db.flush()

    # 4. Create Detections, Prescriptions & Spray Events for plants
    sample_images = [
        "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&auto=format&fit=crop"
    ]

    for p in created_plants:
        # Create Detection
        confidence = 0.98 if p.severity == "HEALTHY" else round(random.uniform(0.88, 0.97), 2)
        det = Detection(
            plant_id=p.id,
            image_url=random.choice(sample_images),
            disease=p.disease,
            confidence=confidence,
            infection_percentage=p.infection_percentage,
            severity=p.severity,
            analyzed_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
        )
        db.add(det)

        # Generate Prescription
        prescription_data = prescription_engine.generate(
            severity=p.severity,
            disease=p.disease,
            infection_percentage=p.infection_percentage,
            crop_type=p.crop_type,
            plant_id=p.id
        )

        presc = Prescription(
            plant_id=p.id,
            crop_type=p.crop_type,
            disease=prescription_data["disease"],
            infection_percentage=prescription_data["infection_percentage"],
            severity=prescription_data["severity"],
            recommended_action=prescription_data["recommended_action"],
            spray_level=prescription_data["spray_level"],
            recommended_volume_ml=prescription_data["recommended_volume_ml"],
            priority=prescription_data["priority"],
            reason=prescription_data.get("reason", ""),
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24))
        )
        db.add(presc)

        # If plant has high or moderate infection, create some spray history
        if p.severity in ["MODERATE", "HIGH"] and random.random() > 0.4:
            spray = SprayEvent(
                command_id=f"CMD-DEMO-{p.id:04d}",
                plant_id=p.id,
                volume_ml=prescription_data["recommended_volume_ml"],
                status="COMPLETED",
                mode="SIMULATED",
                timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 12))
            )
            db.add(spray)

    # 5. Initialize Sprayer State
    sprayer_state = SprayerState(
        status="READY",
        mode="SIMULATED",
        battery_level=94,
        fluid_level_pct=88,
        last_updated=datetime.utcnow()
    )
    db.add(sprayer_state)

    db.commit()

    return {
        "message": "Demo data successfully seeded for AgriPrescribe!",
        "fields_count": db.query(Field).count(),
        "plants_count": db.query(Plant).count(),
        "prescriptions_count": db.query(Prescription).count()
    }
