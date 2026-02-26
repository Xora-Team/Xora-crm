
import React, { useState, useEffect } from 'react';
import { Plus, Phone, Mail, User, Trash2, ExternalLink, PenSquare, Check, X, Loader2 } from 'lucide-react';
import AddExternalContactModal from './AddExternalContactModal';
import AddDirectoryContactModal from './AddDirectoryContactModal';
import { Client } from '../types';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, onSnapshot, updateDoc, arrayRemove } from '@firebase/firestore';

interface ClientExternalContactProps {
  client: Client;
}

const ClientExternalContact: React.FC<ClientExternalContactProps> = ({ client: initialClient }) => {
  const [client, setClient] = useState<Client>(initialClient);
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);
  
  // States for Inline Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Écouter les mises à jour du client
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clients', initialClient.id), (docSnap) => {
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...docSnap.data() } as Client);
      }
    });
    return () => unsub();
  }, [initialClient.id]);

  const externalContacts = (client as any).details?.externalContacts || [];
  const directoryContacts = (client as any).details?.directoryContacts || [];

  const startEditing = (contact: any) => {
    setEditingId(contact.id);
    setEditData({ ...contact });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;
    setIsSaving(true);
    try {
      const oldContact = externalContacts.find((c: any) => c.id === editingId);
      const updatedList = externalContacts.map((c: any) => 
        c.id === editingId ? { ...editData } : c
      );

      await updateDoc(doc(db, 'clients', client.id), {
        "details.externalContacts": updatedList
      });
      setEditingId(null);
      setEditData(null);
    } catch (e) {
      console.error("Erreur sauvegarde contact externe:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const removeExternalContact = async (contact: any) => {
    if (!window.confirm("Supprimer ce contact externe ?")) return;
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        "details.externalContacts": arrayRemove(contact)
      });
    } catch (e) { console.error(e); }
  };

  const removeDirectoryContact = async (contact: any) => {
    if (!window.confirm("Retirer le lien avec ce contact de l'annuaire ?")) return;
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        "details.directoryContacts": arrayRemove(contact)
      });
    } catch (e) { console.error(e); }
  };

  // Formateur de téléphone local
  const formatPhone = (val: string) => {
    const numbers = val.replace(/\D/g, ''); 
    const limited = numbers.substring(0, 10);
    return limited.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-full pb-10">
      
      {/* Section Contacts Externes */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-gray-900">Liste des contacts externes</h3>
            <p className="text-[12px] text-gray-400">Contacts spécifiques à ce dossier (conjoint, famille...)</p>
          </div>
          <button 
            onClick={() => setIsExternalModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition-all"
          >
            <Plus size={14} /> Ajouter un contact
          </button>
        </div>

        <div className="bg-[#f8f9fa] border border-gray-100 rounded-[24px] p-6">
          {externalContacts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {externalContacts.map((contact: any) => (
                <div key={contact.id} className={`bg-white border rounded-2xl p-5 transition-all shadow-sm group ${editingId === contact.id ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-gray-100 hover:shadow-md'}`}>
                  {editingId === contact.id ? (
                    /* MODE ÉDITION */
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                          <select 
                            value={editData.type} 
                            onChange={(e) => setEditData({...editData, type: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold"
                          >
                            <option>Conjoint / Conjointe</option>
                            <option>Famille</option>
                            <option>Ami / Voisin</option>
                            <option>Autre</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom</label>
                          <input 
                            type="text" 
                            value={editData.lastName} 
                            onChange={(e) => setEditData({...editData, lastName: e.target.value.toUpperCase()})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Prénom</label>
                          <input 
                            type="text" 
                            value={editData.firstName} 
                            onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Portable</label>
                          <input 
                            type="text" 
                            value={editData.phone} 
                            onChange={(e) => setEditData({...editData, phone: formatPhone(e.target.value)})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end items-center gap-3 pt-2 border-t border-gray-50">
                        <button onClick={cancelEditing} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-800 transition-colors">
                          <X size={14} /> Annuler
                        </button>
                        <button 
                          onClick={saveEdit} 
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Enregistrer les modifications
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* MODE AFFICHAGE */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <User size={24} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-gray-900 uppercase">{contact.firstName} {contact.lastName}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{contact.type}</p>
                            {contact.phone && <span className="text-[11px] text-gray-400 font-medium">• {contact.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startEditing(contact)}
                          className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <PenSquare size={18} />
                        </button>
                        {contact.phone && <button className="p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-lg transition-colors"><Phone size={16} /></button>}
                        {contact.email && <button className="p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-lg transition-colors"><Mail size={16} /></button>}
                        <button 
                          onClick={() => removeExternalContact(contact)} 
                          className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-200 mx-auto shadow-sm"><User size={24} /></div>
              <p className="text-[13px] text-gray-400 italic">Aucun contact externe renseigné.</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Contacts Annuaires */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-gray-900">Liste des contacts annuaires</h3>
            <p className="text-[12px] text-gray-400">Lien avec d'autres fiches clients existantes</p>
          </div>
          <button 
            onClick={() => setIsDirectoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition-all"
          >
            <Plus size={14} /> Lier un contact
          </button>
        </div>

        <div className="bg-[#f8f9fa] border border-gray-100 rounded-[24px] p-6">
          {directoryContacts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {directoryContacts.map((contact: any, idx: number) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-400">
                      <ExternalLink size={24} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-gray-900">{contact.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          contact.status === 'Client' ? 'bg-cyan-100 text-cyan-600' : 
                          contact.status === 'Prospect' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-purple-100 text-purple-600'
                        }`}>{contact.status}</span>
                        <span className="text-[11px] text-gray-400">{contact.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeDirectoryContact(contact)} className="p-2 text-gray-200 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-200 mx-auto shadow-sm"><ExternalLink size={24} /></div>
              <p className="text-[13px] text-gray-400 italic">Aucun contact lié depuis l'annuaire.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddExternalContactModal 
        isOpen={isExternalModalOpen} 
        onClose={() => setIsExternalModalOpen(false)} 
        clientId={client.id}
      />
      <AddDirectoryContactModal 
        isOpen={isDirectoryModalOpen} 
        onClose={() => setIsDirectoryModalOpen(false)} 
        clientId={client.id}
        companyId={(client as any).companyId}
      />
    </div>
  );
};

export default ClientExternalContact;
