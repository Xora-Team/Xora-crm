
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, Search, MapPin, Loader2, Trash2, Check, User, Phone, Mail, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { Client } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, query, collection, where, getDocs } from '@firebase/firestore';

// Structure de données hiérarchique unifiée (Source de vérité)
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

// Formateur de téléphone : ajoute un espace tous les 2 chiffres
const formatPhone = (val: string) => {
  const numbers = val.replace(/\D/g, ''); 
  const limited = numbers.substring(0, 10);
  return limited.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
};

interface AdditionalContact {
  id: string;
  civility: string;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  fixed: string;
}

interface ContactCardProps {
  id: string;
  isMain: boolean;
  data: any;
  onFieldChange: (f: string, v: string) => void;
  onBlur: () => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ 
  id, 
  isMain, 
  data, 
  onFieldChange, 
  onBlur, 
  onRemove, 
  isExpanded, 
  onToggle 
}) => {
  const civilityOptions = ['Mr', 'Mme', 'Sci', 'Association', 'Sas', 'Société'];

  return (
    <div className={`border rounded-xl overflow-hidden mb-4 shadow-sm transition-all group ${isMain ? 'border-indigo-100 bg-white' : 'border-gray-200 bg-[#FBFBFB] hover:border-gray-300'}`}>
      <div 
        className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50/50 transition-colors" 
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
           <div className={`p-2 rounded-lg ${isMain ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
              <User size={16} />
           </div>
           <h4 className={`text-sm font-bold ${isMain ? 'text-gray-900' : 'text-gray-600'}`}>
             {isMain 
               ? (data.firstName || data.lastName ? `${data.firstName} ${data.lastName}` : "Contact principal") 
               : (data.firstName || data.lastName ? `${data.firstName} ${data.lastName}` : "Contact supplémentaire")
             }
           </h4>
           {!isMain && <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded text-[9px] font-black uppercase tracking-widest">Secondaire</span>}
        </div>
        <div className="flex items-center gap-2">
          {!isMain && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Supprimer ce contact"
            >
              <Trash2 size={16} />
            </button>
          )}
          <div className="p-1 hover:bg-gray-100 rounded text-gray-400">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-6 space-y-6 border-t border-gray-100 bg-white animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Civilité</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 transition-all shadow-sm" 
                  value={data.civility} 
                  onChange={(e) => onFieldChange('civility', e.target.value)}
                  onBlur={onBlur}
                >
                  {civilityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nom</label>
              <input 
                type="text" 
                value={data.lastName} 
                onChange={(e) => onFieldChange('lastName', e.target.value.toUpperCase())}
                onBlur={onBlur}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Prénom</label>
              <input 
                type="text" 
                value={data.firstName} 
                onChange={(e) => onFieldChange('firstName', e.target.value)}
                onBlur={onBlur}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input 
                  type="email" 
                  value={data.email} 
                  onChange={(e) => onFieldChange('email', e.target.value)}
                  onBlur={onBlur}
                  placeholder="email@exemple.com" 
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm placeholder:text-gray-300" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Portable</label>
              <div className="flex">
                <div className="flex items-center gap-1 px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-400">
                  <span className="text-sm">🇫🇷</span>
                </div>
                <input 
                  type="text" 
                  value={data.phone} 
                  onChange={(e) => onFieldChange('phone', formatPhone(e.target.value))}
                  onBlur={onBlur}
                  placeholder="06 12 34 56 78" 
                  className="flex-1 bg-white border border-gray-200 rounded-r-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fixe</label>
              <div className="flex">
                <div className="flex items-center gap-1 px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-400">
                  <span className="text-sm">🇫🇷</span>
                </div>
                <input 
                  type="text" 
                  value={data.fixed} 
                  onChange={(e) => onFieldChange('fixed', formatPhone(e.target.value))}
                  onBlur={onBlur}
                  placeholder="04 67 00 00 00" 
                  className="flex-1 bg-white border border-gray-200 rounded-r-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm" 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ClientContactGeneralProps {
  client: Client;
  userProfile: any;
}

const ClientContactGeneral: React.FC<ClientContactGeneralProps> = ({ client: initialClient, userProfile }) => {
  const [client, setClient] = useState<Client>(initialClient);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['main']));
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  
  const [mainContact, setMainContact] = useState({
    civility: '', lastName: '', firstName: '', email: '', phone: '', fixed: ''
  });
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clients', initialClient.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setClient({ id: docSnap.id, ...data } as Client);
        
        const details = data.details || {};
        const nameParts = data.name ? data.name.split(' ') : ['', ''];
        
        setMainContact({
          civility: details.civility || 'Mme',
          lastName: details.lastName || nameParts.slice(1).join(' ') || '',
          firstName: details.firstName || nameParts[0] || '',
          email: details.email || '',
          phone: details.phone || '',
          fixed: details.fixed || ''
        });

        setAdditionalContacts(details.additionalContacts || []);
      }
    });
    return () => unsub();
  }, [initialClient.id]);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    const fetchTeam = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('companyId', '==', userProfile.companyId)
        );
        const snap = await getDocs(q);
        const members = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setTeamMembers(members);
      } catch (e) {
        console.error("Erreur chargement équipe:", e);
      }
    };
    fetchTeam();
  }, [userProfile?.companyId]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveMainContactField = async (field: string, value: any) => {
    try {
      const updates: any = { [`details.${field}`]: value };
      if (field === 'firstName' || field === 'lastName') {
        const newFirstName = field === 'firstName' ? value : mainContact.firstName;
        const newLastName = field === 'lastName' ? value : mainContact.lastName;
        updates.name = `${newFirstName} ${newLastName}`.toUpperCase().trim();
      }
      await updateDoc(doc(db, 'clients', client.id), updates);
    } catch (e) { console.error(e); }
  };

  const addContact = async () => {
    if (additionalContacts.length >= 1) return;
    
    const newContact: AdditionalContact = {
      id: Date.now().toString(),
      civility: 'Mme',
      lastName: '',
      firstName: '',
      email: '',
      phone: '',
      fixed: ''
    };
    
    try {
      const updatedList = [...additionalContacts, newContact];
      await updateDoc(doc(db, 'clients', client.id), {
        "details.additionalContacts": updatedList
      });
      setExpandedIds(prev => new Set(prev).add(newContact.id));
    } catch (e) { console.error(e); }
  };

  const saveAdditionalContacts = async (list: AdditionalContact[]) => {
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        "details.additionalContacts": list
      });
    } catch (e) { console.error(e); }
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    try {
      const updated = additionalContacts.filter(c => c.id !== contactToDelete);
      await updateDoc(doc(db, 'clients', client.id), {
        "details.additionalContacts": updated
      });
      setContactToDelete(null);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const fetchAddr = async () => {
      if (addressSearch.length < 4 || addressSearch === client.details?.address) {
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
  }, [addressSearch, client.details?.address]);

  const handleSelectAddress = async (feature: any) => {
    const fullAddress = feature.properties.label;
    const city = feature.properties.city;
    const [longitude, latitude] = feature.geometry.coordinates;
    await updateDoc(doc(db, 'clients', client.id), {
      "details.address": fullAddress,
      "details.lat": latitude,
      "details.lng": longitude,
      "location": city
    });
    setIsEditingAddress(false);
    setAddressSearch('');
    setSuggestions([]);
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || isEditingAddress) return;
    const details = client.details || {};
    if (details.lat && details.lng) {
      if (mapRef.current) mapRef.current.remove();
      const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([details.lat, details.lng], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
      const color = client.status === 'Client' ? '#06b6d4' : client.status === 'Prospect' ? '#d946ef' : '#a855f7';
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7]
      });
      L.marker([details.lat, details.lng], { icon: customIcon }).addTo(map);
      mapRef.current = map;
    }
    return () => { if (mapRef.current) mapRef.current.remove(); mapRef.current = null; };
  }, [client.details?.lat, client.details?.lng, isEditingAddress, client.status]);

  // DERIVATION AUTOMATIQUE DES CHAMPS DEPUIS LE CLIENT
  const currentCategory = client.details?.category || '';
  const currentOrigin = client.origin || '';
  const currentSubOrigin = client.details?.subOrigin || '';

  const categories = useMemo(() => Object.keys(HIERARCHY_DATA), []);
  const origins = useMemo(() => currentCategory ? Object.keys(HIERARCHY_DATA[currentCategory] || {}) : [], [currentCategory]);
  const subOrigins = useMemo(() => (currentCategory && currentOrigin) ? (HIERARCHY_DATA[currentCategory]?.[currentOrigin] || []) : [], [currentCategory, currentOrigin]);

  const handleCategoryChange = async (val: string) => {
    await updateDoc(doc(db, 'clients', client.id), { "details.category": val, "origin": "", "details.subOrigin": "" });
  };

  const handleOriginChange = async (val: string) => {
    await updateDoc(doc(db, 'clients', client.id), { "origin": val, "details.subOrigin": "" });
  };

  const handleUpdateAffectation = async (field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        [`details.${field}`]: value
      });
    } catch (e) {
      console.error("Erreur affectation:", e);
    }
  };

  const hasSecondaryContact = additionalContacts.length >= 1;

  return (
    <div className="space-y-6 max-w-full animate-in fade-in duration-500 pb-20">
      
      {/* Section Coordonnées Dynamique */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Coordonnées & Contacts</h3>
          <button 
            onClick={addContact}
            disabled={hasSecondaryContact}
            className={`flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-[12px] font-bold shadow-sm transition-all active:scale-95 ${
              hasSecondaryContact 
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60 grayscale' 
              : 'bg-white text-gray-800 hover:border-[#A886D7]'
            }`}
          >
            <Plus size={16} className={hasSecondaryContact ? 'text-gray-400' : 'text-[#A886D7]'} /> Ajouter un contact secondaire
          </button>
        </div>

        <div className="space-y-2">
          <ContactCard 
            id="main" 
            isMain 
            data={mainContact} 
            isExpanded={expandedIds.has('main')}
            onToggle={() => toggleExpand('main')}
            onFieldChange={(f, v) => setMainContact(prev => ({...prev, [f]: v}))}
            onBlur={() => {
              saveMainContactField('civility', mainContact.civility);
              saveMainContactField('lastName', mainContact.lastName);
              saveMainContactField('firstName', mainContact.firstName);
              saveMainContactField('email', mainContact.email);
              saveMainContactField('phone', mainContact.phone);
              saveMainContactField('fixed', mainContact.fixed);
            }}
            onRemove={() => {}}
          />

          {additionalContacts.map((contact) => (
            <ContactCard 
              key={contact.id} 
              id={contact.id} 
              isMain={false}
              data={contact} 
              isExpanded={expandedIds.has(contact.id)}
              onToggle={() => toggleExpand(contact.id)}
              onFieldChange={(f, v) => {
                const newList = additionalContacts.map(c => c.id === contact.id ? { ...c, [f]: v } : c);
                setAdditionalContacts(newList);
              }}
              onBlur={() => saveAdditionalContacts(additionalContacts)}
              onRemove={() => setContactToDelete(contact.id)}
            />
          ))}
        </div>
      </div>

      {/* Section Adresse + Map */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Lieu du bien principal</h3>
          {isEditingAddress && <button onClick={() => setIsEditingAddress(false)} className="text-[11px] font-bold text-red-500 hover:underline">Annuler</button>}
        </div>
        {isEditingAddress ? (
          <div className="space-y-3 animate-in fade-in duration-300" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input autoFocus type="text" placeholder="Entrez l'adresse..." value={addressSearch} onChange={(e) => setAddressSearch(e.target.value)} className="w-full bg-[#FBFBFB] border border-gray-100 rounded-xl pl-12 pr-10 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-400 transition-all shadow-inner" />
              {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>}
            </div>
            {suggestions.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50">
                {suggestions.map((feature: any) => (<button key={feature.properties.id} type="button" onClick={() => handleSelectAddress(feature)} className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-start gap-4 border-b border-gray-50 last:border-0 group transition-all"><div className="mt-1 p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover:text-indigo-600 transition-all"><MapPin size={16} /></div><div className="flex flex-col"><span className="text-[13px] font-bold text-gray-900">{feature.properties.name}</span><span className="text-[11px] text-gray-400">{feature.properties.postcode} {feature.properties.city}</span></div></button>))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {client.details?.address ? (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2 h-[220px] rounded-2xl overflow-hidden border border-gray-100 shadow-inner relative"><div ref={mapContainerRef} className="w-full h-full z-0" /><div className="absolute top-3 left-3 z-10"><div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-100 shadow-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: client.status === 'Client' ? '#06b6d4' : client.status === 'Prospect' ? '#d946ef' : '#a855f7' }}></div><span className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">{client.status}</span></div></div></div>
                <div className="flex-1 space-y-4 py-2"><div className="flex items-start gap-4"><div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400"><MapPin size={24} /></div><div><h4 className="text-[15px] font-bold text-gray-900 leading-snug">{client.details.address}</h4>{client.details.complement && <p className="text-[12px] text-gray-400 mt-1">{client.details.complement}</p>}</div></div><div className="flex gap-2"><button onClick={() => setIsEditingAddress(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"><Plus size={14} /> Modifier</button></div></div>
              </div>
            ) : (
              <div onClick={() => setIsEditingAddress(true)} className="p-10 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50/50 hover:border-gray-200 transition-all group shadow-inner"><div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-4 group-hover:scale-110 transition-transform"><MapPin size={32} /></div><p className="text-[13px] font-bold text-gray-900">Aucune adresse renseignée</p></div>
            )}
          </div>
        )}
      </div>

      {/* Section Origine client - CANAL D'ACQUISITION UNIFIÉ */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Canal d'acquisition</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Origine</label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 transition-all font-bold shadow-sm" 
                value={currentCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="">Sélectionner</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sous-origine</label>
            <div className="relative">
              <select 
                disabled={!currentCategory}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 transition-all font-bold shadow-sm disabled:bg-gray-50" 
                value={currentOrigin}
                onChange={(e) => handleOriginChange(e.target.value)}
              >
                <option value="">Sélectionner</option>
                {origins.map(orig => <option key={orig} value={orig}>{orig}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sources</label>
            <div className="relative">
              <select 
                disabled={!currentOrigin}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400 transition-all shadow-sm disabled:bg-gray-50" 
                value={currentSubOrigin}
                onChange={(e) => updateDoc(doc(db, 'clients', client.id), { "details.subOrigin": e.target.value })}
              >
                <option value="">Sélectionner</option>
                {subOrigins.map(so => <option key={so} value={so}>{so}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Section Affectation */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Affectation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Agenceur Référent */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Agenceur référent</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
                <img 
                  src={teamMembers.find(m => m.name === (client.details?.referent || client.addedBy?.name))?.avatar || 'https://i.pravatar.cc/150?u=fallback'} 
                  alt="" 
                  className="w-7 h-7 rounded-full border border-white shadow-sm" 
                />
              </div>
              <select 
                value={client.details?.referent || client.addedBy?.name || ''}
                onChange={(e) => handleUpdateAffectation('referent', e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-10 text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
              >
                <option value="">Sélectionner un collaborateur</option>
                {teamMembers.map((member) => (
                  <option key={member.uid} value={member.name}>
                    {member.name} {member.uid === userProfile?.uid ? '(Moi)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
            </div>
          </div>

          {/* Compte accès client */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Compte accès client</label>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 px-6 py-3 flex items-center justify-between shadow-inner">
               <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={client.details?.clientAccessAccount ? 'text-indigo-600' : 'text-gray-300'} />
                  <span className="text-[13px] font-bold text-gray-700">Autoriser l'accès client</span>
               </div>
               <div className="flex items-center space-x-4">
                  <span className={`text-[12px] font-bold transition-colors ${!client.details?.clientAccessAccount ? 'text-gray-900' : 'text-gray-300'}`}>Non</span>
                  <button 
                      type="button"
                      onClick={() => handleUpdateAffectation('clientAccessAccount', !client.details?.clientAccessAccount)}
                      className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-sm ${client.details?.clientAccessAccount ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${client.details?.clientAccessAccount ? 'right-1' : 'left-1'}`}></div>
                  </button>
                  <span className={`text-[12px] font-bold transition-colors ${client.details?.clientAccessAccount ? 'text-gray-900' : 'text-gray-300'}`}>Oui</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation suppression contact */}
      {contactToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer ce contact ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                Vous êtes sur le point de retirer ce contact secondaire du foyer. <br/>
                Cette action est immédiate.
              </p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setContactToDelete(null)} 
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleConfirmDelete} 
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-[13px] hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientContactGeneral;
