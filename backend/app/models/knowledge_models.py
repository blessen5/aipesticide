from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Crop(Base):
    __tablename__ = "crops"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    scientific_name = Column(String(150))
    local_names = Column(String(255))
    region = Column(String(100), default="India")
    season = Column(String(100))
    crop_type = Column(String(100))
    growth_stages = Column(Text)
    active = Column(Boolean, default=True)
    source_references = Column(Text)

class PlantDisease(Base):
    __tablename__ = "plant_diseases"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), index=True)
    scientific_name = Column(String(200))
    common_names = Column(String(255))
    crop_id = Column(Integer, ForeignKey("crops.id"))
    category = Column(String(100))
    pathogen_type = Column(String(100))
    symptoms = Column(Text)
    visual_symptoms = Column(Text)
    affected_parts = Column(String(255))
    favorable_conditions = Column(Text)
    severity_indicators = Column(Text)
    differential_diagnosis = Column(Text)
    prevention = Column(Text)
    non_chemical_management = Column(Text)
    chemical_management_reference = Column(Text)
    confidence_notes = Column(Text)
    image_references = Column(Text)
    source_references = Column(Text)
    last_verified = Column(DateTime)
    status = Column(String(50), default="ACTIVE")

class CropPest(Base):
    __tablename__ = "crop_pests"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), index=True)
    scientific_name = Column(String(200))
    common_names = Column(String(255))
    crop_id = Column(Integer, ForeignKey("crops.id"))
    pest_type = Column(String(100))
    life_stage = Column(String(100))
    damage_symptoms = Column(Text)
    visual_identification = Column(Text)
    favorable_conditions = Column(Text)
    monitoring_method = Column(Text)
    threshold_information = Column(Text)
    integrated_management = Column(Text)
    source_references = Column(Text)
    last_verified = Column(DateTime)

class Symptom(Base):
    __tablename__ = "symptoms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, index=True)
    description = Column(Text)
    affected_plant_part = Column(String(100))
    visual_severity = Column(String(50))
    possible_causes = Column(Text)

class ManagementRecommendation(Base):
    __tablename__ = "management_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    crop_id = Column(Integer, ForeignKey("crops.id"))
    problem_id = Column(String(100)) # Can be disease ID or pest ID
    management_type = Column(String(100))
    title = Column(String(200))
    description = Column(Text)
    priority = Column(String(50))
    prevention = Column(Text)
    cultural_control = Column(Text)
    mechanical_control = Column(Text)
    biological_control = Column(Text)
    chemical_control_reference = Column(Text)
    application_method = Column(String(100))
    source_references = Column(Text)
    verified = Column(Boolean, default=False)
    last_verified = Column(DateTime)

class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id = Column(Integer, primary_key=True, index=True)
    organization = Column(String(150))
    title = Column(String(255))
    url = Column(String(255))
    source_type = Column(String(100))
    publication_date = Column(DateTime)
    accessed_date = Column(DateTime)
    region = Column(String(100))
    reliability_level = Column(String(50))

class RegionProfile(Base):
    __tablename__ = "region_profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    priority = Column(Integer, default=1)

class ImageDatasetSource(Base):
    __tablename__ = "image_dataset_sources"
    id = Column(Integer, primary_key=True, index=True)
    dataset_name = Column(String(150))
    source_url = Column(String(255))
    license = Column(String(100))
    crop = Column(String(100))
    disease = Column(String(150))
    image_count = Column(Integer)
    training_use = Column(Boolean, default=False)
    validation_use = Column(Boolean, default=False)
    notes = Column(Text)
