import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sprout, 
  LayoutDashboard, 
  Scan, 
  MapPin, 
  Radio, 
  History, 
  BarChart3, 
  RotateCcw,
  Sparkles,
  Wifi,
  WifiOff,
  Target,
  ShieldAlert,
  FlaskConical,
  Database
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
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset and re-seed prototype demo field & crop dataset?')) return;
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

  const isDemo = location.pathname === '/demo';

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/scan', label: 'Scan Plant', icon: Scan, badge: 'AI' },
    { path: '/map', label: 'Prescription Map', icon: MapPin },
    { path: '/sprayer', label: 'Sprayer', icon: Radio },
    { path: '/history', label: 'History', icon: History },
    { path: '/audit', label: 'Audit', icon: ShieldAlert },
    { path: '/storage', label: 'Storage', icon: FlaskConical },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/knowledge', label: 'Admin', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            {/* <div> */}
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                  AgriPrescribe
                </span>
                {/* <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> SIH 2026
                </span> */}
              {/* </div> */}
              {/* <p className="text-[11px] text-slate-400 hidden sm:block">
                Precision Plant Disease Detection & Spot Spraying
              </p> */}
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 ml-12">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/scan' && location.pathname === '/detect');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Demo Mode link */}
            <Link
              to="/demo"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                isDemo
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md shadow-amber-500/10'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Demo</span>
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* DEMO MODE badge (visible when on /demo) */}
            {isDemo && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black animate-pulse">
                <Target className="w-3 h-3" /> DEMO MODE
              </span>
            )}

            {/* Live API Status Indicator */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              healthStatus === 'ONLINE'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
            }`}>
              {healthStatus === 'ONLINE' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Wifi className="w-3 h-3" />
                  <span>API ONLINE</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <WifiOff className="w-3 h-3" />
                  <span>API OFFLINE</span>
                </>
              )}
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

            {/* Quick Mobile Scan */}
            <Link
              to="/scan"
              className="md:hidden flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25"
            >
              <Scan className="w-4 h-4" />
              <span>Scan</span>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-between py-2 border-t border-slate-800/60 overflow-x-auto space-x-2 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/scan' && location.pathname === '/detect');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md whitespace-nowrap ${
                  isActive ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30' : 'text-slate-400'
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
