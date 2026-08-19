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
  ShieldAlert, 
  FlaskConical, 
  ChevronDown, 
  Menu, 
  X, 
  LogOut, 
  Check,
  Building2,
  Play,
  Sliders,
  Database,
  Layers
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [operationsDropdownOpen, setOperationsDropdownOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const operationsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const start = performance.now();
      try {
        await api.getHealth();
        if (isMounted) {
          setHealthStatus('ONLINE');
          setLatencyMs(Math.round(performance.now() - start));
        }
      } catch {
        if (isMounted) {
          setHealthStatus('OFFLINE');
          setLatencyMs(null);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (operationsMenuRef.current && !operationsMenuRef.current.contains(event.target as Node)) {
        setOperationsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setOperationsDropdownOpen(false);
  }, [location.pathname]);

  // Primary Direct Links
  const primaryLinks = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/scan', label: 'Plant Scan', icon: Scan },
    { path: '/map', label: 'Prescription Map', icon: MapPin },
  ];

  // Secondary Operations & Records
  const operationItems = [
    {
      path: '/sprayer',
      label: 'Sprayer Control & Missions',
      desc: 'Live boom pressure, nozzle valves & ESP32',
      icon: Radio
    },
    {
      path: '/storage',
      label: 'Chemical Storage & Stock',
      desc: 'EPA chemical inventory & lot registry',
      icon: FlaskConical
    },
    {
      path: '/history',
      label: 'Spray Mission History',
      desc: 'Historical treatments & applied volumes',
      icon: History
    },
    {
      path: '/analytics',
      label: 'Analytics & ROI',
      desc: 'Chemical reduction & cost savings',
      icon: BarChart3
    },
    {
      path: '/audit',
      label: 'Compliance & Audit Logs',
      desc: 'Regulatory tamper-evident records',
      icon: ShieldAlert
    },
    {
      path: '/admin/knowledge',
      label: 'Knowledge Base Admin',
      desc: 'Formulation rules & disease engine',
      icon: Database
    }
  ];

  const isOperationActive = operationItems.some(item => location.pathname === item.path);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white laser-emerald">
                <Sprout className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-bold text-white text-base tracking-tight font-sans">AgriPrescribe</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Pro
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {primaryLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* ──────── Operations Dropdown Button ──────── */}
            <div className="relative" ref={operationsMenuRef}>
              <button
                onClick={() => setOperationsDropdownOpen(!operationsDropdownOpen)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  isOperationActive
                    ? 'bg-zinc-800 text-emerald-400 border-zinc-700 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Operations</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${operationsDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
              </button>

              {/* Operations Dropdown Panel */}
              {operationsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1">
                    Field Operations & Agronomy
                  </div>
                  <div className="space-y-1">
                    {operationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setOperationsDropdownOpen(false)}
                          className={`flex items-start space-x-3 p-2 rounded-lg transition ${
                            isActive
                              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                              : 'hover:bg-zinc-800/80 text-zinc-300'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-zinc-100">{item.label}</div>
                            <div className="text-[11px] text-zinc-400 truncate">{item.desc}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right Header Status & Actions */}
          <div className="flex items-center space-x-2.5">
            
            {/* Dedicated Demo Mode Action Button */}
            <Link
              to="/demo"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                location.pathname === '/demo'
                  ? 'bg-emerald-600 text-white border-emerald-500 laser-emerald'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Demo Mode</span>
            </Link>

            {/* Live ESP32 Hardware Status */}
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${healthStatus === 'ONLINE' ? 'bg-emerald-500 laser-emerald' : 'bg-rose-500'}`} />
              <span className="font-mono text-zinc-300">
                {healthStatus === 'ONLINE' ? `ESP32 • ${latencyMs || 12}ms` : 'OFFLINE'}
              </span>
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-zinc-800/80 transition border border-transparent hover:border-zinc-700"
              >
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-semibold text-xs">
                  {currentRole ? currentRole[0] : 'U'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-zinc-800">
                    <div className="text-xs font-semibold text-white">Agronomist User</div>
                    <div className="text-[11px] text-zinc-400 font-mono">Role: {currentRole}</div>
                  </div>

                  <div className="p-1 border-b border-zinc-800">
                    <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase">
                      Switch Role
                    </div>
                    {['FARMER', 'AGRONOMIST', 'ADMIN'].map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          onRoleChange?.(r);
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs rounded hover:bg-zinc-800 flex items-center justify-between text-zinc-300"
                      >
                        <span>{r}</span>
                        {currentRole === r && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full px-2 py-1.5 text-left text-xs rounded hover:bg-rose-950/40 text-rose-300 flex items-center space-x-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-800 space-y-3">
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Navigation</div>
              {primaryLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm ${
                    location.pathname === item.path
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <item.icon className="w-4 h-4 text-zinc-400" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="space-y-1 pt-2 border-t border-zinc-800/60">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Operations & Records</div>
              {operationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm ${
                    location.pathname === item.path
                      ? 'bg-zinc-800 text-emerald-400 font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <item.icon className="w-4 h-4 text-zinc-400" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};


