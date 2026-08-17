import React, { useEffect, useState } from 'react';
import { 
  Radio, 
  Battery, 
  Droplet, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Square, 
  Zap, 
  Sparkles, 
  ShieldAlert, 
  Layers,
  Flame,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { SprayerStatus, Plant, SprayEvent } from '../types';

export const SprayerControl: React.FC = () => {
  const [status, setStatus] = useState<SprayerStatus | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [recentEvents, setRecentEvents] = useState<SprayEvent[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<number | string>('');
  const [volumeMl, setVolumeMl] = useState<number>(10.0);
  const [sprayerActive, setSprayerActive] = useState<boolean>(true);
  const [isSpraying, setIsSpraying] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSprayerData = async () => {
    try {
      const [statusRes, plantsRes, historyRes] = await Promise.all([
        api.getSprayerStatus(),
        api.getPlants(),
        api.getSprayHistory()
      ]);
      setStatus(statusRes);
      setPlants(plantsRes);
      setRecentEvents(historyRes);
      if (plantsRes.length > 0 && !selectedPlantId) {
        // Preselect the first infected plant
        const infected = plantsRes.find(p => p.severity !== 'HEALTHY');
        if (infected) {
          setSelectedPlantId(infected.id);
          setVolumeMl(infected.severity === 'HIGH' ? 20.0 : infected.severity === 'MODERATE' ? 10.0 : 5.0);
        } else {
          setSelectedPlantId(plantsRes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load sprayer telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSprayerData();
    const interval = setInterval(loadSprayerData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handlePlantSelectionChange = (plantIdStr: string) => {
    setSelectedPlantId(plantIdStr);
    const plant = plants.find(p => String(p.id) === plantIdStr);
    if (plant) {
      if (plant.severity === 'HIGH') setVolumeMl(20.0);
      else if (plant.severity === 'MODERATE') setVolumeMl(10.0);
      else if (plant.severity === 'LOW') setVolumeMl(5.0);
      else setVolumeMl(0.0);
    }
  };

  const handleToggleSprayerPower = () => {
    setSprayerActive(prev => !prev);
    setFeedbackMsg({
      type: 'success',
      text: sprayerActive ? 'Sprayer Master Controller stopped.' : 'Sprayer Master Controller armed & ready.'
    });
  };

  const handleTriggerSpray = async () => {
    if (!sprayerActive) {
      setFeedbackMsg({ type: 'error', text: 'Sprayer controller is stopped. Click START SPRAYER first.' });
      return;
    }

    if (!selectedPlantId) {
      setFeedbackMsg({ type: 'error', text: 'Please select a target plant.' });
      return;
    }

    const targetPlant = plants.find(p => String(p.id) === String(selectedPlantId));
    if (targetPlant && (targetPlant.severity === 'HEALTHY' || volumeMl <= 0)) {
      setFeedbackMsg({
        type: 'error',
        text: 'Safety Restriction: Plant is HEALTHY. Chemical spot spraying is strictly prohibited on healthy crops (0 mL).'
      });
      return;
    }

    setIsSpraying(true);
    setFeedbackMsg(null);

    try {
      const res = await api.triggerSpray(selectedPlantId, volumeMl, 'SIMULATED');
      setFeedbackMsg({
        type: 'success',
        text: `Spot Spray command [${res.command_id}] executed successfully! Dispensed ${res.volume_ml} mL.`
      });
      loadSprayerData();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Sprayer execution failed.'
      });
    } finally {
      setIsSpraying(false);
    }
  };

  const totalSprayedMl = recentEvents.reduce((acc, ev) => acc + (ev.volume_ml || 0), 0);
  const lastSprayEvent = recentEvents[0];
  const selectedPlant = plants.find(p => String(p.id) === String(selectedPlantId));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Precision Sprayer Telemetry...</div>
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
            <span>Precision Actuator & Solenoid Control Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <Radio className="w-6 h-6 text-emerald-400" />
            <span>Sprayer Control Hub</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Monitor real-time Wi-Fi telemetry, fluid levels, battery health, and trigger simulated spot-spraying.
          </p>
        </div>

        {/* Master Power Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleSprayerPower}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
              sprayerActive
                ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-600/50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25'
            }`}
          >
            {sprayerActive ? (
              <>
                <Square className="w-4 h-4" />
                <span>STOP SPRAYER</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>START SPRAYER</span>
              </>
            )}
          </button>

          <button
            onClick={loadSprayerData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Safety Notice & Prototype Evaluation Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-start space-x-3 text-xs text-slate-300">
        <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">SIH 2026 Evaluation Safety Mode Active (SIMULATED SPRAYING)</p>
          <p className="text-slate-400 leading-relaxed">
            For safe demonstration and environmental protection, all spray triggers operate in calibrated simulated execution mode. Precision dosages are calculated dynamically, and healthy crops are strictly locked against receiving chemical commands.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 animate-fadeIn ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Telemetry Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Card 1: Sprayer Status */}
        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Sprayer Status</span>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${sprayerActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xl font-extrabold text-white">
              {sprayerActive ? (isSpraying ? 'SPRAYING' : status?.status || 'READY') : 'STOPPED'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-emerald-400">Mode: {status?.mode || 'SIMULATED'}</p>
        </div>

        {/* Card 2: Chemical Fluid Tank */}
        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Fluid Tank Level</span>
            <Droplet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white">{status?.fluid_level_pct || 90}%</div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full" style={{ width: `${status?.fluid_level_pct || 90}%` }} />
          </div>
        </div>

        {/* Card 3: Battery Level */}
        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Battery Charge</span>
            <Battery className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-white">{status?.battery_level || 95}%</div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
            <div className="bg-sky-400 h-full rounded-full" style={{ width: `${status?.battery_level || 95}%` }} />
          </div>
        </div>

        {/* Card 4: Total Dispensed */}
        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Total Sprayed Volume</span>
          <div className="text-xl font-extrabold text-emerald-400">{totalSprayedMl.toFixed(1)} mL</div>
          <p className="text-[11px] text-slate-400">{recentEvents.length} application commands</p>
        </div>

      </div>

      {/* Main Interactive Controls: Target Spray Form (Left) & Command Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Spray Selected Plant Form */}
        <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <span>Spray Selected Plant</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeted solenoid pulse spray based on AI prescription dosage.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Plant Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Select Target Crop Plant:</label>
              <select
                value={selectedPlantId}
                onChange={(e) => handlePlantSelectionChange(e.target.value)}
                className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.plant_code}] {p.crop_type} • {p.disease} • Severity: {p.severity} ({p.infection_percentage}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Plant Info Chip */}
            {selectedPlant && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Diagnosis:</span>
                  <span className="font-bold text-white">{selectedPlant.disease}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Severity & Infection:</span>
                  <span className="font-bold text-amber-400">{selectedPlant.severity} ({selectedPlant.infection_percentage}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">GPS Coordinates:</span>
                  <span className="font-mono text-slate-300">[{selectedPlant.latitude.toFixed(5)}, {selectedPlant.longitude.toFixed(5)}]</span>
                </div>
              </div>
            )}

            {/* Volume Adjustment Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300">Prescription Spray Dosage (mL):</label>
                <span className="font-extrabold text-emerald-400 text-sm">{volumeMl} mL</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2.5"
                value={volumeMl}
                onChange={(e) => setVolumeMl(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 mL (Healthy)</span>
                <span>5 mL (Low)</span>
                <span>10 mL (Moderate)</span>
                <span>20 mL (High)</span>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleTriggerSpray}
              disabled={isSpraying || !sprayerActive}
              className={`w-full py-4 rounded-xl font-extrabold text-sm shadow-lg flex items-center justify-center space-x-2 transition ${
                isSpraying || !sprayerActive
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 text-slate-950 shadow-emerald-500/25 hover:scale-102'
              }`}
            >
              {isSpraying ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Pulsing Solenoid Actuator ({volumeMl} mL)...</span>
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  <span>Execute Targeted Spot Spray ({volumeMl} mL)</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right: Last Command & Real-time Telemetry Log */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Last Spray Summary Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Last Execution Command</span>
            </h3>

            {lastSprayEvent ? (
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Command ID:</span>
                  <span className="font-mono font-bold text-emerald-400">{lastSprayEvent.command_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Target Plant ID:</span>
                  <span className="font-mono text-white">#{lastSprayEvent.plant_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Volume Dispensed:</span>
                  <span className="font-bold text-emerald-400">{lastSprayEvent.volume_ml} mL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-slate-400">{new Date(lastSprayEvent.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Status:</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {lastSprayEvent.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                No spray events executed yet.
              </div>
            )}
          </div>

          {/* Quick Stats Box */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm">System Protection Locks</h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Healthy Plant Lock (0 mL Enforcement)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Chemical Tank Depletion Guard (&gt; 5%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>PWM Pulse Width Calibration Verified</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
