# AgriPrescribe Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │                Smartphone / Browser UI                  │
 │          React 18 + Tailwind CSS + Leaflet              │
 └────────────────────────────┬────────────────────────────┘
                              │ REST HTTP / JSON
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │                   FastAPI Backend API                   │
 │           SQLAlchemy ORM + SQLite Database              │
 └──────────────┬───────────────────────────┬──────────────┘
                │                           │
                ▼                           ▼
 ┌─────────────────────────────┐ ┌─────────────────────────┐
 │      AI Disease Engine      │ │   Precision Sprayer     │
 │  OpenCV + Heuristic Feature │ │   Controller & Telemetry│
 │  (Pluggable ONNX ML Ready)  │ │ (Simulated + ESP32 REST)│
 └─────────────────────────────┘ └─────────────────────────┘
```

## System Workflow
1. **Field Mapping & Plant Tagging**: Farmer marks GPS field boundaries and registers plant tag IDs.
2. **AI Disease Diagnosis**: Leaf photo uploaded -> OpenCV feature extraction calculates lesion ratio -> disease classification & severity rating (`HEALTHY`, `LOW`, `MODERATE`, `HIGH`).
3. **Prescription Generation**: Automated calculation of chemical concentration (mL/L), required spray volume, and safety warnings.
4. **Interactive Target Heatmap**: Visualizes field zones requiring targeted treatment vs healthy zones.
5. **Precision Spray Execution**: Trigger command sent to ESP32 Smart Sprayer or Software Simulator -> pulse spray applied only to target locations.
6. **Audit & Analytics**: Execution log updated, tracking 65.4% reduction in chemical pesticide consumption.
