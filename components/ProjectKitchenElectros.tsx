
import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  ChevronDown, 
  Package, 
  Loader2, 
  Check, 
  HelpCircle,
  Zap,
  Droplets,
  RotateCcw,
  Plus,
  Euro,
  Tag,
  User,
  ShoppingCart,
  AlertTriangle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, deleteField } from '@firebase/firestore';
import AddProjectArticleModal from './AddProjectArticleModal';

// --- CONFIGURATION DES DIAGNOSTICS (ISSU DU CSV) ---

type QuestionType = 'single' | 'multi' | 'text';

interface Question {
  label: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
}

interface DiagnosticConfig {
  [key: string]: {
    label: string;
    questions: Question[];
  };
}

const DIAGNOSTIC_CONFIG: DiagnosticConfig = {
  "Four": {
    label: "FOUR",
    questions: [
      { label: "Fréquence d'utilisation ?", type: 'single', options: ["1x / jour", "3x / semaine", "1x / semaine", "1x / mois", "Jamais"] },
      { label: "Vos attentes ?", type: 'multi', options: ["Simple d'utilisation", "Très esthétique", "Optimisation des valeurs nutritives (vapeur)", "Pratique à nettoyer", "Choix technologies (chaleur sèche, humide, sous vide, basse temp, airfryer)", "Force de proposition recettes", "Aide préparation plats", "Connecté"] },
      { label: "Type de nettoyage ?", type: 'single', options: ["Pyrolyse impérative", "Pyrolyse occasionnelle", "Manuel avec aide (Vapor clean)", "Manuel classique", "Catalyse", "Indifférent"] },
      { label: "Positionnement ?", type: 'single', options: ["En hauteur", "Sous plan de travail", "Indifférent"] },
      { label: "Technologies et accessoirisations ?", type: 'multi', options: ["Vapeur / chaleur humide", "Airfryer", "Cuisson sous vide", "Rails télescopiques", "Sonde de cuisson", "Connecté", "Porte démontable"] },
      { label: "Commentaires", type: 'text', placeholder: "Précisions sur le four..." }
    ]
  },
  "Micro-ondes": {
    label: "MICRO-ONDES",
    questions: [
      { label: "Fréquence d'utilisation ?", type: 'single', options: ["Plusieurs fois / jour", "1x / jour", "3x / semaine", "1x / semaine", "Jamais"] },
      { label: "Utilisation(s) ?", type: 'multi', options: ["Réchauffer", "Décongeler", "Griller"] },
      { label: "Servir de 2° four de cuisson ?", type: 'single', options: ["Oui", "Non", "Indifférent"] },
      { label: "Agencement ?", type: 'single', options: ["Encastré en hauteur", "Posé sur plan de travail", "Indifférent"] },
      { label: "Design ?", type: 'single', options: ["Visible", "Invisible", "Indifférent"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Tiroir chauffe-plat": {
    label: "TIROIR CHAUFFE-PLAT",
    questions: [
      { label: "Fonction(s) ?", type: 'multi', options: ["Maintien au chaud assiette", "Maintien au chaud plat", "Décongélation", "Cuisson basse température"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Cafetière": {
    label: "CAFETIÈRE",
    questions: [
      { label: "Agencement ?", type: 'single', options: ["Encastrée", "Posée sur plan de travail", "Indifférent"] },
      { label: "Si encastrée, fonctions souhaitées ?", type: 'multi', options: ["Diversité préparations (expresso, capuccino...)", "Multi-réservoirs (grains, déca...)", "Facilité d'entretien"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Plaque de cuisson": {
    label: "PLAQUE DE CUISSON",
    questions: [
      { label: "Fréquence d'utilisation ?", type: 'single', options: ["Plusieurs fois / jour", "1x / jour", "3x / semaine", "1x / semaine", "Jamais"] },
      { label: "Technologie(s) ?", type: 'multi', options: ["Induction", "Gaz", "Halogène/radiant", "Tepan Yaki", "Friteuse", "Wok"] },
      { label: "Agencement ?", type: 'single', options: ["Îlot central", "Contre le mur", "Indifférent"] },
      { label: "Zones régulières simultanées ?", type: 'single', options: ["1 zone", "2 zones", "3 zones", "4 zones"] },
      { label: "Zones maximum nécessaires ?", type: 'single', options: ["2 zones", "3 zones", "4 zones", "+ de 4 zones"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Hotte": {
    label: "HOTTE",
    questions: [
      { label: "Utilisation actuelle ?", type: 'single', options: ["Systématiquement", "Souvent", "Rarement", "Jamais"] },
      { label: "Si peu utilisée, pourquoi ?", type: 'multi', options: ["Graisse ne me dérange pas", "Odeurs ne me dérangent pas", "Trop bruyante", "Trop d'entretien", "Pas efficace", "Pas le réflexe", "Préfère ouvrir la fenêtre", "Faible utilisation plaque", "Autre"] },
      { label: "Vos attentes ?", type: 'multi', options: ["Traitement graisse", "Traitement odeurs", "Niveau sonore faible", "Entretien facile", "Allumage auto", "Design", "Eclairage", "Autre"] },
      { label: "Design ?", type: 'single', options: ["Hotte visible", "Hotte cachée", "Indifférent"] },
      { label: "Installation ?", type: 'single', options: ["Recyclage", "Evacuation extérieure", "Indifférent"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Réfrigérateur": {
    label: "RÉFRIGÉRATEUR",
    questions: [
      { label: "Design ?", type: 'single', options: ["Visible", "Caché", "Indifférent"] },
      { label: "Type ?", type: 'single', options: ["Intégrable tout utile", "Intégrable compartiment congel", "Intégrable combiné", "Intégrable grande largeur", "Visible tout utile", "Visible combiné", "Visible grande largeur", "French door", "Frigo américain"] },
      { label: "Autre réfrigérateur/congélateur dans la maison ?", type: 'single', options: ["Oui : réfrigérateur", "Oui : congélateur", "Oui : les deux", "Non"] },
      { label: "Volume de conservation ?", type: 'single', options: ["XXL (> 400L)", "Important (300L)", "Moyen (200L)", "Faible (100L)"] },
      { label: "Vos attentes ?", type: 'multi', options: ["Conservation longue durée", "Glaçons", "Eau fraîche", "Filtres anti-odeurs", "Silencieux", "Eco énergie", "Indépendance frigo/congel", "Pas de givre"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Congélateur": {
    label: "CONGÉLATEUR (INDÉPENDANT)",
    questions: [
      { label: "Design ?", type: 'single', options: ["Visible", "Caché", "Indifférent"] },
      { label: "Modèle ?", type: 'single', options: ["Coffre", "Vertical", "Indifférent"] },
      { label: "Volume de conservation ?", type: 'single', options: ["XXL (> 300L)", "Important (200L)", "Normal (100L)", "Faible (< 100L)"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Cave à vins": {
    label: "CAVE À VINS",
    questions: [
      { label: "Objectif(s) ?", type: 'multi', options: ["Vieillissement", "Mise en température", "Les deux", "Indifférent"] },
      { label: "Agencement ?", type: 'single', options: ["Visible", "Caché", "Indifférent"] },
      { label: "Capacité (bouteilles) ?", type: 'single', options: ["- de 10", "10 à 20", "20 à 50", "50 à 100", "+ de 100"] },
      { label: "Zones de température ?", type: 'single', options: ["1", "2", "3", "Indifférent"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Lave-vaisselle": {
    label: "LAVE-VAISSELLE",
    questions: [
      { label: "Fréquence d'utilisation ?", type: 'single', options: ["Plusieurs fois / jour", "1x / jour", "3x / semaine", "1x / semaine", "- de 1x / semaine"] },
      { label: "Positionnement ?", type: 'single', options: ["En hauteur", "Sous plan de travail", "Indifférent"] },
      { label: "Hauteur ?", type: 'single', options: ["Standard 820mm", "Optimisé 860mm", "Indifférent"] },
      { label: "Programmes importants ?", type: 'multi', options: ["Automatique", "Hygiène", "Verres fragiles", "Auto-nettoyant", "Silence", "Express", "Economique"] },
      { label: "Technologies et accessoirisations ?", type: 'multi', options: ["3° tiroir à couverts", "Départ différé", "Infolight", "Flexibilité rangement", "Ouverture auto fin cycle", "Cuve inox", "Paniers accessoirisés"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Lave-linge": {
    label: "LAVE-LINGE",
    questions: [
      { label: "Design ?", type: 'single', options: ["Visible", "Caché", "Indifférent"] },
      { label: "Modèle ?", type: 'single', options: ["Hublot", "Par-dessus", "Indifférent"] },
      { label: "Fonction ?", type: 'single', options: ["Lavage", "Lavage/séchage"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Evier": {
    label: "EVIER",
    questions: [
      { label: "Nombre de bacs ?", type: 'single', options: ["1 bac", "1 bac + vide-sauce", "2 bacs"] },
      { label: "Largeur bac principal ?", type: 'single', options: ["- de 35 cm", "35 à 45 cm", "45 à 55 cm", "55 à 70 cm", "+ de 70 cm"] },
      { label: "Intégration ?", type: 'single', options: ["Encastré", "À fleur", "Sous-plan", "À poser", "Indifférent"] },
      { label: "Matériau ?", type: 'single', options: ["Quartz", "Inox", "Céramique", "Indifférent"] },
      { label: "Égouttoir souhaité ?", type: 'single', options: ["Oui", "Non", "Indifférent"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Mitigeur": {
    label: "MITIGEUR",
    questions: [
      { label: "Type ?", type: 'single', options: ["Sans douchette", "Avec douchette", "Indifférent"] },
      { label: "Coloris ?", type: 'multi', options: ["Chrome", "Inox mat", "Noir", "Cuivre", "Laiton", "Or", "Bronze", "Indifférent"] },
      { label: "Design ?", type: 'single', options: ["Col de cygne", "Coudée 90°", "Escamotable fenêtre", "Professionnel", "Indifférent"] },
      { label: "Technologie(s) ?", type: 'multi', options: ["Filtration eau pure", "Eau bouillante", "Eau fraîche", "Eau gazeuse", "Aucune"] },
      { label: "Commentaires", type: 'text' }
    ]
  },
  "Distributeur savon": { label: "DISTRIBUTEUR SAVON", questions: [{ label: "Commentaires", type: 'text' }] },
  "Égouttoir pliable": { label: "ÉGOUTTOIR PLIABLE", questions: [{ label: "Commentaires", type: 'text' }] },
  "Vidage automatique": { label: "VIDAGE AUTOMATIQUE", questions: [{ label: "Commentaires", type: 'text' }] },
  "Panier égouttoir": { label: "PANIER ÉGOUTTOIR", questions: [{ label: "Commentaires", type: 'text' }] },
  "Planche à découper": { label: "PLANCHE À DÉCOUPER / ÉGOUTTOIR", questions: [{ label: "Commentaires", type: 'text' }] },
  "Bonde + trop-plein": { label: "BONDE + TROP-PLEIN", questions: [{ label: "Commentaires", type: 'text' }] },
  "Cache bonde": { label: "CACHE BONDE", questions: [{ label: "Commentaires", type: 'text' }] },
};

// --- COMPOSANTS UI ---

const QuestionField: React.FC<{ 
  question: Question, 
  value: any, 
  onChange: (v: any) => void 
}> = ({ question, value, onChange }) => {
  if (question.type === 'single') {
    return (
      <div className="space-y-3">
        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{question.label}</label>
        <div className="flex flex-wrap gap-2">
          {question.options?.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                value === opt ? 'bg-gray-900 border-gray-900 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'multi') {
    const current = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      const next = current.includes(opt) ? current.filter(v => v !== opt) : [...current, opt];
      onChange(next);
    };

    return (
      <div className="space-y-3">
        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{question.label}</label>
        <div className="flex flex-wrap gap-2">
          {question.options?.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-all flex items-center gap-2 ${
                current.includes(opt) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
              }`}
            >
              {current.includes(opt) && <Check size={14} />}
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{question.label}</label>
      <textarea
        rows={2}
        placeholder={question.placeholder || "Saisissez ici..."}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[13px] font-medium text-gray-800 outline-none focus:bg-white focus:border-gray-300 transition-all resize-none shadow-inner"
      />
    </div>
  );
};

const ToggleButton = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onChange(!value); }}
    className={`relative h-7 w-12 rounded-full transition-colors duration-200 ease-in-out border-2 ${value ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-200 border-gray-200'}`}
  >
    <span 
      className={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

interface AccordionItemProps {
  title: string;
  onReset: () => void;
  diagnosticData: any;
  onDiagnosticUpdate: (updates: any) => void;
  itemData: any;
  onItemUpdate: (updates: any) => void;
  isElectro?: boolean;
  onAddArticle: () => void;
  onRemoveArticle: (articleId: string) => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ 
  title, 
  onReset, 
  diagnosticData, 
  onDiagnosticUpdate,
  itemData,
  onItemUpdate,
  isElectro = true,
  onAddArticle,
  onRemoveArticle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = DIAGNOSTIC_CONFIG[title] || { label: title, questions: [] };
  
  const isFilled = diagnosticData && Object.keys(diagnosticData).length > 0;
  const isDesired = itemData?.isDesired ?? false;
  const quiFournit = itemData?.quiFournit || 'A fournir';
  const articles = itemData?.articles || [];

  const totalMin = articles.reduce((acc: number, art: any) => acc + (Number(art.prixMiniTTC) || 0), 0);
  const totalMax = articles.reduce((acc: number, art: any) => acc + (Number(art.prixMaxiTTC) || 0), 0);

  const handleToggleDesired = (val: boolean) => {
    onItemUpdate({ ...itemData, isDesired: val });
    // Ouvrir automatiquement si on active
    if (val) setIsOpen(true);
    else setIsOpen(false);
  };

  return (
    <div className={`bg-white border rounded-[24px] overflow-hidden transition-all duration-300 ${isDesired && isOpen ? 'border-indigo-100 shadow-xl ring-4 ring-indigo-50/30' : 'border-gray-100 shadow-sm hover:border-gray-200'}`}>
      {/* Header */}
      <div 
        className={`px-6 py-5 flex flex-col gap-4 cursor-pointer group ${!isDesired ? 'opacity-70 hover:opacity-100' : ''}`}
        onClick={() => { if (isDesired) setIsOpen(!isOpen); }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl transition-colors relative ${isDesired ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {isElectro ? <Zap size={20} /> : <Droplets size={20} />}
              {isFilled && isDesired && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex flex-col">
              <h4 className={`text-[15px] font-black uppercase tracking-tight ${isDesired ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Le client désire :</span>
                <ToggleButton value={isDesired} onChange={handleToggleDesired} />
                <span className={`text-[10px] font-bold uppercase ${isDesired ? 'text-indigo-600' : 'text-gray-400'}`}>{isDesired ? 'OUI' : 'NON'}</span>
              </div>
            </div>
          </div>

          {isDesired && (
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total Estimé</p>
                <p className="text-[14px] font-black text-indigo-600">{totalMin === totalMax ? `${totalMin} €` : `${totalMin} - ${totalMax} €`}</p>
              </div>
              <div className={`p-1 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-300'}`}>
                <ChevronDown size={22} />
              </div>
            </div>
          )}
        </div>

        {/* Synthèse visuelle (Visible si désiré) */}
        {isDesired && (
          <div className="w-full pt-2 border-t border-gray-50 mt-1 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1">
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
               <User size={12} className="text-gray-400" />
               <span className="text-[11px] font-bold text-gray-700">Fourni par : <span className="text-indigo-600">{quiFournit}</span></span>
             </div>
             
             {articles.map((art: any, idx: number) => (
               <div key={idx} className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                 <Package size={12} className="text-indigo-400" />
                 <span className="text-[11px] font-bold text-indigo-900 truncate max-w-[200px]">
                   {art.collection ? `${art.collection} - ` : ''}{art.descriptif}
                 </span>
                 <span className="text-[10px] font-mono text-indigo-500 ml-1">
                   ({art.prixMiniTTC}€ - {art.prixMaxiTTC}€)
                 </span>
               </div>
             ))}

             {articles.length === 0 && (
               <span className="text-[11px] font-medium text-gray-400 italic flex items-center gap-1">
                 <AlertTriangle size={12} /> Aucun article sélectionné
               </span>
             )}
          </div>
        )}
      </div>

      {isDesired && isOpen && (
        <div className="px-8 pb-8 pt-4 space-y-10 animate-in slide-in-from-top-2 duration-300 border-t border-gray-100">
          
          {/* 1. QUI FOURNIT */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Responsable fourniture</label>
               {isFilled && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onReset(); }}
                  className="text-[10px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Réinitialiser le diagnostic
                </button>
              )}
            </div>
            <div className="relative group w-full md:w-1/3">
              <select 
                value={quiFournit}
                onChange={(e) => onItemUpdate({ ...itemData, quiFournit: e.target.value })}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-indigo-400 transition-all shadow-sm"
              >
                <option value="le client">Le client</option>
                <option value="A fournir">A fournir</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
            </div>
          </div>

          {/* 2. ARTICLES (Conditionnel) */}
          {quiFournit === 'A fournir' && (
            <div className="space-y-6 bg-[#FBFBFB] border border-gray-100 rounded-[24px] p-6">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-[12px] font-black text-gray-800 uppercase tracking-tight">Sélection produits</h5>
                <button 
                  onClick={onAddArticle}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-700 shadow-sm hover:border-indigo-600 transition-all active:scale-95"
                >
                  <Plus size={14} /> Ajouter un article
                </button>
              </div>

              {articles.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Référence / Marque</th>
                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Prix mini TTC</th>
                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Prix maxi TTC</th>
                        <th className="px-6 py-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {articles.map((art: any, idx: number) => (
                        <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-[13px] font-bold text-gray-400 italic">
                            {art.collection || '-'}
                          </td>
                          <td className="px-6 py-4 text-[13px] font-bold text-gray-800">
                            {art.descriptif}
                          </td>
                          <td className="px-6 py-4 text-[13px] font-black text-gray-900 text-center">
                            {art.prixMiniTTC?.toLocaleString()} €
                          </td>
                          <td className="px-6 py-4 text-[13px] font-black text-indigo-600 text-center">
                            {art.prixMaxiTTC?.toLocaleString()} €
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => onRemoveArticle(art.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                  <ShoppingCart size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-[11px] font-bold text-gray-400 italic">Aucun article sélectionné.</p>
                </div>
              )}
            </div>
          )}

          {/* 3. DIAGNOSTIC */}
          <div className="space-y-8 pt-4 border-t border-gray-50">
            <h5 className="text-[12px] font-black text-gray-800 uppercase tracking-tight px-1">Diagnostic technique</h5>
            <div className="grid grid-cols-1 gap-8">
              {config.questions.map((q, idx) => (
                <QuestionField 
                  key={idx} 
                  question={q} 
                  value={diagnosticData?.[q.label]} 
                  onChange={(v) => onDiagnosticUpdate({ ...diagnosticData, [q.label]: v })}
                />
              ))}
            </div>
            {config.questions.length === 0 && (
               <div className="py-6 text-center bg-gray-50 border border-dashed border-gray-200 rounded-[20px]">
                 <p className="text-[11px] font-bold text-gray-400 italic">Pas de questions spécifiques.</p>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---

interface ProjectKitchenElectrosProps {
  project: any;
  userProfile: any;
}

const ProjectKitchenElectros: React.FC<ProjectKitchenElectrosProps> = ({ project, userProfile }) => {
  const [activeItemForModal, setActiveItemForModal] = useState<{ title: string, mode: 'Electromenager' | 'Sanitaire' } | null>(null);

  const electroTypes = Object.keys(DIAGNOSTIC_CONFIG).slice(0, 11); // Les 11 premiers sont des électros
  const sanitaireTypes = Object.keys(DIAGNOSTIC_CONFIG).slice(11); // Le reste sont des sanitaires

  const diagnostics = project.details?.kitchen?.diagnostics || {};
  const items = project.details?.kitchen?.items || {}; // Contiendra quiFournit et articles[] par item

  const handleResetDiagnostic = async (type: string) => {
    if (!window.confirm(`Réinitialiser le diagnostic de l'item "${type}" ?`)) return;
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`details.kitchen.diagnostics.${type}`]: deleteField()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDiagnostic = async (type: string, updates: any) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`details.kitchen.diagnostics.${type}`]: updates
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateItem = async (type: string, updates: any) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`details.kitchen.items.${type}`]: updates
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveArticle = async (type: string, articleId: string) => {
    try {
      const currentItem = items[type] || {};
      const currentArticles = currentItem.articles || [];
      const updatedArticles = currentArticles.filter((a: any) => a.id !== articleId);
      
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`details.kitchen.items.${type}.articles`]: updatedArticles
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* 1. SECTION ELECTRO */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="p-3 bg-gray-900 text-white rounded-2xl shadow-lg"><Zap size={24} /></div>
          <div>
            <h3 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Liste des électroménagers</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Complétez les diagnostics pour chaque équipement</p>
          </div>
        </div>

        <div className="space-y-4">
          {electroTypes.map(type => (
            <AccordionItem 
              key={type}
              title={type}
              isElectro={true}
              diagnosticData={diagnostics[type] || {}}
              onReset={() => handleResetDiagnostic(type)}
              onDiagnosticUpdate={(up) => handleUpdateDiagnostic(type, up)}
              itemData={items[type] || { quiFournit: 'A fournir', articles: [], isDesired: false }}
              onItemUpdate={(up) => handleUpdateItem(type, up)}
              onAddArticle={() => setActiveItemForModal({ title: type, mode: 'Electromenager' })}
              onRemoveArticle={(artId) => handleRemoveArticle(type, artId)}
            />
          ))}
        </div>
      </div>

      {/* 2. SECTION SANITAIRE */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Droplets size={24} /></div>
          <div>
            <h3 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Liste des sanitaires</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Accessoires et équipements d'eau</p>
          </div>
        </div>

        <div className="space-y-4">
          {sanitaireTypes.map(type => (
            <AccordionItem 
              key={type}
              title={type}
              isElectro={false}
              diagnosticData={diagnostics[type] || {}}
              onReset={() => handleResetDiagnostic(type)}
              onDiagnosticUpdate={(up) => handleUpdateDiagnostic(type, up)}
              itemData={items[type] || { quiFournit: 'A fournir', articles: [], isDesired: false }}
              onItemUpdate={(up) => handleUpdateItem(type, up)}
              onAddArticle={() => setActiveItemForModal({ title: type, mode: 'Sanitaire' })}
              onRemoveArticle={(artId) => handleRemoveArticle(type, artId)}
            />
          ))}
        </div>
      </div>

      {/* MODALE D'AJOUT D'ARTICLE */}
      {activeItemForModal && (
        <AddProjectArticleModal 
          isOpen={true}
          onClose={() => setActiveItemForModal(null)}
          mode={activeItemForModal.mode}
          project={project}
          userProfile={userProfile}
          onArticleSelected={async (article) => {
            const type = activeItemForModal.title;
            const currentItem = items[type] || { quiFournit: 'A fournir', articles: [], isDesired: true };
            const updatedArticles = [...(currentItem.articles || []), { ...article, id: article.id || `custom_${Date.now()}` }];
            
            const projectRef = doc(db, 'projects', project.id);
            // On force isDesired à true si on ajoute un article
            await updateDoc(projectRef, {
              [`details.kitchen.items.${type}.articles`]: updatedArticles,
              [`details.kitchen.items.${type}.isDesired`]: true
            });
          }}
        />
      )}

    </div>
  );
};

export default ProjectKitchenElectros;
