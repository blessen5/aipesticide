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

# 2.5 Zone Schemas
class ZoneBase(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    crop: Optional[str] = None
    crop_stage: Optional[str] = None
    irrigation_method: Optional[str] = None
    nozzle_type: Optional[str] = None
    status: str = "READY"

class ZoneCreate(ZoneBase):
    field_id: int

class ZoneResponse(ZoneBase):
    id: int
    field_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# 3. Plant Schemas (Retained for backward compatibility)
class PlantBase(BaseModel):
    plant_code: str
    latitude: float
    longitude: float
    crop_type: str
    status: str = "HEALTHY"
    disease: Optional[str] = "Healthy Crop"
    infection_percentage: Optional[float] = 0.0
    severity: Optional[str] = "HEALTHY"

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
    zone_id: Optional[Union[int, str]] = None
    boxes: Optional[List[dict]] = None

# 5. Prescription Generator Schemas
class PrescriptionGenerateRequest(BaseModel):
    plant_id: Optional[Union[int, str]] = None
    zone_id: Optional[Union[int, str]] = None
    crop_type: Optional[str] = "Crop"
    disease: str
    infection_percentage: float = 0.0
    severity: str  # HEALTHY, LOW, MODERATE, HIGH

class PrescriptionGenerateResponse(BaseModel):
    plant_id: Optional[Union[int, str]] = None
    zone_id: Optional[Union[int, str]] = None
    crop_type: Optional[str] = None
    disease: str
    infection_percentage: float
    severity: str
    recommended_action: str
    spray_level: str  # NO_TREATMENT, LOW, MEDIUM, HIGH
    recommended_volume_ml: float
    priority: str  # NONE, LOW, MEDIUM, HIGH
    reason: Optional[str] = None
    disclaimer: Optional[str] = None
    id: Optional[int] = None
    application_mode: Optional[str] = None
    application_method_status: Optional[str] = None
    hardware_node_id: Optional[str] = None
    valve_id: Optional[str] = None
    nozzle_id: Optional[str] = None

# 6. GeoJSON Prescription Map Schemas
class GeoJSONPointGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude] as per GeoJSON RFC 7946

class PrescriptionMapFeatureProperties(BaseModel):
    zone_id: Optional[Union[int, str]] = None
    plant_id: Optional[Union[int, str]] = None
    plant_code: Optional[str] = None
    disease: str
    severity: str
    infection_percentage: float
    recommended_volume_ml: float
    priority: str
    recommended_action: str = "TARGETED_TREATMENT"
    spray_level: str = "NO_TREATMENT"

class PrescriptionMapFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONPointGeometry
    properties: PrescriptionMapFeatureProperties

class FieldPrescriptionSummary(BaseModel):
    total_plants: int
    healthy: int
    low: int
    moderate: int
    high: int
    total_recommended_spray: float
    blanket_spray_estimate: float
    estimated_reduction_percentage: float

class FieldPrescriptionMapResponse(BaseModel):
    type: str = "FeatureCollection"
    field_id: int
    field_name: str
    crop_type: str
    area: float
    features: List[PrescriptionMapFeature]
    summary: FieldPrescriptionSummary

class PrescriptionMapItem(BaseModel):
    zone_id: Optional[Union[int, str]] = None
    plant_id: Optional[Union[int, str]] = None
    plant_code: Optional[str] = None
    latitude: float
    longitude: float
    disease: Optional[str] = "Healthy Crop"
    severity: str
    infection_percentage: float
    recommended_volume_ml: float
    priority: str

# 7. Sprayer Schemas
class SprayerStatusResponse(BaseModel):
    status: str  # IDLE, MOVING, READY, SPRAYING, COMPLETED, ERROR
    mode: str = "SIMULATED"
    battery_level: int
    fluid_level_pct: int
    current_plant: Optional[str] = None
    current_status: Optional[str] = None
    current_spray_volume: Optional[float] = 0.0
    progress_pct: Optional[float] = 0.0
    total_plants: Optional[int] = 0
    completed_plants: Optional[int] = 0
    disclaimer: str = "SIMULATION MODE: Operating in calibrated local demo mode for prototype evaluation."

class SprayerStartResponse(BaseModel):
    status: str
    message: str
    mode: str = "SIMULATED"

class SprayerStopResponse(BaseModel):
    status: str
    message: str

class SprayerSprayRequest(BaseModel):
    plant_id: Optional[Union[int, str]] = None
    zone_id: Optional[Union[int, str]] = None
    volume_ml: float
    mode: Optional[str] = "SIMULATED"

class SprayerSprayResponse(BaseModel):
    command_id: str
    status: str
    plant_id: Optional[Union[int, str]] = None
    zone_id: Optional[Union[int, str]] = None
    volume_ml: float
    timestamp: str
    mode: str = "SIMULATED"

class ExecutePrescriptionRequest(BaseModel):
    field_id: int
    mode: Optional[str] = "SIMULATED"

class ExecutionStepLog(BaseModel):
    plant_code: Optional[str] = None
    zone_id: Optional[Union[int, str]] = None
    action: str  # MOVING, READY, SPRAYING, SKIPPED, COMPLETED
    volume_ml: float
    severity: str
    details: str

class ExecutePrescriptionResponse(BaseModel):
    field_id: int
    field_name: str
    status: str
    total_plants: int
    plants_treated: int
    plants_skipped_healthy: int
    total_volume_sprayed: float
    execution_logs: List[ExecutionStepLog]
    disclaimer: str = "SIMULATION MODE: Prototype demonstration only. No physical chemicals dispensed."

# 8. Prescription List Response Schema
class PrescriptionResponse(BaseModel):
    id: int
    plant_id: Optional[int] = None
    zone_id: Optional[int] = None
    crop_type: Optional[str] = None
    disease: str
    infection_percentage: float
    severity: str
    recommended_action: str
    spray_level: str
    recommended_volume_ml: float
    priority: str
    reason: Optional[str] = None
    created_at: datetime
    
    application_mode: Optional[str] = None
    application_method_status: Optional[str] = None
    hardware_node_id: Optional[str] = None
    valve_id: Optional[str] = None
    nozzle_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# 9. Spray History Log Schema
class SprayEventResponse(BaseModel):
    id: int
    command_id: str
    plant_id: Optional[int] = None
    zone_id: Optional[int] = None
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
    zones_count: int
    prescriptions_count: int

# 12. Storage Registry & Product Schemas
class TreatmentProductBase(BaseModel):
    product_id: str
    product_name: str
    active_ingredient: str
    crop: str
    target: str
    registered_application_method: str
    label_verified: bool = False
    chemigation_permitted: bool = False
    expiry_date: Optional[datetime] = None
    batch_number: str
    storage_location: str
    enabled: bool = True
    notes: Optional[str] = None

class TreatmentProductCreate(TreatmentProductBase):
    pass

class TreatmentProductResponse(TreatmentProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StorageRecordBase(BaseModel):
    product_id: int
    quantity: float
    unit: str

class StorageRecordCreate(StorageRecordBase):
    pass

class StorageRecordResponse(StorageRecordBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# 13. Audit Log Schemas
class AuditLogBase(BaseModel):
    user: Optional[str] = None
    field: Optional[str] = None
    zone: Optional[str] = None
    action: str
    result: Optional[str] = None
    reason: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogResponse(AuditLogBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
