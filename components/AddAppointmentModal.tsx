
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, Loader2, Check, ChevronDown, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from '@firebase/firestore';
import { Appointment } from '../types';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  clientId: string;
  clientName: string;
  initialProjectId?: string;
  appointmentToEdit?: Appointment | null;
}

const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  clientId, 
  clientName,
  initialProjectId = '',
  appointmentToEdit = null
}) => {
  const isEdit = !!appointmentToEdit;
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const [formData, setFormData] = useState({
    title: '',
    type: 'R1' as any,
    date: '',
    startTime: '10:00',
    endTime: '12:00',
    location: 'Showroom' as any,
    projectId: initialProjectId,
    collaboratorIdx: 0
  });

  const typeOptions = ['R1', 'R2', 'Métré', 'Pose', 'SAV', 'Autre'];
  const locationOptions = ['Showroom', 'Domicile', 'Visio', 'Autre'];
  
  const collaborators = useMemo(() => [
    { name: userProfile?.name || 'Moi', avatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=loic' },
    { name: 'Thomas', avatar: 'https://i.pravatar.cc/150?u=admin' },
    { name: 'Céline', avatar: 'https://i.pravatar.cc/150?u=2' },
  ], [userProfile]);

  useEffect(() => {
    if (isOpen) {
      if (appointmentToEdit) {
        // Mode Edition
        const [d, m, y] = appointmentToEdit.date.split('/');
        const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        
        setFormData({
          title: appointmentToEdit.title,
          type: appointmentToEdit.type,
          date: isoDate,
          startTime: appointmentToEdit.startTime,
          endTime: appointmentToEdit.endTime,
          location: appointmentToEdit.location,
          projectId: appointmentToEdit.projectId || initialProjectId,
          collaboratorIdx: collaborators.findIndex(c => c.name === appointmentToEdit.collaborator.name) || 0
        });
        setCurrentCalendarMonth(new Date(isoDate));
      } else {
        // Mode Création
        setFormData({
          title: '',
          type: 'R1',
          date: '',
          startTime: '10:00',
          endTime: '12:00',
          location: 'Showroom',
          projectId: initialProjectId,
          collaboratorIdx: 0
        });
        setCurrentCalendarMonth(new Date());
      }
      setShowDatePicker(false);
    }
  }, [isOpen, appointmentToEdit, initialProjectId, collaborators]);

  useEffect(() => {
    if (!isOpen || !clientId) return;
    const fetchProjects = async () => {
      const q = query(collection(db, 'projects'), where('clientId', '==', clientId));
      const snap = await getDocs(q);
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProjects();
  }, [isOpen, clientId]);

  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let startOffset = firstDay.getDay();
    startOffset = startOffset === 0 ? 6 : startOffset - 1;

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: month - 1, year, currentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ day: i, month, year, currentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year, currentMonth: false });
    }
    return days;
  }, [currentCalendarMonth]);

  const handleSelectDate = (day: number, month: number, year: number) => {
    const selected = new Date(year, month, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    setFormData({ ...formData, date: `${yyyy}-${mm}-${dd}` });
    setShowDatePicker(false);
  };

  const changeMonth = (offset: number) => {
    const next = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + offset, 1);
    setCurrentCalendarMonth(next);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Sélectionner une date';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    setIsLoading(true);
    try {
      const selectedCollab = collaborators[formData.collaboratorIdx];
      const selectedProject = projects.find(p => p.id === formData.projectId);
      const [y, m, d] = formData.date.split('-');
      const rdvDate = `${d}/${m}/${y}`;

      const appointmentData = {
        clientId,
        clientName,
        projectId: formData.projectId || null,
        projectName: selectedProject?.projectName || null,
        title: formData.title,
        type: formData.type,
        date: rdvDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location,
        status: isEdit ? (appointmentToEdit?.status || 'confirmé') : 'confirmé',
        collaborator: {
          name: selectedCollab.name,
          avatar: selectedCollab.avatar
        },
        companyId: userProfile.companyId,
      };

      if (isEdit && appointmentToEdit) {
        await updateDoc(doc(db, 'appointments', appointmentToEdit.id), appointmentData);
      } else {
        await addDoc(collection(db, 'appointments'), {
          ...appointmentData,
          createdAt: new Date().toISOString()
        });
      }

      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-visible flex flex-col animate-in zoom-in-95 duration-300">
        <form onSubmit={handleSubmit}>
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-gray-200 bg-white rounded-xl flex items-center justify-center text-gray-800 shadow-sm">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-gray-900">{isEdit ? 'Modifier le rendez-vous' : 'Prendre un rendez-vous'}</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Client : {clientName}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Objet du rendez-vous*</label>
              <input 
                required
                type="text" 
                placeholder="Ex: Présentation du projet cuisine"
                className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Type de RDV</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Lieu</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value as any})}
                  >
                    {locationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 relative">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Date*</label>
                <button 
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none text-left flex items-center justify-between shadow-sm hover:border-indigo-400 transition-all"
                >
                  <span className={formData.date ? 'text-gray-900' : 'text-gray-400'}>
                    {formatDisplayDate(formData.date)}
                  </span>
                  <Calendar size={16} className="text-gray-400" />
                </button>

                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] w-[280px] p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[13px] font-black uppercase text-gray-900">
                        {currentCalendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronLeft size={16} /></button>
                        <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronRight size={16} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                        <div key={d} className="text-[10px] font-black text-gray-300 text-center uppercase">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((d, i) => {
                        const dateStr = `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                        const isSelected = formData.date === dateStr;
                        const isToday = new Date().toLocaleDateString('fr-FR') === new Date(d.year, d.month, d.day).toLocaleDateString('fr-FR');
                        
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectDate(d.day, d.month, d.year)}
                            className={`h-8 w-8 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center ${
                              isSelected ? 'bg-indigo-600 text-white shadow-lg' : 
                              isToday ? 'bg-indigo-50 text-indigo-600' :
                              d.currentMonth ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-200'
                            }`}
                          >
                            {d.day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Début</label>
                <div className="relative">
                  <input 
                    type="time" 
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                  />
                  <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Fin</label>
                <div className="relative">
                  <input 
                    type="time" 
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                  />
                  <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Collaborateur</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                    value={formData.collaboratorIdx}
                    onChange={e => setFormData({...formData, collaboratorIdx: Number(e.target.value)})}
                  >
                    {collaborators.map((c, i) => <option key={i} value={i}>{c.name}</option>)}
                  </select>
                  <img src={collaborators[formData.collaboratorIdx].avatar} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-white" alt="" />
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Projet lié (Optionnel)</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                    value={formData.projectId}
                    onChange={e => setFormData({...formData, projectId: e.target.value})}
                  >
                    <option value="">Aucun</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-gray-100 bg-[#FBFBFB] flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Annuler</button>
            <button type="submit" disabled={isLoading || !formData.date} className="flex items-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isEdit ? <Save size={18} /> : <Check size={18} />)}
              {isEdit ? 'Enregistrer les modifications' : 'Confirmer le rendez-vous'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAppointmentModal;
