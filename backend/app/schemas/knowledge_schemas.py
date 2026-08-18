from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class CropBase(BaseModel):
    name: str
    scientific_name: Optional[str] = None
    local_names: Optional[str] = None
    region: Optional[str] = "India"
    season: Optional[str] = None
    crop_type: Optional[str] = None
    growth_stages: Optional[str] = None
    active: bool = True
    source_references: Optional[str] = None

class CropCreate(CropBase):
    pass

class CropResponse(CropBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PlantDiseaseBase(BaseModel):
    name: str
    scientific_name: Optional[str] = None
    common_names: Optional[str] = None
    crop_id: Optional[int] = None
    category: Optional[str] = None
    pathogen_type: Optional[str] = None
    symptoms: Optional[str] = None
    visual_symptoms: Optional[str] = None
    affected_parts: Optional[str] = None
    favorable_conditions: Optional[str] = None
    severity_indicators: Optional[str] = None
    differential_diagnosis: Optional[str] = None
    prevention: Optional[str] = None
    non_chemical_management: Optional[str] = None
    chemical_management_reference: Optional[str] = None
    confidence_notes: Optional[str] = None
    image_references: Optional[str] = None
    source_references: Optional[str] = None
    last_verified: Optional[datetime] = None
    status: Optional[str] = "ACTIVE"

class PlantDiseaseCreate(PlantDiseaseBase):
    pass

class PlantDiseaseResponse(PlantDiseaseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ManagementRecommendationBase(BaseModel):
    crop_id: Optional[int] = None
    problem_id: Optional[str] = None
    management_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority: Optional[str] = None
    prevention: Optional[str] = None
    cultural_control: Optional[str] = None
    mechanical_control: Optional[str] = None
    biological_control: Optional[str] = None
    chemical_control_reference: Optional[str] = None
    application_method: Optional[str] = None
    source_references: Optional[str] = None
    verified: bool = False
    last_verified: Optional[datetime] = None

class ManagementRecommendationCreate(ManagementRecommendationBase):
    pass

class ManagementRecommendationResponse(ManagementRecommendationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CropPestBase(BaseModel):
    name: str
    scientific_name: Optional[str] = None
    common_names: Optional[str] = None
    crop_id: Optional[int] = None
    pest_type: Optional[str] = None
    life_stage: Optional[str] = None
    damage_symptoms: Optional[str] = None
    visual_identification: Optional[str] = None
    favorable_conditions: Optional[str] = None
    monitoring_method: Optional[str] = None
    threshold_information: Optional[str] = None
    integrated_management: Optional[str] = None
    source_references: Optional[str] = None
    last_verified: Optional[datetime] = None

class CropPestCreate(CropPestBase):
    pass

class CropPestResponse(CropPestBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SymptomBase(BaseModel):
    name: str
    description: Optional[str] = None
    affected_plant_part: Optional[str] = None
    visual_severity: Optional[str] = None
    possible_causes: Optional[str] = None

class SymptomCreate(SymptomBase):
    pass

class SymptomResponse(SymptomBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class KnowledgeSourceBase(BaseModel):
    organization: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    source_type: Optional[str] = None
    publication_date: Optional[datetime] = None
    accessed_date: Optional[datetime] = None
    region: Optional[str] = None
    reliability_level: Optional[str] = None

class KnowledgeSourceCreate(KnowledgeSourceBase):
    pass

class KnowledgeSourceResponse(KnowledgeSourceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
