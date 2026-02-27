
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Database, 
  Check, 
  Loader2, 
  Save, 
  MapPin, 
  Globe, 
  ShieldCheck, 
  ChevronDown, 
  Plus, 
  Trash2, 
  ChevronUp, 
  FileText, 
  UserCircle, 
  Lock, 
  Key,
  Briefcase,
  UserPlus,
  Settings as SettingsIcon,
  Upload,
  MessageSquare,
  Bell,
  Signpost,
  Plug
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, query, where } from '@firebase/firestore';
import InviteCollaboratorModal from './InviteCollaboratorModal';

interface CompanyManagementProps {
  userProfile: any;
}

const CompanyManagement: React.FC<CompanyManagementProps> = ({ userProfile }) => {
  const [activeMainTab, setActiveMainTab] = useState('Société');
  const [activeSubTab, setActiveSubTab] = useState('Informations');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [expandedAddress, setExpandedAddress] = useState<string | null>(null);

  const isFilled = (val: any) => val && val.toString().trim() !== '';

  const handleAddAddress = async () => {
    if (!userProfile?.companyId) return;
    const newAddress = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Dépôt',
      address: ''
    };
    const currentAddresses = companyInfo?.addresses || [];
    const updatedAddresses = [...currentAddresses, newAddress];
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { addresses: updatedAddresses });
      setExpandedAddress(newAddress.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAddress = async (id: string, field: string, value: string) => {
    if (!userProfile?.companyId || !companyInfo?.addresses) return;
    const updatedAddresses = companyInfo.addresses.map((addr: any) => 
      addr.id === id ? { ...addr, [field]: value } : addr
    );
    
    // Optimistic update
    setCompanyInfo({ ...companyInfo, addresses: updatedAddresses });
    
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { addresses: updatedAddresses });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!userProfile?.companyId || !companyInfo?.addresses) return;
    const updatedAddresses = companyInfo.addresses.filter((addr: any) => addr.id !== id);
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { addresses: updatedAddresses });
      if (expandedAddress === id) setExpandedAddress(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

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

  const mainTabs = [
    { id: 'Société', icon: Building2 },
    { id: 'Rôle', icon: Signpost },
    { id: 'Equipe', icon: Users, count: teamMembers.length },
    { id: 'Connexion', icon: Plug }
  ];

  const societeSubTabs = [
    'Informations',
    'Documents légaux',
    'Présentation commerciale',
    'Fidélisation',
    'RGPD'
  ];

  const renderMainTabContent = () => {
    switch (activeMainTab) {
      case 'Société':
        return (
          <div className="flex flex-col min-h-full">
            {/* Sub Tabs - White Background */}
            <div className="bg-white px-10 pt-4">
              <div className="flex items-center gap-10 border-b border-gray-100">
                {societeSubTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab)}
                    className={`pb-4 text-[15px] font-bold transition-all relative ${
                      activeSubTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-500'
                    }`}
                  >
                    {tab}
                    {activeSubTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub Tab Content - Gray Background */}
            <div className="flex-1 bg-[#F8F9FA] px-10 py-8">
              {activeSubTab === 'Informations' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Logo Section - White Card */}
                  <div className="bg-white rounded-2xl p-6 flex items-center gap-6 border border-gray-100 shadow-sm">
                  <div className="w-36 h-24 bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
                    {companyInfo?.logo ? (
                      <img src={companyInfo.logo} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <div className="text-gray-300 flex flex-col items-center">
                        <Building2 size={32} />
                        <span className="text-[10px] uppercase font-bold mt-1 tracking-widest">Logo</span>
                      </div>
                    )}
                  </div>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                    <Plus size={18} className="text-gray-400" /> Sélectionner un fichier
                  </button>
                </div>

                {/* Société Details Form */}
                <div className="space-y-10">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900">Société</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Forme</label>
                        <div className="relative">
                          <select 
                            className={`w-full appearance-none bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                              isFilled(companyInfo?.legalForm) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200 text-gray-400'
                            }`}
                            value={companyInfo?.legalForm || 'SARL'}
                            onChange={(e) => handleUpdateCompany('legalForm', e.target.value)}
                          >
                            <option>SARL</option>
                            <option>SAS</option>
                            <option>EURL</option>
                            <option>Auto-entrepreneur</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Raison sociale</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.raisonSociale) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.raisonSociale || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, raisonSociale: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('raisonSociale', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Nom commercial</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.name) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.name || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('name', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-bold text-gray-900">Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-gray-400">Téléphone</label>
                          <input 
                            type="text" 
                            className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                              isFilled(companyInfo?.phone) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                            }`}
                            value={companyInfo?.phone || ''}
                            onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                            onBlur={(e) => handleUpdateCompany('phone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-gray-400">E-mail</label>
                          <input 
                            type="email" 
                            className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                              isFilled(companyInfo?.email) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                            }`}
                            value={companyInfo?.email || ''}
                            onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                            onBlur={(e) => handleUpdateCompany('email', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-gray-400">Site internet</label>
                          <input 
                            type="text" 
                            className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                              isFilled(companyInfo?.website) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                            }`}
                            value={companyInfo?.website || ''}
                            onChange={(e) => setCompanyInfo({...companyInfo, website: e.target.value})}
                            onBlur={(e) => handleUpdateCompany('website', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                    {/* Addresses Section - White Card */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-900">Liste des adresses</h3>
                        <button 
                          onClick={handleAddAddress}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                          <Plus size={16} /> Ajouter une adresse
                        </button>
                      </div>

                    <div className="space-y-3">
                      {(companyInfo?.addresses || []).map((addr: any) => (
                        <div key={addr.id} className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                          <div 
                            className="p-4 flex items-center justify-between cursor-pointer bg-[#F8F9FA]/50"
                            onClick={() => setExpandedAddress(expandedAddress === addr.id ? null : addr.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-900">
                                {addr.type} {addr.address ? `- ${addr.address.substring(0, 30)}${addr.address.length > 30 ? '...' : ''}` : ''}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAddress(addr.id);
                                }}
                                className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                              {expandedAddress === addr.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                            </div>
                          </div>
                          {expandedAddress === addr.id && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 animate-in slide-in-from-top-2 duration-300">
                              <div className="md:col-span-4 space-y-1.5">
                                <label className="text-[11px] font-medium text-gray-400">Type d'adresse</label>
                                <div className="relative">
                                  <select 
                                    className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all"
                                    value={addr.type}
                                    onChange={(e) => handleUpdateAddress(addr.id, 'type', e.target.value)}
                                  >
                                    <option>Siège social</option>
                                    <option>Dépôt</option>
                                    <option>Showroom</option>
                                  </select>
                                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                              </div>
                              <div className="md:col-span-8 space-y-1.5">
                                <label className="text-[11px] font-medium text-gray-400">Adresse</label>
                                <input 
                                  type="text" 
                                  className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                                    isFilled(addr.address) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                                  }`}
                                  value={addr.address || ''}
                                  onChange={(e) => {
                                    const updated = companyInfo.addresses.map((a: any) => a.id === addr.id ? { ...a, address: e.target.value } : a);
                                    setCompanyInfo({ ...companyInfo, addresses: updated });
                                  }}
                                  onBlur={(e) => handleUpdateAddress(addr.id, 'address', e.target.value)}
                                  placeholder=""
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {(!companyInfo?.addresses || companyInfo.addresses.length === 0) && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                          <p className="text-sm text-gray-400">Aucune adresse enregistrée</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Identifiants Section */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900">Identifiants</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">SIREN</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.siren) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.siren || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, siren: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('siren', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">SIRET</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.siret) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.siret || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, siret: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('siret', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">N° de TVA</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.tva) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.tva || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, tva: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('tva', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Code APE</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.ape) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.ape || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, ape: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('ape', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Banque Section */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900">Banque</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Nom banque</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.bankName) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.bankName || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, bankName: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('bankName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Iban</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.iban) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.iban || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, iban: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('iban', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Code BIC</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.bic) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.bic || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, bic: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('bic', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assurance Section */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900">Assurance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Nom assurance</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.insuranceName) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.insuranceName || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, insuranceName: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('insuranceName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">N° de contrat</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.insuranceNumber) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.insuranceNumber || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, insuranceNumber: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('insuranceNumber', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RC & Capital Section */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-900">RC & Capital</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">RC</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.rcCity) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.rcCity || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, rcCity: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('rcCity', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-400">Capital</label>
                        <input 
                          type="text" 
                          className={`w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-all ${
                            isFilled(companyInfo?.capital) ? 'border-gray-300 text-gray-900 font-bold' : 'border-gray-200'
                          }`}
                          value={companyInfo?.capital || ''}
                          onChange={(e) => setCompanyInfo({...companyInfo, capital: e.target.value})}
                          onBlur={(e) => handleUpdateCompany('capital', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {activeSubTab !== 'Informations' && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">Contenu pour "{activeSubTab}" en cours de développement.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'Rôle':
        return (
          <div className="p-10 bg-[#F8F9FA] min-h-full">
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
              <Signpost size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Gestion des rôles et permissions en cours de développement.</p>
            </div>
          </div>
        );
      case 'Equipe':
        return (
          <div className="p-10 bg-[#F8F9FA] min-h-full">
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
          </div>
        );
      case 'Connexion':
        return (
          <div className="p-10 bg-[#F8F9FA] min-h-full">
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
              <Plug size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Paramètres de connexion et sécurité en cours de développement.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto hide-scrollbar font-sans">
      {/* Main Tabs Container */}
      <div className="bg-[#F8F9FA] px-10 pt-10">
        <div className="flex items-end">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-t-2xl text-sm font-bold transition-all border-x border-t ${
                  isActive 
                  ? 'bg-white text-gray-900 border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10' 
                  : 'bg-transparent text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-gray-900' : 'text-gray-400'} />
                {tab.id}
                {tab.count !== undefined && (
                  <span className="ml-1 text-gray-400 font-medium">
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 border-t border-gray-100 -mt-px">
        {renderMainTabContent()}
      </div>

      {/* Modal d'invitation */}
      <InviteCollaboratorModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        userProfile={userProfile}
      />

      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-4">
          <Loader2 size={14} className="animate-spin" /> Enregistrement...
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;


