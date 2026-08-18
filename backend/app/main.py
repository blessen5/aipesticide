import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.endpoints import router as api_router
from app.api.esp32_endpoints import hardware_router
from app.api.demo_router import demo_router
from app.services.demo_data_service import seed_demo_data


# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed demo data if database is empty
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_TITLE,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include ESP32 Hardware router (optional hardware integration)
app.include_router(hardware_router, prefix=settings.API_V1_STR)

# Include Demo Mode router (SIH 2026 demo reset & status)
app.include_router(demo_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "title": settings.PROJECT_TITLE,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
