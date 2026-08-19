import React from 'react';
import { Sprout, ShieldCheck, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-zinc-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <Sprout className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-zinc-300">AgriPrescribe Operations</span>
          <span>• Precision Agriculture Platform</span>
        </div>

        <div className="flex items-center space-x-6 text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>ESP32 Hardware Node</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>EPA Label Compliant</span>
          </div>
        </div>

        <div>
          <p>© 2026 AgriPrescribe Precision Agronomy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

