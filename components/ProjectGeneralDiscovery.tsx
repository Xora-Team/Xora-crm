
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Minus, 
  FileText, 
  Search, 
  MapPin, 
  Loader2, 
  Upload, 
  File, 
  X, 
  Star, 
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  Droplets,
  Zap,
  Paintbrush,
  Hammer,
  Thermometer,
  Grid,
  Layers,
  Users,
  Axe,
  BrickWall,
  Building2,
  HelpCircle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, getDoc } from '@firebase/firestore';

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

const LISTE_CONFRERES = [
  "Arthur Bonnet", "Autres", "Aviva", "But", "Caseo", "Coméra", "Cuisine +", 
  "Cuisine Référence", "Cuisinella", "Cuisines Omega", "Cuisines Vendom", 
  "Darty", "Eco cuisine", "Elton", "Envia Cuisines", "Hygéna", "Ikea", 
  "Inova", "Intérieurs Privés", "Ixina", "Kitchen Family", "Leicht", 
  "Maxima", "MH Cuisine", "Mobalpa", "Morel", "Noblessa", "Perène", 
  "Schmidt", "Socooc", "Stosa", "Aran"
];

const PREPARATION_ARTISANS = [
  { id: 'tous', label: 'Tous corps de métiers', icon: Users },
  { id: 'plombier', label: 'Plombier', icon: Droplets },
  { id: 'electricien', label: 'Electricien', icon: Zap },
  { id: 'plaquiste', label: 'Plaquiste', icon: Layers },
  { id: 'peintre', label: 'Peintre', icon: Paintbrush },
  { id: 'platrier', label: 'Plâtrier/Peintre', icon: Paintbrush },
  { id: 'macon', label: 'Maçon', icon: BrickWall },
  { id: 'menuisier', label: 'Menuisiers/ébeniste', icon: Axe },
  { id: 'chauffagiste', label: 'Chauffagiste', icon: Thermometer },
  { id: 'carreleur', label: 'Carreleurs', icon: Grid },
];

const Section = ({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-white border border-gray-100 rounded-[24px] p-8 space-y-6 shadow-sm mb-6">
    <div className="flex justify-between items-center">
      <h3 className="text-[15px] font-bold text-gray-800">{title}</h3>
      {action}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {children}
    </div>
  </div>
);

const Field = ({ label, children, colSpan = "col-span-12 md:col-span-3" }: { label: string; children?: React.ReactNode; colSpan?: string }) => (
  <div className={colSpan}>
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
    {children}
  </div>
);

const Select = ({ value, onChange, options, placeholder = "Sélectionner", disabled = false }: any) => (
  <div className="relative group">
    <select 
      disabled={disabled}
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-gray-900 outline-none focus:border-gray-300 transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
    >
      <option value="">{placeholder}</option>
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none group-hover:text-gray-400" />
  </div>
);

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
          disabled ? 'bg-gray-50 text-gray-400 border-gray-100' : 'border-gray-100 hover:border-gray-300'
        }`}
      >
        <span className={`font-bold truncate ${!Array.isArray(value) || value.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
          {displayValue()}
        </span>
        {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 md:top-full md:bottom-auto md:mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  <span className={`text-[12px] ${isSelected ? 'font-bold' : 'font-medium'}`}>{opt}</span>
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

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center gap-3">
    <span className={`text-[12px] font-bold ${!value ? 'text-gray-900' : 'text-gray-300'}`}>Non</span>
    <button 
      type="button" 
      onClick={() => onChange(!value)} 
      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${value ? 'bg-gray-800' : 'bg-gray-300'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${value ? 'right-1' : 'left-1'}`}></div>
    </button>
    <span className={`text-[12px] font-bold ${value ? 'text-gray-900' : 'text-gray-300'}`}>Oui</span>
  </div>
);

const PictoChoice = ({ value, onChange, options, companyName }: any) => (
  <div className="flex gap-2">
    {options.map((opt: any) => {
      const isSelected = value === opt.value;
      const Icon = opt.icon;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 ${
            isSelected 
            ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-sm' 
            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
          }`}
        >
          <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
            <Icon size={18} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter text-center truncate w-full">
            {opt.label === 'Société' ? companyName : opt.label}
          </span>
        </button>
      );
    })}
  </div>
);

const CurrencyInput = ({ value, onChange, placeholder = "0" }: any) => {
  const formatValue = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const numericValue = val.toString().replace(/[^0-9]/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    onChange(rawValue);
  };

  return (
    <div className="relative group">
      <input 
        type="text" 
        placeholder={placeholder} 
        value={formatValue(value)} 
        onChange={handleInputChange}
        className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-[13px] font-bold text-gray-900 outline-none focus:border-gray-300 transition-all shadow-sm pr-10"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-gray-900 pointer-events-none">€</span>
    </div>
  );
};

const UnifiedRangePicker = ({ startValue, endValue, onRangeChange, label }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const parseDate = (dStr: string) => {
    if (!dStr || !dStr.includes('/')) return null;
    const [d, m, y] = dStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDate = (date: Date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const startDate = parseDate(startValue);
  const endDate = parseDate(endValue);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const calendarDays = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startOffset - 1; i >= 0; i--) {
      calendarDays.push({ day: prevMonthLastDay - i, month: month - 1, year, current: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      calendarDays.push({ day: i, month, year, current: true });
    }
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({ day: i, month: month + 1, year, current: false });
    }
    return calendarDays;
  }, [currentMonth]);

  const handleDayClick = (day: number, month: number, year: number) => {
    const clickedDate = new Date(year, month, day);
    
    // Si on n'a pas de début ou si on a déjà une fin, on repart sur un nouveau début
    if (!startDate || (startDate && endDate)) {
      onRangeChange(formatDate(clickedDate), '');
    } else {
      // On a un début mais pas de fin
      if (clickedDate < startDate) {
        // Le clic est avant le début, on inverse ou on reset ? Inversons pour fluidité
        onRangeChange(formatDate(clickedDate), startValue);
      } else {
        onRangeChange(startValue, formatDate(clickedDate));
        // Fermeture automatique après sélection de la fin pour simplifier
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] font-bold text-gray-900 shadow-sm cursor-pointer hover:border-indigo-400 transition-all"
      >
        <Calendar size={16} className="text-gray-300 shrink-0" />
        <div className="flex-1 flex justify-between items-center">
          <span className={startDate ? 'text-gray-900' : 'text-gray-400 italic'}>{startValue || 'Début'}</span>
          <span className="text-gray-300 font-black px-1">AU</span>
          <span className={endDate ? 'text-gray-900' : 'text-gray-400 italic'}>{endValue || 'Fin'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[150] w-[300px] p-4 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[12px] font-black uppercase text-gray-900">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h4>
            <div className="flex gap-1">
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-gray-50 rounded text-gray-400"><ChevronLeft size={16}/></button>
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-gray-50 rounded text-gray-400"><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['L','M','M','J','V','S','D'].map(d => <span key={d} className="text-[10px] font-black text-gray-300">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const date = new Date(d.year, d.month, d.day);
              const isStart = startDate && date.getTime() === startDate.getTime();
              const isEnd = endDate && date.getTime() === endDate.getTime();
              const isBetween = startDate && endDate && date > startDate && date < endDate;
              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(d.day, d.month, d.year)}
                  className={`h-8 w-8 rounded-lg text-[11px] font-bold transition-all relative ${
                    isStart || isEnd ? 'bg-indigo-600 text-white shadow-md z-10' :
                    isBetween ? 'bg-indigo-50 text-indigo-600' :
                    isToday ? 'border border-indigo-100 text-indigo-600' :
                    d.current ? 'text-gray-800 hover:bg-gray-50' : 'text-gray-200'
                  }`}
                >
                  {d.day}
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between">
            <button type="button" onClick={() => { onRangeChange('', ''); setIsOpen(false); }} className="text-[10px] font-bold text-red-500 uppercase">Effacer</button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-bold uppercase">Valider</button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ProjectGeneralDiscoveryProps {
  project: any;
  userProfile: any;
}

const ProjectGeneralDiscovery: React.FC<ProjectGeneralDiscoveryProps> = ({ project, userProfile }) => {
  const companyName = userProfile?.companyName || 'Ma Société';
  
  const [chantierSearch, setChantierSearch] = useState(project.details?.adresseChantier || '');
  const [factuSearch, setFactuSearch] = useState(project.details?.adresseFacturation || '');
  const [suggestionsChantier, setSuggestionsChantier] = useState<any[]>([]);
  const [suggestionsFactu, setSuggestionsFactu] = useState<any[]>([]);
  const [isSearchingChantier, setIsSearchingChantier] = useState(false);
  const [isSearchingFactu, setIsSearchingFactu] = useState(false);
  const [showChantierSuggestions, setShowChantierSuggestions] = useState(false);
  const [showFactuSuggestions, setShowFactuSuggestions] = useState(false);
  
  const [clientAddresses, setClientAddresses] = useState<any[]>([]);
  
  const chantierRef = useRef<HTMLDivElement>(null);
  const factuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project?.clientId) return;
    const fetchClient = async () => {
      const snap = await getDoc(doc(db, 'clients', project.clientId));
      if (snap.exists()) {
        const data = snap.data();
        const addresses: any[] = [];
        if (data.details?.address) {
          addresses.push({ label: data.details.address, type: 'Principale', isMain: true });
        }
        if (data.details?.properties && Array.isArray(data.details.properties)) {
          data.details.properties.forEach((p: any) => {
            if (p.address && p.address !== data.details.address) {
              addresses.push({ label: p.address, type: p.usage || 'Secondaire', isMain: false });
            }
          });
        }
        setClientAddresses(addresses);
      }
    };
    fetchClient();
  }, [project?.clientId]);

  const handleUpdate = async (field: string, value: any) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { [field]: value });
    } catch (e) {
      console.error("Erreur update découverte:", e);
    }
  };

  const handleMultiUpdate = async (updates: Record<string, any>) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, updates);
    } catch (e) {
      console.error("Erreur multi-update découverte:", e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chantierRef.current && !chantierRef.current.contains(event.target as Node)) {
        setShowChantierSuggestions(false);
      }
      if (factuRef.current && !factuRef.current.contains(event.target as Node)) {
        setShowFactuSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAddr = async () => {
      if (chantierSearch.length < 4 || clientAddresses.some(a => a.label === chantierSearch)) {
        setSuggestionsChantier([]);
        return;
      }
      setIsSearchingChantier(true);
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(chantierSearch)}&limit=5`);
        const data = await response.json();
        setSuggestionsChantier(data.features || []);
      } catch (error) { console.error(error); } finally { setIsSearchingChantier(false); }
    };
    const timer = setTimeout(fetchAddr, 300);
    return () => clearTimeout(timer);
  }, [chantierSearch, clientAddresses]);

  useEffect(() => {
    const fetchAddr = async () => {
      if (factuSearch.length < 4 || clientAddresses.some(a => a.label === factuSearch)) {
        setSuggestionsFactu([]);
        return;
      }
      setIsSearchingFactu(true);
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(factuSearch)}&limit=5`);
        const data = await response.json();
        setSuggestionsFactu(data.features || []);
      } catch (error) { console.error(error); } finally { setIsSearchingFactu(false); }
    };
    const timer = setTimeout(fetchAddr, 300);
    return () => clearTimeout(timer);
  }, [factuSearch, clientAddresses]);

  const categories = useMemo(() => Object.keys(HIERARCHY_DATA), []);
  const currentCategory = project.details?.category || project.categorie || '';
  const currentOrigin = project.origin || project.origine || '';
  const origins = useMemo(() => currentCategory ? Object.keys(HIERARCHY_DATA[currentCategory] || {}) : [], [currentCategory]);
  const subOrigins = useMemo(() => (currentCategory && currentOrigin) ? (HIERARCHY_DATA[currentCategory]?.[currentOrigin] || []) : [], [currentCategory, currentOrigin]);

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    return dateStr;
  };

  const handleDateChange = (field: string, val: string) => {
    if (!val) {
      handleUpdate(field, '');
      return;
    }
    const [y, m, d] = val.split('-');
    handleUpdate(field, `${d}/${m}/${y}`);
  };

  const updateConfrereField = (index: number, field: string, value: any) => {
    const currentList = [...(project.details?.confreresList || [])];
    if (!currentList[index]) currentList[index] = {};
    currentList[index] = { ...currentList[index], [field]: value };
    handleUpdate('details.confreresList', currentList);
  };

  const nbConfreres = project.details?.nbConfreres || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <Section title="Attribution">
        <Field label="Agence" colSpan="col-span-12 md:col-span-6">
          <div className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-[13px] font-bold text-gray-900 flex items-center justify-between shadow-sm">
            {companyName}
            <ChevronDown size={16} className="text-gray-300" />
          </div>
        </Field>
        <Field label="Agenceur référent" colSpan="col-span-12 md:col-span-6">
          <div className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
            <img src={project.agenceur?.avatar} className="w-8 h-8 rounded-full object-cover border border-gray-50 shadow-sm" alt="" />
            <span className="text-[13px] font-bold text-gray-900">{project.agenceur?.name}</span>
            <ChevronDown size={18} className="ml-auto text-gray-400" />
          </div>
        </Field>
      </Section>

      <Section title="Origine du Projet">
        <Field label="Origine" colSpan="col-span-12 md:col-span-4">
          <Select 
            value={currentCategory} 
            options={categories} 
            onChange={(v: string) => handleUpdate('details.category', v)} 
            placeholder="Sélectionner une origine"
          />
        </Field>
        <Field label="Sous-origine" colSpan="col-span-12 md:col-span-4">
          <Select 
            disabled={!currentCategory}
            value={currentOrigin} 
            options={origins} 
            onChange={(v: string) => handleUpdate('origin', v)} 
            placeholder="Sélectionner une sous-origine"
          />
        </Field>
        <Field label="Sources" colSpan="col-span-12 md:col-span-4">
          <Select 
            disabled={!currentOrigin}
            value={project.details?.subOrigin || ''} 
            options={subOrigins} 
            onChange={(v: string) => handleUpdate('details.subOrigin', v)} 
            placeholder="Sélectionner une source"
          />
        </Field>
      </Section>

      <Section title="Projet">
        <Field label="Métier de l'étude" colSpan="col-span-12 md:col-span-4">
          <Select value={project.metier} options={['Cuisine', 'Cuisine extérieure', 'Salle de bain', 'Mobilier', 'Dressing', 'Bureau']} onChange={(v: string) => handleUpdate('metier', v)} />
        </Field>
        <div className="hidden md:block md:col-span-8"></div>

        <Field label="Adresse chantier" colSpan="col-span-12 md:col-span-6">
          <div className="relative" ref={chantierRef}>
            <div className="relative group">
              <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchingChantier ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-600'}`} size={18} />
              <input 
                type="text" 
                value={chantierSearch}
                onChange={(e) => {
                  setChantierSearch(e.target.value);
                  setShowChantierSuggestions(true);
                }}
                onFocus={() => setShowChantierSuggestions(true)}
                placeholder="Choisir ou saisir l'adresse du chantier..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-12 py-3 text-[13px] font-bold text-gray-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all"
              />
              {chantierSearch && (
                <button 
                  onClick={() => { setChantierSearch(''); handleUpdate('details.adresseChantier', ''); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {showChantierSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200 flex flex-col">
                {clientAddresses.map((addr, idx) => (
                  <button key={idx} type="button" onClick={() => { setChantierSearch(addr.label); handleUpdate('details.adresseChantier', addr.label); setShowChantierSuggestions(false); }} className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-start gap-4 border-b border-gray-100 last:border-0 group transition-all">
                    <div className={`mt-1 p-1.5 rounded-lg ${addr.isMain ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}><MapPin size={16} /></div>
                    <div className="flex flex-col"><span className="text-[13px] font-bold text-gray-900">{addr.label}</span><span className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter">{addr.type}</span></div>
                  </button>
                ))}
                {suggestionsChantier.map((f: any) => (
                  <button key={f.properties.id} type="button" onClick={() => { setChantierSearch(f.properties.label); handleUpdate('details.adresseChantier', f.properties.label); setShowChantierSuggestions(false); }} className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-start gap-4 border-b border-gray-100 last:border-0 group transition-all">
                    <div className="mt-1 p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover:text-indigo-600 transition-all"><Search size={16} /></div>
                    <div className="flex flex-col"><span className="text-[13px] font-bold text-gray-900">{f.properties.name}</span><span className="text-[11px] text-gray-400 font-medium">{f.properties.postcode} {f.properties.city}</span></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="Adresse facturation" colSpan="col-span-12 md:col-span-6">
          <div className="relative" ref={factuRef}>
            <div className="relative group">
              <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchingFactu ? 'text-indigo-500' : 'text-gray-400 group-focus-within:text-indigo-600'}`} size={18} />
              <input 
                type="text" 
                value={factuSearch}
                onChange={(e) => {
                  setFactuSearch(e.target.value);
                  setShowFactuSuggestions(true);
                }}
                onFocus={() => setShowFactuSuggestions(true)}
                placeholder="Choisir ou saisir l'adresse de facturation..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-[13px] font-bold text-gray-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all"
              />
            </div>
            {showFactuSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200 flex flex-col">
                {clientAddresses.map((addr, idx) => (
                  <button key={idx} type="button" onClick={() => { setFactuSearch(addr.label); handleUpdate('details.adresseFacturation', addr.label); setShowFactuSuggestions(false); }} className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-start gap-4 border-b border-gray-100 last:border-0 group transition-all">
                    <div className={`mt-1 p-1.5 rounded-lg ${addr.isMain ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}><MapPin size={16} /></div>
                    <div className="flex flex-col"><span className="text-[13px] font-bold text-gray-900">{addr.label}</span><span className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter">{addr.type}</span></div>
                  </button>
                ))}
                {suggestionsFactu.map((f: any) => (
                  <button key={f.properties.id} type="button" onClick={() => { setFactuSearch(f.properties.label); handleUpdate('details.adresseFacturation', f.properties.label); setShowFactuSuggestions(false); }} className="w-full px-5 py-4 text-left hover:bg-indigo-50 flex items-start gap-4 border-b border-gray-100 last:border-0 group transition-all">
                    <div className="mt-1 p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover:text-indigo-600 transition-all"><Search size={16} /></div>
                    <div className="flex flex-col"><span className="text-[13px] font-bold text-gray-900">{f.properties.name}</span><span className="text-[11px] text-gray-400 font-medium">{f.properties.postcode} {f.properties.city}</span></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="Date Prévisionnelle Signature" colSpan="col-span-12 md:col-span-4">
          <UnifiedRangePicker 
            startValue={project.details?.dateSignatureStart}
            endValue={project.details?.dateSignatureEnd}
            onRangeChange={(start: string, end: string) => handleMultiUpdate({
              'details.dateSignatureStart': start,
              'details.dateSignatureEnd': end
            })}
          />
        </Field>
        <Field label="Dates prévisionnel chantier" colSpan="col-span-12 md:col-span-4">
          <UnifiedRangePicker 
            startValue={project.details?.dateChantierStart}
            endValue={project.details?.dateChantierEnd}
            onRangeChange={(start: string, end: string) => handleMultiUpdate({
              'details.dateChantierStart': start,
              'details.dateChantierEnd': end
            })}
          />
        </Field>
        <Field label="Date installation cuisine" colSpan="col-span-12 md:col-span-4">
          <UnifiedRangePicker 
            startValue={project.details?.dateInstallationStart}
            endValue={project.details?.dateInstallationEnd}
            onRangeChange={(start: string, end: string) => handleMultiUpdate({
              'details.dateInstallationStart': start,
              'details.dateInstallationEnd': end
            })}
          />
        </Field>
      </Section>

      <Section title="Enveloppe financière">
        <Field label="Fourchette basse Budget" colSpan="col-span-12 md:col-span-4">
          <CurrencyInput value={project.details?.budgetBas} onChange={(v: string) => handleUpdate('details.budgetBas', v)} />
        </Field>
        <Field label="Fourchette haute Budget" colSpan="col-span-12 md:col-span-4">
          <CurrencyInput value={project.details?.budgetHaut} onChange={(v: string) => handleUpdate('details.budgetHaut', v)} />
        </Field>
        <Field label="Budget global du chantier" colSpan="col-span-12 md:col-span-4">
          <CurrencyInput value={project.details?.budgetGlobal} onChange={(v: string) => handleUpdate('details.budgetGlobal', v)} />
        </Field>
      </Section>

      <Section title="Préparation de chantier">
        <div className="col-span-12 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {PREPARATION_ARTISANS.map((artisan) => {
              const isSelected = !!project.details?.preparationChantier?.[artisan.id];
              const Icon = artisan.icon;
              
              return (
                <button
                  key={artisan.id}
                  type="button"
                  onClick={() => {
                    const current = project.details?.preparationChantier || {};
                    if (isSelected) {
                      const { [artisan.id]: _, ...rest } = current;
                      handleUpdate('details.preparationChantier', rest);
                    } else {
                      handleUpdate(`details.preparationChantier.${artisan.id}`, []);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-3 ${
                    isSelected 
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-md' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                    <Icon size={24} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-center leading-tight">{artisan.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {PREPARATION_ARTISANS.filter(a => !!project.details?.preparationChantier?.[a.id]).map((artisan) => (
              <div key={artisan.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                    <artisan.icon size={18} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{artisan.label}</span>
                </div>
                <div className="flex-1">
                  <Field label="Qui réalisera les travaux" colSpan="w-full">
                    <MultiSelect 
                      value={project.details?.preparationChantier?.[artisan.id] || []} 
                      options={['client', 'artisans clients', companyName, `artisans avec ${companyName}`, 'ne sait pas']} 
                      onChange={(v: string[]) => handleUpdate(`details.preparationChantier.${artisan.id}`, v)} 
                      placeholder="Sélectionner..."
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Installation">
        <Field label="Dépose" colSpan="col-span-12 md:col-span-4">
          <PictoChoice 
            value={project.details?.depose} 
            companyName={companyName}
            onChange={(v: string) => handleUpdate('details.depose', v)}
            options={[
              { value: companyName, label: 'Société', icon: Building2 },
              { value: 'Client', label: 'Client', icon: User },
              { value: 'Autre', label: 'Autre', icon: HelpCircle }
            ]}
          />
        </Field>
        <Field label="Installation" colSpan="col-span-12 md:col-span-4">
          <PictoChoice 
            value={project.details?.installationType} 
            companyName={companyName}
            onChange={(v: string) => handleUpdate('details.installationType', v)}
            options={[
              { value: companyName, label: 'Société', icon: Building2 },
              { value: 'Client', label: 'Client', icon: User },
              { value: 'Autre', label: 'Autre', icon: HelpCircle }
            ]}
          />
        </Field>
        <Field label="Livraison à charge de" colSpan="col-span-12 md:col-span-4">
          <PictoChoice 
            value={project.details?.livraisonCharge} 
            companyName={companyName}
            onChange={(v: string) => handleUpdate('details.livraisonCharge', v)}
            options={[
              { value: companyName, label: 'Société', icon: Building2 },
              { value: 'Client', label: 'Client', icon: User },
              { value: 'Autre', label: 'Autre', icon: HelpCircle }
            ]}
          />
        </Field>
        
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 items-end">
           <Field label="Plans techniques nécessaires" colSpan="col-span-12 md:col-span-4">
             <div className="pt-1"><Toggle value={project.details?.plansTechniques || false} onChange={(v) => handleUpdate('details.plansTechniques', v)} /></div>
           </Field>

           {project.details?.plansTechniques && (
             <div className="col-span-12 md:col-span-4 animate-in slide-in-from-left-4 duration-300">
                <Field label="Date de remise des plans" colSpan="w-full">
                   <div className="relative group">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-indigo-600 transition-colors pointer-events-none z-10" size={18} />
                     <input 
                       type="date" 
                       value={formatDateForInput(project.details?.dateRemisePlans)} 
                       onChange={(e) => handleDateChange('details.dateRemisePlans', e.target.value)}
                       className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-[13px] font-bold text-gray-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all cursor-pointer" 
                     />
                   </div>
                </Field>
             </div>
           )}
        </div>
      </Section>

      <Section title="Concurrence">
        <Field label="Nombre de confrères consultés" colSpan="col-span-12 md:col-span-4">
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
             <span className="text-[13px] font-bold text-gray-200 italic">Confrères</span>
             <div className="flex items-center gap-3">
                <button type="button" onClick={() => handleUpdate('details.nbConfreres', Math.max(0, (project.details?.nbConfreres || 0) - 1))} className="w-7 h-7 bg-gray-100 text-gray-600 rounded flex items-center justify-center hover:bg-gray-200"><Minus size={14} /></button>
                <span className="text-sm font-bold text-gray-900">{nbConfreres}</span>
                <button type="button" onClick={() => handleUpdate('details.nbConfreres', (project.details?.nbConfreres || 0) + 1)} className="w-7 h-7 bg-gray-800 text-white rounded flex items-center justify-center hover:bg-black shadow-md"><Plus size={14} /></button>
             </div>
          </div>
        </Field>
        
        {nbConfreres > 0 && Array.from({ length: nbConfreres }).map((_, idx) => (
          <div key={idx} className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-gray-50 mt-2 animate-in slide-in-from-top-2 duration-300">
            <Field label={`Confrère #${idx + 1}`} colSpan="col-span-12 md:col-span-4">
              <Select 
                value={project.details?.confreresList?.[idx]?.nom || ''} 
                options={LISTE_CONFRERES} 
                onChange={(v: string) => updateConfrereField(idx, 'nom', v)} 
                placeholder="Choisir un confrère..."
              />
            </Field>
            <Field label="Budget annoncé" colSpan="col-span-12 md:col-span-4">
              <CurrencyInput 
                value={project.details?.confreresList?.[idx]?.budget || ''} 
                onChange={(v: string) => updateConfrereField(idx, 'budget', v)} 
              />
            </Field>
            <Field label="Statut du projet" colSpan="col-span-12 md:col-span-4">
              <Select 
                value={project.details?.confreresList?.[idx]?.statut || ''} 
                options={['En attente de devis', 'Devenu trop cher', 'Signature imminente', 'Projet arrêté']} 
                onChange={(v: string) => updateConfrereField(idx, 'statut', v)} 
              />
            </Field>
          </div>
        ))}
      </Section>

      <Section title="Permis de construire">
        <Field label="Besoin d'un permis de construire" colSpan="col-span-6 md:col-span-3">
          <div className="pt-2"><Toggle value={project.details?.permisAccorde || false} onChange={(v) => handleUpdate('details.permisAccorde', v)} /></div>
        </Field>
        
        {project.details?.permisAccorde && (
          <>
            <Field label="Date d'obtention prévisionnelle" colSpan="col-span-12 md:col-span-4">
              <UnifiedRangePicker 
                startValue={project.details?.datePermisPrevisionnelStart}
                endValue={project.details?.datePermisPrevisionnelEnd}
                onRangeChange={(start: string, end: string) => handleMultiUpdate({
                  'details.datePermisPrevisionnelStart': start,
                  'details.datePermisPrevisionnelEnd': end
                })}
              />
            </Field>

            <Field label="Date d'obtention Permis" colSpan="col-span-12 md:col-span-3">
              <div className="relative group animate-in slide-in-from-left-2 duration-300">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-indigo-600 transition-colors pointer-events-none z-10" size={18} />
                <input 
                  type="date" 
                  value={formatDateForInput(project.details?.datePermis)} 
                  onChange={(e) => handleDateChange('details.datePermis', e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-[13px] font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm transition-all cursor-pointer" 
                />
              </div>
            </Field>
          </>
        )}
      </Section>
    </div>
  );
};

export default ProjectGeneralDiscovery;
