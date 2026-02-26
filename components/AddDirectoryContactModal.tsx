
import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, SquarePen, Plus, Loader2, MapPin } from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from '@firebase/firestore';

interface AddDirectoryContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  companyId: string;
}

const AddDirectoryContactModal: React.FC<AddDirectoryContactModalProps> = ({ isOpen, onClose, clientId, companyId }) => {
  const [search, setSearch] = useState('');
  const [allClients, setAllClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (!isOpen || !companyId) return;

    // Récupérer tous les clients de la société
    const q = query(collection(db, 'clients'), where('companyId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Tri alphabétique par défaut
      docs.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setAllClients(docs);
      setIsLoading(false);
    });
    return () => unsub();
  }, [isOpen, companyId]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Exclure le client actuel de la liste des liens possibles
    const list = allClients.filter(c => c.id !== clientId);
    
    if (!q) return list; // On retourne toute la liste si pas de recherche
    
    return list.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.details?.email || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q)
    );
  }, [search, allClients, clientId]);

  const handleLinkClient = async (targetClient: any) => {
    setIsLinking(true);
    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        "details.directoryContacts": arrayUnion({
          id: targetClient.id,
          name: targetClient.name,
          status: targetClient.status,
          location: targetClient.location || 'Inconnue'
        })
      });
      onClose();
      setSearch('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-gray-200 bg-white rounded-xl flex items-center justify-center text-gray-800 shadow-sm">
              <SquarePen size={20} />
            </div>
            <h2 className="text-[18px] font-bold text-gray-900">Lier un contact de l'annuaire</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-8 pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par nom, ville ou email..." 
              className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 transition-all placeholder:text-gray-300 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* List Body */}
        <div className="p-8 space-y-4">
          <div className="flex justify-between items-center px-1">
             <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Résultats ({filteredClients.length})</label>
          </div>

          <div className="min-h-[300px] max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-gray-200" />
              </div>
            ) : filteredClients.length > 0 ? (
              filteredClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleLinkClient(c)}
                  disabled={isLinking}
                  className="w-full px-5 py-4 text-left bg-white border border-gray-100 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-indigo-500 group-hover:bg-white transition-all">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-gray-900">{c.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          c.status === 'Client' ? 'bg-cyan-100 text-cyan-600' : 
                          c.status === 'Prospect' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-purple-100 text-purple-600'
                        }`}>{c.status === 'Leads' ? 'Études' : c.status}</span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <MapPin size={10} /> {c.location || 'Inconnue'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLinking ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Check size={18} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />}
                  </div>
                </button>
              ))
            ) : (
              <div className="py-20 text-center text-gray-400 text-sm italic">Aucun contact trouvé</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 pt-0 flex justify-end bg-white">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDirectoryContactModal;
