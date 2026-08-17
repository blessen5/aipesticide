import React, { useEffect, useState } from 'react';
import { Radio, Zap, Battery, Droplet, Wifi, Sliders, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Device } from '../types';

export const SprayerControl: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNozzle, setActiveNozzle] = useState<number | null>(null);
  const [nozzleTesting, setNozzleTesting] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await api.getSprayers();
      setDevices(data);
    } catch (err) {
      console.error('Error fetching sprayers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNozzle = (nozzleNum: number) => {
    setActiveNozzle(nozzleNum);
    setNozzleTesting(true);
    setTimeout(() => {
      setNozzleTesting(false);
      setActiveNozzle(null);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading ESP32 Sprayers Telemetry...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
            <Radio className="w-6 h-6 text-sky-400 animate-pulse" />
            <span>ESP32 Smart Sprayers & Telemetry Hub</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Monitor real-time Wi-Fi telemetry, fluid levels, battery health, and test nozzle outputs.
          </p>
        </div>

        <button
          onClick={fetchDevices}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
        >
          <RefreshCw className="w-4 h-4 text-agri-400" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Connected Sprayers Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <div key={device.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            
            {/* Title & Status */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">{device.name}</h3>
                <p className="text-xs font-mono text-slate-400">{device.device_code}</p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                device.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                device.status === 'SPRAYING' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse' :
                'bg-slate-700 text-slate-400'
              }`}>
                {device.status}
              </span>
            </div>

            {/* Gauges */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              
              {/* Fluid Tank */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Droplet className="w-4 h-4 text-agri-400" />
                    <span>Chemical Tank Fluid</span>
                  </span>
                  <span className="font-bold text-agri-400">{device.fluid_level_pct}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-agri-600 to-emerald-400 h-full rounded-full" style={{ width: `${device.fluid_level_pct}%` }} />
                </div>
              </div>

              {/* Battery Level */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Battery className="w-4 h-4 text-emerald-400" />
                    <span>Li-Po Battery Level</span>
                  </span>
                  <span className="font-bold text-slate-200">{device.battery_level}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${device.battery_level}%` }} />
                </div>
              </div>

              {/* WiFi Network IP */}
              <div className="flex justify-between text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                <span className="flex items-center space-x-1">
                  <Wifi className="w-3.5 h-3.5 text-sky-400" />
                  <span>ESP32 Wi-Fi IP:</span>
                </span>
                <span className="font-mono text-slate-200">{device.ip_address}</span>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Manual Nozzle Calibration Test Suite */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-agri-400" />
          <span>Manual Nozzle Discharge Test (4-Channel PWM)</span>
        </h3>
        <p className="text-xs text-slate-400">
          Pulse individual sprayer solenoids to verify mechanical flow rate and nozzle pressure calibration.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4].map((nozzle) => (
            <button
              key={nozzle}
              onClick={() => handleTestNozzle(nozzle)}
              disabled={nozzleTesting && activeNozzle === nozzle}
              className={`p-4 rounded-xl border font-bold text-xs flex flex-col items-center justify-center space-y-2 transition ${
                activeNozzle === nozzle
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 hover:border-agri-500/50 text-slate-200'
              }`}
            >
              <Zap className={`w-5 h-5 ${activeNozzle === nozzle ? 'text-sky-400 fill-current' : 'text-slate-400'}`} />
              <span>Nozzle {nozzle} Discharge Test</span>
              <span className="text-[10px] font-mono text-slate-500">
                {activeNozzle === nozzle ? 'PULSING SOLENOID...' : 'STATUS: READY'}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
