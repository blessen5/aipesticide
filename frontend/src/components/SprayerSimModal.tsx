import React, { useState } from 'react';
import { Radio, CheckCircle, AlertTriangle, X, Zap } from 'lucide-react';
import { api } from '../services/api';

interface SprayerSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionId: number;
  pesticideName: string;
  recommendedVolumeMl: number;
  devices?: any[];
}

export const SprayerSimModal: React.FC<SprayerSimModalProps> = ({
  isOpen,
  onClose,
  prescriptionId,
  pesticideName,
  recommendedVolumeMl
}) => {
  const [mode, setMode] = useState<'SIMULATED' | 'HARDWARE'>('SIMULATED');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'EXECUTING' | 'COMPLETED' | 'ERROR'>('IDLE');
  const [resultMsg, setResultMsg] = useState('');

  if (!isOpen) return null;

  const handleStartSpray = async () => {
    setStatus('EXECUTING');
    setProgress(0);
    setResultMsg('');

    // Simulate smooth progress animation for live demonstration
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 250);

    try {
      const res = await api.triggerSpray(prescriptionId, recommendedVolumeMl, mode);
      clearInterval(interval);
      setProgress(100);
      setStatus('COMPLETED');
      setResultMsg(`Precision spray command [${res.command_id}] executed successfully! Dispensed ${res.volume_ml} mL.`);
    } catch (err: any) {
      clearInterval(interval);
      setStatus('ERROR');
      setResultMsg(err.message || 'Failed to execute spray command.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Precision Sprayer Command</h3>
              <p className="text-xs text-slate-400">Trigger Target Nozzle Spray Session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {status === 'IDLE' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-400">Target Pathogen:</span>
                <span className="font-semibold text-emerald-300">{pesticideName}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="text-slate-400">Target Volume:</span>
                <span className="font-bold text-white">{recommendedVolumeMl} mL</span>
              </div>
            </div>

            {/* Mode Switch: Simulated vs ESP32 Hardware */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Execution Mode:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('SIMULATED')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                    mode === 'SIMULATED'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-xs text-white">Simulated Mode</span>
                  <span className="text-[10px] text-slate-400 mt-1">Live Demo Simulator (Safety Mode)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('HARDWARE')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                    mode === 'HARDWARE'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-xs text-white">ESP32 REST Board</span>
                  <span className="text-[10px] text-slate-400 mt-1">Real Microcontroller Hardware</span>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartSpray}
              className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Execute Precision Spray Now</span>
            </button>
          </div>
        )}

        {/* Executing Status Animation */}
        {status === 'EXECUTING' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 border-t-transparent animate-spin mx-auto flex items-center justify-center">
              <Radio className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-white">Precision Spraying Active...</h4>
              <p className="text-xs text-slate-400 mt-1">
                Discharging {recommendedVolumeMl} mL target solution through Actuator Solenoid
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-green-400 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-mono text-emerald-400">{progress}% Completed</p>
          </div>
        )}

        {/* Completed View */}
        {status === 'COMPLETED' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-xl text-white">Spray Mission Completed!</h4>
              <p className="text-xs text-slate-300 mt-2 max-w-sm mx-auto">{resultMsg}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <p>✔ Chemical Volume Discharged: <strong className="text-emerald-400">{recommendedVolumeMl} mL</strong></p>
              <p>✔ Plant Infection Area Treated & Status Updated</p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition text-sm"
            >
              Close
            </button>
          </div>
        )}

        {/* Error View */}
        {status === 'ERROR' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-xl text-white">Spray Execution Failed</h4>
              <p className="text-xs text-rose-300 mt-1">{resultMsg}</p>
            </div>
            <button
              onClick={() => setStatus('IDLE')}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
