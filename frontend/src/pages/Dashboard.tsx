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
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap
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

      if (healthRes.status === 'fulfilled') {
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
      }
      if (sprayRes.status === 'fulfilled') {
        setSprayer(sprayRes.value);
      }
      if (fieldsRes.status === 'fulfilled') {
        setFields(fieldsRes.value);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not connect to backend service. Please check API server.');
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

  // Severity Distribution Data for Pie Chart
  const severityData = summary ? [
    { name: 'Healthy (0 mL)', value: summary.healthy_plants, color: '#22c55e' },
    { name: 'Low (5 mL)', value: summary.low_infection, color: '#eab308' },
    { name: 'Moderate (10 mL)', value: summary.moderate_infection, color: '#f97316' },
    { name: 'High (20 mL)', value: summary.high_infection, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  // Spray Comparison Data for Bar Chart
  const sprayComparisonData = summary ? [
    {
      name: 'Uniform Blanket Spray',
      volume: summary.untreated_volume_estimate,
      fill: '#64748b'
    },
    {
      name: 'Targeted Spot Spray',
      volume: summary.total_spray_volume,
      fill: '#10b981'
    }
  ] : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Sprout className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Connecting to AgriPrescribe Precision Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner Header */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-6 sm:p-8 border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-slate-900/95 to-emerald-950/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SIH 2026 Finalist Prototype</span>
              </div>

              {/* Live API Badge */}
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                apiOnline 
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-950/80 border-rose-500/40 text-rose-400'
              }`}>
                {apiOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <Wifi className="w-3.5 h-3.5" />
                    <span>API ONLINE</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>API OFFLINE</span>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Smartphone-Assisted Prescription Mapping & Precision Spraying System
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              AI foliage diagnosis converts crop disease detection into geo-located prescription maps, saving up to <span className="text-emerald-400 font-bold">{summary?.estimated_reduction_percentage || 65}% chemical volume</span> vs conventional broadcast spraying.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <Link
              to="/scan"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition hover:scale-105"
            >
              <Scan className="w-4 h-4" />
              <span>Scan Plant Leaf</span>
            </Link>

            <Link
              to="/map"
              className="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 flex items-center justify-center space-x-2 transition"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Prescription Map</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-1 rounded-lg bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 6 Key KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Plants */}
        <div className="glass-card p-4 rounded-2xl border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Plants</span>
            <Sprout className="w-4 h-4 text-slate-300" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {summary?.total_plants ?? 0}
            </div>
            <p className="text-[11px] text-slate-400">Across {fields.length} test fields</p>
          </div>
        </div>

        {/* Healthy Plants */}
        <div className="glass-card p-4 rounded-2xl border-emerald-500/30 bg-emerald-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Healthy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {summary?.healthy_plants ?? 0}
            </div>
            <p className="text-[11px] text-emerald-300/80">0 mL (No Spray Required)</p>
          </div>
        </div>

        {/* Low Infection */}
        <div className="glass-card p-4 rounded-2xl border-yellow-500/30 bg-yellow-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-yellow-400 text-xs font-semibold">
            <span>Low Infection</span>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-yellow-400">
              {summary?.low_infection ?? 0}
            </div>
            <p className="text-[11px] text-yellow-300/80">5 mL Targeted Bio-Spray</p>
          </div>
        </div>

        {/* Moderate Infection */}
        <div className="glass-card p-4 rounded-2xl border-orange-500/30 bg-orange-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-orange-400 text-xs font-semibold">
            <span>Moderate</span>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-orange-400">
              {summary?.moderate_infection ?? 0}
            </div>
            <p className="text-[11px] text-orange-300/80">10 mL Targeted Spray</p>
          </div>
        </div>

        {/* High Infection */}
        <div className="glass-card p-4 rounded-2xl border-rose-500/30 bg-rose-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>High Infection</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400">
              {summary?.high_infection ?? 0}
            </div>
            <p className="text-[11px] text-rose-300/80">20 mL Priority Spray</p>
          </div>
        </div>

        {/* Chemical Saved % */}
        <div className="glass-card p-4 rounded-2xl border-emerald-500/40 bg-emerald-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold">
            <span>Reduction</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
              {summary?.estimated_reduction_percentage ?? 0}%
            </div>
            <p className="text-[11px] text-emerald-400">Vs broad uniform spray</p>
          </div>
        </div>

      </div>

      {/* Charts & Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Infection Severity Breakdown (Donut) */}
        <div className="lg:col-span-5 glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Infection Severity Distribution</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Foliage health categorization across field plants</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs">No plant severity records available</div>
            )}
          </div>

          {/* Quick Legend Breakdown */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Healthy: <strong className="text-white">{summary?.healthy_plants}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-slate-300">Low: <strong className="text-white">{summary?.low_infection}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-300">Moderate: <strong className="text-white">{summary?.moderate_infection}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300">High: <strong className="text-white">{summary?.high_infection}</strong></span>
            </div>
          </div>
        </div>

        {/* Chart 2: Chemical Dosage Comparison (Bar Chart) */}
        <div className="lg:col-span-7 glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <span>Spray Usage & Chemical Volume Comparison</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Targeted prescription volume vs conventional uniform broadcast (mL)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sprayComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit=" mL" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  formatter={(val: any) => [`${val} mL`, 'Volume']}
                />
                <Bar dataKey="volume" radius={[8, 8, 0, 0]}>
                  {sprayComparisonData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">
                Recommended Precision Spray: <strong className="text-emerald-400">{summary?.total_spray_volume} mL</strong> vs <span className="line-through text-slate-500">{summary?.untreated_volume_estimate} mL</span>
              </span>
            </div>
            <span className="font-extrabold text-emerald-400 text-sm">
              -{summary?.estimated_reduction_percentage}% SAVED
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Section: Sprayer Status & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sprayer Device Telemetry */}
        <div className="glass-card p-6 rounded-3xl border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              <h3 className="font-bold text-white text-base">Sprayer Telemetry</h3>
            </div>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
              sprayer?.status === 'READY'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : sprayer?.status === 'SPRAYING'
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 animate-pulse'
                : 'bg-slate-700 text-slate-300 border-slate-600'
            }`}>
              {sprayer?.status || 'READY'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Operating Mode:</span>
              <span className="font-mono text-emerald-400 font-bold">{sprayer?.mode || 'SIMULATED'}</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Fluid Tank Level:</span>
                <span className="font-bold text-white">{sprayer?.fluid_level_pct || 90}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all"
                  style={{ width: `${sprayer?.fluid_level_pct || 90}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Battery Level:</span>
                <span className="font-bold text-white">{sprayer?.battery_level || 95}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className="bg-sky-400 h-full rounded-full transition-all"
                  style={{ width: `${sprayer?.battery_level || 95}%` }}
                />
              </div>
            </div>
          </div>

          <Link
            to="/sprayer"
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition"
          >
            <span>Open Sprayer Control</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Action: Scan Leaf */}
        <Link
          to="/scan"
          className="group glass-card p-6 rounded-3xl border-emerald-500/20 hover:border-emerald-500/50 flex flex-col justify-between space-y-4 transition"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <Scan className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Plant Disease Scanner</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload or capture a leaf photo. Real-time diagnosis calculates surface infection % and generates customized spray prescription.
            </p>
          </div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition">
            <span>Launch Scanner</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Quick Action: Prescription Map */}
        <Link
          to="/map"
          className="group glass-card p-6 rounded-3xl border-slate-800 hover:border-emerald-500/40 flex flex-col justify-between space-y-4 transition"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Field Prescription Map</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              View interactive GeoJSON agricultural field plots. Color-coded plant markers pinpoint exact spot-spray targets.
            </p>
          </div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">
            <span>Explore Map</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

      </div>

    </div>
  );
};
