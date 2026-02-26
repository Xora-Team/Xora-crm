
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  MoreHorizontal, 
  PenSquare, 
  Plus, 
  Loader2, 
  StickyNote, 
  GripVertical, 
  AlertTriangle,
  Trash2,
  MoreVertical,
  Check,
  X
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from '@firebase/firestore';
import { Task } from '../types';
import AddTaskModal from './AddTaskModal';

interface ClientTasksProps {
  clientId: string;
  clientName: string;
  userProfile: any;
}

const ClientTasks: React.FC<ClientTasksProps> = ({ clientId, clientName, userProfile }) => {
  const [filter, setFilter] = useState<'en-cours' | 'termine'>('en-cours');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Drag and Drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Charger TOUTES les tâches liées à ce client - AJOUT FILTRE COMPANYID
  useEffect(() => {
    if (!clientId || !userProfile?.companyId) return;

    const q = query(
      collection(db, 'tasks'), 
      where('clientId', '==', clientId),
      where('companyId', '==', userProfile.companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Tri côté client par orderIndex pour respecter l'ordre personnalisé
      const sortedData = data.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
      
      setTasks(sortedData);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching client tasks:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clientId, userProfile?.companyId]);

  // Logic pour le Drag & Drop
  const onDragStart = (index: number) => {
    if (filter !== 'en-cours') return; 
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index || filter !== 'en-cours') return;

    const currentFiltered = tasks.filter(t => filter === 'en-cours' ? t.status !== 'completed' : t.status === 'completed');
    const newFiltered = [...currentFiltered];
    const draggedItem = newFiltered[draggedItemIndex];
    
    newFiltered.splice(draggedItemIndex, 1);
    newFiltered.splice(index, 0, draggedItem);
    
    const otherTasks = tasks.filter(t => filter === 'en-cours' ? t.status === 'completed' : t.status !== 'completed');
    setTasks([...newFiltered, ...otherTasks]);
    setDraggedItemIndex(index);
  };

  const onDragEnd = async () => {
    setDraggedItemIndex(null);
    if (!userProfile?.companyId) return;

    try {
      const batch = writeBatch(db);
      const currentFiltered = tasks.filter(t => filter === 'en-cours' ? t.status !== 'completed' : t.status === 'completed');
      
      currentFiltered.forEach((task, idx) => {
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
      console.error("Erreur suppression tâche:", e);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { status });
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTasks = tasks.filter(t => 
    filter === 'en-cours' ? t.status !== 'completed' : t.status === 'completed'
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Tâche auto':
        return (
          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black rounded-lg uppercase tracking-tight">
            Auto
          </span>
        );
      case 'Mémo':
        return (
          <span className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-600 text-[9px] font-black rounded-lg uppercase tracking-tight">
            Mémo
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-50 border border-gray-100 text-gray-400 text-[9px] font-black rounded-lg uppercase tracking-tight">
            Manuelle
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 pt-6">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="space-y-1">
          <h2 className="text-[16px] font-bold text-gray-800">
            Récapitulatif des tâches <span className="text-gray-300 font-normal ml-1">({filteredTasks.length})</span>
          </h2>
          <p className="text-[11px] text-gray-400 font-medium italic">Inclut les mémos et les tâches de tous ses projets.</p>
        </div>
        
        <div className="flex bg-[#F1F3F5] rounded-full p-1 border border-gray-100 shadow-inner ml-4">
          <button 
            onClick={() => setFilter('en-cours')} 
            className={`px-8 py-2 text-[11px] font-bold rounded-full transition-all ${filter === 'en-cours' ? 'bg-[#1A1C23] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            En cours
          </button>
          <button 
            onClick={() => setFilter('termine')} 
            className={`px-8 py-2 text-[11px] font-bold rounded-full transition-all ${filter === 'termine' ? 'bg-[#1A1C23] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Terminé
          </button>
        </div>

        <button 
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 shadow-sm hover:border-[#A886D7] transition-all active:scale-95"
        >
          <Plus size={16} className="text-[#A886D7]" />
          Ajouter une tâche / mémo
        </button>
      </div>

      <div className="bg-[#f8f9fa] border border-gray-100 rounded-[28px] p-6 min-h-[500px] relative overflow-visible">
        {isLoading && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-[#A886D7]" size={32} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                <th className="px-6 pb-2 w-16">Ordre</th>
                <th className="px-6 pb-2">Descriptif</th>
                <th className="px-6 pb-2 text-center">Type</th>
                <th className="px-6 pb-2 text-center">Statut</th>
                <th className="px-6 pb-2 text-center">Échéance</th>
                <th className="px-6 pb-2">Collaborateur</th>
                <th className="px-6 pb-2 text-center">Note</th>
                <th className="px-6 pb-2">Progression / Action</th>
                <th className="px-6 pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="bg-white border border-dashed border-gray-200 rounded-[24px] py-16 space-y-3">
                       <StickyNote size={40} className="mx-auto text-gray-100" />
                       <p className="text-[13px] font-bold text-gray-300 italic">Aucune tâche pour ce contact.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, index) => (
                  <tr 
                    key={task.id} 
                    draggable={filter === 'en-cours'}
                    onDragStart={() => onDragStart(index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragEnd={onDragEnd}
                    className={`group transition-all border border-gray-100 ${draggedItemIndex === index ? 'opacity-40 bg-indigo-50 shadow-inner scale-[0.98]' : 'bg-white hover:bg-gray-50/50'}`}
                  >
                    <td className="px-6 py-5 first:rounded-l-2xl border-y border-l border-gray-50">
                      <div className="flex items-center gap-2">
                        <GripVertical 
                          size={16} 
                          className={`transition-colors ${filter === 'en-cours' ? 'text-gray-300 group-hover:text-indigo-400 cursor-grab active:cursor-grabbing' : 'text-gray-100'}`} 
                        />
                        <span className="text-[11px] font-black text-gray-200 italic">{index + 1}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5 border-y border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[13.5px] font-bold text-gray-900 group-hover:text-purple-700 transition-colors truncate max-w-[250px]">{task.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                           {task.subtitle && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">{task.subtitle}</span>}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50 text-center">
                      {getTypeBadge(task.type)}
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50 text-center">
                      <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${
                        task.tagColor === 'purple' ? 'bg-purple-100 text-purple-600' : 
                        task.tagColor === 'pink' ? 'bg-pink-100 text-pink-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {task.statusLabel || (task.status === 'completed' ? 'Terminé' : 'En attente')}
                      </span>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50 text-center">
                      <span className={`text-[12px] font-bold ${task.isLate ? 'text-red-500' : 'text-gray-800'}`}>
                        {task.date || '-'}
                      </span>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50">
                      <div className="flex items-center gap-3">
                        <img src={task.collaborator.avatar} className="w-8 h-8 rounded-full border border-gray-100 shadow-sm" alt="" />
                        <span className="text-[12px] font-bold text-gray-700">{task.collaborator.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50 text-center">
                      <div className="flex justify-center">
                        {task.hasNote ? (
                          <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-white transition-all cursor-pointer shadow-sm">
                            <FileText size={14} />
                          </div>
                        ) : <span className="text-gray-100 font-bold">-</span>}
                      </div>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50 min-w-[220px]">
                      {task.statusType === 'progress' ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#A886D7] rounded-full shadow-[0_0_8px_rgba(168,134,215,0.4)]" style={{ width: `${task.progress}%` }}></div>
                          </div>
                          <span className="text-[11px] font-black text-[#A886D7]">{task.progress}%</span>
                          {task.isLate && (
                            <div className="relative">
                              <AlertTriangle size={14} className="text-red-400" />
                              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
                            </div>
                          )}
                        </div>
                      ) : task.type !== 'Tâche auto' ? (
                        <div className="flex bg-[#F8F9FA] rounded-full border border-gray-200 p-0.5 w-full">
                            <button 
                              onClick={() => updateTaskStatus(task.id, 'pending')}
                              className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all ${task.status === 'pending' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-300 hover:text-gray-600'}`}
                            >
                              À faire
                            </button>
                            <button 
                              onClick={() => updateTaskStatus(task.id, 'in-progress')}
                              className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all ${task.status === 'in-progress' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-300 hover:text-gray-600'}`}
                            >
                              En cours
                            </button>
                            <button 
                              onClick={() => updateTaskStatus(task.id, 'completed')}
                              className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all ${task.status === 'completed' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-300 hover:text-gray-600'}`}
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

                    <td className="px-6 py-5 last:rounded-r-2xl border-y border-r border-gray-50 text-right">
                       <div className="relative inline-block">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }}
                            className={`p-2 rounded-lg transition-all ${activeMenuId === task.id ? 'bg-gray-100 text-gray-900' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-600'}`}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenuId === task.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                              <div className={`absolute right-0 ${index >= filteredTasks.length - 2 && filteredTasks.length > 2 ? 'bottom-full mb-2' : 'mt-2'} bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-48 animate-in fade-in zoom-in-95 duration-150 text-left`}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                  <PenSquare size={14} className="text-gray-400" /> Modifier
                                </button>
                                <div className="h-px bg-gray-50 my-1 mx-2" />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Supprimer
                                </button>
                              </div>
                            </>
                          )}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale de Confirmation de Suppression In-App */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer cette tâche ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                Vous êtes sur le point de supprimer définitivement la tâche : <br/>
                <span className="font-bold text-gray-900">"{taskToDelete.title}"</span>. <br/>
                Cette action est immédiate.
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

      <AddTaskModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        userProfile={userProfile}
        initialClientId={clientId}
        taskToEdit={editingTask}
      />
    </div>
  );
};

export default ClientTasks;
