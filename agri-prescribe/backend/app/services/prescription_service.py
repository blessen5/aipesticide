"""
Configurable Prescription Rules Engine for AgriPrescribe
Defines dosage levels, volume in mL, treatment recommendations, and priorities.
"""

class PrescriptionRules:
    """
    Centralized configuration for precision spray levels and volume rules.
    """

    DOSAGE_MAP = {
        "HEALTHY": {
            "spray_level": "NO_TREATMENT",
            "recommended_volume_ml": 0.0,
            "priority": "NONE",
            "recommended_action": "No chemical treatment required. Routine crop monitoring recommended."
        },
        "LOW": {
            "spray_level": "LOW",
            "recommended_volume_ml": 5.0,
            "priority": "LOW",
            "recommended_action": "Apply targeted low-dosage bio-pesticide or eco-friendly preventative fungicide."
        },
        "MODERATE": {
            "spray_level": "MEDIUM",
            "recommended_volume_ml": 10.0,
            "priority": "MEDIUM",
            "recommended_action": "Apply moderate precision pulse spray targeting affected foliage."
        },
        "HIGH": {
            "spray_level": "HIGH",
            "recommended_volume_ml": 20.0,
            "priority": "HIGH",
            "recommended_action": "Immediate high-priority precision chemical treatment required to contain pathogen outbreak."
        }
    }

    @classmethod
    def generate(cls, severity: str, disease: str, infection_pct: float, plant_id: str = None) -> dict:
        severity_key = severity.upper() if severity else "HEALTHY"
        rule = cls.DOSAGE_MAP.get(severity_key, cls.DOSAGE_MAP["HEALTHY"])

        return {
            "plant_id": plant_id,
            "disease": disease,
            "infection_percentage": infection_pct,
            "severity": severity_key,
            "recommended_action": rule["recommended_action"],
            "spray_level": rule["spray_level"],
            "recommended_volume_ml": rule["recommended_volume_ml"],
            "priority": rule["priority"]
        }

prescription_engine = PrescriptionRules()
