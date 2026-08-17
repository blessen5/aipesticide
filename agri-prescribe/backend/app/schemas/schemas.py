from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Union
from datetime import datetime

# 1. Health Schema
class HealthResponse(BaseModel):
    status: str = "online"
    service: str = "AgriPrescribe API"

# 2. Field Schemas
class FieldBase(BaseModel):
    name: str
    crop_type: str
    area: float
    latitude: float
    longitude: float

class FieldCreate(FieldBase):
    pass

class FieldResponse(FieldBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# 3. Plant Schemas
class PlantBase(BaseModel):
    plant_code: str
    latitude: float
    longitude: float
    crop_type: str
    status: str = "HEALTHY"

class PlantCreate(PlantBase):
    field_id: int

class PlantResponse(PlantBase):
    id: int
    field_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# 4. Image Detection Analysis Schema
class DetectionAnalyzeResponse(BaseModel):
    disease: str
    confidence: float
    infection_percentage: float
    severity: str  # HEALTHY, LOW, MODERATE, HIGH
    affected_area: float
    explanation: str
    plant_id: Optional[Union[int, str]] = None
    boxes: Optional[List[dict]] = None

# 5. Prescription Generator Schemas
class PrescriptionGenerateRequest(BaseModel):
    plant_id: Optional[Union[int, str]] = None
    disease: str
    infection_percentage: float
    severity: str  # HEALTHY, LOW, MODERATE, HIGH

class PrescriptionGenerateResponse(BaseModel):
    plant_id: Optional[Union[int, str]] = None
    disease: str
    infection_percentage: float
    severity: str
    recommended_action: str
    spray_level: str  # NO_TREATMENT, LOW, MEDIUM, HIGH
    recommended_volume_ml: float
    priority: str  # NONE, LOW, MEDIUM, HIGH

# 6. Prescription Map Item Schema
class PrescriptionMapItem(BaseModel):
    plant_id: Union[int, str]
    latitude: float
    longitude: float
    severity: str
    infection_percentage: float
    recommended_volume_ml: float
    priority: str

# 7. Sprayer Schemas
class SprayerStatusResponse(BaseModel):
    status: str  # READY, SPRAYING, STOPPED, IDLE
    mode: str = "SIMULATED"
    battery_level: int
    fluid_level_pct: int

class SprayerSprayRequest(BaseModel):
    plant_id: Union[int, str]
    volume_ml: float
    mode: Optional[str] = "SIMULATED"

class SprayerSprayResponse(BaseModel):
    command_id: str
    status: str
    plant_id: Union[int, str]
    volume_ml: float
    timestamp: str
    mode: str = "SIMULATED"

# 8. Prescription List Response Schema
class PrescriptionResponse(BaseModel):
    id: int
    plant_id: Optional[int] = None
    disease: str
    infection_percentage: float
    severity: str
    recommended_action: str
    spray_level: str
    recommended_volume_ml: float
    priority: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# 9. Spray History Log Schema
class SprayEventResponse(BaseModel):
    id: int
    command_id: str
    plant_id: Optional[int] = None
    volume_ml: float
    status: str
    mode: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# 10. Analytics Summary Schema
class AnalyticsSummaryResponse(BaseModel):
    total_plants: int
    healthy_plants: int
    low_infection: int
    moderate_infection: int
    high_infection: int
    total_spray_volume: float
    untreated_volume_estimate: float
    estimated_reduction_percentage: float
    note: str = "Reduction percentage is an algorithmically calculated estimate vs blanket uniform spraying."

# 11. Demo Seed Response
class DemoSeedResponse(BaseModel):
    message: str
    fields_count: int
    plants_count: int
    prescriptions_count: int
