
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
  ChevronDown
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from '@firebase/firestore';
import { Appointment } from '../types';
import AddAppointmentModal from './AddAppointmentModal';

interface ClientAppointmentsProps {
  clientId: string;
  clientName: string;
  userProfile: any;
}

const ClientAppointments: React.FC<ClientAppointmentsProps> = ({ clientId, clientName, userProfile }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const q = query(collection(db, 'appointments'), where('clientId', '==', clientId));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
      // Tri par date et heure
      data.sort((a, b) => {
        const dateA = new Date(`${a.date.split('/').reverse().join('-')}T${a.startTime}`);
        const dateB = new Date(`${b.date.split('/').reverse().join('-')}T${b.startTime}`);
        return dateB.getTime() - dateA.getTime();
      });
      setAppointments(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, [clientId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce rendez-vous ?")) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (e) { console.error(e); }
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
    <div className="flex flex-col h-full animate-in fade-in duration-300 pt-6">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="space-y-1">
          <h2 className="text-[16px] font-bold text-gray-800">
            Historique des rendez-vous <span className="text-gray-300 font-normal ml-1">({appointments.length})</span>
          </h2>
          <p className="text-[11px] text-gray-400 font-medium italic">Planification des rencontres showroom et chantiers.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
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
                <th className="px-6 pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="bg-white border border-dashed border-gray-200 rounded-[24px] py-16 space-y-3">
                       <Calendar size={40} className="mx-auto text-gray-100" />
                       <p className="text-[13px] font-bold text-gray-300 italic">Aucun rendez-vous planifié pour le moment.</p>
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
                          {rdv.projectName && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">{rdv.projectName}</span>}
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
                       <div className="relative inline-block">
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === rdv.id ? null : rdv.id)}
                            className={`p-2 rounded-lg transition-all ${activeMenuId === rdv.id ? 'bg-gray-100 text-gray-900' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-600'}`}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenuId === rdv.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                              <div className={`absolute right-0 ${index >= appointments.length - 2 && appointments.length > 2 ? 'bottom-full mb-2' : 'mt-2'} bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 w-48 animate-in fade-in zoom-in-95 duration-150`}>
                                <button className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                  <PenSquare size={14} className="text-gray-400" /> Modifier
                                </button>
                                <div className="h-px bg-gray-50 my-1 mx-2" />
                                <button 
                                  onClick={() => handleDelete(rdv.id)}
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

      <AddAppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userProfile={userProfile}
        clientId={clientId}
        clientName={clientName}
      />
    </div>
  );
};

export default ClientAppointments;
