
import React, { useState, useEffect } from 'react';
import { Building2, Users, Database, Check, Loader2, Save, MapPin, Globe, ShieldCheck, ChevronDown, Plus } from 'lucide-react';
import { db, seedDatabase } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, updateDoc, onSnapshot, collection, query, where } from '@firebase/firestore';
import InviteCollaboratorModal from './InviteCollaboratorModal';

interface CompanyManagementProps {
  userProfile: any;
}

const CompanyManagement: React.FC<CompanyManagementProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState('Informations générales');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Charger les infos de la société
  useEffect(() => {
    if (!userProfile?.companyId) return;
    const unsub = onSnapshot(doc(db, 'companies', userProfile.companyId), (docSnap) => {
      if (docSnap.exists()) setCompanyInfo(docSnap.data());
    });
    return () => unsub();
  }, [userProfile?.companyId]);

  // Charger les membres de l'équipe
  useEffect(() => {
    if (!userProfile?.companyId) return;
    const q = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
    const unsub = onSnapshot(q, (snap) => {
      setTeamMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userProfile?.companyId]);

  const handleUpdateCompany = async (field: string, value: any) => {
    if (!userProfile?.companyId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { [field]: value });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeed = async () => {
    if (!userProfile?.companyId) return;
    setIsSeeding(true);
    try {
      await seedDatabase(userProfile.companyId, userProfile);
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (error) {
      console.error("Erreur seed:", error);
      alert("Erreur lors de l'initialisation.");
    } finally {
      setIsSeeding(false);
    }
  };

  const tabs = ['Informations générales', 'Équipe', 'Paramètres & Data'];

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] overflow-y-auto hide-scrollbar font-sans p-10">
      <div className="mb-10 flex justify-between items-center">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-800">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notre Entreprise</h1>
            <p className="text-sm text-gray-400 font-medium">Gérez votre enseigne, votre équipe et vos paramètres globaux.</p>
          </div>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs animate-pulse">
            <Loader2 size={14} className="animate-spin" /> Enregistrement...
          </div>
        )}
      </div>

      <div className="flex items-end shrink-0 mb-6 border-b border-gray-100 overflow-x-auto hide-scrollbar">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[14px] font-bold transition-all relative ${
                activeTab === tab ? 'text-gray-900' : 'text-gray-300 hover:text-gray-500'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in duration-500">
        {activeTab === 'Informations générales' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Identité de l'enseigne</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nom de la société / Enseigne</label>
                    <input 
                      type="text" 
                      value={companyInfo?.name || ''} 
                      onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                      onBlur={(e) => handleUpdateCompany('name', e.target.value)}
                      className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Activité principale</label>
                    <div className="relative">
                      <select 
                        value={companyInfo?.activity || 'Cuisiniste'}
                        onChange={(e) => handleUpdateCompany('activity', e.target.value)}
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                      >
                        <option>Cuisiniste</option>
                        <option>Bainiste</option>
                        <option>Décorateur</option>
                        <option>Architecte d'intérieur</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                   <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Adresse du siège</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="7 rue de Provence, 34500 Béziers"
                        className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Site internet</label>
                    <div className="relative">
                      <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="www.monenseigne.fr"
                        className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
               <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck size={24} /></div>
                      <span className="px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest">Abonnement Pro</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">Plan Illimité</h4>
                      <p className="text-indigo-200 text-sm font-medium mt-1">Votre espace XORA est actif.</p>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                       <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mb-2">ID Société</p>
                       <p className="font-mono text-sm bg-black/20 p-3 rounded-xl break-all">{userProfile?.companyId}</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'Équipe' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Membres de l'équipe ({teamMembers.length})</h3>
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[12px] font-bold hover:bg-black transition-all shadow-lg"
              >
                <Plus size={16} /> Inviter un collaborateur
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map(member => (
                <div key={member.uid} className="bg-white border border-gray-100 p-6 rounded-3xl flex items-center gap-5 shadow-sm hover:shadow-md transition-all group">
                  <div className="relative">
                    <img src={member.avatar} className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[14px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase">{member.name}</p>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Paramètres & Data' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-4 text-gray-900">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-800"><Database size={24} /></div>
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Maintenance des données</h3>
                  <p className="text-sm text-gray-400 font-medium">Réinitialiser ou injecter des données de démonstration.</p>
                </div>
              </div>
              <div className="pt-4 p-6 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-xs text-red-600 font-bold mb-4 flex items-center gap-2 uppercase tracking-wide">Zone de danger</p>
                <button 
                  onClick={handleSeed} 
                  disabled={isSeeding || seedSuccess} 
                  className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold shadow-lg transition-all ${
                    seedSuccess ? 'bg-green-500 text-white' : 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]'
                  }`}
                >
                  {isSeeding ? <Loader2 className="animate-spin" size={20} /> : (seedSuccess ? <Check size={20} /> : <Database size={20} />)}
                  {isSeeding ? 'Initialisation...' : (seedSuccess ? 'Données injectées !' : 'Injecter les données de test')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'invitation */}
      <InviteCollaboratorModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        userProfile={userProfile}
      />
    </div>
  );
};

export default CompanyManagement;
