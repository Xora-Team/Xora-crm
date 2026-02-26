
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  CheckSquare
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from '@firebase/firestore';
import { Appointment, Task } from '../types';
import AddTaskModal from './AddTaskModal';

// Import des nouvelles vues
import AgendaDayView from './AgendaDayView';
import AgendaWeekView from './AgendaWeekView';
import AgendaMonthView from './AgendaMonthView';

interface AgendaProps {
  userProfile: any;
}

const Agenda: React.FC<AgendaProps> = ({ userProfile }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'Jours' | 'Semaine' | 'Mois'>('Semaine');
  const [filterUser, setFilterUser] = useState(userProfile?.name || '');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State pour l'édition de tâche depuis l'agenda
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // --- Chargement des collaborateurs de la société ---
  useEffect(() => {
    if (!userProfile?.companyId) return;
    
    const q = query(
      collection(db, 'users'), 
      where('companyId', '==', userProfile.companyId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setCollaborators(users);
    });
    
    return () => unsubscribe();
  }, [userProfile?.companyId]);

  // --- Chargement des rendez-vous ---
  useEffect(() => {
    if (!userProfile?.companyId) return;
    const q = query(collection(db, 'appointments'), where('companyId', '==', userProfile.companyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
      setAppointments(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.companyId]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(rdv => {
      const matchesSearch = rdv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           rdv.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUser = filterUser ? rdv.collaborator.name === filterUser : true;
      return matchesSearch && matchesUser;
    });
  }, [appointments, searchQuery, filterUser]);

  // --- Logique d'ouverture de tâche depuis l'agenda ---
  const handleAppointmentClick = async (rdv: Appointment) => {
    // On vérifie si ce RDV est lié à une tâche (champ taskId présent en base)
    const taskId = (rdv as any).taskId;
    if (taskId) {
      setIsLoading(true);
      try {
        const taskSnap = await getDoc(doc(db, 'tasks', taskId));
        if (taskSnap.exists()) {
          setTaskToEdit({ id: taskSnap.id, ...taskSnap.data() } as Task);
          setIsAddTaskModalOpen(true);
        } else {
          alert("La tâche liée à ce rendez-vous n'existe plus.");
        }
      } catch (e) {
        console.error("Erreur chargement tâche liée:", e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // --- Logique de Navigation Temporelle ---
  const changeDate = (direction: 'next' | 'prev') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'Jours') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'Semaine') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        label: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('fr-FR', { month: 'long' }),
        fullDate: d.toLocaleDateString('fr-FR'),
        isToday: d.toLocaleDateString('fr-FR') === new Date().toLocaleDateString('fr-FR')
      };
    });
  }, [currentDate]);

  const rangeLabel = useMemo(() => {
    if (viewMode === 'Jours') return currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    if (viewMode === 'Mois') return currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.dayNum}/${start.fullDate.split('/')[1]} - ${end.dayNum}/${end.fullDate.split('/')[1]}`;
  }, [viewMode, currentDate, weekDays]);

  return (
    <div className="flex flex-col h-full bg-white font-sans animate-in fade-in duration-300">
      <div className="p-8 space-y-6 flex-1 flex flex-col min-h-0">
        
        {/* Barre d'outils */}
        <div className="bg-[#F8F9FA] border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm shrink-0">
          <div className="flex items-center gap-5">
            <div className="flex bg-white rounded-full p-1 border border-gray-200 shadow-sm">
              {['Jours', 'Semaine', 'Mois'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-6 py-1.5 text-xs font-bold rounded-full transition-all ${
                    viewMode === mode ? 'bg-[#1A1C23] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-2 py-1 gap-4 shadow-sm">
               <button onClick={() => changeDate('prev')} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"><ChevronLeft size={16} /></button>
               <span className="text-xs font-black text-gray-800 uppercase tracking-widest min-w-[120px] text-center">
                 {rangeLabel}
               </span>
               <button onClick={() => changeDate('next')} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setTaskToEdit(null); setIsAddTaskModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
            >
               <CheckSquare size={16} className="text-indigo-500" />
               Ajouter une tâche
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-[12px] font-bold shadow-lg hover:bg-black transition-all active:scale-95">
               <Plus size={16} className="text-white/70" />
               Nouveau RDV
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-800 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher rdv..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:border-gray-400 transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <select 
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold text-gray-800 outline-none hover:border-gray-400 transition-all cursor-pointer shadow-sm"
            >
              <option value="">Tous les collaborateurs</option>
              {collaborators.map(collab => (
                <option key={collab.uid} value={collab.name}>
                  {collab.name} {collab.uid === userProfile?.uid ? '(Moi)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Zone des Vues Calendrier */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-gray-100/50 overflow-hidden relative flex-1 flex flex-col min-h-0">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center">
              <Loader2 className="animate-spin text-gray-300" size={32} />
            </div>
          )}

          <div className="overflow-auto flex-1 custom-scrollbar">
            {viewMode === 'Jours' && (
              <AgendaDayView 
                currentDate={currentDate} 
                appointments={filteredAppointments}
                onAppointmentClick={handleAppointmentClick}
              />
            )}
            {viewMode === 'Semaine' && (
              <AgendaWeekView 
                currentDate={currentDate} 
                weekDays={weekDays} 
                appointments={filteredAppointments} 
                onAppointmentClick={handleAppointmentClick}
              />
            )}
            {viewMode === 'Mois' && (
              <AgendaMonthView 
                currentDate={currentDate} 
                appointments={filteredAppointments} 
                onAppointmentClick={handleAppointmentClick}
              />
            )}
          </div>
        </div>
      </div>

      <AddTaskModal 
        isOpen={isAddTaskModalOpen}
        onClose={() => { setIsAddTaskModalOpen(false); setTaskToEdit(null); }}
        userProfile={userProfile}
        taskToEdit={taskToEdit}
      />
    </div>
  );
};

export default Agenda;
