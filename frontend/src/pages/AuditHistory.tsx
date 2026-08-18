import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  History,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Activity,
  Layers
} from 'lucide-react';

export const AuditHistory: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch audit logs from network, check console.');
      setError('System is operating offline. Using cached logs if available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <History className="w-6 h-6 text-emerald-400" />
            <span>System Audit & Compliance Log</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Immutable ledger of all system decisions, safety gate checks, and hardware events.
          </p>
        </div>
        
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-amber-950/80 border border-amber-500/40 rounded-xl flex items-center space-x-3 text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
            <p className="text-sm font-semibold">Synchronizing Audit Records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Terminal className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-semibold text-lg text-slate-400">No Audit Logs Found</p>
            <p className="text-sm mt-1">The system has not recorded any operations yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/50">
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Actor</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Target</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Result</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-sm font-semibold text-emerald-300">
                      {log.action}
                    </td>
                    <td className="py-3 px-5 text-sm text-slate-300">
                      {log.user || 'System'}
                    </td>
                    <td className="py-3 px-5 text-sm text-slate-300 font-mono">
                      {log.zone ? `Zone: ${log.zone}` : 'Global'}
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        log.result === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : log.result === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {log.result === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        <span>{log.result}</span>
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-400 max-w-xs truncate" title={log.reason}>
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
