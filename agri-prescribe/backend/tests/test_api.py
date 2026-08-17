import pytest
import os
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from PIL import Image

from app.main import app
from app.database import Base, get_db
from app.models.models import User, Field, Plant, Detection, Prescription, SprayEvent, SprayerState

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_agri_prescribe.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_agri_prescribe.db"):
        try:
            os.remove("./test_agri_prescribe.db")
        except Exception:
            pass

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# 1. Test Health Endpoint
def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "AgriPrescribe API"


# 2. Test Demo Seed Endpoint
def test_seed_demo_data(client):
    response = client.post("/api/demo/seed")
    assert response.status_code == 200
    data = response.json()
    assert "successfully seeded" in data["message"].lower()
    assert data["fields_count"] >= 1
    assert data["plants_count"] >= 20
    assert data["prescriptions_count"] >= 20


# 3. Test Fields Endpoints
def test_get_fields(client):
    response = client.get("/api/fields")
    assert response.status_code == 200
    fields = response.json()
    assert isinstance(fields, list)
    assert len(fields) >= 1
    assert "name" in fields[0]
    assert "area" in fields[0]


def test_create_field(client):
    payload = {
        "name": "Test Experimental Vineyard",
        "crop_type": "Grape",
        "area": 3.2,
        "latitude": 19.9975,
        "longitude": 73.7898
    }
    response = client.post("/api/fields", json=payload)
    assert response.status_code == 201
    field = response.json()
    assert field["name"] == payload["name"]
    assert field["crop_type"] == payload["crop_type"]
    assert field["area"] == payload["area"]
    assert "id" in field


# 4. Test Plants Endpoints
def test_get_plants(client):
    response = client.get("/api/plants")
    assert response.status_code == 200
    plants = response.json()
    assert isinstance(plants, list)
    assert len(plants) >= 20


def test_get_plants_filtered_by_field(client):
    # Fetch all fields first
    fields_res = client.get("/api/fields")
    field_id = fields_res.json()[0]["id"]

    response = client.get(f"/api/plants?field_id={field_id}")
    assert response.status_code == 200
    plants = response.json()
    assert isinstance(plants, list)
    for p in plants:
        assert p["field_id"] == field_id


def test_create_plant_success(client):
    fields_res = client.get("/api/fields")
    field_id = fields_res.json()[0]["id"]

    payload = {
        "field_id": field_id,
        "plant_code": "TEST-PLANT-099",
        "latitude": 30.9015,
        "longitude": 75.8579,
        "crop_type": "Wheat",
        "status": "HEALTHY"
    }
    response = client.post("/api/plants", json=payload)
    assert response.status_code == 201
    plant = response.json()
    assert plant["plant_code"] == "TEST-PLANT-099"
    assert plant["field_id"] == field_id
    assert plant["status"] == "HEALTHY"


def test_create_plant_invalid_field(client):
    payload = {
        "field_id": 99999,
        "plant_code": "INVALID-PLANT",
        "latitude": 0.0,
        "longitude": 0.0,
        "crop_type": "Unknown",
        "status": "HEALTHY"
    }
    response = client.post("/api/plants", json=payload)
    assert response.status_code == 404


# 5. Test Image Detection & Analysis Endpoint
def test_detection_analyze_with_synthetic_image(client):
    # Generate a simple synthetic green image in memory
    img = Image.new("RGB", (100, 100), color=(34, 139, 34))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    files = {"file": ("healthy_leaf.jpg", img_bytes, "image/jpeg")}
    data = {"plant_id": "1"}

    response = client.post("/api/detections/analyze", files=files, data=data)
    assert response.status_code == 200
    result = response.json()
    assert "disease" in result
    assert "confidence" in result
    assert "infection_percentage" in result
    assert result["severity"] in ["HEALTHY", "LOW", "MODERATE", "HIGH"]


# 6. Test Prescription Generation with Dosage Rules
@pytest.mark.parametrize("severity,expected_vol,expected_level,expected_priority", [
    ("HEALTHY", 0.0, "NO_TREATMENT", "NONE"),
    ("LOW", 5.0, "LOW", "LOW"),
    ("MODERATE", 10.0, "MEDIUM", "MEDIUM"),
    ("HIGH", 20.0, "HIGH", "HIGH"),
])
def test_prescription_generation_rules(client, severity, expected_vol, expected_level, expected_priority):
    payload = {
        "plant_id": 1,
        "disease": "Tomato Early Blight",
        "infection_percentage": 25.0,
        "severity": severity
    }
    response = client.post("/api/prescriptions/generate", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["severity"] == severity
    assert res["recommended_volume_ml"] == expected_vol
    assert res["spray_level"] == expected_level
    assert res["priority"] == expected_priority


# 7. Test Prescription Map Endpoint
def test_get_prescriptions_map(client):
    response = client.get("/api/prescriptions/map")
    assert response.status_code == 200
    map_items = response.json()
    assert isinstance(map_items, list)
    assert len(map_items) >= 20
    item = map_items[0]
    assert "plant_id" in item
    assert "latitude" in item
    assert "longitude" in item
    assert "severity" in item
    assert "recommended_volume_ml" in item
    assert "priority" in item


# 8. Test Sprayer Status & Spray Trigger
def test_get_sprayer_status(client):
    response = client.get("/api/sprayer/status")
    assert response.status_code == 200
    status_data = response.json()
    assert status_data["mode"] == "SIMULATED"
    assert "status" in status_data
    assert "battery_level" in status_data
    assert "fluid_level_pct" in status_data


def test_trigger_sprayer(client):
    payload = {
        "plant_id": 2,
        "volume_ml": 15.0,
        "mode": "SIMULATED"
    }
    response = client.post("/api/sprayer/spray", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "COMPLETED"
    assert res["mode"] == "SIMULATED"
    assert res["volume_ml"] == 15.0
    assert res["command_id"].startswith("CMD-SP-")


# 9. Test Sprayer History Endpoint
def test_get_spray_history(client):
    response = client.get("/api/sprayer/history")
    assert response.status_code == 200
    history = response.json()
    assert isinstance(history, list)
    assert len(history) >= 1
    event = history[0]
    assert "command_id" in event
    assert "volume_ml" in event
    assert "status" in event


# 10. Test Analytics Summary Endpoint
def test_analytics_summary(client):
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    analytics = response.json()
    assert analytics["total_plants"] >= 20
    assert analytics["healthy_plants"] >= 0
    assert analytics["low_infection"] >= 0
    assert analytics["moderate_infection"] >= 0
    assert analytics["high_infection"] >= 0
    assert analytics["total_plants"] == (
        analytics["healthy_plants"] +
        analytics["low_infection"] +
        analytics["moderate_infection"] +
        analytics["high_infection"]
    )
    assert analytics["estimated_reduction_percentage"] > 0.0
