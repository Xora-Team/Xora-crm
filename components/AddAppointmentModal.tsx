
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, Loader2, Check, ChevronDown, ChevronLeft, ChevronRight, Save, Plus, Search, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Appointment, User } from '../types';
import { formatPhone } from '../utils';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  clientId?: string;
  clientName?: string;
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

  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [showCollaboratorDropdown, setShowCollaboratorDropdown] = useState(false);

  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientLinked, setIsClientLinked] = useState(true);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'R1' as any,
    date: '',
    endDate: '',
    startTime: '10:30',
    endTime: '11:30',
    location: 'Magasin' as any,
    address: '',
    projectId: initialProjectId,
    selectedCollaboratorUids: [] as string[],
    selectedClientId: clientId || '',
    isRecurring: false,
    isPrivate: false,
    createVisio: false,
    comment: '',
    streetViewLink: ''
  });

  const typeOptions = ['R1', 'R2', 'Métré', 'Pose', 'SAV', 'Autre'];
  const locationOptions = ['Magasin', 'Chez le client', 'Sur chantier', 'Adresse différente', 'Téléphonique', 'Visio'];

  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setClientSearch('');
      setShowClientDropdown(false);
      setShowCollaboratorDropdown(false);
      if (appointmentToEdit) {
        // Mode Edition
        const [d, m, y] = appointmentToEdit.date.split('/');
        const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        
        const currentClientId = appointmentToEdit.clientId || clientId || '';
        const currentClientName = appointmentToEdit.clientName || clientName || '';

        setFormData({
          title: appointmentToEdit.title,
          type: appointmentToEdit.type || 'R1',
          date: isoDate,
          endDate: (appointmentToEdit as any).endDate || isoDate,
          startTime: appointmentToEdit.startTime,
          endTime: appointmentToEdit.endTime,
          location: appointmentToEdit.location || 'Magasin',
          address: (appointmentToEdit as any).address || '',
          projectId: appointmentToEdit.projectId || initialProjectId,
          selectedCollaboratorUids: appointmentToEdit.collaborators?.map(c => c.uid).filter(Boolean) as string[] || [],
          selectedClientId: currentClientId,
          isRecurring: (appointmentToEdit as any).isRecurring || false,
          isPrivate: (appointmentToEdit as any).isPrivate || false,
          createVisio: (appointmentToEdit as any).createVisio || false,
          comment: (appointmentToEdit as any).comment || '',
          streetViewLink: (appointmentToEdit as any).streetViewLink || ''
        });
        setClientSearch(currentClientName);
        setIsClientLinked(!!currentClientId);
        setCurrentCalendarMonth(new Date(isoDate));
      } else {
        // Mode Création
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        // Heure de fin par défaut : +1 heure
        const endNow = new Date(now.getTime() + 60 * 60 * 1000);
        const endHours = String(endNow.getHours()).padStart(2, '0');
        const endMinutes = String(endNow.getMinutes()).padStart(2, '0');
        const endTime = `${endHours}:${endMinutes}`;

        setFormData({
          title: '',
          type: 'R1',
          date: today,
          endDate: today,
          startTime: currentTime,
          endTime: endTime,
          location: 'Magasin',
          address: '',
          projectId: initialProjectId,
          selectedCollaboratorUids: userProfile?.uid ? [userProfile.uid] : [],
          selectedClientId: clientId || '',
          isRecurring: false,
          isPrivate: false,
          createVisio: false,
          comment: '',
          streetViewLink: ''
        });
        setClientSearch(clientName || '');
        setIsClientLinked(!!clientId);
        setCurrentCalendarMonth(new Date());
      }
      setShowDatePicker(false);
    }
  }, [isOpen, appointmentToEdit, initialProjectId, collaborators, clientId, userProfile]);

  useEffect(() => {
    if (!isOpen || !userProfile?.companyId) return;
    const fetchClientsAndCollaborators = async () => {
      const clientsQ = query(collection(db, 'clients'), where('companyId', '==', userProfile.companyId));
      const clientsSnap = await getDocs(clientsQ);
      setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const collabsQ = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
      const collabsSnap = await getDocs(collabsQ);
      setCollaborators(collabsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));

      const appointmentsQ = query(collection(db, 'appointments'), where('companyId', '==', userProfile.companyId));
      const appointmentsSnap = await getDocs(appointmentsQ);
      setAllAppointments(appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    };
    fetchClientsAndCollaborators();
  }, [isOpen, userProfile?.companyId]);

  useEffect(() => {
    const cid = clientId || formData.selectedClientId;
    if (!isOpen || !cid) {
      setProjects([]);
      return;
    }
    const fetchProjects = async () => {
      const q = query(collection(db, 'projects'), where('clientId', '==', cid));
      const snap = await getDocs(q);
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProjects();
  }, [isOpen, clientId, formData.selectedClientId]);

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

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const selectedClient = useMemo(() => {
    const cid = clientId || formData.selectedClientId;
    return clients.find(c => c.id === cid);
  }, [clients, clientId, formData.selectedClientId]);

  const conflicts = useMemo(() => {
    if (!formData.date || !formData.startTime || !formData.endTime || formData.selectedCollaboratorUids.length === 0) return [];
    
    const [y, m, d] = formData.date.split('-');
    const currentRdvDate = `${d}/${m}/${y}`;
    
    const start = parseInt(formData.startTime.replace(':', ''));
    const end = parseInt(formData.endTime.replace(':', ''));

    const conflictList: { uid: string, name: string, title: string }[] = [];

    allAppointments.forEach(rdv => {
      // Skip the current appointment if editing
      if (isEdit && rdv.id === appointmentToEdit?.id) return;
      
      // Check date
      if (rdv.date !== currentRdvDate) return;

      // Check time overlap
      const rdvStart = parseInt(rdv.startTime.replace(':', ''));
      const rdvEnd = parseInt(rdv.endTime.replace(':', ''));
      
      const hasTimeOverlap = (start < rdvEnd && end > rdvStart);
      if (!hasTimeOverlap) return;

      // Check which selected collaborators are in this appointment
      formData.selectedCollaboratorUids.forEach(uid => {
        if (rdv.collaboratorUids?.includes(uid)) {
          const collab = collaborators.find(c => c.uid === uid);
          conflictList.push({
            uid,
            name: collab?.name || 'Inconnu',
            title: rdv.title
          });
        }
      });
    });

    return conflictList;
  }, [allAppointments, formData.date, formData.startTime, formData.endTime, formData.selectedCollaboratorUids, isEdit, appointmentToEdit?.id, collaborators]);

  const currentUserConflicts = useMemo(() => 
    conflicts.filter(c => c.uid === userProfile?.uid),
  [conflicts, userProfile?.uid]);

  const otherConflicts = useMemo(() => 
    conflicts.filter(c => c.uid !== userProfile?.uid),
  [conflicts, userProfile?.uid]);

  useEffect(() => {
    if (!selectedClient) return;

    if (formData.location === 'Chez le client') {
      setFormData(prev => ({ ...prev, address: selectedClient.details?.address || '' }));
    } else if (formData.location === 'Téléphonique') {
      setFormData(prev => ({ ...prev, address: selectedClient.details?.phone || '' }));
    } else if (formData.location === 'Sur chantier') {
      const chantierProp = selectedClient.details?.properties?.find((p: any) => !p.isMain) || selectedClient.details?.properties?.[0];
      setFormData(prev => ({ ...prev, address: chantierProp?.address || selectedClient.details?.address || '' }));
    }
  }, [selectedClient, formData.location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting appointment form...', formData);
    
    if (!formData.title) {
      alert("Veuillez saisir un titre pour le rendez-vous.");
      return;
    }
    if (!formData.date) {
      alert("Veuillez sélectionner une date.");
      return;
    }
    if (isClientLinked && !clientId && !formData.selectedClientId) {
      alert("Veuillez sélectionner un client.");
      return;
    }
    if (formData.selectedCollaboratorUids.length === 0) {
      alert("Veuillez sélectionner au moins un collaborateur.");
      return;
    }
    if (!userProfile?.companyId) {
      alert("Erreur: ID de l'entreprise manquant.");
      return;
    }

    setIsLoading(true);
    try {
      const selectedCollaborators = collaborators.filter(c => formData.selectedCollaboratorUids.includes(c.uid || ''));
      const selectedProject = projects.find(p => p.id === formData.projectId);
      const [y, m, d] = formData.date.split('-');
      const rdvDate = `${d}/${m}/${y}`;

      const finalClientId = isClientLinked ? (clientId || formData.selectedClientId) : null;
      const finalClientName = isClientLinked ? (clientSearch || clientName || 'Client divers') : 'Client divers';

      const appointmentData = {
        clientId: finalClientId || null,
        clientName: finalClientName,
        projectId: formData.projectId || null,
        projectName: selectedProject?.projectName || null,
        title: formData.title,
        type: formData.type,
        date: rdvDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location,
        address: formData.address,
        isRecurring: formData.isRecurring,
        isPrivate: formData.isPrivate,
        createVisio: formData.createVisio,
        comment: formData.comment,
        streetViewLink: formData.streetViewLink,
        status: isEdit ? (appointmentToEdit?.status || 'confirmé') : 'confirmé',
        collaborators: selectedCollaborators.map(c => ({
          uid: c.uid,
          name: c.name,
          avatar: c.avatar,
          agendaColor: (c as any).agendaColor || '#6366f1'
        })),
        collaboratorUids: formData.selectedCollaboratorUids,
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
      console.error('Error saving appointment:', error);
      alert("Une erreur est survenue lors de l'enregistrement du rendez-vous.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointmentToEdit) return;
    
    if (confirm("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?")) {
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, 'appointments', appointmentToEdit.id));
        onClose();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert("Une erreur est survenue lors de la suppression du rendez-vous.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const Toggle = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-bold text-gray-400">Non</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-gray-900' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-6' : 'left-1'}`} />
      </button>
      <span className="text-[12px] font-bold text-gray-400">Oui</span>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-gray-200 bg-white rounded-lg flex items-center justify-center text-gray-800">
                <Calendar size={18} />
              </div>
              <h2 className="text-[16px] font-bold text-gray-900">
                {isEdit ? 'Modifier le rendez-vous' : 'Ajouter un rendez-vous'} - {appointmentToEdit?.clientName || clientName || 'Nouveau Client'}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-gray-400 border border-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Sélection du Client */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Client lié ?*
                </label>
                <Toggle 
                  value={isClientLinked} 
                  onChange={(v) => {
                    if (clientId || isEdit) return; // Verrouillé si déjà lié ou en édition
                    setIsClientLinked(v);
                    if (!v) {
                      setFormData(prev => ({ ...prev, selectedClientId: '' }));
                      setClientSearch('');
                    }
                  }} 
                />
              </div>

              {isClientLinked && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Rechercher le client* {isEdit && !formData.selectedClientId && <span className="text-red-500">(Non lié)</span>}
                    {(clientId || isEdit) && <span className="ml-1 text-[9px] text-gray-300 italic">(Verrouillé)</span>}
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text"
                        disabled={!!clientId || isEdit}
                        placeholder="Rechercher un client..."
                        className="w-full bg-white border border-gray-100 rounded-lg pl-9 pr-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                          if (!e.target.value) setFormData(prev => ({ ...prev, selectedClientId: '' }));
                        }}
                        onFocus={() => !clientId && !isEdit && setShowClientDropdown(true)}
                      />
                    </div>
                    
                    {showClientDropdown && !clientId && !isEdit && filteredClients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] max-h-48 overflow-y-auto p-1 animate-in fade-in slide-in-from-top-1">
                        {filteredClients.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, selectedClientId: c.id });
                              setClientSearch(c.name);
                              setShowClientDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.selectedClientId === c.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Titre */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Titre du Rendez-vous*</label>
              <input 
                required
                type="text" 
                placeholder="RDV Chloé Dubois R1"
                className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            {/* Récurrence */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rendez-vous récurrent</label>
              <Toggle value={formData.isRecurring} onChange={v => setFormData({...formData, isRecurring: v})} />
            </div>

            {/* Date & Heure */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-[1fr,1fr,auto,1fr,1fr] items-end gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date du début du rdv</label>
                  <div className="relative">
                    <input 
                      type="date"
                      className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.date}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, date: val, endDate: val });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Heure du début du rdv</label>
                  <div className="relative">
                    <input 
                      type="time"
                      className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.startTime}
                      onChange={e => {
                        const val = e.target.value;
                        const [h, m] = val.split(':').map(Number);
                        const endH = (h + 1) % 24;
                        const newEndTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        setFormData({ ...formData, startTime: val, endTime: newEndTime });
                      }}
                    />
                  </div>
                </div>
                <div className="pb-3 text-gray-300">
                  <div className="w-12 h-[1px] bg-gray-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Heure de fin du rdv</label>
                  <div className="relative">
                    <input 
                      type="time"
                      className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date de fin du rdv</label>
                  <div className="relative">
                    <input 
                      type="date"
                      className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.endDate}
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {conflicts.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[13px] font-bold text-amber-900">Attention : Conflit d'agenda</p>
                    <div className="space-y-1">
                      {currentUserConflicts.map((c, i) => (
                        <p key={`me-${i}`} className="text-[12px] text-amber-700 leading-relaxed">
                          Vous avez déjà un rendez-vous ("{c.title}") sur ce créneau.
                        </p>
                      ))}
                      {otherConflicts.map((c, i) => (
                        <p key={`other-${i}`} className="text-[12px] text-amber-700 leading-relaxed">
                          {c.name} a déjà un rendez-vous ("{c.title}") sur ce créneau.
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collaborateur & Privé */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Collaborateur (choix multiple possible)</label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowCollaboratorDropdown(!showCollaboratorDropdown)}
                    className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 flex items-center justify-between hover:border-indigo-400 transition-all"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                      {formData.selectedCollaboratorUids.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {collaborators
                            .filter(c => formData.selectedCollaboratorUids.includes(c.uid || ''))
                            .map((c) => (
                              <div key={c.uid} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                <img src={c.avatar} className="w-5 h-5 rounded-full shadow-sm" alt={c.name} />
                                <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">{c.name}</span>
                              </div>
                            ))
                          }
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Sélectionner des collaborateurs</span>
                      )}
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCollaboratorDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showCollaboratorDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">
                      {collaborators.map(collab => (
                        <button
                          key={collab.uid}
                          type="button"
                          onClick={() => {
                            const uids = [...formData.selectedCollaboratorUids];
                            const idx = uids.indexOf(collab.uid || '');
                            if (idx > -1) {
                              uids.splice(idx, 1);
                            } else {
                              uids.push(collab.uid || '');
                            }
                            setFormData({ ...formData, selectedCollaboratorUids: uids });
                          }}
                          className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <img src={collab.avatar} className="w-8 h-8 rounded-full" alt="" />
                            <span className="text-sm font-semibold text-gray-700">{collab.name}</span>
                          </div>
                          {formData.selectedCollaboratorUids.includes(collab.uid || '') && (
                            <Check size={16} className="text-indigo-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Privé</label>
                <Toggle value={formData.isPrivate} onChange={v => setFormData({...formData, isPrivate: v})} />
              </div>
            </div>

            {/* Lieu, Adresse & Visio */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <div className={`grid ${['Adresse différente', 'Téléphonique', 'Sur chantier', 'Chez le client'].includes(formData.location) ? 'grid-cols-2' : 'grid-cols-1'} gap-6 items-end`}>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lieu du rendez-vous</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.location}
                      onChange={e => {
                        const newLoc = e.target.value as any;
                        let newAddress = formData.address;
                        
                        if (newLoc === 'Chez le client' && selectedClient) {
                          newAddress = selectedClient.details?.address || '';
                        } else if (newLoc === 'Magasin') {
                          newAddress = '';
                        } else if (newLoc === 'Visio') {
                          newAddress = '';
                        } else if (newLoc === 'Téléphonique' && selectedClient) {
                          newAddress = selectedClient.details?.phone || '';
                        } else if (newLoc === 'Sur chantier' && selectedClient) {
                          const chantierProp = selectedClient.details?.properties?.find((p: any) => !p.isMain) || selectedClient.details?.properties?.[0];
                          newAddress = chantierProp?.address || selectedClient.details?.address || '';
                        }

                        setFormData({
                          ...formData, 
                          location: newLoc,
                          address: newAddress,
                          createVisio: newLoc === 'Visio' ? true : formData.createVisio
                        });
                      }}
                    >
                      {locationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {formData.location === 'Adresse différente' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Autre adresse</label>
                    <input 
                      type="text" 
                      placeholder="Saisir l'adresse..."
                      className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                )}

                {formData.location === 'Téléphonique' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Numéro de téléphone</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      >
                        <option value={selectedClient?.details?.phone || ''}>
                          Contact principal: {formatPhone(selectedClient?.details?.phone || '') || 'Non renseigné'}
                        </option>
                        {selectedClient?.details?.additionalContacts?.[0]?.phone && (
                          <option value={selectedClient.details.additionalContacts[0].phone}>
                            Contact secondaire: {formatPhone(selectedClient.details.additionalContacts[0].phone)}
                          </option>
                        )}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {formData.location === 'Chez le client' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Adresse principale</label>
                    <input 
                      type="text" 
                      readOnly
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 outline-none cursor-not-allowed"
                      value={selectedClient?.details?.address || 'Aucune adresse renseignée'}
                    />
                  </div>
                )}

                {formData.location === 'Sur chantier' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Adresse du chantier</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      >
                        {selectedClient?.details?.properties && selectedClient.details.properties.length > 0 ? (
                          selectedClient.details.properties.map((p: any) => (
                            <option key={p.id} value={p.address}>{p.address} ({p.usage || 'Bien'})</option>
                          ))
                        ) : (
                          <option value={selectedClient?.details?.address || ''}>{selectedClient?.details?.address || 'Aucune adresse renseignée'}</option>
                        )}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Créer un lien visio</label>
                  <Toggle value={formData.createVisio} onChange={v => setFormData({...formData, createVisio: v})} />
                </div>
                {formData.createVisio && (
                  <div className="flex-1 space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lien de la visio</label>
                    <input 
                      type="text" 
                      placeholder="https://zoom.us/j/..."
                      className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.streetViewLink}
                      onChange={e => setFormData({...formData, streetViewLink: e.target.value})}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Commentaire */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Commentaire de l'événement</label>
              <textarea 
                rows={3}
                placeholder="Saisir un commentaire..."
                className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all resize-none"
                value={formData.comment}
                onChange={e => setFormData({...formData, comment: e.target.value})}
              />
            </div>
          </div>

          <div className="p-6 flex justify-center gap-4">
            {isEdit && (
              <button 
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <Trash2 size={18} />
                Supprimer
              </button>
            )}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="flex items-center gap-2 px-10 py-3 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isEdit ? 'Enregistrer les modifications' : 'Créer le rdv'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAppointmentModal;
