
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronDown, Plus, CheckSquare, Calendar as CalendarIcon, Loader2, Save, CalendarClock, Clock, Search, User as UserIcon, AlertTriangle, Trash2, Info, Layers, UserCheck, Check, Link } from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { collection, addDoc, query, where, onSnapshot, getDocs, doc, updateDoc, getCountFromServer, deleteDoc, getDoc } from '@firebase/firestore';
import { Task } from '../types';

// Structure de données hiérarchique unifiée
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

// Fonction utilitaire pour formater le nom du client (Prénom en casse mixte, Nom en majuscules)
const formatClientNameDisplay = (fullName: string) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  
  // On considère que le premier mot est le Prénom et le reste le Nom
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  const formattedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const formattedLast = lastName.toUpperCase();
  
  return `${formattedFirst} ${formattedLast}`;
};

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
  initialClientId?: string;
  initialClientName?: string;
  initialProjectId?: string;
  taskToEdit?: Task | null;
  isLeadAutoTask?: boolean; 
  isProjectAutoTask?: boolean;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  initialClientId = '', 
  initialClientName = '',
  initialProjectId = '' ,
  taskToEdit = null,
  isLeadAutoTask = false,
  isProjectAutoTask = false
}) => {
  const isEdit = !!taskToEdit;
  // Déterminer si on travaille sur une tâche auto (création ou édition)
  const isCurrentlyAuto = isLeadAutoTask || isProjectAutoTask || (isEdit && taskToEdit?.type === 'Tâche auto');
  
  const [isMemo, setIsMemo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);
  
  // Form States
  const [title, setTitle] = useState('');
  const [selectedCollaboratorIdx, setSelectedCollaboratorIdxValue] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedStatusLabel, setSelectedStatusLabel] = useState('À qualifier');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');

  // Qualification States for Auto Tasks
  const [qualifData, setQualifData] = useState({
    categorie: '',
    origine: '',
    sousOrigine: ''
  });

  // Sponsorship States
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [sponsorSuggestions, setSponsorSuggestions] = useState<any[]>([]);
  const [showSponsorResults, setShowSponsorResults] = useState(false);
  const sponsorSearchRef = useRef<HTMLDivElement>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<{id: string, name: string} | null>(null);
  const [sponsorLink, setSponsorLink] = useState('');

  // Refs for Date Pickers
  const endDateRef = useRef<HTMLInputElement>(null);
  const agendaDateRef = useRef<HTMLInputElement>(null);

  // Collaborators from Database
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Client Search States
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Agenda Integration States
  const [isScheduled, setIsScheduled] = useState(false);
  const [agendaDate, setAgendaDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(null);
  
  // Conflict Detection
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [conflictingEvents, setConflictingEvents] = useState<any[]>([]);

  const [clients, setClients] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  // Liste unifiée pour les leads et les tâches manuelles
  const taskStatusOptions = [
    'À qualifier',
    'À recontacter',
    'Projet long terme',
    'Non qualifié',
    'Terminé'
  ];

  const projectAutoStatusOptions = [
    'Etude à réaliser',
    'Etude à modifier',
    'Etude à relancer',
    'Etude cloturée'
  ];

  const statusOptions = isProjectAutoTask ? projectAutoStatusOptions : taskStatusOptions;

  // MAPPING DES TITRES AUTOMATIQUES
  const getAutoTitle = (status: string, clientName: string) => {
    const name = formatClientNameDisplay(clientName) || 'Client';
    switch (status) {
      case 'À qualifier': return `Qualifier : ${name}`;
      case 'À recontacter': return `Recontacter : ${name}`;
      case 'Projet long terme': return `Suivi long terme : ${name}`;
      case 'Non qualifié': return `Dossier non qualifié : ${name}`;
      case 'Terminé': return `Clôturé : ${name}`;
      case 'Etude à réaliser': return `Suivi : Etude à réaliser - ${name}`;
      case 'Etude à modifier': return `Suivi : Etude à modifier - ${name}`;
      case 'Etude à relancer': return `Suivi : Etude à relancer - ${name}`;
      case 'Etude cloturée': return `Suivi : Etude cloturée - ${name}`;
      default: return `Suivi : ${name}`;
    }
  };

  // Helper to trigger native date picker
  const handleDatePickerClick = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          ref.current.showPicker();
        } else {
          ref.current.click();
        }
      } catch (e) {
        ref.current.click();
      }
    }
  };

  // Load Collaborators
  useEffect(() => {
    if (!isOpen || !userProfile?.companyId) return;

    const q = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setCollaborators(users);
      
      if (userProfile) {
        const idx = users.findIndex(u => u.uid === userProfile.uid);
        if (idx !== -1) setSelectedCollaboratorIdxValue(idx);
      }
    });

    return () => unsubscribe();
  }, [isOpen, userProfile?.companyId, userProfile]);

  // Qualification Logic
  const categories = useMemo(() => Object.keys(HIERARCHY_DATA), []);
  const origins = useMemo(() => qualifData.categorie ? Object.keys(HIERARCHY_DATA[qualifData.categorie] || {}) : [], [qualifData.categorie]);
  const sources = useMemo(() => (qualifData.categorie && qualifData.origine) ? (HIERARCHY_DATA[qualifData.categorie]?.[qualifData.origine] || []) : [], [qualifData.categorie, qualifData.origine]);

  // Load Client Info when a client is selected
  useEffect(() => {
    if (isOpen && selectedClientId) {
      const fetchClientInfo = async () => {
        const clientSnap = await getDoc(doc(db, 'clients', selectedClientId));
        if (clientSnap.exists()) {
          const data = clientSnap.data();
          
          // Données de qualification pour les tâches auto - Récupération de la fiche lead
          if (isCurrentlyAuto) {
            setQualifData({
              categorie: data.details?.category || '',
              origine: data.origin || '',
              sousOrigine: data.details?.subOrigin || ''
            });

            // Charger les infos de parrainage existantes
            if (data.details?.sponsorId) {
              setSelectedSponsor({ id: data.details.sponsorId, name: data.details.sponsorName });
            }
            setSponsorLink(data.details?.sponsorLink || '');
          }
        }
      };
      fetchClientInfo();
    }
  }, [isOpen, isCurrentlyAuto, selectedClientId]);

  // Load Linked Appointment for the task
  useEffect(() => {
    if (!isOpen || !userProfile?.companyId || !isEdit || !taskToEdit) {
      setLinkedAppointmentId(null);
      return;
    }

    const q = query(
      collection(db, 'appointments'), 
      where('taskId', '==', taskToEdit.id),
      where('companyId', '==', userProfile.companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const linked = snapshot.docs[0];
        const data = linked.data();
        setLinkedAppointmentId(linked.id);
        setIsScheduled(true);
        setStartTime(data.startTime || '09:00');
        setEndTime(data.endTime || '10:00');
        
        if (data.date && data.date.includes('/')) {
           const [d, m, y] = data.date.split('/');
           setAgendaDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
        }
      } else {
        setLinkedAppointmentId(null);
        setIsScheduled(false);
      }
    });

    return () => unsubscribe();
  }, [isOpen, userProfile?.companyId, isEdit, taskToEdit]);

  // Load All Appointments for conflict checking
  useEffect(() => {
    if (!isOpen || !userProfile?.companyId) return;

    const q = query(collection(db, 'appointments'), where('companyId', '==', userProfile.companyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [isOpen, userProfile?.companyId]);

  // Conflict Detection Logic
  useEffect(() => {
    if (!isScheduled || !agendaDate || collaborators.length === 0) {
      setConflictingEvents([]);
      return;
    }

    const selectedCollab = collaborators[selectedCollaboratorIdx];
    const targetDateFormatted = new Date(agendaDate).toLocaleDateString('fr-FR');
    
    const conflicts = allAppointments.filter(rdv => {
      if (linkedAppointmentId && rdv.id === linkedAppointmentId) return false;
      if (rdv.date !== targetDateFormatted || rdv.collaborator.name !== selectedCollab.name) return false;
      return (startTime < rdv.endTime) && (endTime > rdv.startTime);
    });

    setConflictingEvents(conflicts);
  }, [isScheduled, agendaDate, startTime, endTime, selectedCollaboratorIdx, collaborators, allAppointments, linkedAppointmentId]);

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
          .filter(c => c.id !== selectedClientId && c.name.toLowerCase().includes(normalizedQuery))
          .slice(0, 5);
        setSponsorSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    };

    const timer = setTimeout(searchSponsor, 300);
    return () => clearTimeout(timer);
  }, [sponsorSearch, userProfile?.companyId, selectedClientId]);

  // Click outside search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientResults(false);
      }
      if (sponsorSearchRef.current && !sponsorSearchRef.current.contains(event.target as Node)) {
        setShowSponsorResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form Initial Load
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setIsMemo(taskToEdit.type === 'Mémo');
        setSelectedStatusLabel(taskToEdit.statusLabel || 'À qualifier');
        setNote((taskToEdit as any).note || '');
        setSelectedClientId((taskToEdit as any).clientId || '');
        setSelectedProjectId((taskToEdit as any).projectId || '');
        
        if (collaborators.length > 0) {
          const cIdx = collaborators.findIndex(c => c.name === taskToEdit.collaborator.name);
          setSelectedCollaboratorIdxValue(cIdx !== -1 ? cIdx : 0);
        }

        if (taskToEdit.date && taskToEdit.date.includes('/')) {
          const [d, m, y] = taskToEdit.date.split('/');
          setEndDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
        } else {
          setEndDate('');
        }
      } else {
        // PRE-FILL TITLE FOR AUTO TASKS
        if (isLeadAutoTask || isProjectAutoTask) {
          const defaultStatus = isProjectAutoTask ? 'Etude à réaliser' : 'À qualifier';
          setSelectedStatusLabel(defaultStatus);
          setTitle(getAutoTitle(defaultStatus, initialClientName));
        } else {
          setTitle('');
          setSelectedStatusLabel('À qualifier');
        }
        
        setIsMemo(false);
        setNote('');
        setSelectedClientId(initialClientId);
        setSelectedProjectId(initialProjectId);
        setEndDate('');
        setAgendaDate('');
        setIsScheduled(false);
        setLinkedAppointmentId(null);
        setSelectedSponsor(null);
        setSponsorLink('');
      }
    }
  }, [isOpen, taskToEdit, initialClientId, initialProjectId, initialClientName, collaborators, isLeadAutoTask, isProjectAutoTask]);

  // Clients & Projects Loading
  useEffect(() => {
    if (!isOpen || !userProfile?.companyId) return;

    const fetchData = async () => {
      const clientsQ = query(collection(db, 'clients'), where('companyId', '==', userProfile.companyId));
      const clientsSnap = await getDocs(clientsQ);
      const loadedClients = clientsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setClients(loadedClients);

      const currentClientId = taskToEdit ? (taskToEdit as any).clientId : initialClientId;
      if (currentClientId) {
        const found = loadedClients.find(c => c.id === currentClientId);
        if (found) {
          setClientSearchQuery(formatClientNameDisplay(found.name));
          setSelectedClientId(found.id);
        }
      }

      const projectsQ = query(collection(db, 'projects'), where('companyId', '==', userProfile.companyId));
      const projectsSnap = await getDocs(projectsQ);
      const loadedProjects = projectsSnap.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().projectName,
        clientId: doc.data().clientId,
        agenceurUid: doc.data().agenceur?.uid || ''
      }));
      setAllProjects(loadedProjects);

      if (initialProjectId && !isEdit) {
        const currentProject = loadedProjects.find(p => p.id === initialProjectId);
        if (currentProject) {
          // If title isn't already set by auto-logic
          if (!isProjectAutoTask) {
             setTitle(`Suivi : ${currentProject.name}`);
          }
          if (collaborators.length > 0 && currentProject.agenceurUid) {
            const collabIdx = collaborators.findIndex(c => c.uid === currentProject.agenceurUid);
            if (collabIdx !== -1) setSelectedCollaboratorIdxValue(collabIdx);
          }
        }
      }
    };

    fetchData();
  }, [isOpen, userProfile?.companyId, initialClientId, initialProjectId, taskToEdit, collaborators, isProjectAutoTask]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()));
  }, [clientSearchQuery, clients]);

  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return [];
    return allProjects.filter(p => p.clientId === selectedClientId);
  }, [selectedClientId, allProjects]);

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatusLabel(newStatus);
    if (isCurrentlyAuto) {
      // Retrouver le nom du client actuel pour le titre
      const currentClientName = clients.find(c => c.id === selectedClientId)?.name || initialClientName;
      setTitle(getAutoTitle(newStatus, currentClientName));
    }
  };

  const handleRemoveFromAgenda = async () => {
    if (!linkedAppointmentId) return;
    if (!window.confirm("Voulez-vous retirer cet événement de votre agenda ?")) return;

    setIsDeletingAppointment(true);
    try {
      await deleteDoc(doc(db, 'appointments', linkedAppointmentId));
      setIsScheduled(false);
      setLinkedAppointmentId(null);
      setAgendaDate('');
    } catch (e) {
      console.error("Erreur suppression RDV:", e);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.companyId || !title || collaborators.length === 0) return;

    setIsLoading(true);
    try {
      const selectedCollab = collaborators[selectedCollaboratorIdx];
      const selectedProjectName = !isMemo ? (allProjects.find(p => p.id === selectedProjectId)?.name || '') : '';
      const selectedClientName = !isMemo ? (clients.find(c => c.id === selectedClientId)?.name || '') : '';

      // LOGIQUE DE PERSISTANCE DU TYPE 'AUTO'
      const finalType = isCurrentlyAuto ? 'Tâche auto' : (isMemo ? 'Mémo' : 'Tâche manuelle');

      // DETERMINER LE STATUT OPERATIONNEL (completed ou pending/in-progress)
      let operationalStatus = 'pending';
      if ((selectedStatusLabel === 'Terminé' || selectedStatusLabel === 'Etude cloturée') && !isMemo) {
        operationalStatus = 'completed';
      } else if (isEdit && taskToEdit) {
        // En édition, si le label n'est plus "Terminé" mais que la tâche l'était, on la réouvre
        if (taskToEdit.status === 'completed' && selectedStatusLabel !== 'Terminé' && selectedStatusLabel !== 'Etude cloturée') {
          operationalStatus = 'pending';
        } else {
          operationalStatus = taskToEdit.status;
        }
      }

      const taskData: any = {
        title: title,
        subtitle: selectedProjectName,
        type: finalType,
        statusLabel: isMemo ? '' : selectedStatusLabel,
        status: operationalStatus,
        tagColor: isMemo ? 'gray' : (selectedStatusLabel === 'Prioritaire' || selectedStatusLabel === 'Urgent' ? 'pink' : 'gray'),
        date: endDate ? new Date(endDate).toLocaleDateString('fr-FR') : '',
        collaborator: {
          uid: selectedCollab.uid,
          name: selectedCollab.name,
          avatar: selectedCollab.avatar
        },
        hasNote: !!note,
        note: note,
        clientId: isMemo ? '' : selectedClientId,
        projectId: isMemo ? '' : selectedProjectId,
      };

      let taskId = '';

      if (isEdit && taskToEdit) {
        taskId = taskToEdit.id;
        await updateDoc(doc(db, 'tasks', taskToEdit.id), taskData);
      } else {
        const countQuery = query(collection(db, 'tasks'), where('companyId', '==', userProfile.companyId));
        const countSnap = await getCountFromServer(countQuery);
        const nextIndex = countSnap.data().count;

        const docRef = await addDoc(collection(db, 'tasks'), {
          ...taskData,
          statusType: 'toggle',
          companyId: userProfile.companyId,
          orderIndex: nextIndex,
          createdAt: new Date().toISOString()
        });
        taskId = docRef.id;
      }

      // MISE À JOUR DE LA FICHE CLIENT (SYNCHRO QUALIF + PARRAINAGE)
      if (selectedClientId) {
        const clientRef = doc(db, 'clients', selectedClientId);
        const clientUpdate: any = {};

        if (isLeadAutoTask) {
          // On garde la mise à jour en fond même si le bloc UI est masqué, car qualifData est sync au montage
          clientUpdate["details.category"] = qualifData.categorie;
          clientUpdate["origin"] = qualifData.origine;
          clientUpdate["details.subOrigin"] = qualifData.sousOrigine;

          // Sauvegarde des infos de parrainage
          if (qualifData.categorie === 'Parrainage' || qualifData.origine === 'Parrainage') {
            clientUpdate["details.sponsorId"] = selectedSponsor?.id || null;
            clientUpdate["details.sponsorName"] = selectedSponsor?.name || null;
            clientUpdate["details.sponsorLink"] = sponsorLink || '';
          } else {
            clientUpdate["details.sponsorId"] = null;
            clientUpdate["details.sponsorName"] = null;
            clientUpdate["details.sponsorLink"] = '';
          }
        }

        if (Object.keys(clientUpdate).length > 0) {
          await updateDoc(clientRef, clientUpdate);
        }
      }

      if (isScheduled && agendaDate) {
        const rdvDate = new Date(agendaDate).toLocaleDateString('fr-FR');
        const appointmentData: any = {
          clientId: selectedClientId || null,
          clientName: selectedClientName || 'Client divers',
          projectId: selectedProjectId || null,
          projectName: selectedProjectName || null,
          title: `[${finalType === 'Tâche auto' ? 'Auto' : (isMemo ? 'Mémo' : 'Tâche')}] ${title}`,
          type: 'Autre',
          date: rdvDate,
          startTime: startTime,
          endTime: endTime,
          location: 'Showroom',
          status: 'confirmé',
          collaborator: {
            name: selectedCollab.name,
            avatar: selectedCollab.avatar
          },
          companyId: userProfile.companyId,
          taskId: taskId,
          createdAt: new Date().toISOString()
        };

        if (linkedAppointmentId) {
          await updateDoc(doc(db, 'appointments', linkedAppointmentId), appointmentData);
        } else {
          await addDoc(collection(db, 'appointments'), appointmentData);
        }
      } else if (!isScheduled && linkedAppointmentId) {
        await deleteDoc(doc(db, 'appointments', linkedAppointmentId));
      }
      
      onClose();
    } catch (error) {
      console.error("Erreur Firestore tâche:", error);
      alert("Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center space-x-4">
              <div className={`p-2.5 border rounded-xl shadow-sm ${isEdit ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                {isEdit ? <Save size={20} /> : <CheckSquare size={20} />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  {isProjectAutoTask 
                    ? 'Créer une tâche automatique pour le projet' 
                    : (isLeadAutoTask 
                        ? 'Qualification de la fiche lead' 
                        : (isEdit 
                            ? `Modifier : ${taskToEdit?.title}` 
                            : `Créer une tâche manuelle`
                          )
                      )
                  }
                </h2>
                {isEdit && <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Mode édition actif</p>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-full transition-all hover:rotate-90">
              <X size={22} className="text-gray-400" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Row 1: Titre & Etat (Highlight) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className={`${isMemo ? 'md:col-span-12' : 'md:col-span-8'} space-y-2`}>
                <label className="block text-xs font-bold text-gray-500 ml-1">{isMemo ? 'Titre du mémo*' : 'Titre de la tâche*'}</label>
                <input 
                  required
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isMemo ? "Ex: Liste de courses showroom" : "Ex: Appeler M. Dubois pour le devis"}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-gray-900 outline-none transition-all"
                />
              </div>

              {!isMemo && (
                <div className="md:col-span-4 space-y-2 animate-in fade-in slide-in-from-right-2">
                  <label className="block text-xs font-bold text-gray-500 ml-1">Etat</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-indigo-50/30 border border-indigo-100 rounded-xl px-4 py-3 text-sm font-black text-indigo-900 hover:border-indigo-400 outline-none transition-all cursor-pointer shadow-sm"
                      value={selectedStatusLabel}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      {statusOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {!isCurrentlyAuto && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                <label className="block text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-[0.1em]">Nature de l'entrée</label>
                <div className="flex items-center gap-6">
                  <span className={`text-sm font-bold transition-all ${!isMemo ? 'text-gray-900 scale-105' : 'text-gray-400 opacity-60'}`}>Tâche manuelle</span>
                  <button 
                    type="button"
                    onClick={() => setIsMemo(!isMemo)}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none shadow-sm ${isMemo ? 'bg-[#A886D7]' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${isMemo ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                  <span className={`text-sm font-bold transition-all ${isMemo ? 'text-gray-900 scale-105' : 'text-gray-400 opacity-60'}`}>Mémo</span>
                </div>
              </div>
            )}

            {/* Row 2: Collaborateur assigné */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-12 space-y-2">
                <label className="block text-xs font-bold text-gray-500 ml-1">Collaborateur assigné (Tâche)</label>
                <div className="relative group">
                  <select 
                    className="w-full appearance-none flex items-center pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 hover:border-[#A886D7] focus:ring-2 focus:ring-purple-50 outline-none transition-all cursor-pointer"
                    onChange={(e) => setSelectedCollaboratorIdxValue(parseInt(e.target.value))}
                    value={selectedCollaboratorIdx}
                  >
                    {collaborators.length > 0 ? (
                      collaborators.map((c, i) => (
                        <option key={i} value={i}>{c.name}</option>
                      ))
                    ) : (
                      <option>Chargement...</option>
                    )}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                     {collaborators.length > 0 && (
                       <img src={collaborators[selectedCollaboratorIdx]?.avatar} className="w-6 h-6 rounded-full border border-white shadow-sm" alt="" />
                     )}
                  </div>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-12 space-y-2">
                <label className="block text-xs font-bold text-gray-500 ml-1">Échéance de la {isMemo ? 'note' : 'tâche'}</label>
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => handleDatePickerClick(endDateRef)}
                >
                  <input 
                    ref={endDateRef}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-50 focus:border-gray-900 outline-none transition-all cursor-pointer"
                    style={{ colorScheme: 'light' }}
                  />
                  <CalendarIcon 
                    size={18} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 transition-colors pointer-events-none" 
                  />
                </div>
              </div>
            </div>

            {/* Agenda Schedule Block */}
            <div className={`p-6 border-2 rounded-2xl transition-all duration-300 ${isScheduled ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isScheduled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Placer dans l'agenda</h3>
                    <p className="text-[10px] text-gray-400 font-medium">Bloquer un créneau pour réaliser cette {isMemo ? 'note' : 'tâche'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {linkedAppointmentId && (
                    <button 
                      type="button" 
                      onClick={handleRemoveFromAgenda}
                      disabled={isDeletingAppointment}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all border border-red-100"
                    >
                      {isDeletingAppointment ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Supprimer de l'agenda
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setIsScheduled(!isScheduled)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-sm ${isScheduled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isScheduled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {isScheduled && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Jour de réalisation</label>
                      <div 
                        className="relative group cursor-pointer"
                        onClick={() => handleDatePickerClick(agendaDateRef)}
                      >
                        <input 
                          ref={agendaDateRef}
                          type="date"
                          value={agendaDate}
                          onChange={(e) => setAgendaDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:border-indigo-400 transition-all cursor-pointer"
                          style={{ colorScheme: 'light' }}
                        />
                        <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 group-hover:text-indigo-600 transition-colors pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Heure de début</label>
                      <div className="relative group">
                        <input 
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:border-indigo-400 transition-all"
                        />
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Heure de fin</label>
                      <div className="relative group">
                        <input 
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:border-indigo-400 transition-all"
                        />
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {conflictingEvents.length > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-4 animate-in slide-in-from-left-4 duration-300">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[13px] font-bold text-orange-900">Chevauchement d'agenda détecté !</p>
                        <p className="text-[12px] text-orange-700 leading-relaxed font-medium">
                          Attention, <strong>{collaborators[selectedCollaboratorIdx]?.name}</strong> a déjà des événements placés sur ce créneau : <br/>
                          <span className="italic">{conflictingEvents.map(c => c.title).join(', ')}</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {!agendaDate && (
                    <p className="col-span-full text-[10px] text-red-500 font-bold italic mt-1 px-1">
                      ⚠️ Veuillez renseigner le "Jour de réalisation" pour valider l'inscription à l'agenda.
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isMemo && (
              <div className={`grid grid-cols-1 ${isLeadAutoTask ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className="space-y-2 relative" ref={clientSearchRef}>
                  <label className="block text-xs font-bold text-gray-500 ml-1">Client lié {(isLeadAutoTask || isEdit || isProjectAutoTask) ? '(verrouillé)' : ''}</label>
                  <div className="relative">
                    <input 
                      disabled={isLeadAutoTask || isEdit || isProjectAutoTask}
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        setShowClientResults(true);
                        if (!e.target.value) setSelectedClientId('');
                      }}
                      onFocus={() => setShowClientResults(true)}
                      placeholder="Chercher un client..."
                      className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-[#A886D7] outline-none transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    {selectedClientId && !isLeadAutoTask && !isEdit && !isProjectAutoTask && (
                      <button 
                        type="button"
                        onClick={() => { setSelectedClientId(''); setClientSearchQuery(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {showClientResults && !isLeadAutoTask && !isEdit && !isProjectAutoTask && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[110] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 space-y-1">
                        {filteredClients.length > 0 ? (
                          filteredClients.map(client => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setClientSearchQuery(formatClientNameDisplay(client.name));
                                setShowClientResults(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${selectedClientId === client.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                              <div className={`p-1.5 rounded-lg ${selectedClientId === client.id ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                <UserIcon size={14} />
                              </div>
                              <span className="text-sm font-bold">{formatClientNameDisplay(client.name)}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-400 text-xs font-medium italic">
                            Aucun client trouvé pour "{clientSearchQuery}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!isLeadAutoTask && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 ml-1">Projet lié {isProjectAutoTask ? '(verrouillé)' : '(optionnel)'}</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 hover:border-[#A886D7] outline-none transition-all cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                        disabled={!selectedClientId || isProjectAutoTask}
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                      >
                        <option value="">{!selectedClientId ? 'Choisir un client d\'abord' : 'Aucun'}</option>
                        {filteredProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {!isProjectAutoTask && <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">{isMemo ? 'Contenu du mémo' : 'Note de la tâche'}</label>
              <textarea 
                rows={isMemo ? 6 : 4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isMemo ? "Saisissez ici vos notes, listes ou rappels..." : "Ex: Précisions sur la demande du client..."}
                className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#A886D7] focus:ring-4 focus:ring-purple-50/50 placeholder:text-gray-300 resize-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="p-8 border-t border-gray-100 flex justify-center bg-gray-50/10">
            <button 
              type="submit"
              disabled={isLoading || !title || collaborators.length === 0}
              className={`group flex items-center gap-3 px-10 py-4 rounded-2xl text-sm font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${isEdit ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-900 text-white hover:bg-black'}`}
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                isEdit ? <Save size={20} /> : <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              )}
              <span>{isLoading ? 'Traitement...' : (isEdit ? 'Mettre à jour' : `Créer la tâche`)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
