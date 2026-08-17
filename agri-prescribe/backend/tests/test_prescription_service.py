import pytest
from app.services.prescription_service import PrescriptionEngine, prescription_engine, PROTOTYPE_DISCLAIMER
from app.services.sprayer_service import SprayerController
from app.database import Base, SessionLocal
from app.models.models import Plant, Field, User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def test_prescription_engine_prototype_rules():
    engine = PrescriptionEngine()

    # 1. HEALTHY -> 0 ml
    res_healthy = engine.generate(
        severity="HEALTHY",
        disease="Healthy",
        infection_percentage=0.0,
        crop_type="Wheat",
        plant_id=1
    )
    assert res_healthy["recommended_action"] == "NO_TREATMENT"
    assert res_healthy["spray_level"] == "NO_TREATMENT"
    assert res_healthy["recommended_volume_ml"] == 0.0
    assert res_healthy["priority"] == "NONE"
    assert "no treatment" in res_healthy["reason"].lower() or "prohibited" in res_healthy["reason"].lower()
    assert res_healthy["disclaimer"] == PROTOTYPE_DISCLAIMER

    # 2. LOW -> 5 ml
    res_low = engine.generate(
        severity="LOW",
        disease="Leaf Spot",
        infection_percentage=15.0,
        crop_type="Cotton",
        plant_id=2
    )
    assert res_low["recommended_action"] == "TARGETED_TREATMENT"
    assert res_low["spray_level"] == "LOW"
    assert res_low["recommended_volume_ml"] == 5.0
    assert res_low["priority"] == "LOW"
    assert "Leaf Spot" in res_low["reason"]
    assert "Cotton" in res_low["reason"]

    # 3. MODERATE -> 10 ml
    res_mod = engine.generate(
        severity="MODERATE",
        disease="Powdery Mildew",
        infection_percentage=35.0,
        crop_type="Tomato",
        plant_id=3
    )
    assert res_mod["recommended_action"] == "TARGETED_TREATMENT"
    assert res_mod["spray_level"] == "MEDIUM"
    assert res_mod["recommended_volume_ml"] == 10.0
    assert res_mod["priority"] == "MEDIUM"
    assert "Powdery Mildew" in res_mod["reason"]

    # 4. HIGH -> 20 ml
    res_high = engine.generate(
        severity="HIGH",
        disease="Leaf Blight",
        infection_percentage=75.0,
        crop_type="Potato",
        plant_id=4
    )
    assert res_high["recommended_action"] == "TARGETED_TREATMENT"
    assert res_high["spray_level"] == "HIGH"
    assert res_high["recommended_volume_ml"] == 20.0
    assert res_high["priority"] == "HIGH"
    assert "Leaf Blight" in res_high["reason"]


def test_safety_healthy_plants_never_sprayed():
    engine = PrescriptionEngine()

    # Even if someone accidentally requests high infection but marks severity as HEALTHY
    res = engine.generate(
        severity="HEALTHY",
        disease="Healthy Crop",
        infection_percentage=0.0,
        crop_type="Rice",
        plant_id=10
    )
    assert res["recommended_volume_ml"] == 0.0
    assert res["recommended_action"] == "NO_TREATMENT"
    assert res["priority"] == "NONE"
    assert res["spray_level"] == "NO_TREATMENT"


def test_configurable_prescription_rules():
    custom_rules = {
        "HEALTHY": {
            "recommended_action": "NO_TREATMENT",
            "spray_level": "NO_TREATMENT",
            "recommended_volume_ml": 0.0,
            "priority": "NONE",
            "reason_template": "Healthy"
        },
        "LOW": {
            "recommended_action": "TARGETED_TREATMENT",
            "spray_level": "LOW",
            "recommended_volume_ml": 7.5,
            "priority": "LOW",
            "reason_template": "Custom low rule"
        },
        "MODERATE": {
            "recommended_action": "TARGETED_TREATMENT",
            "spray_level": "MEDIUM",
            "recommended_volume_ml": 15.0,
            "priority": "MEDIUM",
            "reason_template": "Custom mod rule"
        },
        "HIGH": {
            "recommended_action": "TARGETED_TREATMENT",
            "spray_level": "HIGH",
            "recommended_volume_ml": 30.0,
            "priority": "HIGH",
            "reason_template": "Custom high rule"
        }
    }
    custom_engine = PrescriptionEngine(custom_rules=custom_rules)
    res_mod = custom_engine.generate(severity="MODERATE", disease="Rust", infection_percentage=40.0)
    assert res_mod["recommended_volume_ml"] == 15.0


def test_sprayer_controller_rejects_zero_volume_and_healthy_plants():
    # Setup test in-memory DB
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    Session = sessionmaker(bind=test_engine)
    db = Session()

    user = User(name="Test Farmer", email="test@agri.in")
    db.add(user)
    db.flush()
    field = Field(name="Field 1", crop_type="Wheat", area=1.0, latitude=30.0, longitude=75.0, user_id=user.id)
    db.add(field)
    db.flush()

    healthy_plant = Plant(field_id=field.id, plant_code="P-HEALTHY", latitude=30.0, longitude=75.0, crop_type="Wheat", status="HEALTHY", severity="HEALTHY")
    infected_plant = Plant(field_id=field.id, plant_code="P-INFECTED", latitude=30.0, longitude=75.0, crop_type="Wheat", status="MODERATE", severity="MODERATE")
    db.add_all([healthy_plant, infected_plant])
    db.commit()

    # 1. Attempting 0 ml spray should raise ValueError
    with pytest.raises(ValueError, match="Spray volume must be greater than 0 mL"):
        SprayerController.trigger_spray(db=db, plant_id=infected_plant.id, volume_ml=0.0)

    # 2. Attempting to spray a healthy plant should raise ValueError
    with pytest.raises(ValueError, match="Safety restriction: Plant .* is HEALTHY and cannot receive a spray command"):
        SprayerController.trigger_spray(db=db, plant_id=healthy_plant.id, volume_ml=10.0)

    # 3. Spraying infected plant with valid volume succeeds
    result = SprayerController.trigger_spray(db=db, plant_id=infected_plant.id, volume_ml=10.0)
    assert result["status"] == "COMPLETED"
    assert result["volume_ml"] == 10.0
