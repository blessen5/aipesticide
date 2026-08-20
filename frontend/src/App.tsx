import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { FarmerQuickActions } from './components/FarmerQuickActions';
import { Dashboard } from './pages/Dashboard';
import { IntelligenceCenter } from './pages/IntelligenceCenter';
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
import { AutoTranslate, LanguageProvider } from './i18n';

export const App: React.FC = () => {
  const [role, setRole] = React.useState<string | null>(localStorage.getItem('userRole'));
  if (!role) return <LanguageProvider><Login onLogin={setRole} /></LanguageProvider>;
  const handleLogout = () => { localStorage.removeItem('userRole'); setRole(null); };
  const handleRoleChange = (newRole: string) => { localStorage.setItem('userRole', newRole); setRole(newRole); };
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AutoTranslate />
        <div className="app-shell min-h-screen flex flex-col text-zinc-100 selection:bg-emerald-500 selection:text-black relative overflow-x-hidden">
          <div className="fixed inset-0 bg-dot-grid opacity-20 pointer-events-none" />
          <div className="app-bg-glow app-bg-glow-one" /><div className="app-bg-glow app-bg-glow-two" /><div className="app-bg-glow app-bg-glow-three" />
          <Navbar currentRole={role} onLogout={handleLogout} onRoleChange={handleRoleChange} />
          <main className="page-enter flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
            <FarmerQuickActions />
            <Routes>
              <Route path="/" element={<Dashboard />} /><Route path="/intelligence" element={<IntelligenceCenter />} /><Route path="/scan" element={<ScanPlant />} /><Route path="/detect" element={<Navigate to="/scan" replace />} /><Route path="/map" element={<PrescriptionMap />} /><Route path="/sprayer" element={<SprayerControl />} /><Route path="/operations" element={<Navigate to="/sprayer" replace />} /><Route path="/history" element={<SprayHistory />} /><Route path="/audit" element={<AuditHistory />} /><Route path="/storage" element={<StorageRegistry />} /><Route path="/analytics" element={<Analytics />} /><Route path="/demo" element={<Demo />} /><Route path="/admin/knowledge" element={<KnowledgeBaseAdmin />} /><Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
};
export default App;
