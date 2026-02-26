
import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, Eye, MoreHorizontal, Home, PenSquare, Trash2, AlertTriangle, Check, X } from 'lucide-react';
import AddProjectModal from './AddProjectModal';
import AddTaskModal from './AddTaskModal';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, increment } from '@firebase/firestore';

interface ClientProjectsProps {
  client: any;
  userProfile: any;
  onProjectSelect?: (project: any) => void;
}

const ClientProjects: React.FC<ClientProjectsProps> = ({ client, userProfile, onProjectSelect }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [lastCreatedProjectId, setLastCreatedProjectId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  
  // Confirmation Modal states
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Charger les projets spécifiques à ce client
  useEffect(() => {
    if (!client?.id) return;

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('clientId', '==', client.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [client?.id]);

  const handleProjectCreated = (projectId: string) => {
    setLastCreatedProjectId(projectId);
    setIsAddModalOpen(false);
    setEditingProject(null);
    // Petit délai pour laisser la modale projet se fermer proprement avant d'ouvrir la tâche
    setTimeout(() => {
      setIsAddTaskOpen(true);
    }, 300);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      // 1. Supprimer le projet
      await deleteDoc(doc(db, 'projects', projectToDelete.id));
      
      // 2. Décrémenter le compteur client
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        projectCount: increment(-1)
      });
      
      setProjectToDelete(null);
      setActiveMenuId(null);
    } catch (err) {
      console.error("Erreur suppression projet:", err);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsAddModalOpen(true);
    setActiveMenuId(null);
  };

  return (
    <div className="pt-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-[16px] font-bold text-gray-800">
          Liste des projets <span className="text-gray-300 font-normal ml-1">({projects.length})</span>
        </h3>
        <button 
          onClick={() => { setEditingProject(null); setIsAddModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
        >
          <Plus size={16} /> 
          Ajouter un projet
        </button>
      </div>

      {/* Container Gris */}
      <div className="bg-[#f8f9fa] border border-gray-100 rounded-[28px] p-6 space-y-6 relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/20 z-10 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Barre de Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher projet" 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-lg text-[13px] text-gray-900 outline-none focus:border-gray-300 shadow-sm placeholder:text-gray-300"
            />
          </div>
          <div className="md:col-span-2.25 relative flex-1">
            <button className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-100 rounded-lg text-[13px] text-gray-400 hover:bg-gray-50 transition-all">
              <span>Métier</span>
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="md:col-span-2.25 relative flex-1">
            <button className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-100 rounded-lg text-[13px] text-gray-400 hover:bg-gray-50 transition-all">
              <span>Statut</span>
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="md:col-span-2.25 relative flex-1">
            <button className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-100 rounded-lg text-[13px] text-gray-400 hover:bg-gray-50 transition-all">
              <span>Date</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Tableau des Projets */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-visible shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-50 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                <th className="px-6 py-4 font-bold">Métier</th>
                <th className="px-6 py-4 font-bold">Nom du projet</th>
                <th className="px-6 py-4 font-bold text-center">Statut</th>
                <th className="px-6 py-4 font-bold text-center">Type de propriété</th>
                <th className="px-6 py-4 font-bold text-center">Ajouté le</th>
                <th className="px-6 py-4 font-bold text-right">Action rapide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.length === 0 && !isLoading ? (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm font-medium">
                     Aucun projet en cours pour ce client.
                   </td>
                </tr>
              ) : (
                projects.map((project, index) => (
                  <tr 
                    key={project.id} 
                    onClick={() => onProjectSelect?.(project)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5 text-[13px] font-bold text-gray-900">{project.metier}</td>
                    <td className="px-6 py-5 text-[13px] font-bold text-gray-900">{project.projectName}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${project.statusColor}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <div className="w-8 h-8 flex items-center justify-center border border-gray-100 rounded-lg bg-white text-gray-900">
                          <Home size={16} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-[13px] font-bold text-gray-900">{project.addedDate}</td>
                    <td className="px-6 py-5 relative">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectSelect?.(project);
                          }}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 transition-all"
                          title="Voir détails"
                        >
                          <Eye size={16} />
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === project.id ? null : project.id);
                            }}
                            className={`p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 shadow-sm transition-all ${activeMenuId === project.id ? 'bg-gray-100 text-gray-900' : ''}`}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          {activeMenuId === project.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}></div>
                              <div className={`absolute right-0 ${index >= projects.length - 2 && projects.length > 2 ? 'bottom-full mb-2' : 'mt-2'} bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-48 animate-in fade-in zoom-in-95 duration-150`}>
                                <button 
                                  onClick={(e) => handleEditClick(e, project)}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <PenSquare size={14} className="text-gray-400" /> Modifier
                                </button>
                                <div className="h-px bg-gray-50 my-1 mx-2" />
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete(project);
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
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

      <AddProjectModal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setEditingProject(null); }} 
        userProfile={userProfile}
        clientId={client?.id}
        clientName={client?.name}
        projectToEdit={editingProject}
        initialData={editingProject ? {
          categorie: editingProject.categorie || '',
          origine: editingProject.origine || '',
          sousOrigine: editingProject.sousOrigine || ''
        } : {
          categorie: client?.details?.category || '',
          origine: client?.origin || '',
          sousOrigine: client?.details?.subOrigin || ''
        }}
        onProjectCreated={handleProjectCreated}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        userProfile={userProfile}
        initialClientId={client?.id}
        initialClientName={client?.name}
        initialProjectId={lastCreatedProjectId}
        isProjectAutoTask={true}
      />
    </div>
  );
};

export default ClientProjects;
