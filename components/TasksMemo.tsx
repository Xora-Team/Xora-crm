
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  ChevronDown, 
  MoreVertical, 
  GripVertical,
  Loader2,
  PenSquare,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  CheckSquare,
  FileText,
  AlertTriangle,
  X
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from '@firebase/firestore';
import { Task } from '../types';
import AddTaskModal from './AddTaskModal';

interface TasksMemoProps {
  userProfile?: any;
}

const TasksMemo: React.FC<TasksMemoProps> = ({ userProfile }) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'en-cours' | 'termine'>('en-cours');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Drag and Drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef, 
      where('companyId', '==', userProfile.companyId),
      where('collaborator.uid', '==', userProfile.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const sortedData = data.sort((a, b) => {
        const indexA = a.orderIndex ?? 9999;
        const indexB = b.orderIndex ?? 9999;
        return indexA - indexB;
      });

      setTasks(sortedData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.companyId, userProfile?.uid]);

  const onDragStart = (index: number) => {
    if (activeStatusTab !== 'en-cours') return;
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index || activeStatusTab !== 'en-cours') return;

    const filtered = getFilteredTasks();
    const newFiltered = [...filtered];
    const draggedItem = newFiltered[draggedItemIndex];
    
    newFiltered.splice(draggedItemIndex, 1);
    newFiltered.splice(index, 0, draggedItem);
    
    const otherTasks = tasks.filter(t => 
      activeStatusTab === 'en-cours' ? t.status === 'completed' : t.status !== 'completed'
    );
    
    setTasks([...newFiltered, ...otherTasks]);
    setDraggedItemIndex(index);
  };

  const onDragEnd = async () => {
    setDraggedItemIndex(null);
    if (!userProfile?.companyId) return;

    try {
      const batch = writeBatch(db);
      const filtered = getFilteredTasks();
      filtered.forEach((task, idx) => {
        const taskRef = doc(db, 'tasks', task.id);
        batch.update(taskRef, { orderIndex: idx });
      });
      await batch.commit();
    } catch (e) {
      console.error("Erreur sauvegarde ordre tâches:", e);
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
      setTaskToDelete(null);
      setActiveMenuId(null);
    } catch (e) {
      console.error("Erreur lors de la suppression:", e);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setIsAddTaskModalOpen(true);
    setActiveMenuId(null);
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { status });
    } catch (e) {
      console.error(e);
    }
  };

  const counts = {
    enCours: tasks.filter(t => t.status !== 'completed').length,
    termine: tasks.filter(t => t.status === 'completed').length
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchesTab = activeStatusTab === 'en-cours' ? task.status !== 'completed' : task.status === 'completed';
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (task.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((task as any).note?.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  };

  const filteredTasks = getFilteredTasks();

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Tâche auto':
        return (
          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black rounded-lg uppercase tracking-tight shadow-sm">
            Auto
          </span>
        );
      case 'Mémo':
        return (
          <span className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-600 text-[9px] font-black rounded-lg uppercase tracking-tight shadow-sm">
            Mémo
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-50 border border-gray-100 text-gray-400 text-[9px] font-black rounded-lg uppercase tracking-tight shadow-sm">
            Manuelle
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-4 bg-gray-50 min-h-[calc(100vh-64px)] flex flex-col font-sans">
      
      {/* BLOC 1 : Titre et Filtres Principaux */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-1">
             <div className="flex items-center space-x-2 mr-4">
                 <CheckSquare size={20} className="text-gray-700" />
                 <span className="font-bold text-lg text-gray-900">
                   {activeStatusTab === 'en-cours' ? 'Tâches en cours' : 'Tâches terminées'}
                 </span>
                 <span className="text-gray-400 text-sm">
                   ({activeStatusTab === 'en-cours' ? counts.enCours : counts.termine})
                 </span>
             </div>
             
             <div className="flex bg-gray-200 rounded-full p-1 space-x-1">
                 <button
                    onClick={() => setActiveStatusTab('en-cours')}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeStatusTab === 'en-cours' 
                        ? 'bg-gray-800 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-300'
                    }`}
                 >
                     En cours <span className="opacity-70 ml-1">({counts.enCours})</span>
                 </button>
                 <button
                    onClick={() => setActiveStatusTab('termine')}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeStatusTab === 'termine' 
                        ? 'bg-gray-800 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-300'
                    }`}
                 >
                     Terminé <span className="opacity-70 ml-1">({counts.termine})</span>
                 </button>
             </div>
        </div>

        <div className="flex items-center space-x-3">
            <button 
                onClick={() => { setEditingTask(null); setIsAddTaskModalOpen(true); }}
                className="flex items-center px-4 py-2.5 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
            >
                <Plus size={16} className="mr-2" />
                Ajouter une tâche
            </button>
        </div>
      </div>

      {/* BLOC 2 : Barre de Recherche */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
                type="text" 
                placeholder="Rechercher une tâche, un projet, une note..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-400 text-gray-800 shadow-sm transition-all"
            />
        </div>
      </div>

      {/* BLOC 3 : Le Tableau */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden relative shadow-sm min-h-[500px] flex flex-col">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <div className="w-8 h-8 border-3 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <CheckSquare size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Aucune tâche trouvée dans cette catégorie.</p>
          </div>
        ) : null}

        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-400 uppercase font-bold tracking-wider">
                        <th className="px-6 py-4 w-12 text-center">#</th>
                        <th className="px-6 py-4">Titre & Projet</th>
                        <th className="px-6 py-4 text-center">ETAT</th>
                        <th className="px-6 py-4 text-center min-w-[200px]">Statut</th>
                        <th className="px-6 py-4">Notes</th>
                        <th className="px-6 py-4 text-center">Type</th>
                        <th className="px-6 py-4 text-center">Échéance</th>
                        <th className="px-6 py-4">Collaborateur</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredTasks.map((task, index) => (
                        <tr 
                          key={task.id} 
                          draggable={activeStatusTab === 'en-cours'}
                          onDragStart={() => onDragStart(index)}
                          onDragOver={(e) => onDragOver(e, index)}
                          onDragEnd={onDragEnd}
                          className={`group hover:bg-gray-50 transition-all ${draggedItemIndex === index ? 'opacity-40 bg-indigo-50 border-y-2 border-indigo-200' : 'bg-white'}`}
                        >
                            <td className="px-6 py-4 text-center">
                              <GripVertical 
                                size={16} 
                                className={`mx-auto transition-colors ${activeStatusTab === 'en-cours' ? 'text-gray-300 group-hover:text-indigo-500 cursor-grab active:cursor-grabbing' : 'text-gray-100'}`} 
                              />
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold transition-colors ${draggedItemIndex === index ? 'text-indigo-600' : 'text-gray-900'}`}>{task.title}</span>
                                    {task.subtitle && <span className="text-[11px] font-bold text-indigo-400 uppercase">{task.subtitle}</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-tight ${
                                    task.tagColor === 'purple' ? 'bg-purple-100 text-purple-700' : 
                                    task.tagColor === 'pink' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {task.statusLabel || 'Normal'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {task.type !== 'Tâche auto' ? (
                                    <div className="flex bg-gray-100 rounded-full p-0.5 w-full max-w-[220px] mx-auto border border-gray-200 shadow-inner">
                                        <button 
                                          onClick={() => updateTaskStatus(task.id, 'pending')}
                                          className={`flex-1 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'pending' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          À faire
                                        </button>
                                        <button 
                                          onClick={() => updateTaskStatus(task.id, 'in-progress')}
                                          className={`flex-1 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'in-progress' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          En cours
                                        </button>
                                        <button 
                                          onClick={() => updateTaskStatus(task.id, 'completed')}
                                          className={`flex-1 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'completed' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          Terminé
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            task.status === 'completed' ? 'bg-green-50 text-green-600 border border-green-100' : 
                                            task.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
                                        }`}>
                                            {task.status === 'completed' ? 'Terminée' : task.status === 'in-progress' ? 'En cours' : 'À faire'}
                                        </span>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-start gap-2 max-w-[200px]">
                                    {((task as any).note) ? (
                                      <>
                                        <FileText size={14} className="text-gray-300 mt-0.5 shrink-0" />
                                        <span className="text-[12px] text-gray-500 italic font-medium truncate" title={(task as any).note}>
                                            {(task as any).note}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-200 text-[11px] italic font-medium">Aucune note</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {getTypeBadge(task.type)}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                                <span className={task.isLate ? 'text-red-500' : ''}>{task.date || '-'}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <img src={task.collaborator.avatar} className="w-6 h-6 rounded-full mr-2 border border-gray-100" alt="" />
                                    <span className="text-sm font-medium text-gray-800">{task.collaborator.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end space-x-2 relative">
                                    <button onClick={() => handleEditClick(task)} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 shadow-sm transition-all">
                                      <PenSquare size={16} />
                                    </button>
                                    <button 
                                      onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)} 
                                      className={`p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 shadow-sm transition-all ${activeMenuId === task.id ? 'bg-gray-100 text-gray-900' : ''}`}
                                    >
                                      <MoreHorizontal size={16} />
                                    </button>
                                    {activeMenuId === task.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                                            <div className={`absolute right-0 ${index >= filteredTasks.length - 2 && filteredTasks.length > 2 ? 'bottom-full mb-2' : 'top-10'} bg-white border border-gray-100 rounded-xl shadow-2xl z-50 w-48 py-2 animate-in fade-in zoom-in-95 duration-150 text-left`}>
                                                <button onClick={() => setTaskToDelete(task)} className="w-full text-left px-4 py-2 text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center">
                                                  <Trash2 size={14} className="mr-2" /> Supprimer
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        {/* Pied de page style Annuaire */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 bg-white">
            <div>Affichage de <span className="font-bold text-gray-900">1 à {filteredTasks.length}</span> sur <span className="font-bold text-gray-900">{filteredTasks.length}</span> résultats</div>
            <div className="flex items-center space-x-2">
                <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50"><ChevronsLeft size={16} /></button>
                <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50"><ChevronLeft size={16} /></button>
                <button className="w-7 h-7 bg-gray-900 text-white rounded-md text-xs font-bold shadow-md">1</button>
                <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50"><ChevronRight size={16} /></button>
                <button className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 rotate-180"><ChevronsLeft size={16} /></button>
            </div>
        </div>
      </div>

      {/* Modale de Confirmation de Suppression */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer définitivement ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                Vous allez supprimer la tâche : <br/>
                <span className="font-bold text-gray-900">"{taskToDelete.title}"</span>. <br/>
                Cette action est irréversible.
              </p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setTaskToDelete(null)} 
                  disabled={isDeleting}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDeleteTask} 
                  disabled={isDeleting}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-[13px] hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddTaskModal isOpen={isAddTaskModalOpen} onClose={() => { setIsAddTaskModalOpen(false); setEditingTask(null); }} userProfile={userProfile} taskToEdit={editingTask} />
    </div>
  );
};

export default TasksMemo;
