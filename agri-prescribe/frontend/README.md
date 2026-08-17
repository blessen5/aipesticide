# AgriPrescribe Frontend

React 18 + TypeScript + Vite + Tailwind CSS web application for the **AgriPrescribe** SIH 2026 prototype.

## Features
- **Farmer Dashboard**: Real-time overview of field health, ESP32 status, and chemical savings metrics.
- **AI Disease Detection**: Camera capture/upload + preset sample selector with annotated bounding box overlays.
- **Prescription Map**: Leaflet interactive GPS field map with infection severity heatmaps.
- **ESP32 Sprayer Control**: Telemetry hub, simulated vs hardware toggle, and 4-channel nozzle test suite.
- **Interactive Analytics**: Recharts visualizations for 65.4% pesticide savings and pathogen distribution.

## Development Setup

```bash
cd frontend
npm install
npm run dev
```

App will run at: `http://localhost:5173`
