import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  X, 
  Bug, 
  Sprout, 
  ShieldCheck, 
  BookOpen, 
  Filter,
  Check
} from 'lucide-react';
import { SpotlightCard } from '../components/SpotlightCard';

interface Disease {
  id?: number;
  name: string;
  scientific_name?: string;
  pathogen_type?: string;
  category?: string;
  symptoms?: string;
  affected_parts?: string;
  prevention?: string;
  chemical_management_reference?: string;
  status?: string;
}

export const KnowledgeBaseAdmin: React.FC = () => {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pathogenFilter, setPathogenFilter] = useState('ALL');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Disease>({
    name: '',
    scientific_name: '',
    pathogen_type: 'Fungus',
    category: 'Fungal Infection',
    symptoms: '',
    affected_parts: 'Leaves & Stems',
    prevention: '',
    chemical_management_reference: '',
    status: 'ACTIVE'
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const role = localStorage.getItem('userRole') || 'ADMIN';
      const res = await fetch('/api/knowledge/diseases', {
        headers: { 'X-User-Role': role }
      });
      if (!res.ok) throw new Error('Could not fetch from remote database.');
      const data = await res.json();
      setDiseases(data);
      setError(null);
    } catch {
      // Offline fallback seeds
      setDiseases(prev => prev.length > 0 ? prev : [
        {
          id: 1,
          name: 'Wheat Stripe Rust',
          scientific_name: 'Puccinia striiformis',
          pathogen_type: 'Fungus',
          category: 'Rust',
          symptoms: 'Yellow-orange pustules in distinct parallel stripes on leaf blades.',
          affected_parts: 'Leaves',
          status: 'ACTIVE'
        },
        {
          id: 2,
          name: 'Tomato Early Blight',
          scientific_name: 'Alternaria solani',
          pathogen_type: 'Fungus',
          category: 'Blight',
          symptoms: 'Dark brown spots with concentric target-like rings on older leaves.',
          affected_parts: 'Foliage & Fruit',
          status: 'ACTIVE'
        },
        {
          id: 3,
          name: 'Cotton Bacterial Blight',
          scientific_name: 'Xanthomonas citri pv. malvacearum',
          pathogen_type: 'Bacterium',
          category: 'Bacterial',
          symptoms: 'Angular water-soaked leaf spots turning dark brown or black.',
          affected_parts: 'Bolls & Leaves',
          status: 'ACTIVE'
        }
      ]);
      setError('Operating in local cache mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      scientific_name: '',
      pathogen_type: 'Fungus',
      category: 'Fungal Infection',
      symptoms: '',
      affected_parts: 'Leaves & Stems',
      prevention: '',
      chemical_management_reference: '',
      status: 'ACTIVE'
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Disease name is required.', 'error');
      return;
    }

    setSubmitting(true);
    const role = localStorage.getItem('userRole') || 'ADMIN';
    const payload = {
      ...formData,
      status: 'ACTIVE'
    };

    try {
      const res = await fetch('/api/knowledge/diseases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': role
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setDiseases(prev => [created, ...prev]);
        setIsAddModalOpen(false);
        showToast(`Successfully registered ${formData.name} in knowledge base.`);
      } else {
        const errJson = await res.json();
        showToast(errJson.detail || 'Failed to add disease to backend', 'error');
      }
    } catch {
      // Local fallback simulation
      const newEntry: Disease = { id: Date.now(), ...payload };
      setDiseases(prev => [newEntry, ...prev]);
      setIsAddModalOpen(false);
      showToast(`Added ${formData.name} to local session registry.`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDiseases = useMemo(() => {
    return diseases.filter(d => {
      const matchSearch =
        d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.scientific_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.symptoms?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.affected_parts?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (pathogenFilter !== 'ALL' && d.pathogen_type !== pathogenFilter) return false;
      return true;
    });
  }, [diseases, searchQuery, pathogenFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-xl ${
          toast.type === 'success'
            ? 'bg-zinc-900 border-emerald-500/40 text-emerald-300'
            : 'bg-zinc-900 border-rose-500/40 text-rose-300'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Agronomy Knowledge Base & Diseases</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Authoritative plant pathology database, disease symptoms, and prescription management guidelines.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchKnowledge}
            disabled={loading}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition"
            title="Refresh Knowledge Base"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm laser-emerald transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Disease</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by disease name, scientific name, symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto">
          {['ALL', 'Fungus', 'Bacterium', 'Virus', 'Insect'].map(type => (
            <button
              key={type}
              onClick={() => setPathogenFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                pathogenFilter === type
                  ? 'bg-zinc-800 text-emerald-400 border-zinc-700 font-semibold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {type === 'ALL' ? 'All Pathogens' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      {loading && diseases.length === 0 ? (
        <div className="card-surface p-6 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 w-full rounded-lg shimmer-skeleton" />
          ))}
        </div>
      ) : filteredDiseases.length === 0 ? (
        <SpotlightCard className="p-12 text-center space-y-3">
          <Bug className="w-8 h-8 mx-auto text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-300">No diseases found matching your search</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search criteria or register a new disease into the agronomy knowledge base.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Register First Disease
          </button>
        </SpotlightCard>
      ) : (
        <div className="card-surface overflow-hidden border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header-cell">Disease Name & Pathology</th>
                  <th className="table-header-cell">Pathogen Type</th>
                  <th className="table-header-cell">Affected Anatomy</th>
                  <th className="table-header-cell">Symptoms Summary</th>
                  <th className="table-header-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredDiseases.map((d) => (
                  <tr key={d.id || d.name} className="hover:bg-zinc-900/50 transition">
                    <td className="table-body-cell">
                      <div className="font-semibold text-zinc-100 text-xs sm:text-sm">{d.name}</div>
                      <div className="text-[11px] italic text-zinc-500">{d.scientific_name || 'Species unclassified'}</div>
                    </td>
                    <td className="table-body-cell">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {d.pathogen_type || d.category || 'Pathogen'}
                      </span>
                    </td>
                    <td className="table-body-cell">
                      <span className="text-xs text-zinc-300">{d.affected_parts || 'Foliage'}</span>
                    </td>
                    <td className="table-body-cell max-w-xs">
                      <span className="text-xs text-zinc-400 line-clamp-2">{d.symptoms || 'Visual surface lesions'}</span>
                    </td>
                    <td className="table-body-cell">
                      <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────── Modal: Add Disease ──────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Register Plant Disease</h3>
                <p className="text-xs text-zinc-400">Add authoritative crop disease to knowledge engine</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Common Disease Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Potato Late Blight / Rust"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Scientific Taxon Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Phytophthora infestans"
                    value={formData.scientific_name}
                    onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white italic focus:border-zinc-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Pathogen Classification</label>
                  <select
                    value={formData.pathogen_type}
                    onChange={(e) => setFormData({ ...formData, pathogen_type: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                  >
                    <option value="Fungus">Fungus</option>
                    <option value="Bacterium">Bacterium</option>
                    <option value="Virus">Virus</option>
                    <option value="Insect">Insect / Pest</option>
                    <option value="Abiotic">Abiotic / Nutrient Deficit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Affected Plant Anatomy</label>
                  <input
                    type="text"
                    placeholder="e.g. Leaves, Stems, Tubers"
                    value={formData.affected_parts}
                    onChange={(e) => setFormData({ ...formData, affected_parts: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Diagnostic Symptoms Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Water-soaked dark brown circular spots appearing on lower leaves with pale green halos..."
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none resize-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Treatment & Chemical Guideline Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. Apply Tebuconazole 25.9% EC at 5-10 mL spot dose upon 15% severity"
                    value={formData.chemical_management_reference}
                    onChange={(e) => setFormData({ ...formData, chemical_management_reference: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white laser-emerald transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save Disease'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

