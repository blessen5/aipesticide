import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  Droplet, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Activity, 
  RefreshCw,
  Sparkles,
  Radio
} from 'lucide-react';
import { api } from '../services/api';
import { Prescription } from '../types';

export const PrescriptionsList: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [sprayingId, setSprayingId] = useState<number | null>(null);
  const [sprayMessage, setSprayMessage] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.getPrescriptions();
      setPrescriptions(res);
    } catch (err) {
      console.error('Prescriptions fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleSpotSpray = async (presc: Prescription) => {
    if (presc.severity === 'HEALTHY' || presc.recommended_volume_ml <= 0) {
      alert('Safety Restriction: Healthy plants cannot receive spray commands (0 mL).');
      return;
    }

    setSprayingId(presc.id);
    setSprayMessage(null);

    try {
      const res = await api.triggerSpray(
        presc.plant_id || 1,
        presc.recommended_volume_ml,
        'SIMULATED'
      );
      setSprayMessage(`Prescription #${presc.id} spot spray executed: ${res.volume_ml} mL applied on Plant #${res.plant_id}!`);
    } catch (err: any) {
      alert('Spray command failed: ' + err.message);
    } finally {
      setSprayingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> HIGH</span>;
      case 'MODERATE':
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> MODERATE</span>;
      case 'LOW':
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> LOW</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> HEALTHY</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Generated Prescriptions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Automated Prescription Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Agronomic Prescriptions</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Targeted spot-spray formulations calculated from AI pathogen severity and foliage infection.
          </p>
        </div>

        <button
          onClick={fetchPrescriptions}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>Refresh</span>
        </button>
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

      {/* Prescription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prescriptions.map((presc) => (
          <div
            key={presc.id}
            className="glass-card p-6 rounded-3xl border border-slate-800 space-y-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                    {presc.crop_type || 'Crop'} • Plant #{presc.plant_id || presc.id}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{presc.disease}</h3>
                </div>
                {getSeverityBadge(presc.severity)}
              </div>

              {/* Formulation Metrics */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Action Recommendation:</span>
                  <div className="font-bold text-emerald-400 text-xs mt-0.5">
                    {presc.recommended_action}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Target Spray Volume:</span>
                  <div className="font-extrabold text-white text-base mt-0.5">
                    {presc.recommended_volume_ml} mL
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Setting Level:</span>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {presc.spray_level}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Priority Level:</span>
                  <div className="font-semibold text-slate-300 mt-0.5">
                    {presc.priority}
                  </div>
                </div>
              </div>

              {/* Pathological Rationale */}
              {presc.reason && (
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800/80 text-xs text-slate-300 italic">
                  "{presc.reason}"
                </div>
              )}

            </div>

            {/* Action Button */}
            {presc.recommended_volume_ml > 0 ? (
              <button
                onClick={() => handleSpotSpray(presc)}
                disabled={sprayingId === presc.id}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition text-xs hover:scale-102"
              >
                <Radio className={`w-4 h-4 ${sprayingId === presc.id ? 'animate-pulse' : ''}`} />
                <span>
                  {sprayingId === presc.id
                    ? 'Executing Spot Spray...'
                    : `Execute Precision Spray (${presc.recommended_volume_ml} mL)`}
                </span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Healthy Crop • Spray Prohibited</span>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};
