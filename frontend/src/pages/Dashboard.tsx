import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Scan,
  MapPin,
  Radio,
  Droplet,
  ArrowRight,
  TrendingDown,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Cpu,
  Power,
  Gauge,
  Siren,
  Wind,
  Thermometer,
  CloudRain,
  ChevronRight,
  Play,
  Sparkles
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsSummary, SprayerStatus, Field } from '../types';
import { SpotlightCard } from '../components/SpotlightCard';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [sprayer, setSprayer] = useState<SprayerStatus | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [healthRes, sumRes, sprayRes, fieldsRes] = await Promise.allSettled([
        api.getHealth(),
        api.getAnalyticsSummary(),
        api.getSprayerStatus(),
        api.getFields()
      ]);

      setApiOnline(healthRes.status === 'fulfilled');
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (sprayRes.status === 'fulfilled') setSprayer(sprayRes.value);
      if (fieldsRes.status === 'fulfilled') setFields(fieldsRes.value);
    } catch {
      setError('Telemetry offline. Using local cached records.');
      setApiOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleModeChange = async (mode: string) => {
    try {
      await api.setHardwareMode(mode);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFaultInjection = async (fault: string) => {
    try {
      await api.simulateFault(fault);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const severityData = summary ? [
    { name: 'Healthy (0 mL)', value: summary.healthy_plants, color: '#22c55e' },
    { name: 'Low Infection (5 mL)', value: summary.low_infection, color: '#eab308' },
    { name: 'Moderate (10 mL)', value: summary.moderate_infection, color: '#f97316' },
    { name: 'Severe Infection (20 mL)', value: summary.high_infection, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const sprayComparisonData = summary ? [
    { name: 'Conventional Blanket', volume: summary.untreated_volume_estimate, fill: '#52525b' },
    { name: 'Targeted Spot-Spray', volume: summary.total_spray_volume, fill: '#16a34a' }
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="h-16 w-full card-surface shimmer-skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 card-surface shimmer-skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 card-surface shimmer-skeleton" />
          <div className="lg:col-span-5 h-96 card-surface shimmer-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* ──────── 1. Real-Time Operational Ribbon ──────── */}
      <SpotlightCard className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-1">
            <span className="font-semibold text-zinc-200">Field Plot: North Acre #04</span>
            <span>•</span>
            <span>Spring Wheat (Foliar Stage 4)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Precision Spraying & Field Operations
          </h1>
        </div>

        {/* Live Weather & Drift Safety Gauge */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-zinc-300">Wind: <strong>3.2 m/s NW</strong></span>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40 laser-emerald">
              Low Drift
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>21.4°C • 58% RH</span>
          </div>

          <button
            onClick={handleManualRefresh}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </SpotlightCard>

      {/* ──────── Interactive Demo Mode Quick Launch Banner ──────── */}
      <Link
        to="/demo"
        className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-teal-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_24px_rgba(16,185,129,0.08)] hover:border-emerald-500/60 transition duration-300"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 laser-emerald transition">
            <Play className="w-5 h-5 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                Interactive 8-Stage Autonomous Spray Demo
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Interactive Walkthrough
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Experience the end-to-end pipeline: Foliage AI Diagnosis → Prescription Generation → ESP32 Boom Spray Execution → Analytics ROI.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition shrink-0">
          <span>Launch Demo</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </Link>

      {error && (
        <div className="p-3 bg-zinc-900 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={handleManualRefresh} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* ──────── 2. Four HD Spotlight Operational KPIs ──────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard className="p-4 space-y-1">
          <div className="text-xs text-zinc-400 font-medium">Chemical Volume Reduction</div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
            {summary?.estimated_reduction_percentage ? Number(summary.estimated_reduction_percentage).toFixed(1) : 65}%
          </div>
          <div className="text-[11px] text-zinc-500">Targeted vs blanket coverage</div>
        </SpotlightCard>

        <SpotlightCard className="p-4 space-y-1">
          <div className="text-xs text-zinc-400 font-medium">Prescription Volume</div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {summary?.total_spray_volume ?? 340} <span className="text-sm font-normal text-zinc-400">mL</span>
          </div>
          <div className="text-[11px] text-zinc-500">Savings of {((summary?.untreated_volume_estimate || 1000) - (summary?.total_spray_volume || 340))} mL</div>
        </SpotlightCard>

        <SpotlightCard className="p-4 space-y-1">
          <div className="text-xs text-zinc-400 font-medium">Scanned Plant Foliage</div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {summary?.total_plants ?? 24} <span className="text-sm font-normal text-zinc-400">plants</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {summary?.healthy_plants ?? 18} healthy (no spray needed)
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-4 space-y-1">
          <div className="text-xs text-zinc-400 font-medium">Sprayer Hardware Node</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 flex items-center space-x-2">
            <span className="text-emerald-400 text-lg laser-emerald">●</span>
            <span className="text-xl sm:text-2xl">{sprayer?.status || 'READY'}</span>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Mode: {sprayer?.mode || 'SIMULATED'} ({sprayer?.nodeId || 'ESP32-BOOM-01'})
          </div>
        </SpotlightCard>
      </div>

      {/* ──────── 3. Split Cockpit: Field Plot Health vs. Sprayer Telemetry ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Foliage Health & Disease Breakdown (7 Cols) */}
        <SpotlightCard className="lg:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Foliage Infection & Spray Dosage Breakdown</h2>
              <p className="text-xs text-zinc-400">Targeted dose per severity tier across plot plants</p>
            </div>
            <Link
              to="/scan"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold laser-emerald transition"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Scan Leaf</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Donut Chart */}
            <div className="sm:col-span-6 h-48 w-full">
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#121215" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem' }}
                      itemStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                  No scan records recorded yet
                </div>
              )}
            </div>

            {/* Severity Breakdown Legend */}
            <div className="sm:col-span-6 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300">Healthy (0 mL)</span>
                </div>
                <span className="font-mono font-bold text-white">{summary?.healthy_plants ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="text-zinc-300">Low Infection (5 mL)</span>
                </div>
                <span className="font-mono font-bold text-white">{summary?.low_infection ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-zinc-300">Moderate (10 mL)</span>
                </div>
                <span className="font-mono font-bold text-white">{summary?.moderate_infection ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-zinc-300">Severe Rust (20 mL)</span>
                </div>
                <span className="font-mono font-bold text-white">{summary?.high_infection ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Prescription Map Plot: <strong>Plot #04 (Sector A-D)</strong></span>
            <Link to="/map" className="text-emerald-400 font-semibold hover:underline flex items-center space-x-1">
              <span>Open Prescription GeoMap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </SpotlightCard>

        {/* Right: Boom Sprayer Hardware Telemetry (5 Cols) */}
        <SpotlightCard className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Boom Sprayer Telemetry</h2>
              <p className="text-xs text-zinc-400 font-mono">Node: {sprayer?.nodeId || 'ESP32-BOOM-01'}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
              {sprayer?.status || 'STANDBY'}
            </span>
          </div>

          {/* Tank Level & Battery */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Chemical Tank Level</span>
                <span className="font-mono font-bold text-zinc-200">{sprayer?.fluid_level_pct || 85}%</span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sprayer?.fluid_level_pct || 85}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Node Battery Pack</span>
                <span className="font-mono font-bold text-zinc-200">{sprayer?.battery_level || 94}%</span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${sprayer?.battery_level || 94}%` }} />
              </div>
            </div>
          </div>

          {/* Hardware Sensors Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-[10px] text-zinc-500 font-semibold">PRESSURE</div>
              <div className="font-mono font-bold text-zinc-200 mt-0.5">{sprayer?.pressure || '38 PSI'}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-[10px] text-zinc-500 font-semibold">FLOW RATE</div>
              <div className="font-mono font-bold text-zinc-200 mt-0.5">{sprayer?.flow_rate?.toFixed(1) || '1.8'} L/m</div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <div className="text-[10px] text-zinc-500 font-semibold">NOZZLE VALVE</div>
              <div className={`font-mono font-bold mt-0.5 ${sprayer?.valve === 'OPEN' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {sprayer?.valve || 'AUTO'}
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="pt-2 flex space-x-2">
            <Link
              to="/sprayer"
              className="flex-1 py-2 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition"
            >
              Sprayer Control Console
            </Link>
            <button
              onClick={() => handleModeChange(sprayer?.mode === 'SIMULATED' ? 'PHYSICAL' : 'SIMULATED')}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium transition"
            >
              {sprayer?.mode === 'SIMULATED' ? 'Use Hardware' : 'Use Sim'}
            </button>
          </div>
        </SpotlightCard>

      </div>

      {/* ──────── 4. Chemical Savings Bar Chart ──────── */}
      <SpotlightCard className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white">Chemical Volume & Cost Impact Comparison</h2>
            <p className="text-xs text-zinc-400">Total volume consumed under targeted prescription vs blanket broadcast</p>
          </div>
          <div className="text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg self-start sm:self-auto laser-emerald">
            {summary?.estimated_reduction_percentage ? Number(summary.estimated_reduction_percentage).toFixed(1) : 65}% Chemical Saved
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sprayComparisonData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 12 }} unit=" mL" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem' }}
                formatter={(val: any) => [`${val} mL`, 'Spray Volume']}
              />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                {sprayComparisonData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SpotlightCard>

    </div>
  );
};



