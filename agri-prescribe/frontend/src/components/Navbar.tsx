import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sprout, 
  LayoutDashboard, 
  Scan, 
  MapPin, 
  FileText, 
  Radio, 
  History, 
  BarChart3, 
  Activity, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.getHealth();
        setHealthStatus('ONLINE');
      } catch {
        setHealthStatus('OFFLINE');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemoData = async () => {
    setIsResetting(true);
    try {
      await api.seedDemoData();
      window.location.reload();
    } catch (err) {
      alert('Failed to reset demo data: ' + err);
    } finally {
      setIsResetting(false);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/detect', label: 'AI Disease Scan', icon: Scan, badge: 'AI' },
    { path: '/map', label: 'Prescription Map', icon: MapPin },
    { path: '/prescriptions', label: 'Prescriptions', icon: FileText },
    { path: '/sprayer', label: 'ESP32 Sprayers', icon: Radio },
    { path: '/history', label: 'Spray History', icon: History },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/system', label: 'System Health', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-agri-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-agri-600/30 group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-agri-400 bg-clip-text text-transparent">
                  AgriPrescribe
                </span>
                <span className="bg-agri-500/20 text-agri-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-agri-500/30">
                  SIH 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Precision Spraying & Diagnosis
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-agri-600/20 text-agri-400 border border-agri-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-agri-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.2 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* System Health Status Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${healthStatus === 'ONLINE' ? 'bg-agri-400 animate-pulse' : 'bg-red-500'}`} />
              <span className={healthStatus === 'ONLINE' ? 'text-slate-300' : 'text-red-400 font-medium'}>
                API {healthStatus}
              </span>
            </div>

            {/* Reset Demo Data Button */}
            <button
              onClick={handleResetDemoData}
              disabled={isResetting}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Reset initial prototype demo data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>

            {/* Mobile Scan Button */}
            <Link
              to="/detect"
              className="lg:hidden flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-agri-600 hover:bg-agri-500 text-slate-950 font-bold text-xs shadow-md shadow-agri-600/30"
            >
              <Scan className="w-4 h-4" />
              <span>Scan</span>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-slate-800/60 overflow-x-auto space-x-2 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md whitespace-nowrap ${
                  isActive ? 'bg-agri-600/20 text-agri-400 font-semibold' : 'text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
