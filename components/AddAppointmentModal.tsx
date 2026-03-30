
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Loader2, Check, ChevronDown, ChevronLeft, ChevronRight, Save, Plus, Search, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch, setDoc } from 'firebase/firestore';
import { Appointment, User } from '../types';
import { formatPhone, formatFullNameFirstLast, normalizeString } from '../utils';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths, addYears, isBefore, parse, format, parseISO } from 'date-fns';

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
  const lastSubmitTime = useRef<number>(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [showCollaboratorDropdown, setShowCollaboratorDropdown] = useState(false);

  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientLinked, setIsClientLinked] = useState(true);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);

  const [formData, setFormData] = useState<any>({
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
    recurrenceType: 'Toutes les semaines' as 'Tous les jours' | 'Toutes les semaines' | 'Tous les mois' | 'Tous les ans',
    recurrenceEndDate: '',
    isPrivate: false,
    createVisio: false,
    comment: '',
    streetViewLink: ''
  });

  const typeOptions = ['R1', 'R2', 'Métré', 'Pose', 'SAV', 'Autre'];
  const locationOptions = ['Magasin', 'Chez le client', 'Sur chantier', 'Adresse différente', 'Téléphonique', 'Visio'];

  const [contacts, setContacts] = useState<any[]>([]);

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
          recurrenceType: (appointmentToEdit as any).recurrenceType || 'Toutes les semaines',
          recurrenceEndDate: (appointmentToEdit as any).recurrenceEndDate || '',
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
          recurrenceType: 'Toutes les semaines',
          recurrenceEndDate: '',
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
    const fetchContactsAndCollaborators = async () => {
      try {
        const companyId = userProfile.companyId;
        
        // Fetch all contacts from the 'clients' collection (which contains all 4 directories)
        const q = query(collection(db, 'clients'), where('companyId', '==', companyId));
        const snap = await getDocs(q);

        const allContacts = snap.docs.map(doc => {
          const data = doc.data();
          let contactType = 'Client';
          if (data.directoryType === 'suppliers') contactType = 'Fournisseur';
          else if (data.directoryType === 'artisans') contactType = 'Artisan';
          else if (data.directoryType === 'prescribers') contactType = 'Prescripteur';
          
          return { id: doc.id, ...data, contactType };
        });
        
        setContacts(allContacts);

        const collabsQ = query(collection(db, 'users'), where('companyId', '==', companyId));
        const collabsSnap = await getDocs(collabsQ);
        setCollaborators(collabsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));

        const appointmentsQ = query(collection(db, 'appointments'), where('companyId', '==', companyId));
        const appointmentsSnap = await getDocs(appointmentsQ);
        setAllAppointments(appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      } catch (error) {
        console.error("Error fetching contacts/collaborators:", error);
      }
    };
    fetchContactsAndCollaborators();
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

  const filteredContacts = useMemo(() => {
    if (!clientSearch) return contacts;
    const search = normalizeString(clientSearch);
    return contacts.filter(c => normalizeString(c.name || '').includes(search));
  }, [contacts, clientSearch]);

  const selectedContact = useMemo(() => {
    const cid = clientId || formData.selectedClientId;
    return contacts.find(c => c.id === cid);
  }, [contacts, clientId, formData.selectedClientId]);

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
    if (!selectedContact) return;

    if (formData.location === 'Chez le client') {
      setFormData(prev => ({ ...prev, address: selectedContact.details?.address || '' }));
    } else if (formData.location === 'Téléphonique') {
      setFormData(prev => ({ ...prev, address: selectedContact.details?.phone || '' }));
    } else if (formData.location === 'Sur chantier') {
      const chantierProp = selectedContact.details?.properties?.find((p: any) => !p.isMain) || selectedContact.details?.properties?.[0];
      setFormData(prev => ({ ...prev, address: chantierProp?.address || selectedContact.details?.address || '' }));
    }
  }, [selectedContact, formData.location]);

  const generateRecurrences = async (baseAppointment: any, recurrenceType: string, startDateStr: string, recurrenceEndDateStr?: string) => {
    const appointmentsRef = collection(db, 'appointments');
    const startDate = parseISO(startDateStr);
    
    let endDate: Date;
    if (recurrenceEndDateStr) {
      endDate = parseISO(recurrenceEndDateStr);
    } else {
      // Par défaut 3 mois
      endDate = addMonths(startDate, 3);
    }

    let currentDate = startDate;
    let batch = writeBatch(db);
    let countInBatch = 0;
    let totalCount = 0;

    console.log(`Génération des récurrences pour ${baseAppointment.title} à partir du ${startDateStr} jusqu'au ${recurrenceEndDateStr || '3 mois'}`);

    while (true) {
      if (recurrenceType === 'Tous les jours') currentDate = addDays(currentDate, 1);
      else if (recurrenceType === 'Toutes les semaines') currentDate = addWeeks(currentDate, 1);
      else if (recurrenceType === 'Tous les mois') currentDate = addMonths(currentDate, 1);
      else if (recurrenceType === 'Tous les ans') currentDate = addYears(currentDate, 1);
      else break;

      if (isBefore(endDate, currentDate)) break;

      const newDateStr = format(currentDate, 'dd/MM/yyyy');
      const newAppRef = doc(appointmentsRef);
      
      const { id, ...dataWithoutId } = baseAppointment;
      
      batch.set(newAppRef, {
        ...dataWithoutId,
        date: newDateStr,
        createdAt: new Date().toISOString(),
        parentId: id || null,
        isRecurringInstance: true
      });
      
      countInBatch++;
      totalCount++;
      if (countInBatch >= 450) {
         await batch.commit();
         batch = writeBatch(db);
         countInBatch = 0;
      }
    }

    if (countInBatch > 0) {
      await batch.commit();
    }
    console.log(`Génération de ${totalCount} occurrences terminée.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    if (isLoading || (now - lastSubmitTime.current < 2000)) {
      console.warn("Submit blocked: already loading or too soon since last click.");
      return;
    }
    lastSubmitTime.current = now;
    
    console.log('DEBUG: Submitting appointment form...', formData);
    
    setIsLoading(true);

    // Timeout de secours
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      toast.error("Le serveur met trop de temps à répondre, veuillez vérifier votre connexion.");
    }, 10000);

    try {
      // Basic validations
      if (!formData.title) {
        toast.error("Veuillez saisir un titre pour le rendez-vous.");
        setIsLoading(false);
        return;
      }
      if (!formData.date) {
        toast.error("Veuillez sélectionner une date.");
        setIsLoading(false);
        return;
      }
      if (isClientLinked && !clientId && !formData.selectedClientId) {
        toast.error("Veuillez sélectionner un contact.");
        setIsLoading(false);
        return;
      }
      if (formData.selectedCollaboratorUids.length === 0) {
        toast.error("Veuillez sélectionner au moins un collaborateur.");
        setIsLoading(false);
        return;
      }
      if (!userProfile?.companyId) {
        toast.error("Erreur: ID de l'entreprise manquant.");
        setIsLoading(false);
        return;
      }

      const selectedCollaborators = collaborators.filter(c => formData.selectedCollaboratorUids.includes(c.uid || ''));
      const selectedProject = projects.find(p => p.id === formData.projectId);
      
      // Format date to DD/MM/YYYY for the 'date' field
      const [y, m, d] = formData.date.split('-');
      const rdvDate = `${d}/${m}/${y}`;

      const finalClientId = isClientLinked ? (clientId || formData.selectedClientId) : null;
      const finalClientName = isClientLinked ? formatFullNameFirstLast(clientSearch || clientName || 'Contact divers') : 'Contact divers';

      // Sanitize data for Firestore (no undefined values)
      const appointmentData: any = {
        clientId: finalClientId || null,
        clientName: finalClientName || 'Contact divers',
        contactType: selectedContact?.contactType || null,
        projectId: formData.projectId || null,
        projectName: selectedProject?.projectName || null,
        title: formData.title || '',
        type: formData.type || 'Autre',
        date: rdvDate,
        endDate: formData.endDate || formData.date,
        startTime: formData.startTime || '09:00',
        endTime: formData.endTime || '10:00',
        location: formData.location || 'Autre',
        address: formData.address || '',
        isRecurring: formData.isRecurring || false,
        recurrenceType: formData.isRecurring ? formData.recurrenceType : null,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : null,
        isPrivate: formData.isPrivate || false,
        createVisio: formData.createVisio || false,
        comment: formData.comment || '',
        streetViewLink: formData.streetViewLink || '',
        status: isEdit ? (appointmentToEdit?.status || 'confirmé') : 'confirmé',
        collaborators: selectedCollaborators.map(c => ({
          uid: c.uid || '',
          name: c.name || '',
          avatar: c.avatar || '',
          agendaColor: (c as any).agendaColor || '#6366f1'
        })),
        collaboratorUids: formData.selectedCollaboratorUids.filter(Boolean),
        companyId: userProfile.companyId,
      };

      console.log('DEBUG: Final appointment data to save:', JSON.stringify(appointmentData, null, 2));
      
      let docId = '';
      if (isEdit && appointmentToEdit) {
        docId = appointmentToEdit.id;
        const appRef = doc(db, 'appointments', docId);
        await updateDoc(appRef, appointmentData);
        toast.success('Rendez-vous mis à jour avec succès');
      } else {
        const appointmentsRef = collection(db, 'appointments');
        const newDocRef = doc(appointmentsRef);
        docId = newDocRef.id;
        
        await setDoc(newDocRef, {
          ...appointmentData,
          createdAt: new Date().toISOString()
        });
        toast.success('Rendez-vous créé avec succès');
      }

      // Logique de récurrence en arrière-plan
      if (formData.isRecurring && formData.recurrenceType) {
        const recType = formData.recurrenceType;
        const recEndDate = formData.recurrenceEndDate;
        const startDate = formData.date;
        
        console.log("Lancement de la génération des récurrences...");
        setTimeout(() => {
          generateRecurrences({ ...appointmentData, id: docId }, recType, startDate, recEndDate)
            .catch(err => console.error("Erreur génération récurrences:", err));
        }, 500);
      }
    } catch (error: any) {
      console.error('CRITICAL ERROR in handleSubmit:', error);
      // Detailed error logging for debugging
      if (error.code) console.error('Error Code:', error.code);
      if (error.message) console.error('Error Message:', error.message);
      
      toast.error(`Erreur d'enregistrement : ${error.message || 'Erreur inconnue'}`);
      
      // Even on error, we might want to close if the user requested it, 
      // but usually we keep it open so they can fix. 
      // However, if it's a blocking bug, closing it might be better than hanging.
      // For now, we just stop loading.
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      onClose();
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecurringDeleteOptions, setShowRecurringDeleteOptions] = useState(false);

  const handleDeleteOccurrence = async () => {
    if (!appointmentToEdit) return;
    
    setIsLoading(true);
    try {
      // Fermeture immédiate
      onClose();
      setShowDeleteConfirm(false);
      setShowRecurringDeleteOptions(false);
      setIsLoading(false);

      await deleteDoc(doc(db, 'appointments', appointmentToEdit.id));
      toast.success('Rendez-vous supprimé avec succès');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error("Une erreur est survenue lors de la suppression.");
      setIsLoading(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!appointmentToEdit) return;
    const seriesId = appointmentToEdit.parentId || appointmentToEdit.id;
    
    setIsLoading(true);
    try {
      // Fermeture immédiate
      onClose();
      setShowRecurringDeleteOptions(false);
      setIsLoading(false);

      // On récupère tous les documents qui ont ce parentId
      const q = query(collection(db, 'appointments'), where('parentId', '==', seriesId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      
      // On supprime le document parent lui-même
      batch.delete(doc(db, 'appointments', seriesId));
      
      // On supprime toutes les occurrences liées
      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      toast.success('Toute la série a été supprimée');
    } catch (error) {
      console.error('Error deleting series:', error);
      toast.error("Erreur lors de la suppression de la série");
      setIsLoading(false);
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
                {isEdit ? 'Modifier le rendez-vous' : 'Ajouter un rendez-vous'} - {formatFullNameFirstLast(appointmentToEdit?.clientName || clientName || 'Nouveau Client')}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-gray-400 border border-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Sélection du Contact */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Contact lié ?*
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
                    Rechercher le contact* {isEdit && !formData.selectedClientId && <span className="text-red-500">(Non lié)</span>}
                    {(clientId || isEdit) && <span className="ml-1 text-[9px] text-gray-300 italic">(Verrouillé)</span>}
                  </label>
                  <div className="relative group">
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                      <input 
                        type="text"
                        disabled={!!clientId || isEdit}
                        placeholder="Rechercher un contact (Client, Artisan...)"
                        className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium text-gray-800 outline-none focus:border-gray-400 transition-all disabled:bg-gray-50 disabled:text-gray-400 shadow-sm placeholder:text-gray-400"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                          if (!e.target.value) setFormData(prev => ({ ...prev, selectedClientId: '' }));
                        }}
                        onFocus={() => !clientId && !isEdit && setShowClientDropdown(true)}
                      />
                    </div>
                    
                    {showClientDropdown && !clientId && !isEdit && filteredContacts.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] max-h-48 overflow-y-auto p-1 animate-in fade-in slide-in-from-top-1">
                        {filteredContacts.map(c => (
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
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                {c.name}
                                <span className="text-[10px] font-bold text-gray-400 lowercase italic">
                                  ({c.contactType})
                                </span>
                              </span>
                            </div>
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
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rendez-vous récurrent</label>
                <Toggle value={formData.isRecurring} onChange={v => setFormData({...formData, isRecurring: v})} />
              </div>
              
              {formData.isRecurring && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-wrap gap-2">
                    {['Tous les jours', 'Toutes les semaines', 'Tous les mois', 'Tous les ans'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, recurrenceType: type as any })}
                        className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all border ${
                          formData.recurrenceType === type 
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date de fin de récurrence (Optionnel)</label>
                    <input 
                      type="date"
                      className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-400 transition-all"
                      value={formData.recurrenceEndDate}
                      onChange={e => setFormData({...formData, recurrenceEndDate: e.target.value})}
                    />
                    <p className="text-[10px] text-gray-400 italic">Par défaut, les occurrences sont générées sur les 3 prochains mois.</p>
                  </div>
                </div>
              )}
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
                        
                        if (newLoc === 'Chez le client' && selectedContact) {
                          newAddress = selectedContact.details?.address || '';
                        } else if (newLoc === 'Magasin') {
                          newAddress = '';
                        } else if (newLoc === 'Visio') {
                          newAddress = '';
                        } else if (newLoc === 'Téléphonique' && selectedContact) {
                          newAddress = selectedContact.details?.phone || '';
                        } else if (newLoc === 'Sur chantier' && selectedContact) {
                          const chantierProp = selectedContact.details?.properties?.find((p: any) => !p.isMain) || selectedContact.details?.properties?.[0];
                          newAddress = chantierProp?.address || selectedContact.details?.address || '';
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
                        <option value={selectedContact?.details?.phone || ''}>
                          Contact principal: {formatPhone(selectedContact?.details?.phone || '') || 'Non renseigné'}
                        </option>
                        {selectedContact?.details?.additionalContacts?.[0]?.phone && (
                          <option value={selectedContact.details.additionalContacts[0].phone}>
                            Contact secondaire: {formatPhone(selectedContact.details.additionalContacts[0].phone)}
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
                      value={selectedContact?.details?.address || 'Aucune adresse renseignée'}
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
                        {selectedContact?.details?.properties && selectedContact.details.properties.length > 0 ? (
                          selectedContact.details.properties.map((p: any) => (
                            <option key={p.id} value={p.address}>{p.address} ({p.usage || 'Bien'})</option>
                          ))
                        ) : (
                          <option value={selectedContact?.details?.address || ''}>{selectedContact?.details?.address || 'Aucune adresse renseignée'}</option>
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
                onClick={() => {
                  if (appointmentToEdit?.isRecurring || appointmentToEdit?.isRecurringInstance) {
                    setShowRecurringDeleteOptions(true);
                  } else {
                    setShowDeleteConfirm(true);
                  }
                }}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <Trash2 size={18} className="text-red-500" />
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

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer le rendez-vous ?</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Voulez-vous vraiment supprimer ce rendez-vous ? Cette action est irréversible.
                </p>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOccurrence}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de choix pour suppression récurrente */}
        {showRecurringDeleteOptions && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer la récurrence ?</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Ce rendez-vous fait partie d'une série récurrente. Que souhaitez-vous supprimer ?
                </p>
              </div>
              <div className="p-6 bg-gray-50 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleDeleteOccurrence}
                  className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  Supprimer uniquement ce rendez-vous
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSeries}
                  className="w-full px-6 py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  Supprimer toute la série
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecurringDeleteOptions(false)}
                  className="w-full px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddAppointmentModal;
