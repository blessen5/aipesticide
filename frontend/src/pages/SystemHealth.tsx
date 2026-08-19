import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Database, Cpu, Radio, ExternalLink, RefreshCw } from 'lucide-react';
import { api, BASE_URL } from '../services/api';



export const SystemHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHealth();
      setHealthData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to reach API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>System Health & API Telemetry</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Live diagnostic overview of backend services, SQLite database integrity, and AI models.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
        >
          <RefreshCw className={`w-4 h-4 text-agri-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Ping API</span>
        </button>
      </div>

      {/* Main Health Card */}
      {healthData && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-agri-500/30 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h3 className="font-extrabold text-lg text-white">FastAPI Backend Operational</h3>
                <p className="text-xs text-slate-400">Version: {healthData.version}</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              {healthData.status}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Database className="w-4 h-4 text-agri-400" />
                <span>SQLite Database Status</span>
              </div>
              <div className="text-sm font-semibold text-emerald-400">{healthData.database}</div>
              <div className="text-[11px] text-slate-400 pt-1 space-y-0.5 border-t border-slate-900">
                <p>Registered Fields: {healthData.entities?.fields}</p>
                <p>Configured ESP32 Devices: {healthData.entities?.devices}</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>AI Inference Engine</span>
              </div>
              <div className="text-sm font-semibold text-emerald-400">{healthData.ai_engine}</div>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                OpenCV Feature Extractor Active (PyTorch / ONNX ML Ready)
              </p>
            </div>

          </div>

          {/* Swagger Interactive Docs Link */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <h4 className="font-bold text-white">Interactive OpenAPI / Swagger Documentation</h4>
              <p className="text-slate-400">Inspect REST endpoints, Pydantic schemas, and live test payloads</p>
            </div>
            <a
              href={`${BASE_URL || 'http://localhost:8000'}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-agri-600 hover:bg-agri-500 text-slate-950 font-bold rounded-lg flex items-center space-x-1.5 transition"
            >
              <span>Open Swagger</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      )}

    </div>
  );
};
