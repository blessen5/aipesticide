import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Droplet, 
  Sprout, 
  TrendingDown, 
  ShieldCheck, 
  Activity, 
  Sparkles, 
  Zap, 
  Flame, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsSummary, Plant, SprayEvent } from '../types';

export const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [events, setEvents] = useState<SprayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [sumRes, plantsRes, eventsRes] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getPlants(),
          api.getSprayHistory()
        ]);
        setSummary(sumRes);
        setPlants(plantsRes);
        setEvents(eventsRes);
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Computing Precision Agriculture Analytics...</div>
      </div>
    );
  }

  // 1. Severity Distribution Data
  const severityData = [
    { severity: 'Healthy', count: summary.healthy_plants, volume: 0, color: '#22c55e' },
    { severity: 'Low', count: summary.low_infection, volume: summary.low_infection * 5, color: '#eab308' },
    { severity: 'Moderate', count: summary.moderate_infection, volume: summary.moderate_infection * 10, color: '#f97316' },
    { severity: 'High', count: summary.high_infection, volume: summary.high_infection * 20, color: '#ef4444' }
  ];

  // 2. Disease Frequency Calculation
  const diseaseMap: { [key: string]: number } = {};
  plants.forEach(p => {
    const dis = p.disease || 'Healthy Crop';
    diseaseMap[dis] = (diseaseMap[dis] || 0) + 1;
  });

  const diseaseData = Object.keys(diseaseMap).map(k => ({
    name: k,
    count: diseaseMap[k]
  })).sort((a, b) => b.count - a.count);

  const DISEASE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

  // 3. Spray Volume Savings Data
  const volumeData = [
    {
      metric: 'Total Chemical Applied (mL)',
      Blanket: summary.untreated_volume_estimate,
      Targeted: summary.total_spray_volume
    }
  ];

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ecological & Chemical Reduction Impact Modeling</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          <span>Precision Agriculture Impact Analytics</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm">
          Quantifiable evaluation of chemical volume savings, pathogen distribution, and precision spot-spray efficiency.
        </p>
      </div>

      {/* 3 Large Impact Highlight Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Chemical Volume Reduction</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Droplet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {summary.estimated_reduction_percentage}%
          </div>
          <p className="text-xs text-slate-400">
            Vs uniform broadcast spray across {summary.total_plants} plants
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Chemical Conserved</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-cyan-400">
            {(summary.untreated_volume_estimate - summary.total_spray_volume).toFixed(1)} mL
          </div>
          <p className="text-xs text-slate-400">
            Actual dosage: {summary.total_spray_volume} mL vs {summary.untreated_volume_estimate} mL
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Spot Spray Executions</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-400">
            {events.length} Completed
          </div>
          <p className="text-xs text-slate-400">
            Automated actuator commands logged
          </p>
        </div>

      </div>

      {/* Row 1: Severity Distribution & Chemical Volume Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Severity Breakdown Bar Chart */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Infection Severity Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Crop foliage count categorized by pathogen severity</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="severity" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
            <div>
              <span className="text-slate-400">Healthy:</span>
              <p className="font-extrabold text-emerald-400">{summary.healthy_plants}</p>
            </div>
            <div>
              <span className="text-slate-400">Low:</span>
              <p className="font-extrabold text-yellow-400">{summary.low_infection}</p>
            </div>
            <div>
              <span className="text-slate-400">Moderate:</span>
              <p className="font-extrabold text-orange-400">{summary.moderate_infection}</p>
            </div>
            <div>
              <span className="text-slate-400">High:</span>
              <p className="font-extrabold text-rose-400">{summary.high_infection}</p>
            </div>
          </div>
        </div>

        {/* Chemical Comparison Chart */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Droplet className="w-4 h-4 text-cyan-400" />
              <span>Target Spray vs Blanket Application (mL)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Aggregate dosage comparison</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit=" mL" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Blanket" fill="#64748b" name="Uniform Blanket Spray" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Targeted" fill="#10b981" name="AgriPrescribe Spot Spray" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-300">Net Chemical Reduction:</span>
            <strong className="text-emerald-400 text-sm font-extrabold">
              -{summary.estimated_reduction_percentage}% ({((summary.untreated_volume_estimate - summary.total_spray_volume)).toFixed(0)} mL Saved)
            </strong>
          </div>
        </div>

      </div>

      {/* Row 2: Detected Pathogen Disease Breakdown */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Sprout className="w-5 h-5 text-emerald-400" />
            <span>Identified Crop Pathogen Distribution</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Frequency of detected diseases across test agricultural plots</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {diseaseData.map((d, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">{d.name}</h4>
                <p className="text-[10px] text-slate-400">{((d.count / plants.length) * 100).toFixed(0)}% of total crops</p>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {d.count} Plants
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
