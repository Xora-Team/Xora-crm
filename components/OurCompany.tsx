import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Search, 
  ChevronDown, 
  MapPin, 
  Globe, 
  Phone, 
  Mail,
  Eye,
  PenSquare
} from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where } from '@firebase/firestore';
import UserProfile from './UserProfile';
import { formatPhone } from '../utils';

interface OurCompanyProps {
  userProfile: any;
}

const OurCompany: React.FC<OurCompanyProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'annuaire' | 'infos'>('annuaire');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Filters for directory
  const [teamSearch, setTeamSearch] = useState('');
  const [teamMetierFilter, setTeamMetierFilter] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  useEffect(() => {
    if (!userProfile?.companyId) return;

    const unsubCompany = onSnapshot(doc(db, 'companies', userProfile.companyId), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyInfo(docSnap.data());
      }
    });

    const q = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
    const unsubTeam = onSnapshot(q, (snapshot) => {
      // Filter out members who have left
      const members = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter((m: any) => !m.hasLeft);
      setTeamMembers(members);
    });

    return () => {
      unsubCompany();
      unsubTeam();
    };
  }, [userProfile?.companyId]);

  const filteredTeam = teamMembers.filter(member => {
    const searchMatch = !teamSearch || 
      member.name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
      member.email?.toLowerCase().includes(teamSearch.toLowerCase());
    
    const metierMatch = !teamMetierFilter || (
      Array.isArray(member.metier) 
        ? member.metier.includes(teamMetierFilter)
        : (member.metier || 'Agenceur') === teamMetierFilter
    );

    return searchMatch && metierMatch;
  });

  const allMetiers = [
    'Agenceur', 'Concepteur.rice', 'Assistant.e commercial.e', 'Adv', 
    'Assistant.e de direction', 'Poseur', 'Métreur', 'Secrétaire', 
    'Magasinier.e', 'Directeur.rice', 'Chef.fe d\'entreprise', 
    'Cuisiniste', 'Bainiste', 'Décorateur', 'Architecte d\'intérieur', 'Marbrier'
  ].sort();

  if (selectedMember) {
    return (
      <UserProfile 
        userProfile={selectedMember}
        adminProfile={userProfile}
        setUserProfile={(updated) => {
          setSelectedMember(updated);
        }}
        onBack={() => setSelectedMember(null)}
        readOnly={isReadOnlyView}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] font-sans">
      <div className="p-8 space-y-6">
        {/* Tabs Header - Large Card Style */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1 shadow-sm">
          <button 
            onClick={() => setActiveTab('annuaire')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'annuaire' 
                ? 'bg-gray-50 text-gray-900 shadow-inner' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
            }`}
          >
            <Users size={18} />
            annuaire de l'entreprise ({teamMembers.length})
          </button>
          <button 
            onClick={() => setActiveTab('infos')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'infos' 
                ? 'bg-gray-50 text-gray-900 shadow-inner' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
            }`}
          >
            <Building2 size={18} />
            Informations société
          </button>
        </div>

        {activeTab === 'annuaire' ? (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Rechercher"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all shadow-sm"
                />
              </div>
              <div className="w-full md:w-72 relative">
                <select 
                  value={teamMetierFilter}
                  onChange={(e) => setTeamMetierFilter(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all shadow-sm"
                >
                  <option value="">Type de métier</option>
                  {allMetiers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Employee Cards List */}
            <div className="space-y-3">
              {filteredTeam.map(member => {
                const isOwnProfile = member.uid === userProfile?.uid;
                
                return (
                  <div 
                    key={member.uid} 
                    onClick={() => {
                      if (isOwnProfile) {
                        setSelectedMember(member);
                        setIsReadOnlyView(true);
                      }
                    }}
                    className={`bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-6 shadow-sm transition-all group ${isOwnProfile ? 'hover:shadow-md cursor-pointer' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-50 shadow-sm flex-shrink-0">
                      <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 items-center gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{member.name}</h4>
                      </div>
                      
                      <div className="text-center md:text-left">
                        <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                          {Array.isArray(member.metier) ? member.metier[0] : (member.metier || 'Agenceur')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-500">
                        <Mail size={14} className="text-gray-300" />
                        <span className="text-xs font-medium truncate max-w-[180px]">{member.email || '-'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-500">
                        <Phone size={14} className="text-gray-300" />
                        <span className="text-xs font-medium">{formatPhone(member.portable || member.phone)}</span>
                      </div>

                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        {isOwnProfile && (
                          <button 
                            onClick={() => {
                              setSelectedMember(member);
                              setIsReadOnlyView(true);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                            title="Voir mon profil"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTeam.length === 0 && (
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                    <Users size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Aucun collaborateur trouvé</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto mt-2">Ajustez vos filtres ou votre recherche pour trouver un collaborateur de l'équipe.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Informations société Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-8">
              <h3 className="text-lg font-bold text-gray-900">Informations société</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {/* Nom commercial */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nom commercial</label>
                  <div className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 shadow-sm">
                    {companyInfo?.name || 'Non renseigné'}
                  </div>
                </div>

                {/* Adresse du siège social */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Adresse du siège social</label>
                  <div className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 shadow-sm">
                    {companyInfo?.addresses?.[0]?.address || 'Non renseignée'}
                  </div>
                </div>

                {/* Téléphone fixe */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Téléphone fixe</label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 border-gray-100 rounded-l-xl bg-gray-50 text-gray-800">
                      <span className="text-lg mr-1">🇫🇷</span>
                      <ChevronDown size={14} className="text-gray-300" />
                    </div>
                    <div className="flex-1 bg-white border border-gray-100 rounded-r-xl py-3 px-4 text-sm font-medium text-gray-700 shadow-sm">
                      {formatPhone(companyInfo?.phone)}
                    </div>
                  </div>
                </div>

                {/* Site internet */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Site internet</label>
                  <div className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 shadow-sm">
                    {companyInfo?.website || 'Non renseigné'}
                  </div>
                </div>

                {/* SIRET */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">SIRET</label>
                  <div className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 shadow-sm">
                    {companyInfo?.siret || 'Non renseigné'}
                  </div>
                </div>

                {/* N° de TVA */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">N° de TVA</label>
                  <div className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 shadow-sm">
                    {companyInfo?.tvaIntra || 'Non renseigné'}
                  </div>
                </div>
              </div>
            </div>

            {/* Liste des documents Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-8">
              <h3 className="text-lg font-bold text-gray-900">Liste des documents</h3>
              
              <div className="space-y-4">
                {['IBAN', 'KBIS', 'Assurance decennale'].map((docName) => (
                  <div 
                    key={docName}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-xl py-4 px-6 shadow-sm hover:shadow-md transition-all group"
                  >
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">{docName}</span>
                    <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-900 transition-all">
                      <Eye size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OurCompany;
