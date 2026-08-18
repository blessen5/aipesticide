import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, AlertTriangle, CheckCircle, Save, X } from 'lucide-react';

interface Disease {
  id: number;
  name: string;
  scientific_name?: string;
  pathogen_type?: string;
  symptoms_summary?: string;
}

export const KnowledgeBaseAdmin: React.FC = () => {
  const [diseases, setDiseases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const role = localStorage.getItem('userRole') || 'FARMER';
      const res = await fetch('/api/knowledge/diseases', {
        headers: { 'X-User-Role': role }
      });
      if (!res.ok) throw new Error('Failed to fetch knowledge base.');
      const data = await res.json();
      setDiseases(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch knowledge base.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-500" />
            Knowledge Base Admin
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage authoritative crops, diseases, and management guidelines.</p>
        </div>
        <button
          onClick={fetchKnowledge}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-semibold text-slate-200">Registered Diseases</h2>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm">
            <Plus className="w-4 h-4" />
            Add Disease
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading knowledge base...</div>
        ) : diseases.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No diseases found. Please run the import script.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-sm">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Scientific Name</th>
                  <th className="p-4 font-medium">Pathogen Type</th>
                  <th className="p-4 font-medium">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {diseases.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-slate-300">{d.name}</td>
                    <td className="p-4 text-slate-400 italic">{d.scientific_name || '-'}</td>
                    <td className="p-4 text-slate-400">{d.pathogen_type || '-'}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                        {d.base_risk_level || 'UNKNOWN'}
                      </span>
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
