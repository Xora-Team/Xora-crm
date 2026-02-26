
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronDown, Plus, Loader2, MapPin, Search, Check, User, Info, ShieldCheck, Link, Save, Truck } from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from '@firebase/firestore';
import { Client } from '../types';

// Structure de données mise à jour selon le fichier CSV
const HIERARCHY_DATA: Record<string, Record<string, string[]>> = {
  "Prospection": {
    "terrain": ["voisin", "porte-à porte", "Tour de chantier"],
    "téléphonique": ["Appel froid"]
  },
  "Parrainage": {
    "Spontanné": [],
    "Bon de parrainage": []
  },
  "Prescripteur": {
    "Architecte": [],
    "Artisan": [],
    "Courtier": [],
    "Décorateur": [],
    "Boutiques voisines": [],
    "Fournisseur": []
  },
  "Anciens clients": {
    "Général": []
  },
  "Notoriété entreprise": {
    "Général": []
  },
  "Digital": {
    "Réseaux sociaux": ["Facebook", "Instagram", "Linkedin", "Tik-tok", "YouTube", "Pinterest"],
    "Pub digitales": ["Google Ads", "Facebook Ads", "Instagram Ads"],
    "Web": ["Recherche Google", "Google maps", "Waze", "Avis Google", "Avis en lignes divers", "Pages jaunes", "Forum"],
    "IA": ["ChatGPT", "Gemini", "Claude", "Mistral"],
    "Site web entreprise": ["Formulaire contact", "Prise de rdv en ligne", "Chatbot"]
  },
  "Marketing": {
    "Emailing": ["Newsletter", "Email promo"],
    "SMS marketing": [],
    "Affichage": ["4x3", "Abribus", "Panneau chantier", "Véhicule floqué"],
    "Magazine": [],
    "Journal gratuit": [],
    "Publication pro": [],
    "Radio": [],
    "Pages jaunes": [],
    "Evenementiel": ["Salon", "Foire", "Galerie commerciale"],
    "Evènements showroom": ["Portes ouvertes", "Innauguration", "Anniversaire", "Démo culinaires", "Autres"]
  },
  "Réseaux pro": {
    "BNI": [],
    "Club entrepreneurs": ["Club 1", "Club 2", "Club 3", "Club 4"],
    "Groupements métiers": []
  },
  "Passage devant showroom": {
    "Spontanné": [],
    "Promo vitrine": [],
    "PLV": []
  },
  "Cercle proche": {
    "Famille": [],
    "Amis": []
  },
  "Autres": {
    "Autre": []
  }
};

const SUPPLIER_HIERARCHY: Record<string, Record<string, string[]>> = {
  "Achat marchandises": {
    "Cuisine": ["Électroménager", "Évier", "Meuble de cuisine", "Plan de travail", "Accessoires cuisines", "Robinetterie cuisine"],
    "Salle de bain": ["Meuble de salle de bain", "Paroi", "Baignoire", "Robinetterie", "Sanitaire"],
    "Aménagement extérieur": ["Brasero", "Cuisine extérieure"],
    "Revêtement": ["Carrelage", "Parquet", "Stratifié", "Revêtement sol souple", "Peinture", "Béton Ciré", "Accessoires Peintures", "Toiles tendus"],
    "Menuiserie": ["Fenêtres", "Porte d'entrée", "Porte de garage", "Volets", "Pergolas - Carport", "Portail", "Clôtures", "Moustiquaire", "Store banne", "Store Intérieur", "Porte Intérieure", "Porte Placard", "Dressing / Placard", "Quincaillerie", "Miroiterie", "Garde Corps", "Motorisation"],
    "Mobilier": ["Canapé", "Meuble salon", "Table et chaise", "Mobilier bureau", "Accessoires salon", "Literie", "Luminaire"],
    "Transport": ["cuisine", "revêtement", "menuiserie"]
  },
  "Sous traitant": {
    "Cuisine": [],
    "Menuiserie": [],
    "Salle de bain": []
  },
  "Frais généraux": {
    "Général": ["Assurances", "Eau/edf", "Location matériel", "Location Véhicule", "Marketing", "Informatique", "Fournitures", "Entretien", "Téléphonie", "Loyer local"]
  },
  "Institutionnel": {
    "Général": ["Avocat", "Banque", "Comptable", "Formation", "Impôt", "Juridique", "Mutuelle", "Social"]
  }
};

const MultiSelect = ({ value, onChange, options, placeholder = "Sélectionner", disabled = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    const current = Array.isArray(value) ? value : [];
    const newValue = current.includes(opt)
      ? current.filter(v => v !== opt)
      : [...current, opt];
    onChange(newValue);
  };

  const displayValue = () => {
    if (!Array.isArray(value) || value.length === 0) return placeholder;
    return value.join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 text-[13px] transition-all shadow-sm ${
          disabled ? 'bg-gray-50 text-gray-400 border-gray-100' : 'border-gray-200 hover:border-gray-900'
        }`}
      >
        <span className={`font-bold truncate ${!Array.isArray(value) || value.length === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
          {displayValue()}
        </span>
        {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
            {options.map((opt: string) => {
              const isSelected = Array.isArray(value) && value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-xl transition-all mb-0.5 group ${
                    isSelected ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-[13px] ${isSelected ? 'font-bold' : 'font-medium'}`}>{opt}</span>
                  {isSelected && <Check size={14} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onClientCreated?: (clientId: string, clientName: string) => void;
  clientToEdit?: Client | null; 
  mode?: 'contacts' | 'suppliers' | 'artisans' | 'prescribers';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, userProfile, onClientCreated, clientToEdit, mode = 'contacts' }) => {
  const isEdit = !!clientToEdit;
  const isSupplier = mode === 'suppliers';
  
  const [isLoading, setIsLoading] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // États pour les membres de l'équipe (agenceurs)
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // États pour le parrainage
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [sponsorSuggestions, setSponsorSuggestions] = useState<any[]>([]);
  const [showSponsorResults, setShowSponsorResults] = useState(false);
  const sponsorSearchRef = useRef<HTMLDivElement>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<{id: string, name: string} | null>(null);

  // État pour la popup info RGPD
  const [showRgpdInfo, setShowRgpdInfo] = useState(false);

  const [formData, setFormData] = useState({
    civility: isSupplier ? 'SAS' : 'Mme',
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    lat: null as number | null,
    lng: null as number | null,
    complement: '',
    category: '', 
    origin: '',   
    subOrigin: '', 
    referent: userProfile?.name || '',
    sponsorLink: '', 
    rgpd: false,
    website: '',
    selectionStatus: 'En cours de sélection',
    supplierType: '',
    branch: '',
    trades: [] as string[]
  });

  // Reset form when opening or changing clientToEdit
  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        const details = clientToEdit.details || {};
        setFormData({
          civility: details.civility || (isSupplier ? 'SAS' : 'Mme'),
          lastName: details.lastName || '',
          firstName: details.firstName || '',
          email: details.email || '',
          phone: details.phone || '',
          address: details.address || '',
          city: details.city || '',
          postcode: details.postcode || '',
          lat: details.lat || null,
          lng: details.lng || null,
          complement: details.complement || '',
          category: details.category || '',
          origin: clientToEdit.origin || '',
          subOrigin: details.subOrigin || '',
          referent: details.referent || clientToEdit.addedBy?.name || '',
          sponsorLink: details.sponsorLink || '',
          rgpd: details.rgpd || false,
          website: details.website || '',
          selectionStatus: details.selectionStatus || 'En cours de sélection',
          supplierType: details.supplierType || '',
          branch: details.branch || '',
          trades: details.trades || []
        });
        setAddressSearch(details.address || '');
        if (details.sponsorId && details.sponsorName) {
            setSelectedSponsor({ id: details.sponsorId, name: details.sponsorName });
        } else {
            setSelectedSponsor(null);
        }
      } else {
        setFormData({
          civility: isSupplier ? 'SAS' : 'Mme',
          lastName: '',
          firstName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          postcode: '',
          lat: null,
          lng: null,
          complement: '',
          category: isSupplier ? 'Autres' : '',
          origin: isSupplier ? 'Autre' : '',
          subOrigin: '',
          referent: userProfile?.name || '',
          sponsorLink: '',
          rgpd: false,
          website: '',
          selectionStatus: 'En cours de sélection',
          supplierType: '',
          branch: '',
          trades: []
        });
        setAddressSearch('');
        setSponsorSearch('');
        setSelectedSponsor(null);
      }
    }
  }, [isOpen, userProfile, clientToEdit, isSupplier]);

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen && userProfile?.companyId) {
      const fetchTeam = async () => {
        try {
          const q = query(
            collection(db, 'users'),
            where('companyId', '==', userProfile.companyId)
          );
          const snap = await getDocs(q);
          const members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTeamMembers(members);
        } catch (e) {
          console.error("Erreur lors de la récupération des membres de l'équipe :", e);
        }
      };
      fetchTeam();
    }
  }, [isOpen, userProfile?.companyId]);

  // BAN API logic
  useEffect(() => {
    const fetchAddresses = async () => {
      if (addressSearch.length < 4 || (isEdit && addressSearch === clientToEdit?.details?.address)) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressSearch)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        console.error("Erreur API Adresse:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchAddresses, 300);
    return () => clearTimeout(timer);
  }, [addressSearch, isEdit, clientToEdit]);

  // Recherche parrain dans l'annuaire
  useEffect(() => {
    const searchSponsor = async () => {
      if (sponsorSearch.length < 2 || !userProfile?.companyId) {
        setSponsorSuggestions([]);
        return;
      }
      try {
        const q = query(
          collection(db, 'clients'), 
          where('companyId', '==', userProfile.companyId)
        );
        const snap = await getDocs(q);
        const normalizedQuery = sponsorSearch.toLowerCase();
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(c => c.name.toLowerCase().includes(normalizedQuery))
          .slice(0, 5);
        setSponsorSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    };

    const timer = setTimeout(searchSponsor, 300);
    return () => clearTimeout(timer);
  }, [sponsorSearch, userProfile?.companyId]);

  // Logic pour la cascade d'origines
  const categories = useMemo(() => Object.keys(HIERARCHY_DATA), []);
  const origins = useMemo(() => formData.category ? Object.keys(HIERARCHY_DATA[formData.category] || {}) : [], [formData.category]);
  const subOrigins = useMemo(() => (formData.category && formData.origin) ? (HIERARCHY_DATA[formData.category]?.[formData.origin] || []) : [], [formData.category, formData.origin]);

  // Logic pour la cascade fournisseur
  const supplierTypes = useMemo(() => Object.keys(SUPPLIER_HIERARCHY), []);
  const supplierBranches = useMemo(() => formData.supplierType ? Object.keys(SUPPLIER_HIERARCHY[formData.supplierType] || {}) : [], [formData.supplierType]);
  const supplierTrades = useMemo(() => (formData.supplierType && formData.branch) ? (SUPPLIER_HIERARCHY[formData.supplierType]?.[formData.branch] || []) : [], [formData.supplierType, formData.branch]);

  const handleSelectAddress = (feature: any) => {
    const props = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;

    setFormData({
      ...formData,
      address: props.label, 
      city: props.city,
      postcode: props.postcode,
      lat: lat,
      lng: lng
    });
    setAddressSearch(props.label);
    setShowSuggestions(false);
  };

  // Formateur de téléphone : ajoute un espace tous les 2 chiffres
  const formatPhone = (val: string) => {
    const numbers = val.replace(/\D/g, ''); 
    const limited = numbers.substring(0, 10);
    return limited.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleAcceptRgpd = () => {
    setFormData(prev => ({ ...prev, rgpd: true }));
    setShowRgpdInfo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyId = userProfile?.companyId;
    if (!companyId) {
      alert("Erreur : Impossible de lier ce client à votre société.");
      return;
    }
    
    setIsLoading(true);
    try {
      // Formatage du nom : Prénom (Casse mixte), Nom (MAJUSCULES)
      let finalName = "";
      if (isSupplier) {
        finalName = formData.lastName.trim().toUpperCase();
      } else {
        const firstNameTrimmed = formData.firstName.trim();
        const capitalizedFirstName = firstNameTrimmed.charAt(0).toUpperCase() + firstNameTrimmed.slice(1).toLowerCase();
        const lastNameUpper = formData.lastName.trim().toUpperCase();
        finalName = `${capitalizedFirstName} ${lastNameUpper}`;
      }
      
      const clientData: any = {
        name: finalName,
        origin: isSupplier ? formData.supplierType : formData.origin,
        category: isSupplier ? formData.supplierType : formData.category,
        location: formData.city || 'Non renseignée',
        directoryType: mode,
        details: {
          ...formData,
          sponsorId: selectedSponsor?.id || null,
          sponsorName: selectedSponsor?.name || null,
        }
      };

      if (isEdit && clientToEdit) {
        // Mode Mise à jour
        const clientRef = doc(db, 'clients', clientToEdit.id);
        await updateDoc(clientRef, clientData);
        onClose();
      } else {
        // Mode Création
        const newClient = {
          ...clientData,
          addedBy: {
            uid: userProfile.uid,
            name: userProfile.name,
            avatar: userProfile.avatar
          },
          status: isSupplier ? 'Client' : 'Leads', 
          dateAdded: new Date().toLocaleDateString('fr-FR'),
          companyId: companyId,
          projectCount: 0
        };
        newClient.details.createdAt = new Date().toISOString();

        const docRef = await addDoc(collection(db, 'clients'), newClient);
        
        if (onClientCreated) {
          onClientCreated(docRef.id, finalName);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("Erreur creation/edition:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (sponsorSearchRef.current && !sponsorSearchRef.current.contains(event.target as Node)) {
        setShowSponsorResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-30">
              <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg border shadow-sm transition-colors ${isEdit ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                       {isEdit ? <Save size={20} /> : (isSupplier ? <Truck size={20} /> : <Plus size={20} />)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                        {isEdit ? "Modifier la fiche" : (isSupplier ? "Créer un nouveau fournisseur" : "Créer une fiche lead")}
                    </h2>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Société : {userProfile?.companyName || 'Chargement...'}</p>
                  </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
                  <X size={20} />
              </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
              
              {/* Identité */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className={isSupplier ? "md:col-span-4" : "md:col-span-3"}>
                      <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        {isSupplier ? "Forme société" : "Civilité client*"}
                      </label>
                      <div className="relative">
                          {isSupplier ? (
                            <select 
                              value={formData.civility}
                              onChange={(e) => setFormData({...formData, civility: e.target.value})}
                              className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all"
                            >
                                <option>SAS</option>
                                <option>SARL</option>
                                <option>SA</option>
                                <option>EURL</option>
                                <option>Auto entrepreneur</option>
                                <option>SNC</option>
                                <option>Autre</option>
                            </select>
                          ) : (
                            <select 
                              value={formData.civility}
                              onChange={(e) => setFormData({...formData, civility: e.target.value})}
                              className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all"
                            >
                                <option>Mme</option>
                                <option>M.</option>
                            </select>
                          )}
                           <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                      </div>
                  </div>
                  <div className={isSupplier ? "md:col-span-8" : "md:col-span-4"}>
                      <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        {isSupplier ? "Nom du fournisseur*" : "Nom du contact*"}
                      </label>
                      <input 
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                        type="text" 
                        placeholder={isSupplier ? "Ex: CUISINES PLUS" : "Ex: DUBOIS"} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all" 
                      />
                  </div>
                  {isSupplier && (
                    <div className="md:col-span-12">
                        <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Site internet</label>
                        <div className="relative group">
                          <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900" size={18} />
                          <input 
                            value={formData.website}
                            onChange={(e) => setFormData({...formData, website: e.target.value})}
                            type="url" 
                            placeholder="https://www.exemple.com" 
                            className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all placeholder:text-gray-300" 
                          />
                          {formData.website && (
                            <a 
                              href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all"
                            >
                              <Link size={14} />
                            </a>
                          )}
                        </div>
                    </div>
                  )}
                  {!isSupplier && (
                    <div className="md:col-span-5">
                        <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Prénom du contact*</label>
                        <input 
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          type="text" 
                          placeholder="Ex: Chloé" 
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all" 
                        />
                    </div>
                  )}
              </div>

              {/* Coordonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        {isSupplier ? "Email fournisseur*" : "Email professionnel"}
                      </label>
                      <input 
                        required={isSupplier}
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        type="email" 
                        placeholder="pro@exemple.com" 
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all placeholder:text-gray-300" 
                      />
                  </div>
                  <div>
                       <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        {isSupplier ? "Téléphone fixe fournisseur*" : "Téléphone portable"}
                       </label>
                       <div className="flex">
                          <div className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-800">
                              <span className="text-lg mr-1">🇫🇷</span>
                              <ChevronDown size={14} className="text-gray-300" />
                          </div>
                          <input 
                            required={isSupplier}
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            type="text" 
                            placeholder={isSupplier ? "04 67 00 00 00" : "06 12 34 56 78"} 
                            className="flex-1 bg-white border border-gray-200 rounded-r-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all placeholder:text-gray-300" 
                          />
                       </div>
                  </div>
              </div>

               {/* Adresse */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative" ref={searchRef}>
                      <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        {isSupplier ? "Adresse du fournisseur" : "Adresse du bien*"}
                      </label>
                      <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-indigo-500' : 'text-gray-300 group-focus-within:text-gray-900'}`} size={18} />
                        <input 
                          required={!isSupplier}
                          value={addressSearch}
                          onChange={(e) => {
                            setAddressSearch(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          type="text" 
                          placeholder="Ex: 7 rue de Provence..." 
                          className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-gray-900 transition-all placeholder:text-gray-300" 
                        />
                        {isSearching && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                          </div>
                        )}
                      </div>

                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200">
                          {suggestions.map((feature: any) => (
                            <button
                              key={feature.properties.id}
                              type="button"
                              onClick={() => handleSelectAddress(feature)}
                              className="w-full px-5 py-4 text-left hover:bg-indigo-50/50 flex items-start gap-4 border-b border-gray-50 last:border-0 group transition-all"
                            >
                              <div className="mt-1 p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover:text-indigo-600 group-hover:bg-white transition-all">
                                <MapPin size={16} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-gray-900">{feature.properties.label}</span>
                                <span className="text-[11px] text-gray-400 font-medium">{feature.properties.postcode} {feature.properties.city}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Complément d'adresse</label>
                      <input 
                        value={formData.complement}
                        onChange={(e) => setFormData({...formData, complement: e.target.value})}
                        type="text" 
                        placeholder="Appartement, Étage, Bâtiment..." 
                        className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900 transition-all placeholder:text-gray-300" 
                      />
                  </div>
              </div>

               {/* Origine hiérarchique (Masqué ou simplifié pour les fournisseurs) */}
              {isSupplier && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Statut sélection*</label>
                            <div className="relative">
                                <select 
                                  required
                                  value={formData.selectionStatus}
                                  onChange={(e) => setFormData({...formData, selectionStatus: e.target.value})}
                                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-gray-900 transition-all shadow-sm"
                                >
                                    <option value="">Sélectionner</option>
                                    <option>En cours de sélection</option>
                                    <option>Sélectionné</option>
                                    <option>Terminé</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Type fournisseur*</label>
                            <div className="relative">
                                <select 
                                  value={formData.supplierType}
                                  onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData({...formData, supplierType: val, branch: '', trades: []});
                                  }}
                                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                                >
                                    <option value="">Sélectionner</option>
                                    {supplierTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Branche*</label>
                            <div className="relative">
                                <select 
                                  disabled={!formData.supplierType}
                                  value={formData.branch}
                                  onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData({...formData, branch: val, trades: []});
                                  }}
                                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-100"
                                >
                                    <option value="">Sélectionner</option>
                                    {supplierBranches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Métiers*</label>
                            <MultiSelect 
                                disabled={!formData.branch}
                                value={formData.trades}
                                onChange={(val: string[]) => setFormData({...formData, trades: val})}
                                options={supplierTrades}
                                placeholder="Sélectionner"
                            />
                        </div>
                    </div>
                </div>
              )}

              {!isSupplier && (
                <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-1">Origine du contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Origine*</label>
                            <div className="relative">
                                <select 
                                  value={formData.category}
                                  onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData({...formData, category: val, origin: '', subOrigin: ''});
                                      if(val !== 'Parrainage') {
                                        setSelectedSponsor(null);
                                        setFormData(prev => ({ ...prev, sponsorLink: '' }));
                                      }
                                  }}
                                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                                >
                                    <option value="">Sélectionner</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Sous-origine*</label>
                            <div className="relative">
                                <select 
                                  disabled={!formData.category}
                                  value={formData.origin}
                                  onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData({...formData, origin: val, subOrigin: ''});
                                      if(val !== 'Parrainage' && formData.category !== 'Parrainage') {
                                        setSelectedSponsor(null);
                                        setFormData(prev => ({ ...prev, sponsorLink: '' }));
                                      }
                                  }}
                                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-100"
                                >
                                    <option value="">Sélectionner</option>
                                    {origins.map(orig => <option key={orig} value={orig}>{orig}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Sources</label>
                            <div className="relative">
                                <select 
                                  disabled={!formData.origin}
                                  value={formData.subOrigin}
                                  onChange={(e) => setFormData({...formData, subOrigin: e.target.value})}
                                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-100"
                                >
                                    <option value="">Sélectionner</option>
                                    {subOrigins.map(so => <option key={so} value={so}>{so}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Bloc Parrainage (Conditionnel - Apparaît si l'Origine OU la Sous-origine est Parrainage) */}
                    {(formData.category === 'Parrainage' || formData.origin === 'Parrainage') && (
                      <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                              <Plus size={14} className="text-indigo-600" />
                              <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Identification du Parrain</h4>
                          </div>
                          
                          <div className="relative" ref={sponsorSearchRef}>
                              {selectedSponsor ? (
                                  <div className="flex items-center justify-between bg-white border border-indigo-200 rounded-xl px-5 py-4 shadow-sm animate-in zoom-in-95">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                              <User size={16} />
                                          </div>
                                          <div>
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Parrain sélectionné</p>
                                              <p className="text-sm font-black text-gray-900 uppercase">{selectedSponsor.name}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <Check size={18} className="text-green-500" />
                                          <button 
                                              type="button"
                                              onClick={() => { setSelectedSponsor(null); setSponsorSearch(''); }}
                                              className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-all"
                                          >
                                              <X size={18} />
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <div className="relative group">
                                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                          <input 
                                              value={sponsorSearch}
                                              onChange={(e) => {
                                                  setSponsorSearch(e.target.value);
                                                  setShowSponsorResults(true);
                                              }}
                                              onFocus={() => setShowSponsorResults(true)}
                                              type="text" 
                                              placeholder="Rechercher le parrain dans l'annuaire (ex: DUBOIS)..." 
                                              className="w-full pl-12 pr-10 py-3.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-indigo-200" 
                                          />
                                      </div>

                                      {showSponsorResults && sponsorSuggestions.length > 0 && (
                                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95">
                                              {sponsorSuggestions.map((sponsor) => (
                                                  <button
                                                      key={sponsor.id}
                                                      type="button"
                                                      onClick={() => {
                                                          setSelectedSponsor({ id: sponsor.id, name: sponsor.name });
                                                          // AUTO-ASSIGN REFERENT FROM SPONSOR
                                                          if (sponsor.details?.referent) {
                                                            setFormData(prev => ({ ...prev, referent: sponsor.details.referent }));
                                                          } else if (sponsor.addedBy?.name) {
                                                            setFormData(prev => ({ ...prev, referent: sponsor.addedBy.name }));
                                                          }
                                                          setShowSponsorResults(false);
                                                      }}
                                                      className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-center gap-4 border-b border-gray-50 last:border-0 group transition-all"
                                                  >
                                                      <div className="p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover:text-indigo-600 transition-all">
                                                          <User size={16} />
                                                      </div>
                                                      <div className="flex flex-col">
                                                          <span className="text-[13px] font-bold text-gray-900 uppercase">{sponsor.name}</span>
                                                          <span className="text-[11px] text-gray-400 font-medium">{sponsor.location || 'Localisation non définie'}</span>
                                                      </div>
                                                  </button>
                                              ))}
                                          </div>
                                      )}
                                      {showSponsorResults && sponsorSearch.length >= 2 && sponsorSuggestions.length === 0 && (
                                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-6 text-center z-50">
                                              <p className="text-xs font-bold text-gray-400 italic">Aucun client trouvé pour cette recherche.</p>
                                          </div>
                                      )}
                                  </>
                              )}
                          </div>

                          {/* Champ Lien Parrain */}
                          <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Lien parrain</label>
                            <div className="relative group">
                              <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-600 transition-colors" size={16} />
                              <input 
                                type="text" 
                                value={formData.sponsorLink}
                                onChange={(e) => setFormData({...formData, sponsorLink: e.target.value})}
                                placeholder="Ex: Cousin, Ami, Voisin, Collègue..." 
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm placeholder:text-indigo-200" 
                              />
                            </div>
                          </div>
                      </div>
                    )}
                </div>
              )}

              {/* Agenceur référent */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        {isSupplier ? "Responsable fournisseur*" : "Agenceur référant*"}
                      </label>
                      <div className="relative group">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
                              <img 
                                src={teamMembers.find(m => m.name === formData.referent)?.avatar || userProfile?.avatar} 
                                alt="" 
                                className="w-7 h-7 rounded-full border border-white shadow-sm" 
                              />
                          </div>
                          <select 
                            value={formData.referent}
                            onChange={(e) => setFormData({...formData, referent: e.target.value})}
                            className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-10 text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                          >
                              {teamMembers.map((member) => (
                                <option key={member.id} value={member.name}>
                                  {member.name} {member.uid === userProfile?.uid ? '(Moi)' : ''}
                                </option>
                              ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                            <div className="flex items-center gap-1">
                              <Check size={14} className="text-green-500" />
                              <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter">Attribué</span>
                            </div>
                            <ChevronDown size={16} className="text-gray-300" />
                          </div>
                      </div>
                  </div>
              </div>

              {/* RGPD (Optionnel pour fournisseurs) */}
              {!isSupplier && (
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Consentement RGPD</p>
                          <button 
                            type="button" 
                            onClick={() => setShowRgpdInfo(true)}
                            className="text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1"
                          >
                            <span className="text-[10px] font-bold border-b border-indigo-200">En savoir plus</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium italic mt-0.5">Obligatoire pour les communications marketing</p>
                      </div>
                      <div className="flex items-center space-x-4">
                          <span className={`text-sm font-bold transition-colors ${!formData.rgpd ? 'text-gray-900' : 'text-gray-300'}`}>Non</span>
                          <button 
                              type="button"
                              onClick={() => setFormData({...formData, rgpd: !formData.rgpd})}
                              className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-sm ${formData.rgpd ? 'bg-indigo-600' : 'bg-gray-300'}`}
                          >
                              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${formData.rgpd ? 'right-1' : 'left-1'}`}></div>
                          </button>
                          <span className={`text-sm font-bold transition-colors ${formData.rgpd ? 'text-gray-900' : 'text-gray-300'}`}>Oui</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                      En cochant "Oui", le client accepte que ses données personnelles soient traitées pour la gestion de son projet et l'envoi de communications commerciales XORA.
                    </p>
                </div>
              )}
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-gray-100 flex justify-center bg-[#FBFBFB]">
              <button 
                type="submit"
                disabled={
                  isLoading || 
                  !userProfile?.companyId || 
                  (isSupplier ? (
                    !formData.lastName || 
                    !formData.email || 
                    !formData.phone || 
                    !formData.selectionStatus || 
                    !formData.supplierType || 
                    !formData.branch || 
                    formData.trades.length === 0
                  ) : (
                    !formData.lastName || 
                    !formData.firstName || 
                    !addressSearch || 
                    !formData.category || 
                    !formData.origin || 
                    (formData.category === 'Parrainage' && !selectedSponsor)
                  ))
                }
                className={`flex items-center space-x-3 px-12 py-4 text-white rounded-2xl text-[15px] font-bold shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group ${isEdit ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-gray-900 hover:bg-black shadow-gray-200'}`}
              >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    isEdit ? <Save size={20} /> : (isSupplier ? <Check size={20} /> : <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />)
                  )}
                  <span>{isLoading ? 'Enregistrement en cours...' : (isEdit ? 'Enregistrer les modifications' : (isSupplier ? 'Créer la fiche fournisseur' : 'Créer la fiche lead'))}</span>
              </button>
          </div>
        </form>
      </div>

      {/* Popup Informative RGPD */}
      {showRgpdInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Protection de vos données</h3>
              </div>
              <button 
                onClick={() => setShowRgpdInfo(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                En validant, vous acceptez que vos données personnelles soient traitées par <strong>Xora</strong>, logiciel de gestion pour agenceurs :
              </p>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Responsable du traitement</h4>
                  <p className="text-[13px] text-gray-700 font-medium">Xora (éditeur du logiciel).</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Finalité du traitement</h4>
                  <p className="text-[13px] text-gray-700 font-medium leading-relaxed">Gestion de votre projet d’agencement, suivi de chantier, communication avec l’agenceur, facturation et support.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Base légale</h4>
                  <p className="text-[13px] text-gray-700 font-medium leading-relaxed">Votre consentement et/ou l’exécution d’un contrat.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Durée de conservation</h4>
                  <p className="text-[13px] text-gray-700 font-medium leading-relaxed">Vos données sont conservées pendant la durée du projet et jusqu’à 3 ans après le dernier contact, sauf obligation légale contraire.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Accès aux données</h4>
                  <p className="text-[13px] text-gray-700 font-medium leading-relaxed">Vos informations sont accessibles uniquement à l’agenceur et à Xora en tant que prestataire technique. Elles ne sont jamais revendues ni utilisées à d’autres fins.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Vos droits</h4>
                  <p className="text-[13px] text-gray-700 font-medium leading-relaxed">Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d’un droit d’accès, de rectification, d’opposition, de suppression et de portabilité de vos données.</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Contact</h4>
                  <p className="text-[13px] text-gray-700 font-medium leading-relaxed">Pour exercer vos droits, vous pouvez écrire à : <span className="text-indigo-600 font-bold">contact@xora.fr</span></p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={handleAcceptRgpd}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modal;
