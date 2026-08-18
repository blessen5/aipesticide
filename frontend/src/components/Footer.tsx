import React from 'react';
import { Sprout, ShieldCheck, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-2">
          <Sprout className="w-5 h-5 text-agri-400" />
          <span className="font-semibold text-slate-200">AgriPrescribe Prototype</span>
          <span>• Smart India Hackathon 2026</span>
        </div>

        <div className="flex items-center space-x-6 text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>ESP32 Telemetry Ready</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-agri-400" />
            <span>OpenCV + Pluggable ML Engine</span>
          </div>
        </div>

        <div>
          <p>© 2026 AgriPrescribe Team. Built for Precision Agriculture Demonstration.</p>
        </div>
      </div>
    </footer>
  );
};
