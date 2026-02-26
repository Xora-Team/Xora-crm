
import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Check, Loader2, Package, Layers, Edit3, Euro, Tag } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from '@firebase/firestore';

interface AddProjectArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'Electromenager' | 'Sanitaire';
  project: any;
  userProfile: any;
  onArticleSelected?: (article: any) => Promise<void>;
}

const AddProjectArticleModal: React.FC<AddProjectArticleModalProps> = ({ 
  isOpen, 
  onClose, 
  mode, 
  project, 
  userProfile,
  onArticleSelected 
}) => {
  const [view, setView] = useState<'search' | 'manual'>('search');
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState<string | null>(null);

  // Manual form state
  const [manualData, setManualData] = useState({
    famille: '',
    descriptif: '',
    collection: '',
    prixMaxiTTC: ''
  });

  useEffect(() => {
    if (!isOpen || !userProfile?.companyId || view !== 'search') return;

    setIsLoading(true);
    const q = query(
      collection(db, 'articles'), 
      where('companyId', '==', userProfile.companyId),
      where('rubrique', '==', mode)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setArticles(docs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, mode, userProfile?.companyId, view]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a => 
      a.famille?.toLowerCase().includes(q) || 
      a.descriptif?.toLowerCase().includes(q) ||
      a.collection?.toLowerCase().includes(q)
    );
  }, [search, articles]);

  const handleAddArticle = async (article: any) => {
    setIsAdding(article.id);
    try {
      if (onArticleSelected) {
        await onArticleSelected(article);
      } else {
        const type = mode === 'Electromenager' ? 'electros' : 'sanitaires';
        const projectRef = doc(db, 'projects', project.id);
        
        await updateDoc(projectRef, {
          [`details.kitchen.${type}`]: arrayUnion({
            ...article,
            addedAt: new Date().toISOString()
          })
        });
      }
      
      setTimeout(() => setIsAdding(null), 1000);
    } catch (e) {
      console.error(e);
      setIsAdding(null);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.descriptif || !manualData.prixMaxiTTC) return;

    setIsAdding('manual-action');
    try {
      const newManualItem = {
        id: `manual_${Date.now()}`,
        famille: manualData.famille || 'Manuel',
        descriptif: manualData.descriptif,
        collection: manualData.collection,
        prixMaxiTTC: Number(manualData.prixMaxiTTC),
        prixMiniTTC: Number(manualData.prixMaxiTTC), // Pour simplifier en manuel
        rubrique: mode,
        isManual: true,
        addedAt: new Date().toISOString()
      };

      if (onArticleSelected) {
        await onArticleSelected(newManualItem);
      } else {
        const type = mode === 'Electromenager' ? 'electros' : 'sanitaires';
        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, {
          [`details.kitchen.${type}`]: arrayUnion(newManualItem)
        });
      }
      
      // Reset manual form
      setManualData({
        famille: '',
        descriptif: '',
        collection: '',
        prixMaxiTTC: ''
      });
      setView('search');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 h-[85vh]">
        
        {/* Header */}
        <div className="px-10 py-7 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">
                Ajouter un {mode === 'Electromenager' ? 'Électroménager' : 'Sanitaire'}
              </h2>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Dossier client : {project.projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <X size={24} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-10 pt-6 pb-2">
          <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
            <button 
              onClick={() => setView('search')}
              className={`flex-1 py-3 px-4 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${view === 'search' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Search size={16} /> Recherche catalogue
            </button>
            <button 
              onClick={() => setView('manual')}
              className={`flex-1 py-3 px-4 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${view === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Edit3 size={16} /> Saisie manuelle
            </button>
          </div>
        </div>

        {view === 'search' ? (
          <>
            {/* Search Input */}
            <div className="px-10 pt-4 pb-4">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Rechercher par famille, modèle ou descriptif..." 
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-[20px] pl-14 pr-6 py-4 text-[15px] font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all placeholder:text-gray-300 shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 size={32} className="animate-spin text-gray-200" />
                    <p className="text-[13px] font-bold text-gray-400">Chargement du catalogue...</p>
                  </div>
                ) : filteredArticles.length > 0 ? (
                  filteredArticles.map(article => {
                    const isSelected = isAdding === article.id;
                    return (
                      <div
                        key={article.id}
                        className={`w-full px-6 py-4 bg-white border border-gray-100 rounded-[24px] flex items-center justify-between transition-all hover:shadow-md hover:border-gray-300 group shadow-sm`}
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all">
                            <Package size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{article.famille}</span>
                              {article.collection && <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">• {article.collection}</span>}
                            </div>
                            <h4 className="text-[14px] font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">{article.descriptif}</h4>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[15px] font-black text-gray-900">{article.prixMaxiTTC?.toLocaleString()} €</p>
                            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Conseillé TTC</p>
                          </div>
                          <button 
                            onClick={() => handleAddArticle(article)}
                            disabled={!!isAdding}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-green-500 text-white shadow-lg' 
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white border border-gray-100'
                            }`}
                          >
                            {isSelected ? <Check size={20} /> : (isAdding === article.id ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />)}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center space-y-4">
                    <Layers size={48} className="text-gray-100 mx-auto" />
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">Aucun article trouvé</p>
                      <p className="text-[12px] text-gray-400">Assurez-vous que vos articles dans le catalogue ont bien la rubrique "{mode}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* MANUAL ENTRY VIEW */
          <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
            <form onSubmit={handleManualAdd} className="space-y-8 animate-in slide-in-from-bottom-4 duration-400">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                    <Layers size={14} className="text-indigo-500" />
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Catégorie / Famille</label>
                  </div>
                  <input 
                    type="text" 
                    value={manualData.famille}
                    onChange={(e) => setManualData({...manualData, famille: e.target.value})}
                    placeholder="Ex: Four, Lave-vaisselle, Robinetterie..."
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-4 text-[14px] font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                    <Tag size={14} className="text-indigo-500" />
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Collection / Marque</label>
                  </div>
                  <input 
                    type="text" 
                    value={manualData.collection}
                    onChange={(e) => setManualData({...manualData, collection: e.target.value})}
                    placeholder="Ex: Bosch, Grohe, Elite..."
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-4 text-[14px] font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <Package size={14} className="text-indigo-500" />
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Descriptif précis*</label>
                </div>
                <textarea 
                  required
                  rows={3}
                  value={manualData.descriptif}
                  onChange={(e) => setManualData({...manualData, descriptif: e.target.value})}
                  placeholder="Saisissez la référence ou le descriptif de l'article..."
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-4 text-[14px] font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm resize-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <Euro size={14} className="text-indigo-500" />
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Prix conseillé TTC*</label>
                </div>
                <div className="relative group">
                  <input 
                    required
                    type="number" 
                    value={manualData.prixMaxiTTC}
                    onChange={(e) => setManualData({...manualData, prixMaxiTTC: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl pl-5 pr-12 py-4 text-[16px] font-black text-gray-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-black">€</span>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={!!isAdding || !manualData.descriptif || !manualData.prixMaxiTTC}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-gray-900 text-white rounded-2xl text-[15px] font-black shadow-2xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isAdding === 'manual-action' ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
                  Valider et ajouter au projet
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-10 border-t border-gray-100 flex justify-between items-center bg-[#FBFBFB] shrink-0">
          <p className="text-[12px] text-gray-400 font-medium">
            {view === 'search' ? (
              <> <span className="font-black text-gray-900">{filteredArticles.length}</span> articles disponibles dans le catalogue </>
            ) : (
              "Saisie d'un article hors catalogue"
            )}
          </p>
          <button 
            onClick={onClose}
            className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-2xl text-[14px] font-bold shadow-sm hover:bg-gray-200 transition-all active:scale-95"
          >
            Terminer la sélection
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectArticleModal;
