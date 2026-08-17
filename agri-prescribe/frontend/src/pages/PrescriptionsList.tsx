import React, { useEffect, useState } from 'react';
import { FileText, Zap, AlertTriangle, ShieldCheck, Droplet, Clock, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { Prescription, Device } from '../types';
import { SprayerSimModal } from '../components/SprayerSimModal';

export const PrescriptionsList: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prescRes, devRes] = await Promise.all([
          api.getPrescriptions(),
          api.getSprayers()
        ]);
        setPrescriptions(prescRes);
        setDevices(devRes);
      } catch (err) {
        console.error('Prescriptions fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOpenSprayModal = (presc: Prescription) => {
    setSelectedPrescription(presc);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Loading Generated Prescriptions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
          <FileText className="w-6 h-6 text-agri-400" />
          <span>Precision Agronomy Prescriptions</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm">
          Targeted chemical & organic formulations calculated from AI pathogen severity and target surface area.
        </p>
      </div>

      {/* Prescription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prescriptions.map((presc) => (
          <div
            key={presc.id}
            className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-agri-400 uppercase tracking-wide">
                    {presc.chemical_category}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{presc.pesticide_name}</h3>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  presc.spray_urgency === 'Immediate' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  presc.spray_urgency === 'Moderate' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {presc.spray_urgency} Urgency
                </span>
              </div>

              {/* Formulation Metrics */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Concentration Dosage:</span>
                  <div className="font-bold text-agri-300 text-sm mt-0.5">
                    {presc.dosage_ml_per_liter} mL / Liter
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Target Spray Volume:</span>
                  <div className="font-bold text-emerald-400 text-sm mt-0.5">
                    {presc.recommended_volume_ml} mL
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Target Surface Area:</span>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {presc.target_area_m2} m² Spot
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Created:</span>
                  <div className="font-semibold text-slate-400 mt-0.5">
                    {new Date(presc.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Active Ingredients */}
              {presc.active_ingredients && (
                <div className="text-xs text-slate-300">
                  <strong className="text-slate-400">Active Ingredients:</strong> {presc.active_ingredients}
                </div>
              )}

              {/* Safety Instructions */}
              {presc.safety_notes && (
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{presc.safety_notes}</span>
                </div>
              )}

            </div>

            {/* Action Button */}
            <button
              onClick={() => handleOpenSprayModal(presc)}
              className="w-full mt-4 py-3 bg-gradient-to-r from-agri-600 to-emerald-500 hover:from-agri-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-agri-600/20 flex items-center justify-center space-x-2 transition text-sm"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Trigger Precision Spray on ESP32</span>
            </button>

          </div>
        ))}
      </div>

      {/* Sprayer Simulation Modal */}
      {selectedPrescription && (
        <SprayerSimModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          prescriptionId={selectedPrescription.id}
          pesticideName={selectedPrescription.pesticide_name}
          recommendedVolumeMl={selectedPrescription.recommended_volume_ml}
          devices={devices}
        />
      )}

    </div>
  );
};
