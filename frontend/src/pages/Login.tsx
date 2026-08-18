import React, { useState } from 'react';
import { Sprout } from 'lucide-react';

export const Login: React.FC<{ onLogin: (role: string) => void }> = ({ onLogin }) => {
  const [role, setRole] = useState('FARMER');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('userRole', role);
    onLogin(role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl max-w-sm w-full space-y-6 shadow-xl">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center">
            <Sprout className="w-8 h-8 text-slate-950" />
          </div>
          <h2 className="text-2xl font-bold">AgriPrescribe</h2>
          <p className="text-sm text-slate-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Select Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="FARMER">Farmer (Standard)</option>
              <option value="ADMIN">Admin (Knowledge Base)</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg transition-colors"
          >
            Enter System
          </button>
        </form>
      </div>
    </div>
  );
};
