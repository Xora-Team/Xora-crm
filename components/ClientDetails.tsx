
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  CheckSquare, 
  Phone, 
  Mail, 
  MessageSquare,
  FileText,
  ChevronsRight,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { Client } from '../types';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, onSnapshot, collection, query, where, updateDoc } from '@firebase/firestore';
import ClientTasks from './ClientTasks';
import ClientContactInfo from './ClientContactInfo';
import ClientProjects from './ClientProjects';
import ClientAppointments from './ClientAppointments';
import ClientDocuments from './ClientDocuments';

interface ClientDetailsProps {
  client: Client;
  onBack: () => void;
  userProfile?: any;
  onProjectSelect?: (project: any) => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ client: initialClient, onBack, userProfile, onProjectSelect }) => {
  const [activeTab, setActiveTab] = useState('Information contact');
  const [client, setClient] = useState<Client>(initialClient);
  const [loading, setLoading] = useState(false);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [taskPendingCount, setTaskPendingCount] = useState(0);

  // Synchronisation en temps réel avec Firebase pour la fiche client
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'clients', initialClient.id), (docSnap) => {
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...docSnap.data() } as Client);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [initialClient.id]);

  // Compteur de rendez-vous en temps réel - AJOUT FILTRE COMPANYID POUR PERMISSIONS
  useEffect(() => {
    if (!userProfile?.companyId) return;
    const q = query(
      collection(db, 'appointments'), 
      where('clientId', '==', initialClient.id),
      where('companyId', '==', userProfile.companyId)
    );
    const unsubCount = onSnapshot(q, (snapshot) => {
      setAppointmentCount(snapshot.size);
    });
    return () => unsubCount();
  }, [initialClient.id, userProfile?.companyId]);

  // Compteur de tâches EN COURS en temps réel - AJOUT FILTRE COMPANYID POUR PERMISSIONS
  useEffect(() => {
    if (!userProfile?.companyId) return;
    const q = query(
      collection(db, 'tasks'), 
      where('clientId', '==', initialClient.id),
      where('companyId', '==', userProfile.companyId)
    );
    
    const unsubTasks = onSnapshot(q, (snapshot) => {
      const pendingTasks = snapshot.docs.filter(doc => doc.data().status !== 'completed');
      setTaskPendingCount(pendingTasks.length);
    }, (error) => {
      console.error("Erreur compteur tâches client:", error);
    });
    
    return () => unsubTasks();
  }, [initialClient.id, userProfile?.companyId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, { status: newStatus });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
    }
  };

  const mainTabs = [
    { label: 'Information contact', key: 'Information contact' },
    { label: `Projet (${client.projectCount || 0})`, key: 'Projet' },
    { label: `Tâches (${taskPendingCount})`, key: 'Tâches' },
    { label: `Rendez-vous (${appointmentCount})`, key: 'Rendez-vous' },
    { label: 'Documents', key: 'Documents' }
  ];

  // Récupération du premier contact secondaire pour le header
  const secondaryContact = (client as any).details?.additionalContacts?.[0];

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      <div className="flex-1 flex flex-col h-full overflow-y-auto hide-scrollbar">
        
        {/* Header dynamique */}
        <div className="px-10 py-8 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 shadow-sm hover:bg-gray-50 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-gray-300">Créé le {client.dateAdded}</span>
                
                {/* Sélecteur de statut manuel stylisé en badge */}
                <div className="relative group/status inline-block">
                  <select 
                    value={client.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`appearance-none cursor-pointer pl-3 pr-8 py-1 text-[10px] font-extrabold rounded uppercase tracking-widest border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                      client.status === 'Leads' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 focus:ring-indigo-200' :
                      client.status === 'Prospect' ? 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 focus:ring-fuchsia-200' :
                      'bg-cyan-100 text-cyan-700 border-cyan-200 focus:ring-cyan-200'
                    }`}
                  >
                    <option value="Leads">LEAD</option>
                    <option value="Prospect">PROSPECT</option>
                    <option value="Client">CLIENT</option>
                  </select>
                  <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none w-3 h-3 ${
                    client.status === 'Leads' ? 'text-indigo-400' :
                    client.status === 'Prospect' ? 'text-fuchsia-400' :
                    'text-cyan-400'
                  }`} />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                {/* Contact Principal */}
                <div className="flex gap-12 items-center">
                  <div className="min-w-[180px]">
                    <h1 className="text-[17px] font-bold text-gray-900 leading-tight uppercase">{client.name}</h1>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700 min-w-[140px]">
                    <Phone size={16} className="text-gray-300" /> {(client as any).details?.phone || 'Non renseigné'}
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
                    <Mail size={16} className="text-gray-300" /> {(client as any).details?.email || 'Non renseigné'}
                  </div>
                </div>

                {/* Contact Secondaire (Si existe) */}
                {secondaryContact && (
                  <div className="flex gap-12 items-center animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="min-w-[180px]">
                      <h2 className="text-[17px] font-bold text-gray-900 leading-tight uppercase">
                        {secondaryContact.firstName} {secondaryContact.lastName}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700 min-w-[140px]">
                      <Phone size={16} className="text-gray-300" /> {secondaryContact.phone || '-'}
                    </div>
                    <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
                      <Mail size={16} className="text-gray-300" /> {secondaryContact.email || '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition-all"><MessageSquare size={16} /> Contacter</button>
            <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition-all"><Calendar size={16} /> Planifier un RDV</button>
            <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[12px] font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition-all"><Phone size={16} /> Appeler</button>
            <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[12px] font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition-all"><CheckSquare size={16} /> Ajouter une tâche</button>
          </div>
        </div>

        {/* Onglets */}
        <div className="px-10 flex items-end shrink-0 mt-4 overflow-x-auto hide-scrollbar">
          <div className="flex gap-1">
            {mainTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-8 py-3.5 text-[14px] font-bold transition-all relative whitespace-nowrap ${
                  activeTab === tab.key 
                    ? 'text-gray-900 bg-white border border-b-0 border-gray-100 rounded-t-2xl shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zone de contenu principale */}
        <div className="flex-1 bg-white border-t border-gray-100 px-10 pt-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-gray-300" size={32} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {activeTab === 'Information contact' && (
                <ClientContactInfo client={client} userProfile={userProfile} />
              )}
              {activeTab === 'Projet' && (
                <ClientProjects client={client} userProfile={userProfile} onProjectSelect={onProjectSelect} />
              )}
              {activeTab === 'Tâches' && (
                <ClientTasks clientId={client.id} clientName={client.name} userProfile={userProfile} />
              )}
              {activeTab === 'Rendez-vous' && (
                <ClientAppointments clientId={client.id} clientName={client.name} userProfile={userProfile} />
              )}
              {activeTab === 'Documents' && (
                <ClientDocuments clientId={client.id} userProfile={userProfile} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
