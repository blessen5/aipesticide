import json
import os
from typing import List, Optional, Union
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Field, Plant, Detection, Prescription, SprayEvent, SprayerState
from app.schemas.schemas import (
    HealthResponse,
    FieldResponse, FieldCreate,
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
    DemoSeedResponse
)
from app.services.ai_service import ai_detector
from app.services.prescription_service import prescription_engine
from app.services.sprayer_service import sprayer_controller
from app.services.demo_data_service import seed_demo_data
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
    """
    Create a new field.
    """
    # Create or link default user if needed
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
    """
    List all fields.
    """
    return db.query(Field).all()


@router.get("/fields/{field_id}/prescription-map", response_model=FieldPrescriptionMapResponse)
def get_field_prescription_map(field_id: int, db: Session = Depends(get_db)):
    """
    Convert individual plant analysis results into a visual GeoJSON FeatureCollection prescription map.
    Includes field metadata, GeoJSON point features [longitude, latitude], and field summary metrics.
    Guarantees that private user data is never exposed.
    """
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found"
        )

    plants = db.query(Plant).filter(Plant.field_id == field_id).all()

    features = []
    healthy_count = 0
    low_count = 0
    moderate_count = 0
    high_count = 0
    total_spray_vol = 0.0

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
            geometry=GeoJSONPointGeometry(
                type="Point",
                coordinates=[p.longitude, p.latitude]  # [longitude, latitude] as per GeoJSON RFC 7946 standard
            ),
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

    total_plants = len(plants)
    blanket_volume_estimate = total_plants * 20.0 if total_plants > 0 else 0.0
    reduction_pct = round(((blanket_volume_estimate - total_spray_vol) / blanket_volume_estimate) * 100.0, 1) if blanket_volume_estimate > 0 else 0.0

    summary = FieldPrescriptionSummary(
        total_plants=total_plants,
        healthy=healthy_count,
        low=low_count,
        moderate=moderate_count,
        high=high_count,
        total_recommended_spray=round(total_spray_vol, 1),
        blanket_spray_estimate=round(blanket_volume_estimate, 1),
        estimated_reduction_percentage=max(0.0, reduction_pct)
    )

    return FieldPrescriptionMapResponse(
        type="FeatureCollection",
        field_id=field.id,
        field_name=field.name,
        crop_type=field.crop_type,
        area=field.area,
        features=features,
        summary=summary
    )


# ==========================================
# 3. Plants Endpoints (CRUD)
# ==========================================
@router.post("/plants", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
def create_plant(plant_in: PlantCreate, db: Session = Depends(get_db)):
    """
    Create a new plant under a field and automatically register its diagnosis & prescription.
    """
    field = db.query(Field).filter(Field.id == plant_in.field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with id {plant_in.field_id} not found"
        )

    plant_severity = (plant_in.severity or plant_in.status or "HEALTHY").upper()
    plant_disease = plant_in.disease or ("Healthy Crop" if plant_severity == "HEALTHY" else "Detected Issue")
    plant_infection = plant_in.infection_percentage or 0.0

    plant = Plant(
        field_id=plant_in.field_id,
        plant_code=plant_in.plant_code,
        latitude=plant_in.latitude,
        longitude=plant_in.longitude,
        crop_type=plant_in.crop_type or field.crop_type,
        status=plant_severity,
        disease=plant_disease,
        infection_percentage=plant_infection,
        severity=plant_severity
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)

    # Auto-generate Prescription for the plant
    presc_data = prescription_engine.generate(
        severity=plant.severity,
        disease=plant.disease,
        infection_percentage=plant.infection_percentage,
        crop_type=plant.crop_type,
        plant_id=plant.id
    )

    presc = Prescription(
        plant_id=plant.id,
        crop_type=plant.crop_type,
        disease=plant.disease,
        infection_percentage=plant.infection_percentage,
        severity=plant.severity,
        recommended_action=presc_data["recommended_action"],
        spray_level=presc_data["spray_level"],
        recommended_volume_ml=presc_data["recommended_volume_ml"],
        priority=presc_data["priority"],
        reason=presc_data.get("reason", ""),
        created_at=datetime.utcnow()
    )
    db.add(presc)
    db.commit()

    return plant


@router.get("/plants", response_model=List[PlantResponse])
def get_plants(field_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    List plants, optionally filtered by field_id.
    """
    query = db.query(Plant)
    if field_id is not None:
        query = query.filter(Plant.field_id == field_id)
    return query.all()


# ==========================================
# 4. Image Detection & AI Analysis
# ==========================================
@router.post("/detection/analyze", response_model=DetectionAnalyzeResponse)
@router.post("/detections/analyze", response_model=DetectionAnalyzeResponse)
@router.post("/ai/analyze", response_model=DetectionAnalyzeResponse)
async def analyze_plant_image(
    file: Optional[UploadFile] = File(None),
    plant_id: Optional[Union[int, str]] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Analyze plant leaf image using AI detector and return diagnosis.
    Supports /api/detection/analyze, /api/detections/analyze, and /api/ai/analyze.
    """
    image_filename = "leaf_sample.jpg"
    image_bytes = b""

    if file:
        image_bytes = await file.read()
        image_filename = file.filename or "uploaded_leaf.jpg"
        # Save upload locally
        save_path = os.path.join(settings.UPLOADS_DIR, f"{int(datetime.utcnow().timestamp())}_{image_filename}")
        with open(save_path, "wb") as f:
            f.write(image_bytes)
        image_url = f"/uploads/{os.path.basename(save_path)}"
    else:
        image_url = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop"

    # Run AI Detection Service
    ai_result = ai_detector.analyze_image(image_bytes, filename=image_filename)

    int_plant_id: Optional[int] = None
    if plant_id:
        try:
            int_plant_id = int(plant_id)
        except (ValueError, TypeError):
            int_plant_id = None

    # Update plant in DB if found
    if int_plant_id:
        plant = db.query(Plant).filter(Plant.id == int_plant_id).first()
        if plant:
            plant.disease = ai_result["disease"]
            plant.infection_percentage = ai_result["infection_percentage"]
            plant.severity = ai_result["severity"]
            plant.status = ai_result["severity"]
            db.commit()

    # Save detection record
    detection = Detection(
        plant_id=int_plant_id,
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
    """
    Generate prescription recommendation based on disease, infection percentage, and severity.
    Stores the prescription record in the database.
    """
    res = prescription_engine.generate(
        severity=req.severity,
        disease=req.disease,
        infection_percentage=req.infection_percentage,
        crop_type=req.crop_type,
        plant_id=req.plant_id
    )

    int_plant_id: Optional[int] = None
    if req.plant_id is not None:
        try:
            int_plant_id = int(req.plant_id)
        except (ValueError, TypeError):
            int_plant_id = None

    # Persist prescription in database
    presc = Prescription(
        plant_id=int_plant_id,
        crop_type=res.get("crop_type", "Crop"),
        disease=res["disease"],
        infection_percentage=res["infection_percentage"],
        severity=res["severity"],
        recommended_action=res["recommended_action"],
        spray_level=res["spray_level"],
        recommended_volume_ml=res["recommended_volume_ml"],
        priority=res["priority"],
        reason=res.get("reason", ""),
        created_at=datetime.utcnow()
    )
    db.add(presc)
    db.commit()
    db.refresh(presc)

    return PrescriptionGenerateResponse(
        id=presc.id,
        plant_id=req.plant_id,
        crop_type=res.get("crop_type"),
        disease=res["disease"],
        infection_percentage=res["infection_percentage"],
        severity=res["severity"],
        recommended_action=res["recommended_action"],
        spray_level=res["spray_level"],
        recommended_volume_ml=res["recommended_volume_ml"],
        priority=res["priority"],
        reason=res.get("reason"),
        disclaimer=res.get("disclaimer")
    )


@router.get("/prescriptions", response_model=List[PrescriptionResponse])
def get_prescriptions(db: Session = Depends(get_db)):
    """
    List all generated prescriptions.
    """
    return db.query(Prescription).order_by(Prescription.created_at.desc()).all()


@router.get("/prescriptions/map", response_model=List[PrescriptionMapItem])
def get_prescriptions_map(db: Session = Depends(get_db)):
    """
    Return geo-located prescription mapping data for field overlay.
    """
    plants = db.query(Plant).all()
    map_items = []

    for p in plants:
        # Determine latest prescription or generate rule on the fly
        rule = prescription_engine.DOSAGE_MAP.get(p.severity.upper(), prescription_engine.DOSAGE_MAP["HEALTHY"])
        map_items.append(PrescriptionMapItem(
            plant_id=p.id,
            latitude=p.latitude,
            longitude=p.longitude,
            severity=p.severity,
            infection_percentage=p.infection_percentage,
            recommended_volume_ml=rule["recommended_volume_ml"],
            priority=rule["priority"]
        ))

    return map_items


@router.get("/prescriptions/{plant_id}", response_model=PrescriptionResponse)
def get_prescription_by_plant_id(plant_id: int, db: Session = Depends(get_db)):
    """
    Retrieve latest prescription for a specific plant by its plant_id.
    """
    presc = db.query(Prescription).filter(Prescription.plant_id == plant_id).order_by(Prescription.created_at.desc()).first()
    if not presc:
        # Check if plant exists
        plant = db.query(Plant).filter(Plant.id == plant_id).first()
        if not plant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prescription not found for plant ID {plant_id}"
            )
        # Generate and save prescription for the existing plant
        res = prescription_engine.generate(
            severity=plant.severity,
            disease=plant.disease,
            infection_percentage=plant.infection_percentage,
            crop_type=plant.crop_type,
            plant_id=plant.id
        )
        presc = Prescription(
            plant_id=plant.id,
            crop_type=plant.crop_type,
            disease=res["disease"],
            infection_percentage=res["infection_percentage"],
            severity=res["severity"],
            recommended_action=res["recommended_action"],
            spray_level=res["spray_level"],
            recommended_volume_ml=res["recommended_volume_ml"],
            priority=res["priority"],
            reason=res["reason"],
            created_at=datetime.utcnow()
        )
        db.add(presc)
        db.commit()
        db.refresh(presc)

    return presc


# ==========================================
# 6. Sprayer Control & Automated Simulation
# ==========================================
@router.get("/sprayer/status", response_model=SprayerStatusResponse)
def get_sprayer_status(db: Session = Depends(get_db)):
    """
    Get current precision sprayer state machine status and mission telemetry.
    """
    return sprayer_controller.get_status(db)


@router.post("/sprayer/start", response_model=SprayerStartResponse)
def start_sprayer(db: Session = Depends(get_db)):
    """
    Arm and start the sprayer state machine (sets state to READY).
    """
    return sprayer_controller.start(db)


@router.post("/sprayer/stop", response_model=SprayerStopResponse)
def stop_sprayer(db: Session = Depends(get_db)):
    """
    Emergency halt the sprayer (sets state to IDLE).
    """
    return sprayer_controller.stop(db)


@router.post("/sprayer/execute-prescription", response_model=ExecutePrescriptionResponse)
def execute_prescription_mission(
    req: Optional[ExecutePrescriptionRequest] = Body(None),
    field_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Automated Field Prescription Execution:
    Prescription Map → Sprayer receives commands → moves to target plant → checks prescription → sprays required volume → records event.
    Enforces that healthy plants are NEVER sprayed.
    """
    target_field_id = None
    target_mode = "SIMULATED"

    if req and req.field_id:
        target_field_id = req.field_id
        target_mode = req.mode or "SIMULATED"
    elif field_id is not None:
        target_field_id = field_id
    else:
        # Default to first field
        first_field = db.query(Field).first()
        if first_field:
            target_field_id = first_field.id
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No agricultural fields registered to execute prescription."
            )

    try:
        result = sprayer_controller.execute_field_prescription(
            db=db,
            field_id=target_field_id,
            mode=target_mode
        )
        return ExecutePrescriptionResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Field prescription execution failed: {str(e)}"
        )


@router.get("/sprayers")
def get_sprayers(db: Session = Depends(get_db)):
    """
    Compatibility endpoint for sprayer device list.
    """
    status_info = sprayer_controller.get_status(db)
    return [{
        "id": 1,
        "device_code": "ESP32-AGRI-01",
        "name": "Precision Sprayer Alpha",
        "status": status_info["status"],
        "mode": status_info["mode"],
        "battery_level": status_info["battery_level"],
        "fluid_level_pct": status_info["fluid_level_pct"]
    }]


@router.post("/sprayer/spray", response_model=SprayerSprayResponse)
@router.post("/sprayers/trigger", response_model=SprayerSprayResponse)
def trigger_spray(
    req: SprayerSprayRequest,
    db: Session = Depends(get_db)
):
    """
    Trigger single targeted spot spray on a plant.
    """
    try:
        result = sprayer_controller.trigger_spray(
            db=db,
            plant_id=req.plant_id,
            volume_ml=req.volume_ml,
            mode=req.mode or "SIMULATED"
        )
        return SprayerSprayResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sprayer execution failed: {str(e)}"
        )


@router.get("/sprayer/history", response_model=List[SprayEventResponse])
@router.get("/spray-events", response_model=List[SprayEventResponse])
def get_spray_history(db: Session = Depends(get_db)):
    """
    List history log of all spray events.
    """
    return db.query(SprayEvent).order_by(SprayEvent.timestamp.desc()).all()


# ==========================================
# 7. Analytics Summary
# ==========================================
@router.get("/analytics/summary", response_model=AnalyticsSummaryResponse)
@router.get("/analytics")
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Compute aggregate analytics, severity breakdown, and chemical reduction estimation.
    """
    plants = db.query(Plant).all()
    total_plants = len(plants)
    healthy_count = sum(1 for p in plants if p.severity.upper() == "HEALTHY")
    low_count = sum(1 for p in plants if p.severity.upper() == "LOW")
    moderate_count = sum(1 for p in plants if p.severity.upper() == "MODERATE")
    high_count = sum(1 for p in plants if p.severity.upper() == "HIGH")

    # Actual precision spray volume recommended
    total_spray_vol = sum(
        prescription_engine.DOSAGE_MAP.get(p.severity.upper(), {}).get("recommended_volume_ml", 0.0)
        for p in plants
    )

    # Conventional blanket spraying assumes uniform high treatment (e.g. 20ml per plant)
    blanket_volume_estimate = total_plants * 20.0 if total_plants > 0 else 100.0
    
    if blanket_volume_estimate > 0:
        reduction_pct = round(((blanket_volume_estimate - total_spray_vol) / blanket_volume_estimate) * 100.0, 1)
    else:
        reduction_pct = 65.0

    return AnalyticsSummaryResponse(
        total_plants=total_plants,
        healthy_plants=healthy_count,
        low_infection=low_count,
        moderate_infection=moderate_count,
        high_infection=high_count,
        total_spray_volume=round(total_spray_vol, 1),
        untreated_volume_estimate=round(blanket_volume_estimate, 1),
        estimated_reduction_percentage=max(0.0, reduction_pct),
        note="Reduction percentage is an algorithmically calculated estimate vs blanket uniform spraying."
    )


# ==========================================
# 8. Demo Data Seeding
# ==========================================
@router.post("/demo/seed", response_model=DemoSeedResponse)
def seed_demo(db: Session = Depends(get_db)):
    """
    Seeds demo fields, plants, prescriptions, and sprayer state for testing and presentation.
    """
    result = seed_demo_data(db, force_reseed=True)
    return DemoSeedResponse(
        message=result["message"],
        fields_count=result["fields_count"],
        plants_count=result["plants_count"],
        prescriptions_count=result["prescriptions_count"]
    )
