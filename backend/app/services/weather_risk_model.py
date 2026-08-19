"""Weather-aware spray-window risk model.

This model predicts only an application-window class. It never prescribes a
chemical, concentration, dose, or product. Train it with `train_weather_model.py`.
"""
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

MODEL_FEATURES = [
    "rain_probability_6h",
    "rain_mm_6h",
    "wind_max_kmh_6h",
    "gust_max_kmh_6h",
    "temperature_c",
    "humidity_pct",
    "leaf_wetness_proxy",
    "disease_pressure",
    "scouting_confidence",
]
MODEL_PATH = Path(__file__).resolve().parents[2] / "artifacts" / "weather_risk_model.joblib"


def _rule_gate(x: Dict[str, float]) -> str:
    """Conservative agronomic gate used both as fallback and training target."""
    if x["rain_probability_6h"] >= 50 or x["rain_mm_6h"] >= 2:
        return "HOLD_RAIN"
    if x["wind_max_kmh_6h"] >= 15 or x["gust_max_kmh_6h"] >= 25:
        return "HOLD_WIND"
    if x["temperature_c"] >= 35:
        return "HOLD_HEAT"
    if x["leaf_wetness_proxy"] >= 0.8:
        return "HOLD_WET_LEAF"
    if x["scouting_confidence"] < 0.60:
        return "HOLD_LOW_CONFIDENCE"
    if x["disease_pressure"] < 0.20:
        return "MONITOR"
    return "FAVOURABLE_CHECK_LABEL"


def predict_weather_risk(features: Dict[str, float]) -> Dict[str, Any]:
    """Return an explainable, safety-first window decision."""
    x = {name: float(features.get(name, 0.0)) for name in MODEL_FEATURES}
    label = None
    confidence = 0.70
    model_used = False

    if MODEL_PATH.exists():
        try:
            import joblib
            model = joblib.load(MODEL_PATH)
            arr = np.array([[x[name] for name in MODEL_FEATURES]], dtype=float)
            label = str(model.predict(arr)[0])
            if hasattr(model, "predict_proba"):
                confidence = float(np.max(model.predict_proba(arr)[0]))
            model_used = True
        except Exception:
            label = None

    # Hard safety gates override any learned model output.
    hard_label = _rule_gate(x)
    if hard_label.startswith("HOLD_"):
        label = hard_label
        confidence = 1.0

    if label is None:
        label = hard_label

    reasons: List[str] = []
    if x["rain_probability_6h"] >= 50 or x["rain_mm_6h"] >= 2:
        reasons.append("Rain/wash-off risk")
    if x["wind_max_kmh_6h"] >= 15 or x["gust_max_kmh_6h"] >= 25:
        reasons.append("Spray-drift risk")
    if x["temperature_c"] >= 35:
        reasons.append("Heat stress risk")
    if x["leaf_wetness_proxy"] >= 0.8:
        reasons.append("Likely wet foliage")
    if x["scouting_confidence"] < 0.60:
        reasons.append("Insufficient scouting confidence")
    if x["disease_pressure"] < 0.20:
        reasons.append("Low observed disease pressure")

    return {
        "decision": "HOLD" if label.startswith("HOLD_") else label,
        "label": label,
        "confidence": round(confidence, 3),
        "model_used": model_used,
        "reasons": reasons,
        "features": x,
        "safety_note": "Confirm crop, diagnosis, product label, PPE and local agronomic guidance before any application.",
    }
