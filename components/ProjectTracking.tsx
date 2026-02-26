
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  ChevronDown, 
  ArrowUpRight, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  MoreHorizontal,
  Briefcase,
  PenSquare,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Check,
  Filter
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, increment } from '@firebase/firestore';
import AddProjectModal from './AddProjectModal';

interface Project {
  id: string;
  clientName: string;
  clientId: string;
  agenceur: { name: string; avatar: string; uid: string };
  projectName: string;
  status: string;
  progress: number;
  statusColor: string;
  addedDate: string;
  metier: string;
  categorie?: string;
  origine?: string;
  sousOrigine?: string;
  details?: any;
}

interface ProjectTrackingProps {
  userProfile: any;
  onProjectClick?: (project: Project) => void;
}

// Composant interne pour les dropdowns de filtrage
const FilterDropdown = ({ label, value, options, onSelect, isOpen, onToggle }: any) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative md:col-span-2" ref={dropdownRef}>
      <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-md text-sm transition-all shadow-sm ${
          value 
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' 
            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        <span className="truncate">{value || label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            <button 
              onClick={() => { onSelect(''); onToggle(); }}
              className="w-full text-left px-4 py-2 text-[10px] font-black text-gray-300 hover:bg-gray-50 uppercase tracking-widest border-b border-gray-50 mb-1"
            >
              Réinitialiser
            </button>
            {options.map((opt: string) => (
              <button
                key={opt}
                onClick={() => { onSelect(opt); onToggle(); }}
                className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between transition-colors ${
                  value === opt ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{opt}</span>
                {value === opt && <Check size={14} className="text-indigo-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectTracking: React.FC<ProjectTrackingProps> = ({ userProfile, onProjectClick }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // États des filtres - filterAgenceur est pré-rempli avec le nom de l'utilisateur connecté
  const [filterAgenceur, setFilterAgenceur] = useState(userProfile?.name || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Actions states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userProfile?.companyId) return;

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('companyId', '==', userProfile.companyId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsList);
      setIsLoading(false);
    }, (error) => {
      console.error("Erreur ProjectTracking permissions:", error);
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

  const uniqueAgenceurs = useMemo(() => 
    Array.from(new Set(projects.map(p => p.agenceur?.name).filter(Boolean))).sort(), 
  [projects]);

  const uniqueStatuses = useMemo(() => 
    Array.from(new Set(projects.map(p => p.status).filter(Boolean))).sort(), 
  [projects]);

  const uniqueDates = useMemo(() => 
    Array.from(new Set(projects.map(p => p.addedDate).filter(Boolean))).sort((a: any, b: any) => {
      const [da, ma, ya] = (a as string).split('/').map(Number);
      const [db, mb, yb] = (b as string).split('/').map(Number);
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    }), 
  [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAgenceur = !filterAgenceur || p.agenceur?.name === filterAgenceur;
      const matchesStatus = !filterStatus || p.status === filterStatus;
      const matchesDate = !filterDate || p.addedDate === filterDate;
      
      return matchesSearch && matchesAgenceur && matchesStatus && matchesDate;
    });
  }, [projects, searchQuery, filterAgenceur, filterStatus, filterDate]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterAgenceur('');
    setFilterStatus('');
    setFilterDate('');
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));
      if (projectToDelete.clientId) {
        const clientRef = doc(db, 'clients', projectToDelete.clientId);
        await updateDoc(clientRef, {
          projectCount: increment(-1)
        });
      }
      setProjectToDelete(null);
      setActiveMenuId(null);
    } catch (err) {
      console.error("Erreur suppression projet:", err);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const ProgressCircle = ({ progress, color }: { progress: number; color: string }) => {
    const strokeColor = color?.includes('D946EF') ? '#D946EF' : color?.includes('F97316') ? '#F97316' : color?.includes('0EA5E9') ? '#0EA5E9' : '#6366f1';
    return (
      <svg className="w-5 h-5 mr-1.5" viewBox="0 0 36 36">
        <circle className="text-gray-100" cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <circle style={{ stroke: strokeColor }} cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" strokeDasharray={`${progress}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
      </svg>
    );
  };

  return (
    <div className="p-6 space-y-4 bg-gray-50 min-h-[calc(100vh-64px)] flex flex-col font-sans">
      
      {/* BLOC 1 : Titre */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Briefcase size={20} className="text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">Suivi des projets</h2>
            <span className="text-gray-400 text-sm font-medium">({filteredProjects.length})</span>
        </div>
      </div>

      {/* BLOC 2 : Barre de Recherche et Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center" ref={toolbarRef}>
        <div className="md:col-span-4 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher un client, un projet..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-400 text-gray-800 shadow-sm transition-all"
          />
        </div>
        
        <FilterDropdown 
          label="Agenceur.se" 
          value={filterAgenceur} 
          options={uniqueAgenceurs} 
          onSelect={setFilterAgenceur}
          isOpen={activeDropdown === 'agenceur'}
          onToggle={() => setActiveDropdown(activeDropdown === 'agenceur' ? null : 'agenceur')}
        />

        <FilterDropdown 
          label="Statut" 
          value={filterStatus} 
          options={uniqueStatuses} 
          onSelect={setFilterStatus}
          isOpen={activeDropdown === 'status'}
          onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
        />

        <FilterDropdown 
          label="Date d'ajout" 
          value={filterDate} 
          options={uniqueDates} 
          onSelect={setFilterDate}
          isOpen={activeDropdown === 'date'}
          onToggle={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
        />

        {(searchQuery || filterAgenceur || filterStatus || filterDate) && (
          <button 
            onClick={resetFilters}
            className="p-2.5 bg-white border border-red-100 text-red-500 rounded-md hover:bg-red-50 transition-all flex items-center justify-center shadow-sm shrink-0"
            title="Réinitialiser"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* BLOC 3 : Tableau des projets */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-visible relative min-h-[500px]">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <Filter size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Aucun projet trouvé</p>
            {(searchQuery || filterAgenceur || filterStatus || filterDate) && (
              <button onClick={resetFilters} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Effacer les filtres</button>
            )}
          </div>
        ) : null}

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-400 uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Nom & prénom</th>
                <th className="px-6 py-4">Agenceur.s</th>
                <th className="px-6 py-4">Nom du projet</th>
                <th className="px-6 py-4">Statut du projet</th>
                <th className="px-6 py-4 text-center">Ajouté le</th>
                <th className="px-6 py-4 text-right">Action rapide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.map((project, index) => (
                <tr 
                  key={project.id} 
                  onClick={() => onProjectClick?.(project)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      {project.clientName}
                      <ArrowUpRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img src={project.agenceur?.avatar} alt="" className="w-6 h-6 rounded-full mr-2 border border-gray-100 shadow-sm" />
                      <span className="text-sm font-medium text-gray-800">{project.agenceur?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700 uppercase">
                    {project.projectName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-start gap-4">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${project.statusColor || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {project.status}
                      </span>
                      <div className="flex items-center gap-1">
                        <ProgressCircle progress={project.progress || 0} color={project.statusColor || ''} />
                        <span className="text-[12px] font-black text-gray-900">{project.progress || 0}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                    {project.addedDate}
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => onProjectClick?.(project)}
                        className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 shadow-sm transition-all"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === project.id ? null : project.id)}
                          className={`p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 shadow-sm transition-all ${activeMenuId === project.id ? 'bg-gray-100 text-gray-900' : ''}`}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        
                        {activeMenuId === project.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                            <div className={`absolute right-0 ${index >= filteredProjects.length - 2 && filteredProjects.length > 2 ? 'bottom-full mb-2' : 'mt-2'} bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-48 animate-in fade-in zoom-in-95 duration-150`}>
                              <button 
                                onClick={() => {
                                  setProjectToEdit(project);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <PenSquare size={14} className="text-gray-400" /> Modifier
                              </button>
                              <div className="h-px bg-gray-50 my-1 mx-2" />
                              <button 
                                onClick={() => {
                                  setProjectToDelete(project);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pied de page */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 bg-white">
          <div>Affichage de <span className="font-bold text-gray-900">1 à {filteredProjects.length}</span> sur <span className="font-bold text-gray-900">{filteredProjects.length}</span> résultats</div>
          <div className="flex items-center space-x-2">
            <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50"><ChevronsLeft size={16} /></button>
            <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <button className="w-7 h-7 bg-gray-900 text-white rounded-md text-xs font-bold shadow-md">1</button>
            <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50"><ChevronRight size={16} /></button>
            <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 rotate-180"><ChevronsLeft size={16} /></button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION SUPPRESSION */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer ce projet ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                Vous êtes sur le point de supprimer définitivement le projet <br/>
                <span className="font-bold text-gray-900">"{projectToDelete.projectName}"</span>. <br/>
                Cette action est immédiate et irréversible.
              </p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setProjectToDelete(null)} 
                  disabled={isDeleting}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDeleteProject} 
                  disabled={isDeleting}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-[13px] hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE EDITION */}
      {projectToEdit && (
        <AddProjectModal 
          isOpen={!!projectToEdit}
          onClose={() => setProjectToEdit(null)}
          userProfile={userProfile}
          clientId={projectToEdit?.clientId}
          clientName={projectToEdit?.clientName}
          projectToEdit={projectToEdit}
        />
      )}
    </div>
  );
};

export default ProjectTracking;
