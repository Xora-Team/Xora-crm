import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, Save, MapPin, Search, Star, Check } from 'lucide-react';
import { Client } from '../types';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, updateDoc, onSnapshot } from '@firebase/firestore';

interface Property {
  id: string;
  number: number;
  address: string;
  complement?: string;
  type?: string;
  usage?: string;
  workNature?: string;
  isMain: boolean;
  isExpanded: boolean;
}

interface ClientPropertyInfoProps {
  client: Client;
}

const ClientPropertyInfo: React.FC<ClientPropertyInfoProps> = ({ client: initialClient }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for Address Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // States for Custom Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMainId, setPendingMainId] = useState<string | null>(null);

  // Charger les biens depuis Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clients', initialClient.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const existingProps = data.details?.properties || [];
        
        // S'il n'y a aucun bien, on initialise avec l'adresse principale
        if (existingProps.length === 0) {
          const mainProp = {
            id: 'main',
            number: 1,
            address: data.details?.address || '',
            usage: 'Résidence principale',
            workNature: 'Rénovation',
            isMain: true,
            isExpanded: false
          };
          setProperties([mainProp]);
        } else {
          setProperties(existingProps.map((p: any) => ({ ...p, isExpanded: p.isExpanded || false })));
        }
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [initialClient.id]);

  // BAN API logic
  useEffect(() => {
    const fetchAddr = async () => {
      if (!searchQuery || searchQuery.length < 4) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        console.error("Erreur API Adresse:", error);
      } finally {
        setIsSearching(false);
      }
    };
    const timer = setTimeout(fetchAddr, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setActiveSearchId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveProperties = async (newProperties: Property[]) => {
    try {
      const clientRef = doc(db, 'clients', initialClient.id);
      
      // Nettoyage des objets pour Firestore (remplacement des undefined par null ou chaine vide)
      const sanitizedProperties = newProperties.map(({ isExpanded, ...p }) => ({
        id: p.id || '',
        number: p.number || 0,
        address: p.address || '',
        complement: p.complement || '',
        type: p.type || 'Maison',
        usage: p.usage || 'Résidence secondaire',
        workNature: p.workNature || 'Rénovation',
        isMain: !!p.isMain
      }));

      const mainProp = sanitizedProperties.find(p => p.isMain);
      
      const updates: any = {
        "details.properties": sanitizedProperties
      };

      // Si on a un bien principal, on synchronise l'adresse de la fiche client
      if (mainProp && mainProp.address) {
        updates["details.address"] = mainProp.address;
        updates["location"] = mainProp.address.split(',').pop()?.trim() || 'Inconnue';
      }

      await updateDoc(clientRef, updates);
    } catch (e) {
      console.error("Erreur sauvegarde biens:", e);
    }
  };

  const toggleExpand = (id: string) => {
    setProperties(prev => prev.map(p => 
      p.id === id ? { ...p, isExpanded: !p.isExpanded } : p
    ));
    setSuggestions([]);
    setActiveSearchId(null);
  };

  const handleSetMainRequest = (id: string) => {
    const targetProp = properties.find(p => p.id === id);
    if (!targetProp || targetProp.isMain) return;
    setPendingMainId(id);
    setShowConfirmModal(true);
  };

  const confirmSetAsMain = () => {
    if (!pendingMainId) return;
    const updated = properties.map(p => ({
      ...p,
      isMain: p.id === pendingMainId,
      // Forcer l'usage à "Résidence principale" pour le nouveau principal
      usage: p.id === pendingMainId ? 'Résidence principale' : (p.usage === 'Résidence principale' ? 'Résidence secondaire' : (p.usage || 'Résidence secondaire'))
    }));
    setProperties(updated);
    saveProperties(updated);
    setShowConfirmModal(false);
    setPendingMainId(null);
  };

  const addProperty = () => {
    const newProp: Property = {
      id: Date.now().toString(),
      number: properties.length + 1,
      address: '',
      complement: '',
      type: 'Maison',
      usage: 'Résidence secondaire',
      workNature: 'Rénovation',
      isMain: false,
      isExpanded: true
    };
    const updated = [...properties, newProp];
    setProperties(updated);
    saveProperties(updated);
  };

  const updatePropertyField = (id: string, field: keyof Property, value: any) => {
    // Si l'utilisateur sélectionne "Résidence principale" manuellement dans le select d'un bien qui ne l'est pas encore
    if (field === 'usage' && value === 'Résidence principale') {
      const prop = properties.find(p => p.id === id);
      if (prop && !prop.isMain) {
        handleSetMainRequest(id);
        return;
      }
    }

    const updated = properties.map(p => p.id === id ? { ...p, [field]: value ?? '' } : p);
    setProperties(updated);
  };

  const handleSelectSuggestion = (id: string, feature: any) => {
    const fullAddress = feature.properties.label;
    const updated = properties.map(p => p.id === id ? { ...p, address: fullAddress } : p);
    setProperties(updated);
    setSuggestions([]);
    setActiveSearchId(null);
    saveProperties(updated);
  };

  const removeProperty = (id: string) => {
    if (confirm("Supprimer ce bien ?")) {
      const updated = properties.filter(p => p.id !== id);
      setProperties(updated);
      saveProperties(updated);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-gray-800">Liste des biens</h3>
          <p className="text-[11px] text-gray-400 font-medium italic">Gérez les différentes adresses chantiers du client</p>
        </div>
        <button 
          onClick={addProperty}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
        >
          <Plus size={16} /> 
          Ajouter un bien
        </button>
      </div>
      
      <div className="bg-[#f8f9fa] border border-gray-100 rounded-[28px] p-6 space-y-4" ref={searchRef}>
        {properties.map((prop) => (
          <div 
            key={prop.id} 
            className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${prop.isMain ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-gray-100'}`}
          >
            <div 
              className={`px-6 py-5 flex justify-between items-center cursor-pointer ${prop.isExpanded ? 'border-b border-gray-50' : ''}`}
              onClick={() => toggleExpand(prop.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${prop.isMain ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                   {prop.isMain ? <Star size={16} fill="currentColor" /> : <span className="text-[12px] font-black">{prop.number}</span>}
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-gray-900">Bien numéro {prop.number}</span>
                  <span className="text-[12px] text-gray-400 font-medium truncate max-w-[300px]">{prop.address || 'Sans adresse renseignée'}</span>
                </div>
                
                {/* ÉTIQUETTE DYNAMIQUE BASÉE SUR L'USAGE */}
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ml-2 ${
                  prop.isMain 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}>
                  {prop.usage || (prop.isMain ? 'Résidence principale' : 'Bien secondaire')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {!prop.isMain && (
                  <>
                    <button 
                      className="px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      onClick={(e) => { e.stopPropagation(); handleSetMainRequest(prop.id); }}
                    >
                      Définir principal
                    </button>
                    <button 
                      className="p-1.5 text-gray-200 hover:text-red-500 rounded transition-all"
                      onClick={(e) => { e.stopPropagation(); removeProperty(prop.id); }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <div className="text-gray-300 ml-2">
                  {prop.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {prop.isExpanded && (
              <div className="p-8 space-y-8 animate-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1.5 relative">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Adresse</label>
                    <div className="relative group">
                      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching && activeSearchId === prop.id ? 'text-indigo-500' : 'text-gray-300'}`} size={16} />
                      <input 
                        type="text" 
                        value={activeSearchId === prop.id ? searchQuery : prop.address} 
                        onFocus={() => {
                          setActiveSearchId(prop.id);
                          setSearchQuery(prop.address);
                        }}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          updatePropertyField(prop.id, 'address', e.target.value);
                        }}
                        onBlur={() => saveProperties(properties)}
                        placeholder="Rechercher l'adresse du bien..."
                        className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-10 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 shadow-sm transition-all" 
                      />
                      {isSearching && activeSearchId === prop.id && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Loader2 size={14} className="animate-spin text-indigo-500" />
                        </div>
                      )}
                    </div>

                    {activeSearchId === prop.id && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in zoom-in-95 duration-200">
                        {suggestions.map((feature: any) => (
                          <button
                            key={feature.properties.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault(); 
                              handleSelectSuggestion(prop.id, feature);
                            }}
                            className="w-full px-5 py-4 text-left hover:bg-indigo-50/50 flex items-start gap-4 border-b border-gray-50 last:border-0 group transition-all"
                          >
                            <div className="mt-1 p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover:text-indigo-600 group-hover:bg-white transition-all">
                              <MapPin size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-gray-900">{feature.properties.label}</span>
                              <span className="text-[11px] text-gray-400 font-medium">{feature.properties.postcode} {feature.properties.city}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Complément d'adresse</label>
                    <input 
                      type="text" 
                      placeholder="Appartement, étage..." 
                      value={prop.complement || ''}
                      onChange={(e) => updatePropertyField(prop.id, 'complement', e.target.value)}
                      onBlur={() => saveProperties(properties)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 shadow-sm placeholder:text-gray-300 transition-all" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Type de bien</label>
                    <div className="relative">
                      <select 
                        value={prop.type || 'Maison'}
                        onChange={(e) => { updatePropertyField(prop.id, 'type', e.target.value); saveProperties(properties.map(p => p.id === prop.id ? {...p, type: e.target.value} : p)); }}
                        className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                      >
                        <option>Maison</option>
                        <option>Appartement</option>
                        <option>Terrain</option>
                        <option>Local Pro</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Usage</label>
                    <div className="relative">
                      <select 
                        value={prop.usage || 'Résidence secondaire'}
                        onChange={(e) => { 
                          updatePropertyField(prop.id, 'usage', e.target.value); 
                          // Si ce n'est pas "Résidence principale" (qui gère sa propre confirmation), on sauve
                          if (e.target.value !== 'Résidence principale') {
                             const updated = properties.map(p => p.id === prop.id ? { ...p, usage: e.target.value } : p);
                             saveProperties(updated);
                          }
                        }}
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                      >
                        <option>Résidence principale</option>
                        <option>Résidence secondaire</option>
                        <option>Investissement locatif</option>
                        <option>Locaux commerciaux</option>
                        <option>Défiscalisation</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nature travaux</label>
                    <div className="relative">
                      <select 
                        value={prop.workNature || 'Rénovation'}
                        onChange={(e) => { updatePropertyField(prop.id, 'workNature', e.target.value); saveProperties(properties.map(p => p.id === prop.id ? {...p, workNature: e.target.value} : p)); }}
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                      >
                        <option value="Rénovation">Rénovation</option>
                        <option value="Extension">Extension</option>
                        <option value="Construction">Construction</option>
                        <option value="Professionnel">Professionnel</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-end pb-1">
                     <button 
                      onClick={() => saveProperties(properties)}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-500 hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                     >
                       <Save size={14} /> Sauvegarder
                     </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODALE DE CONFIRMATION BIEN PRINCIPAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center text-indigo-600 mb-8 shadow-inner">
                <Star size={40} fill="currentColor" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Définir comme bien principal ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">
                L'adresse de ce bien deviendra la référence principale pour ce client. L'ancien bien principal passera en usage "Secondaire".
              </p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => { setShowConfirmModal(false); setPendingMainId(null); }} 
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmSetAsMain} 
                  className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[13px] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPropertyInfo;