
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stamp,
  Upload,
  CheckSquare,
  Square,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { formatPhone, formatName, formatFullName, formatFullNameFirstLast, formatNameFirstLast, normalizeString } from '../utils';
import { Client } from '../types';
import DirectoryMap from './DirectoryMap';
import Modal from './Modal';
import ClientImportModal from './ClientImportModal';

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
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkNewAgenceur, setBulkNewAgenceur] = useState<any>(null);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  
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
          title: 'CLIENTS / PROSPECTS',
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
    if (!userProfile?.companyId) return;
    const teamRef = collection(db, 'users');
    const q = query(teamRef, where('companyId', '==', userProfile.companyId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeamMembers(members);
    });
    return () => unsubscribe();
  }, [userProfile?.companyId]);

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
    let result = clients.filter(c => {
      const statusValue = getEffectiveStatus(c);
      const activeStatusValue = activeTab === 'Lead' ? 'Leads' : activeTab;
      
      const matchesTab = activeTab === 'Tous' || statusValue === activeStatusValue;
      const searchNormalized = normalizeString(searchQuery);
      const primaryNameNormalized = normalizeString(c.name || '');
      const primaryEmail = normalizeString(c.details?.email || '');
      const primaryPhone = normalizeString(c.details?.phone || '');
      const primaryFixed = normalizeString(c.details?.fixed || '');
      
      // Vérifier le contact principal
      const matchesPrimary = primaryNameNormalized.includes(searchNormalized) ||
                            primaryEmail.includes(searchNormalized) ||
                            primaryPhone.includes(searchNormalized) ||
                            primaryFixed.includes(searchNormalized);
      
      // Vérifier tous les contacts secondaires possibles
      const secondaryContacts = [
        ...((c as any).details?.additionalContacts || []),
        (c as any).details?.secondaryContact
      ].filter(Boolean);
      
      const matchesSecondary = secondaryContacts.some(sc => {
        const fn = normalizeString(sc.firstName || '');
        const ln = normalizeString(sc.lastName || '');
        const full = normalizeString(`${sc.firstName || ''} ${sc.lastName || ''}`);
        const email = normalizeString(sc.email || '');
        const mobile = normalizeString(sc.mobile || '');
        const landline = normalizeString(sc.landline || '');
        return fn.includes(searchNormalized) || 
               ln.includes(searchNormalized) || 
               full.includes(searchNormalized) ||
               email.includes(searchNormalized) ||
               mobile.includes(searchNormalized) ||
               landline.includes(searchNormalized);
      });
      
      const matchesSearch = !searchQuery || matchesPrimary || matchesSecondary;
      const referentName = c.details?.referent || c.addedBy?.name;
      const matchesAgenceur = !filterAgenceur || 
        (filterAgenceur === 'Sans agenceur' ? (!referentName || referentName === 'Sans agenceur') : referentName === filterAgenceur);
      const matchesOrigine = !filterOrigine || (c.category || c.details?.category || c.origin) === filterOrigine;
      
      const clientCity = c.details?.city || '';
      const matchesLocation = !filterLocation || 
                             (clientCity && clientCity === filterLocation) ||
                             (!clientCity && c.location?.includes(filterLocation));

      const matchesProject = !filterProject || (filterProject === 'Avec projet(s)' ? (c.projectCount || 0) > 0 : (c.projectCount || 0) === 0);
      
      return matchesTab && matchesSearch && matchesAgenceur && matchesOrigine && matchesLocation && matchesProject;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof Client];
        let valB: any = b[sortConfig.key as keyof Client];

        // Handle nested or special fields if needed
        if (sortConfig.key === 'createdAt') {
          valA = a.createdAt?.seconds || 0;
          valB = b.createdAt?.seconds || 0;
        } else if (sortConfig.key === 'agenceur') {
          valA = (a.details?.referent || a.addedBy?.name || 'Sans agenceur').toLowerCase();
          valB = (b.details?.referent || b.addedBy?.name || 'Sans agenceur').toLowerCase();
        } else if (sortConfig.key === 'name') {
          // Extraire le nom de famille pour le tri (souvent en majuscules ou le dernier mot)
          const getLastName = (fullName: string) => {
            const parts = fullName.trim().split(/\s+/);
            if (parts.length <= 1) return fullName.toLowerCase();
            const allCapsIndex = [...parts].reverse().findIndex(p => p.length > 1 && p === p.toUpperCase() && !p.match(/^\d+$/));
            if (allCapsIndex !== -1) return parts[parts.length - 1 - allCapsIndex].toLowerCase();
            return parts[parts.length - 1].toLowerCase();
          };
          valA = getLastName(a.name || '');
          valB = getLastName(b.name || '');
        } else if (sortConfig.key === 'origin') {
          valA = (a.category || a.details?.category || a.origin || '').toLowerCase();
          valB = (b.category || b.details?.category || b.origin || '').toLowerCase();
        } else if (sortConfig.key === 'location') {
          valA = (a.location || '').toLowerCase();
          valB = (b.location || '').toLowerCase();
        } else if (sortConfig.key === 'status') {
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [clients, activeTab, searchQuery, filterAgenceur, filterOrigine, filterLocation, filterProject, mode, sortConfig]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  const canModifyClient = (client: Client) => {
    return !!userProfile;
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterAgenceur('');
    setFilterOrigine('');
    setFilterLocation('');
    setFilterProject('');
    setSelectedIds([]);
    setSelectAllAcrossPages(false);
    setCurrentPage(1);
  };

  const toggleSelectAll = () => {
    const modifiableOnPage = paginatedClients.filter(canModifyClient);
    const modifiableOnPageIds = modifiableOnPage.map(c => c.id);
    
    const allSelectedOnPage = modifiableOnPageIds.length > 0 && modifiableOnPageIds.every(id => selectedIds.includes(id));

    if (allSelectedOnPage) {
      setSelectedIds(prev => prev.filter(id => !modifiableOnPageIds.includes(id)));
      setSelectAllAcrossPages(false);
    } else {
      setSelectedIds(prev => {
        const newIds = [...prev];
        modifiableOnPageIds.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      });
    }
    setLastSelectedIndex(null);
  };

  const handleSelectAllAcrossPages = () => {
    const allModifiableIds = filteredClients.filter(canModifyClient).map(c => c.id);
    setSelectedIds(allModifiableIds);
    setSelectAllAcrossPages(true);
  };

  const toggleSelect = (client: Client, index?: number, isShift?: boolean) => {
    if (!canModifyClient(client)) return;
    const id = client.id;
    
    if (isShift && lastSelectedIndex !== null && index !== undefined) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedClients
        .slice(start, end + 1)
        .filter(canModifyClient)
        .map(c => c.id);
      
      setSelectedIds(prev => {
        const newIds = [...prev];
        rangeIds.forEach(rid => {
          if (!newIds.includes(rid)) newIds.push(rid);
        });
        return newIds;
      });
    } else {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    }
    
    if (index !== undefined) setLastSelectedIndex(index);
    setSelectAllAcrossPages(false);
  };

  const handleBulkUpdateStatus = async () => {
    if (!bulkNewStatus || selectedIds.length === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const clientRef = doc(db, 'clients', id);
        batch.update(clientRef, { status: bulkNewStatus });
      });
      
      await batch.commit();
      setSelectedIds([]);
      setSelectAllAcrossPages(false);
      setIsBulkStatusModalOpen(false);
      setBulkNewStatus('');
      toast.success(`Le statut a bien été mis à jour pour ${selectedIds.length} fiches`);
    } catch (error) {
      console.error("Error bulk updating status:", error);
      toast.error("Erreur lors de la mise à jour groupée");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const clientRef = doc(db, 'clients', id);
        batch.delete(clientRef);
      });
      
      await batch.commit();
      setSelectedIds([]);
      setSelectAllAcrossPages(false);
      setIsBulkDeleteModalOpen(false);
      toast.success(`${selectedIds.length} fiches ont été supprimées`);
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Erreur lors de la suppression groupée");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkUpdateAgenceur = async () => {
    if (!bulkNewAgenceur || selectedIds.length === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const clientRef = doc(db, 'clients', id);
        if (bulkNewAgenceur.id === 'none') {
          batch.update(clientRef, {
            'addedBy.name': 'Sans agenceur',
            'addedBy.avatar': '',
            'addedBy.uid': 'none',
            'details.referent': 'Sans agenceur'
          });
        } else {
          batch.update(clientRef, {
            'addedBy.name': bulkNewAgenceur.name,
            'addedBy.avatar': bulkNewAgenceur.avatar,
            'addedBy.uid': bulkNewAgenceur.id,
            'details.referent': bulkNewAgenceur.name
          });
        }
      });
      
      await batch.commit();
      setSelectedIds([]);
      setSelectAllAcrossPages(false);
      setIsBulkUpdateModalOpen(false);
      setBulkNewAgenceur(null);
      toast.success(`L'agenceur a bien été mis à jour pour ${selectedIds.length} fiches`);
    } catch (error) {
      console.error("Error bulk updating agenceur:", error);
      toast.error("Erreur lors de la mise à jour groupée");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleFindDuplicates = () => {
    const duplicates: string[] = [];
    const seen = new Map<string, string>(); // name -> firstId

    clients.forEach(client => {
      const name = normalizeString(client.name || '');
      if (!name || name === 'sans nom') return;
      
      if (seen.has(name)) {
        duplicates.push(client.id);
      } else {
        seen.set(name, client.id);
      }
    });

    if (duplicates.length > 0) {
      setSelectedIds(duplicates);
      toast.info(`${duplicates.length} doublons potentiels identifiés et sélectionnés. Vous pouvez maintenant utiliser la suppression groupée.`);
    } else {
      toast.info("Aucun doublon détecté.");
    }
  };

  const handleImportClients = async (importedData: any[]) => {
    if (!userProfile?.companyId) return;
    setIsImporting(true);
    try {
      const batchPromises = importedData.map(async (item) => {
        const addedBy = item.collaborator ? {
          name: item.collaborator.name,
          avatar: item.collaborator.avatar,
          uid: item.collaborator.id
        } : {
          name: 'Sans agenceur',
          avatar: '',
          uid: 'none'
        };

        const firstNameTrimmed = item.firstName?.trim() || "";
        const capitalizedFirstName = firstNameTrimmed ? firstNameTrimmed.charAt(0).toUpperCase() + firstNameTrimmed.slice(1).toLowerCase() : "";
        const lastNameUpper = item.lastName?.trim().toUpperCase() || "";
        const finalName = `${lastNameUpper} ${capitalizedFirstName}`.trim() || "SANS NOM";

        const address = item.address || "";
        const postcodeMatch = address.match(/\d{5}\s+([A-Za-zÀ-ÖØ-öø-ÿ\s\-]+)$/);
        const extractedCity = postcodeMatch ? postcodeMatch[1].trim() : (address.length < 30 ? address : "");

        await addDoc(collection(db, 'clients'), {
          name: finalName,
          status: item.status,
          origin: item.subOrigin || '',
          category: item.origin || '',
          location: item.address || 'Non renseignée',
          addedBy,
          dateAdded: new Date().toLocaleDateString('fr-FR'),
          companyId: userProfile.companyId,
          details: {
            ...(item.civility ? { civility: item.civility } : {}),
            lastName: lastNameUpper,
            firstName: capitalizedFirstName,
            email: item.email,
            phone: item.phone,
            fixed: item.fixed,
            address: item.address,
            city: extractedCity,
            category: item.origin,
            origin: item.subOrigin,
            subOrigin: item.source,
            year: item.year,
            referent: addedBy.name
          },
          createdAt: serverTimestamp(),
          directoryType: mode
        });
      });

      await Promise.all(batchPromises);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error("Error importing clients:", error);
      toast.error("Erreur lors de l'importation");
    } finally {
      setIsImporting(false);
    }
  };

  const uniqueAgenceurs = useMemo(() => {
    const names = clients.map(c => c.details?.referent || c.addedBy?.name || 'Sans agenceur');
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    return unique;
  }, [clients]);
  const uniqueOrigines = useMemo(() => Array.from(new Set(clients.map(c => c.category || c.details?.category || c.origin).filter(Boolean))).sort(), [clients]);
  const uniqueLocations = useMemo(() => {
    const cities = clients.map(c => {
      if (c.details?.city) return c.details.city;
      if (!c.location || c.location === 'Non renseignée') return '';
      
      // Heuristic for French addresses: "Street 12345 City"
      const postcodeMatch = c.location.match(/\d{5}\s+([A-Za-zÀ-ÖØ-öø-ÿ\s\-]+)$/);
      if (postcodeMatch) return postcodeMatch[1].trim();
      
      // If no postcode but short string, likely just the city
      if (c.location.length < 30) return c.location.trim();
      
      return '';
    }).filter(Boolean);
    return Array.from(new Set(cities)).sort();
  }, [clients]);

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

        <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                disabled={selectedIds.length === 0}
                className={`flex items-center px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-sm border ${
                  selectedIds.length > 0 
                  ? 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50 shadow-md' 
                  : 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
                }`}
              >
                Actions
                <ChevronDown size={14} className={`ml-2 transition-transform ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isActionsMenuOpen && selectedIds.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsActionsMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-56 animate-in fade-in zoom-in-95 duration-150">
                    <button 
                      onClick={() => { setIsBulkUpdateModalOpen(true); setIsActionsMenuOpen(false); }}
                      className="w-full text-left px-5 py-3 text-[11px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <UserPlus size={16} className="text-gray-400" /> Changer l'agenceur
                    </button>
                    <button 
                      onClick={() => { setIsBulkStatusModalOpen(true); setIsActionsMenuOpen(false); }}
                      className="w-full text-left px-5 py-3 text-[11px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Filter size={16} className="text-gray-400" /> Changer le statut
                    </button>
                    <div className="h-px bg-gray-50 my-1 mx-2" />
                    <button 
                      onClick={() => { setIsBulkDeleteModalOpen(true); setIsActionsMenuOpen(false); }}
                      className="w-full text-left px-5 py-3 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 size={16} className="text-red-500" /> Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>

            {mode === 'contacts' && (
                <button
                    onClick={handleFindDuplicates}
                    className="flex items-center px-4 py-3 bg-white text-indigo-600 border border-indigo-100 rounded-2xl text-sm font-bold hover:bg-indigo-50 transition-all shadow-sm"
                    title="Identifier les doublons potentiels"
                >
                    <AlertCircle size={18} className="mr-2" />
                    Nettoyer les doublons
                </button>
            )}
            {mode === 'contacts' && (
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                    <Upload size={18} className="mr-2" />
                    Import CSV
                </button>
            )}
            <button 
                onClick={onAddClick}
            className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200"
        >
            <Plus size={18} className="mr-2" />
            {config.addButton}
        </button>
      </div>
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
            label="Agenceur" 
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
            label="Ville" 
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
            <div className="flex flex-col h-full overflow-hidden relative">
                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                  <div className="absolute top-0 left-0 right-0 bg-[#1e293b] text-white p-4 z-30 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => { setSelectedIds([]); setSelectAllAcrossPages(false); }}
                          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                        <span className="text-sm font-black uppercase tracking-widest">
                          {selectedIds.length} ligne{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {!selectAllAcrossPages && filteredClients.length > paginatedClients.length && (
                        <button 
                          onClick={handleSelectAllAcrossPages}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold mt-1 ml-9 text-left transition-colors"
                        >
                          Sélectionner toutes les fiches de l'annuaire ({filteredClients.length})
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 relative">
                      <button 
                        onClick={() => { setSelectedIds([]); setSelectAllAcrossPages(false); }}
                        className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto flex-1 overflow-y-auto hide-scrollbar">
                    <table className="w-full text-left border-collapse text-gray-900">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] sticky top-0 z-20 shadow-sm">
                                <th className="px-4 py-5 w-10">
                                  <button 
                                    onClick={toggleSelectAll}
                                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Tout sélectionner sur cette page"
                                  >
                                    {(() => {
                                      const modifiableOnPage = paginatedClients.filter(canModifyClient);
                                      const modifiableOnPageIds = modifiableOnPage.map(c => c.id);
                                      const allSelectedOnPage = modifiableOnPageIds.length > 0 && modifiableOnPageIds.every(id => selectedIds.includes(id));
                                      
                                      if (allSelectedOnPage) {
                                        return <CheckSquare size={18} className="text-indigo-600" />;
                                      }
                                      return <Square size={18} className="text-gray-300" />;
                                    })()}
                                  </button>
                                </th>
                                <th 
                                    className="px-4 py-5 cursor-pointer hover:text-gray-900 transition-colors group/sort"
                                    onClick={() => {
                                        const direction = sortConfig?.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                        setSortConfig({ key: 'name', direction });
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {mode === 'suppliers' ? 'Nom' : 'Prénom & nom'}
                                        <div className={`flex flex-col transition-opacity ${sortConfig?.key === 'name' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}>
                                            <ChevronDown size={10} className={`-mb-1 transition-transform ${sortConfig?.key === 'name' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </th>
                                {mode !== 'suppliers' && (
                                    <th 
                                        className="px-8 py-5 cursor-pointer hover:text-gray-900 transition-colors group/sort"
                                        onClick={() => {
                                            const direction = sortConfig?.key === 'agenceur' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                            setSortConfig({ key: 'agenceur', direction });
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            Agenceur
                                            <div className={`flex flex-col transition-opacity ${sortConfig?.key === 'agenceur' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}>
                                                <ChevronDown size={10} className={`-mb-1 transition-transform ${sortConfig?.key === 'agenceur' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                    </th>
                                )}
                                <th 
                                    className="px-8 py-5 cursor-pointer hover:text-gray-900 transition-colors group/sort"
                                    onClick={() => {
                                        const direction = sortConfig?.key === 'origin' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                        setSortConfig({ key: 'origin', direction });
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {mode === 'suppliers' ? 'Branche' : 'Origine'}
                                        <div className={`flex flex-col transition-opacity ${sortConfig?.key === 'origin' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}>
                                            <ChevronDown size={10} className={`-mb-1 transition-transform ${sortConfig?.key === 'origin' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </th>
                                {mode !== 'suppliers' && (
                                    <th 
                                        className="px-8 py-5 cursor-pointer hover:text-gray-900 transition-colors group/sort"
                                        onClick={() => {
                                            const direction = sortConfig?.key === 'location' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                            setSortConfig({ key: 'location', direction });
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            Localisation
                                            <div className={`flex flex-col transition-opacity ${sortConfig?.key === 'location' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}>
                                                <ChevronDown size={10} className={`-mb-1 transition-transform ${sortConfig?.key === 'location' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                    </th>
                                )}
                                {mode === 'contacts' && <th className="px-8 py-5 text-center">Projet(s)</th>}
                                {mode === 'suppliers' && <th className="px-8 py-5">Métiers</th>}
                                <th 
                                    className="px-8 py-5 cursor-pointer hover:text-gray-900 transition-colors group/sort text-center"
                                    onClick={() => {
                                        const direction = sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                        setSortConfig({ key: 'status', direction });
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {mode === 'suppliers' ? 'Sélection' : 'Statut'}
                                        <div className={`flex flex-col transition-opacity ${sortConfig?.key === 'status' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}>
                                            <ChevronDown size={10} className={`-mb-1 transition-transform ${sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </th>
                                {mode === 'suppliers' && <th className="px-8 py-5">Email</th>}
                                {mode === 'suppliers' && <th className="px-8 py-5">Tel</th>}
                                {mode !== 'suppliers' && (
                                    <th 
                                        className="px-8 py-5 cursor-pointer hover:text-gray-900 transition-colors group/sort"
                                        onClick={() => {
                                            const direction = sortConfig?.key === 'createdAt' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                                            setSortConfig({ key: 'createdAt', direction });
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            Ajouté le
                                            <div className={`flex flex-col transition-opacity ${sortConfig?.key === 'createdAt' ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}>
                                                <ChevronDown size={10} className={`-mb-1 transition-transform ${sortConfig?.key === 'createdAt' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                    </th>
                                )}
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedClients.map((client, index) => {
                                const effectiveStatus = getEffectiveStatus(client);
                                const isSelected = selectedIds.includes(client.id);
                                const modifiable = canModifyClient(client);
                                return (
                                <tr 
                                    key={client.id} 
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey) {
                                            toggleSelect(client, index, e.shiftKey);
                                        } else if (e.shiftKey) {
                                            toggleSelect(client, index, true);
                                        } else {
                                            onClientClick(client);
                                        }
                                    }}
                                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-50/30' : ''} ${!modifiable ? 'opacity-70' : ''}`}
                                >
                                    <td 
                                        className="px-4 py-5 w-10" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelect(client, index, e.shiftKey);
                                        }}
                                    >
                                      {modifiable ? (
                                        <div className="p-1 hover:bg-gray-100 rounded-md transition-colors inline-block">
                                          {isSelected ? (
                                            <CheckSquare size={18} className="text-indigo-600" />
                                          ) : (
                                            <Square size={18} className="text-gray-300 group-hover:text-gray-400" />
                                          )}
                                        </div>
                                      ) : (
                                        <div className="p-1 text-gray-200" title="Modification non autorisée">
                                          <Square size={18} />
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-5 text-[13px] font-black text-gray-900 tracking-tight">
                                        <div className="flex flex-col">
                                            <span>{(() => {
                                                const queryNormalized = normalizeString(searchQuery);
                                                if (!queryNormalized) return formatFullNameFirstLast(client.name);
                                                
                                                // Chercher un match dans les contacts secondaires
                                                const secondaryContacts = [
                                                    ...((client as any).details?.additionalContacts || []),
                                                    (client as any).details?.secondaryContact
                                                ].filter(Boolean);
                                                
                                                for (const sc of secondaryContacts) {
                                                    const fn = normalizeString(sc.firstName || '');
                                                    const ln = normalizeString(sc.lastName || '');
                                                    const full = normalizeString(`${sc.firstName || ''} ${sc.lastName || ''}`);
                                                    const email = normalizeString(sc.email || '');
                                                    const mobile = normalizeString(sc.mobile || '');
                                                    const landline = normalizeString(sc.landline || '');
                                                    
                                                    if (fn.includes(queryNormalized) || 
                                                        ln.includes(queryNormalized) || 
                                                        full.includes(queryNormalized) ||
                                                        email.includes(queryNormalized) ||
                                                        mobile.includes(queryNormalized) ||
                                                        landline.includes(queryNormalized)) {
                                                        const displayName = formatNameFirstLast(sc.firstName, sc.lastName);
                                                        if (displayName) return displayName;
                                                    }
                                                }
                                                
                                                return formatFullNameFirstLast(client.name);
                                            })()}</span>
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
                                        <td className="px-4 py-5">
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const referentName = client.details?.referent || client.addedBy?.name || 'Sans agenceur';
                                                    const referent = teamMembers.find(m => m.name === referentName);
                                                    const avatar = referent?.avatar || client.addedBy?.avatar;
                                                    
                                                    return (
                                                        <>
                                                            {referentName === 'Sans agenceur' ? (
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 border border-white shadow-sm">
                                                                    <X size={14} />
                                                                </div>
                                                            ) : (
                                                                <img 
                                                                    src={avatar} 
                                                                    alt="" 
                                                                    className="w-8 h-8 rounded-full border border-white shadow-sm object-cover bg-gray-50" 
                                                                    referrerPolicy="no-referrer"
                                                                />
                                                            )}
                                                            <span className={`text-[13px] font-bold ${referentName === 'Sans agenceur' ? 'text-gray-300 italic' : 'text-gray-700'}`}>
                                                                {formatFullNameFirstLast(referentName)}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-4 py-5 text-[13px] font-bold text-gray-500 uppercase">
                                        {mode === 'suppliers' ? (
                                            <span className={client.details?.branch ? "text-gray-900" : "text-gray-300 italic"}>
                                                {client.details?.branch || 'Non renseigné'}
                                            </span>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className={client.category || client.details?.category || client.origin ? "text-gray-900" : "text-gray-300 italic"}>
                                                    {client.category || client.details?.category || client.origin || 'Non renseigné'}
                                                </span>
                                                {(client.category || client.details?.category) && client.origin && client.origin !== 'Import CSV' && (
                                                    <span className="text-[10px] text-gray-400 font-medium lowercase">({client.origin})</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    {mode !== 'suppliers' && (
                                      <td className="px-4 py-5 text-[13px] font-bold text-gray-500">
                                        <div className="max-w-[220px] line-clamp-2 leading-tight uppercase overflow-hidden whitespace-normal">
                                          {(() => {
                                            const mainProp = client.details?.properties?.find((p: any) => p.isMain);
                                            const addr = mainProp?.address || client.details?.address || client.location;
                                            return (
                                                <span className={addr ? "text-gray-900" : "text-gray-300 italic"}>
                                                    {addr || 'Non renseignée'}
                                                </span>
                                            );
                                          })()}
                                        </div>
                                      </td>
                                    )}
                                    {mode === 'contacts' && (
                                      <td className="px-4 py-5">
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
                                        <td className="px-4 py-5">
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
                                    <td className="px-4 py-5 text-center">
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
                                        <td className="px-4 py-5 text-[12px] font-bold text-gray-500 lowercase truncate max-w-[150px]">
                                            <span className={client.details?.email ? "text-gray-500" : "text-gray-300 italic"}>
                                                {client.details?.email || '-'}
                                            </span>
                                        </td>
                                    )}
                                    {mode === 'suppliers' && (
                                        <td className="px-4 py-5 text-[12px] font-bold text-gray-500 whitespace-nowrap">
                                            {(() => {
                                                const formatted = formatPhone(client.details?.phone);
                                                const isDefault = !formatted || formatted === '00 00 00 00 00';
                                                return (
                                                    <span className={isDefault ? "text-gray-300 italic" : "text-gray-500"}>
                                                        {formatted || '-'}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                    )}
                                    {mode !== 'suppliers' && <td className="px-4 py-5 text-[13px] font-black text-gray-400 italic">{client.dateAdded}</td>}
                                    <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2 relative">
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
                                                                <Trash2 size={16} className="text-red-600" /> Supprimer la fiche
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
                    <div>Vue <span className="font-black text-gray-900">{(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredClients.length)}</span> sur <span className="font-black text-gray-900">{filteredClients.length}</span> résultats</div>
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronsLeft size={16} />
                        </button>
                        <button 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        
                        {(() => {
                          const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
                          const pages = [];
                          let startPage = Math.max(1, currentPage - 2);
                          let endPage = Math.min(totalPages, startPage + 4);
                          
                          if (endPage - startPage < 4) {
                            startPage = Math.max(1, endPage - 4);
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button 
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`w-10 h-10 rounded-xl text-[12px] font-black transition-all ${
                                  currentPage === i ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50 border border-gray-100'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pages;
                        })()}

                        <button 
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredClients.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(filteredClients.length / itemsPerPage) || filteredClients.length === 0}
                          className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} className="rotate-180" />
                        </button>
                        <button 
                          onClick={() => setCurrentPage(Math.ceil(filteredClients.length / itemsPerPage))}
                          disabled={currentPage === Math.ceil(filteredClients.length / itemsPerPage) || filteredClients.length === 0}
                          className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronsLeft size={16} className="rotate-180" />
                        </button>
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
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} className="text-red-600" />} Supprimer
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Bulk Update Status Modal */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Filter size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Changer le statut</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedIds.length} fiches sélectionnées</p>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                {['Lead', 'Prospect', 'Client'].map(status => (
                  <button
                    key={status}
                    onClick={() => setBulkNewStatus(status)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      bulkNewStatus === status 
                      ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <span className={`text-sm font-black uppercase tracking-widest ${bulkNewStatus === status ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {status}
                    </span>
                    {bulkNewStatus === status && (
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => { setIsBulkStatusModalOpen(false); setBulkNewStatus(''); }} 
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all uppercase tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleBulkUpdateStatus} 
                  disabled={isBulkUpdating || !bulkNewStatus} 
                  className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold text-[13px] hover:bg-black shadow-xl shadow-gray-200 flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Valider
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer la sélection ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                Êtes-vous sûr de vouloir supprimer les <span className="font-bold text-gray-900">[{selectedIds.length}]</span> fiches sélectionnées ?<br/>
                Cette action est irréversible.
              </p>
              <div className="flex gap-4 w-full">
                <button onClick={() => setIsBulkDeleteModalOpen(false)} className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all uppercase tracking-widest">Annuler</button>
                <button 
                  onClick={handleBulkDelete} 
                  disabled={isBulkUpdating} 
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-[13px] hover:bg-red-700 shadow-xl shadow-red-100 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  {isBulkUpdating ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} className="text-red-600" />} Supprimer
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Bulk Update Agenceur Modal */}
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Changer l'agenceur</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedIds.length} fiches sélectionnées</p>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Choisir le nouvel agenceur</label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Option Sans agenceur */}
                    <button
                      onClick={() => setBulkNewAgenceur({ id: 'none', name: 'Sans agenceur' })}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        bulkNewAgenceur?.id === 'none' 
                        ? 'border-red-600 bg-red-50 shadow-md' 
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                        <UserPlus size={20} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-black uppercase tracking-tight ${bulkNewAgenceur?.id === 'none' ? 'text-red-900' : 'text-gray-900'}`}>
                          Sans agenceur
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Désattribuer</p>
                      </div>
                      {bulkNewAgenceur?.id === 'none' && (
                        <div className="ml-auto w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white">
                          <Check size={14} />
                        </div>
                      )}
                    </button>

                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => setBulkNewAgenceur(member)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          bulkNewAgenceur?.id === member.id 
                          ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                        }`}
                      >
                        <img 
                          src={member.avatar} 
                          alt="" 
                          className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left">
                          <p className={`text-sm font-black uppercase tracking-tight ${bulkNewAgenceur?.id === member.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                            {member.name}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{member.role || 'Collaborateur'}</p>
                        </div>
                        {bulkNewAgenceur?.id === member.id && (
                          <div className="ml-auto w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => { setIsBulkUpdateModalOpen(false); setBulkNewAgenceur(null); }} 
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all uppercase tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleBulkUpdateAgenceur} 
                  disabled={isBulkUpdating || !bulkNewAgenceur} 
                  className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold text-[13px] hover:bg-black shadow-xl shadow-gray-200 flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Valider
                </button>
              </div>
          </div>
        </div>
      )}

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setClientToEdit(null); }} userProfile={userProfile} clientToEdit={clientToEdit} />
      
      {/* Import Modal */}
      <ClientImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportClients}
        isImporting={isImporting}
        userProfile={userProfile}
      />
    </div>
  );
};

export default Directory;
