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

    # ──────────────────────────────────────────────────────────────
    # ESP32 Hardware Integration (Optional)
    # ──────────────────────────────────────────────────────────────
    # SPRAYER_MODE controls which driver is active at startup:
    #   "SIMULATED" (default) — pure software simulation, no hardware needed
    #   "ESP32"               — real HTTP calls to physical ESP32 board
    #
    # If SPRAYER_MODE=ESP32 but the ESP32 is unreachable, the backend
    # automatically falls back to SIMULATED mode and logs a warning.
    # The simulator continues to work at all times.
    SPRAYER_MODE: str = os.getenv("SPRAYER_MODE", "SIMULATED").upper()

    # IP address of the ESP32 on the local network (or AP default 192.168.4.1)
    ESP32_HOST: str = os.getenv("ESP32_HOST", "192.168.4.1")

    # HTTP port the ESP32 firmware listens on (default: 80)
    ESP32_PORT: int = int(os.getenv("ESP32_PORT", "80"))

    # Connection timeout in seconds when probing / commanding the ESP32
    ESP32_TIMEOUT: float = float(os.getenv("ESP32_TIMEOUT", "3.0"))

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
os.makedirs(settings.SAMPLE_IMAGES_DIR, exist_ok=True)
