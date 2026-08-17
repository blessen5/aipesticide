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
    SAMPLE_IMAGES_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "sample_data", "leaf_samples")
    
    # Demo configuration
    DEMO_MODE: bool = True
    SIMULATED_SPRAYER_ENABLED: bool = True

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
