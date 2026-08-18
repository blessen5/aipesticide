import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { Dashboard } from './pages/Dashboard';
import { ScanPlant } from './pages/ScanPlant';
import { PrescriptionMap } from './pages/PrescriptionMap';
import { SprayerControl } from './pages/SprayerControl';
import { SprayHistory } from './pages/SprayHistory';
import { AuditHistory } from './pages/AuditHistory';
import { StorageRegistry } from './pages/StorageRegistry';
import { Analytics } from './pages/Analytics';
import { Demo } from './pages/Demo';
import { KnowledgeBaseAdmin } from './pages/KnowledgeBaseAdmin';
import { Login } from './pages/Login';

export const App: React.FC = () => {
  const [role, setRole] = React.useState<string | null>(localStorage.getItem('userRole'));

  if (!role) {
    return <Login onLogin={setRole} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
        <Navbar />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<ScanPlant />} />
            <Route path="/detect" element={<Navigate to="/scan" replace />} />
            <Route path="/map" element={<PrescriptionMap />} />
            <Route path="/sprayer" element={<SprayerControl />} />
            <Route path="/history" element={<SprayHistory />} />
            <Route path="/audit" element={<AuditHistory />} />
            <Route path="/storage" element={<StorageRegistry />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/admin/knowledge" element={<KnowledgeBaseAdmin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
