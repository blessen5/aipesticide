import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.knowledge_models import PlantDisease, ManagementRecommendation

logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self):
        pass

    def generate_recommendation(
        self,
        db: Session,
        disease_name: str,
        severity: str,
        confidence: float,
        crop_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Phase 14 & 15: Smart Recommendation Engine.
        Does NOT automatically spray. Generates explainable recommendation based on KB.
        """
        if confidence < 0.60 or severity == "UNKNOWN":
            return {
                "diagnosisSummary": "Insufficient confidence or unknown condition.",
                "confidence": confidence,
                "recommendedNextStep": "Please capture another clear image.",
                "prevention": "Ensure good lighting and focus.",
                "nonChemicalManagement": "",
                "monitoringAdvice": "",
                "applicationEligibility": "BLOCKED",
                "sourceReferences": "System",
                "recommended_action": "RETAKE_IMAGE",
                "spray_level": "NO_TREATMENT",
                "recommended_volume_ml": 0.0,
                "priority": "NONE"
            }

        if disease_name == "Healthy":
            return {
                "diagnosisSummary": "Crop appears healthy.",
                "confidence": confidence,
                "recommendedNextStep": "Continue routine monitoring.",
                "prevention": "Maintain optimal irrigation and nutrient levels.",
                "nonChemicalManagement": "",
                "monitoringAdvice": "Scan weekly.",
                "applicationEligibility": "NOT_REQUIRED",
                "sourceReferences": "System",
                "recommended_action": "NO_TREATMENT",
                "spray_level": "NO_TREATMENT",
                "recommended_volume_ml": 0.0,
                "priority": "NONE"
            }

        # Query KB for disease info
        disease = db.query(PlantDisease).filter(PlantDisease.name == disease_name).first()
        
        prevention = "Ensure field sanitation and proper spacing."
        non_chemical = "Remove affected plant parts."
        sources = "System Defaults"
        
        if disease:
            prevention = disease.prevention or prevention
            non_chemical = disease.non_chemical_management or non_chemical
            sources = disease.source_references or sources

        # Determine application eligibility (Safety Gate logic)
        eligibility = "ELIGIBLE_FOR_WATER_DEMO"
        action = "TARGETED_TREATMENT"
        
        if severity == "LOW":
            vol = 20.0
            prio = "LOW"
            action = "MONITOR"
            spray_level = "NO_TREATMENT"
            eligibility = "NOT_REQUIRED"
        elif severity == "MODERATE":
            vol = 50.0
            prio = "MEDIUM"
            action = "TARGETED_TREATMENT"
            spray_level = "SPOT_SPRAY"
        else:
            vol = 100.0
            prio = "HIGH"
            action = "IMMEDIATE_TREATMENT"
            spray_level = "FULL_COVERAGE"

        return {
            "diagnosisSummary": f"Detected {disease_name} with {severity} severity.",
            "confidence": confidence,
            "recommendedNextStep": f"Review management options for {disease_name}.",
            "prevention": prevention,
            "nonChemicalManagement": non_chemical,
            "monitoringAdvice": "Monitor surrounding plants closely.",
            "applicationEligibility": eligibility,
            "sourceReferences": sources,
            "recommended_action": action,
            "spray_level": spray_level,
            "recommended_volume_ml": vol,
            "priority": prio
        }

smart_recommendation_engine = RecommendationEngine()
