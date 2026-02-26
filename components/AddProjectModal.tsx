import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Briefcase, Check, Loader2, ChevronDown, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, increment, getDocs, getDoc } from '@firebase/firestore';

const HIERARCHY_DATA: Record<string, Record<string, string[]>> = {
  "Prospection": {
    "terrain": ["voisin", "porte-à porte", "Tour de chantier"],
    "téléphonique": ["Appel froid"]
  },
  "Parrainage": {
    "Spontanné": [],
    "Bon de parrainage": []
  },
  "Prescripteur": {
    "Architecte": [],
    "Artisan": [],
    "Courtier": [],
    "Décorateur": [],
    "Boutiques voisines": [],
    "Fournisseur": []
  },
  "Anciens clients": {
    "Général": []
  },
  "Notoriété entreprise": {
    "Général": []
  },
  "Digital": {
    "Réseaux sociaux": ["Facebook", "Instagram", "Linkedin", "Tik-tok", "YouTube", "Pinterest"],
    "Pub digitales": ["Google Ads", "Facebook Ads", "Instagram Ads"],
    "Web": ["Recherche Google", "Google maps", "Waze", "Avis Google", "Avis en lignes divers", "Pages jaunes", "Forum"],
    "IA": ["ChatGPT", "Gemini", "Claude", "Mistral"],
    "Site web entreprise": ["Formulaire contact", "Prise de rdv en ligne", "Chatbot"]
  },
  "Marketing": {
    "Emailing": ["Newsletter", "Email promo"],
    "SMS marketing": [],
    "Affichage": ["4x3", "Abribus", "Panneau chantier", "Véhicule floqué"],
    "Magazine": [],
    "Journal gratuit": [],
    "Publication pro": [],
    "Radio": [],
    "Pages jaunes": [],
    "Evenementiel": ["Salon", "Foire", "Galerie commerciale"],
    "Evènements showroom": ["Portes ouvertes", "Innauguration", "Anniversaire", "Démo culinaires", "Autres"]
  },
  "Réseaux pro": {
    "BNI": [],
    "Club entrepreneurs": ["Club 1", "Club 2", "Club 3", "Club 4"],
    "Groupements métiers": []
  },
  "Passage devant showroom": {
    "Spontanné": [],
    "Promo vitrine": [],
    "PLV": []
  },
  "Cercle proche": {
    "Famille": [],
    "Amis": []
  },
  "Autres": {
    "Autre": []
  }
};

const METIERS_OPTIONS = [
  "Cuisine",
  "Cuisine extérieure",
  "Salle de bain",
  "Mobilier",
  "Dressing",
  "Bureau",
  "Cave à vin",
  "Home",
  "Carrelage",
  "Menuiserie",
  "Autre"
];

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  clientId?: string;
  clientName?: string;
  projectToEdit?: any;
  initialData?: {
    categorie: string;
    origine: string;
    sousOrigine: string;
  };
  onProjectCreated?: (projectId: string) => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  clientId, 
  clientName, 
  projectToEdit,
  initialData,
  onProjectCreated 
}) => {
  const isEdit = !!projectToEdit;
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  
  const [clients, setClients] = useState<any[]>([]);
  const [agenceurs, setAgenceurs] = useState<any[]>([]);
  const [clientAddresses, setClientAddresses] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    categorie: initialData?.categorie || '',
    origine: initialData?.origine || '',
    sousOrigine: initialData?.sousOrigine || '',
    projectName: "",
    agenceurReferent: userProfile?.name || '',
    agenceurAvatar: userProfile?.avatar || '',
    agenceurUid: userProfile?.uid || '',
    adresseChantier: '',
    metier: 'Cuisine',
    selectedClientId: clientId || ''
  });

  // Fetch client origin data when selectedClientId changes
  useEffect(() => {
    const cid = clientId || formData.selectedClientId;
    if (isOpen && cid && !isEdit) {
      const fetchOriginInfo = async () => {
        const clientSnap = await getDoc(doc(db, 'clients', cid));
        if (clientSnap.exists()) {
          const data = clientSnap.data();
          setFormData(prev => ({
            ...prev,
            categorie: data.details?.category || '',
            origine: data.origin || '',
            sousOrigine: data.details?.subOrigin || ''
          }));
        }
      };
      fetchOriginInfo();
    }
  }, [isOpen, clientId, formData.selectedClientId, isEdit]);

  // Mise à jour si les initialData ou projectToEdit changent
  useEffect(() => {
    if (isOpen) {
      setShowSuccessPopup(false);
      if (projectToEdit) {
        setFormData({
          categorie: projectToEdit.categorie || '',
          origine: projectToEdit.origine || '',
          sousOrigine: projectToEdit.sousOrigine || '',
          projectName: projectToEdit.projectName || '',
          agenceurReferent: projectToEdit.agenceur?.name || '',
          agenceurAvatar: projectToEdit.agenceur?.avatar || '',
          agenceurUid: projectToEdit.agenceur?.uid || '',
          adresseChantier: projectToEdit.details?.adresseChantier || '',
          metier: projectToEdit.metier || 'Cuisine',
          selectedClientId: projectToEdit.clientId || ''
        });
      } else if (initialData) {
        setFormData(prev => ({
          ...prev,
          categorie: initialData.categorie,
          origine: initialData.origine,
          sousOrigine: initialData.sousOrigine,
          projectName: "", 
          selectedClientId: clientId || prev.selectedClientId
        }));
      }
    }
  }, [isOpen, initialData, clientId, projectToEdit]);

  // Chargement des Agenceurs
  useEffect(() => {
    if (!isOpen || !userProfile?.companyId) return;

    const usersQ = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
    const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
      let fetched: any[] = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      
      if (userProfile && !fetched.find(u => u.uid === userProfile.uid)) {
        fetched = [{ 
          uid: userProfile.uid, 
          name: userProfile.name, 
          avatar: userProfile.avatar 
        }, ...fetched];
      }
      
      setAgenceurs(fetched);
      
      if (!isEdit && !formData.agenceurUid && userProfile) {
        setFormData(prev => ({
          ...prev,
          agenceurReferent: userProfile.name,
          agenceurAvatar: userProfile.avatar,
          agenceurUid: userProfile.uid
        }));
      }
    });

    return () => unsubscribeUsers();
  }, [isOpen, userProfile?.companyId, isEdit]);

  // Chargement des Adresses
  useEffect(() => {
    const cid = clientId || formData.selectedClientId;
    if (!isOpen || !cid) return;

    const unsubClient = onSnapshot(doc(db, 'clients', cid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const addresses: string[] = [];
        if (data.details?.address) addresses.push(data.details.address);
        if (data.details?.properties && Array.isArray(data.details.properties)) {
          data.details.properties.forEach((p: any) => {
            if (p.address && !addresses.includes(p.address)) addresses.push(p.address);
          });
        }
        setClientAddresses(addresses);
        if (!isEdit && addresses.length > 0 && !formData.adresseChantier) {
          setFormData(prev => ({ ...prev, adresseChantier: addresses[0] }));
        }
      }
    });
    return () => unsubClient();
  }, [isOpen, clientId, formData.selectedClientId, isEdit]);

  useEffect(() => {
    if (!isOpen || !userProfile?.companyId) return;
    const clientsQ = query(collection(db, 'clients'), where('companyId', '==', userProfile.companyId));
    const unsubscribeClients = onSnapshot(clientsQ, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeClients();
  }, [isOpen, userProfile?.companyId]);

  const categories = useMemo(() => Object.keys(HIERARCHY_DATA), []);
  const origines = useMemo(() => formData.categorie ? Object.keys(HIERARCHY_DATA[formData.categorie] || {}) : [], [formData.categorie]);
  const sousOrigines = useMemo(() => (formData.categorie && formData.origine) ? (HIERARCHY_DATA[formData.categorie]?.[formData.origine] || []) : [], [formData.categorie, formData.origine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.companyId || !formData.categorie || !formData.origine || !formData.projectName) return;
    setIsLoading(true);
    try {
      const finalClientId = clientId || formData.selectedClientId;
      const finalClientName = clientName || clients.find(c => c.id === formData.selectedClientId)?.name || 'Client Inconnu';
      
      const payload: any = {
        projectName: formData.projectName,
        clientName: finalClientName,
        clientId: finalClientId,
        companyId: userProfile.companyId,
        metier: formData.metier,
        categorie: formData.categorie,
        origine: formData.origine,
        sousOrigine: formData.sousOrigine,
        agenceur: {
          uid: formData.agenceurUid,
          name: formData.agenceurReferent,
          avatar: formData.agenceurAvatar
        },
        "details.adresseChantier": formData.adresseChantier
      };

      if (isEdit && projectToEdit) {
        await updateDoc(doc(db, 'projects', projectToEdit.id), payload);
        onClose();
      } else {
        const projectRef = await addDoc(collection(db, 'projects'), {
          ...payload,
          details: { adresseChantier: formData.adresseChantier },
          addedDate: new Date().toLocaleDateString('fr-FR'),
          progress: 2,
          status: 'Étude client',
          statusColor: 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
          createdAt: new Date().toISOString()
        });

        // 1. Incrémenter le compteur de projets sur la fiche client et passer en Prospect si c'était un Lead
        const clientRef = doc(db, 'clients', finalClientId);
        const clientSnap = await getDoc(clientRef);
        const clientUpdates: any = { projectCount: increment(1) };
        
        if (clientSnap.exists() && clientSnap.data()?.status === 'Leads') {
          clientUpdates.status = 'Prospect';
        }
        
        await updateDoc(clientRef, clientUpdates);

        // 2. CLÔTURE AUTOMATIQUE DE LA TÂCHE LEAD
        const tasksQ = query(
          collection(db, 'tasks'), 
          where('clientId', '==', finalClientId)
        );
        const tasksSnap = await getDocs(tasksQ);
        const updatePromises = tasksSnap.docs
          .filter(tDoc => {
            const data = tDoc.data();
            return data.type === 'Tâche auto' && data.status !== 'completed';
          })
          .map(tDoc => 
            updateDoc(doc(db, 'tasks', tDoc.id), { status: 'completed' })
          );
        await Promise.all(updatePromises);

        setCreatedProjectId(projectRef.id);
        setShowSuccessPopup(true);
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    if (onProjectCreated && createdProjectId) {
      onProjectCreated(createdProjectId);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[950px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative">
        
        {/* POPUP DE SUCCÈS OVERLAY */}
        {showSuccessPopup && (
          <div className="absolute inset-0 z-[110] bg-white/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
            <div className="max-w-md w-full p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-green-50 rounded-[32px] flex items-center justify-center text-green-500 mx-auto shadow-inner ring-8 ring-green-50/50">
                <CheckCircle2 size={52} className="animate-in slide-in-from-bottom-2" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Projet créé avec succès !</h3>
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  <p className="text-[13px] text-indigo-700 font-bold leading-relaxed">
                    La <span className="text-indigo-900">tâche automatique lead</span> a été marquée comme <span className="text-indigo-900">terminée</span> et archivée.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gray-900 text-white rounded-2xl text-[14px] font-black shadow-xl hover:bg-black transition-all hover:scale-[1.02] active:scale-95 group"
              >
                <span>Continuer vers le projet</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 border border-gray-200 rounded-xl text-gray-800 bg-white shadow-sm"><Briefcase size={20} /></div>
              <div>
                <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">
                  {isEdit ? "Modifier la fiche projet" : "Créer une fiche projet"}
                </h2>
                {!clientId && !isEdit && (
                   <div className="mt-2 flex items-center gap-3">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Choisir client</label>
                    <div className="relative">
                      <select 
                        value={formData.selectedClientId}
                        onChange={(e) => setFormData({...formData, selectedClientId: e.target.value})}
                        className="appearance-none bg-white border border-gray-100 rounded-lg px-3 py-1 text-[11px] font-bold text-gray-900 pr-8 shadow-sm outline-none focus:border-indigo-400"
                      >
                        <option value="">Séléctionner...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                   </div>
                )}
                {(clientId || isEdit) && (
                  <p className="text-[11px] text-gray-400 font-medium">Pour le client : <span className="text-gray-900 font-bold uppercase">{clientName || formData.projectName}</span></p>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 border border-gray-200 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-900 shadow-sm"><X size={20} /></button>
          </div>
          <div className="p-8 space-y-8 bg-white overflow-y-auto max-h-[75vh] hide-scrollbar">
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-1">Origine du projet</h3>
              <div className="bg-[#FBFBFB] border border-gray-100 rounded-2xl p-6 grid grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Origine</label>
                  <div className="relative">
                    <select value={formData.categorie} onChange={(e) => setFormData({...formData, categorie: e.target.value, origine: '', sousOrigine: ''})} className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-[13px] text-gray-900 outline-none focus:border-gray-900 transition-all font-bold shadow-sm">
                      <option value="">Sélectionner</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sous-origine</label>
                  <div className="relative">
                    <select value={formData.origine} onChange={(e) => setFormData({...formData, origine: e.target.value, sousOrigine: ''})} className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-[13px] text-gray-900 outline-none focus:border-gray-900 transition-all font-bold shadow-sm">
                      <option value="">Sélectionner</option>
                      {origines.map(orig => <option key={orig} value={orig}>{orig}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sources</label>
                  <div className="relative">
                    <select value={formData.sousOrigine} onChange={(e) => setFormData({...formData, sousOrigine: e.target.value})} className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-[13px] text-gray-900 outline-none focus:border-gray-900 transition-all font-bold shadow-sm">
                      <option value="">Sélectionner</option>
                      {sousOrigines.map(so => <option key={so} value={so}>{so}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#FBFBFB] border border-gray-100 rounded-2xl p-6 grid grid-cols-12 gap-6">
              <div className="col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Titre du projet*</label>
                <input required type="text" value={formData.projectName} onChange={(e) => setFormData({...formData, projectName: e.target.value})} placeholder="Ex: Pose d'une cuisine" className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-gray-900 transition-all font-bold shadow-sm" />
              </div>
              <div className="col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Agenceur référent</label>
                <div className="relative">
                  <select value={formData.agenceurReferent} onChange={(e) => {
                    const found = agenceurs.find(a => a.name === e.target.value);
                    setFormData({...formData, agenceurReferent: e.target.value, agenceurUid: found?.uid || '', agenceurAvatar: found?.avatar || ''});
                  }} className="w-full appearance-none bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-[14px] text-gray-900 outline-none focus:border-gray-900 transition-all font-bold shadow-sm">
                    {agenceurs.map(a => <option key={a.uid} value={a.name}>{a.name}</option>)}
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <img src={formData.agenceurAvatar || 'https://i.pravatar.cc/150?u=fallback'} className="w-6 h-6 rounded-full border border-white shadow-sm" alt="" />
                  </div>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                </div>
              </div>
              <div className="col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lieu du chantier</label>
                <div className="relative">
                  <select value={formData.adresseChantier} onChange={(e) => setFormData({...formData, adresseChantier: e.target.value})} className="w-full appearance-none bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-[14px] text-gray-900 outline-none focus:border-gray-900 transition-all font-bold shadow-sm">
                    {clientAddresses.length > 0 ? clientAddresses.map(addr => <option key={addr} value={addr}>{addr}</option>) : <option value="">Aucune adresse renseignée</option>}
                  </select>
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="bg-[#FBFBFB] border border-gray-100 rounded-2xl p-6 space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Métier concerné par l'étude*</label>
              <div className="relative">
                <select 
                  value={formData.metier} 
                  onChange={(e) => setFormData({...formData, metier: e.target.value})} 
                  className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-5 py-4 text-[14px] text-gray-900 outline-none focus:border-gray-900 transition-all font-bold shadow-sm"
                >
                  {METIERS_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="px-8 py-8 flex gap-4 bg-[#FBFBFB] border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-white border border-gray-200 rounded-2xl text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">Abandonner</button>
            <button type="submit" disabled={isLoading || !formData.categorie || !formData.origine || (clientAddresses.length === 0 && !isEdit) || !formData.projectName} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-[#1A1C23] text-white rounded-2xl text-[14px] font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50">
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />} 
              {isEdit ? "Mettre à jour le projet" : "Créer la fiche projet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;