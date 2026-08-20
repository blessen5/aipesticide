import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.knowledge_models import PlantDisease, ManagementRecommendation
from app.services.weather_risk_model import predict_weather_risk

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
        crop_type: Optional[str] = None,
        weather_features: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Generate explainable integrated-management guidance.

        Weather intelligence can block an application window, but it never
        invents a pesticide, concentration, dose, or label instruction.
        """
        if confidence < 0.60 or severity == "UNKNOWN":
            return {
                "diagnosisSummary": "Insufficient confidence or unknown condition.",
                "confidence": confidence,
                "recommendedNextStep": "Please capture another clear image.",
                "prevention": "Improve image quality and repeat scouting.",
                "nonChemicalManagement": "Continue visual scouting and remove visibly affected material where agronomically appropriate.",
                "monitoringAdvice": "Re-scout on the scheduled survey time.",
                "applicationEligibility": "BLOCKED",
                "sourceReferences": "System",
                "recommended_action": "RETAKE_IMAGE",
                "spray_level": "NO_TREATMENT",
                "recommended_volume_ml": 0.0,
                "priority": "NONE",
                "weather_gate": None,
            }

        if disease_name == "Healthy":
            return {
                "diagnosisSummary": "Crop appears healthy.",
                "confidence": confidence,
                "recommendedNextStep": "Continue routine monitoring.",
                "prevention": "Maintain crop hygiene, balanced irrigation and nutrition.",
                "nonChemicalManagement": "No treatment indicated from this observation.",
                "monitoringAdvice": "Continue scheduled scouting.",
                "applicationEligibility": "NOT_REQUIRED",
                "sourceReferences": "System",
                "recommended_action": "NO_TREATMENT",
                "spray_level": "NO_TREATMENT",
                "recommended_volume_ml": 0.0,
                "priority": "NONE",
                "weather_gate": None,
            }

        disease = db.query(PlantDisease).filter(PlantDisease.name == disease_name).first()
        prevention = "Ensure field sanitation, suitable spacing and regular scouting."
        non_chemical = "Remove affected plant parts where appropriate and monitor nearby plants."
        sources = "System Defaults"
        if disease:
            prevention = disease.prevention or prevention
            non_chemical = disease.non_chemical_management or non_chemical
            sources = disease.source_references or sources

        weather_gate = None
        if weather_features:
            weather_gate = predict_weather_risk({
                **weather_features,
                "disease_pressure": min(1.0, max(0.0, {"LOW": .15, "MODERATE": .55, "HIGH": .9}.get(severity, .3))),
                "scouting_confidence": confidence,
            })

        action = "MONITOR" if severity == "LOW" else "TARGETED_TREATMENT"
        spray_level = "NO_TREATMENT" if severity == "LOW" else "SPOT_SPRAY"
        priority = "LOW" if severity == "LOW" else ("MEDIUM" if severity == "MODERATE" else "HIGH")
        eligibility = "NOT_REQUIRED" if severity == "LOW" else "REVIEW_LABEL_AND_OPERATOR"

        if weather_gate and weather_gate["decision"] == "HOLD":
            action = "HOLD_AND_RESCOUT"
            eligibility = "BLOCKED_BY_WEATHER"
            spray_level = "NO_TREATMENT"

        return {
            "diagnosisSummary": f"Detected {disease_name} with {severity} severity.",
            "confidence": confidence,
            "recommendedNextStep": "Review integrated management options and the product label with an authorised operator.",
            "prevention": prevention,
            "nonChemicalManagement": non_chemical,
            "monitoringAdvice": "Monitor surrounding plants closely and follow the time-based survey schedule.",
            "applicationEligibility": eligibility,
            "sourceReferences": sources,
            "recommended_action": action,
            "spray_level": spray_level,
            "recommended_volume_ml": 0.0,
            "priority": priority,
            "weather_gate": weather_gate,
            "safety_note": "The system does not prescribe pesticide dose or product. Follow the registered product label, PPE requirements and local agronomic guidance.",
        }

smart_recommendation_engine = RecommendationEngine()
