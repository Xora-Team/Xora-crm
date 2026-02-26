
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  ChevronDown, 
  PenSquare, 
  Calendar, 
  CheckSquare, 
  Trash2, 
  Phone, 
  Mail, 
  ChevronRight, 
  FileText, 
  Loader2, 
  MessageSquare,
  File as FileIcon,
  Check,
  X,
  ChevronLeft,
  LayoutList,
  Circle
} from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, onSnapshot, getDoc, collection, query, where, updateDoc } from '@firebase/firestore';
import ProjectGeneralDiscovery from './ProjectGeneralDiscovery';
import ProjectKitchenDiscovery from './ProjectKitchenDiscovery';
import ProjectTasks from './ProjectTasks';
import ProjectAppointments from './ProjectAppointments';
import ProjectDocuments from './ProjectDocuments';
import AddAppointmentModal from './AddAppointmentModal';
import AddTaskModal from './AddTaskModal';

interface ProjectDetailsProps {
  project: any;
  userProfile: any;
  onBack: () => void;
}

// Configuration des statuts et couleurs synchronisée avec le Suivi Projets
const STATUS_OPTIONS = [
  { label: 'Étude client', color: 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200' },
  { label: 'Commande', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { label: 'Dossier technique et Installation', color: 'bg-cyan-100 text-cyan-600 border-cyan-200' },
  { label: 'Finition et SAV', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { label: 'Terminé', color: 'bg-green-100 text-green-700 border-green-200' },
];

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project: initialProject, userProfile, onBack }) => {
  const [activeTab, setActiveTab] = useState('Etude client');
  const [activeSubTab, setActiveSubTab] = useState('Découverte');
  
  const [project, setProject] = useState<any>(initialProject);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taskCount, setTaskCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);

  // États pour les fonctionnalités de header
  const [isEditTitleMode, setIsEditTitleMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState(initialProject.projectName);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // État pour la modale de note
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [tempNote, setTempNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // État pour la checklist latérale
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'projects', initialProject.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProject({ id: docSnap.id, ...data });
        setEditedTitle(data.projectName);
        setTempNote(data.details?.projectNote || '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [initialProject.id]);

  // Compteur de tâches en temps réel
  useEffect(() => {
    if (!userProfile?.companyId) return;
    const q = query(
      collection(db, 'tasks'), 
      where('projectId', '==', initialProject.id),
      where('companyId', '==', userProfile.companyId)
    );
    const unsubTasks = onSnapshot(q, (snapshot) => {
      setTaskCount(snapshot.size);
    });
    return () => unsubTasks();
  }, [initialProject.id, userProfile?.companyId]);

  // Compteur de rendez-vous en temps réel
  useEffect(() => {
    if (!userProfile?.companyId) return;
    const q = query(
      collection(db, 'appointments'), 
      where('projectId', '==', initialProject.id),
      where('companyId', '==', userProfile.companyId)
    );
    const unsubAppts = onSnapshot(q, (snapshot) => {
      setAppointmentCount(snapshot.size);
    });
    return () => unsubAppts();
  }, [initialProject.id, userProfile?.companyId]);

  useEffect(() => {
    if (!project?.clientId) return;
    const fetchClient = async () => {
      const snap = await getDoc(doc(db, 'clients', project.clientId));
      if (snap.exists()) setClientData(snap.data());
    };
    fetchClient();
  }, [project?.clientId]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        projectName: editedTitle.trim()
      });
      setIsEditTitleMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const selectedOption = STATUS_OPTIONS.find(opt => opt.label === newStatus);
    if (!selectedOption) return;

    try {
      await updateDoc(doc(db, 'projects', project.id), {
        status: selectedOption.label,
        statusColor: selectedOption.color
      });
    } catch (e) {
      console.error("Erreur lors de la mise à jour du statut:", e);
    }
  };

  const handleMarkAsLost = async () => {
    if (!window.confirm("Voulez-vous vraiment marquer ce projet comme PERDU ?")) return;
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        status: 'Projet perdu',
        statusColor: 'bg-red-100 text-red-700 border-red-200',
        progress: 0
      });
    } catch (e) {
      console.error(e);
    }
  };

  const saveProjectNote = async () => {
    setIsSavingNote(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        'details.projectNote': tempNote
      });
      setIsNoteModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Structure de la checklist
  const checklist = useMemo(() => {
    const base = project.details?.checklist || {};
    return {
      etudeClient: base.etudeClient || {
        decouverte: false,
        conception: false,
        presentation: false,
        devisValide: false
      },
      commandeClient: (typeof base.commandeClient === 'object' && base.commandeClient !== null) 
        ? base.commandeClient 
        : {
            docsSigner: false,
            devisSigner: false,
            metreRealise: false,
            commandeSignee: false
          },
      dossierTech: (typeof base.dossierTech === 'object' && base.dossierTech !== null)
        ? base.dossierTech
        : {
            arValides: false,
            dossierPose: false,
            rdvLivraison: false,
            rdvInstallation: false,
            pvReception: false,
            finition: false
          }
    };
  }, [project.details?.checklist]);

  const etudeProgress = useMemo(() => {
    const steps = checklist.etudeClient;
    const completed = Object.values(steps).filter(v => v === true).length;
    return Math.round((completed / 4) * 100);
  }, [checklist.etudeClient]);

  const commandeProgress = useMemo(() => {
    const steps = checklist.commandeClient;
    const completed = Object.values(steps).filter(v => v === true).length;
    return Math.round((completed / 4) * 100);
  }, [checklist.commandeClient]);

  const dossierTechProgress = useMemo(() => {
    const steps = checklist.dossierTech;
    const completed = Object.values(steps).filter(v => v === true).length;
    return Math.round((completed / 6) * 100);
  }, [checklist.dossierTech]);

  const globalProgress = useMemo(() => {
    const steps = [
      ...Object.values(checklist.etudeClient),
      ...Object.values(checklist.commandeClient),
      ...Object.values(checklist.dossierTech)
    ];
    const completedSteps = steps.filter(v => v === true).length;
    if (completedSteps === 0) return project.progress || 2;
    return Math.round((completedSteps / steps.length) * 100);
  }, [checklist, project.progress]);

  const handleChecklistUpdate = async (path: string, value: boolean) => {
    try {
      const updatedChecklist = JSON.parse(JSON.stringify(checklist));
      const parts = path.split('.');
      if (parts.length === 2) {
        updatedChecklist[parts[0]][parts[1]] = value;
      }

      const steps = [
        ...Object.values(updatedChecklist.etudeClient),
        ...Object.values(updatedChecklist.commandeClient),
        ...Object.values(updatedChecklist.dossierTech)
      ];
      const newGlobalProgress = Math.round((steps.filter(v => v === true).length / steps.length) * 100) || 2;

      await updateDoc(doc(db, 'projects', project.id), {
        [`details.checklist.${path}`]: value,
        progress: newGlobalProgress
      });
    } catch (e) {
      console.error(e);
    }
  };

  const ProgressCircle = ({ progress, color, size = "w-4 h-4" }: { progress: number; color: string; size?: string }) => {
    const strokeColor = color?.includes('D946EF') ? '#D946EF' : color?.includes('F97316') ? '#F97316' : color?.includes('0EA5E9') ? '#0EA5E9' : color?.includes('red') ? '#ef4444' : '#6366f1';
    return (
      <svg className={`${size} mr-1.5`} viewBox="0 0 36 36">
        <path className="text-gray-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <path style={{ stroke: strokeColor }} strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  };

  const mainTabs = [
    { label: 'Etude client', key: 'Etude client' },
    { label: `Tâches (${taskCount})`, key: 'Tâches' },
    { label: `Calendrier (${appointmentCount})`, key: 'Calendrier' },
    { label: 'Documents', key: 'Documents' }
  ];

  const subTabs = ['Découverte', 'Découverte cuisine'];

  if (loading && !project) {
    return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-gray-300" size={48} /></div>;
  }

  // Détermination de l'option de statut actuelle pour le style du sélecteur
  const currentStatusOption = STATUS_OPTIONS.find(opt => opt.label === project.status);
  // Extraction de la classe de texte pour l'icône Chevron
  const textColorClass = currentStatusOption?.color.split(' ').find(c => c.startsWith('text-')) || 'text-gray-400';

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      <div className="flex-1 flex flex-col h-full overflow-y-auto hide-scrollbar">
        
        {/* Header Principal */}
        <div className="px-8 py-6 bg-white shrink-0 border-b border-gray-100 shadow-sm z-20">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 shadow-sm hover:bg-gray-50 transition-all">
                <ArrowLeft size={18} />
              </button>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase tracking-widest">{project.metier}</span>
                  <span className="text-[11px] font-bold text-gray-300">Créé le {project.addedDate}</span>
                </div>
                <div className="flex items-center gap-4">
                  {isEditTitleMode ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                        className="text-[20px] font-bold text-gray-900 border-b-2 border-indigo-500 outline-none px-1 bg-indigo-50/30"
                      />
                      <button onClick={handleSaveTitle} className="p-1 text-green-500 hover:bg-green-50 rounded-full"><Check size={20} /></button>
                      <button onClick={() => { setIsEditTitleMode(false); setEditedTitle(project.projectName); }} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><X size={20} /></button>
                    </div>
                  ) : (
                    <h1 className="text-[20px] font-bold text-gray-900">{project.projectName}</h1>
                  )}
                  
                  {/* Sélecteur de Statut Coloré - Style calqué sur le tableau Suivi Projets */}
                  <div className="relative group/status inline-block">
                    <select
                      value={project.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className={`appearance-none cursor-pointer px-3 py-1.5 pr-8 rounded-md text-[10px] font-black uppercase tracking-tight outline-none border transition-all shadow-sm hover:shadow-md ${
                        currentStatusOption?.color || project.statusColor || 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {/* Affichage de l'option actuelle si elle ne fait pas partie des options standard (ex: Projet perdu) */}
                      {!currentStatusOption && <option value={project.status}>{project.status}</option>}
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.label} className="bg-white text-gray-900 font-bold capitalize">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 group-hover/status:opacity-100 transition-opacity ${textColorClass}`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-6 mb-1">
                <span className="text-[14px] font-bold text-gray-900 uppercase">{project.clientName}</span>
                <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                  <Phone size={14} className="text-gray-300" /> {clientData?.details?.phone || 'Non renseigné'}
                </div>
                <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                  <Mail size={14} className="text-gray-300" /> {clientData?.details?.email || 'Non renseigné'}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditTitleMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                >
                  <PenSquare size={16} /> Modifier le titre
                </button>
                <button 
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                >
                  <Calendar size={16} /> Planifier un RDV
                </button>
                <button 
                  onClick={() => setIsTaskModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                >
                  <CheckSquare size={16} /> Ajouter une tâche
                </button>
                <button 
                  onClick={handleMarkAsLost}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-red-500 hover:bg-red-50 shadow-sm transition-all"
                >
                  <Trash2 size={16} /> Projet perdu
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="flex gap-10">
              {mainTabs.map((tab) => (
                <button 
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 pb-4 text-[14px] font-bold transition-all relative ${activeTab === tab.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full animate-in fade-in" />
                  )}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
              <FileText size={16} className="text-gray-400" /> Résumé des informations
            </button>
          </div>
        </div>

        {/* Sous-navigation */}
        {(activeTab === 'Etude client') && (
          <div className="bg-white border-b border-gray-100 px-8 flex gap-12 shrink-0 z-10 sticky top-0">
            {subTabs.map((sub) => (
              <button 
                key={sub}
                onClick={() => setActiveSubTab(sub)}
                className={`py-4 text-[14px] font-bold transition-all relative ${
                  activeSubTab === sub 
                  ? 'text-gray-900' 
                  : 'text-gray-300 hover:text-gray-500'
                }`}
              >
                {sub}
                {activeSubTab === sub && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full animate-in slide-in-from-bottom-1" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Contenu Principal */}
        <div className="p-8 space-y-6 flex-1 bg-[#F9FAFB]">
          
          {activeTab === 'Etude client' && activeSubTab === 'Découverte' && (
             <ProjectGeneralDiscovery project={project} userProfile={userProfile} />
          )}

          {activeTab === 'Etude client' && activeSubTab === 'Découverte cuisine' && (
             <ProjectKitchenDiscovery project={project} userProfile={userProfile} />
          )}

          {activeTab === 'Tâches' && (
            <ProjectTasks 
              projectId={project.id} 
              clientId={project.clientId}
              projectName={project.projectName}
              userProfile={userProfile} 
            />
          )}

          {activeTab === 'Calendrier' && (
            <ProjectAppointments 
              projectId={project.id} 
              clientId={project.clientId}
              projectName={project.projectName}
              clientName={project.clientName}
              userProfile={userProfile} 
            />
          )}

          {activeTab === 'Documents' && (
            <ProjectDocuments 
              projectId={project.id} 
              clientId={project.clientId}
              userProfile={userProfile} 
            />
          )}

          <div className="pb-20" />
        </div>
      </div>

      {/* Barre latérale droite (Checklist & Notes) */}
      <div 
        className={`${isChecklistOpen ? 'w-[350px]' : 'w-20'} bg-white border-l border-gray-100 flex flex-col h-screen transition-all duration-500 ease-in-out z-40 relative shadow-2xl shrink-0`}
      >
        <button 
          onClick={() => setIsChecklistOpen(!isChecklistOpen)}
          className={`absolute -left-4 top-10 w-8 h-8 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all z-50 ${isChecklistOpen ? 'rotate-180' : ''}`}
        >
          <ChevronLeft size={18} />
        </button>

        {!isChecklistOpen && (
          <div className="flex flex-col items-center py-10 gap-8 animate-in fade-in duration-500 h-full">
            <LayoutList size={22} className="text-gray-300" />
            <div className="w-8 h-px bg-gray-50"></div>
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <ProgressCircle progress={globalProgress} color="#6366f1" size="w-8 h-8" />
                <span className="text-[10px] font-black text-gray-900">{globalProgress}%</span>
              </div>
            </div>
            
            <div className="mt-auto flex flex-col items-center gap-4 mb-4">
              <button 
                onClick={() => { setTempNote(project.details?.projectNote || ''); setIsNoteModalOpen(true); }}
                className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm relative group"
                title="Notes du projet"
              >
                <FileText size={18} />
                {project.details?.projectNote && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>}
              </button>
              <button className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Mail size={18} /></button>
              <button className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><MessageSquare size={18} /></button>
            </div>
          </div>
        )}

        {isChecklistOpen && (
          <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-500">
            <div className="p-8 border-b border-gray-50">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-[18px] font-black text-gray-900 uppercase tracking-tighter">Avancé projet</h3>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Suivi des jalons clés</p>
                </div>
                <span className="text-[22px] font-black text-indigo-600">{globalProgress}%</span>
              </div>
              
              <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden mt-6">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 hide-scrollbar">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">Étude client</h4>
                  <span className="text-[12px] font-black text-gray-400">{etudeProgress}%</span>
                </div>
                <div className="space-y-4 pt-2">
                  {[
                    { id: 'decouverte', label: 'Découverte client' },
                    { id: 'conception', label: 'Conception réalisée' },
                    { id: 'presentation', label: 'Présentation effectuée' },
                    { id: 'devisValide', label: 'Devis validé par le client' }
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-4 group cursor-pointer">
                      <div 
                        onClick={() => handleChecklistUpdate(`etudeClient.${item.id}`, !checklist.etudeClient[item.id])}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          checklist.etudeClient[item.id] 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                          : 'bg-white border-gray-100 group-hover:border-indigo-200'
                        }`}
                      >
                        {checklist.etudeClient[item.id] ? <Check size={14} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-50" />}
                      </div>
                      <span className={`text-[13px] font-bold transition-colors ${checklist.etudeClient[item.id] ? 'text-gray-900' : 'text-gray-400'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">Commande client</h4>
                  <span className="text-[12px] font-black text-gray-400">{commandeProgress}%</span>
                </div>
                <div className="space-y-4 pt-2">
                  {[
                    { id: 'docsSigner', label: 'Doc à signer' },
                    { id: 'devisSigner', label: 'Devis à signer' },
                    { id: 'metreRealise', label: 'Métré réalisé' },
                    { id: 'commandeSignee', label: 'Commande signée' }
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-4 group cursor-pointer">
                      <div 
                        onClick={() => handleChecklistUpdate(`commandeClient.${item.id}`, !checklist.commandeClient[item.id])}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          checklist.commandeClient[item.id] 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                          : 'bg-white border-gray-100 group-hover:border-indigo-300'
                        }`}
                      >
                        {checklist.commandeClient[item.id] ? <Check size={14} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-50" />}
                      </div>
                      <span className={`text-[13px] font-bold transition-colors ${checklist.commandeClient[item.id] ? 'text-gray-900' : 'text-gray-400'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">Dossier tech & install</h4>
                  <span className="text-[12px] font-black text-gray-400">{dossierTechProgress}%</span>
                </div>
                <div className="space-y-4 pt-2">
                  {[
                    { id: 'arValides', label: 'AR validés' },
                    { id: 'dossierPose', label: 'Dossier pose terminé' },
                    { id: 'rdvLivraison', label: 'Rdv livraison validé' },
                    { id: 'rdvInstallation', label: 'Rdv installation validé' },
                    { id: 'pvReception', label: 'PV reception installation signé' },
                    { id: 'finition', label: 'Finition terminée' }
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-4 group cursor-pointer">
                      <div 
                        onClick={() => handleChecklistUpdate(`dossierTech.${item.id}`, !checklist.dossierTech[item.id])}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          checklist.dossierTech[item.id] 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                          : 'bg-white border-gray-100 group-hover:border-indigo-300'
                        }`}
                      >
                        {checklist.dossierTech[item.id] ? <Check size={14} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-50" />}
                      </div>
                      <span className={`text-[13px] font-bold transition-colors ${checklist.dossierTech[item.id] ? 'text-gray-900' : 'text-gray-400'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 bg-[#FBFBFB]">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex gap-4">
                   <button 
                     onClick={() => { setTempNote(project.details?.projectNote || ''); setIsNoteModalOpen(true); }}
                     className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm relative group"
                   >
                     <FileText size={18} />
                     {project.details?.projectNote && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>}
                   </button>
                   <button className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Mail size={18} /></button>
                   <button className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><MessageSquare size={18} /></button>
                 </div>
               </div>
               <div className="flex items-center gap-4">
                  <img src={project.agenceur?.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-md" alt="" />
                  <div>
                    <p className="text-[12px] font-black text-gray-900 uppercase tracking-tighter">{project.agenceur?.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Agenceur Référent</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALE NOTE PROJET */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-[#FBFBFB]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">Note sur le Projet</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Commentaires libres du projet</p>
                </div>
              </div>
              <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <textarea
                autoFocus
                rows={6}
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="Saisissez vos notes libres sur ce projet..."
                className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl p-6 text-[14px] font-medium text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="p-8 pt-0 flex gap-4">
              <button 
                onClick={() => setIsNoteModalOpen(false)}
                className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={saveProjectNote}
                disabled={isSavingNote}
                className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[13px] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingNote ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Enregistrer la note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <AddAppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        userProfile={userProfile}
        clientId={project.clientId}
        clientName={project.clientName}
        initialProjectId={project.id}
      />

      <AddTaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        userProfile={userProfile}
        initialClientId={project.clientId}
        initialProjectId={project.id}
      />
    </div>
  );
};

export default ProjectDetails;
