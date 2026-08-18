import React, { useEffect, useState, useRef } from 'react';
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
  Activity,
  Send,
  Cpu,
  Navigation,
  Compass,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { api } from '../services/api';
import { SprayerStatus, Zone, SprayEvent, Field, ExecutionStepLog, ExecutePrescriptionResponse } from '../types';

export const SprayerControl: React.FC = () => {
  const [status, setStatus] = useState<SprayerStatus | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number>(1);
  const [zones, setZones] = useState<Zone[]>([]);
  const [recentEvents, setRecentEvents] = useState<SprayEvent[]>([]);
  
  // Single Spray Form State
  const [selectedZoneId, setSelectedZoneId] = useState<number | string>('');
  const [volumeMl, setVolumeMl] = useState<number>(10.0);
  const [isSingleSpraying, setIsSingleSpraying] = useState<boolean>(false);

  // Automated Field Mission Simulation State
  const [isMissionRunning, setIsMissionRunning] = useState<boolean>(false);
  const [missionLogs, setMissionLogs] = useState<ExecutionStepLog[]>([]);
  const [currentMissionZone, setCurrentMissionZone] = useState<string>('IDLE');
  const [currentMissionStatus, setCurrentMissionStatus] = useState<string>('IDLE');
  const [currentMissionVolume, setCurrentMissionVolume] = useState<number>(0.0);
  const [missionProgress, setMissionProgress] = useState<number>(0);
  const [missionSummary, setMissionSummary] = useState<ExecutePrescriptionResponse | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const loadSprayerData = async () => {
    try {
      const [statusRes, fieldsRes, zonesRes, historyRes] = await Promise.all([
        api.getSprayerStatus(),
        api.getFields(),
        api.getZones(selectedFieldId),
        api.getSprayHistory()
      ]);
      setStatus(statusRes);
      setFields(fieldsRes);
      setZones(zonesRes);
      setRecentEvents(historyRes);
      
      if (zonesRes.length > 0 && !selectedZoneId) {
        setSelectedZoneId(zonesRes[0].id);
        setVolumeMl(10.0);
      }
    } catch (err) {
      console.error('Failed to load sprayer telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSprayerData();
    const interval = setInterval(() => {
      if (!isMissionRunning) {
        api.getSprayerStatus().then(setStatus).catch(() => {});
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedFieldId, isMissionRunning]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [missionLogs]);

  const handleFieldChange = async (newFieldId: number) => {
    setSelectedFieldId(newFieldId);
    try {
      const zonesRes = await api.getZones(newFieldId);
      setZones(zonesRes);
      if (zonesRes.length > 0) {
        setSelectedZoneId(zonesRes[0].id);
      }
    } catch (err) {
      console.error('Error loading zones for field:', err);
    }
  };

  const handleZoneSelectionChange = (zoneIdStr: string) => {
    setSelectedZoneId(zoneIdStr);
    const zone = zones.find(z => String(z.id) === zoneIdStr);
    if (zone) {
      setVolumeMl(10.0); // Default volume for zone
    }
  };

  const handleStartMaster = async () => {
    try {
      const res = await api.startSprayer();
      setFeedbackMsg({ type: 'success', text: res.message });
      loadSprayerData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to arm sprayer.' });
    }
  };

  const handleStopMaster = async () => {
    try {
      const res = await api.stopSprayer();
      setIsMissionRunning(false);
      setFeedbackMsg({ type: 'success', text: res.message });
      loadSprayerData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to stop sprayer.' });
    }
  };

  // Automated Demonstration Sprayer Simulation Pipeline
  const handleStartDemoSpraying = async () => {
    setIsMissionRunning(true);
    setMissionLogs([]);
    setMissionSummary(null);
    setMissionProgress(0);
    setCurrentMissionStatus('MOVING');
    setFeedbackMsg(null);

    try {
      // 1. Call Backend Automated Execution API
      const result = await api.executeFieldPrescription(selectedFieldId, 'SIMULATED');
      
      // 2. Play Smooth Real-Time Simulation Walkthrough in UI
      const totalSteps = result.execution_logs.length;
      
      for (let i = 0; i < totalSteps; i++) {
        const log = result.execution_logs[i];
        setCurrentMissionZone(log.zone_id ? String(log.zone_id) : 'UNKNOWN');
        setCurrentMissionStatus(log.action);
        setCurrentMissionVolume(log.volume_ml);
        setMissionProgress(Math.round(((i + 1) / totalSteps) * 100));
        setMissionLogs(prev => [...prev, log]);

        // Simulated pulse delay for realistic presentation
        await new Promise(r => setTimeout(r, log.action === 'SPRAYING' ? 700 : 400));
      }

      setCurrentMissionStatus('COMPLETED');
      setMissionSummary(result);
      setFeedbackMsg({
        type: 'success',
        text: `Prescription mission finished! ${result.plants_treated} zones/plants spot-treated (${result.total_volume_sprayed} mL).`
      });

      // Reload fresh events & telemetry
      loadSprayerData();

    } catch (err: any) {
      console.error('Mission execution error:', err);
      setCurrentMissionStatus('ERROR');
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Automated prescription spraying mission failed.'
      });
    } finally {
      setIsMissionRunning(false);
    }
  };

  // Single Spot Spray Trigger
  const handleTriggerSingleSpray = async () => {
    if (!selectedZoneId) {
      setFeedbackMsg({ type: 'error', text: 'Please select a target zone.' });
      return;
    }

    if (volumeMl <= 0) {
      setFeedbackMsg({
        type: 'error',
        text: 'Volume must be greater than 0 mL.'
      });
      return;
    }

    setIsSingleSpraying(true);
    setFeedbackMsg(null);

    try {
      const res = await api.triggerSpray(selectedZoneId, volumeMl, 'SIMULATED');
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
      setIsSingleSpraying(false);
    }
  };

  const totalSprayedMl = recentEvents.reduce((acc, ev) => acc + (ev.volume_ml || 0), 0);
  const selectedField = fields.find(f => f.id === selectedFieldId);
  const selectedZone = zones.find(z => String(z.id) === String(selectedZoneId));

  const activeSprayerState = isMissionRunning ? currentMissionStatus : (status?.status || 'READY');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Precision Sprayer Telemetry & Simulation...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto px-2 sm:px-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Precision Actuator Controller</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <Radio className="w-6 h-6 text-emerald-400" />
            <span>Hardware & Water Mode Prototype</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Zone-based Prescriptions → Hardware Valve Actuation → Auditable Event Logging.
          </p>
        </div>

        {/* Master Power Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={activeSprayerState === 'IDLE' ? handleStartMaster : handleStopMaster}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-lg ${
              activeSprayerState === 'IDLE'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                : 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-600/50'
            }`}
          >
            {activeSprayerState === 'IDLE' ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>START SYSTEM</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                <span>STOP SYSTEM</span>
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

      {/* Safety Notice & SIMULATION MODE Disclaimer */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 flex items-start space-x-3 text-xs text-slate-300 shadow-xl">
        <Droplet className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 text-[10px]">
              WATER MODE PROTOTYPE
            </span>
            <p className="font-bold text-white">SIH 2026 Evaluation Safety Lock Active</p>
          </div>
          <p className="text-slate-400 leading-relaxed">
            This module demonstrates an autonomous precision sprayer state machine mapping zones to hardware valves. In accordance with safety guidelines, the prototype operates strictly in WATER ONLY mode. Clean hardware integration interface is exposed for pluggable ESP32 physical actuator control.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 animate-fadeIn shadow-lg ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-semibold">{feedbackMsg.text}</span>
        </div>
      )}

      {/* 1. VISUAL ANIMATED SPRAYER REPRESENTATION */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl bg-slate-950/80 relative overflow-hidden">
        
        {/* Background glow during spraying */}
        {activeSprayerState === 'SPRAYING' && (
          <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
              <h3 className="text-lg font-bold text-white">Hardware Dashboard Visualizer</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Real-time chassis telemetry and solenoid actuation</p>
          </div>

          {/* Current State Badge */}
          <div className="flex items-center space-x-2">
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider flex items-center space-x-1.5 border shadow-lg ${
              activeSprayerState === 'SPRAYING'
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 animate-pulse'
                : activeSprayerState === 'MOVING'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-bounce'
                : activeSprayerState === 'COMPLETED'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : activeSprayerState === 'READY'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${activeSprayerState === 'SPRAYING' ? 'bg-sky-400 animate-ping' : activeSprayerState === 'MOVING' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>{activeSprayerState}</span>
            </span>
          </div>
        </div>

        {/* Sprayer Chassis Animation Stage */}
        <div className="relative py-8 px-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-4">
          
          {/* Animated Rover / Actuator Icon */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 ${
              activeSprayerState === 'SPRAYING'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-110 shadow-2xl shadow-emerald-500/40'
                : activeSprayerState === 'MOVING'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 translate-x-2 shadow-xl shadow-amber-500/20'
                : 'bg-slate-950 border-slate-700 text-slate-400'
            }`}>
              <Cpu className={`w-12 h-12 ${activeSprayerState === 'SPRAYING' ? 'animate-pulse text-emerald-400' : ''}`} />
            </div>

            {/* Spray Particle Effect Visualization */}
            {activeSprayerState === 'SPRAYING' && (
              <div className="absolute -bottom-4 inset-x-0 flex justify-center space-x-1 animate-bounce">
                <div className="w-1.5 h-3 bg-sky-400 rounded-full animate-ping" />
                <div className="w-1.5 h-4 bg-sky-300 rounded-full animate-ping delay-75" />
                <div className="w-1.5 h-3 bg-sky-400 rounded-full animate-ping delay-150" />
              </div>
            )}
          </div>

          {/* Current Target Readout */}
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {isMissionRunning ? 'Active Traversal Target' : 'Target Zone'}
            </p>
            <h4 className="text-xl font-extrabold text-white">
              {isMissionRunning ? currentMissionZone : (selectedZone?.name || 'Z-001')}
            </h4>
            <div className="inline-flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-400">Target Volume:</span>
              <strong className="text-emerald-400 font-extrabold">
                {isMissionRunning ? currentMissionVolume : volumeMl} mL
              </strong>
            </div>
          </div>

          {/* Mission Progress Bar */}
          {isMissionRunning && (
            <div className="w-full max-w-md space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Mission Progress</span>
                <span className="text-emerald-400 font-bold">{missionProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${missionProgress}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Telemetry Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Water Fluid Tank</span>
            <div className="text-lg font-black text-sky-400">{status?.fluid_level_pct || 90}%</div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div className="bg-sky-400 h-full" style={{ width: `${status?.fluid_level_pct || 90}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Node Battery Level</span>
            <div className="text-lg font-black text-emerald-400">{status?.battery_level || 95}%</div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-400 h-full" style={{ width: `${status?.battery_level || 95}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Total Field Zones</span>
            <div className="text-lg font-black text-white">{zones.length} Zones</div>
            <p className="text-[10px] text-slate-500">{selectedField?.name || 'Field'}</p>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400">Total Volume Dispensed</span>
            <div className="text-lg font-black text-sky-400">{totalSprayedMl.toFixed(1)} mL</div>
            <p className="text-[10px] text-slate-500">{recentEvents.length} commands logged</p>
          </div>

        </div>

      </div>

      {/* 2. AUTOMATED FIELD MISSION SIMULATOR (START DEMO SPRAYING) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/40 space-y-6 shadow-2xl bg-slate-900/90">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-1">
              <span>Full Field Automated Workflow</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-400 fill-current" />
              <span>Automated Field Prescription Execution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Traverses all zones in the field and executes calibrated water pulse spraying.
            </p>
          </div>

          {/* Select Field */}
          <div className="w-full sm:w-64 space-y-1">
            <label className="text-xs font-bold text-slate-300">Target Field:</label>
            <select
              value={selectedFieldId}
              onChange={(e) => handleFieldChange(Number(e.target.value))}
              disabled={isMissionRunning}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} • {f.crop_type} ({f.area} ha)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MAIN BUTTON: START DEMO SPRAYING */}
        <button
          onClick={handleStartDemoSpraying}
          disabled={isMissionRunning}
          className={`w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg shadow-xl flex items-center justify-center space-x-3 transition transform active:scale-98 ${
            isMissionRunning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-400 hover:from-emerald-400 text-slate-950 shadow-emerald-500/30 hover:scale-101'
          }`}
        >
          {isMissionRunning ? (
            <>
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Executing Autonomous Prescription Mission...</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current text-slate-950" />
              <span>START DEMO SYSTEM (FIELD #{selectedFieldId})</span>
            </>
          )}
        </button>

        {/* Real-time Mission Execution Console Log */}
        {missionLogs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Hardware Node Telemetry Console:</span>
              </span>
              <span>{missionLogs.length} Steps Recorded</span>
            </div>

            <div 
              ref={logContainerRef}
              className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 text-slate-300 shadow-inner"
            >
              {missionLogs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2 animate-fadeIn">
                  <span className="text-slate-500 select-none">[{String(idx + 1).padStart(2, '0')}]</span>
                  <span className={
                    log.action === 'SPRAYING'
                      ? 'text-emerald-400 font-bold'
                      : log.action === 'SKIPPED'
                      ? 'text-yellow-400'
                      : 'text-slate-400'
                  }>
                    {log.details}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 3. MANUAL / SINGLE TARGET SPOT SPRAY */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Send className="w-5 h-5 text-emerald-400" />
            <span>Single Zone Targeted Valve Test</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test individual solenoid discharge on a selected zone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Target Zone Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Target Zone:</label>
            <select
              value={selectedZoneId}
              onChange={(e) => handleZoneSelectionChange(e.target.value)}
              className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  [{z.id}] {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dosage Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold text-slate-300">Water Dosage (mL):</label>
              <span className="font-extrabold text-sky-400 text-sm">{volumeMl} mL</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="2.5"
              value={volumeMl}
              onChange={(e) => setVolumeMl(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

        </div>

        <button
          onClick={handleTriggerSingleSpray}
          disabled={isSingleSpraying || isMissionRunning}
          className={`w-full py-4 rounded-xl font-extrabold text-sm shadow-lg flex items-center justify-center space-x-2 transition ${
            isSingleSpraying || isMissionRunning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
          }`}
        >
          {isSingleSpraying ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Pulsing Solenoid ({volumeMl} mL)...</span>
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              <span>Trigger Valve Test ({volumeMl} mL)</span>
            </>
          )}
        </button>

      </div>

    </div>
  );
};
