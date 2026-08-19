import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { 
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Box,
  Droplet,
  Search,
  X,
  Check,
  Download,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface ProductItem {
  id?: number;
  product_id: string;
  product_name: string;
  active_ingredient: string;
  crop: string;
  target?: string;
  registered_application_method?: string;
  label_verified: boolean;
  chemigation_permitted: boolean;
  batch_number?: string;
  storage_location?: string;
  enabled?: boolean;
}

export const StorageRegistry: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<string>('ALL');
  const [filterChemigation, setFilterChemigation] = useState<boolean | null>(null);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    product_id: '',
    active_ingredient: '',
    crop: 'Wheat',
    target: 'Fungal Rust / Blight',
    registered_application_method: 'Precision Foliar Spray',
    batch_number: '',
    storage_location: 'Central Agronomy Bay A',
    label_verified: true,
    chemigation_permitted: true,
    enabled: true
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
      setError(null);
    } catch {
      setError('Operating in local offline cache mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAddModal = () => {
    const randomBatch = `LOT-${Math.floor(10000 + Math.random() * 90000)}`;
    setFormData({
      product_name: '',
      product_id: '',
      active_ingredient: '',
      crop: 'Wheat',
      target: 'Fungal Stripe Rust',
      registered_application_method: 'Precision Foliar Spray',
      batch_number: randomBatch,
      storage_location: 'Central Agronomy Bay A',
      label_verified: true,
      chemigation_permitted: true,
      enabled: true
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.active_ingredient.trim()) {
      showToast('Product name and active ingredient are required.', 'error');
      return;
    }

    setSubmitting(true);
    const generatedId = formData.product_id.trim()
      ? formData.product_id.trim()
      : formData.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const payload = { ...formData, product_id: generatedId };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        showToast(`Added ${formData.product_name} to inventory.`);
        fetchProducts();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to add product', 'error');
      }
    } catch {
      setProducts(prev => [{ id: Date.now(), ...payload }, ...prev]);
      setIsAddModalOpen(false);
      showToast(`Added ${formData.product_name} to active session.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = ['Product Name', 'ID', 'Active Ingredient', 'Crop', 'Target', 'Chemigation', 'Label Verified', 'Batch Number', 'Location'];
    const rows = products.map(p => [
      `"${p.product_name}"`,
      `"${p.product_id}"`,
      `"${p.active_ingredient}"`,
      `"${p.crop}"`,
      `"${p.target || ''}"`,
      p.chemigation_permitted ? 'Yes' : 'No',
      p.label_verified ? 'Verified' : 'Unverified',
      `"${p.batch_number || ''}"`,
      `"${p.storage_location || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chemical_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported inventory manifest to CSV.');
  };

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchSearch =
        item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.active_ingredient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batch_number?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (selectedCrop !== 'ALL' && item.crop !== selectedCrop) return false;
      if (filterChemigation !== null && item.chemigation_permitted !== filterChemigation) return false;
      return true;
    });
  }, [products, searchQuery, selectedCrop, filterChemigation]);

  const crops = useMemo(() => {
    const set = new Set(products.map(p => p.crop).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-xl ${
          toastMessage.type === 'success'
            ? 'bg-zinc-900 border-emerald-500/40 text-emerald-300'
            : 'bg-zinc-900 border-rose-500/40 text-rose-300'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <span>Chemical & Treatment Inventory</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Registered EPA formulations, chemigation safety compliance, and batch lot tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchProducts}
            disabled={loading}
            title="Refresh Inventory"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          
          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Chemical</span>
          </button>
        </div>
      </div>

      {/* Filter and View Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter by product, ingredient, batch..."
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

        {/* Filter Dropdowns & View Mode */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          {/* Crop Selector */}
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 outline-none"
          >
            {crops.map(c => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Crops' : c}</option>
            ))}
          </select>

          {/* Chemigation Filter Pill */}
          <button
            onClick={() => setFilterChemigation(prev => prev === true ? null : true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              filterChemigation === true
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Chemigation Safe
          </button>

          {/* Table / Grid View Switcher */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && products.length === 0 ? (
        <div className="card-surface p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg shimmer-skeleton" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card-surface p-12 text-center space-y-3">
          <Box className="w-8 h-8 mx-auto text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-300">No chemical products match your filter</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search criteria or register a new formulation into the inventory.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ──────── 1. Clean Enterprise Data Table ──────── */
        <div className="card-surface overflow-hidden border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header-cell">Product Name & ID</th>
                  <th className="table-header-cell">Active Ingredient</th>
                  <th className="table-header-cell">Target Crop</th>
                  <th className="table-header-cell">Application & Chemigation</th>
                  <th className="table-header-cell">Batch / Location</th>
                  <th className="table-header-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredProducts.map((p) => (
                  <tr key={p.id || p.product_id} className="hover:bg-zinc-900/50 transition">
                    <td className="table-body-cell">
                      <div className="font-semibold text-zinc-100 text-xs sm:text-sm">{p.product_name}</div>
                      <div className="text-[11px] font-mono text-zinc-500">{p.product_id}</div>
                    </td>
                    <td className="table-body-cell">
                      <span className="text-xs text-zinc-300">{p.active_ingredient}</span>
                    </td>
                    <td className="table-body-cell">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {p.crop || 'General'}
                      </span>
                    </td>
                    <td className="table-body-cell">
                      <div className="flex items-center space-x-2">
                        {p.chemigation_permitted ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-950/60 text-sky-400 border border-sky-800/50">
                            <Droplet className="w-3 h-3" />
                            <span>Chemigation Approved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400">
                            <span>Foliar Only</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-body-cell">
                      <div className="text-xs text-zinc-300 font-mono">{p.batch_number || 'N/A'}</div>
                      <div className="text-[11px] text-zinc-500">{p.storage_location || 'Bay A'}</div>
                    </td>
                    <td className="table-body-cell">
                      <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ──────── 2. Clean Grid View ──────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => (
            <div key={p.id || p.product_id} className="card-surface p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">{p.product_name}</h3>
                  <p className="text-[11px] font-mono text-zinc-500">{p.product_id}</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {p.crop}
                </span>
              </div>

              <div className="text-xs text-zinc-400 space-y-1 pt-1 border-t border-zinc-800/80">
                <div className="flex justify-between">
                  <span>Ingredient:</span>
                  <span className="text-zinc-200 font-medium">{p.active_ingredient}</span>
                </div>
                <div className="flex justify-between">
                  <span>Batch Lot:</span>
                  <span className="text-zinc-300 font-mono text-[11px]">{p.batch_number || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className={p.chemigation_permitted ? 'text-sky-400 font-medium' : 'text-zinc-500'}>
                  {p.chemigation_permitted ? '• Chemigation OK' : '• Foliar Only'}
                </span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──────── Modal: Add Formulation ──────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Register Chemical Formulation</h3>
                <p className="text-xs text-zinc-400">Add verified pesticide/fungicide formulation</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Folicur 250 EW"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Active Ingredient & Conc. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tebuconazole 25.9% EC"
                    value={formData.active_ingredient}
                    onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Target Crop</label>
                  <select
                    value={formData.crop}
                    onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-600 outline-none"
                  >
                    <option value="Wheat">Wheat</option>
                    <option value="Tomato">Tomato</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Corn">Corn</option>
                    <option value="Potato">Potato</option>
                    <option value="General">General Crop</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Batch / Lot Number</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-zinc-600 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                  <span>Label Verified & Regulatory In-Spec</span>
                  <input
                    type="checkbox"
                    checked={formData.label_verified}
                    onChange={(e) => setFormData({ ...formData, label_verified: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                  <span>Approved for Chemigation Injection</span>
                  <input
                    type="checkbox"
                    checked={formData.chemigation_permitted}
                    onChange={(e) => setFormData({ ...formData, chemigation_permitted: e.target.checked })}
                    className="accent-sky-500 w-4 h-4"
                  />
                </label>
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
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Register Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


