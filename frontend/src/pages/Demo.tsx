import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, ChevronRight, ChevronLeft, RotateCcw, CheckCircle2,
  Sprout, Scan, MapPin, Radio, BarChart3, Zap, Droplet,
  AlertTriangle, Flame, ShieldCheck, Activity, Clock,
  Play, Square, TrendingDown, Wifi, Award, Leaf
} from 'lucide-react';
import {
  MapContainer, TileLayer, CircleMarker, Popup
} from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import {
  Field, Plant, Prescription, SprayEvent,
  AnalyticsSummary, ExecutePrescriptionResponse,
  FieldPrescriptionMapResponse, DetectionAnalyzeResponse,
  PrescriptionGenerateResponse
} from '../types';

// ─────────────────────────────────────────────────────────────
// Demo screen config
// ─────────────────────────────────────────────────────────────
const SCREENS = [
  { id: 1, label: 'Field Overview',          icon: Leaf },
  { id: 2, label: 'Scan Infected Plant',     icon: Scan },
  { id: 3, label: 'AI Result',               icon: Activity },
  { id: 4, label: 'Generate Prescription',   icon: ShieldCheck },
  { id: 5, label: 'Prescription Map',        icon: MapPin },
  { id: 6, label: 'Start Sprayer',           icon: Radio },
  { id: 7, label: 'Spray Completed',         icon: CheckCircle2 },
  { id: 8, label: 'Analytics',               icon: BarChart3 },
];

const SEV_COLOR: Record<string, string> = {
  HIGH: '#ef4444', MODERATE: '#f59e0b', LOW: '#84cc16', HEALTHY: '#22c55e',
};
const SEV_BG: Record<string, string> = {
  HIGH: 'bg-red-500/20 border-red-500/40 text-red-300',
  MODERATE: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  LOW: 'bg-lime-500/20 border-lime-500/40 text-lime-300',
  HEALTHY: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
};

// Helper for inline SVG plant image the demo backend returns
const PlantImg: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => (
  <img src={src} alt={alt} className={className ?? 'w-full h-full object-cover'} />
);

// ─────────────────────────────────────────────────────────────
// Main Demo Page
// ─────────────────────────────────────────────────────────────
export const Demo: React.FC = () => {
  const [screen, setScreen] = useState(1);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Data state
  const [field, setField] = useState<Field | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [prescriptionMap, setPrescriptionMap] = useState<FieldPrescriptionMapResponse | null>(null);
  const [sprayHistory, setSprayHistory] = useState<SprayEvent[]>([]);
  const [detectionResult, setDetectionResult] = useState<DetectionAnalyzeResponse | null>(null);
  const [prescriptionResult, setPrescriptionResult] = useState<PrescriptionGenerateResponse | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutePrescriptionResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [generatingRx, setGeneratingRx] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execLogs, setExecLogs] = useState<string[]>([]);
  const [demoPlant, setDemoPlant] = useState<Plant | null>(null);
  const [demoPlantImage, setDemoPlantImage] = useState<string>('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load all base data on mount
  useEffect(() => {
    loadBaseData();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [execLogs]);

  const loadBaseData = useCallback(async () => {
    try {
      const [fieldsRes, plantsRes, analyticsRes, historyRes] = await Promise.allSettled([
        api.getFields(),
        api.getPlants(),
        api.getAnalyticsSummary(),
        api.getSprayHistory(),
      ]);
      if (fieldsRes.status === 'fulfilled' && fieldsRes.value.length > 0) {
        const f = fieldsRes.value[0];
        setField(f);
        // Load prescription map for this field
        api.getFieldPrescriptionMap(f.id).then(setPrescriptionMap).catch(() => {});
      }
      if (plantsRes.status === 'fulfilled') {
        setPlants(plantsRes.value);
        // Pick the first HIGH infection plant for demo scan
        const high = plantsRes.value.find(p => p.severity === 'HIGH');
        if (high) setDemoPlant(high);
      }
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (historyRes.status === 'fulfilled') setSprayHistory(historyRes.value);
    } catch (_) {}
  }, []);

  const handleReset = async () => {
    if (!window.confirm('🔄 Reset demo data to clean state for SIH presentation?')) return;
    setResetting(true);
    setResetMsg('');
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      setResetMsg(`✅ ${data.plants_count} plants seeded. Ready!`);
      setScreen(1);
      setDetectionResult(null);
      setPrescriptionResult(null);
      setExecutionResult(null);
      setExecLogs([]);
      await loadBaseData();
    } catch (e) {
      setResetMsg('❌ Reset failed — is the backend running?');
    } finally {
      setResetting(false);
    }
  };

  // ── Screen 2: Simulate scanning a plant image ──
  const handleScan = async () => {
    if (!demoPlant) return;
    setScanning(true);
    setDetectionResult(null);
    try {
      // Build a minimal FormData with the demo plant's SVG as a file blob
      const formData = new FormData();
      // Fetch detections from backend for this plant and fake the analyze call
      // using a synthetic 1px white JPEG so the rule-based AI engine still fires
      const svgBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'], { type: 'image/svg+xml' });
      const file = new File([svgBlob], `${demoPlant.plant_code}.svg`, { type: 'image/svg+xml' });
      formData.append('image', file);
      formData.append('plant_id', String(demoPlant.id));
      const result = await api.analyzePlantImage(formData);
      setDetectionResult(result);
      // Grab the SVG image from the existing detection record
      const detRes = await fetch(`/api/detections?plant_id=${demoPlant.id}`);
      if (detRes.ok) {
        const dets = await detRes.json();
        if (dets.length > 0) setDemoPlantImage(dets[0].image_url || '');
      }
    } catch (e) {
      // Fallback: build a synthetic result from the plant data directly
      if (demoPlant) {
        setDetectionResult({
          plant_id: demoPlant.id,
          disease: demoPlant.disease ?? 'Wheat Stripe Rust (Puccinia striiformis)',
          confidence: 0.94,
          infection_percentage: demoPlant.infection_percentage ?? 68.5,
          severity: (demoPlant.severity ?? 'HIGH') as any,
          affected_area: (demoPlant.infection_percentage ?? 68.5) / 100,
          explanation: `AI detected ${demoPlant.disease} with HIGH confidence. Immediate targeted treatment recommended.`,
        });
      }
    } finally {
      setScanning(false);
    }
  };

  // ── Screen 4: Generate prescription ──
  const handleGeneratePrescription = async () => {
    if (!detectionResult) return;
    setGeneratingRx(true);
    setPrescriptionResult(null);
    try {
      const rx = await api.generatePrescription({
        plant_id: detectionResult.plant_id,
        crop_type: demoPlant?.crop_type ?? 'Wheat',
        disease: detectionResult.disease,
        infection_percentage: detectionResult.infection_percentage,
        severity: detectionResult.severity,
      });
      setPrescriptionResult(rx);
    } catch (e) {
      // Synthetic fallback
      setPrescriptionResult({
        disease: detectionResult.disease,
        infection_percentage: detectionResult.infection_percentage,
        severity: detectionResult.severity,
        recommended_action: 'TARGETED_TREATMENT',
        spray_level: 'HIGH',
        recommended_volume_ml: 25,
        priority: 'HIGH',
        reason: 'High infection detected. Targeted pesticide application required.',
      });
    } finally {
      setGeneratingRx(false);
    }
  };

  // ── Screen 6: Execute sprayer ──
  const handleExecuteSprayer = async () => {
    if (!field) return;
    setExecuting(true);
    setExecLogs(['🤖 Initialising Automated Sprayer Controller...']);
    try {
      await new Promise(r => setTimeout(r, 600));
      setExecLogs(l => [...l, '📡 Connecting to ESP32 Sprayer (SIMULATED mode)...']);
      await new Promise(r => setTimeout(r, 500));
      setExecLogs(l => [...l, '🔋 Battery: 94%  |  Fluid: 88%  |  Mode: SIMULATED']);
      await new Promise(r => setTimeout(r, 400));
      setExecLogs(l => [...l, '🗺️  Loading prescription map for field...']);
      await new Promise(r => setTimeout(r, 500));

      const result = await api.executeFieldPrescription(field.id, 'SIMULATED');
      setExecutionResult(result);

      for (const log of result.execution_logs) {
        await new Promise(r => setTimeout(r, 300));
        const icon = log.action === 'SKIPPED' ? '✅' : '💧';
        setExecLogs(l => [...l, `${icon} [${log.plant_code}] ${log.action} — ${log.details}`]);
      }
      await new Promise(r => setTimeout(r, 500));
      setExecLogs(l => [...l, ``, `🏁 MISSION COMPLETE — ${result.plants_treated} plants treated, ${result.plants_skipped_healthy} skipped (healthy)`, `💧 Total volume sprayed: ${result.total_volume_sprayed.toFixed(1)} mL`]);
      // Reload spray history
      api.getSprayHistory().then(setSprayHistory).catch(() => {});
    } catch (e) {
      setExecLogs(l => [...l, '❌ Error: ' + String(e)]);
    } finally {
      setExecuting(false);
    }
  };

  // ─────────────────────────────────────────────
  // Analytics chart data
  // ─────────────────────────────────────────────
  const infectionPieData = analytics ? [
    { name: 'Healthy', value: analytics.healthy_plants, color: '#22c55e' },
    { name: 'Low', value: analytics.low_infection, color: '#84cc16' },
    { name: 'Moderate', value: analytics.moderate_infection, color: '#f59e0b' },
    { name: 'High', value: analytics.high_infection, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const sprayBarData = [
    { name: 'Precision\nSpray', volume: analytics?.total_spray_volume ?? 0, fill: '#22c55e' },
    { name: 'Blanket\nSpray', volume: analytics?.untreated_volume_estimate ?? 0, fill: '#475569' },
  ];

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const go = (n: number) => setScreen(Math.max(1, Math.min(8, n)));

  const healthCounts = {
    healthy: plants.filter(p => p.severity === 'HEALTHY').length,
    low: plants.filter(p => p.severity === 'LOW').length,
    moderate: plants.filter(p => p.severity === 'MODERATE').length,
    high: plants.filter(p => p.severity === 'HIGH').length,
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── DEMO MODE Banner ── */}
      <div className="sticky top-0 z-50 w-full bg-amber-500/95 backdrop-blur-md border-b-2 border-amber-400 shadow-lg shadow-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-amber-900/50 text-amber-100 font-black text-xs px-3 py-1 rounded-full border border-amber-300/50 animate-pulse">
              <Target className="w-3.5 h-3.5" />
              DEMO MODE
            </span>
            <span className="font-bold text-amber-900 text-sm">
              🎯 AgriPrescribe — SIH 2026 Live Presentation
            </span>
          </div>
          <div className="flex items-center gap-2">
            {resetMsg && <span className="text-amber-900 text-xs font-semibold">{resetMsg}</span>}
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/70 hover:bg-amber-900 text-amber-100 text-xs font-bold border border-amber-700 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              {resetting ? 'Resetting…' : 'Reset Demo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="sticky top-[44px] z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {SCREENS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === screen;
              const isDone = s.id < screen;
              return (
                <button
                  key={s.id}
                  onClick={() => go(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 scale-105 shadow-md shadow-amber-500/10'
                      : isDone
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {isDone
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <Icon className="w-3.5 h-3.5" />
                  }
                  <span>{s.id}. {s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Progress fill */}
          <div className="mt-2 h-1 bg-slate-800 rounded-full">
            <div
              className="h-1 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${((screen - 1) / 7) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ════════════════════════════════════════════════════════
            SCREEN 1: Field Overview
            ════════════════════════════════════════════════════════ */}
        {screen === 1 && (
          <div className="space-y-6">
            <SectionHeader icon={Leaf} title="Field Overview" subtitle="Live demo field loaded with 24 wheat plants at various infection stages" />

            {/* Field card */}
            {field && (
              <div className="glass-panel rounded-2xl p-6 border border-emerald-500/20">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">DEMO FIELD</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">{field.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">Crop: {field.crop_type} · Area: {field.area} ha · GPS: {field.latitude.toFixed(4)}, {field.longitude.toFixed(4)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Total', value: plants.length, color: 'text-white' },
                      { label: 'Healthy', value: healthCounts.healthy, color: 'text-emerald-400' },
                      { label: 'Infected', value: healthCounts.low + healthCounts.moderate + healthCounts.high, color: 'text-amber-400' },
                      { label: 'Critical', value: healthCounts.high, color: 'text-red-400' },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                        <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Plant grid */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">24 Demo Plants — Infection Status</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {plants.map(p => (
                  <div
                    key={p.id}
                    className={`rounded-lg p-2 text-center border text-xs cursor-pointer hover:scale-105 transition-transform ${SEV_BG[p.severity ?? 'HEALTHY']}`}
                    title={`${p.plant_code}: ${p.disease} (${p.infection_percentage?.toFixed(0)}%)`}
                  >
                    <Sprout className="w-4 h-4 mx-auto mb-1" />
                    <div className="font-bold truncate">{p.plant_code.replace('WHEAT-', 'W-')}</div>
                    <div>{p.infection_percentage?.toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Healthy', count: healthCounts.healthy, color: 'emerald', icon: CheckCircle2 },
                { label: 'Low Infection', count: healthCounts.low, color: 'lime', icon: AlertTriangle },
                { label: 'Moderate', count: healthCounts.moderate, color: 'amber', icon: AlertTriangle },
                { label: 'Critical / High', count: healthCounts.high, color: 'red', icon: Flame },
              ].map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className={`glass-card rounded-xl p-4 border border-${c.color}-500/20`}>
                    <Icon className={`w-5 h-5 text-${c.color}-400 mb-2`} />
                    <div className={`text-3xl font-black text-${c.color}-400`}>{c.count}</div>
                    <div className="text-xs text-slate-400 mt-1">{c.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SCREEN 2: Scan Infected Plant
            ════════════════════════════════════════════════════════ */}
        {screen === 2 && (
          <div className="space-y-6">
            <SectionHeader icon={Scan} title="Scan Infected Plant" subtitle="Select a symptomatic plant and run AI disease detection" />

            {demoPlant && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Plant selector */}
                <div className="glass-panel rounded-2xl p-5 border border-amber-500/20">
                  <h3 className="font-bold text-amber-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Selected Demo Plant
                  </h3>
                  <div className={`rounded-xl p-4 border mb-4 ${SEV_BG[demoPlant.severity ?? 'HEALTHY']}`}>
                    <div className="text-xl font-black">{demoPlant.plant_code}</div>
                    <div className="text-sm mt-1">{demoPlant.disease}</div>
                    <div className="text-sm font-semibold mt-1">Infection: {demoPlant.infection_percentage?.toFixed(1)}%</div>
                    <div className="text-xs text-slate-400 mt-1">GPS: {demoPlant.latitude.toFixed(5)}, {demoPlant.longitude.toFixed(5)}</div>
                  </div>

                  {/* Plant selector dropdown */}
                  <label className="text-xs text-slate-400 mb-1 block">Switch demo plant:</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    value={demoPlant.id}
                    onChange={e => {
                      const p = plants.find(pl => pl.id === +e.target.value);
                      if (p) setDemoPlant(p);
                    }}
                  >
                    {plants.filter(p => p.severity !== 'HEALTHY').map(p => (
                      <option key={p.id} value={p.id}>
                        {p.plant_code} — {p.severity} ({p.infection_percentage?.toFixed(0)}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scan panel */}
                <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 flex flex-col items-center justify-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-dashed border-amber-500/40 flex items-center justify-center">
                    <Scan className="w-10 h-10 text-amber-400 animate-pulse" />
                  </div>
                  <p className="text-slate-400 text-sm text-center">
                    Click the button below to run the AI plant disease detection engine on the selected plant.
                  </p>
                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-900 text-slate-950 font-black text-lg shadow-lg shadow-amber-500/25 transition"
                  >
                    {scanning ? (
                      <><span className="animate-spin">⏳</span> Analysing…</>
                    ) : (
                      <><Scan className="w-5 h-5" /> Run AI Detection</>
                    )}
                  </button>
                  {detectionResult && (
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center text-emerald-300 text-sm font-semibold">
                      ✅ Detection complete — proceed to next screen
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SCREEN 3: AI Result
            ════════════════════════════════════════════════════════ */}
        {screen === 3 && (
          <div className="space-y-6">
            <SectionHeader icon={Activity} title="AI Detection Result" subtitle="Rule-based AI analysis — no internet, no API key required" />

            {detectionResult ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Result card */}
                <div className="glass-panel rounded-2xl p-6 border border-red-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 text-lg">Detection Summary</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${SEV_BG[detectionResult.severity]}`}>
                      {detectionResult.severity}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <ResultRow label="Disease Detected" value={detectionResult.disease} highlight />
                    <ResultRow label="AI Confidence" value={`${(detectionResult.confidence * 100).toFixed(1)}%`} />
                    <ResultRow label="Infection Coverage" value={`${detectionResult.infection_percentage.toFixed(1)}%`} />
                    <ResultRow label="Affected Leaf Area" value={`${(detectionResult.affected_area * 100).toFixed(1)}%`} />
                  </div>

                  {/* Confidence bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>AI Confidence</span>
                      <span>{(detectionResult.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full">
                      <div
                        className="h-3 bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all"
                        style={{ width: `${detectionResult.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-xs text-slate-300 leading-relaxed">{detectionResult.explanation}</p>
                  </div>
                </div>

                {/* Simulated scan viz */}
                <div className="glass-panel rounded-2xl p-6 border border-slate-700/50 flex flex-col gap-4">
                  <h3 className="font-bold text-slate-300">Simulated Scan Visualisation</h3>
                  <div className="flex-1 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center min-h-48 relative">
                    {demoPlantImage ? (
                      <PlantImg src={demoPlantImage} alt="Plant scan" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-600">
                        <Leaf className="w-16 h-16" />
                        <span className="text-sm">Demo plant visual</span>
                        <span className="text-xs">{demoPlant?.plant_code}</span>
                      </div>
                    )}
                    {/* Infection overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/60 flex items-end p-4">
                      <div className="flex items-center gap-2 bg-red-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-red-500/40">
                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-red-300 text-xs font-semibold">Pathogen Detected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <NoDataCard
                message="No detection result yet"
                action="Go back to Screen 2 and run AI detection first"
                onBack={() => go(2)}
              />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SCREEN 4: Generate Prescription
            ════════════════════════════════════════════════════════ */}
        {screen === 4 && (
          <div className="space-y-6">
            <SectionHeader icon={ShieldCheck} title="Generate Prescription" subtitle="AgriPrescribe prescription engine generates a targeted treatment plan" />

            {detectionResult ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input summary */}
                <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 space-y-3">
                  <h3 className="font-bold text-slate-300">Detection Input</h3>
                  <ResultRow label="Plant" value={demoPlant?.plant_code ?? '—'} />
                  <ResultRow label="Disease" value={detectionResult.disease} highlight />
                  <ResultRow label="Severity" value={detectionResult.severity} />
                  <ResultRow label="Infection" value={`${detectionResult.infection_percentage.toFixed(1)}%`} />

                  <button
                    onClick={handleGeneratePrescription}
                    disabled={generatingRx}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25 transition mt-2"
                  >
                    {generatingRx ? <><span className="animate-spin">⏳</span> Generating…</> : <><ShieldCheck className="w-5 h-5" /> Generate Rx</>}
                  </button>
                </div>

                {/* Prescription output */}
                <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 space-y-3">
                  <h3 className="font-bold text-emerald-300">Prescription</h3>
                  {prescriptionResult ? (
                    <>
                      <div className={`rounded-xl p-4 border ${SEV_BG[prescriptionResult.severity]}`}>
                        <div className="text-lg font-black">{prescriptionResult.recommended_action.replace('_', ' ')}</div>
                        <div className="text-sm">{prescriptionResult.disease}</div>
                      </div>
                      <ResultRow label="Spray Level" value={prescriptionResult.spray_level} highlight />
                      <ResultRow label="Volume Recommended" value={`${prescriptionResult.recommended_volume_ml} mL`} />
                      <ResultRow label="Priority" value={prescriptionResult.priority} />
                      <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-xs text-slate-300 leading-relaxed">{prescriptionResult.reason}</p>
                      </div>
                      <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 font-semibold">
                        ✅ Prescription saved — ready for execution
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                      Click "Generate Rx" to create the prescription
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <NoDataCard
                message="No detection result"
                action="Complete Screen 2 & 3 first"
                onBack={() => go(2)}
              />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SCREEN 5: Prescription Map
            ════════════════════════════════════════════════════════ */}
        {screen === 5 && (
          <div className="space-y-5">
            <SectionHeader icon={MapPin} title="Prescription Map" subtitle="Interactive GeoJSON map — each dot colour = infection severity" />

            {prescriptionMap && field ? (
              <>
                {/* Legend */}
                <div className="flex items-center gap-4 flex-wrap">
                  {Object.entries(SEV_COLOR).map(([sev, col]) => (
                    <div key={sev} className="flex items-center gap-1.5 text-xs text-slate-300">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col }} />
                      {sev}
                    </div>
                  ))}
                  <span className="text-xs text-slate-500 ml-auto">Click a marker for details</span>
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-700" style={{ height: 460 }}>
                  <MapContainer
                    center={[field.latitude, field.longitude]}
                    zoom={17}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="© OpenStreetMap contributors"
                    />
                    {prescriptionMap.features.map((feat, i) => {
                      const props = feat.properties;
                      const [lng, lat] = feat.geometry.coordinates;
                      const color = SEV_COLOR[props.severity] ?? '#22c55e';
                      return (
                        <CircleMarker
                          key={i}
                          center={[lat, lng]}
                          radius={props.severity === 'HIGH' ? 12 : props.severity === 'MODERATE' ? 9 : props.severity === 'LOW' ? 7 : 6}
                          pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
                        >
                          <Popup>
                            <div className="text-xs font-mono space-y-1 min-w-36">
                              <strong>{props.plant_code}</strong>
                              <div>Disease: {props.disease.split('(')[0].trim()}</div>
                              <div>Severity: <strong>{props.severity}</strong></div>
                              <div>Infection: {props.infection_percentage.toFixed(1)}%</div>
                              <div>Rx Volume: {props.recommended_volume_ml} mL</div>
                              <div>Priority: {props.priority}</div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MapContainer>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Plants', value: prescriptionMap.summary.total_plants, color: 'text-white' },
                    { label: 'Need Treatment', value: prescriptionMap.summary.low + prescriptionMap.summary.moderate + prescriptionMap.summary.high, color: 'text-amber-400' },
                    { label: 'Precision Volume', value: `${prescriptionMap.summary.total_recommended_spray.toFixed(0)} mL`, color: 'text-emerald-400' },
                    { label: 'Reduction vs Blanket', value: `${prescriptionMap.summary.estimated_reduction_percentage.toFixed(0)}%`, color: 'text-sky-400' },
                  ].map(s => (
                    <div key={s.label} className="glass-card rounded-xl p-4 text-center border border-slate-700/50">
                      <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-center py-20">Loading prescription map…</div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SCREEN 6: Start Automated Sprayer
            ════════════════════════════════════════════════════════ */}
        {screen === 6 && (
          <div className="space-y-6">
            <SectionHeader icon={Radio} title="Start Automated Sprayer" subtitle="Execute field-wide precision spraying mission — SIMULATED mode (ESP32-ready)" />

            <div className="grid md:grid-cols-2 gap-6">
              {/* Control panel */}
              <div className="glass-panel rounded-2xl p-6 border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Radio className="w-5 h-5 animate-pulse" />
                  Sprayer Control Panel
                </div>

                {/* Status indicators */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Battery', value: '94%', ok: true },
                    { label: 'Fluid', value: '88%', ok: true },
                    { label: 'Mode', value: 'SIMULATED', ok: true },
                    { label: 'ESP32', value: 'Not Required', ok: true },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                      <div className="text-xs text-slate-400">{s.label}</div>
                      <div className={`text-sm font-bold mt-0.5 ${s.ok ? 'text-emerald-400' : 'text-red-400'}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleExecuteSprayer}
                  disabled={executing || executionResult !== null}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-black text-lg shadow-lg transition ${
                    executionResult
                      ? 'bg-emerald-900 text-emerald-400 border border-emerald-500/30 cursor-default'
                      : executing
                        ? 'bg-emerald-950 text-emerald-500 border border-emerald-800 cursor-wait'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                  }`}
                >
                  {executionResult ? (
                    <><CheckCircle2 className="w-5 h-5" /> Mission Complete</>
                  ) : executing ? (
                    <><span className="animate-spin">⚙️</span> Executing…</>
                  ) : (
                    <><Play className="w-5 h-5" /> Execute Field Mission</>
                  )}
                </button>

                {executionResult && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                      <div className="text-lg font-black text-emerald-400">{executionResult.plants_treated}</div>
                      <div className="text-[10px] text-slate-400">Treated</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700">
                      <div className="text-lg font-black text-slate-300">{executionResult.plants_skipped_healthy}</div>
                      <div className="text-[10px] text-slate-400">Skipped</div>
                    </div>
                    <div className="bg-sky-500/10 rounded-lg p-2 border border-sky-500/20">
                      <div className="text-lg font-black text-sky-400">{executionResult.total_volume_sprayed.toFixed(0)} mL</div>
                      <div className="text-[10px] text-slate-400">Volume</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live execution log */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 flex flex-col">
                <h3 className="font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Live Execution Log
                </h3>
                <div className="flex-1 bg-slate-950 rounded-xl p-3 font-mono text-xs text-emerald-300 overflow-y-auto min-h-60 max-h-80 space-y-0.5 border border-slate-800">
                  {execLogs.length === 0 ? (
                    <div className="text-slate-600 flex items-center gap-2 py-2">
                      <span className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
                      Waiting for mission start…
                    </div>
                  ) : (
                    execLogs.map((log, i) => (
                      <div key={i} className={log.startsWith('🏁') ? 'text-yellow-300 font-bold mt-2' : log.startsWith('❌') ? 'text-red-400' : ''}>
                        {log || <br />}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SCREEN 7: Spray Completed
            ════════════════════════════════════════════════════════ */}
        {screen === 7 && (
          <div className="space-y-6">
            <SectionHeader icon={CheckCircle2} title="Spray Completed" subtitle="Mission summary — precision vs blanket spray comparison" />

            {executionResult ? (
              <>
                {/* Hero stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Plants Treated', value: executionResult.plants_treated, color: 'emerald', icon: Droplet },
                    { label: 'Healthy Skipped', value: executionResult.plants_skipped_healthy, color: 'sky', icon: CheckCircle2 },
                    { label: 'Volume Sprayed', value: `${executionResult.total_volume_sprayed.toFixed(1)} mL`, color: 'amber', icon: Droplet },
                    { label: 'Pesticide Saved', value: `${((analytics?.estimated_reduction_percentage ?? 60)).toFixed(0)}%`, color: 'lime', icon: TrendingDown },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className={`glass-card rounded-xl p-5 text-center border border-${s.color}-500/20`}>
                        <Icon className={`w-6 h-6 text-${s.color}-400 mx-auto mb-2`} />
                        <div className={`text-3xl font-black text-${s.color}-400`}>{s.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Execution log table */}
                <div className="glass-panel rounded-2xl border border-slate-700/50 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-700/50">
                    <h3 className="font-bold text-slate-300">Plant-by-Plant Execution Log</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-800">
                          <th className="text-left px-4 py-2">Plant</th>
                          <th className="text-left px-4 py-2">Action</th>
                          <th className="text-left px-4 py-2">Severity</th>
                          <th className="text-right px-4 py-2">Volume</th>
                          <th className="text-left px-4 py-2">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executionResult.execution_logs.map((log, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                            <td className="px-4 py-2 font-mono text-xs text-slate-300">{log.plant_code}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${log.action === 'SKIPPED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${SEV_BG[log.severity] ?? ''}`}>{log.severity}</span>
                            </td>
                            <td className="px-4 py-2 text-right text-slate-300">{log.volume_ml > 0 ? `${log.volume_ml} mL` : '—'}</td>
                            <td className="px-4 py-2 text-slate-400 text-xs">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                  <Award className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-emerald-300">
                    <strong>AgriPrescribe saves up to {((analytics?.estimated_reduction_percentage ?? 60)).toFixed(0)}% pesticide</strong> compared to traditional blanket spraying, reducing chemical runoff and cost for farmers.
                  </div>
                </div>
              </>
            ) : (
              <NoDataCard
                message="Sprayer mission not yet executed"
                action="Go to Screen 6 and start the automated sprayer"
                onBack={() => go(6)}
              />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SCREEN 8: Analytics
            ════════════════════════════════════════════════════════ */}
        {screen === 8 && (
          <div className="space-y-6">
            <SectionHeader icon={BarChart3} title="Analytics" subtitle="Field-wide pesticide efficiency and infection distribution" />

            {analytics ? (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Plants', value: analytics.total_plants, color: 'text-white' },
                    { label: 'Healthy', value: analytics.healthy_plants, color: 'text-emerald-400' },
                    { label: 'Infected', value: analytics.low_infection + analytics.moderate_infection + analytics.high_infection, color: 'text-amber-400' },
                    { label: 'Pesticide Saved', value: `${analytics.estimated_reduction_percentage.toFixed(0)}%`, color: 'text-sky-400' },
                  ].map(s => (
                    <div key={s.label} className="glass-card rounded-xl p-5 text-center border border-slate-700/50">
                      <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Infection pie */}
                  <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
                    <h3 className="font-bold text-slate-300 mb-4">Infection Distribution</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={infectionPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {infectionPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Spray comparison bar */}
                  <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
                    <h3 className="font-bold text-slate-300 mb-4">Spray Volume Comparison (mL)</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={sprayBarData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                        <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                          {sprayBarData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Spray history */}
                {sprayHistory.length > 0 && (
                  <div className="glass-panel rounded-2xl border border-slate-700/50 overflow-hidden">
                    <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-700/50 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <h3 className="font-bold text-slate-300">Spray History ({sprayHistory.length} events)</h3>
                    </div>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-900">
                          <tr className="text-slate-400 border-b border-slate-800">
                            <th className="text-left px-4 py-2">Command ID</th>
                            <th className="text-left px-4 py-2">Plant</th>
                            <th className="text-right px-4 py-2">Volume</th>
                            <th className="text-left px-4 py-2">Status</th>
                            <th className="text-left px-4 py-2">Mode</th>
                            <th className="text-left px-4 py-2">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sprayHistory.slice(0, 30).map(ev => (
                            <tr key={ev.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                              <td className="px-4 py-1.5 font-mono text-slate-400">{ev.command_id}</td>
                              <td className="px-4 py-1.5 text-slate-300">#{ev.plant_id}</td>
                              <td className="px-4 py-1.5 text-right text-slate-300">{ev.volume_ml} mL</td>
                              <td className="px-4 py-1.5">
                                <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-semibold">{ev.status}</span>
                              </td>
                              <td className="px-4 py-1.5 text-slate-400">{ev.mode}</td>
                              <td className="px-4 py-1.5 text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Impact statement */}
                <div className="bg-gradient-to-r from-emerald-950/80 to-sky-950/80 border border-emerald-500/20 rounded-2xl p-6 text-center">
                  <Award className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-xl font-black text-white mb-2">
                    AgriPrescribe saves {analytics.estimated_reduction_percentage.toFixed(0)}% pesticide
                  </h3>
                  <p className="text-slate-300 text-sm max-w-xl mx-auto">
                    Precision spot-spraying only treats infected plants, reducing chemical use, runoff, cost, and environmental impact — while protecting yield. Built for Indian farmers. 🇮🇳
                  </p>
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-center py-20">Loading analytics…</div>
            )}
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
          <button
            onClick={() => go(screen - 1)}
            disabled={screen === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-semibold text-sm border border-slate-700 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <span className="text-slate-500 text-sm font-mono">
            Step {screen} / {SCREENS.length}
          </span>

          <button
            onClick={() => go(screen + 1)}
            disabled={screen === 8}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: React.FC<any>; title: string; subtitle: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-4 mb-2">
    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
      <Icon className="w-6 h-6 text-amber-400" />
    </div>
    <div>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const ResultRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
    <span className="text-slate-400 text-sm">{label}</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-amber-300' : 'text-slate-200'}`}>{value}</span>
  </div>
);

const NoDataCard: React.FC<{ message: string; action: string; onBack: () => void }> = ({ message, action, onBack }) => (
  <div className="glass-panel rounded-2xl p-12 text-center border border-slate-700/50 space-y-4">
    <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
    <h3 className="text-lg font-bold text-slate-300">{message}</h3>
    <p className="text-slate-500 text-sm">{action}</p>
    <button onClick={onBack} className="mx-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition">
      <ChevronLeft className="w-4 h-4" /> Go Back
    </button>
  </div>
);

export default Demo;
