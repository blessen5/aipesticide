import os

class Settings:
    PROJECT_NAME: str = "AgriPrescribe"
    PROJECT_TITLE: str = "Smartphone-Assisted Prescription Mapping & Automated Precision Spraying System"
    VERSION: str = "1.0.0-SIH2026"
    API_V1_STR: str = "/api"
    
    # SQLite Database for local prototype
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agri_prescribe.db")
    
    # CORS
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Directories
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOADS_DIR: str = os.path.join(BASE_DIR, "uploads")
    SAMPLE_IMAGES_DIR: str = os.path.join(BASE_DIR, "uploads", "sample_leaves")
    
    # AI / Computer Vision Configuration
    # AI_MODE: "demo" (offline, deterministic, simulated CV features) or "model" (real PyTorch/ONNX inference)
    AI_MODE: str = os.getenv("AI_MODE", "demo").lower()
    MODEL_PATH: str = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(BASE_DIR), "ai", "models", "disease_classifier.onnx"))
    
    # Configurable Severity Thresholds
    # 0 - 5%: HEALTHY
    # > 5 - 25%: LOW
    # > 25 - 60%: MODERATE
    # > 60%: HIGH
    SEVERITY_HEALTHY_MAX: float = 5.0
    SEVERITY_LOW_MAX: float = 25.0
    SEVERITY_MODERATE_MAX: float = 60.0
    
    # Demo configuration
    DEMO_MODE: bool = True
    SIMULATED_SPRAYER_ENABLED: bool = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
os.makedirs(settings.SAMPLE_IMAGES_DIR, exist_ok=True)
