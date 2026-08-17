export type SeverityLevel = 'HEALTHY' | 'LOW' | 'MODERATE' | 'HIGH';
export type PriorityLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type RecommendedAction = 'NO_TREATMENT' | 'TARGETED_TREATMENT';
export type SprayLevel = 'NO_TREATMENT' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface Field {
  id: number;
  name: string;
  crop_type: string;
  area: number;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Plant {
  id: number;
  field_id: number;
  plant_code: string;
  latitude: number;
  longitude: number;
  crop_type: string;
  status: string;
  disease: string;
  infection_percentage: number;
  severity: SeverityLevel;
  created_at: string;
}

export interface Detection {
  id: number;
  plant_id?: number;
  image_url: string;
  disease: string;
  confidence: number;
  infection_percentage: number;
  severity: SeverityLevel;
  analyzed_at: string;
}

export interface DetectionAnalyzeResponse {
  plant_id?: number | string;
  disease: string;
  confidence: number;
  infection_percentage: number;
  severity: SeverityLevel;
  affected_area: number;
  explanation: string;
  boxes?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
  }>;
}

export interface Prescription {
  id: number;
  plant_id?: number;
  crop_type?: string;
  disease: string;
  infection_percentage: number;
  severity: SeverityLevel;
  recommended_action: string;
  spray_level: string;
  recommended_volume_ml: number;
  priority: string;
  reason?: string;
  created_at: string;
}

export interface PrescriptionGenerateResponse {
  id?: number;
  plant_id?: number | string;
  crop_type?: string;
  disease: string;
  infection_percentage: number;
  severity: SeverityLevel;
  recommended_action: string;
  spray_level: string;
  recommended_volume_ml: number;
  priority: string;
  reason?: string;
  disclaimer?: string;
}

export interface PrescriptionMapFeatureProperties {
  plant_id: number | string;
  plant_code: string;
  disease: string;
  severity: SeverityLevel;
  infection_percentage: number;
  recommended_volume_ml: number;
  priority: string;
  recommended_action: string;
  spray_level: string;
}

export interface PrescriptionMapFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: PrescriptionMapFeatureProperties;
}

export interface FieldPrescriptionSummary {
  total_plants: number;
  healthy: number;
  low: number;
  moderate: number;
  high: number;
  total_recommended_spray: number;
  blanket_spray_estimate: number;
  estimated_reduction_percentage: number;
}

export interface FieldPrescriptionMapResponse {
  type: 'FeatureCollection';
  field_id: number;
  field_name: string;
  crop_type: string;
  area: number;
  features: PrescriptionMapFeature[];
  summary: FieldPrescriptionSummary;
}

export interface SprayerStatus {
  status: 'READY' | 'SPRAYING' | 'STOPPED' | 'IDLE';
  mode: string;
  battery_level: number;
  fluid_level_pct: number;
}

export interface SprayEvent {
  id: number;
  command_id: string;
  plant_id?: number;
  volume_ml: number;
  status: string;
  mode: string;
  timestamp: string;
}

export interface AnalyticsSummary {
  total_plants: number;
  healthy_plants: number;
  low_infection: number;
  moderate_infection: number;
  high_infection: number;
  total_spray_volume: number;
  untreated_volume_estimate: number;
  estimated_reduction_percentage: number;
  note: string;
}
