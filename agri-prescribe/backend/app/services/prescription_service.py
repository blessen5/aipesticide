"""
PrescriptionEngine for AgriPrescribe.

Translates AI Detection -> Infection Severity -> Treatment Recommendation -> Spray Quantity -> Priority -> Prescription Map.

Default Prototype Rules:
- HEALTHY: action = NO_TREATMENT, volume = 0 ml, priority = NONE, spray_level = NO_TREATMENT
- LOW: action = TARGETED_TREATMENT, volume = 5 ml, priority = LOW, spray_level = LOW
- MODERATE: action = TARGETED_TREATMENT, volume = 10 ml, priority = MEDIUM, spray_level = MEDIUM
- HIGH: action = TARGETED_TREATMENT, volume = 20 ml, priority = HIGH, spray_level = HIGH

IMPORTANT:
These are prototype demonstration values only.
Do not present them as real pesticide dosage recommendations.
Rules are kept fully configurable.
"""

from typing import Dict, Any, Optional, Union

PROTOTYPE_DISCLAIMER = (
    "Prototype demonstration values only. "
    "Do not use as real agricultural chemical dosage recommendations."
)


class PrescriptionEngine:
    """
    Configurable prescription generation engine.
    """

    DEFAULT_RULES = {
        "HEALTHY": {
            "recommended_action": "NO_TREATMENT",
            "spray_level": "NO_TREATMENT",
            "recommended_volume_ml": 0.0,
            "priority": "NONE",
            "reason_template": "Healthy {crop_type} foliage detected (infection: {infection_percentage:.1f}%). Routine monitoring recommended; no chemical treatment permitted."
        },
        "LOW": {
            "recommended_action": "TARGETED_TREATMENT",
            "spray_level": "LOW",
            "recommended_volume_ml": 5.0,
            "priority": "LOW",
            "reason_template": "Early-stage localized {disease} infection ({infection_percentage:.1f}%) on {crop_type}. Targeted low-volume preventative bio-spray recommended."
        },
        "MODERATE": {
            "recommended_action": "TARGETED_TREATMENT",
            "spray_level": "MEDIUM",
            "recommended_volume_ml": 10.0,
            "priority": "MEDIUM",
            "reason_template": "Moderate {disease} spread ({infection_percentage:.1f}%) on {crop_type}. Targeted medium pulse spray recommended to contain pathogen spread."
        },
        "HIGH": {
            "recommended_action": "TARGETED_TREATMENT",
            "spray_level": "HIGH",
            "recommended_volume_ml": 20.0,
            "priority": "HIGH",
            "reason_template": "Severe {disease} outbreak ({infection_percentage:.1f}%) on {crop_type}. Immediate high-priority targeted treatment required to arrest leaf damage."
        }
    }

    def __init__(self, custom_rules: Optional[Dict[str, Dict[str, Any]]] = None):
        self.rules = custom_rules or self.DEFAULT_RULES
        self.disclaimer = PROTOTYPE_DISCLAIMER

    @property
    def DOSAGE_MAP(self) -> Dict[str, Dict[str, Any]]:
        """
        Backward-compatible dictionary mapping for endpoints and stats.
        """
        return self.rules

    def generate(
        self,
        severity: str,
        disease: str,
        infection_percentage: float = 0.0,
        crop_type: Optional[str] = None,
        plant_id: Optional[Union[int, str]] = None
    ) -> Dict[str, Any]:
        """
        Generates a structured prescription recommendation.

        Input:
            - plant_id: Optional[Union[int, str]]
            - crop_type: Optional[str]
            - disease: str
            - infection_percentage: float
            - severity: str ('HEALTHY', 'LOW', 'MODERATE', 'HIGH')

        Output:
            - recommended_action: 'NO_TREATMENT' | 'TARGETED_TREATMENT'
            - spray_level: 'NO_TREATMENT' | 'LOW' | 'MEDIUM' | 'HIGH'
            - recommended_volume_ml: float (0.0, 5.0, 10.0, 20.0)
            - priority: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
            - reason: str
            - disclaimer: str
        """
        sev_key = (severity or "HEALTHY").strip().upper()
        rule = self.rules.get(sev_key, self.rules["HEALTHY"])

        crop = crop_type or "Crop"
        inf_pct = max(0.0, float(infection_percentage))

        # Enforce safety rule: Healthy plants MUST NEVER receive spray volume
        if sev_key == "HEALTHY" or inf_pct <= 0.0:
            rec_action = "NO_TREATMENT"
            rec_volume = 0.0
            priority = "NONE"
            spray_level = "NO_TREATMENT"
            reason = f"Healthy {crop} foliage detected ({inf_pct:.1f}% infection). No treatment required; spray prohibited."
        else:
            rec_action = rule["recommended_action"]
            rec_volume = float(rule["recommended_volume_ml"])
            priority = rule["priority"]
            spray_level = rule["spray_level"]
            reason = rule["reason_template"].format(
                crop_type=crop,
                disease=disease,
                infection_percentage=inf_pct
            )

        return {
            "plant_id": plant_id,
            "crop_type": crop,
            "disease": disease,
            "infection_percentage": inf_pct,
            "severity": sev_key,
            "recommended_action": rec_action,
            "spray_level": spray_level,
            "recommended_volume_ml": rec_volume,
            "priority": priority,
            "reason": reason,
            "disclaimer": self.disclaimer
        }


# Global Singleton Instance
prescription_engine = PrescriptionEngine()
