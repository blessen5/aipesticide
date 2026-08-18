from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
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
    zones = relationship("Zone", back_populates="field", cascade="all, delete-orphan")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    crop = Column(String(50), nullable=True)
    crop_stage = Column(String(50), nullable=True)
    irrigation_method = Column(String(50), nullable=True)
    nozzle_type = Column(String(50), nullable=True)
    status = Column(String(50), default="READY")
    created_at = Column(DateTime, default=datetime.utcnow)

    field = relationship("Field", back_populates="zones")
    hardware_mapping = relationship("ZoneHardwareMapping", back_populates="zone", uselist=False, cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="zone")
    prescriptions = relationship("Prescription", back_populates="zone")

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
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    image_url = Column(String(255), nullable=True)
    disease = Column(String(100), nullable=False)
    confidence = Column(Float, default=0.95)
    infection_percentage = Column(Float, default=0.0)
    severity = Column(String(20), default="HEALTHY")
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="detections")
    zone = relationship("Zone", back_populates="detections")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    crop_type = Column(String(50), nullable=True, default="Generic Crop")
    disease = Column(String(100), nullable=False)
    infection_percentage = Column(Float, default=0.0)
    severity = Column(String(20), default="HEALTHY")
    recommended_action = Column(String(100), default="NO_TREATMENT") 
    spray_level = Column(String(50), default="NO_TREATMENT") 
    recommended_volume_ml = Column(Float, default=0.0)
    priority = Column(String(50), default="NONE") 
    reason = Column(Text, nullable=True)
    
    # New fields
    application_mode = Column(String(50), nullable=True)
    application_method_status = Column(String(50), nullable=True)
    hardware_node_id = Column(String(100), nullable=True)
    valve_id = Column(String(100), nullable=True)
    nozzle_id = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="prescriptions")
    zone = relationship("Zone", back_populates="prescriptions")

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

class HardwareNode(Base):
    __tablename__ = "hardware_nodes"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String(100), unique=True, index=True)
    online = Column(Boolean, default=False)
    pump_state = Column(String(50), default="OFF")
    pressure_status = Column(String(50), default="NORMAL")
    flow_status = Column(String(50), default="NORMAL")
    emergency_stop = Column(Boolean, default=False)
    last_heartbeat = Column(DateTime, nullable=True)
    firmware_version = Column(String(50), nullable=True)

    valves = relationship("Valve", back_populates="node", cascade="all, delete-orphan")

class Valve(Base):
    __tablename__ = "valves"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("hardware_nodes.id"))
    valve_id = Column(String(50), nullable=False)
    state = Column(String(50), default="CLOSED")

    node = relationship("HardwareNode", back_populates="valves")

class ZoneHardwareMapping(Base):
    __tablename__ = "zone_hardware_mappings"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    node_id = Column(String(100))
    valve_id = Column(String(50))
    nozzle_id = Column(String(50))
    application_geometry = Column(String(50))
    enabled = Column(Boolean, default=True)

    zone = relationship("Zone", back_populates="hardware_mapping")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(100), unique=True, index=True)
    field_id = Column(Integer, nullable=True)
    zone_id = Column(Integer, nullable=True)
    crop = Column(String(50), nullable=True)
    disease = Column(String(100), nullable=True)
    severity = Column(String(50), nullable=True)
    prescription_id = Column(Integer, nullable=True)
    application_mode = Column(String(50), nullable=True)
    hardware_node = Column(String(100), nullable=True)
    valve = Column(String(50), nullable=True)
    flow = Column(Float, nullable=True)
    pressure = Column(String(50), nullable=True)
    status = Column(String(50), default="PENDING")
    operator = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class TreatmentProduct(Base):
    __tablename__ = "treatment_products"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(100), unique=True, index=True)
    product_name = Column(String(100))
    active_ingredient = Column(String(100))
    crop = Column(String(50))
    target = Column(String(50))
    registered_application_method = Column(String(100))
    label_verified = Column(Boolean, default=False)
    chemigation_permitted = Column(Boolean, default=False)
    expiry_date = Column(DateTime)
    batch_number = Column(String(100))
    storage_location = Column(String(100))
    enabled = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

class StorageRecord(Base):
    __tablename__ = "storage_records"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("treatment_products.id"))
    quantity = Column(Float)
    unit = Column(String(20))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = Column(String(100), nullable=True)
    field = Column(String(100), nullable=True)
    zone = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False)
    result = Column(String(100), nullable=True)
    reason = Column(Text, nullable=True)
