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

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    setRole(null);
  };

  const handleRoleChange = (newRole: string) => {
    localStorage.setItem('userRole', newRole);
    setRole(newRole);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-black pb-16 md:pb-0 font-sans relative overflow-x-hidden">
        {/* HD Engineering Dot-Matrix Background with Vignette Mask */}
        <div className="fixed inset-0 bg-dot-grid opacity-30 pointer-events-none vignette-mask" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/5 blur-[120px] pointer-events-none" />

        <Navbar currentRole={role} onLogout={handleLogout} onRoleChange={handleRoleChange} />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<ScanPlant />} />
            <Route path="/detect" element={<Navigate to="/scan" replace />} />
            <Route path="/map" element={<PrescriptionMap />} />
            <Route path="/sprayer" element={<SprayerControl />} />
            <Route path="/operations" element={<Navigate to="/sprayer" replace />} />
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
