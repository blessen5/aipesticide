import React, { useEffect, useState } from 'react';
import { History, CheckCircle, Droplet, Clock, Radio, Search } from 'lucide-react';
import { api } from '../services/api';
import { SprayEvent } from '../types';

export const SprayHistory: React.FC = () => {
  const [events, setEvents] = useState<SprayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getSprayEvents();
        setEvents(data);
      } catch (err) {
        console.error('Spray history fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredEvents = events.filter((e) =>
    e.mode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Spray Execution Log...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
            <History className="w-6 h-6 text-agri-400" />
            <span>Precision Spray Execution Log</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Auditable history of precision spot spray operations, chemical volumes discharged, and target coverage.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search spray log..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-agri-500"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Event ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Execution Mode</th>
                <th className="py-3.5 px-4">Volume Sprayed</th>
                <th className="py-3.5 px-4">Coverage %</th>
                <th className="py-3.5 px-4">Execution Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-agri-400 font-bold">#EVT-00{evt.id}</td>
                  <td className="py-3 px-4 text-slate-400">{new Date(evt.start_time).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      {evt.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono text-[10px]">
                      {evt.mode}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{evt.volume_sprayed_ml} mL</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">{evt.coverage_percentage}%</td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{evt.notes || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
