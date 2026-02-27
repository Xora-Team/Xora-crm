
import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Loader2, Gift, Check, Box } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from '@firebase/firestore';
import { Article } from '../types';

interface AddGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onGiftAdded: (gift: any) => void;
}

const AddGiftModal: React.FC<AddGiftModalProps> = ({ isOpen, onClose, userProfile, onGiftAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newGiftName, setNewGiftName] = useState('');

  useEffect(() => {
    if (isOpen && searchQuery.length > 1) {
      const delayDebounceFn = setTimeout(() => {
        searchArticles();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else if (searchQuery.length <= 1) {
      setArticles([]);
    }
  }, [searchQuery, isOpen]);

  const searchArticles = async () => {
    if (!userProfile?.companyId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'articles'),
        where('companyId', '==', userProfile.companyId)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Article))
        .filter(art => 
          art.descriptif.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.famille.toLowerCase().includes(searchQuery.toLowerCase())
        );
      setArticles(results);
    } catch (error) {
      console.error("Error searching articles:", error);
    } finally {
      setIsLoading(true); // Wait, should be false
      setIsLoading(false);
    }
  };

  const handleSelectArticle = (article: Article) => {
    onGiftAdded({
      id: article.id,
      name: `${article.famille} - ${article.descriptif}`,
      articleId: article.id
    });
    onClose();
  };

  const handleCreateNewGift = async () => {
    if (!newGiftName.trim() || !userProfile?.companyId) return;
    setIsLoading(true);
    try {
      // Create a basic article for this gift
      const articleData = {
        metier: 'Cuisine',
        rubrique: 'Cadeau',
        famille: 'Cadeau Fidélité',
        collection: '',
        descriptif: newGiftName,
        prixMiniTTC: 0,
        prixMaxiTTC: 0,
        companyId: userProfile.companyId,
        createdBy: userProfile.name,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'articles'), articleData);
      
      onGiftAdded({
        id: docRef.id,
        name: newGiftName,
        articleId: docRef.id
      });
      onClose();
    } catch (error) {
      console.error("Error creating gift article:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Gift size={24} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">Ajouter un cadeau</h2>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Fidélisation client</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {!isCreating ? (
            <>
              <div className="space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={20} />
                  <input 
                    type="text"
                    placeholder="Rechercher un article..."
                    className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Loader2 className="animate-spin mb-2" size={24} />
                      <p className="text-xs font-bold uppercase tracking-widest">Recherche en cours...</p>
                    </div>
                  ) : articles.length > 0 ? (
                    articles.map(article => (
                      <button
                        key={article.id}
                        onClick={() => handleSelectArticle(article)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-900 hover:shadow-md transition-all group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            <Box size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{article.famille}</p>
                            <p className="text-[10px] text-gray-400 font-medium line-clamp-1">{article.descriptif}</p>
                          </div>
                        </div>
                        <Plus size={18} className="text-gray-300 group-hover:text-gray-900" />
                      </button>
                    ))
                  ) : searchQuery.length > 1 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400 font-medium">Aucun article trouvé</p>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400 font-medium">Saisissez au moins 2 caractères</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 text-indigo-600 text-sm font-bold hover:bg-indigo-50 rounded-2xl transition-all"
                >
                  <Plus size={18} /> Créer un nouveau cadeau
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nom du cadeau</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Ex: Bouteille de champagne, Coffret gourmand..."
                  className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                  value={newGiftName}
                  onChange={(e) => setNewGiftName(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-4 text-gray-500 text-sm font-bold hover:bg-gray-100 rounded-2xl transition-all"
                >
                  Retour
                </button>
                <button 
                  onClick={handleCreateNewGift}
                  disabled={isLoading || !newGiftName.trim()}
                  className="flex-[2] flex items-center justify-center gap-2 py-4 bg-gray-900 text-white text-sm font-bold hover:bg-black rounded-2xl transition-all shadow-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Créer et ajouter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddGiftModal;
