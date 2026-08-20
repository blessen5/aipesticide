"""Train the weather-window classifier from generated scenario data.

This is a decision-support model, not a pesticide-dose model. The generated
labels encode conservative weather/scouting gates. Replace/augment this data
with verified field observations before production use.
"""
from pathlib import Path
import json
import random
import sys

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "artifacts"
ARTIFACT.mkdir(exist_ok=True)
DATASET = ARTIFACT / "weather_scouting_samples.jsonl"
MODEL = ARTIFACT / "weather_risk_model.joblib"
FEATURES = [
    "rain_probability_6h", "rain_mm_6h", "wind_max_kmh_6h", "gust_max_kmh_6h",
    "temperature_c", "humidity_pct", "leaf_wetness_proxy",
    "disease_pressure", "scouting_confidence"
]


def label(r):
    if r["rain_probability_6h"] >= 50 or r["rain_mm_6h"] >= 2: return "HOLD_RAIN"
    if r["wind_max_kmh_6h"] >= 15 or r["gust_max_kmh_6h"] >= 25: return "HOLD_WIND"
    if r["temperature_c"] >= 35: return "HOLD_HEAT"
    if r["leaf_wetness_proxy"] >= .8: return "HOLD_WET_LEAF"
    if r["scouting_confidence"] < .60: return "HOLD_LOW_CONFIDENCE"
    if r["disease_pressure"] < .20: return "MONITOR"
    return "FAVOURABLE_CHECK_LABEL"


def make_samples(n=25000, seed=42):
    rng = random.Random(seed)
    rows = []
    for _ in range(n):
        r = {
            "rain_probability_6h": rng.uniform(0, 100),
            "rain_mm_6h": max(0, rng.expovariate(1/2.0) - .4),
            "wind_max_kmh_6h": rng.uniform(0, 35),
            "gust_max_kmh_6h": rng.uniform(0, 45),
            "temperature_c": rng.uniform(12, 43),
            "humidity_pct": rng.uniform(25, 100),
            "leaf_wetness_proxy": rng.uniform(0, 1),
            "disease_pressure": rng.uniform(0, 1),
            "scouting_confidence": rng.uniform(.45, 1),
        }
        r["label"] = label(r)
        rows.append(r)
    return rows


def main():
    rows = make_samples()
    DATASET.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    X = np.array([[r[f] for f in FEATURES] for r in rows])
    y = np.array([r["label"] for r in rows])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=.2, random_state=42, stratify=y)
    clf = RandomForestClassifier(n_estimators=250, max_depth=14, random_state=42, n_jobs=-1, class_weight="balanced")
    clf.fit(X_train, y_train)
    print(classification_report(y_test, clf.predict(X_test), zero_division=0))
    joblib.dump(clf, MODEL)
    print(f"wrote {MODEL}")


if __name__ == "__main__":
    sys.exit(main())
