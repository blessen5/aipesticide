import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  FlaskConical,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Box,
  Droplet
} from 'lucide-react';

export const StorageRegistry: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch products from network, check console.');
      setError('System is operating offline. Using cached products if available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async () => {
    const name = window.prompt("Enter Product Name (e.g. Folicur 250 EW):");
    if (!name) return;
    const ingredient = window.prompt("Enter Active Ingredient (e.g. Tebuconazole 25.9% EC):");
    if (!ingredient) return;

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_id: name.toLowerCase().replace(/\s+/g, '-'),
          product_name: name,
          active_ingredient: ingredient,
          crop: "Wheat",
          target: "Stripe Rust",
          registered_application_method: "Foliar Spray",
          label_verified: true,
          chemigation_permitted: true,
          enabled: true
        })
      });
      if (res.ok) {
        fetchProducts();
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to add product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    }
  };



  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <FlaskConical className="w-6 h-6 text-sky-400" />
            <span>Chemical & Treatment Registry</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage approved treatment products and verify chemigation compatibility.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={handleAddProduct}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-950/80 border border-amber-500/40 rounded-xl flex items-center space-x-3 text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-sky-500" />
            <p className="text-sm font-semibold">Loading Chemical Registry...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Box className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-semibold text-lg text-slate-400">No Products Registered</p>
            <p className="text-sm mt-1">Add a treatment product to begin managing inventory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="p-5 rounded-2xl border border-slate-700 bg-slate-800/50 space-y-4 hover:bg-slate-800 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">{product.product_name}</h3>
                    <p className="text-xs font-mono text-slate-400">{product.product_id}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    product.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {product.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Ingredient</span>
                    <span className="text-slate-200 font-semibold">{product.active_ingredient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Crop</span>
                    <span className="text-slate-200">{product.crop}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batch No.</span>
                    <span className="text-slate-200 font-mono text-xs">{product.batch_number}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    {product.label_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className={product.label_verified ? 'text-emerald-300' : 'text-amber-300'}>
                      Label {product.label_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs">
                    {product.chemigation_permitted ? (
                      <Droplet className="w-4 h-4 text-sky-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    )}
                    <span className={product.chemigation_permitted ? 'text-sky-300 font-bold' : 'text-rose-300 font-bold'}>
                      {product.chemigation_permitted ? 'Chemigation Approved' : 'NO CHEMIGATION'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
