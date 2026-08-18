from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.knowledge_models import Crop, PlantDisease, CropPest, Symptom, ManagementRecommendation, KnowledgeSource
from app.schemas.knowledge_schemas import (
    CropCreate, CropResponse,
    PlantDiseaseCreate, PlantDiseaseResponse,
    CropPestCreate, CropPestResponse,
    SymptomCreate, SymptomResponse,
    ManagementRecommendationCreate, ManagementRecommendationResponse,
    KnowledgeSourceCreate, KnowledgeSourceResponse
)

router = APIRouter()

# Crops
@router.post("/crops", response_model=CropResponse, status_code=status.HTTP_201_CREATED)
def create_crop(crop_in: CropCreate, db: Session = Depends(get_db)):
    crop = Crop(**crop_in.model_dump())
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop

@router.get("/crops", response_model=List[CropResponse])
def get_crops(db: Session = Depends(get_db)):
    return db.query(Crop).all()

# Plant Diseases
@router.post("/diseases", response_model=PlantDiseaseResponse, status_code=status.HTTP_201_CREATED)
def create_disease(disease_in: PlantDiseaseCreate, db: Session = Depends(get_db)):
    disease = PlantDisease(**disease_in.model_dump())
    db.add(disease)
    db.commit()
    db.refresh(disease)
    return disease

@router.get("/diseases", response_model=List[PlantDiseaseResponse])
def get_diseases(db: Session = Depends(get_db)):
    return db.query(PlantDisease).all()

# Management Recommendations
@router.post("/management", response_model=ManagementRecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_management(mgmt_in: ManagementRecommendationCreate, db: Session = Depends(get_db)):
    mgmt = ManagementRecommendation(**mgmt_in.model_dump())
    db.add(mgmt)
    db.commit()
    db.refresh(mgmt)
    return mgmt

@router.get("/management", response_model=List[ManagementRecommendationResponse])
def get_management(db: Session = Depends(get_db)):
    return db.query(ManagementRecommendation).all()

