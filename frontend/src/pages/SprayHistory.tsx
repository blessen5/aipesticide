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
  ArrowUpDown,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { SprayEvent } from '../types';
import { SpotlightCard } from '../components/SpotlightCard';

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
        <div className="text-zinc-500 text-xs font-mono animate-pulse">Loading precision spray execution ledger...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auditable Precision Telemetry Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Spray Execution History</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Complete timestamped audit log of all precision spot-spraying commands, volumes dispensed, and operating modes.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="self-start sm:self-auto px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-800 flex items-center space-x-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <SpotlightCard className="p-5 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-400 font-semibold">Total Spray Events</span>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{events.length}</div>
          <p className="text-[11px] text-zinc-500">Autonomous & targeted spot triggers</p>
        </SpotlightCard>

        <SpotlightCard className="p-5 border border-zinc-800 space-y-1">
          <span className="text-xs text-emerald-400 font-semibold">Total Chemical Dispensed</span>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{totalVolume.toFixed(1)} <span className="text-sm font-normal text-zinc-400">mL</span></div>
          <p className="text-[11px] text-zinc-500">Total micro-dose application volume</p>
        </SpotlightCard>

        <SpotlightCard className="p-5 border border-zinc-800 space-y-1">
          <span className="text-xs text-zinc-400 font-semibold">Average Pulse Dosage</span>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{avgVolume} <span className="text-sm font-normal text-zinc-400">mL</span></div>
          <p className="text-[11px] text-zinc-500">Targeted spot dosage efficiency</p>
        </SpotlightCard>

      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
        
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Command ID, Plant ID, or mode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-2 text-xs self-start sm:self-auto">
          {['ALL', 'COMPLETED', 'SIMULATED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                statusFilter === st
                  ? 'bg-zinc-800 text-emerald-400 border-zinc-700 font-semibold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

      </div>

      {/* History Log Table */}
      <div className="card-surface overflow-hidden border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header-cell">Command ID</th>
                <th className="table-header-cell">Target Sector / Plant</th>
                <th className="table-header-cell">Volume Dispensed</th>
                <th className="table-header-cell">Execution Mode</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-zinc-900/50 transition">
                    <td className="table-body-cell font-mono text-emerald-400 font-bold">
                      {evt.command_id}
                    </td>
                    <td className="table-body-cell font-mono text-zinc-200">
                      {evt.plant_id ? `Plant #${evt.plant_id}` : 'General Sector'}
                    </td>
                    <td className="table-body-cell">
                      <span className="font-bold text-white text-xs">{evt.volume_ml} mL</span>
                    </td>
                    <td className="table-body-cell">
                      <span className="bg-sky-950/60 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded text-[11px] font-mono font-medium">
                        {evt.mode}
                      </span>
                    </td>
                    <td className="table-body-cell">
                      <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{evt.status}</span>
                      </span>
                    </td>
                    <td className="table-body-cell text-zinc-400 font-mono text-[11px]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 text-xs">
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

