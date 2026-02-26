
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Plus, 
  List, 
  Map as MapIcon, 
  Search, 
  ChevronDown, 
  Eye, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  X,
  Filter,
  PenSquare,
  Trash2,
  AlertTriangle,
  Loader2,
  Check,
  Truck,
  Hammer,
  Stamp
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from '@firebase/firestore';
import { Client } from '../types';
import DirectoryMap from './DirectoryMap';
import Modal from './Modal';

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  id: string;
  isOpen: boolean;
  onToggle: (id: string | null) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, value, options, onSelect, id, isOpen, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  return (
    <div className="relative flex-1 min-w-[140px]" ref={dropdownRef}>
      <button 
        onClick={() => onToggle(isOpen ? null : id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-lg text-sm transition-all shadow-sm ${
          value ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/20' : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        <span className="truncate">{value || label}</span>
        <ChevronDown size={14} className={`ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] min-w-[200px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2 border-b border-gray-50 bg-gray-50/30">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                ref={inputRef}
                type="text" 
                placeholder={`Rechercher ${label.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            <button 
              onClick={() => { onSelect(''); onToggle(null); }}
              className="w-full text-left px-4 py-2 text-[10px] font-black text-gray-300 hover:bg-gray-50 uppercase tracking-widest border-b border-gray-50 mb-1"
            >
              Réinitialiser
            </button>
            
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: string) => (
                <button 
                  key={opt}
                  onClick={() => { onSelect(opt); onToggle(null); }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between group transition-colors ${
                    value === opt ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check size={14} className="text-indigo-600" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-[11px] font-bold text-gray-400 italic">Aucun résultat trouvé</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface DirectoryProps {
  userProfile: any;
  initialTab?: string;
  onAddClick: () => void;
  onClientClick: (client: Client) => void;
  mode?: 'contacts' | 'suppliers' | 'artisans' | 'prescribers';
}

const Directory: React.FC<DirectoryProps> = ({ 
  userProfile, 
  initialTab = 'Tous', 
  onAddClick, 
  onClientClick,
  mode = 'contacts'
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgenceur, setFilterAgenceur] = useState(userProfile?.name || '');
  const [filterOrigine, setFilterOrigine] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Configuration dynamique basée sur le mode
  const config = useMemo(() => {
    switch (mode) {
      case 'suppliers':
        return {
          title: 'FOURNISSEURS',
          icon: Truck,
          addButton: 'Ajouter une fiche fournisseur',
          tabs: ['Tous', 'Achat marchandises', 'Sous traitant', 'Frais généraux', 'Institutionnel'],
          statusField: 'category' 
        };
      case 'artisans':
        return {
          title: 'ARTISANS',
          icon: Hammer,
          addButton: 'Ajouter une fiche artisan',
          tabs: ['Tous', 'Plombier', 'Électricien', 'Peintre', 'Menuisier'],
          statusField: 'specialty'
        };
      case 'prescribers':
        return {
          title: 'PRESCRIPTEURS',
          icon: Stamp,
          addButton: 'Ajouter une fiche prescripteur',
          tabs: ['Tous', 'Architecte', 'Décorateur', 'Courtier'],
          statusField: 'type'
        };
      default:
        return {
          title: 'CLIENTS',
          icon: Users,
          addButton: 'Ajouter une fiche leads',
          tabs: ['Tous', 'Lead', 'Prospect', 'Client'],
          statusField: 'status'
        };
    }
  }, [mode]);

  useEffect(() => {
    if (initialTab) {
        if (initialTab === 'Leads') setActiveTab('Lead');
        else if (initialTab === 'Prospects') setActiveTab('Prospect');
        else if (initialTab === 'Clients') setActiveTab('Client');
        else setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    const clientsRef = collection(db, 'clients');
    const q = query(clientsRef, where('companyId', '==', userProfile.companyId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let clientsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];

      if (mode !== 'contacts') {
        clientsList = clientsList.filter(c => (c as any).directoryType === mode);
      } else {
        clientsList = clientsList.filter(c => !(c as any).directoryType || (c as any).directoryType === 'contacts');
      }

      setClients(clientsList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.companyId, mode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEffectiveStatus = (c: Client) => {
    if (mode === 'contacts') return c.status;
    if (mode === 'suppliers') return (c as any).category || 'Général';
    return (c as any).statusLabel || 'Général';
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const statusValue = getEffectiveStatus(c);
      const activeStatusValue = activeTab === 'Lead' ? 'Leads' : activeTab;
      
      const matchesTab = activeTab === 'Tous' || statusValue === activeStatusValue;
      const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAgenceur = !filterAgenceur || c.addedBy?.name === filterAgenceur;
      const matchesOrigine = !filterOrigine || c.origin === filterOrigine;
      const matchesLocation = !filterLocation || c.location === filterLocation;
      const matchesProject = !filterProject || (filterProject === 'Avec projet(s)' ? (c.projectCount || 0) > 0 : (c.projectCount || 0) === 0);
      
      return matchesTab && matchesSearch && matchesAgenceur && matchesOrigine && matchesLocation && matchesProject;
    });
  }, [clients, activeTab, searchQuery, filterAgenceur, filterOrigine, filterLocation, filterProject, mode]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterAgenceur('');
    setFilterOrigine('');
    setFilterLocation('');
    setFilterProject('');
  };

  const uniqueAgenceurs = useMemo(() => Array.from(new Set(clients.map(c => c.addedBy?.name).filter(Boolean))).sort(), [clients]);
  const uniqueOrigines = useMemo(() => Array.from(new Set(clients.map(c => c.origin).filter(Boolean))).sort(), [clients]);
  const uniqueLocations = useMemo(() => Array.from(new Set(clients.map(c => c.location).filter(Boolean))).sort(), [clients]);

  return (
    <div className="p-6 space-y-4 bg-gray-50 h-[calc(100vh-64px)] flex flex-col overflow-hidden font-sans">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-1">
             <div className="flex items-center space-x-2 mr-6">
                 <config.icon size={22} className="text-gray-900" />
                 <span className="font-black text-xl text-gray-900 uppercase tracking-tighter">{config.title}</span>
                 <span className="text-gray-300 font-bold text-sm">({filteredClients.length})</span>
             </div>
             
             <div className="flex bg-gray-200 rounded-full p-1 gap-1">
                 {config.tabs.map(tab => (
                     <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                            activeTab === tab 
                            ? 'bg-gray-900 text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                     >
                         {tab}
                     </button>
                 ))}
             </div>
        </div>

        <button 
            onClick={onAddClick}
            className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200"
        >
            <Plus size={18} className="mr-2" />
            {config.addButton}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0 items-center" ref={toolbarRef}>
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 flex p-1 shadow-sm h-[46px]">
            <button 
                onClick={() => setViewMode('list')}
                className={`flex-1 flex items-center justify-center rounded-lg py-1.5 text-xs font-black uppercase tracking-widest transition-all ${
                    viewMode === 'list' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
                <List size={14} className="mr-2" />
                Liste
            </button>
            <button 
                onClick={() => setViewMode('map')}
                className={`flex-1 flex items-center justify-center rounded-lg py-1.5 text-xs font-black uppercase tracking-widest transition-all ${
                    viewMode === 'map' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
                <MapIcon size={14} className="mr-2" />
                Map
            </button>
        </div>

        <div className="md:col-span-2 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" size={18} />
            <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-indigo-400 shadow-sm transition-all"
            />
        </div>

        <div className="md:col-span-8 flex gap-2">
          <FilterDropdown 
            id="agenceur"
            label="Ajouté par" 
            value={filterAgenceur} 
            options={uniqueAgenceurs} 
            onSelect={setFilterAgenceur} 
            isOpen={activeDropdown === 'agenceur'}
            onToggle={setActiveDropdown}
          />
          <FilterDropdown 
            id="origine"
            label="Origine" 
            value={filterOrigine} 
            options={uniqueOrigines} 
            onSelect={setFilterOrigine} 
            isOpen={activeDropdown === 'origine'}
            onToggle={setActiveDropdown}
          />
          <FilterDropdown 
            id="localisation"
            label="Localisation" 
            value={filterLocation} 
            options={uniqueLocations} 
            onSelect={setFilterLocation} 
            isOpen={activeDropdown === 'localisation'}
            onToggle={setActiveDropdown}
          />
          {mode === 'contacts' && (
            <FilterDropdown 
              id="projet"
              label="Projet(s)" 
              value={filterProject} 
              options={['Avec projet(s)', 'Sans projet']} 
              onSelect={setFilterProject} 
              isOpen={activeDropdown === 'projet'}
              onToggle={setActiveDropdown}
            />
          )}

          {(searchQuery || filterAgenceur || filterOrigine || filterLocation || filterProject) && (
            <button 
              onClick={resetFilters}
              className="px-4 py-2 bg-white border border-red-100 text-red-500 rounded-xl text-sm font-black hover:bg-red-50 transition-all flex items-center justify-center shadow-sm shrink-0"
              title="Réinitialiser"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden relative shadow-sm flex flex-col min-h-0">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <Loader2 className="animate-spin text-gray-300" size={32} />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center z-10">
            <Filter size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Aucun résultat trouvé</p>
            <button onClick={resetFilters} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Effacer les filtres</button>
          </div>
        ) : null}

        {viewMode === 'map' && <DirectoryMap clients={filteredClients} onClientClick={onClientClick} />}

        {viewMode === 'list' && (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="overflow-x-auto flex-1 overflow-y-auto hide-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] sticky top-0 z-20 shadow-sm">
                                <th className="px-8 py-5">{mode === 'suppliers' ? 'Nom' : 'Nom & prénom'}</th>
                                {mode !== 'suppliers' && <th className="px-8 py-5">Ajouté par</th>}
                                <th className="px-8 py-5">{mode === 'suppliers' ? 'Branche' : 'Origine'}</th>
                                {mode !== 'suppliers' && <th className="px-8 py-5">Localisation</th>}
                                {mode === 'contacts' && <th className="px-8 py-5 text-center">Projet(s)</th>}
                                {mode === 'suppliers' && <th className="px-8 py-5">Métiers</th>}
                                <th className="px-8 py-5 text-center">{mode === 'suppliers' ? 'Sélection' : 'Statut'}</th>
                                {mode === 'suppliers' && <th className="px-8 py-5">Email</th>}
                                {mode === 'suppliers' && <th className="px-8 py-5">Tel</th>}
                                {mode !== 'suppliers' && <th className="px-8 py-5">Ajouté le</th>}
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredClients.map((client, index) => {
                                const effectiveStatus = getEffectiveStatus(client);
                                return (
                                <tr 
                                    key={client.id} 
                                    onClick={() => onClientClick(client)}
                                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-8 py-5 text-[13px] font-black text-gray-900 uppercase tracking-tight">
                                        <div className="flex flex-col">
                                            <span>{client.name}</span>
                                            {mode === 'suppliers' && client.details?.website && (
                                                <a 
                                                    href={client.details.website.startsWith('http') ? client.details.website : `https://${client.details.website}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 mt-1 lowercase font-bold"
                                                >
                                                    <Search size={10} /> {client.details.website.replace(/^https?:\/\//, '')}
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    {mode !== 'suppliers' && (
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <img src={client.addedBy?.avatar} alt="" className="w-8 h-8 rounded-full border border-white shadow-sm" />
                                                <span className="text-[13px] font-bold text-gray-700">{client.addedBy?.name}</span>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-8 py-5 text-[13px] font-bold text-gray-500 uppercase">
                                        {mode === 'suppliers' ? (
                                            <span className="text-gray-900">{client.details?.branch}</span>
                                        ) : (
                                            client.origin
                                        )}
                                    </td>
                                    {mode !== 'suppliers' && <td className="px-8 py-5 text-[13px] font-bold text-gray-500">{client.location}</td>}
                                    {mode === 'contacts' && (
                                      <td className="px-8 py-5">
                                          {!client.projectCount || client.projectCount === 0 ? (
                                              <div className="flex justify-center">
                                                <span className="px-3 py-1 bg-gray-50 text-gray-300 text-[10px] font-black rounded-full">-</span>
                                              </div>
                                          ) : (
                                              <div className="flex items-center justify-center gap-2">
                                                <div className="w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center text-[11px] font-black shadow-lg">
                                                  {client.projectCount}
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">projet{client.projectCount > 1 ? 's' : ''}</span>
                                              </div>
                                          )}
                                      </td>
                                    )}
                                    {mode === 'suppliers' && (
                                        <td className="px-8 py-5">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {client.details?.trades?.slice(0, 2).map((trade: string) => (
                                                    <span key={trade} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">
                                                        {trade}
                                                    </span>
                                                ))}
                                                {(client.details?.trades?.length || 0) > 2 && (
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md">
                                                        +{(client.details?.trades?.length || 0) - 2}
                                                    </span>
                                                )}
                                                {(!client.details?.trades || client.details.trades.length === 0) && (
                                                    <span className="text-gray-300 text-[10px] font-bold italic">Aucun métier</span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-8 py-5 text-center">
                                        <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                            mode === 'suppliers' ? (
                                                client.details?.selectionStatus === 'Sélectionné' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' :
                                                client.details?.selectionStatus === 'Terminé' ? 'bg-gray-50 text-gray-500 border border-gray-100 shadow-sm' :
                                                'bg-amber-50 text-amber-700 border border-amber-100 shadow-sm'
                                            ) : (
                                                effectiveStatus === 'Prospect' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 shadow-sm' :
                                                effectiveStatus === 'Client' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100 shadow-sm' :
                                                'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm'
                                            )
                                        }`}>
                                            {mode === 'suppliers' ? (client.details?.selectionStatus || 'En cours') : effectiveStatus}
                                        </span>
                                    </td>
                                    {mode === 'suppliers' && (
                                        <td className="px-8 py-5 text-[12px] font-bold text-gray-500 lowercase truncate max-w-[150px]">
                                            {client.details?.email || '-'}
                                        </td>
                                    )}
                                    {mode === 'suppliers' && (
                                        <td className="px-8 py-5 text-[12px] font-bold text-gray-500 whitespace-nowrap">
                                            {client.details?.phone || '-'}
                                        </td>
                                    )}
                                    {mode !== 'suppliers' && <td className="px-8 py-5 text-[13px] font-black text-gray-400 italic">{client.dateAdded}</td>}
                                    <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2 relative">
                                            <button 
                                                onClick={() => onClientClick(client)}
                                                className="p-2 border border-gray-100 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                                                title="Détails"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setActiveMenuId(activeMenuId === client.id ? null : client.id)}
                                                    className={`p-2 border border-gray-100 rounded-xl transition-all ${activeMenuId === client.id ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>

                                                {activeMenuId === client.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                                                        <div className={`absolute right-0 ${index >= filteredClients.length - 2 && filteredClients.length > 2 ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-56 animate-in fade-in zoom-in-95 duration-150`}>
                                                            <button 
                                                                onClick={() => { setClientToEdit(client); setIsEditModalOpen(true); setActiveMenuId(null); }}
                                                                className="w-full text-left px-5 py-3 text-[12px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <PenSquare size={16} className="text-gray-300" /> Modifier la fiche
                                                            </button>
                                                            <div className="h-px bg-gray-50 my-1 mx-2" />
                                                            <button 
                                                                onClick={() => { setClientToDelete(client); setActiveMenuId(null); }}
                                                                className="w-full text-left px-5 py-3 text-[12px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <Trash2 size={16} /> Supprimer la fiche
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-6 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-400 bg-white shrink-0">
                    <div>Vue <span className="font-black text-gray-900">1 à {filteredClients.length}</span> sur <span className="font-black text-gray-900">{filteredClients.length}</span> résultats</div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300"><ChevronsLeft size={16} /></button>
                        <button className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300"><ChevronLeft size={16} /></button>
                        <button className="w-10 h-10 bg-gray-900 text-white rounded-xl text-[12px] font-black shadow-xl">1</button>
                        <button className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300"><ChevronRight size={16} /></button>
                        <button className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300 rotate-180"><ChevronsLeft size={16} /></button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {clientToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer définitivement ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                Vous allez effacer la fiche de <span className="font-bold text-gray-900">"{clientToDelete.name}"</span>.<br/>
                Cette opération est irréversible.
              </p>
              <div className="flex gap-4 w-full">
                <button onClick={() => setClientToDelete(null)} className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all">Annuler</button>
                <button onClick={() => { setIsDeleting(true); deleteDoc(doc(db, 'clients', clientToDelete.id)).then(() => { setClientToDelete(null); setIsDeleting(false); }); }} disabled={isDeleting} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-[13px] hover:bg-red-700 shadow-xl shadow-red-100 flex items-center justify-center gap-2">
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Supprimer
                </button>
              </div>
          </div>
        </div>
      )}

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setClientToEdit(null); }} userProfile={userProfile} clientToEdit={clientToEdit} />
    </div>
  );
};

export default Directory;
