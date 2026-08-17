import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sprout, 
  Scan, 
  MapPin, 
  Radio, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  ArrowRight,
  Droplet,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Field, Detection, Device } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [recentDetections, setRecentDetections] = useState<Detection[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, fieldsRes, detectionsRes, devicesRes] = await Promise.all([
          api.getDashboardStats(),
          api.getFields(),
          api.getDetections(),
          api.getSprayers()
        ]);
        setStats(statsRes);
        setFields(fieldsRes);
        setRecentDetections(detectionsRes.slice(0, 4));
        setDevices(devicesRes);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">HIGH</span>;
      case 'MODERATE':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">MODERATE</span>;
      case 'LOW':
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">LOW</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">HEALTHY</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-agri-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading AgriPrescribe Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-6 sm:p-8 border border-agri-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-agri-950/40">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-agri-500/10 border border-agri-500/30 text-agri-400 text-xs font-semibold">
            <Sprout className="w-4 h-4" />
            <span>Precision Agriculture & AI Prescription Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Smartphone-Assisted Prescription Mapping & Precision Spraying System
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Eliminate chemical overuse with AI-driven plant disease diagnosis, targeted prescription generation, and automated ESP32 precision spot-spraying.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/detect"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-agri-600 to-emerald-500 hover:from-agri-500 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-agri-600/30 flex items-center space-x-2 transition"
            >
              <Scan className="w-4 h-4" />
              <span>Capture & Diagnose Leaf</span>
            </Link>

            <Link
              to="/map"
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 flex items-center space-x-2 transition"
            >
              <MapPin className="w-4 h-4 text-agri-400" />
              <span>View Field Prescription Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Fields Monitored */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fields Monitored</span>
            <div className="p-2 rounded-xl bg-agri-500/10 text-agri-400 border border-agri-500/20">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">{stats?.total_fields || 0}</div>
            <p className="text-xs text-slate-400 mt-1">Ludhiana, Nagpur, Thanjavur</p>
          </div>
        </div>

        {/* Card 2: AI Detections */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">AI Disease Detections</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scan className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">{stats?.total_detections || 0}</div>
            <p className="text-xs text-amber-400 mt-1">Avg Infection Severity: {stats?.average_infection_pct || 0}%</p>
          </div>
        </div>

        {/* Card 3: Chemical Saved */}
        <div className="glass-card p-5 rounded-2xl space-y-3 border-agri-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pesticide Saved</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Droplet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {stats?.chemical_reduction_percentage || 65.4}%
            </div>
            <p className="text-xs text-slate-300 mt-1">
              ~{stats?.pesticide_saved_liters || 142} Liters saved vs broad-acre
            </p>
          </div>
        </div>

        {/* Card 4: ESP32 Sprayers */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">ESP32 Sprayers Active</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">{stats?.active_devices || 0}</div>
            <p className="text-xs text-sky-400 mt-1">{stats?.completed_sprays || 0} Precision Sprays Completed</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Detections & Field Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Disease Detections */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Scan className="w-5 h-5 text-agri-400" />
              <span>Recent AI Plant Disease Diagnoses</span>
            </h2>
            <Link to="/detect" className="text-xs font-semibold text-agri-400 hover:text-agri-300 flex items-center space-x-1">
              <span>Run New Scan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentDetections.map((det) => (
              <div key={det.id} className="glass-card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={det.image_url}
                    alt={det.disease_detected}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-100 text-sm">{det.disease_detected}</h4>
                      {getSeverityBadge(det.severity)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Infection: <strong className="text-slate-200">{det.infection_percentage}%</strong> | Confidence: {(det.confidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Diagnosed: {new Date(det.analyzed_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    to="/prescriptions"
                    className="px-3 py-1.5 rounded-lg bg-agri-600/20 hover:bg-agri-600/30 text-agri-300 border border-agri-500/30 text-xs font-semibold flex items-center space-x-1"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Prescription</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Connected ESP32 Sprayers Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Radio className="w-5 h-5 text-sky-400" />
              <span>ESP32 Sprayers Status</span>
            </h2>
            <Link to="/sprayer" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="glass-card p-4 rounded-xl space-y-3 border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">{device.name}</h4>
                    <p className="text-[11px] font-mono text-slate-400">{device.device_code} • {device.ip_address}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    device.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    device.status === 'SPRAYING' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {device.status}
                  </span>
                </div>

                {/* Progress Gauges */}
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between text-[11px]">
                    <span>Chemical Tank Fluid:</span>
                    <span className="font-bold text-agri-400">{device.fluid_level_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                    <div className="bg-agri-500 h-full rounded-full" style={{ width: `${device.fluid_level_pct}%` }} />
                  </div>

                  <div className="flex justify-between text-[11px] pt-1">
                    <span>Battery Level:</span>
                    <span className="font-bold text-slate-200">{device.battery_level}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
