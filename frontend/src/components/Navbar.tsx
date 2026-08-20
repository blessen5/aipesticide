import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sprout, LayoutDashboard, Scan, MapPin, Radio, History, BarChart3, ShieldAlert, FlaskConical, ChevronDown, Menu, X, LogOut, Check, Play, Sliders, Database, BrainCircuit } from 'lucide-react';
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
    let mounted = true;
    const check = async () => {
      const start = performance.now();
      try {
        await api.getHealth();
        if (mounted) {
          setHealthStatus('ONLINE');
          setLatencyMs(Math.round(performance.now() - start));
        }
      } catch {
        if (mounted) {
          setHealthStatus('OFFLINE');
          setLatencyMs(null);
        }
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
      if (operationsMenuRef.current && !operationsMenuRef.current.contains(event.target as Node)) setOperationsDropdownOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setOperationsDropdownOpen(false);
  }, [location.pathname]);

  const primary = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/intelligence', label: 'Intelligence', icon: BrainCircuit },
    { path: '/scan', label: 'Plant Scan', icon: Scan },
    { path: '/map', label: 'Farm Map', icon: MapPin },
  ];

  const operationItems = [
    { path: '/sprayer', label: 'Sprayer Control & Missions', desc: 'Live boom pressure, nozzle valves & ESP32', icon: Radio },
    { path: '/storage', label: 'Chemical Storage & Stock', desc: 'Inventory & lot registry', icon: FlaskConical },
    { path: '/history', label: 'Spray Mission History', desc: 'Historical treatments', icon: History },
    { path: '/analytics', label: 'Analytics & ROI', desc: 'Chemical reduction & cost savings', icon: BarChart3 },
    { path: '/audit', label: 'Compliance & Audit Logs', desc: 'Tamper-evident records', icon: ShieldAlert },
    { path: '/admin/knowledge', label: 'Knowledge Base Admin', desc: 'Disease engine & rules', icon: Database },
  ];

  const isOperationActive = operationItems.some(item => location.pathname === item.path);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-emerald-500/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center space-x-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <Sprout className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-extrabold text-white text-base tracking-tight">AgriPrescribe</span>
              <span className="hidden sm:inline text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700">Pro</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-1">
            {primary.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${active ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}

            <div className="relative" ref={operationsMenuRef}>
              <button onClick={() => setOperationsDropdownOpen(!operationsDropdownOpen)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${isOperationActive ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
                <Sliders className="w-3.5 h-3.5" />
                Operations
                <ChevronDown className={`w-3 h-3 transition-transform ${operationsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {operationsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-2 z-50">
                  {operationItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800/80 transition">
                        <Icon className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-zinc-100">{item.label}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link to="/demo" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-950/30">
              <Play className="w-3.5 h-3.5 fill-current" />
              Demo
            </Link>
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${healthStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{healthStatus === 'ONLINE' ? `ESP32 • ${latencyMs ?? 0}ms` : 'OFFLINE'}</span>
            </div>

            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800 transition">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">{currentRole?.[0] || 'U'}</div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl p-1 z-50">
                  <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400">Role: <span className="text-zinc-200 font-semibold">{currentRole}</span></div>
                  {['FARMER', 'AGRONOMIST', 'ADMIN'].map(role => (
                    <button key={role} onClick={() => { onRoleChange?.(role); setUserMenuOpen(false); }} className="w-full px-2 py-2 text-left text-xs rounded-lg hover:bg-zinc-800 flex justify-between text-zinc-300">
                      {role}{currentRole === role && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                  <button onClick={() => { setUserMenuOpen(false); onLogout?.(); }} className="w-full mt-1 px-2 py-2 text-left text-xs rounded-lg hover:bg-rose-950/40 text-rose-300 flex gap-2 border-t border-zinc-800">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-zinc-900 lg:hidden text-zinc-300">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-zinc-800 space-y-1">
            {[...primary, ...operationItems].map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
