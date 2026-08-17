from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True)
    role = Column(String(50), default="Farmer")
    created_at = Column(DateTime, default=datetime.utcnow)

    fields = relationship("Field", back_populates="owner", cascade="all, delete-orphan")

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(100), nullable=False)
    crop_type = Column(String(50), nullable=False)
    area = Column(Float, default=1.0)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="fields")
    plants = relationship("Plant", back_populates="field", cascade="all, delete-orphan")

class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    plant_code = Column(String(50), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    crop_type = Column(String(50), nullable=False)
    status = Column(String(50), default="HEALTHY")
    infection_percentage = Column(Float, default=0.0)
    disease = Column(String(100), default="Healthy Crop")
    severity = Column(String(20), default="HEALTHY")
    created_at = Column(DateTime, default=datetime.utcnow)

    field = relationship("Field", back_populates="plants")
    detections = relationship("Detection", back_populates="plant", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="plant", cascade="all, delete-orphan")
    spray_events = relationship("SprayEvent", back_populates="plant", cascade="all, delete-orphan")

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    image_url = Column(String(255), nullable=True)
    disease = Column(String(100), nullable=False)
    confidence = Column(Float, default=0.95)
    infection_percentage = Column(Float, default=0.0)
    severity = Column(String(20), default="HEALTHY")
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="detections")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    disease = Column(String(100), nullable=False)
    infection_percentage = Column(Float, default=0.0)
    severity = Column(String(20), default="HEALTHY")
    recommended_action = Column(Text, nullable=False)
    spray_level = Column(String(50), default="NO_TREATMENT")  # NO_TREATMENT, LOW, MEDIUM, HIGH
    recommended_volume_ml = Column(Float, default=0.0)
    priority = Column(String(50), default="NONE")  # NONE, LOW, MEDIUM, HIGH
    created_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="prescriptions")

class SprayEvent(Base):
    __tablename__ = "spray_events"

    id = Column(Integer, primary_key=True, index=True)
    command_id = Column(String(100), unique=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    volume_ml = Column(Float, default=0.0)
    status = Column(String(50), default="COMPLETED")
    mode = Column(String(50), default="SIMULATED")
    timestamp = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="spray_events")

class SprayerState(Base):
    __tablename__ = "sprayer_state"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(50), default="READY")  # READY, SPRAYING, STOPPED, IDLE
    mode = Column(String(50), default="SIMULATED")
    battery_level = Column(Integer, default=95)
    fluid_level_pct = Column(Integer, default=90)
    last_updated = Column(DateTime, default=datetime.utcnow)
