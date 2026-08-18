import json
import os
from typing import List, Optional, Union
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Field, Zone, Plant, Detection, Prescription, SprayEvent, SprayerState, TreatmentProduct, StorageRecord, AuditLog
from app.schemas.schemas import (
    HealthResponse,
    FieldResponse, FieldCreate,
    ZoneResponse, ZoneCreate,
    PlantResponse, PlantCreate,
    DetectionAnalyzeResponse,
    PrescriptionGenerateRequest, PrescriptionGenerateResponse, PrescriptionResponse,
    PrescriptionMapItem,
    GeoJSONPointGeometry, PrescriptionMapFeatureProperties, PrescriptionMapFeature,
    FieldPrescriptionSummary, FieldPrescriptionMapResponse,
    SprayerStatusResponse, SprayerStartResponse, SprayerStopResponse,
    SprayerSprayRequest, SprayerSprayResponse,
    ExecutePrescriptionRequest, ExecutePrescriptionResponse, ExecutionStepLog,
    SprayEventResponse,
    AnalyticsSummaryResponse,
    DemoSeedResponse,
    TreatmentProductCreate, TreatmentProductResponse,
    StorageRecordCreate, StorageRecordResponse,
    AuditLogCreate, AuditLogResponse
)
from app.services.ai_service import ai_detector
from app.services.prescription_service import prescription_engine
from app.services.sprayer_service import sprayer_controller
from app.services.demo_data_service import seed_demo_data
from app.services.recommendation_engine import smart_recommendation_engine
from app.config import settings

router = APIRouter()

# ==========================================
# 1. Health Endpoint
# ==========================================
@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint returning API status and service name.
    """
    return HealthResponse(
        status="online",
        service="AgriPrescribe API"
    )


# ==========================================
# 2. Fields Endpoints (CRUD)
# ==========================================
@router.post("/fields", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
def create_field(field_in: FieldCreate, db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        user = User(name="Default Farmer", email="farmer@agriprescribe.in", role="Farmer")
        db.add(user)
        db.flush()

    field = Field(
        user_id=user.id,
        name=field_in.name,
        crop_type=field_in.crop_type,
        area=field_in.area,
        latitude=field_in.latitude,
        longitude=field_in.longitude
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field

@router.get("/fields", response_model=List[FieldResponse])
def get_fields(db: Session = Depends(get_db)):
    return db.query(Field).all()

# ==========================================
# 2.5 Zones Endpoints (CRUD)
# ==========================================
@router.post("/zones", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(zone_in: ZoneCreate, db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == zone_in.field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    zone = Zone(
        field_id=zone_in.field_id,
        name=zone_in.name,
        latitude=zone_in.latitude,
        longitude=zone_in.longitude,
        crop=zone_in.crop or field.crop_type,
        crop_stage=zone_in.crop_stage,
        irrigation_method=zone_in.irrigation_method,
        nozzle_type=zone_in.nozzle_type,
        status=zone_in.status
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.get("/zones", response_model=List[ZoneResponse])
def get_zones(field_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Zone)
    if field_id:
        query = query.filter(Zone.field_id == field_id)
    return query.all()


@router.get("/fields/{field_id}/prescription-map", response_model=FieldPrescriptionMapResponse)
def get_field_prescription_map(field_id: int, db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    # Adapt map to use Zones or Plants (we will use Zones and Plants fallback)
    zones = db.query(Zone).filter(Zone.field_id == field_id).all()
    plants = db.query(Plant).filter(Plant.field_id == field_id).all()
    
    features = []
    total_spray_vol = 0.0

    # Include zones
    for z in zones:
        vol = 0.0
        sev = z.status
        feature = PrescriptionMapFeature(
            type="Feature",
            geometry=GeoJSONPointGeometry(type="Point", coordinates=[z.longitude or 0.0, z.latitude or 0.0]),
            properties=PrescriptionMapFeatureProperties(
                zone_id=z.id,
                disease="Zone",
                severity=sev,
                infection_percentage=0.0,
                recommended_volume_ml=vol,
                priority="LOW",
                recommended_action="TARGETED_TREATMENT",
                spray_level="NO_TREATMENT"
            )
        )
        features.append(feature)

    healthy_count = 0
    low_count = 0
    moderate_count = 0
    high_count = 0
    
    for p in plants:
        sev = (p.severity or "HEALTHY").upper()
        if sev == "HEALTHY":
            healthy_count += 1
        elif sev == "LOW":
            low_count += 1
        elif sev == "MODERATE":
            moderate_count += 1
        elif sev == "HIGH":
            high_count += 1
            
        rule = prescription_engine.DOSAGE_MAP.get(sev, prescription_engine.DOSAGE_MAP["HEALTHY"])
        vol = float(rule["recommended_volume_ml"])
        total_spray_vol += vol

        feature = PrescriptionMapFeature(
            type="Feature",
            geometry=GeoJSONPointGeometry(type="Point", coordinates=[p.longitude, p.latitude]),
            properties=PrescriptionMapFeatureProperties(
                plant_id=p.id,
                plant_code=p.plant_code,
                disease=p.disease or "Healthy Crop",
                severity=sev,
                infection_percentage=p.infection_percentage or 0.0,
                recommended_volume_ml=vol,
                priority=rule["priority"],
                recommended_action=rule["recommended_action"],
                spray_level=rule["spray_level"]
            )
        )
        features.append(feature)

    blanket_spray = len(plants) * 20.0
    reduction = 0.0
    if blanket_spray > 0:
        reduction = round(((blanket_spray - total_spray_vol) / blanket_spray) * 100, 1)

    summary = FieldPrescriptionSummary(
        total_plants=len(plants),
        healthy=healthy_count, low=low_count, moderate=moderate_count, high=high_count,
        total_recommended_spray=round(total_spray_vol, 1),
        blanket_spray_estimate=round(blanket_spray, 1),
        estimated_reduction_percentage=reduction
    )

    return FieldPrescriptionMapResponse(
        type="FeatureCollection", field_id=field.id, field_name=field.name, crop_type=field.crop_type,
        area=field.area, features=features, summary=summary
    )


# ==========================================
# 3. Plants Endpoints (CRUD)
# ==========================================
@router.post("/plants", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
def create_plant(plant_in: PlantCreate, db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == plant_in.field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    plant = Plant(
        field_id=plant_in.field_id,
        plant_code=plant_in.plant_code,
        latitude=plant_in.latitude,
        longitude=plant_in.longitude,
        crop_type=plant_in.crop_type or field.crop_type,
        status=plant_in.severity or plant_in.status or "HEALTHY"
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant

@router.get("/plants", response_model=List[PlantResponse])
def get_plants(field_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Plant)
    if field_id is not None:
        query = query.filter(Plant.field_id == field_id)
    return query.all()


# ==========================================
# 4. Image Detection & AI Analysis
# ==========================================
@router.post("/ai/analyze", response_model=DetectionAnalyzeResponse)
async def analyze_plant_image(
    file: Optional[UploadFile] = File(None),
    plant_id: Optional[Union[int, str]] = Form(None),
    zone_id: Optional[Union[int, str]] = Form(None),
    db: Session = Depends(get_db)
):
    image_filename = "leaf_sample.jpg"
    image_bytes = b""
    if file:
        image_bytes = await file.read()
        image_filename = file.filename or "uploaded_leaf.jpg"
        save_path = os.path.join(settings.UPLOADS_DIR, f"{int(datetime.utcnow().timestamp())}_{image_filename}")
        with open(save_path, "wb") as f:
            f.write(image_bytes)
        image_url = f"/uploads/{os.path.basename(save_path)}"
    else:
        image_url = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop"

    ai_result = ai_detector.analyze_image(image_bytes, filename=image_filename)

    int_plant_id = int(plant_id) if plant_id else None
    int_zone_id = int(zone_id) if zone_id else None

    # Update plant/zone in DB if found
    if int_plant_id:
        plant = db.query(Plant).filter(Plant.id == int_plant_id).first()
        if plant:
            plant.disease = ai_result["disease"]
            plant.infection_percentage = ai_result["infection_percentage"]
            plant.severity = ai_result["severity"]
            plant.status = ai_result["severity"]
            db.commit()
            
    if int_zone_id:
        zone = db.query(Zone).filter(Zone.id == int_zone_id).first()
        if zone:
            zone.status = ai_result["severity"]
            db.commit()

    detection = Detection(
        plant_id=int_plant_id,
        zone_id=int_zone_id,
        image_url=image_url,
        disease=ai_result["disease"],
        confidence=ai_result["confidence"],
        infection_percentage=ai_result["infection_percentage"],
        severity=ai_result["severity"],
        analyzed_at=datetime.utcnow()
    )
    db.add(detection)
    db.commit()

    return DetectionAnalyzeResponse(
        plant_id=plant_id,
        zone_id=zone_id,
        disease=ai_result["disease"],
        confidence=ai_result["confidence"],
        infection_percentage=ai_result["infection_percentage"],
        severity=ai_result["severity"],
        affected_area=ai_result.get("affected_area", ai_result["infection_percentage"]),
        explanation=ai_result.get("explanation", "Leaf diagnosis computed successfully."),
        boxes=ai_result.get("boxes", [])
    )


# ==========================================
# 5. Prescriptions Engine & Mapping
# ==========================================
@router.post("/prescriptions/generate", response_model=PrescriptionGenerateResponse)
def generate_prescription(
    req: PrescriptionGenerateRequest,
    db: Session = Depends(get_db)
):
    # Phase 14: Use Smart Recommendation Engine
    rec = smart_recommendation_engine.generate_recommendation(
        db=db,
        disease_name=req.disease,
        severity=req.severity,
        confidence=0.95, # In a real flow, this should come from AI result
        crop_type=req.crop_type
    )

    int_plant_id = int(req.plant_id) if req.plant_id else None
    int_zone_id = int(req.zone_id) if req.zone_id else None

    presc = Prescription(
        plant_id=int_plant_id,
        zone_id=int_zone_id,
        crop_type=req.crop_type or "Crop",
        disease=req.disease,
        infection_percentage=req.infection_percentage,
        severity=req.severity,
        recommended_action=rec["recommended_action"],
        spray_level=rec["spray_level"],
        recommended_volume_ml=rec["recommended_volume_ml"],
        priority=rec["priority"],
        reason=rec["diagnosisSummary"] + " " + rec["recommendedNextStep"],
        created_at=datetime.utcnow()
    )
    db.add(presc)
    db.commit()
    db.refresh(presc)

    return PrescriptionGenerateResponse(
        id=presc.id,
        plant_id=req.plant_id,
        zone_id=req.zone_id,
        crop_type=req.crop_type,
        disease=req.disease,
        infection_percentage=req.infection_percentage,
        severity=req.severity,
        recommended_action=rec["recommended_action"],
        spray_level=rec["spray_level"],
        recommended_volume_ml=rec["recommended_volume_ml"],
        priority=rec["priority"],
        reason=rec.get("diagnosisSummary", "") + " " + rec.get("recommendedNextStep", ""),
        disclaimer=rec.get("safetyWarning", "Adhere to safety guidelines.")
    )


@router.get("/prescriptions", response_model=List[PrescriptionResponse])
def get_prescriptions(db: Session = Depends(get_db)):
    return db.query(Prescription).order_by(Prescription.created_at.desc()).all()


@router.get("/prescriptions/{plant_id}", response_model=PrescriptionResponse)
def get_prescription_by_plant_id(plant_id: int, db: Session = Depends(get_db)):
    presc = db.query(Prescription).filter(Prescription.plant_id == plant_id).order_by(Prescription.created_at.desc()).first()
    if not presc:
        raise HTTPException(status_code=404, detail=f"Prescription not found")
    return presc

# Placeholder for backward compatibility. Let's keep the router simple for sprayer, as we'll build a separate module for hardware.
@router.get("/sprayer/status", response_model=SprayerStatusResponse)
def get_sprayer_status(db: Session = Depends(get_db)):
    return sprayer_controller.get_status(db)

@router.post("/sprayer/start", response_model=SprayerStartResponse)
def start_sprayer(db: Session = Depends(get_db)):
    return sprayer_controller.start(db)

@router.post("/sprayer/stop", response_model=SprayerStopResponse)
def stop_sprayer(db: Session = Depends(get_db)):
    return sprayer_controller.stop(db)

@router.post("/sprayer/spray", response_model=SprayerSprayResponse)
def trigger_sprayer_spray(req: SprayerSprayRequest, db: Session = Depends(get_db)):
    try:
        return sprayer_controller.trigger_spray(
            db=db,
            plant_id=req.plant_id,
            volume_ml=req.volume_ml,
            mode=req.mode
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sprayer/execute-prescription", response_model=ExecutePrescriptionResponse)
def execute_field_prescription_endpoint(req: ExecutePrescriptionRequest, db: Session = Depends(get_db)):
    return sprayer_controller.execute_field_prescription(
        db=db,
        field_id=req.field_id,
        mode=req.mode
    )

class HardwareModeRequest(BaseModel):
    mode: str

@router.post("/hardware/mode")
def set_hardware_mode(req: HardwareModeRequest):
    return sprayer_controller.swap_driver(req.mode)

class SimulateFaultRequest(BaseModel):
    fault_type: str

@router.post("/hardware/simulate-fault")
def simulate_fault(req: SimulateFaultRequest):
    # Only available in simulated mode
    if getattr(sprayer_controller.driver, "mode", "SIMULATED") == "SIMULATED":
        return sprayer_controller.driver.simulate_fault(req.fault_type)
    return {"status": "REJECTED", "message": "Fault simulation only available in SIMULATED mode."}

@router.get("/sprayer/history", response_model=List[SprayEventResponse])
def get_spray_history(db: Session = Depends(get_db)):
    return db.query(SprayEvent).order_by(SprayEvent.timestamp.desc()).all()

@router.get("/analytics/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(db: Session = Depends(get_db)):
    plants = db.query(Plant).all()
    prescriptions = db.query(Prescription).all()
    
    total_plants = len(plants)
    healthy_plants = sum(1 for p in plants if p.severity == 'HEALTHY' or p.status == 'HEALTHY')
    low_infection = sum(1 for p in plants if p.severity == 'LOW' or p.status == 'LOW')
    moderate_infection = sum(1 for p in plants if p.severity == 'MODERATE' or p.status == 'MODERATE')
    high_infection = sum(1 for p in plants if p.severity == 'HIGH' or p.status == 'HIGH')
    
    total_spray_volume = sum(p.recommended_volume_ml for p in prescriptions if getattr(p, "recommended_volume_ml", None) is not None)
    
    untreated_volume_estimate = total_plants * 100.0
    estimated_reduction_percentage = 0.0
    if untreated_volume_estimate > 0:
        estimated_reduction_percentage = max(0, ((untreated_volume_estimate - total_spray_volume) / untreated_volume_estimate) * 100)
        
    return AnalyticsSummaryResponse(
        total_plants=total_plants,
        healthy_plants=healthy_plants,
        low_infection=low_infection,
        moderate_infection=moderate_infection,
        high_infection=high_infection,
        total_spray_volume=total_spray_volume,
        untreated_volume_estimate=untreated_volume_estimate,
        estimated_reduction_percentage=estimated_reduction_percentage
    )

@router.post("/demo/seed", response_model=DemoSeedResponse)
def seed_demo(db: Session = Depends(get_db)):
    result = seed_demo_data(db, force_reseed=True)
    return DemoSeedResponse(
        message=result["message"],
        fields_count=result["fields_count"],
        plants_count=result["plants_count"],
        zones_count=result.get("zones_count", 0),
        prescriptions_count=result["prescriptions_count"]
    )

# ==========================================
# 11. Storage/Product Registry Endpoints
# ==========================================
@router.post("/products", response_model=TreatmentProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_in: TreatmentProductCreate, db: Session = Depends(get_db)):
    product = TreatmentProduct(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/products", response_model=List[TreatmentProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(TreatmentProduct).all()

@router.post("/storage", response_model=StorageRecordResponse, status_code=status.HTTP_201_CREATED)
def create_storage_record(record_in: StorageRecordCreate, db: Session = Depends(get_db)):
    record = StorageRecord(**record_in.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/storage", response_model=List[StorageRecordResponse])
def get_storage_records(db: Session = Depends(get_db)):
    return db.query(StorageRecord).all()

# ==========================================
# 12. Audit History Endpoints
# ==========================================
@router.post("/audit", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
def create_audit_log(audit_in: AuditLogCreate, db: Session = Depends(get_db)):
    audit = AuditLog(**audit_in.model_dump())
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit

@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
