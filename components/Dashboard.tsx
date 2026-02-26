
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  Plus, 
  AlertTriangle, 
  MoreVertical, 
  ChevronDown, 
  Euro, 
  User,
  ChevronUp,
  Loader2,
  Clock,
  Calendar,
  PenSquare,
  Trash2,
  UserPlus
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit, doc, deleteDoc, updateDoc, writeBatch } from '@firebase/firestore';
import { FinancialKPI, Task, Client, Page, Appointment } from '../types';
import AddTaskModal from './AddTaskModal';

interface DashboardProps {
  userProfile?: any;
  onClientClick?: (client: Client) => void;
  onAddClientClick?: () => void;
  onNavigate?: (page: Page, options?: { tab?: string }) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userProfile, onClientClick, onAddClientClick, onNavigate }) => {
  const [isKPIOpen, setIsKPIOpen] = useState(true);
  const [kpis, setKpis] = useState<FinancialKPI[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        label: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dateStr: d.toLocaleDateString('fr-FR'),
        isToday: d.toLocaleDateString('fr-FR') === new Date().toLocaleDateString('fr-FR')
      };
    });
  }, []);

  useEffect(() => {
    if (!userProfile?.companyId) return;

    const unsubKpis = onSnapshot(query(collection(db, 'kpis'), where('companyId', '==', userProfile.companyId)), (s) => setKpis(s.docs.map(d => ({ id: d.id, ...d.data() })) as FinancialKPI[]));
    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('companyId', '==', userProfile.companyId)), (s) => setAllClients(s.docs.map(d => ({ id: d.id, ...d.data() })) as Client[]));
    const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('companyId', '==', userProfile.companyId)), (s) => {
      setAllProjects(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
    const unsubTasks = onSnapshot(query(
      collection(db, 'tasks'), 
      where('companyId', '==', userProfile.companyId),
      where('collaborator.uid', '==', userProfile.uid),
      limit(50)
    ), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const sortedData = data.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
      setTasks(sortedData.filter(t => t.status !== 'completed').slice(0, 10));
    });
    const unsubAppts = onSnapshot(query(collection(db, 'appointments'), where('companyId', '==', userProfile.companyId), where('collaborator.name', '==', userProfile.name)), (s) => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() })) as Appointment[]));

    return () => { unsubKpis(); unsubClients(); unsubProjects(); unsubTasks(); unsubAppts(); };
  }, [userProfile?.companyId, userProfile?.name, userProfile?.uid]);

  const onDragStart = (index: number) => setDraggedItemIndex(index);
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newTasks = [...tasks];
    const draggedItem = newTasks[draggedItemIndex];
    newTasks.splice(draggedItemIndex, 1);
    newTasks.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    setTasks(newTasks);
  };

  const onDragEnd = async () => {
    setDraggedItemIndex(null);
    if (!userProfile?.companyId) return;
    const batch = writeBatch(db);
    tasks.forEach((t, i) => batch.update(doc(db, 'tasks', t.id), { orderIndex: i }));
    await batch.commit();
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try { await updateDoc(doc(db, 'tasks', id), { status }); } catch (e) { console.error(e); }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    try { await deleteDoc(doc(db, 'tasks', id)); setActiveMenuId(null); } catch (e) { console.error(e); }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsAddTaskModalOpen(true);
    setActiveMenuId(null);
  };

  const statusCards = useMemo(() => [
    { id: 'leads', label: 'Leads', count: allClients.filter(c => c.status === 'Leads').length, bgColor: 'bg-[#F3E8FF]', textColor: 'text-[#7E22CE]' },
    { id: 'etudes', label: 'Etudes en cours', count: allProjects.filter(p => p.status?.includes('Étude')).length, bgColor: 'bg-[#FAE8FF]', textColor: 'text-[#A21CAF]' },
    { id: 'commandes', label: 'Commandes clients', count: allProjects.filter(p => p.status?.toLowerCase().includes('command')).length, bgColor: 'bg-[#DBEAFE]', textColor: 'text-[#1D4ED8]' },
    { id: 'dossiers', label: 'Dossiers tech & install', count: allProjects.filter(p => p.status?.toLowerCase().includes('tech')).length, bgColor: 'bg-[#CFFAFE]', textColor: 'text-[#0E7490]' },
    { id: 'sav', label: 'SAV', count: allProjects.filter(p => p.status?.toLowerCase().includes('sav')).length, bgColor: 'bg-[#FFEDD5]', textColor: 'text-[#C2410C]' },
  ], [allClients, allProjects]);

  const calculateDaysLate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    if (dateStr.toLowerCase().includes('retard')) return dateStr;
    
    try {
      const [d, m, y] = dateStr.split('/').map(Number);
      const dueDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        return `${diffDays} jours de retard`;
      }
    } catch (e) {
      return dateStr;
    }
    return dateStr;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-[calc(100vh-64px)] font-sans">
      {/* Barre de recherche avec bouton d'ajout rapide */}
      <div ref={searchRef} className="relative z-30">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              value={searchQuery} 
              onFocus={() => setShowSearchDropdown(true)} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Rechercher un client" 
              className="w-full pl-10 pr-4 py-2 border-b border-gray-200 focus:outline-none focus:border-gray-400 text-sm bg-white text-gray-800 placeholder-gray-400 font-medium" 
            />
          </div>
          <button 
            onClick={onAddClientClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black shadow-lg hover:shadow-gray-200 transition-all active:scale-95 shrink-0"
          >
            <Plus size={14} className="text-white/70" />
            Ajouter fiche lead
          </button>
        </div>
        {showSearchDropdown && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
            {allClients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(client => (
              <button key={client.id} onClick={() => onClientClick?.(client)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-sm font-bold text-gray-900">{client.name}</span>
                <span className="px-2 py-0.5 text-[9px] font-black bg-purple-100 text-purple-600 rounded uppercase tracking-widest">{client.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <button onClick={() => setIsKPIOpen(!isKPIOpen)} className="w-full p-4 flex justify-between items-center bg-white transition-colors">
            <h3 className="font-semibold text-gray-800">Liste des KPI financiers</h3>
            {isKPIOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {isKPIOpen && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-t border-gray-100 bg-white">
                {kpis.map((kpi) => (
                    <div key={kpi.id} className="border border-gray-100 rounded-xl p-4 flex flex-col justify-between shadow-sm bg-[#FBFBFB]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-[#A886D7] shadow-sm"><Euro size={20} className="text-white" /></div>
                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-tight text-right leading-tight max-w-[120px]">{kpi.label}</span>
                        </div>
                        <div>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
                                <span className="text-xs text-gray-400 font-medium">/ {kpi.target}</span>
                            </div>
                            <div className="mt-3 relative h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className="absolute top-0 left-0 h-full bg-[#A886D7] rounded-full transition-all duration-1000" style={{ width: `${kpi.percentage}%` }}></div>
                            </div>
                            <div className="text-right mt-1"><span className="text-xs font-bold text-gray-900">{kpi.percentage}%</span></div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne Gauche - Tuiles Statut */}
        <div className="lg:col-span-3 flex flex-col gap-3">
             {statusCards.map((card) => (
                <div key={card.id} className={`${card.bgColor} rounded-xl p-4 flex flex-col justify-between relative group hover:shadow-md transition-all min-h-[95px] border border-white/50 shadow-sm`}>
                    <div className="flex justify-between items-start">
                         <span className={`font-bold text-[12px] uppercase tracking-wider ${card.textColor}`}>{card.label}</span>
                         <div className="bg-white/80 p-1 rounded-lg cursor-pointer hover:bg-white transition-colors shadow-sm" onClick={() => onNavigate?.('projects')}>
                           <ArrowUpRight size={14} className={card.textColor} />
                        </div>
                    </div>
                    <span className={`text-2xl font-black ${card.textColor} mt-1`}>{card.count || 0}</span>
                </div>
             ))}
        </div>

        {/* Colonne Droite - Tâches & Mémos */}
        <div className="lg:col-span-9">
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 h-full flex flex-col overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0 px-2">
                    <div className="space-y-1">
                       <h3 className="text-[18px] font-black text-gray-900 uppercase tracking-tight">Priorité des tâches & mémos</h3>
                       <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Aujourd'hui, {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => { setEditingTask(null); setIsAddTaskModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold hover:bg-gray-50 text-gray-800 shadow-sm transition-all active:scale-95 group">
                          <Plus size={14} className="text-indigo-500 group-hover:rotate-90 transition-transform duration-300" />
                          <span>AJOUTER UNE TÂCHE MANUELLE OU UN MÉMO</span>
                      </button>
                      <button onClick={() => onNavigate?.('projects')} className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl border border-gray-100 hover:bg-white transition-all shadow-sm">
                          <ArrowUpRight size={18} />
                      </button>
                    </div>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {tasks.map((task, index) => {
                        const project = allProjects.find(p => p.id === (task as any).projectId);
                        const isProjectTask = !!project;
                        const displayProgress = project ? (project.progress || 2) : (task.progress || 0);
                        const delayText = task.isLate ? calculateDaysLate(task.date) : task.date;
                        
                        return (
                        <div 
                          key={task.id} 
                          draggable 
                          onDragStart={() => onDragStart(index)}
                          onDragOver={(e) => onDragOver(e, index)}
                          onDragEnd={onDragEnd}
                          className={`group bg-white border-b border-gray-50 p-4 flex items-center gap-6 hover:bg-gray-50/50 transition-all ${draggedItemIndex === index ? 'opacity-40 scale-95' : ''}`}
                        >
                            {/* Numérotation */}
                            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg text-gray-400 font-bold text-xs group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                {index + 1}
                            </div>

                            {/* Titre & Infos */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                   <h4 className={`text-[13.5px] font-bold truncate uppercase tracking-tight transition-colors ${task.type === 'Mémo' ? 'text-gray-400 italic' : 'text-gray-900 group-hover:text-indigo-600'}`}>{task.title}</h4>
                                   {(task.tag || task.statusLabel) && (
                                     <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                       task.tagColor === 'blue' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                                       task.tagColor === 'purple' ? 'bg-purple-50 text-purple-500 border border-purple-100' :
                                       task.tagColor === 'pink' ? 'bg-pink-50 text-pink-500 border border-pink-100' :
                                       'bg-gray-100 text-gray-400 border border-gray-200'
                                     }`}>
                                       {task.tag || task.statusLabel}
                                     </span>
                                   )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                   <span className={`text-[10px] font-bold uppercase tracking-tighter ${task.isLate ? 'text-red-500 font-black' : 'text-gray-300'}`}>
                                      {delayText || 'Sans échéance'}
                                   </span>
                                </div>
                            </div>

                            {/* Barre de progression (Uniquement pour les tâches rattachées à un projet) */}
                            {isProjectTask ? (
                                <div className="hidden md:flex items-center gap-4 w-1/3 shrink-0 px-4">
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-1000 ${
                                            task.tagColor === 'purple' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,134,215,0.5)]' : 
                                            task.tagColor === 'pink' ? 'bg-pink-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]' :
                                            'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                          }`} 
                                          style={{ width: `${displayProgress}%` }}
                                        />
                                    </div>
                                    <span className={`text-[11px] font-black w-10 text-right ${
                                      task.tagColor === 'purple' ? 'text-purple-600' : 
                                      task.tagColor === 'pink' ? 'text-pink-600' :
                                      'text-blue-600'
                                    }`}>
                                      {displayProgress}%
                                    </span>
                                </div>
                            ) : (
                                /* Boutons de statut pour tâches manuelles/mémos simples uniquement */
                                <div className="hidden md:flex bg-gray-100 rounded-full p-0.5 border border-gray-200 shadow-inner shrink-0 scale-90">
                                    <button onClick={() => updateTaskStatus(task.id, 'pending')} className={`px-3 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'pending' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>Non commencé</button>
                                    <button onClick={() => updateTaskStatus(task.id, 'in-progress')} className={`px-3 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'in-progress' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>En cours</button>
                                    <button onClick={() => updateTaskStatus(task.id, 'completed')} className={`px-3 py-1 text-[9px] font-black uppercase rounded-full transition-all ${task.status === 'completed' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>Terminé</button>
                                </div>
                            )}

                            {/* Alerte Retard & Menu */}
                            <div className="flex items-center gap-2 shrink-0">
                                {task.isLate && (
                                  <div className="relative group/alert">
                                    <div className="p-2 bg-white text-gray-900 border border-gray-200 rounded-lg shadow-sm">
                                      <AlertTriangle size={18} />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                                  </div>
                                )}
                                
                                <div className="relative">
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }} className={`p-2 rounded-lg transition-all ${activeMenuId === task.id ? 'bg-gray-100 text-gray-900 shadow-sm border border-gray-200' : 'text-gray-300 hover:bg-gray-50 border border-transparent'}`}>
                                    <MoreVertical size={18} />
                                  </button>
                                  {activeMenuId === task.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                                      <div className="absolute right-0 bottom-full mb-2 lg:bottom-auto lg:top-full lg:mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-48 animate-in fade-in zoom-in-95 duration-150">
                                        <button onClick={() => handleEditTask(task)} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><PenSquare size={14} className="text-gray-400" /> Modifier</button>
                                        <div className="h-px bg-gray-50 my-1 mx-2" />
                                        <button onClick={() => handleDeleteTask(task.id)} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Supprimer</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* Agenda Section */}
      <div className="w-full">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm border border-indigo-100"><Calendar size={24} /></div>
                        <div>
                          <h3 className="text-[18px] font-black text-gray-900 uppercase tracking-tight">Mon agenda de la semaine</h3>
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Vos rendez-vous personnels (Lundi - Vendredi)</p>
                        </div>
                    </div>
                    <button onClick={() => onNavigate?.('agenda')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[12px] font-bold shadow-lg hover:bg-black transition-all">
                      <span>Vue complète</span>
                      <ArrowUpRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {weekDays.map((day, i) => {
                        const dayAppts = appointments.filter(a => a.date === day.dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
                        return (
                            <div key={i} className={`flex flex-col min-h-[300px] rounded-3xl border transition-all ${day.isToday ? 'bg-indigo-50/20 border-indigo-100 shadow-sm' : 'bg-gray-50/30 border-gray-100'}`}>
                                <div className={`p-4 text-center border-b ${day.isToday ? 'border-indigo-100' : 'border-gray-100'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${day.isToday ? 'text-indigo-600' : 'text-gray-400'}`}>{day.label}</div>
                                    <div className={`text-[14px] font-black mt-1 ${day.isToday ? 'text-indigo-900' : 'text-gray-600'}`}>{day.dateStr.split('/')[0]} {new Date().toLocaleDateString('fr-FR', { month: 'short' })}</div>
                                </div>
                                <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                                    {dayAppts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                                            <Clock size={20} className="text-gray-400 mb-2" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Libre</span>
                                        </div>
                                    ) : (
                                        dayAppts.map((rdv) => (
                                            <div key={rdv.id} onClick={() => onNavigate?.('agenda')} className="p-3 rounded-xl border bg-white border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter block mb-1">{rdv.startTime}</span>
                                                <h4 className="text-[12px] font-bold leading-tight line-clamp-2 uppercase tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors">{rdv.title}</h4>
                                                <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-gray-400">
                                                   <User size={10} className="shrink-0" />
                                                   <span className="truncate">{rdv.clientName}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
      </div>

      <AddTaskModal isOpen={isAddTaskModalOpen} onClose={() => { setIsAddTaskModalOpen(false); setEditingTask(null); }} userProfile={userProfile} taskToEdit={editingTask} />
    </div>
  );
};

export default Dashboard;
