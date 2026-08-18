import React, { useEffect, useState } from 'react';
import { 
  History, 
  CheckCircle2, 
  Droplet, 
  Search, 
  Radio, 
  RefreshCw, 
  Sparkles,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';
import { SprayEvent } from '../types';

export const SprayHistory: React.FC = () => {
  const [events, setEvents] = useState<SprayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getSprayHistory();
      setEvents(data);
    } catch (err) {
      console.error('Spray history fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesSearch = 
      e.command_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.plant_id && String(e.plant_id).includes(searchTerm)) ||
      e.mode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalVolume = events.reduce((acc, ev) => acc + (ev.volume_ml || 0), 0);
  const avgVolume = events.length > 0 ? (totalVolume / events.length).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Precision Spray Execution Log...</div>
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
            <span>Auditable Precision Telemetry Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <History className="w-6 h-6 text-emerald-400" />
            <span>Spray Execution History</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Complete timestamped audit log of all precision spot-spraying commands, volumes dispensed, and operating modes.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Spray Events</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{events.length}</div>
          <p className="text-[11px] text-slate-500">Autonomous & targeted spot triggers</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/10 space-y-1">
          <span className="text-xs text-emerald-400 font-medium">Total Chemical Dispensed</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{totalVolume.toFixed(1)} mL</div>
          <p className="text-[11px] text-emerald-300/70">Total precision application volume</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Average Dosage per Application</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{avgVolume} mL</div>
          <p className="text-[11px] text-slate-500">Targeted pulse dosage efficiency</p>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Command ID, Plant ID, or mode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-2 text-xs self-start sm:self-auto">
          <span className="text-slate-400 font-medium">Filter:</span>
          {['ALL', 'COMPLETED', 'SIMULATED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

      </div>

      {/* History Log Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-5">Command ID</th>
                <th className="py-4 px-5">Target Plant</th>
                <th className="py-4 px-5">Volume Dispensed</th>
                <th className="py-4 px-5">Execution Mode</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-5 font-mono text-emerald-400 font-bold">
                      {evt.command_id}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-white">
                      {evt.plant_id ? `Plant #${evt.plant_id}` : 'General Sector'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-extrabold text-white text-sm">{evt.volume_ml} mL</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold">
                        {evt.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-extrabold text-[10px] flex items-center w-max gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No spray execution records match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
