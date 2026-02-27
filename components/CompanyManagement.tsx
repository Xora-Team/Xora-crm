
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
  Plug,
  Eye,
  MoreHorizontal,
  X,
  Gift,
  Search
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, query, where } from '@firebase/firestore';
import InviteCollaboratorModal from './InviteCollaboratorModal';
import AddGiftModal from './AddGiftModal';
import UserProfile from './UserProfile';

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
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isAddGiftModalOpen, setIsAddGiftModalOpen] = useState(false);
  const [isDocTypeDropdownOpen, setIsDocTypeDropdownOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocIsPublic, setNewDocIsPublic] = useState(false);
  const [newDocType, setNewDocType] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [expandedAddress, setExpandedAddress] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isFilled = (val: any) => val && val.toString().trim() !== '';

  const docTypes = [
    'Assurance',
    'KBIS',
    'Iban',
    'Juridique',
    'Social',
    'Doc obligatoire',
    'Convention collective'
  ];

  const handleAddAddress = async () => {
    if (!userProfile?.companyId) return;
    const newAddress = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Siège social',
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

  const handleAddDocument = () => {
    setNewDocIsPublic(false);
    setNewDocType('');
    setNewDocName('');
    setSelectedFile(null);
    setIsDocTypeDropdownOpen(false);
    setIsAddDocModalOpen(true);
  };

  const handleConfirmAddDocument = async () => {
    if (!userProfile?.companyId || !newDocType || !selectedFile) return;
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      name: newDocName || selectedFile.name,
      type: newDocType,
      isPublic: newDocIsPublic,
      date: new Date().toISOString()
    };
    const currentDocs = companyInfo?.legalDocuments || [];
    const updatedDocs = [...currentDocs, newDoc];
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { legalDocuments: updatedDocs });
      setIsAddDocModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!userProfile?.companyId || !companyInfo?.legalDocuments) return;
    const updatedDocs = companyInfo.legalDocuments.filter((d: any) => d.id !== id);
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { legalDocuments: updatedDocs });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    if (!userProfile?.companyId || !companyInfo?.loyaltyGifts) return;
    const updatedGifts = companyInfo.loyaltyGifts.filter((g: any) => g.id !== id);
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { loyaltyGifts: updatedGifts });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGiftAdded = async (gift: any) => {
    if (!userProfile?.companyId) return;
    const currentGifts = companyInfo?.loyaltyGifts || [];
    const updatedGifts = [...currentGifts, gift];
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { loyaltyGifts: updatedGifts });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir retirer ce collaborateur de l'équipe ?")) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', memberId), { companyId: null });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDocumentName = async (id: string, name: string) => {
    if (!userProfile?.companyId || !companyInfo?.legalDocuments) return;
    const updatedDocs = companyInfo.legalDocuments.map((d: any) => 
      d.id === id ? { ...d, name } : d
    );
    
    // Optimistic update
    setCompanyInfo({ ...companyInfo, legalDocuments: updatedDocs });
    
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId), { legalDocuments: updatedDocs });
    } catch (e) {
      console.error(e);
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

              {activeSubTab === 'Documents légaux' && (
                <div className="p-10 bg-[#F8F9FA] space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900">Liste des documents</h3>
                    <button 
                      onClick={handleAddDocument}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Plus size={16} /> Ajouter un document
                    </button>
                  </div>

                  {companyInfo?.legalDocuments && companyInfo.legalDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {companyInfo.legalDocuments.map((doc: any) => (
                        <div key={doc.id} className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                          <div className="flex-1 mr-4">
                            <input 
                              type="text"
                              className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-900 focus:ring-0 outline-none"
                              value={doc.name}
                              onChange={(e) => {
                                const updated = companyInfo.legalDocuments.map((d: any) => d.id === doc.id ? { ...d, name: e.target.value } : d);
                                setCompanyInfo({ ...companyInfo, legalDocuments: updated });
                              }}
                              onBlur={(e) => handleUpdateDocumentName(doc.id, e.target.value)}
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                {doc.type || 'Non spécifié'}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${doc.isPublic ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                                {doc.isPublic ? 'Public' : 'Privé'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium">Aucun document enregistré pour le moment.</p>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'Fidélisation' && (
                <div className="p-10 bg-[#F8F9FA] space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900">Liste des cadeaux offerts</h3>
                    <button 
                      onClick={() => setIsAddGiftModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Plus size={16} /> Ajouter un cadeau
                    </button>
                  </div>

                  {companyInfo?.loyaltyGifts && companyInfo.loyaltyGifts.length > 0 ? (
                    <div className="space-y-3">
                      {companyInfo.loyaltyGifts.map((gift: any) => (
                        <div key={gift.id} className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                              <Gift size={18} />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{gift.name}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteGift(gift.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <Gift size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium">Aucun cadeau configuré pour le moment.</p>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'Présentation commerciale' && (
                <div className="p-10 bg-[#F8F9FA] space-y-8 animate-in fade-in duration-500">
                  <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      {[
                        { label: 'Background couleur', key: 'bgPresentation' },
                        { label: 'Titre couleur', key: 'titlePresentation' },
                        { label: 'Contenu couleur', key: 'contentPresentation' },
                        { label: 'Autre couleur (pagination, etc...)', key: 'otherPresentation' }
                      ].map((item) => (
                        <div key={item.key} className="space-y-3">
                          <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{item.label}</label>
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-xl border border-gray-100 shadow-sm shrink-0"
                              style={{ backgroundColor: companyInfo?.[item.key] || '#FFFFFF' }}
                            />
                            <div className="relative flex-1">
                              <input 
                                type="color"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                value={companyInfo?.[item.key] || '#FFFFFF'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCompanyInfo({ ...companyInfo, [item.key]: val });
                                }}
                                onBlur={(e) => handleUpdateCompany(item.key, e.target.value)}
                              />
                              <div className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 pointer-events-none">
                                <span className="text-gray-400">Sélectionner</span>
                                <ChevronDown size={18} className="text-gray-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab !== 'Informations' && activeSubTab !== 'Documents légaux' && activeSubTab !== 'Fidélisation' && activeSubTab !== 'Présentation commerciale' && (
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
        if (selectedMemberForEdit) {
          return (
            <UserProfile 
              userProfile={selectedMemberForEdit} 
              setUserProfile={(updated) => {
                setSelectedMemberForEdit(updated);
                // The teamMembers list will be updated via onSnapshot
              }}
              onBack={() => setSelectedMemberForEdit(null)}
            />
          );
        }
        return (
          <div className="p-10 bg-[#F8F9FA] min-h-full">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[15px] font-bold text-gray-900">Liste des collaborateurs ({teamMembers.length})</h3>
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Plus size={16} /> Ajouter un Collaborateur
                </button>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Rechercher"
                    className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all"
                  />
                </div>
                <div className="relative">
                  <select className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all">
                    <option>Type de métier</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all">
                    <option>Rôle</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all">
                    <option>Adhésion à Xora</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Table View */}
              <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Nom</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Métier</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Rôle</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Email</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Téléphone</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Adhésion Xora</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {teamMembers.map(member => (
                      <tr key={member.uid} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={member.avatar} className="w-8 h-8 rounded-full object-cover shadow-sm" alt="" />
                            <span className="text-sm font-bold text-gray-900 uppercase">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-600">{member.metier || 'Agenceur'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-600">{member.role || '-'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-600">{member.email || '-'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-600">{member.phone || '01 23 45 67 89'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            <div className="px-2 py-1 bg-gray-100 rounded-lg border border-gray-200">
                              <span className="text-[10px] font-black text-gray-400 tracking-widest">XORA</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedMemberForEdit(member)}
                              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 shadow-sm"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMember(member.uid)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 shadow-sm"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* Add Document Modal */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FileText size={20} className="text-gray-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Ajouter un document</h2>
              </div>
              <button 
                onClick={() => setIsAddDocModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Privacy Toggle */}
              <div className="space-y-3">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Document privé/ public</label>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium ${!newDocIsPublic ? 'text-gray-900' : 'text-gray-400'}`}>Privé</span>
                  <button 
                    onClick={() => setNewDocIsPublic(!newDocIsPublic)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${newDocIsPublic ? 'bg-gray-900' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${newDocIsPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                  <span className={`text-sm font-medium ${newDocIsPublic ? 'text-gray-900' : 'text-gray-400'}`}>Public</span>
                </div>
              </div>

              {/* Document Type Select */}
              <div className="space-y-3">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Type de document</label>
                <div className="relative">
                  <button 
                    onClick={() => setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen)}
                    className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all cursor-pointer"
                  >
                    <span className={!newDocType ? 'text-gray-400' : 'text-gray-900'}>
                      {newDocType || 'Assurance'}
                    </span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${isDocTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDocTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                      {docTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setNewDocType(type);
                            setIsDocTypeDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span>{type}</span>
                          {newDocType === type && <Check size={16} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Document Name */}
              <div className="space-y-3">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Nom du document</label>
                <input 
                  type="text"
                  placeholder="Saisir"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-gray-400 transition-all"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                />
              </div>

              {/* File Selection Area */}
              <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6 space-y-6">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-medium text-gray-400 mb-2">
                    Glisser et déposer votre document, ou sélectionner le directement
                  </p>
                  {selectedFile && (
                    <p className="text-xs font-bold text-gray-900">
                      {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Plus size={18} /> Sélectionner un fichier
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
              <button 
                onClick={handleConfirmAddDocument}
                disabled={isSaving || !newDocType || !selectedFile}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                Ajouter un document
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal d'ajout de cadeau */}
      <AddGiftModal 
        isOpen={isAddGiftModalOpen}
        onClose={() => setIsAddGiftModalOpen(false)}
        userProfile={userProfile}
        onGiftAdded={handleGiftAdded}
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


