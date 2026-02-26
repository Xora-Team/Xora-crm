
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  MoreVertical, 
  MapPin, 
  Clock, 
  Video, 
  Loader2, 
  Trash2, 
  PenSquare,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from '@firebase/firestore';
import { Appointment } from '../types';
import AddAppointmentModal from './AddAppointmentModal';

interface ProjectAppointmentsProps {
  projectId: string;
  clientId: string;
  projectName: string;
  clientName: string;
  userProfile: any;
}

const ProjectAppointments: React.FC<ProjectAppointmentsProps> = ({ 
  projectId, 
  clientId, 
  projectName, 
  clientName, 
  userProfile 
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!projectId || !userProfile?.companyId) return;
    
    const q = query(
      collection(db, 'appointments'), 
      where('projectId', '==', projectId),
      where('companyId', '==', userProfile.companyId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
      data.sort((a, b) => {
        const dateA = new Date(`${a.date.split('/').reverse().join('-')}T${a.startTime}`);
        const dateB = new Date(`${b.date.split('/').reverse().join('-')}T${b.startTime}`);
        return dateB.getTime() - dateA.getTime();
      });
      setAppointments(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erreur ProjectAppointments permissions:", error);
    });
    return () => unsub();
  }, [projectId, userProfile?.companyId]);

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'appointments', appointmentToDelete.id));
      setAppointmentToDelete(null);
      setActiveMenuId(null);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (rdv: Appointment) => {
    setAppointmentToEdit(rdv);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAppointmentToEdit(null);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmé': return 'bg-green-100 text-green-700';
      case 'en attente': return 'bg-amber-100 text-amber-700';
      case 'annulé': return 'bg-red-100 text-red-700';
      case 'effectué': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'R1': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'R2': return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
      case 'Métré': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'Pose': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="space-y-1">
          <h2 className="text-[16px] font-bold text-gray-800">
            Agenda du projet <span className="text-gray-300 font-normal ml-1">({appointments.length})</span>
          </h2>
          <p className="text-[11px] text-gray-400 font-medium italic">Rendez-vous programmés pour {projectName}</p>
        </div>
        <button 
          onClick={() => { setAppointmentToEdit(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 shadow-sm hover:border-[#A886D7] transition-all active:scale-95"
        >
          <Plus size={16} className="text-[#A886D7]" />
          Prendre un rendez-vous
        </button>
      </div>

      <div className="bg-[#f8f9fa] border border-gray-100 rounded-[28px] p-6 min-h-[450px] relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-[#A886D7]" size={32} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                <th className="px-6 pb-2">Date & Heure</th>
                <th className="px-6 pb-2 text-center">Type</th>
                <th className="px-6 pb-2">Objet du RDV</th>
                <th className="px-6 pb-2">Lieu</th>
                <th className="px-6 pb-2">Collaborateur</th>
                <th className="px-6 pb-2 text-center">Statut</th>
                <th className="px-6 pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="bg-white border border-dashed border-gray-200 rounded-[24px] py-16 space-y-3">
                       <Calendar size={40} className="mx-auto text-gray-100" />
                       <p className="text-[13px] font-bold text-gray-300 italic">Aucun rendez-vous planifié pour ce projet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((rdv, index) => (
                  <tr key={rdv.id} className="group bg-white hover:bg-gray-50/50 transition-all border border-gray-100">
                    <td className="px-6 py-5 first:rounded-l-2xl border-y border-l border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                           <Clock size={16} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[13px] font-black text-gray-900">{rdv.date}</span>
                           <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{rdv.startTime} - {rdv.endTime}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50 text-center">
                       <span className={`px-3 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${getTypeStyle(rdv.type)}`}>
                         {rdv.type}
                       </span>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50">
                       <div className="flex flex-col">
                          <span className="text-[13.5px] font-bold text-gray-900">{rdv.title}</span>
                       </div>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50">
                       <div className="flex items-center gap-2">
                          {rdv.location === 'Visio' ? <Video size={14} className="text-blue-400" /> : <MapPin size={14} className="text-gray-300" />}
                          <span className="text-[12px] font-bold text-gray-700">{rdv.location}</span>
                       </div>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50">
                       <div className="flex items-center gap-3">
                         <img src={rdv.collaborator.avatar} className="w-7 h-7 rounded-full border border-gray-100 shadow-sm" alt="" />
                         <span className="text-[12px] font-bold text-gray-700">{rdv.collaborator.name}</span>
                       </div>
                    </td>

                    <td className="px-6 py-5 border-y border-gray-50 text-center">
                       <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${getStatusStyle(rdv.status)}`}>
                         {rdv.status}
                       </span>
                    </td>

                    <td className="px-6 py-5 last:rounded-r-2xl border-y border-r border-gray-50 text-right">
                       <div className="flex justify-end gap-2 relative">
                          <button 
                            onClick={() => handleEdit(rdv)}
                            className="p-1.5 border border-gray-200 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all shadow-sm"
                            title="Modifier"
                          >
                            <PenSquare size={16} />
                          </button>
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === rdv.id ? null : rdv.id)}
                            className={`p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 shadow-sm transition-all ${activeMenuId === rdv.id ? 'bg-gray-100 text-gray-900' : ''}`}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenuId === rdv.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                              <div className={`absolute right-0 ${index >= appointments.length - 2 && appointments.length > 2 ? 'bottom-full mb-2' : 'mt-2'} bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-48 animate-in fade-in zoom-in-95 duration-150 text-left`}>
                                <button 
                                  onClick={() => handleEdit(rdv)}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <PenSquare size={14} className="text-gray-400" /> Modifier
                                </button>
                                <div className="h-px bg-gray-50 my-1 mx-2" />
                                <button 
                                  onClick={() => setAppointmentToDelete(rdv)}
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

      {/* Modale de Confirmation de Suppression */}
      {appointmentToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer le RDV ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                Vous allez supprimer le rendez-vous : <br/>
                <span className="font-bold text-gray-900">"{appointmentToDelete.title}"</span>. <br/>
                Cette action libérera le créneau dans votre agenda.
              </p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setAppointmentToDelete(null)} 
                  disabled={isDeleting}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDelete} 
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

      <AddAppointmentModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userProfile={userProfile}
        clientId={clientId}
        clientName={clientName}
        initialProjectId={projectId}
        appointmentToEdit={appointmentToEdit}
      />
    </div>
  );
};

export default ProjectAppointments;
