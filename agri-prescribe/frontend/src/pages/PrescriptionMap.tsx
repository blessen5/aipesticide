import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import { MapPin, Sprout, AlertTriangle, Layers, Filter } from 'lucide-react';
import { api } from '../services/api';
import { Field, Plant, Detection } from '../types';
import L from 'leaflet';

// Custom Map Pins for Leaflet
const createCustomPin = (severity: string) => {
  let color = '#22c55e';
  if (severity === 'HIGH') color = '#ef4444';
  if (severity === 'MODERATE') color = '#f97316';
  if (severity === 'LOW') color = '#eab308';

  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

export const PrescriptionMap: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, plantsRes, detectionsRes] = await Promise.all([
          api.getFields(),
          api.getPlants(),
          api.getDetections()
        ]);
        setFields(fieldsRes);
        setPlants(plantsRes);
        setDetections(detectionsRes);
        if (fieldsRes.length > 0) {
          setSelectedFieldId(fieldsRes[0].id);
        }
      } catch (err) {
        console.error('Map data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeField = fields.find((f) => f.id === selectedFieldId) || fields[0];

  const getPlantSeverity = (plantId: number) => {
    const det = detections.find((d) => d.plant_id === plantId);
    return det ? det.severity : 'HEALTHY';
  };

  if (loading || !activeField) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Prescription Field Map...</div>
      </div>
    );
  }

  // Parse Field Polygon Boundary Coordinates
  let polygonCoords: [number, number][] = [
    [activeField.latitude - 0.001, activeField.longitude - 0.0015],
    [activeField.latitude + 0.001, activeField.longitude - 0.0015],
    [activeField.latitude + 0.001, activeField.longitude + 0.0015],
    [activeField.latitude - 0.001, activeField.longitude + 0.0015]
  ];

  if (activeField.boundary_geojson) {
    try {
      const geo = JSON.parse(activeField.boundary_geojson);
      if (geo.coordinates && geo.coordinates[0]) {
        polygonCoords = geo.coordinates[0].map((pt: [number, number]) => [pt[1], pt[0]]);
      }
    } catch {}
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Field Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-agri-400" />
            <span>Field Prescription Heatmap & Target Zones</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Interactive GPS mapping of crop health, infection severity spots, and precision spray targets.
          </p>
        </div>

        {/* Select Field Dropdown */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <Filter className="w-4 h-4 text-agri-400 shrink-0" />
          <select
            value={selectedFieldId || ''}
            onChange={(e) => setSelectedFieldId(Number(e.target.value))}
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
          >
            {fields.map((f) => (
              <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                {f.name} ({f.crop_type} - {f.location_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-4">
          <span className="font-bold text-slate-300">Severity Heatmap:</span>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-400">Healthy</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
            <span className="text-slate-400">Low Infection</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-400">Moderate Spot</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span className="text-slate-400">High Infection Target</span>
          </div>
        </div>

        <div className="text-agri-400 font-semibold">
          Targeted Precision Spraying Active (Red/Orange Zones Only)
        </div>
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 h-[500px] relative">
        <MapContainer
          center={[activeField.latitude, activeField.longitude]}
          zoom={16}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Field Boundary Polygon */}
          <Polygon
            positions={polygonCoords}
            pathOptions={{
              color: '#22c55e',
              fillColor: '#22c55e',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '4'
            }}
          />

          {/* Plant GPS Markers */}
          {plants
            .filter((p) => p.field_id === activeField.id)
            .map((plant) => {
              const severity = getPlantSeverity(plant.id);
              const det = detections.find((d) => d.plant_id === plant.id);

              return (
                <React.Fragment key={plant.id}>
                  {/* High/Moderate Severity Pulse Rings */}
                  {(severity === 'HIGH' || severity === 'MODERATE') && (
                    <CircleMarker
                      center={[plant.latitude, plant.longitude]}
                      radius={22}
                      pathOptions={{
                        color: severity === 'HIGH' ? '#ef4444' : '#f97316',
                        fillColor: severity === 'HIGH' ? '#ef4444' : '#f97316',
                        fillOpacity: 0.35,
                        weight: 1
                      }}
                    />
                  )}

                  <Marker
                    position={[plant.latitude, plant.longitude]}
                    icon={createCustomPin(severity)}
                  >
                    <Popup className="custom-popup">
                      <div className="p-2 space-y-1 bg-slate-900 text-slate-100 rounded-lg max-w-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-white">{plant.tag_id}</strong>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                            severity === 'MODERATE' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">Status: {plant.health_status}</p>
                        {det && (
                          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                            <p>Disease: <strong className="text-slate-200">{det.disease_detected}</strong></p>
                            <p>Infection: {det.infection_percentage}%</p>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
        </MapContainer>
      </div>

    </div>
  );
};
