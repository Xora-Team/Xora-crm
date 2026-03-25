
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
  AlertCircle,
  X,
  Check
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from '@firebase/firestore';
import { Task } from '../types';
import AddTaskModal from './AddTaskModal';

interface TasksMemoProps {
  userProfile?: any;
  initialFilter?: string | null;
}

const TasksMemo: React.FC<TasksMemoProps> = ({ userProfile, initialFilter }) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'en-cours' | 'termine'>('en-cours');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  
  // New filters state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');

  // Set default collaborator filter to current user
  /* 
  useEffect(() => {
    if (userProfile?.uid && collaboratorFilter === 'all') {
      setCollaboratorFilter(userProfile.uid);
    }
  }, [userProfile?.uid]);
  */

  // Unique collaborators for filter
  const [collaborators, setCollaborators] = useState<{uid: string, name: string}[]>([]);
  
  // Drag and Drop state
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const statusOptions = [
    { label: 'Découverte leads', color: 'purple' },
    { label: 'Étude client', color: 'pink' },
    { label: 'Dossier technique', color: 'cyan' },
    { label: 'Installation', color: 'blue' },
    { label: 'SAV', color: 'orange' },
    { label: 'Terminé', color: 'gray' }
  ];
  const [filterLabel, setFilterLabel] = useState<string | null>(null);

  useEffect(() => {
    if (initialFilter === 'leads') {
      setFilterLabel('leads');
    } else {
      setFilterLabel(null);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('companyId', '==', userProfile.companyId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const collabs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Utilisateur'
        };
      });
      setCollaborators(collabs.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => unsubscribe();
  }, [userProfile?.companyId]);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef, 
      where('companyId', '==', userProfile.companyId)
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
      const filtered = getFilteredTasks();
      const BATCH_SIZE = 500;
      for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = filtered.slice(i, i + BATCH_SIZE);
        chunk.forEach((task, idx) => {
          batch.update(doc(db, 'tasks', task.id), { orderIndex: i + idx });
        });
        await batch.commit();
      }
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

  const isTaskLate = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    try {
      const [d, m, y] = dateStr.split('/').map(Number);
      const dueDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    } catch (e) {
      return false;
    }
  };

  const getTaskDelayInfo = (task: Task) => {
    if (!task.date || task.status === 'completed') return { isLate: false, text: task.date || '-' };
    try {
      const [d, m, y] = task.date.split('/').map(Number);
      const dueDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        const diffTime = Math.abs(today.getTime() - dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { isLate: true, text: `${diffDays} jour${diffDays > 1 ? 's' : ''} de retard` };
      }
      return { isLate: false, text: task.date };
    } catch (e) {
      return { isLate: false, text: task.date || '-' };
    }
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchesTab = activeStatusTab === 'en-cours' ? task.status !== 'completed' : task.status === 'completed';
      
      let matchesFilter = true;
      if (filterLabel === 'leads') {
        matchesFilter = ['À qualifier', 'À recontacter'].includes(task.statusLabel || '') ||
                        (task.statusLabel === 'Projet long terme' && isTaskLate(task.date));
      }

      // New filters
      const matchesType = typeFilter === 'all' || task.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter || task.statusLabel === statusFilter;
      const matchesCollaborator = collaboratorFilter === 'all' || task.collaborator.uid === collaboratorFilter;
      
      let matchesDueDate = true;
      if (dueDateFilter !== 'all' && task.date) {
        const [d, m, y] = task.date.split('/').map(Number);
        const dueDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dueDateFilter === 'today') {
          matchesDueDate = dueDate.getTime() === today.getTime();
        } else if (dueDateFilter === 'week') {
          const nextWeek = new Date();
          nextWeek.setDate(today.getDate() + 7);
          matchesDueDate = dueDate >= today && dueDate <= nextWeek;
        } else if (dueDateFilter === 'late') {
          matchesDueDate = dueDate < today;
        }
      } else if (dueDateFilter === 'late' && !task.date) {
        matchesDueDate = false;
      }

      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (task.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((task as any).note?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesTab && matchesFilter && matchesSearch && matchesType && matchesStatus && matchesCollaborator && matchesDueDate;
    });
  };

  const filteredTasks = getFilteredTasks();

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Tâche auto':
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[9px] font-black rounded-full uppercase tracking-tight shadow-sm">
            Tâche auto
          </span>
        );
      case 'Mémo':
        return (
          <span className="px-2.5 py-1 bg-gray-700 text-white text-[9px] font-black rounded-full uppercase tracking-tight shadow-sm">
            Mémo
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[9px] font-black rounded-full uppercase tracking-tight shadow-sm">
            Tâche manuelle
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
            {filterLabel === 'leads' && (
              <button 
                onClick={() => setFilterLabel(null)}
                className="flex items-center px-4 py-2.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-sm font-bold hover:bg-purple-200 transition-all"
              >
                <X size={16} className="mr-2" />
                Filtre : Leads
              </button>
            )}
            <button 
                onClick={() => { setEditingTask(null); setIsAddTaskModalOpen(true); }}
                className="flex items-center px-4 py-2.5 bg-gray-900 text-white border border-gray-900 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
            >
                <Plus size={16} className="mr-2" />
                Ajouter une tâche manuelle ou un mémo
            </button>
        </div>
      </div>

      {/* BLOC 2 : Barre de Recherche et Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} />
            <input 
                type="text" 
                placeholder="Rechercher une tâche..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gray-400 text-gray-800 shadow-sm transition-all placeholder:text-gray-400 font-medium"
            />
        </div>

        {/* Filtre Type */}
        <div className="relative">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:border-gray-400 appearance-none shadow-sm cursor-pointer"
          >
            <option value="all">Type de tâche</option>
            <option value="Tâche manuelle">Tâche manuelle</option>
            <option value="Tâche auto">Tâche auto</option>
            <option value="Mémo">Mémo</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Filtre Statut */}
        <div className="relative">
          <button 
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:border-gray-400 appearance-none shadow-sm cursor-pointer flex items-center justify-between"
          >
            <span className="truncate">
              {statusFilter === 'all' ? 'Tout les statuts' : statusFilter}
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStatusDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsStatusDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden py-1 min-w-[200px]">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setIsStatusDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between group"
                >
                  <span className={`font-medium ${statusFilter === 'all' ? 'text-blue-600' : 'text-gray-700'}`}>
                    Tout les statuts
                  </span>
                  {statusFilter === 'all' && <Check size={14} className="text-blue-600" />}
                </button>
                
                <div className="h-px bg-gray-100 my-1" />
                
                {statusOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => {
                      setStatusFilter(option.label);
                      setIsStatusDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        option.color === 'purple' ? 'bg-purple-500' :
                        option.color === 'pink' ? 'bg-pink-500' :
                        option.color === 'cyan' ? 'bg-cyan-500' :
                        option.color === 'blue' ? 'bg-blue-500' :
                        option.color === 'orange' ? 'bg-orange-500' : 'bg-gray-400'
                      }`} />
                      <span className={`font-medium ${statusFilter === option.label ? 'text-blue-600' : 'text-gray-700'}`}>
                        {option.label}
                      </span>
                    </div>
                    {statusFilter === option.label && <Check size={14} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Filtre Collaborateur */}
        <div className="relative">
          <select 
            value={collaboratorFilter}
            onChange={(e) => setCollaboratorFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:border-gray-400 appearance-none shadow-sm cursor-pointer"
          >
            <option value="all">Tous les collaborateurs</option>
            {collaborators.map(collab => (
              <option key={collab.uid} value={collab.uid}>{collab.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Filtre Échéance */}
        <div className="relative">
          <select 
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:border-gray-400 appearance-none shadow-sm cursor-pointer"
          >
            <option value="all">Échéance</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="late">En retard</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                        <th className="px-6 py-4 w-12 text-center">Order</th>
                        <th className="px-6 py-4">Descriptif</th>
                        <th className="px-6 py-4 text-center">Type</th>
                        <th className="px-6 py-4 text-center">Statut</th>
                        <th className="px-6 py-4 text-center">Échéance</th>
                        <th className="px-6 py-4">Collaborateur</th>
                        <th className="px-6 py-4 text-center">Note</th>
                        <th className="px-6 py-4 text-center min-w-[200px]">Progression</th>
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
                          onClick={() => handleEditClick(task)}
                          className={`group hover:bg-gray-50 transition-all cursor-pointer ${draggedItemIndex === index ? 'opacity-40 bg-indigo-50 border-y-2 border-indigo-200' : 'bg-white'}`}
                        >
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <GripVertical 
                                  size={16} 
                                  className={`transition-colors ${activeStatusTab === 'en-cours' ? 'text-gray-300 group-hover:text-indigo-500 cursor-grab active:cursor-grabbing' : 'text-gray-100'}`} 
                                />
                                <span className="text-gray-400 text-xs">-</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    {task.clientName ? (
                                      <>
                                        <span className={`text-sm font-bold transition-colors ${draggedItemIndex === index ? 'text-indigo-600' : 'text-gray-900'}`}>
                                          {task.clientName}
                                        </span>
                                        {task.title && (
                                          <span className="text-[11px] text-gray-400 mt-0.5">{task.title}</span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span className={`text-sm font-bold transition-colors ${draggedItemIndex === index ? 'text-indigo-600' : 'text-gray-900'}`}>
                                          {task.title}
                                        </span>
                                        {task.subtitle && (
                                          <span className="text-[11px] text-gray-400 mt-0.5">{task.subtitle}</span>
                                        )}
                                      </>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {getTypeBadge(task.type)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-tight ${
                                    task.tagColor === 'purple' ? 'bg-purple-100 text-purple-700' : 
                                    task.tagColor === 'pink' ? 'bg-pink-100 text-pink-700' : 
                                    task.tagColor === 'blue' ? 'bg-blue-100 text-blue-700' : 
                                    task.tagColor === 'cyan' ? 'bg-cyan-100 text-cyan-700' : 
                                    task.tagColor === 'orange' ? 'bg-orange-100 text-orange-700' : 
                                    task.tagColor === 'gray' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {task.statusLabel || 'Normal'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                                {(() => {
                                  const delayInfo = getTaskDelayInfo(task);
                                  return (
                                    <span className={delayInfo.isLate ? "text-red-600" : ""}>
                                      {delayInfo.text}
                                    </span>
                                  );
                                })()}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <img src={task.collaborator.avatar} className="w-6 h-6 rounded-full mr-2 border border-gray-100" alt="" />
                                    <span className="text-sm font-medium text-gray-800">{task.collaborator.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div 
                                  className={`flex items-center justify-center gap-2 ${((task as any).note) ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}`}
                                  onClick={(e) => {
                                    if ((task as any).note) {
                                      e.stopPropagation();
                                      setViewingNote((task as any).note);
                                    }
                                  }}
                                >
                                    {((task as any).note) ? (
                                      <FileText size={14} className="text-gray-300 group-hover:text-indigo-400" />
                                    ) : (
                                      <span className="text-gray-200 text-[11px] font-medium">-</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {task.statusType === 'progress' ? (
                                    <div className="flex items-center space-x-3 w-full max-w-[200px] mx-auto">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${task.progress || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-indigo-600">{task.progress || 0}%</span>
                                        {task.isLate && <AlertCircle size={14} className="text-red-500" />}
                                    </div>
                                ) : (
                                    <div className="flex bg-gray-100 rounded-full p-0.5 w-full max-w-[220px] mx-auto border border-gray-200 shadow-inner">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'pending'); }}
                                          className={`flex-1 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'pending' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          À faire
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'in-progress'); }}
                                          className={`flex-1 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'in-progress' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          En cours
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'completed'); }}
                                          className={`flex-1 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'completed' ? 'bg-white shadow-sm text-gray-800 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          Terminé
                                        </button>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end space-x-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleEditClick(task); }} 
                                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 shadow-sm transition-all"
                                      title="Modifier"
                                    >
                                      <PenSquare size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }} 
                                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 shadow-sm transition-all"
                                      title="Supprimer"
                                    >
                                      <Trash2 size={16} className="text-red-500" />
                                    </button>
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
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer la tâche</h3>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-10">
                Êtes-vous sûr de vouloir supprimer cette tâche ?
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
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} className="text-red-500" />}
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'affichage de la note */}
      {viewingNote && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Note de la tâche</h3>
                </div>
                <button onClick={() => setViewingNote(null)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[150px] max-h-[400px] overflow-y-auto">
                <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {viewingNote}
                </p>
              </div>
              <div className="mt-8">
                <button 
                  onClick={() => setViewingNote(null)} 
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-[13px] hover:bg-black shadow-xl shadow-gray-100 transition-all active:scale-95"
                >
                  Fermer
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
