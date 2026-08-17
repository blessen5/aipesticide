import {
  Field,
  Plant,
  Detection,
  Prescription,
  SprayEvent,
  Device,
  AIAnalysisResponse,
  DashboardStats
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Fields
  getFields: async (): Promise<Field[]> => {
    const res = await fetch(`${API_BASE}/fields`);
    if (!res.ok) throw new Error('Failed to fetch fields');
    return res.json();
  },

  // Plants
  getPlants: async (fieldId?: number): Promise<Plant[]> => {
    const url = fieldId ? `${API_BASE}/plants?field_id=${fieldId}` : `${API_BASE}/plants`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch plants');
    return res.json();
  },

  // Detections
  getDetections: async (): Promise<Detection[]> => {
    const res = await fetch(`${API_BASE}/detections`);
    if (!res.ok) throw new Error('Failed to fetch detections');
    return res.json();
  },

  // AI Image Analysis
  analyzeImage: async (formData: FormData): Promise<AIAnalysisResponse> => {
    const res = await fetch(`${API_BASE}/ai/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('AI Image analysis failed');
    return res.json();
  },

  // Prescriptions
  getPrescriptions: async (): Promise<Prescription[]> => {
    const res = await fetch(`${API_BASE}/prescriptions`);
    if (!res.ok) throw new Error('Failed to fetch prescriptions');
    return res.json();
  },

  // Sprayers / Devices
  getSprayers: async (): Promise<Device[]> => {
    const res = await fetch(`${API_BASE}/sprayers`);
    if (!res.ok) throw new Error('Failed to fetch sprayers');
    return res.json();
  },

  // Trigger Precision Spray
  triggerSprayer: async (prescriptionId: number, deviceId: number, mode: string = 'SIMULATED') => {
    const res = await fetch(`${API_BASE}/sprayers/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prescription_id: prescriptionId,
        device_id: deviceId,
        mode: mode
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Sprayer trigger failed');
    }
    return res.json();
  },

  // Spray Events History
  getSprayEvents: async (): Promise<SprayEvent[]> => {
    const res = await fetch(`${API_BASE}/spray-events`);
    if (!res.ok) throw new Error('Failed to fetch spray history');
    return res.json();
  },

  // Analytics
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Reset & Seed Demo Data
  seedDemoData: async () => {
    const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed demo data');
    return res.json();
  }
};
