import {
  Field,
  Plant,
  DetectionAnalyzeResponse,
  Prescription,
  PrescriptionGenerateResponse,
  FieldPrescriptionMapResponse,
  SprayerStatus,
  SprayEvent,
  AnalyticsSummary
} from '../types';

const API_BASE = '/api';

export const api = {
  // 1. Health check
  getHealth: async (): Promise<{ status: string; service: string }> => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('API is currently unreachable');
    return res.json();
  },

  // 2. Analytics Summary
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const res = await fetch(`${API_BASE}/analytics/summary`);
    if (!res.ok) throw new Error('Failed to fetch analytics summary');
    return res.json();
  },

  // 3. Fields
  getFields: async (): Promise<Field[]> => {
    const res = await fetch(`${API_BASE}/fields`);
    if (!res.ok) throw new Error('Failed to fetch agricultural fields');
    return res.json();
  },

  // 4. Plants
  getPlants: async (fieldId?: number): Promise<Plant[]> => {
    const url = fieldId ? `${API_BASE}/plants?field_id=${fieldId}` : `${API_BASE}/plants`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch plants');
    return res.json();
  },

  // 5. Field Prescription GeoJSON Map
  getFieldPrescriptionMap: async (fieldId: number): Promise<FieldPrescriptionMapResponse> => {
    const res = await fetch(`${API_BASE}/fields/${fieldId}/prescription-map`);
    if (!res.ok) throw new Error(`Failed to load prescription map for field #${fieldId}`);
    return res.json();
  },

  // 6. AI Disease Detection
  analyzePlantImage: async (formData: FormData): Promise<DetectionAnalyzeResponse> => {
    const res = await fetch(`${API_BASE}/detection/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Plant disease analysis failed');
    }
    return res.json();
  },

  // 7. Prescription Generator
  generatePrescription: async (payload: {
    plant_id?: number | string;
    crop_type?: string;
    disease: string;
    infection_percentage: number;
    severity: string;
  }): Promise<PrescriptionGenerateResponse> => {
    const res = await fetch(`${API_BASE}/prescriptions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Prescription generation failed');
    }
    return res.json();
  },

  // 8. Prescriptions List
  getPrescriptions: async (): Promise<Prescription[]> => {
    const res = await fetch(`${API_BASE}/prescriptions`);
    if (!res.ok) throw new Error('Failed to fetch prescriptions');
    return res.json();
  },

  // 9. Prescription by Plant ID
  getPrescriptionByPlantId: async (plantId: number): Promise<Prescription> => {
    const res = await fetch(`${API_BASE}/prescriptions/${plantId}`);
    if (!res.ok) throw new Error(`Prescription for plant #${plantId} not found`);
    return res.json();
  },

  // 10. Sprayer Status
  getSprayerStatus: async (): Promise<SprayerStatus> => {
    const res = await fetch(`${API_BASE}/sprayer/status`);
    if (!res.ok) throw new Error('Failed to fetch sprayer telemetry');
    return res.json();
  },

  // 11. Trigger Precision Spray
  triggerSpray: async (plantId: number | string, volumeMl: number, mode: string = 'SIMULATED'): Promise<SprayEvent> => {
    const res = await fetch(`${API_BASE}/sprayer/spray`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plant_id: plantId,
        volume_ml: volumeMl,
        mode: mode
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Sprayer execution failed');
    }
    return res.json();
  },

  // 12. Spray History
  getSprayHistory: async (): Promise<SprayEvent[]> => {
    const res = await fetch(`${API_BASE}/sprayer/history`);
    if (!res.ok) throw new Error('Failed to fetch spray event history');
    return res.json();
  },

  // 13. Reseed Demo Data
  seedDemoData: async () => {
    const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset and seed demo dataset');
    return res.json();
  }
};
