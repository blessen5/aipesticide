export type SeverityLevel = 'HEALTHY' | 'LOW' | 'MODERATE' | 'HIGH';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface Field {
  id: number;
  user_id: number;
  name: string;
  location_name: string;
  crop_type: string;
  area_hectares: number;
  boundary_geojson?: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Plant {
  id: number;
  field_id: number;
  tag_id: string;
  latitude: number;
  longitude: number;
  health_status: string;
  created_at: string;
}

export interface Detection {
  id: number;
  plant_id?: number;
  field_id?: number;
  image_url: string;
  disease_detected: string;
  confidence: number;
  infection_percentage: number;
  severity: SeverityLevel;
  bounding_boxes_json?: string;
  analyzed_at: string;
}

export interface Prescription {
  id: number;
  detection_id: number;
  field_id: number;
  pesticide_name: string;
  chemical_category: string;
  dosage_ml_per_liter: number;
  recommended_volume_ml: number;
  target_area_m2: number;
  spray_urgency: string;
  active_ingredients?: string;
  safety_notes?: string;
  created_at: string;
}

export interface SprayEvent {
  id: number;
  prescription_id: number;
  device_id: number;
  status: 'PENDING' | 'SPRAYING' | 'COMPLETED' | 'FAILED';
  volume_sprayed_ml: number;
  coverage_percentage: number;
  mode: string;
  notes?: string;
  start_time: string;
  end_time?: string;
}

export interface Device {
  id: number;
  field_id?: number;
  device_code: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'SPRAYING';
  battery_level: number;
  fluid_level_pct: number;
  ip_address: string;
  last_heartbeat: string;
}

export interface AIAnalysisResponse {
  disease_detected: string;
  confidence: number;
  infection_percentage: number;
  severity: SeverityLevel;
  bounding_boxes: BoundingBox[];
  image_url: string;
  crop_identified: string;
  detection_id?: number;
}

export interface DashboardStats {
  total_fields: number;
  total_plants: number;
  total_detections: number;
  active_prescriptions: number;
  completed_sprays: number;
  active_devices: number;
  average_infection_pct: number;
  pesticide_saved_liters: number;
  chemical_reduction_percentage: number;
}
