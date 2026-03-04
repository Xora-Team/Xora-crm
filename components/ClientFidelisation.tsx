
import React, { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Loader2, Check, Users, Heart, ShieldCheck, ChevronDown, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from '@firebase/firestore';
import { Client } from '../types';

interface ClientFidelisationProps {
  client: Client;
  userProfile: any;
}

const ClientFidelisation: React.FC<ClientFidelisationProps> = ({ client, userProfile }) => {
  const [activeSubTab, setActiveSubTab] = useState('Informations');
  const [companyGifts, setCompanyGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [sponsoredCount, setSponsoredCount] = useState(0);

  const [formData, setFormData] = useState({
    primary_clientNotes: client.details?.primary_clientNotes || client.details?.clientNotes || '',
    primary_clientProfessions: client.details?.primary_clientProfessions || client.details?.clientProfessions || '',
    primary_favoriteDrink: client.details?.primary_favoriteDrink || client.details?.favoriteDrink || '',
    primary_drinkCustomization: client.details?.primary_drinkCustomization || client.details?.drinkCustomization || '',
    secondary_clientNotes: client.details?.secondary_clientNotes || '',
    secondary_clientProfessions: client.details?.secondary_clientProfessions || '',
    secondary_favoriteDrink: client.details?.secondary_favoriteDrink || '',
    secondary_drinkCustomization: client.details?.secondary_drinkCustomization || '',
    childrenNames: client.details?.childrenNames || '',
    pets: client.details?.pets || '',
    petNames: client.details?.petNames || '',
    miscNotes: client.details?.miscNotes || '',
    rgpdConsent: client.details?.rgpdConsent || false
  });

  useEffect(() => {
    if (!userProfile?.companyId) return;

    // Fetch company gifts
    const unsubCompany = onSnapshot(doc(db, 'companies', userProfile.companyId), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyGifts(docSnap.data().loyaltyGifts || []);
      }
      setLoading(false);
    });

    // Fetch sponsored clients count
    const fetchSponsored = async () => {
      const q = query(
        collection(db, 'clients'),
        where('details.sponsorId', '==', client.id)
      );
      const snap = await getDocs(q);
      setSponsoredCount(snap.size);
    };
    fetchSponsored();

    return () => unsubCompany();
  }, [userProfile?.companyId, client.id]);

  useEffect(() => {
    setFormData({
      primary_clientNotes: client.details?.primary_clientNotes || client.details?.clientNotes || '',
      primary_clientProfessions: client.details?.primary_clientProfessions || client.details?.clientProfessions || '',
      primary_favoriteDrink: client.details?.primary_favoriteDrink || client.details?.favoriteDrink || '',
      primary_drinkCustomization: client.details?.primary_drinkCustomization || client.details?.drinkCustomization || '',
      secondary_clientNotes: client.details?.secondary_clientNotes || '',
      secondary_clientProfessions: client.details?.secondary_clientProfessions || '',
      secondary_favoriteDrink: client.details?.secondary_favoriteDrink || '',
      secondary_drinkCustomization: client.details?.secondary_drinkCustomization || '',
      childrenNames: client.details?.childrenNames || '',
      pets: client.details?.pets || '',
      petNames: client.details?.petNames || '',
      miscNotes: client.details?.miscNotes || '',
      rgpdConsent: client.details?.rgpdConsent || false
    });
  }, [client.details]);

  const handleUpdateField = async (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    try {
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        [`details.${field}`]: value
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de ${field}:`, error);
    }
  };

  const handleAddGift = async (gift: any) => {
    if (!client.id) return;
    setIsAdding(true);
    try {
      const clientRef = doc(db, 'clients', client.id);
      const giftToAdd = {
        id: gift.id,
        name: gift.name,
        dateOffered: new Date().toISOString().split('T')[0],
        addedBy: userProfile.name
      };
      await updateDoc(clientRef, {
        "details.offeredGifts": arrayUnion(giftToAdd)
      });
      setShowGiftSelector(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout du cadeau:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteOfferedGift = async (gift: any) => {
    if (!client.id) return;
    try {
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        "details.offeredGifts": arrayRemove(gift)
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du cadeau:", error);
    }
  };

  const subTabs = [
    { id: 'Informations', label: 'Informations' },
    { id: 'Clients parrainés', label: `Clients parrainés (${sponsoredCount})` },
    { id: 'Satisfaction client', label: 'Satisfaction client' },
    { id: 'Cadeaux offerts', label: 'Cadeaux offerts' },
    { id: 'Communication', label: 'Communication' },
    { id: 'RGPD', label: 'RGPD' }
  ];

  const drinkOptions = ['Café', 'Thé', 'Eau', 'Jus de fruits', 'Soda', 'Autre'];
  const petOptions = ['Chien', 'Chat', 'Oiseau', 'Poisson', 'Rongeur', 'Autre'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 min-h-full bg-white">
      {/* Sub-tabs */}
      <div className="flex border-b border-gray-100 mb-8 sticky top-0 bg-white z-10">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-6 py-4 text-sm font-bold transition-all relative ${
              activeSubTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {activeSubTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-500 px-2">
        {activeSubTab === 'Informations' && (
          <div className="space-y-8">
            
            {/* Contacts Blocks */}
            {[
              { 
                id: 'primary', 
                name: `${client.details?.firstName || ''} ${client.details?.lastName || ''}`.trim() || client.name,
                exists: true 
              },
              { 
                id: 'secondary', 
                name: client.details?.additionalContacts?.[0] ? `${client.details.additionalContacts[0].firstName || ''} ${client.details.additionalContacts[0].lastName || ''}`.trim() : null,
                exists: !!client.details?.additionalContacts?.[0]
              }
            ].filter(c => c.exists).map((contact) => (
              <div key={contact.id} className="bg-[#F8F9FA] border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="bg-gray-100/80 px-10 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">{contact.name}</h3>
                </div>
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Boisson préférée</label>
                      <div className="relative">
                        <select
                          value={(formData as any)[`${contact.id}_favoriteDrink`]}
                          onChange={(e) => handleUpdateField(`${contact.id}_favoriteDrink`, e.target.value)}
                          className={`w-full appearance-none bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all shadow-sm outline-none focus:border-gray-300 ${
                            !(formData as any)[`${contact.id}_favoriteDrink`] 
                              ? 'text-gray-400 font-medium' 
                              : 'text-gray-900 font-bold'
                          }`}
                        >
                          <option value="" className="text-gray-400 font-medium">Sélectionner</option>
                          {drinkOptions.map(opt => <option key={opt} value={opt} className="text-gray-900 font-bold">{opt}</option>)}
                        </select>
                        <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Personnalisation de la boisson</label>
                      <div className="relative">
                        <select
                          value={(formData as any)[`${contact.id}_drinkCustomization`]}
                          onChange={(e) => handleUpdateField(`${contact.id}_drinkCustomization`, e.target.value)}
                          className={`w-full appearance-none bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all shadow-sm outline-none focus:border-gray-300 ${
                            !(formData as any)[`${contact.id}_drinkCustomization`] 
                              ? 'text-gray-400 font-medium' 
                              : 'text-gray-900 font-bold'
                          }`}
                        >
                          <option value="" className="text-gray-400 font-medium">Sélectionner</option>
                          <option value="Sans sucre" className="text-gray-900 font-bold">Sans sucre</option>
                          <option value="Avec sucre" className="text-gray-900 font-bold">Avec sucre</option>
                          <option value="Lait" className="text-gray-900 font-bold">Lait</option>
                          <option value="Lait végétal" className="text-gray-900 font-bold">Lait végétal</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Professions</label>
                      <input
                        type="text"
                        value={(formData as any)[`${contact.id}_clientProfessions`]}
                        onChange={(e) => handleUpdateField(`${contact.id}_clientProfessions`, e.target.value)}
                        placeholder="Saisir"
                        className={`w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all shadow-sm outline-none focus:border-gray-300 placeholder:text-gray-400 placeholder:font-medium ${
                          !(formData as any)[`${contact.id}_clientProfessions`] 
                            ? 'text-gray-400 font-medium' 
                            : 'text-gray-900 font-bold'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Informations</label>
                    <textarea
                      value={(formData as any)[`${contact.id}_clientNotes`]}
                      onChange={(e) => handleUpdateField(`${contact.id}_clientNotes`, e.target.value)}
                      placeholder="Saisir"
                      className={`w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all min-h-[120px] resize-none shadow-sm outline-none focus:border-gray-300 placeholder:text-gray-400 placeholder:font-medium ${
                        !(formData as any)[`${contact.id}_clientNotes`] 
                          ? 'text-gray-400 font-medium' 
                          : 'text-gray-900 font-bold'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* 2️⃣ Enfants */}
            <div className="bg-[#F8F9FA] border border-gray-100 rounded-[32px] p-10 space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Prénom des enfants</label>
              <input
                type="text"
                value={formData.childrenNames}
                onChange={(e) => handleUpdateField('childrenNames', e.target.value)}
                placeholder="Saisir"
                className={`w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all shadow-sm outline-none focus:border-gray-300 placeholder:text-gray-400 placeholder:font-medium ${
                  !formData.childrenNames ? 'text-gray-400 font-medium' : 'text-gray-900 font-bold'
                }`}
              />
            </div>

            {/* 3️⃣ Animaux */}
            <div className="bg-[#F8F9FA] border border-gray-100 rounded-[32px] p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Animaux de compagnie</label>
                  <div className="relative">
                    <select
                      value={formData.pets}
                      onChange={(e) => handleUpdateField('pets', e.target.value)}
                      className={`w-full appearance-none bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all shadow-sm outline-none focus:border-gray-300 ${
                        !formData.pets ? 'text-gray-400 font-medium' : 'text-gray-900 font-bold'
                      }`}
                    >
                      <option value="" className="text-gray-400 font-medium">Sélectionner</option>
                      {petOptions.map(opt => <option key={opt} value={opt} className="text-gray-900 font-bold">{opt}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nom des animaux</label>
                  <input
                    type="text"
                    value={formData.petNames}
                    onChange={(e) => handleUpdateField('petNames', e.target.value)}
                    placeholder="Saisir"
                    className={`w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all shadow-sm outline-none focus:border-gray-300 placeholder:text-gray-400 placeholder:font-medium ${
                      !formData.petNames ? 'text-gray-400 font-medium' : 'text-gray-900 font-bold'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 4️⃣ Informations diverses */}
            <div className="bg-[#F8F9FA] border border-gray-100 rounded-[32px] p-10 space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Informations diverses</label>
              <textarea
                value={formData.miscNotes}
                onChange={(e) => handleUpdateField('miscNotes', e.target.value)}
                placeholder="Saisir"
                className={`w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm transition-all min-h-[100px] resize-none shadow-sm outline-none focus:border-gray-300 placeholder:text-gray-400 placeholder:font-medium ${
                  !formData.miscNotes ? 'text-gray-400 font-medium' : 'text-gray-900 font-bold'
                }`}
              />
            </div>
          </div>
        )}

        {activeSubTab === 'Clients parrainés' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Aucun client parrainé par ce client pour le moment.</p>
          </div>
        )}

        {activeSubTab === 'Satisfaction client' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
            <Heart size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Le module de satisfaction client est en cours de développement.</p>
          </div>
        )}

        {activeSubTab === 'Cadeaux offerts' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">Cadeaux offerts</h3>
                <p className="text-xs text-gray-400 mt-1">Gérez les cadeaux et attentions offerts à ce client.</p>
              </div>
              <button 
                onClick={() => setShowGiftSelector(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[12px] font-bold shadow-lg hover:bg-black transition-all active:scale-95"
              >
                <Plus size={16} /> Offrir un cadeau
              </button>
            </div>

            {client.details?.offeredGifts && client.details.offeredGifts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {client.details.offeredGifts.map((gift: any, index: number) => (
                  <div key={index} className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all">
                        <Gift size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{gift.name}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">Offert le {new Date(gift.dateOffered).toLocaleDateString('fr-FR')} par {gift.addedBy}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteOfferedGift(gift)}
                      className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                <Gift size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Aucun cadeau offert à ce client pour le moment.</p>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'Communication' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Le module de communication est en cours de développement.</p>
          </div>
        )}

        {activeSubTab === 'RGPD' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Conformité RGPD</h3>
                <p className="text-sm text-gray-400">Gérez le consentement du client pour le traitement de ses données.</p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-900">Consentement marketing</p>
                <p className="text-xs text-gray-400">Le client accepte de recevoir des communications marketing.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold uppercase ${!formData.rgpdConsent ? 'text-gray-900' : 'text-gray-300'}`}>Non</span>
                <button
                  onClick={() => handleUpdateField('rgpdConsent', !formData.rgpdConsent)}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.rgpdConsent ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.rgpdConsent ? 'right-1' : 'left-1'}`}></div>
                </button>
                <span className={`text-xs font-bold uppercase ${formData.rgpdConsent ? 'text-gray-900' : 'text-gray-300'}`}>Oui</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de sélection de cadeau */}
      {showGiftSelector && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900">
                  <Gift size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Offrir un cadeau</h2>
                  <p className="text-xs text-gray-400">Sélectionnez un cadeau dans la liste de l'agence</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGiftSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="p-8 max-h-[400px] overflow-y-auto hide-scrollbar space-y-3">
              {companyGifts.length > 0 ? (
                companyGifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => handleAddGift(gift)}
                    disabled={isAdding}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all group border border-transparent hover:border-gray-200"
                  >
                    <span className="text-sm font-bold text-gray-700">{gift.name}</span>
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-300 group-hover:text-gray-900 shadow-sm transition-all">
                      <Check size={18} />
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-10 space-y-4">
                  <p className="text-sm text-gray-400">Aucun cadeau n'est configuré dans les paramètres de l'entreprise.</p>
                  <p className="text-[11px] text-gray-400 italic">Allez dans Paramètres &gt; Société &gt; Fidélisation pour en ajouter.</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowGiftSelector(false)}
                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientFidelisation;

