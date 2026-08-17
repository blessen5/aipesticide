import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { Dashboard } from './pages/Dashboard';
import { DiseaseDetection } from './pages/DiseaseDetection';
import { PrescriptionMap } from './pages/PrescriptionMap';
import { PrescriptionsList } from './pages/PrescriptionsList';
import { SprayerControl } from './pages/SprayerControl';
import { SprayHistory } from './pages/SprayHistory';
import { Analytics } from './pages/Analytics';
import { SystemHealth } from './pages/SystemHealth';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/detect" element={<DiseaseDetection />} />
            <Route path="/map" element={<PrescriptionMap />} />
            <Route path="/prescriptions" element={<PrescriptionsList />} />
            <Route path="/sprayer" element={<SprayerControl />} />
            <Route path="/history" element={<SprayHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/system" element={<SystemHealth />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
