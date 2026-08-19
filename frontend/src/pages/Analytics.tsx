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
import { SpotlightCard } from '../components/SpotlightCard';

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
        <div className="text-zinc-500 text-xs font-mono animate-pulse">Computing precision agriculture analytics...</div>
      </div>
    );
  }

  // 1. Severity Distribution Data
  const severityData = [
    { severity: 'Healthy', count: summary.healthy_plants, volume: 0, color: '#10b981' },
    { severity: 'Low', count: summary.low_infection, volume: summary.low_infection * 5, color: '#0ea5e9' },
    { severity: 'Moderate', count: summary.moderate_infection, volume: summary.moderate_infection * 10, color: '#f59e0b' },
    { severity: 'High', count: summary.high_infection, volume: summary.high_infection * 20, color: '#f43f5e' }
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

  const DISEASE_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6'];

  // 3. Spray Volume Savings Data
  const volumeData = [
    {
      metric: 'Volume (mL)',
      Broadcast: summary.untreated_volume_estimate,
      Targeted: summary.total_spray_volume
    }
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ecological & Chemical Reduction Impact Modeling</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <span>Precision Agriculture Impact Analytics</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Quantifiable evaluation of chemical volume savings, pathogen distribution, and spot-spray efficiency.
        </p>
      </div>

      {/* 3 Impact Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <SpotlightCard className="p-5 space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Chemical Volume Reduction</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 laser-emerald">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {Number(summary.estimated_reduction_percentage).toFixed(1)}%
          </div>
          <p className="text-[11px] text-zinc-500">
            Compared to blanket broadcast across {summary.total_plants} target plants
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5 space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Chemical Conserved</span>
            <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-400 laser-sky">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {(summary.untreated_volume_estimate - summary.total_spray_volume).toFixed(1)} <span className="text-sm font-normal text-zinc-400">mL</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Actual spot dose: {summary.total_spray_volume} mL vs {summary.untreated_volume_estimate} mL blanket
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-5 space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Precision Spot Executions</span>
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400 laser-amber">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {events.length} <span className="text-sm font-normal text-zinc-400">Events</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Direct solenoid valve actuations executed with audit trail
          </p>
        </SpotlightCard>
      </div>

      {/* 2 Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Broadcast vs Targeted Volume Comparison */}
        <SpotlightCard className="p-6 space-y-4 border border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Chemical Volume Comparison (mL)</h3>
            <p className="text-xs text-zinc-400">Conventional Broadcast Spray vs AI Precision Spot-Spray</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="metric" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Broadcast" fill="#71717a" radius={[4, 4, 0, 0]} name="Conventional Broadcast (mL)" />
                <Bar dataKey="Targeted" fill="#10b981" radius={[4, 4, 0, 0]} name="AgriPrescribe Spot-Dose (mL)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>

        {/* Severity Distribution */}
        <SpotlightCard className="p-6 space-y-4 border border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Pathogen Severity Distribution</h3>
            <p className="text-xs text-zinc-400">Plant classification breakdown across scouted sectors</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="severity"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#09090b" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>
      </div>

      {/* Disease Distribution Table */}
      <div className="card-surface overflow-hidden border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Identified Disease Breakdown</h3>
            <p className="text-xs text-zinc-400">Pathogen frequencies and recommended intervention protocols</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header-cell">Diagnosed Condition</th>
                <th className="table-header-cell">Afflicted Plants</th>
                <th className="table-header-cell">Relative Frequency</th>
                <th className="table-header-cell">Recommended Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {diseaseData.map((d, index) => {
                const percent = summary.total_plants > 0 
                  ? ((d.count / summary.total_plants) * 100).toFixed(1)
                  : '0.0';
                return (
                  <tr key={d.name} className="hover:bg-zinc-900/50 transition">
                    <td className="table-body-cell font-semibold text-zinc-200">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: DISEASE_COLORS[index % DISEASE_COLORS.length] }} 
                        />
                        <span>{d.name}</span>
                      </div>
                    </td>
                    <td className="table-body-cell font-mono text-zinc-300">
                      {d.count}
                    </td>
                    <td className="table-body-cell font-mono text-zinc-400">
                      {percent}%
                    </td>
                    <td className="table-body-cell text-xs text-zinc-400">
                      {d.name === 'Healthy Crop' 
                        ? 'No chemical intervention required' 
                        : 'Targeted micro-dose fungicide application'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

