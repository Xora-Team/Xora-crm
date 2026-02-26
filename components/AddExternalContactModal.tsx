import React, { useState } from 'react';
import { X, ChevronDown, Check, SquarePen, Loader2 } from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, updateDoc, arrayUnion } from '@firebase/firestore';

// Formateur de téléphone : ajoute un espace tous les 2 chiffres
const formatPhone = (val: string) => {
  const numbers = val.replace(/\D/g, ''); 
  const limited = numbers.substring(0, 10);
  return limited.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
};

interface AddExternalContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

const AddExternalContactModal: React.FC<AddExternalContactModalProps> = ({ isOpen, onClose, clientId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    civility: 'Mme',
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    fixed: '',
    type: 'Epouse'
  });

  const contactTypeOptions = [
    "Epouse",
    "Epoux",
    "Compagne",
    "Compagnon",
    "Enfant",
    "Parent",
    "Architecte",
    "Agence Immobilière",
    "Concierge",
    "Amis",
    "Maitre d'œuvre",
    "Voisin",
    "Personne à contacter"
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.firstName) return;

    setIsLoading(true);
    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        "details.externalContacts": arrayUnion({
          ...formData,
          id: Date.now().toString()
        })
      });
      onClose();
      setFormData({
        civility: 'Mme',
        lastName: '',
        firstName: '',
        email: '',
        phone: '',
        fixed: '',
        type: 'Epouse'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-gray-200 bg-white rounded-xl flex items-center justify-center text-gray-800 shadow-sm">
                <SquarePen size={20} />
              </div>
              <h2 className="text-[18px] font-bold text-gray-900">Ajouter un contact externe</h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Civilité*</label>
                <div className="relative">
                  <select 
                    value={formData.civility}
                    onChange={(e) => setFormData({...formData, civility: e.target.value})}
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                  >
                    <option>Mme</option>
                    <option>M.</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nom*</label>
                <input 
                  required
                  type="text" 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                />
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Prénom*</label>
                <input 
                  required
                  type="text" 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Type de contact</label>
                <div className="relative">
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                  >
                    {contactTypeOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Téléphone mobile</label>
                <input 
                  type="text" 
                  placeholder="06 12 34 56 78"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Téléphone fixe</label>
                <input 
                  type="text" 
                  placeholder="04 67 00 00 00"
                  value={formData.fixed}
                  onChange={(e) => setFormData({...formData, fixed: formatPhone(e.target.value)})}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-gray-100 bg-[#FBFBFB] flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={isLoading || !formData.lastName || !formData.firstName}
              className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Enregistrer le contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExternalContactModal;