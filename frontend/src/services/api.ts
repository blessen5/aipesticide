import {
  Field,
  Plant,
  DetectionAnalyzeResponse,
  Prescription,
  PrescriptionGenerateResponse,
  FieldPrescriptionMapResponse,
  SprayerStatus,
  SprayEvent,
  AnalyticsSummary,
  ExecutePrescriptionResponse,
  Zone
} from '../types';
// Custom fetch wrapper to include Authorization header
const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const role = localStorage.getItem('userRole') || 'FARMER';
  const newInit = init || {};
  newInit.headers = {
    ...newInit.headers,
    'X-User-Role': role,
  };
  return fetch(input, newInit);
};

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
export const BASE_URL = API_BASE.replace(/\/api\/?$/, '');


// Offline caching utility
const offlineGet = async <T>(url: string, cacheKey: string): Promise<T> => {
  try {
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch (err) {
    console.warn(`Network fetch failed for ${url}, falling back to cache.`);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    throw err;
  }
};

export const api = {
  // 1. Health check
  getHealth: async (): Promise<{ status: string; service: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/health`);
    if (!res.ok) throw new Error('API is currently unreachable');
    return res.json();
  },

  // 2. Analytics Summary
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const res = await fetchWithAuth(`${API_BASE}/analytics/summary`);
    if (!res.ok) throw new Error('Failed to fetch analytics summary');
    return res.json();
  },

  // 3. Fields
  getFields: async (): Promise<Field[]> => {
    return offlineGet<Field[]>(`${API_BASE}/fields`, 'cache_fields');
  },

  getZones: async (fieldId?: number): Promise<Zone[]> => {
    const url = fieldId ? `${API_BASE}/zones?field_id=${fieldId}` : `${API_BASE}/zones`;
    return offlineGet<Zone[]>(url, `cache_zones_${fieldId || 'all'}`);
  },

  // 4. Plants
  getPlants: async (fieldId?: number): Promise<Plant[]> => {
    const url = fieldId ? `${API_BASE}/plants?field_id=${fieldId}` : `${API_BASE}/plants`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Failed to fetch plants');
    return res.json();
  },

  createPlant: async (plantData: any): Promise<Plant> => {
    const res = await fetchWithAuth(`${API_BASE}/plants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plantData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create plant');
    }
    return res.json();
  },

  // 5. Field Prescription GeoJSON Map
  getFieldPrescriptionMap: async (fieldId: number): Promise<FieldPrescriptionMapResponse> => {
    const res = await fetchWithAuth(`${API_BASE}/fields/${fieldId}/prescription-map`);
    if (!res.ok) throw new Error(`Failed to load prescription map for field #${fieldId}`);
    return res.json();
  },

  // 6. AI Disease Detection
  analyzePlantImage: async (formData: FormData): Promise<DetectionAnalyzeResponse> => {
    const res = await fetchWithAuth(`${API_BASE}/ai/analyze`, {
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
    const res = await fetchWithAuth(`${API_BASE}/prescriptions/generate`, {
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
    const res = await fetchWithAuth(`${API_BASE}/prescriptions`);
    if (!res.ok) throw new Error('Failed to fetch prescriptions');
    return res.json();
  },

  // 9. Prescription by Plant ID
  getPrescriptionByPlantId: async (plantId: number): Promise<Prescription> => {
    const res = await fetchWithAuth(`${API_BASE}/prescriptions/${plantId}`);
    if (!res.ok) throw new Error(`Prescription for plant #${plantId} not found`);
    return res.json();
  },

  // 10. Sprayer Status
  getSprayerStatus: async (): Promise<SprayerStatus> => {
    return offlineGet<SprayerStatus>(`${API_BASE}/sprayer/status`, 'cache_sprayer_status');
  },

  // 11. Start Sprayer
  startSprayer: async (): Promise<{ status: string; message: string; mode: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/sprayer/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start sprayer master controller');
    return res.json();
  },

  // 12. Stop Sprayer
  stopSprayer: async (): Promise<{ status: string; message: string }> => {
    const res = await fetchWithAuth(`${API_BASE}/sprayer/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop sprayer master controller');
    return res.json();
  },

  // 13. Execute Field Prescription Mission
  executeFieldPrescription: async (fieldId: number, mode: string = 'SIMULATED'): Promise<ExecutePrescriptionResponse> => {
    const res = await fetchWithAuth(`${API_BASE}/sprayer/execute-prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, mode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Field prescription execution failed');
    }
    return res.json();
  },

  // 14. Trigger Single Precision Spray
  triggerSpray: async (plantId: number | string, volumeMl: number, mode: string = 'SIMULATED'): Promise<SprayEvent> => {
    const res = await fetchWithAuth(`${API_BASE}/sprayer/spray`, {
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

  setHardwareMode: async (mode: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_BASE}/hardware/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to set hardware mode');
    }
    return res.json();
  },

  simulateFault: async (fault_type: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_BASE}/hardware/simulate-fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fault_type })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to simulate fault');
    }
    return res.json();
  },

  // 15. Spray History
  getSprayHistory: async (): Promise<SprayEvent[]> => {
    const res = await fetchWithAuth(`${API_BASE}/sprayer/history`);
    if (!res.ok) throw new Error('Failed to fetch spray event history');
    return res.json();
  },

  // 16. Reseed / Reset Demo Data
  seedDemoData: async () => {
    const res = await fetchWithAuth(`${API_BASE}/demo/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset and seed demo dataset');
    return res.json();
  },

  resetDemo: async () => {
    const res = await fetchWithAuth(`${API_BASE}/demo/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset demo dataset');
    return res.json();
  },

  // 17. Storage Registry / Products
  getProducts: async (): Promise<any[]> => {
    return offlineGet<any[]>(`${API_BASE}/products`, 'cache_products');
  },

  // 18. Audit History
  getAuditLogs: async (): Promise<any[]> => {
    return offlineGet<any[]>(`${API_BASE}/audit`, 'cache_audit');
  }
};
