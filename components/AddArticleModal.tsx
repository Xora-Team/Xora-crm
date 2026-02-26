
import React, { useState, useEffect } from 'react';
import { X, Box, Plus, Loader2, Euro, BookOpen, Layers, Tag, Save } from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { collection, addDoc, serverTimestamp, doc, updateDoc } from '@firebase/firestore';
import { Article } from '../types';

interface AddArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  articleToEdit?: Article | null;
}

const AddArticleModal: React.FC<AddArticleModalProps> = ({ isOpen, onClose, userProfile, articleToEdit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!articleToEdit;
  
  const [formData, setFormData] = useState({
    metier: 'Cuisine',
    rubrique: 'Electromenager',
    famille: '',
    collection: '',
    descriptif: '',
    prixMiniTTC: '',
    prixMaxiTTC: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (articleToEdit) {
        setFormData({
          metier: articleToEdit.metier || 'Cuisine',
          rubrique: articleToEdit.rubrique || 'Electromenager',
          famille: articleToEdit.famille || '',
          collection: articleToEdit.collection || '',
          descriptif: articleToEdit.descriptif || '',
          prixMiniTTC: articleToEdit.prixMiniTTC ? articleToEdit.prixMiniTTC.toString() : '',
          prixMaxiTTC: articleToEdit.prixMaxiTTC ? articleToEdit.prixMaxiTTC.toString() : ''
        });
      } else {
        setFormData({
          metier: 'Cuisine',
          rubrique: 'Electromenager',
          famille: '',
          collection: '',
          descriptif: '',
          prixMiniTTC: '',
          prixMaxiTTC: ''
        });
      }
    }
  }, [isOpen, articleToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.companyId) return;

    setIsLoading(true);
    try {
      const articleData = {
        metier: formData.metier,
        rubrique: formData.rubrique,
        famille: formData.famille,
        collection: formData.collection,
        descriptif: formData.descriptif,
        prixMiniTTC: Number(formData.prixMiniTTC),
        prixMaxiTTC: Number(formData.prixMaxiTTC),
      };

      if (isEdit && articleToEdit) {
        const articleRef = doc(db, 'articles', articleToEdit.id);
        await updateDoc(articleRef, articleData);
      } else {
        await addDoc(collection(db, 'articles'), {
          ...articleData,
          companyId: userProfile.companyId,
          createdBy: userProfile.name,
          createdAt: serverTimestamp(),
        });
      }
      
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement de l'article.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Box size={24} />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">{isEdit ? "Modifier l'article" : "Nouvel article catalogue"}</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Entreprise : {userProfile?.companyName}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
              <X size={22} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
            
            {/* Section Classification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-500">
                <Layers size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Classification</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Métier*</label>
                  <select 
                    value={formData.metier}
                    onChange={(e) => setFormData({...formData, metier: e.target.value})}
                    className="w-full appearance-none bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                  >
                    <option>Cuisine</option>
                    <option>Salle de bain</option>
                    <option>Rangement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Rubrique*</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Electromenager, Sanitaire..." 
                    value={formData.rubrique}
                    onChange={(e) => setFormData({...formData, rubrique: e.target.value})}
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Famille*</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Four, Micro-ondes..." 
                    value={formData.famille}
                    onChange={(e) => setFormData({...formData, famille: e.target.value})}
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Collection</label>
                  <input 
                    type="text" 
                    placeholder="Optionnel" 
                    value={formData.collection}
                    onChange={(e) => setFormData({...formData, collection: e.target.value})}
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner" 
                  />
                </div>
              </div>
            </div>

            {/* Section Descriptif */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-500">
                <BookOpen size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Détails de l'article</span>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Résumé descriptif*</label>
                <textarea 
                  required
                  placeholder="Ex: Four basique, Micro-ondes encastré..." 
                  value={formData.descriptif}
                  onChange={(e) => setFormData({...formData, descriptif: e.target.value})}
                  rows={3}
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner resize-none" 
                />
              </div>
            </div>

            {/* Section Tarification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-500">
                <Tag size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Tarification TTC</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Prix mini TTC*</label>
                  <div className="relative group">
                    <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" size={18} />
                    <input 
                      required
                      type="number" 
                      placeholder="0.00" 
                      value={formData.prixMiniTTC}
                      onChange={(e) => setFormData({...formData, prixMiniTTC: e.target.value})}
                      className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Prix maxi TTC*</label>
                  <div className="relative group">
                    <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" size={18} />
                    <input 
                      required
                      type="number" 
                      placeholder="0.00" 
                      value={formData.prixMaxiTTC}
                      onChange={(e) => setFormData({...formData, prixMaxiTTC: e.target.value})}
                      className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-gray-100 bg-[#FBFBFB] flex justify-center">
            <button 
              type="submit"
              disabled={isLoading || !formData.famille || !formData.descriptif || !formData.prixMiniTTC || !formData.prixMaxiTTC}
              className={`w-full flex items-center justify-center gap-3 px-10 py-5 text-white rounded-2xl text-[15px] font-bold shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 ${isEdit ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-gray-900 hover:bg-black shadow-gray-200'}`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                isEdit ? <Save size={20} /> : <Plus size={20} />
              )}
              {isEdit ? 'Enregistrer les modifications' : 'Ajouter au catalogue entreprise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddArticleModal;
