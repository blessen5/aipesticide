import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  ShieldCheck, 
  Droplet, 
  Sprout 
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

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Analytics Data...</div>
      </div>
    );
  }

  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-agri-400" />
          <span>Precision Agriculture Impact Analytics</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm">
          Quantifiable evidence of chemical savings, environmental impact, and crop health improvement.
        </p>
      </div>

      {/* Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Droplet className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Chemical Pesticide Reduction</span>
            <div className="text-3xl font-extrabold text-emerald-400">{data.total_chemical_reduction_pct}%</div>
            <p className="text-[11px] text-slate-400">Vs Traditional Blanket Spraying</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-sky-500/30 flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Sprout className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Water Volume Conserved</span>
            <div className="text-3xl font-extrabold text-sky-400">{data.total_water_saved_liters} Liters</div>
            <p className="text-[11px] text-slate-400">Target Pulse Spray Conservation</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-agri-500/30 flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-agri-500/10 text-agri-400 border border-agri-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Precision Accuracy Rate</span>
            <div className="text-3xl font-extrabold text-agri-400">96.8%</div>
            <p className="text-[11px] text-slate-400">Pathogen Spot Targeting</p>
          </div>
        </div>
      </div>

      {/* Main Chart: Chemical Volume Saved Comparison */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Daily Pesticide Volume Comparison (Liters)</h3>
          <p className="text-xs text-slate-400">Conventional Broad-Acre Spraying vs AgriPrescribe Precision Spot Spraying</p>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weekly_savings} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="conventional_liters" name="Conventional Spraying (L)" fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="precision_liters" name="AgriPrescribe Spot Spray (L)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Severity Breakdown Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Crop Health Severity Breakdown</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.severity_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="severity" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }} />
                <Bar dataKey="count" fill="#4ade80" radius={[4, 4, 0, 0]}>
                  {data.severity_breakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disease Distribution Table */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Detected Pathogen Distribution</h3>
          <div className="space-y-3 pt-2">
            {data.disease_distribution.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="font-semibold text-slate-200">{item.disease}</span>
                <span className="font-bold text-agri-400 bg-agri-500/10 px-2.5 py-1 rounded-full border border-agri-500/20">
                  {item.count} Incidences
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
