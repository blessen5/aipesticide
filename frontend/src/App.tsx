import React from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {Navbar} from './components/Navbar';
import {Footer} from './components/Footer';
import {Dashboard} from './pages/Dashboard';
import {IntelligenceCenter} from './pages/IntelligenceCenter';
import {ScanPlant} from './pages/ScanPlant';
import {PrescriptionMap} from './pages/PrescriptionMap';
import {SprayerControl} from './pages/SprayerControl';
import {SprayHistory} from './pages/SprayHistory';
import {AuditHistory} from './pages/AuditHistory';
import {StorageRegistry} from './pages/StorageRegistry';
import {Analytics} from './pages/Analytics';
import {Demo} from './pages/Demo';
import {KnowledgeBaseAdmin} from './pages/KnowledgeBaseAdmin';
import {Login} from './pages/Login';

export const App:React.FC=()=>{
 const [role,setRole]=React.useState<string|null>(localStorage.getItem('userRole'));
 if(!role)return <Login onLogin={setRole}/>;
 const logout=()=>{localStorage.removeItem('userRole');setRole(null)};
 const roleChange=(r:string)=>{localStorage.setItem('userRole',r);setRole(r)};
 return <BrowserRouter><div className="min-h-screen flex flex-col app-shell text-zinc-100 selection:bg-orange-500 selection:text-black pb-16 md:pb-0 font-sans relative overflow-x-hidden"><div className="fixed inset-0 bg-dot-grid opacity-20 pointer-events-none"/><div className="app-bg-glow app-bg-glow-one"/><div className="app-bg-glow app-bg-glow-two"/><div className="app-bg-glow app-bg-glow-three"/><Navbar currentRole={role} onLogout={logout} onRoleChange={roleChange}/><main className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-7 relative z-10 page-enter"><Routes>
 <Route path="/" element={<Dashboard/>}/><Route path="/intelligence" element={<IntelligenceCenter/>}/><Route path="/scan" element={<ScanPlant/>}/><Route path="/detect" element={<Navigate to="/scan" replace/>}/><Route path="/map" element={<PrescriptionMap/>}/><Route path="/sprayer" element={<SprayerControl/>}/><Route path="/operations" element={<Navigate to="/sprayer" replace/>}/><Route path="/history" element={<SprayHistory/>}/><Route path="/audit" element={<AuditHistory/>}/><Route path="/storage" element={<StorageRegistry/>}/><Route path="/analytics" element={<Analytics/>}/><Route path="/demo" element={<Demo/>}/><Route path="/admin/knowledge" element={<KnowledgeBaseAdmin/>}/><Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes></main><Footer/></div></BrowserRouter>;
};
export default App;
