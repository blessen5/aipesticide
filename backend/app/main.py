import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.endpoints import router as api_router
from app.api.esp32_endpoints import hardware_router
from app.api.demo_router import demo_router
from app.api.knowledge_endpoints import router as knowledge_router
from app.api.weather_scouting_router import router as weather_scouting_router
from app.services.demo_data_service import seed_demo_data


from app.models import models as app_models, knowledge_models as app_knowledge_models

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

# Phase 36: Structured Error Handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred.",
            "details": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": "HTTP_ERROR",
            "message": exc.detail,
            "details": "",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Phase 37: Authorization Roles Mock
def get_current_user_role(request: Request):
    # In a real app this would decode a JWT. For the prototype, we assume Farmer
    role = request.headers.get("X-User-Role", "FARMER")
    return role.upper()

def require_admin(role: str = Depends(get_current_user_role)):
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin permissions required.")
    return role

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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

# Include Knowledge Base router
app.include_router(knowledge_router, prefix=settings.API_V1_STR + "/knowledge")

# Weather-aware spray-window intelligence and time-based scouting
app.include_router(weather_scouting_router, prefix=settings.API_V1_STR)

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
    uvicorn.run(app, host="127.0.0.1", port=8001)
