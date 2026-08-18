import React, { useState, useEffect, useRef } from 'react';
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
  Database,
  ChevronDown,
  Menu,
  X,
  User,
  LogOut,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Bot
} from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  currentRole?: string | null;
  onLogout?: () => void;
  onRoleChange?: (role: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole = 'FARMER', onLogout, onRoleChange }) => {
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [latencyMs, setLatencyMs] = useState<number | null>(14);
  const [isResetting, setIsResetting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        await api.getHealth();
        setLatencyMs(Math.max(8, Date.now() - start));
        setHealthStatus('ONLINE');
      } catch {
        setHealthStatus('OFFLINE');
        setLatencyMs(null);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

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

  const primaryNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/scan', label: 'AI Scan', icon: Scan, badge: 'AI', isScan: true },
    { path: '/map', label: 'Prescription Map', icon: MapPin },
    { path: '/sprayer', label: 'Sprayer Telemetry', icon: Radio },
  ];

  const secondaryNavItems = [
    { 
      path: '/analytics', 
      label: 'Analytics & Savings', 
      desc: 'Pesticide reduction, cost ROI & field health',
      icon: BarChart3,
      badge: '65% Saved'
    },
    { 
      path: '/history', 
      label: 'Spray Execution History', 
      desc: 'Audit trail of past field spot-spraying missions',
      icon: History 
    },
    { 
      path: '/audit', 
      label: 'Compliance Audit Logs', 
      desc: 'Tamper-evident operations & safety logs',
      icon: ShieldAlert 
    },
    { 
      path: '/storage', 
      label: 'Chemical Storage & Stock', 
      desc: 'Pesticide inventory & label verification',
      icon: FlaskConical 
    },
    { 
      path: '/admin/knowledge', 
      label: 'Agronomy Knowledge Base', 
      desc: 'Disease catalog, management rules & formulations',
      icon: Database,
      adminOnly: true
    },
  ];

  const isSecondaryActive = secondaryNavItems.some(
    (item) => location.pathname === item.path
  );

  return (
    <>
      {/* Top Gradient Line Indicator */}
      <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 fixed top-0 left-0 right-0 z-50" />

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* ──────── 1. Brand Logo ──────── */}
            <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 group-hover:scale-105 transition-all duration-300">
                  <Sprout className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                    AgriPrescribe
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> SIH 2026
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium hidden md:block">
                  Precision Spraying Platform
                </span>
              </div>
            </Link>

            {/* ──────── 2. Desktop Navigation Center ──────── */}
            <nav className="hidden lg:flex items-center space-x-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path === '/scan' && location.pathname === '/detect');
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="bg-emerald-500/90 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full tracking-wide">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                    )}
                  </Link>
                );
              })}

              {/* Operations & Records Dropdown */}
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isSecondaryActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Sliders className={`w-4 h-4 ${isSecondaryActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Operations</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`} />
                </button>

                {/* Dropdown Menu */}
                {moreDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                      Operations & Agronomy Records
                    </div>
                    <div className="space-y-1">
                      {secondaryNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                            }`}
                          >
                            <div className={`p-2 rounded-lg mt-0.5 ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-100">{item.label}</span>
                                {item.badge && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                    {item.badge}
                                  </span>
                                )}
                                {item.adminOnly && (
                                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Demo Mode Link */}
              <Link
                to="/demo"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isDemo
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                }`}
              >
                <Target className={`w-4 h-4 ${isDemo ? 'text-amber-300 animate-pulse' : 'text-amber-400'}`} />
                <span>Demo Hub</span>
                <span className="bg-amber-500/30 text-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-amber-500/40">
                  SIH
                </span>
              </Link>
            </nav>

            {/* ──────── 3. Right Action Area ──────── */}
            <div className="flex items-center space-x-2.5">
              
              {/* Telemetry Status Pill */}
              <div 
                className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all ${
                  healthStatus === 'ONLINE'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                }`}
                title={healthStatus === 'ONLINE' ? `Backend API is healthy (${latencyMs}ms)` : 'Backend API is disconnected'}
              >
                <span className="relative flex h-2 w-2">
                  {healthStatus === 'ONLINE' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  )}
                </span>
                <span className="font-semibold">{healthStatus === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}</span>
                {latencyMs !== null && (
                  <span className="text-[10px] text-emerald-500/80 font-mono hidden md:inline">
                    {latencyMs}ms
                  </span>
                )}
              </div>

              {/* Reset Demo Data Button */}
              <button
                onClick={handleResetDemoData}
                disabled={isResetting}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/80 transition shadow-sm"
                title="Reset prototype demo field & crop dataset"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                <span>Reset Demo</span>
              </button>

              {/* Primary Quick CTA (Scan Plant) */}
              <Link
                to="/scan"
                className="hidden md:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all"
              >
                <Scan className="w-4 h-4" />
                <span>Scan Leaf</span>
              </Link>

              {/* User Profile / Role Switcher Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition"
                  title="User Profile & Role"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {currentRole === 'ADMIN' ? 'A' : 'F'}
                  </div>
                  <span className="hidden md:inline font-semibold">
                    {currentRole === 'ADMIN' ? 'Admin' : 'Farmer'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Menu Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-bold text-slate-200">Active Profile</p>
                      <p className="text-[11px] text-emerald-400 font-mono">
                        {currentRole === 'ADMIN' ? '🛡️ Agronomy Admin' : '👨‍🌾 Field Operator'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Switch Role
                      </div>
                      <button
                        onClick={() => {
                          onRoleChange?.('FARMER');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          currentRole === 'FARMER'
                            ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5" /> Farmer Mode
                        </span>
                        {currentRole === 'FARMER' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        onClick={() => {
                          onRoleChange?.('ADMIN');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          currentRole === 'ADMIN'
                            ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Database className="w-3.5 h-3.5" /> Admin Mode
                        </span>
                        {currentRole === 'ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      {onLogout && (
                        <div className="pt-1 mt-1 border-t border-slate-800">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onLogout();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/30 transition"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                aria-label="Toggle Mobile Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ──────── 4. Mobile Drawer Panel ──────── */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800 overflow-y-auto px-4 py-6 space-y-6 animate-in slide-in-from-top-4 duration-200">
            
            {/* Quick Status banner on mobile */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-100">AgriPrescribe Network</p>
                  <p className="text-[11px] text-emerald-400">
                    {healthStatus === 'ONLINE' ? `API Online (${latencyMs}ms)` : 'API Offline'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleResetDemoData}
                disabled={isResetting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset</span>
              </button>
            </div>

            {/* Core Workflows */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Core Operations
              </p>
              <div className="grid grid-cols-2 gap-2">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex flex-col p-3 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950'
                          : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        {item.badge && (
                          <span className="bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-xs">{item.label}</span>
                    </Link>
                  );
                })}

                {/* Demo item in grid */}
                <Link
                  to="/demo"
                  className={`flex flex-col p-3 rounded-2xl border transition-all col-span-2 ${
                    isDemo
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-xs">SIH 2026 Demo Hub</span>
                    </div>
                    <span className="bg-amber-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                      FEATURED
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    Live prototype presentation workflow & simulated field test.
                  </p>
                </Link>
              </div>
            </div>

            {/* Secondary Operations */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Analytics & Management
              </p>
              <div className="space-y-1.5">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{item.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                        </div>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Role Switcher & Logout */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Active Role</span>
                <span className="text-xs font-semibold text-emerald-400">{currentRole}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onRoleChange?.('FARMER')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    currentRole === 'FARMER'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Farmer
                </button>
                <button
                  onClick={() => onRoleChange?.('ADMIN')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    currentRole === 'ADMIN'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Admin
                </button>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold hover:bg-rose-900/40 transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ──────── 5. Mobile Fixed Bottom Touch Bar ──────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <Link
          to="/"
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            location.pathname === '/' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/map"
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            location.pathname === '/map' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span>Field Map</span>
        </Link>

        {/* Elevated Center Scan Button */}
        <Link
          to="/scan"
          className="relative -top-3 flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/40 border-2 border-slate-950 active:scale-95 transition-transform"
          aria-label="Scan Plant"
        >
          <Scan className="w-6 h-6 stroke-[2.5]" />
        </Link>

        <Link
          to="/sprayer"
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            location.pathname === '/sprayer' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5 mb-0.5" />
          <span>Sprayer</span>
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            mobileMenuOpen ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </div>
    </>
  );
};
