
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  PenSquare, 
  Phone, 
  Mail, 
  ChevronDown, 
  Camera, 
  Loader2, 
  User, 
  Briefcase, 
  Settings, 
  Laptop, 
  Car, 
  Smartphone,
  Palette,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  X,
  MessageSquare,
  AlertCircle,
  MapPin,
  Search,
  Plus,
  Map as MapIcon
} from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, updateDoc, onSnapshot, writeBatch, collection, query, where, getDocs, addDoc, serverTimestamp } from '@firebase/firestore';
import UserDocuments from './UserDocuments';
import { formatPhone, formatNameFirstLast } from '../utils';

interface UserProfileProps {
  userProfile: any;
  adminProfile?: any;
  setUserProfile: (profile: any) => void;
  onBack?: () => void;
  readOnly?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ userProfile, adminProfile, setUserProfile, onBack, readOnly }) => {
  const [activeTab, setActiveTab] = useState('Informations');
  const [isUploading, setIsUploading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedError, setShowUnsavedError] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    civility: userProfile?.civility || 'Mr',
    lastName: userProfile?.lastName || '',
    firstName: userProfile?.firstName || '',
    email: userProfile?.email || '',
    emailPerso: userProfile?.emailPerso || '',
    portable: userProfile?.portable || userProfile?.phone || '',
    fixed: userProfile?.fixed || '',
    address: userProfile?.address || '',
    lat: userProfile?.lat || null,
    lng: userProfile?.lng || null,
    contractType: userProfile?.contractType || 'CDI',
    metier: Array.isArray(userProfile?.metier) ? userProfile.metier : (userProfile?.metier ? [userProfile.metier] : (userProfile?.jobTitle ? [userProfile.jobTitle] : (userProfile?.role ? [userProfile.role] : []))),
    role: userProfile?.role || 'Concepteur.rice',
    hasPhone: userProfile?.hasPhone ?? true,
    hasCar: userProfile?.hasCar ?? true,
    hasLaptop: userProfile?.hasLaptop ?? true,
    agendaColor: userProfile?.agendaColor || '#6366f1',
    isSubscriptionActive: userProfile?.isSubscriptionActive ?? true,
    hasLeft: userProfile?.hasLeft ?? false,
    departureDate: userProfile?.departureDate || '',
    avatar: userProfile?.avatar || null
  });

  const contractTypes = [
    'CDI',
    'CDD',
    'Contrat d\'apprentissage',
    'Stagiaire',
    'Gérant',
    'Agent Commercial',
    'Freelance'
  ];

  const jobs = [
    'Chef.fe d\'entreprise',
    'Responsable magasin',
    'Agenceur',
    'ADV',
    'Secrétaire',
    'Responsable technique',
    'Installateur.rice',
    'Métreur'
  ].sort();

  useEffect(() => {
    if (userProfile && !isEditing) {
      setFormData(prev => ({
        ...prev,
        lastName: userProfile.lastName || prev.lastName,
        firstName: userProfile.firstName || prev.firstName,
        email: userProfile.email || prev.email,
        emailPerso: userProfile.emailPerso || prev.emailPerso,
        metier: Array.isArray(userProfile.metier) ? userProfile.metier : (userProfile.metier ? [userProfile.metier] : (userProfile.jobTitle ? [userProfile.jobTitle] : (userProfile.role ? [userProfile.role] : prev.metier))),
        role: userProfile.role || prev.role,
        avatar: userProfile.avatar || prev.avatar,
        agendaColor: userProfile.agendaColor || prev.agendaColor,
        hasPhone: userProfile.hasPhone ?? prev.hasPhone,
        hasCar: userProfile.hasCar ?? prev.hasCar,
        hasLaptop: userProfile.hasLaptop ?? prev.hasLaptop,
        isSubscriptionActive: userProfile.isSubscriptionActive ?? prev.isSubscriptionActive,
        hasLeft: userProfile.hasLeft ?? prev.hasLeft,
        departureDate: userProfile.departureDate || prev.departureDate,
        address: userProfile.address || prev.address,
        lat: userProfile.lat || prev.lat,
        lng: userProfile.lng || prev.lng
      }));
    }
  }, [userProfile, isEditing]);

  useEffect(() => {
    const fetchAddr = async () => {
      if (addressSearch.length < 4 || addressSearch === formData.address) {
        setSuggestions([]); return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressSearch)}&limit=5`);
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) { console.error(error); } finally { setIsSearching(false); }
    };
    const timer = setTimeout(fetchAddr, 300);
    return () => clearTimeout(timer);
  }, [addressSearch, formData.address]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || isEditingAddress) return;
    if (formData.lat && formData.lng) {
      if (mapRef.current) mapRef.current.remove();
      const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([formData.lat, formData.lng], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #6366f1; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7]
      });
      L.marker([formData.lat, formData.lng], { icon: customIcon }).addTo(map);
      mapRef.current = map;
    }
    return () => { if (mapRef.current) mapRef.current.remove(); mapRef.current = null; };
  }, [formData.lat, formData.lng, isEditingAddress]);

  useEffect(() => {
    if (formData.address && (!formData.lat || !formData.lng)) {
      const geocode = async () => {
        try {
          const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(formData.address)}&limit=1`);
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            setFormData(prev => ({ ...prev, lat, lng }));
          }
        } catch (e) {
          console.error("Auto-geocoding failed", e);
        }
      };
      geocode();
    }
  }, [formData.address, formData.lat, formData.lng]);

  const handleSelectAddress = (feature: any) => {
    const fullAddress = feature.properties.label;
    const [longitude, latitude] = feature.geometry.coordinates;
    
    setFormData(prev => ({
      ...prev,
      address: fullAddress,
      lat: latitude,
      lng: longitude
    }));
    setHasUnsavedChanges(true);
    setIsEditingAddress(false);
    setAddressSearch('');
    setSuggestions([]);
  };

  const syncProfileEverywhere = async (newName: string, newAvatar: string) => {
    if (!userProfile?.uid) return;
    setIsSyncing(true);
    try {
      const clientsQ = query(collection(db, 'clients'), where('addedBy.uid', '==', userProfile.uid));
      const clientsSnap = await getDocs(clientsQ);
      const projectsQ = query(collection(db, 'projects'), where('agenceur.uid', '==', userProfile.uid));
      const projectsSnap = await getDocs(projectsQ);

      const updates: { ref: any, data: any }[] = [];
      clientsSnap.forEach(d => {
        updates.push({
          ref: doc(db, 'clients', d.id),
          data: { "addedBy.name": newName, "addedBy.avatar": newAvatar }
        });
      });
      projectsSnap.forEach(d => {
        updates.push({
          ref: doc(db, 'projects', d.id),
          data: { "agenceur.name": newName, "agenceur.avatar": newAvatar }
        });
      });

      const BATCH_SIZE = 500;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = updates.slice(i, i + BATCH_SIZE);
        chunk.forEach(item => batch.update(item.ref, item.data));
        await batch.commit();
      }
    } catch (e) {
      console.error("Erreur synchro profil:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdate = (field: string, value: any) => {
    if (!isEditing) return;
    let finalValue = value;
    if (field === 'portable' || field === 'fixed') {
      finalValue = formatPhone(value);
    }
    
    if (field === 'lastName') {
      finalValue = value.toUpperCase();
    }
    
    if (field === 'firstName') {
      finalValue = value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";
    }
    
    setFormData(prev => {
      const newData = { ...prev, [field]: finalValue };
      return newData;
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!userProfile?.uid) return;
    
    // Validation mandatory fields
    const isEmailRequired = formData.isSubscriptionActive;
    const isLastNameMissing = !formData.lastName.trim();
    const isFirstNameMissing = !formData.firstName.trim();
    const isCivilityMissing = !formData.civility;
    const isContractTypeMissing = !formData.contractType;
    const isEmailMissing = isEmailRequired && !formData.email.trim();

    if (isLastNameMissing || isFirstNameMissing || isCivilityMissing || isContractTypeMissing || isEmailMissing) {
      alert("Veuillez remplir tous les champs obligatoires (Civilité, Nom, Prénom, Type de contrat" + (isEmailRequired ? ", Email" : "") + ").");
      return;
    }

    // Validation date de sortie
    if (formData.hasLeft) {
      if (!formData.departureDate) {
        alert("La date de sortie est obligatoire si le salarié a quitté l'entreprise.");
        return;
      }
      const selectedDate = new Date(formData.departureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        alert("La date de sortie ne peut pas être dans le futur.");
        return;
      }
    }

    setIsSyncing(true);
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const firstNameTrimmed = formData.firstName.trim();
      const finalFirst = firstNameTrimmed ? firstNameTrimmed.charAt(0).toUpperCase() + firstNameTrimmed.slice(1).toLowerCase() : "";
      const finalLast = formData.lastName.trim().toUpperCase();
      const finalAvatar = formData.avatar;
      const fullName = `${finalLast} ${finalFirst}`.trim() || "SANS NOM";

      // Logic for Point 4: Cancel license if employee left
      let updatedFormData = { ...formData };
      if (formData.hasLeft && !userProfile.hasLeft) {
        updatedFormData.isSubscriptionActive = false;
        // Trigger email notification
        try {
          fetch('/api/notify-departure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeName: fullName,
              departureDate: formData.departureDate,
              companyName: adminProfile?.companyName || 'Non spécifiée'
            })
          });
        } catch (e) {
          console.error("Failed to send notification email:", e);
        }
      }

      await updateDoc(userRef, {
        ...updatedFormData,
        lastName: finalLast,
        name: fullName
      });

      if (finalFirst !== userProfile.firstName || finalLast !== userProfile.lastName || finalAvatar !== userProfile.avatar) {
        await syncProfileEverywhere(fullName, finalAvatar);
      }

      setUserProfile({ ...userProfile, ...updatedFormData, name: fullName, lastName: finalLast });
      setHasUnsavedChanges(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedError(true);
    } else {
      onBack?.();
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("L'image est trop lourde (max 1Mo)."); return; }
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      try {
        // Update local state immediately for responsiveness
        setFormData(prev => ({ ...prev, avatar: base64String }));
        
        // Immediate save to Firestore as requested
        if (userProfile?.uid) {
          const userRef = doc(db, 'users', userProfile.uid);
          await updateDoc(userRef, { avatar: base64String });
          
          // Sync everywhere (clients, projects)
          const fullName = formatNameFirstLast(formData.firstName, formData.lastName);
          await syncProfileEverywhere(fullName, base64String);
          
          // Update parent state to keep everything in sync
          setUserProfile({ ...userProfile, avatar: base64String });
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'avatar:", error);
        alert("Une erreur est survenue lors de la mise à jour de la photo.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
        <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] overflow-y-auto hide-scrollbar font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={handleBack} className="p-2.5 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all">
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <div onClick={() => !readOnly && handleAvatarClick()} className={`relative group w-20 h-20 flex-shrink-0 ${!readOnly ? 'cursor-pointer' : ''}`}>
              {formData.avatar ? (
                <img 
                  src={formData.avatar} 
                  className={`w-full h-full rounded-full object-cover border-2 border-white shadow-md transition-all ${isUploading ? 'opacity-50' : (!readOnly ? 'group-hover:brightness-75' : '')}`} 
                  alt="" 
                />
              ) : (
                <div className={`w-full h-full rounded-full bg-gray-100 border-2 border-white shadow-md flex items-center justify-center transition-all ${isUploading ? 'opacity-50' : (!readOnly ? 'group-hover:brightness-75' : '')}`}>
                  {/* Empty circle as requested */}
                </div>
              )}
              {!readOnly && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                  {isUploading ? <Loader2 className="text-white animate-spin" size={24} /> : <Camera className="text-white" size={24} />}
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{formatNameFirstLast(formData.firstName, formData.lastName)}</h1>
                {formData.isSubscriptionActive && (
                  <div className="px-2 py-0.5 bg-gradient-to-r from-orange-400 via-purple-500 to-blue-500 rounded-md shadow-sm">
                    <span className="text-[9px] font-black text-white tracking-widest uppercase">XORA</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-gray-400">
                {formData.metier.length > 0 ? formData.metier.join(', ') : 'Agenceur'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 ml-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <Phone size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-700">{formatPhone(formData.portable) || '01 23 45 67 89'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <Mail size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-700">{formData.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Le message de restriction est supprimé pour permettre l'accès total */}
          {false && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-[11px] font-bold text-amber-700">
              <AlertCircle size={14} />
              Pour toute modification, veuillez contacter votre gérant
            </div>
          )}
          {/* Suppression de la restriction de rôle pour l'édition du profil */}
          {true && (
            <button 
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-xs font-bold transition-all shadow-sm ${isEditing ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <PenSquare size={16} />} 
              {isEditing ? 'Enregistrer' : 'Modifier le profil'}
            </button>
          )}
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <MessageSquare size={16} /> Contacter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-6">
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('Informations')} 
            className={`px-6 py-4 text-sm font-bold transition-all relative ${activeTab === 'Informations' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Informations collaborateur
            {activeTab === 'Informations' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('Documents')} 
            className={`px-6 py-4 text-sm font-bold transition-all relative ${activeTab === 'Documents' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Documents
            {activeTab === 'Documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />}
          </button>
        </div>
      </div>

      <div className="p-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {activeTab === 'Informations' && (
            <div className="space-y-8">
              
              {/* Subscription Banner */}
              <div className={`p-6 rounded-[24px] flex items-center justify-between shadow-lg transition-all duration-500 ${formData.isSubscriptionActive ? 'bg-gradient-to-r from-[#F97316] via-[#D946EF] to-[#3B82F6]' : 'bg-gray-200'}`}>
                <div className="flex items-center gap-4">
                  <h3 className={`font-bold text-sm transition-colors ${formData.isSubscriptionActive ? 'text-white' : 'text-gray-500'}`}>
                    {formData.isSubscriptionActive ? 'Abonnement Xora Actif' : 'Abonnement Xora inactif'}
                  </h3>
                  <div className={`px-2 py-0.5 rounded-md border transition-colors ${formData.isSubscriptionActive ? 'bg-white/20 backdrop-blur-md border-white/30' : 'bg-gray-300 border-gray-400'}`}>
                    <span className={`text-[9px] font-black tracking-widest uppercase transition-colors ${formData.isSubscriptionActive ? 'text-white' : 'text-gray-500'}`}>XORA</span>
                  </div>
                </div>
                <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${formData.isSubscriptionActive ? 'bg-white/10 backdrop-blur-md border-white/20' : 'bg-white/50 border-gray-300'}`}>
                  <span className={`text-[11px] font-bold uppercase transition-colors ${formData.isSubscriptionActive ? 'text-white' : 'text-gray-400'}`}>Non</span>
                  <button 
                    disabled={!isEditing}
                    onClick={() => setShowSubscriptionModal(true)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.isSubscriptionActive ? 'bg-gray-900' : 'bg-gray-300'} ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${formData.isSubscriptionActive ? 'right-1' : 'left-1'}`}></div>
                  </button>
                  <span className={`text-[11px] font-bold uppercase transition-colors ${formData.isSubscriptionActive ? 'text-white' : 'text-gray-400'}`}>Oui</span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="bg-[#F8F9FA] border border-gray-100 rounded-[32px] p-10 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                  {/* Civilité */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Civilité du collaborateur</label>
                    <div className="relative">
                      <select 
                        disabled={!isEditing}
                        value={formData.civility} 
                        onChange={(e) => handleUpdate('civility', e.target.value)} 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50"
                      >
                        <option>Mr</option>
                        <option>Mme</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Nom */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Nom du collaborateur</label>
                    <input 
                      type="text" 
                      readOnly={!isEditing}
                      value={formData.lastName} 
                      onChange={(e) => handleUpdate('lastName', e.target.value)} 
                      className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all uppercase disabled:opacity-50" 
                    />
                  </div>

                  {/* Prénom */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Prénom du collaborateur</label>
                    <input 
                      type="text" 
                      readOnly={!isEditing}
                      value={formData.firstName} 
                      onChange={(e) => handleUpdate('firstName', e.target.value)} 
                      className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50" 
                    />
                  </div>

                  {/* Email du collaborateur */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Email du collaborateur</label>
                    <input 
                      type="email" 
                      readOnly={!isEditing}
                      value={formData.email} 
                      onChange={(e) => handleUpdate('email', e.target.value)} 
                      className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50" 
                    />
                  </div>

                  {/* Portable */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Téléphone portable</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 flex items-center gap-2 pr-2 border-r border-gray-200">
                        <img src="https://flagcdn.com/w20/fr.png" className="w-4 h-3 object-cover rounded-sm" alt="FR" />
                        <ChevronDown size={12} className="text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        readOnly={!isEditing}
                        value={formatPhone(formData.portable)} 
                        onChange={(e) => handleUpdate('portable', e.target.value)} 
                        placeholder="Entrer un numéro"
                        className="w-full bg-white border border-gray-100 rounded-xl pl-16 pr-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50" 
                      />
                    </div>
                  </div>

                  {/* Fixe */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Téléphone fixe</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 flex items-center gap-2 pr-2 border-r border-gray-200">
                        <img src="https://flagcdn.com/w20/fr.png" className="w-4 h-3 object-cover rounded-sm" alt="FR" />
                        <ChevronDown size={12} className="text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        readOnly={!isEditing}
                        value={formatPhone(formData.fixed)} 
                        onChange={(e) => handleUpdate('fixed', e.target.value)} 
                        placeholder="Entrer un numéro"
                        className="w-full bg-white border border-gray-100 rounded-xl pl-16 pr-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50" 
                      />
                    </div>
                  </div>

                  {/* Adresse */}
                  <div className="md:col-span-3 space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-medium text-gray-400 ml-1">Adresse du collaborateur</label>
                      {isEditingAddress && isEditing && (
                        <button 
                          onClick={() => setIsEditingAddress(false)} 
                          className="text-[11px] font-bold text-red-500 hover:underline"
                        >
                          Annuler
                        </button>
                      )}
                    </div>

                    {isEditingAddress && isEditing ? (
                      <div className="space-y-3 animate-in fade-in duration-300" ref={searchRef}>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            autoFocus 
                            type="text" 
                            placeholder="Entrez l'adresse..." 
                            value={addressSearch} 
                            onChange={(e) => setAddressSearch(e.target.value)} 
                            className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-10 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all shadow-sm" 
                          />
                          {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Loader2 size={16} className="animate-spin text-indigo-500" />
                            </div>
                          )}
                        </div>
                        {suggestions.length > 0 && (
                          <div className="bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50">
                            {suggestions.map((feature: any) => (
                              <button 
                                key={feature.properties.id} 
                                type="button" 
                                onClick={() => handleSelectAddress(feature)} 
                                className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-start gap-4 border-b border-gray-50 last:border-0 group transition-all"
                              >
                                <div className="mt-1 p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover:text-indigo-600 transition-all">
                                  <MapPin size={16} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-gray-900">{feature.properties.name}</span>
                                  <span className="text-[11px] text-gray-400">{feature.properties.postcode} {feature.properties.city}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.address ? (
                          <div className="flex flex-col md:flex-row gap-6 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="w-full md:w-1/3 h-[180px] rounded-xl overflow-hidden border border-gray-100 shadow-inner relative">
                              <div ref={mapContainerRef} className="w-full h-full z-0" />
                            </div>
                            <div className="flex-1 space-y-4 py-2">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                                  <MapPin size={20} />
                                </div>
                                <div>
                                  <h4 className="text-[14px] font-bold text-gray-900 leading-snug">{formData.address}</h4>
                                </div>
                              </div>
                              {isEditing && (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setIsEditingAddress(true)} 
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                                  >
                                    <Plus size={14} /> Modifier
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={() => isEditing && setIsEditingAddress(true)} 
                            className={`p-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center transition-all group shadow-inner ${isEditing ? 'cursor-pointer hover:bg-gray-50/50 hover:border-gray-200' : ''}`}
                          >
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-200 mb-4 group-hover:scale-110 transition-transform">
                              <MapPin size={24} />
                            </div>
                            <p className="text-[12px] font-bold text-gray-900">Aucune adresse renseignée</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Type de contrat */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Type de contrat</label>
                    <div className="relative">
                      <select 
                        disabled={!isEditing}
                        value={formData.contractType} 
                        onChange={(e) => handleUpdate('contractType', e.target.value)} 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50"
                      >
                        {contractTypes.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Métier Select */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Métier</label>
                    <div className="relative">
                      <select 
                        disabled={!isEditing}
                        value={formData.metier[0] || ''} 
                        onChange={(e) => handleUpdate('metier', [e.target.value])} 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50"
                      >
                        <option value="">Sélectionner un métier</option>
                        {jobs.map(job => <option key={job} value={job}>{job}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Rôle Select */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Rôle</label>
                    <div className="relative">
                      <select 
                        disabled={!isEditing || !formData.isSubscriptionActive}
                        value={formData.role} 
                        onChange={(e) => handleUpdate('role', e.target.value)} 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50 disabled:bg-gray-50"
                      >
                        <option value="Administrateur.rice">Administrateur.rice</option>
                        <option value="Concepteur.rice">Concepteur.rice</option>
                        <option value="Aucun">Aucun</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Toggles Row */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Téléphone mise à disposition</label>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        disabled={!isEditing}
                        onClick={() => handleUpdate('hasPhone', !formData.hasPhone)}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.hasPhone ? 'bg-gray-900' : 'bg-gray-200'} ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.hasPhone ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Voiture</label>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        disabled={!isEditing}
                        onClick={() => handleUpdate('hasCar', !formData.hasCar)}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.hasCar ? 'bg-gray-900' : 'bg-gray-200'} ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.hasCar ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-400 ml-1">Ordinateur portable</label>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        disabled={!isEditing}
                        onClick={() => handleUpdate('hasLaptop', !formData.hasLaptop)}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.hasLaptop ? 'bg-gray-900' : 'bg-gray-200'} ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.hasLaptop ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agenda Color & Departure Section */}
              <div className="bg-[#F8F9FA] border border-gray-100 rounded-[32px] p-10 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  {/* Agenda Color */}
                  <div className="space-y-4 flex-grow">
                    <label className="text-[11px] font-medium text-gray-400 ml-1 uppercase tracking-wider">Couleur collaborateur agenda</label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl shadow-inner border border-gray-100 flex-shrink-0" 
                        style={{ backgroundColor: formData.agendaColor }}
                      />
                      <div className="relative w-full max-w-[240px]">
                        <input 
                          type="text" 
                          readOnly={!isEditing}
                          value={formData.agendaColor.replace('#', '').toUpperCase()} 
                          onChange={(e) => handleUpdate('agendaColor', `#${e.target.value}`)}
                          className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50" 
                        />
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input 
                          type="color" 
                          disabled={!isEditing}
                          value={formData.agendaColor} 
                          onChange={(e) => handleUpdate('agendaColor', e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Le salarié a quitté l'entreprise */}
                  <div className="flex flex-col items-end space-y-6">
                    <div className="flex flex-col items-end space-y-2">
                      <label className="text-[11px] font-medium text-gray-400 mr-1 uppercase tracking-wider">Le salarié a quitté l'entreprise</label>
                      <div className="flex items-center bg-[#111827] rounded-full p-1">
                        <button 
                          type="button"
                          disabled={!isEditing}
                          onClick={() => {
                            handleUpdate('hasLeft', false);
                            handleUpdate('departureDate', '');
                          }}
                          className={`px-6 py-2 rounded-full text-[11px] font-black uppercase transition-all ${!formData.hasLeft ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                          Non
                        </button>
                        <button 
                          type="button"
                          disabled={!isEditing}
                          onClick={() => handleUpdate('hasLeft', true)}
                          className={`px-6 py-2 rounded-full text-[11px] font-black uppercase transition-all ${formData.hasLeft ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                          Oui
                        </button>
                      </div>
                    </div>

                    {formData.hasLeft && (
                      <div className="w-full max-w-[240px] flex flex-col items-end space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Date de sortie</label>
                        </div>
                        <input 
                          type="date" 
                          readOnly={!isEditing}
                          value={formData.departureDate} 
                          onChange={(e) => handleUpdate('departureDate', e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:border-gray-300 transition-all disabled:opacity-50 text-center" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'Documents' && (
            <UserDocuments userId={userProfile.uid} userProfile={userProfile} />
          )}

          {/* Subscription Confirmation Modal */}
          {showSubscriptionModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
              <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className={`p-8 flex items-center justify-between ${formData.isSubscriptionActive ? 'bg-gray-50' : 'bg-gradient-to-r from-orange-400 via-purple-500 to-blue-500'}`}>
                  <div className="flex items-center gap-4">
                    <div className="bg-white px-3 py-1 rounded-xl shadow-sm">
                      <span className="text-[10px] font-black tracking-widest text-gray-900 uppercase">XORA</span>
                    </div>
                    <h2 className={`text-xl font-bold ${formData.isSubscriptionActive ? 'text-gray-900' : 'text-white'}`}>
                      {formData.isSubscriptionActive ? 'Désactiver l\'accès à Xora' : 'Activer l\'accès à Xora'}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setShowSubscriptionModal(false)}
                    className={`p-2 rounded-full transition-colors ${formData.isSubscriptionActive ? 'hover:bg-gray-200 text-gray-400' : 'hover:bg-white/20 text-white'}`}
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-12 space-y-10">
                  <p className="text-lg text-gray-600 text-center leading-relaxed">
                    Vous êtes sur le point de {formData.isSubscriptionActive ? 'désactiver' : 'activer'} l'accès à Xora pour <span className="font-bold text-gray-900">{formatNameFirstLast(formData.firstName, formData.lastName)}</span>, êtes-vous sûr ?
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button 
                      onClick={() => setShowSubscriptionModal(false)}
                      className="flex-1 w-full flex items-center justify-center gap-3 py-4 bg-gray-50 text-gray-600 rounded-2xl text-[15px] font-bold hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      <X size={20} />
                      {formData.isSubscriptionActive ? 'Non, je garde l\'abonnement' : 'Non, je ne prends pas d\'abonnement'}
                    </button>
                    <button 
                      onClick={async () => {
                        const newStatus = !formData.isSubscriptionActive;
                        
                        // Update subscription status and role automatically
                        setFormData(prev => ({
                          ...prev,
                          isSubscriptionActive: newStatus,
                          role: !newStatus ? 'Aucun' : (prev.role === 'Aucun' ? 'Concepteur.rice' : prev.role)
                        }));
                        setHasUnsavedChanges(true);
                        
                        try {
                          if (newStatus) {
                            // Activation
                            const inviteEmail = formData.email.toLowerCase().trim();
                            const appUrl = 'https://app.xora.fr/';
                            const registrationLink = `${appUrl}?view=register&inviteId=${adminProfile?.companyId || userProfile?.companyId}&email=${encodeURIComponent(inviteEmail)}&firstName=${encodeURIComponent(formData.firstName)}&lastName=${encodeURIComponent(formData.lastName)}&role=${encodeURIComponent(formData.metier[0] || 'Agenceur')}&hasSubscription=true`;

                            // Email to collaborator
                            await addDoc(collection(db, 'invitations'), {
                              to: inviteEmail,
                              message: {
                                subject: `🚀 Rejoignez l'équipe de ${adminProfile?.companyName || 'Xora'}`,
                                html: `
                                  <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 24px; padding: 40px; color: #111827; background-color: #ffffff;">
                                    <div style="text-align: center; margin-bottom: 32px;">
                                      <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">XORA <span style="color: #6366f1;">CRM</span></h1>
                                    </div>
                                    
                                    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Bonjour ${formData.firstName},</h2>
                                    
                                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
                                      <strong>${adminProfile?.name || 'Un administrateur'}</strong> vous invite à rejoindre l'espace collaborateur de <strong>${adminProfile?.companyName || 'votre agence'}</strong>.
                                    </p>
                                    
                                    <div style="text-align: center; margin: 40px 0;">
                                      <a href="${registrationLink}" style="background-color: #111827; color: #ffffff; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                                        Accepter l'invitation
                                      </a>
                                    </div>
                                    
                                    <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px; border-top: 1px solid #f3f4f6; pt: 24px;">
                                      Si le bouton ne fonctionne pas, copiez ce lien : <br/>
                                      <span style="word-break: break-all; color: #6366f1;">${registrationLink}</span>
                                    </p>
                                  </div>
                                `,
                              },
                              meta: {
                                ...formData,
                                companyId: adminProfile?.companyId || userProfile?.companyId,
                                invitedBy: adminProfile?.name,
                                invitedByUid: adminProfile?.uid,
                                status: 'pending',
                                createdAt: serverTimestamp()
                              }
                            });

                            // Notification à bonjour@xora.fr
                            await addDoc(collection(db, 'invitations'), {
                              to: 'bonjour@xora.fr',
                              message: {
                                subject: `🔔 Nouvelle adhésion Xora : ${formData.firstName} ${formData.lastName}`,
                                html: `
                                  <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 24px; padding: 40px; color: #111827; background-color: #ffffff;">
                                    <div style="text-align: center; margin-bottom: 32px;">
                                      <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">XORA <span style="color: #6366f1;">CRM</span></h1>
                                    </div>
                                    
                                    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">Nouvelle adhésion détectée</h2>
                                    
                                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
                                      Un collaborateur a été activé avec une <strong>licence Xora active</strong>.
                                    </p>
                                    
                                    <div style="background-color: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                                      <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Collaborateur</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formData.firstName} ${formData.lastName}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formData.email}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Société</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${adminProfile?.companyName || 'Non renseignée'}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Activé par</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${adminProfile?.name || 'Admin'}</td>
                                        </tr>
                                      </table>
                                    </div>
                                  </div>
                                `
                              }
                            });
                          } else {
                            // Deactivation notification to bonjour@xora.fr
                            await addDoc(collection(db, 'invitations'), {
                              to: 'bonjour@xora.fr',
                              message: {
                                subject: `⚠️ Désactivation Xora : ${formData.firstName} ${formData.lastName}`,
                                html: `
                                  <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 24px; padding: 40px; color: #111827; background-color: #ffffff;">
                                    <div style="text-align: center; margin-bottom: 32px;">
                                      <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">XORA <span style="color: #6366f1;">CRM</span></h1>
                                    </div>
                                    
                                    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #ef4444;">Désactivation d'abonnement</h2>
                                    
                                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
                                      L'abonnement Xora de <strong>${formData.firstName} ${formData.lastName}</strong> a été désactivé.
                                    </p>
                                    
                                    <div style="background-color: #fef2f2; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                                      <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Collaborateur</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formData.firstName} ${formData.lastName}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formData.email}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Société</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${adminProfile?.companyName || 'Non renseignée'}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Désactivé par</td>
                                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${adminProfile?.name || 'Admin'}</td>
                                        </tr>
                                      </table>
                                    </div>
                                  </div>
                                `
                              }
                            });
                          }
                        } catch (err) {
                          console.error("Erreur notifications:", err);
                        }

                        setShowSubscriptionModal(false);
                      }}
                      className="flex-1 w-full flex items-center justify-center gap-3 py-4 bg-white text-gray-900 rounded-2xl text-[15px] font-bold hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
                    >
                      <CheckCircle2 size={20} className="text-gray-900" />
                      {formData.isSubscriptionActive ? 'Oui désactiver l\'abonnement Xora' : 'Oui activer l\'abonnement Xora'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved Changes Error Modal */}
          {showUnsavedError && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[250] p-4">
              <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 bg-red-50 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <X size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Modifications non enregistrées</h2>
                  <p className="text-sm text-gray-500 font-medium">
                    Vous avez effectué des modifications sur ce profil. Vous devez cliquer sur <span className="font-bold text-gray-900">"Enregistrer"</span> avant de pouvoir quitter cette page.
                  </p>
                </div>
                <div className="p-6 bg-white flex flex-col gap-3">
                  <button 
                    onClick={() => setShowUnsavedError(false)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg"
                  >
                    Continuer l'édition
                  </button>
                  <button 
                    onClick={() => {
                      setHasUnsavedChanges(false);
                      setShowUnsavedError(false);
                      onBack?.();
                    }}
                    className="w-full py-4 bg-white text-red-600 border border-red-100 rounded-2xl text-sm font-bold hover:bg-red-50 transition-all"
                  >
                    Quitter sans enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
