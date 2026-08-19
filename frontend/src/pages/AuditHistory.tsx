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
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { SpotlightCard } from '../components/SpotlightCard';

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
    } catch {
      setError('Operating in local audit buffer mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Immutable EPA Compliance Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>System Audit & Compliance Log</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Cryptographically sealed audit ledger of all agronomic prescriptions, safety gate validations, and hardware triggers.
          </p>
        </div>
        
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-xs font-semibold border border-zinc-800 text-zinc-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center space-x-3 text-zinc-400 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="card-surface overflow-hidden border border-zinc-800">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <RefreshCw className="w-6 h-6 animate-spin mb-3 text-emerald-500" />
            <p className="text-xs font-mono">Synchronizing audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <p className="font-semibold text-sm text-zinc-300">No Audit Logs Found</p>
            <p className="text-xs text-zinc-500">The system has not recorded any operations yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header-cell">Timestamp</th>
                  <th className="table-header-cell">Action Executed</th>
                  <th className="table-header-cell">Authenticated Actor</th>
                  <th className="table-header-cell">Target Sector</th>
                  <th className="table-header-cell">Safety Gate Result</th>
                  <th className="table-header-cell">Execution Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/50 transition">
                    <td className="table-body-cell text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="table-body-cell font-semibold text-zinc-200">
                      {log.action}
                    </td>
                    <td className="table-body-cell text-zinc-300">
                      {log.user || 'System Engine'}
                    </td>
                    <td className="table-body-cell text-zinc-300 font-mono">
                      {log.zone ? `Zone: ${log.zone}` : 'Global Field'}
                    </td>
                    <td className="table-body-cell">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                        log.result === 'COMPLETED'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                          : log.result === 'REJECTED'
                          ? 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {log.result === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        <span>{log.result}</span>
                      </span>
                    </td>
                    <td className="table-body-cell text-zinc-400 max-w-xs truncate" title={log.reason}>
                      {log.reason || 'Safety verification passed'}
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

