import os
import pytest
from PIL import Image
import io

from app.services.ai_service import DiseaseDetectionService, disease_detection_service
from app.config import settings

def test_ai_service_initialization():
    service_demo = DiseaseDetectionService(mode="demo")
    assert service_demo.mode == "demo"
    assert service_demo.healthy_max == 5.0
    assert service_demo.low_max == 25.0
    assert service_demo.moderate_max == 60.0


def test_severity_classification_default_thresholds():
    service = DiseaseDetectionService()
    
    # 0 - 5%: HEALTHY
    assert service.classify_severity(0.0) == "HEALTHY"
    assert service.classify_severity(2.5) == "HEALTHY"
    assert service.classify_severity(5.0) == "HEALTHY"

    # > 5 - 25%: LOW
    assert service.classify_severity(5.1) == "LOW"
    assert service.classify_severity(15.0) == "LOW"
    assert service.classify_severity(25.0) == "LOW"

    # > 25 - 60%: MODERATE
    assert service.classify_severity(25.1) == "MODERATE"
    assert service.classify_severity(37.0) == "MODERATE"
    assert service.classify_severity(60.0) == "MODERATE"

    # > 60%: HIGH
    assert service.classify_severity(60.1) == "HIGH"
    assert service.classify_severity(85.0) == "HIGH"
    assert service.classify_severity(100.0) == "HIGH"


def test_severity_classification_custom_thresholds():
    custom_service = DiseaseDetectionService(
        healthy_max=8.0,
        low_max=30.0,
        moderate_max=70.0
    )
    assert custom_service.classify_severity(7.5) == "HEALTHY"
    assert custom_service.classify_severity(20.0) == "LOW"
    assert custom_service.classify_severity(50.0) == "MODERATE"
    assert custom_service.classify_severity(75.0) == "HIGH"


def test_demo_diseases_analysis():
    service = DiseaseDetectionService(mode="demo")
    
    # Test Leaf Blight
    res_blight = service.analyze_image(b"", filename="tomato_leaf_blight.jpg")
    assert res_blight["disease"] == "Leaf Blight"
    assert res_blight["confidence"] >= 0.85
    assert "blight" in res_blight["explanation"].lower() or "lesion" in res_blight["explanation"].lower()
    assert res_blight["affected_area"] == res_blight["infection_percentage"]
    assert res_blight["severity"] in ["LOW", "MODERATE", "HIGH"]

    # Test Leaf Spot
    res_spot = service.analyze_image(b"", filename="cercospora_leaf_spot.jpg")
    assert res_spot["disease"] == "Leaf Spot"
    assert "spot" in res_spot["explanation"].lower()
    assert res_spot["severity"] in ["LOW", "MODERATE", "HIGH"]

    # Test Powdery Mildew
    res_mildew = service.analyze_image(b"", filename="wheat_powdery_mildew.jpg")
    assert res_mildew["disease"] == "Powdery Mildew"
    assert "mildew" in res_mildew["explanation"].lower() or "fungal" in res_mildew["explanation"].lower()

    # Test Rust
    res_rust = service.analyze_image(b"", filename="wheat_rust.jpg")
    assert res_rust["disease"] == "Rust"
    assert "rust" in res_rust["explanation"].lower() or "pustule" in res_rust["explanation"].lower()

    # Test Healthy
    res_healthy = service.analyze_image(b"", filename="healthy_crop.jpg")
    assert res_healthy["disease"] == "Healthy"
    assert res_healthy["severity"] == "HEALTHY"
    assert res_healthy["infection_percentage"] == 0.0
    assert res_healthy["affected_area"] == 0.0


def test_sample_image_files_analysis():
    sample_dir = settings.SAMPLE_IMAGES_DIR
    service = DiseaseDetectionService(mode="demo")

    if os.path.exists(sample_dir):
        for sample_file in os.listdir(sample_dir):
            if sample_file.endswith((".jpg", ".png")):
                full_path = os.path.join(sample_dir, sample_file)
                with open(full_path, "rb") as f:
                    image_bytes = f.read()
                
                result = service.analyze_image(image_bytes, filename=sample_file)
                assert "disease" in result
                assert "confidence" in result
                assert "infection_percentage" in result
                assert "severity" in result
                assert "affected_area" in result
                assert "explanation" in result
                assert result["severity"] in ["HEALTHY", "LOW", "MODERATE", "HIGH"]


def test_model_mode_fallback():
    # If AI_MODE="model" but no trained ONNX/PyTorch model file is at MODEL_PATH,
    # it should gracefully fall back to local computer vision feature analysis without crashing
    service_model = DiseaseDetectionService(mode="model")
    result = service_model.analyze_image(b"", filename="test_leaf.jpg")
    assert "disease" in result
    assert "confidence" in result
    assert "infection_percentage" in result
    assert "severity" in result
    assert "explanation" in result
