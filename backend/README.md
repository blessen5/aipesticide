# AgriPrescribe Backend

FastAPI & SQLAlchemy backend service for the **AgriPrescribe** SIH 2026 prototype.

## Features
- **AI Plant Disease Analysis**: OpenCV heuristic feature detection with pluggable ONNX/PyTorch model interface.
- **Precision Prescription Engine**: Automatic dosage (mL/L), water calculation, and safety instructions based on severity.
- **Sprayer Controller**: Native hardware REST client for ESP32 and real-time Simulated Sprayer state machine.
- **Interactive Mapping & Telemetry**: GPS field boundaries, plant health mapping, and historical analytics.
- **Automatic Seed Engine**: Populates demo fields, plants, detections, and ESP32 sprayers on startup.

## Quickstart

```bash
cd backend
pip install -r requirements.txt
python -m app.main
```

API Documentation will be accessible at:
`http://localhost:8000/docs`
