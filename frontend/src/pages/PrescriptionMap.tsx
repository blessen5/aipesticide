import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { 
  MapPin, 
  Sprout, 
  AlertTriangle, 
  Flame, 
  CheckCircle2, 
  Radio, 
  Droplet, 
  TrendingDown, 
  Activity,
  Layers,
  Filter,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import L from 'leaflet';
import { api } from '../services/api';
import { Field, FieldPrescriptionMapResponse, PrescriptionMapFeature } from '../types';

// Custom Pin generator for Leaflet
const createCustomPin = (severity: string) => {
  let color = '#22c55e';
  if (severity === 'HIGH') color = '#ef4444';
  else if (severity === 'MODERATE') color = '#f97316';
  else if (severity === 'LOW') color = '#eab308';

  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px ${color}; display: flex; align-items: center; justify-content: center;">
      <div style="width: 4px; height: 4px; border-radius: 50%; background-color: #0f172a;"></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

// Component to dynamically re-center map when field changes
const ChangeMapView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 18);
  }, [center, map]);
  return null;
};

export const PrescriptionMap: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialFieldId = Number(searchParams.get('field_id')) || 1;

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number>(initialFieldId);
  const [mapData, setMapData] = useState<FieldPrescriptionMapResponse | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<PrescriptionMapFeature | null>(null);
  const [loading, setLoading] = useState(true);
  const [sprayingPlantId, setSprayingPlantId] = useState<number | string | null>(null);
  const [sprayMessage, setSprayMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load fields list
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await api.getFields();
        setFields(res);
        if (res.length > 0) {
          const urlParam = Number(searchParams.get('field_id'));
          if (urlParam && res.some(f => f.id === urlParam)) {
            setSelectedFieldId(urlParam);
          } else {
            setSelectedFieldId(res[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load fields:', err);
      }
    };
    fetchFields();
  }, [searchParams]);

  // Load Field Prescription Map GeoJSON whenever selectedFieldId changes
  useEffect(() => {
    const fetchMap = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getFieldPrescriptionMap(selectedFieldId);
        setMapData(res);
        if (res.features.length > 0) {
          setSelectedFeature(res.features[0]);
        } else {
          setSelectedFeature(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load field prescription map');
      } finally {
        setLoading(false);
      }
    };

    if (selectedFieldId) {
      fetchMap();
    }
  }, [selectedFieldId]);

  const activeField = fields.find(f => f.id === selectedFieldId);

  // Quick spot spray execution
  const handleSpotSpray = async (feature: PrescriptionMapFeature) => {
    const props = feature.properties;
    if (props.severity === 'HEALTHY' || props.recommended_volume_ml <= 0) {
      alert('Safety Notice: Plant is Healthy (0 mL). Precision chemical spraying is prohibited on healthy crops.');
      return;
    }

    setSprayingPlantId(props.plant_id);
    setSprayMessage(null);

    try {
      const res = await api.triggerSpray(props.plant_id, props.recommended_volume_ml, 'SIMULATED');
      setSprayMessage(`Spot Spray [${res.command_id}] completed on ${props.plant_code}: ${res.volume_ml} mL applied!`);
    } catch (err: any) {
      alert('Sprayer command failed: ' + err.message);
    } finally {
      setSprayingPlantId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Flame className="w-3 h-3" /> HIGH</span>;
      case 'MODERATE':
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Activity className="w-3 h-3" /> MODERATE</span>;
      case 'LOW':
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> LOW</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> HEALTHY</span>;
    }
  };

  const centerCoords: [number, number] = activeField 
    ? [activeField.latitude, activeField.longitude]
    : [30.9010, 75.8573];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Field Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GeoJSON RFC 7946 Standard Prescription Mapping</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <span>Field Prescription Map</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Visual plot overlay mapping plant pathogen severity to precision spot-spray volume targets.
          </p>
        </div>

        {/* Field Selection Filter */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shrink-0">
          <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Active Field:</span>
          <select
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
          >
            {fields.map((f) => (
              <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                {f.name} ({f.crop_type} • {f.area} Ha)
              </option>
            ))}
          </select>
        </div>
      </div>

      {sprayMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{sprayMessage}</span>
          </div>
          <button onClick={() => setSprayMessage(null)} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Field Summary Metrics Bar */}
      {mapData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          
          <div className="glass-card p-3.5 rounded-2xl border-slate-800">
            <span className="text-[11px] text-slate-400">Total Plants</span>
            <div className="text-2xl font-black text-white">{mapData.summary.total_plants}</div>
            <span className="text-[10px] text-slate-500">{mapData.crop_type} Crop</span>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border-emerald-500/30 bg-emerald-950/10">
            <span className="text-[11px] text-emerald-400 font-semibold">Healthy</span>
            <div className="text-2xl font-black text-emerald-400">{mapData.summary.healthy}</div>
            <span className="text-[10px] text-emerald-300/70">0 mL (No Spray)</span>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border-yellow-500/30 bg-yellow-950/10">
            <span className="text-[11px] text-yellow-400 font-semibold">Low Severity</span>
            <div className="text-2xl font-black text-yellow-400">{mapData.summary.low}</div>
            <span className="text-[10px] text-yellow-300/70">5 mL Bio-Spray</span>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border-orange-500/30 bg-orange-950/10">
            <span className="text-[11px] text-orange-400 font-semibold">Moderate</span>
            <div className="text-2xl font-black text-orange-400">{mapData.summary.moderate}</div>
            <span className="text-[10px] text-orange-300/70">10 mL Pulse</span>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border-rose-500/30 bg-rose-950/10">
            <span className="text-[11px] text-rose-400 font-semibold">High Outbreak</span>
            <div className="text-2xl font-black text-rose-400">{mapData.summary.high}</div>
            <span className="text-[10px] text-rose-300/70">20 mL Priority</span>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border-cyan-500/30 bg-cyan-950/10">
            <span className="text-[11px] text-cyan-400 font-semibold">Target Volume</span>
            <div className="text-2xl font-black text-cyan-400">{mapData.summary.total_recommended_spray} mL</div>
            <span className="text-[10px] text-slate-400 line-through">Vs {mapData.summary.blanket_spray_estimate} mL</span>
          </div>

          <div className="glass-card p-3.5 rounded-2xl border-emerald-500/40 bg-emerald-950/20 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-emerald-300 font-bold">Reduction</span>
            <div className="text-2xl font-black text-emerald-300">{mapData.summary.estimated_reduction_percentage}%</div>
            <span className="text-[10px] text-emerald-400">Chemical Saved</span>
          </div>

        </div>
      )}

      {/* Main Map & Plant Target Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Leaflet Map Container */}
        <div className="lg:col-span-8 glass-panel rounded-3xl overflow-hidden border border-slate-800 h-[520px] relative shadow-2xl">
          
          {/* Map Color Legend Overlay */}
          <div className="absolute top-3 left-3 z-[1000] glass-panel bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-3 text-xs">
            <span className="font-bold text-white text-[11px]">Pin Legend:</span>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300 text-[10px]">Healthy (0 mL)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-slate-300 text-[10px]">Low (5 mL)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-300 text-[10px]">Mod (10 mL)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300 text-[10px]">High (20 mL)</span>
            </div>
          </div>

          <MapContainer
            center={centerCoords}
            zoom={18}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <ChangeMapView center={centerCoords} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* GeoJSON Plant Features */}
            {mapData?.features.map((feature) => {
              const [lng, lat] = feature.geometry.coordinates;
              const props = feature.properties;
              const isSelected = selectedFeature?.properties.plant_id === props.plant_id;

              return (
                <React.Fragment key={props.plant_id}>
                  {/* High/Moderate Outbreak Pulse Ring */}
                  {(props.severity === 'HIGH' || props.severity === 'MODERATE') && (
                    <CircleMarker
                      center={[lat, lng]}
                      radius={isSelected ? 26 : 18}
                      pathOptions={{
                        color: props.severity === 'HIGH' ? '#ef4444' : '#f97316',
                        fillColor: props.severity === 'HIGH' ? '#ef4444' : '#f97316',
                        fillOpacity: 0.25,
                        weight: 1.5
                      }}
                    />
                  )}

                  <Marker
                    position={[lat, lng]}
                    icon={createCustomPin(props.severity)}
                    eventHandlers={{
                      click: () => {
                        setSelectedFeature(feature);
                      }
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-2 space-y-1.5 bg-slate-900 text-slate-100 rounded-xl min-w-[180px]">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-white font-mono">{props.plant_code}</strong>
                          {getSeverityBadge(props.severity)}
                        </div>
                        <p className="text-[11px] text-slate-300 truncate">{props.disease}</p>
                        <div className="text-[10px] text-slate-400 flex justify-between border-t border-slate-800 pt-1">
                          <span>Infection: <strong className="text-white">{props.infection_percentage}%</strong></span>
                          <span>Dose: <strong className="text-emerald-400">{props.recommended_volume_ml} mL</strong></span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Right: Selected Plant Prescription Card & Trigger Action */}
        <div className="lg:col-span-4 space-y-4">
          
          {selectedFeature ? (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 space-y-5 shadow-xl">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                    Target Crop Detail
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-0.5 font-mono">
                    {selectedFeature.properties.plant_code}
                  </h3>
                  <p className="text-xs text-slate-400">
                    GPS: [{selectedFeature.geometry.coordinates[1].toFixed(5)}, {selectedFeature.geometry.coordinates[0].toFixed(5)}]
                  </p>
                </div>
                {getSeverityBadge(selectedFeature.properties.severity)}
              </div>

              {/* Pathology Details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Identified Pathogen:</span>
                  <strong className="text-white text-right font-medium max-w-[160px] truncate">
                    {selectedFeature.properties.disease}
                  </strong>
                </div>

                <div className="flex justify-between items-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Foliage Infection Area:</span>
                  <strong className="text-amber-400 text-sm">
                    {selectedFeature.properties.infection_percentage}%
                  </strong>
                </div>

                <div className="flex justify-between items-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Recommended Action:</span>
                  <strong className="text-emerald-400">
                    {selectedFeature.properties.recommended_action}
                  </strong>
                </div>
              </div>

              {/* Prescription Dosage Gauge */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">Precision Spot Dosage</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Priority: {selectedFeature.properties.priority}
                  </span>
                </div>
                <div className="text-3xl font-black text-emerald-400">
                  {selectedFeature.properties.recommended_volume_ml} mL
                </div>
                <p className="text-[10px] text-slate-400">
                  {selectedFeature.properties.severity === 'HEALTHY'
                    ? 'Routine crop monitoring recommended. Chemical spraying prohibited.'
                    : `Targeted precision application to arrest ${selectedFeature.properties.disease}.`}
                </p>
              </div>

              {/* Action: Trigger Precision Spray */}
              {selectedFeature.properties.recommended_volume_ml > 0 ? (
                <button
                  onClick={() => handleSpotSpray(selectedFeature)}
                  disabled={sprayingPlantId === selectedFeature.properties.plant_id}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition hover:scale-102"
                >
                  <Radio className={`w-4 h-4 ${sprayingPlantId === selectedFeature.properties.plant_id ? 'animate-pulse' : ''}`} />
                  <span>
                    {sprayingPlantId === selectedFeature.properties.plant_id
                      ? 'Executing Spot Spray...'
                      : `Execute Spot Spray (${selectedFeature.properties.recommended_volume_ml} mL)`}
                  </span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Plant is Healthy • Spray Not Required</span>
                </div>
              )}

            </div>
          ) : (
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-3">
              <MapPin className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-slate-300 font-bold text-sm">Select a Plant Pin</h4>
              <p className="text-xs text-slate-500">
                Click any GPS crop marker on the map to inspect pathology diagnosis and spot-spray prescription.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
