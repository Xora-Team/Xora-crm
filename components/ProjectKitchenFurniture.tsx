
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Minus, 
  Check, 
  Search, 
  Layers, 
  MoveHorizontal, 
  Layout, 
  Users, 
  Activity, 
  Sparkles, 
  Droplets, 
  Utensils, 
  TrendingUp, 
  VolumeX,
  Target
} from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, updateDoc } from '@firebase/firestore';

// --- Sous-composants UI modernisés (Design épuré XORA) ---

const Section = ({ title, children, icon: Icon }: { title: string; children?: React.ReactNode; icon?: any }) => (
  <div className="bg-white border border-gray-100 rounded-[24px] p-8 space-y-6 shadow-sm mb-6">
    <h3 className="text-[15px] font-bold text-gray-800 flex items-center gap-3">
      {Icon && <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400"><Icon size={16} /></div>}
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6">
      {children}
    </div>
  </div>
);

const SubHeader = ({ title }: { title: string }) => (
  <div className="col-span-12 pt-2 pb-1 border-b border-gray-50 mb-2">
    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">{title}</h4>
  </div>
);

const Field = ({ label, children, colSpan = "col-span-12 md:col-span-4" }: { label: string; children?: React.ReactNode; colSpan?: string }) => (
  <div className={colSpan}>
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
    {children}
  </div>
);

// Dropdown Moderne - Affichage propre sans accolades
const CustomDropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Sélectionner", 
  multiple = false 
}: { 
  value: any, 
  onChange: (v: any) => void, 
  options: string[], 
  placeholder?: string,
  multiple?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const newValue = current.includes(opt)
        ? current.filter(v => v !== opt)
        : [...current, opt];
      onChange(newValue);
    } else {
      onChange(opt);
      setIsOpen(false);
    }
  };

  const displayValue = () => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      if (current.length === 0) return placeholder;
      return current.join(', ');
    }
    return value || placeholder;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white border rounded-[14px] px-4 py-3 text-[14px] transition-all duration-200 ${
          isOpen 
            ? 'border-gray-900 ring-4 ring-gray-50 shadow-sm' 
            : 'border-gray-200 hover:border-gray-300 shadow-sm'
        }`}
      >
        <span className={`font-bold truncate ${!value || (multiple && value.length === 0) ? 'text-gray-400' : 'text-gray-900'}`}>
          {displayValue()}
        </span>
        {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-[18px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[250px] overflow-y-auto py-2 px-2 custom-scrollbar">
            {options.map((opt) => {
              const isSelected = multiple 
                ? (Array.isArray(value) && value.includes(opt))
                : value === opt;
              
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-xl transition-all mb-0.5 group ${
                    isSelected 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-[13px] ${isSelected ? 'font-bold' : 'font-medium'}`}>{opt}</span>
                  {isSelected && <Check size={14} className={isSelected ? 'text-white' : 'text-gray-400'} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Input numérique - Le design de référence
const NumberInput = ({ value, onChange, unit }: { value: any; onChange: (v: number) => void; unit?: string }) => (
  <div className="relative group">
    <input 
      type="number" 
      value={value || ''} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-white border border-gray-200 rounded-[14px] px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-50 transition-all shadow-sm"
    />
    {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase tracking-widest">{unit}</span>}
  </div>
);

// TextArea - Calqué sur le design de l'input numérique
const LongTextField = ({ value, onChange, placeholder = "Saisir ici...", rows = 3 }: any) => (
  <textarea 
    rows={rows}
    placeholder={placeholder}
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-white border border-gray-200 rounded-[14px] p-4 text-[14px] font-bold text-gray-900 outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-50 transition-all resize-none shadow-sm"
  />
);

const UsageCounter = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="flex-1 space-y-2">
    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block text-center">{label}</span>
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-[14px] px-4 py-2.5 shadow-sm">
      <button type="button" onClick={() => onChange(Math.max(0, (value || 0) - 1))} className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"><Minus size={14} /></button>
      <span className="text-[15px] font-black text-gray-900">{value || 0}</span>
      <button type="button" onClick={() => onChange((value || 0) + 1)} className="w-8 h-8 bg-[#1A1C23] text-white rounded-lg flex items-center justify-center hover:bg-black shadow-md transition-all"><Plus size={14} /></button>
    </div>
  </div>
);

const VisualMultiSelect = ({ value, onChange, options }: { value: string[], onChange: (v: string[]) => void, options: { label: string, icon: any }[] }) => {
  const toggleOption = (label: string) => {
    const current = Array.isArray(value) ? value : [];
    const newValue = current.includes(label)
      ? current.filter(v => v !== label)
      : [...current, label];
    onChange(newValue);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {options.map((opt) => {
        const isSelected = Array.isArray(value) && value.includes(opt.label);
        const Icon = opt.icon;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => toggleOption(opt.label)}
            className={`flex flex-col items-center justify-center p-5 rounded-[20px] border-2 transition-all duration-300 group relative ${
              isSelected 
                ? 'bg-indigo-50 border-indigo-600 shadow-lg shadow-indigo-100' 
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl mb-2 transition-all duration-300 ${
              isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:text-gray-900 group-hover:bg-white'
            }`}>
              <Icon size={20} />
            </div>
            <span className={`text-[10px] font-black text-center leading-tight uppercase tracking-tight ${
              isSelected ? 'text-indigo-900' : 'text-gray-500 group-hover:text-gray-900'
            }`}>
              {opt.label}
            </span>
            {isSelected && (
              <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5 animate-in zoom-in duration-200">
                <Check size={10} strokeWidth={4} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface ProjectKitchenFurnitureProps {
  project: any;
}

const ProjectKitchenFurniture: React.FC<ProjectKitchenFurnitureProps> = ({ project }) => {
  const handleUpdate = async (field: string, value: any) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { [field]: value });
    } catch (e) {
      console.error("Erreur update meubles:", e);
    }
  };

  const furnitureData = project.details?.kitchen?.furniture || {};

  const objectifsOptions = [
    { label: "Plus de rangements", icon: Layers },
    { label: "Plus de convivialité", icon: Users },
    { label: "Meilleure ergonomie", icon: Activity },
    { label: "Design moderne", icon: Sparkles },
    { label: "Facilité d'entretien", icon: Droplets },
    { label: "Espace de repas intégré", icon: Utensils },
    { label: "Valorisation immobilière", icon: TrendingUp },
    { label: "Réduction sonore", icon: VolumeX }
  ];

  return (
    <div className="animate-in fade-in duration-300 pb-10">
      
      {/* 0. Objectifs nouvelle cuisine (DÉPLACÉ EN HAUT) */}
      <Section title="Objectifs nouvelle cuisine" icon={Target}>
        <div className="col-span-12">
          <VisualMultiSelect 
            value={furnitureData.objectifsCuisine || []} 
            options={objectifsOptions} 
            onChange={(v: string[]) => handleUpdate('details.kitchen.furniture.objectifsCuisine', v)} 
          />
        </div>
      </Section>

      {/* 1. Rangements */}
      <Section title="Rangements" icon={Layers}>
        <Field label="Volume de rangement actuel" colSpan="col-span-12 md:col-span-6">
          <CustomDropdown 
            value={furnitureData.volumeActuel} 
            options={['Insuffisant', 'Suffisant', 'Excessif']} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.volumeActuel', v)} 
          />
        </Field>
        <Field label="Volume de rangement souhaité" colSpan="col-span-12 md:col-span-6">
          <CustomDropdown 
            value={furnitureData.volumeSouhaite} 
            options={['1 = Minimum nécessaire', '2 = Normal', '3 = Important', '4 = Très important', '5 = XXL']} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.volumeSouhaite', v)} 
          />
        </Field>
      </Section>

      {/* 2. Type de rangements */}
      <Section title="Type de rangements" icon={Layout}>
        <Field label="Meubles bas (Sélection multiple)" colSpan="col-span-12 md:col-span-4">
          <CustomDropdown 
            multiple
            value={furnitureData.typeMeublesBas || []} 
            options={['Bouteilles (vertical)', 'Bouteilles (horizontal)', 'Pain', 'Epices', 'casseroles', 'Poëles', 'Vaisselle', 'Produits ménagers', 'couverts', 'grands ustensiles', 'torchon', 'alimentaire', 'occupant l\'angle']} 
            onChange={(v: string[]) => handleUpdate('details.kitchen.furniture.typeMeublesBas', v)} 
          />
        </Field>
        <Field label="Meubles hauts (Sélection multiple)" colSpan="col-span-12 md:col-span-4">
          <CustomDropdown 
            multiple
            value={furnitureData.typeMeublesHauts || []} 
            options={['Meuble portes battantes', 'Meuble portes relevables', 'Meuble ouvert', 'Meuble avec hotte', 'Vitrine', 'Etagères', 'Meuble jusqu\'au plafond', 'Meubles petites hauteur', 'Meubles hauts classiques']} 
            onChange={(v: string[]) => handleUpdate('details.kitchen.furniture.typeMeublesHauts', v)} 
          />
        </Field>
        <Field label="Colonnes (Sélection multiple)" colSpan="col-span-12 md:col-span-4">
          <CustomDropdown 
            multiple
            value={furnitureData.colonnes || []} 
            options={['Epicier lg 300/400', 'Avec tiroirs intérieurs lg 500/600', 'Etagères', 'Bibliothèque', 'Ht 1/2 armoire', 'Toute hauteur', 'Balai', 'Profondeur réduite', 'Occupant l\'angle']} 
            onChange={(v: string[]) => handleUpdate('details.kitchen.furniture.colonnes', v)} 
          />
        </Field>

        <Field label="Description meubles bas" colSpan="col-span-12 md:col-span-4">
          <LongTextField rows={1} value={furnitureData.descMeublesBas} onChange={(v: string) => handleUpdate('details.kitchen.furniture.descMeublesBas', v)} />
        </Field>
        <Field label="Description meubles haut" colSpan="col-span-12 md:col-span-4">
          <LongTextField rows={1} value={furnitureData.descMeublesHauts} onChange={(v: string) => handleUpdate('details.kitchen.furniture.descMeublesHauts', v)} />
        </Field>
        <Field label="Description colonnes" colSpan="col-span-12 md:col-span-4">
          <LongTextField rows={1} value={furnitureData.descColonnes} onChange={(v: string) => handleUpdate('details.kitchen.furniture.descColonnes', v)} />
        </Field>

        <Field label="Gestion des déchets (Sélection multiple)" colSpan="col-span-12 md:col-span-4">
          <CustomDropdown 
            multiple
            value={furnitureData.gestionDechets || []} 
            options={['1 bac XXL 40 litres', '2 bac XXL 40 litres', '1 grand bac 30 litres', '2 grands bacs 30 litres', '1 grand bac 25 litres', '2 grands bacs 25 litres', '1 bac 20 litres', '2 bacs 20 litres', '1 bac standard 15 litres', '2 bacs standart 15 litres', '1 bac compost 5 litres', '1 bac verre', 'Poubelle extérieur meuble', 'Vide déchet sur plan de travail', 'Pas de poubelle']} 
            onChange={(v: string[]) => handleUpdate('details.kitchen.furniture.gestionDechets', v)} 
          />
        </Field>
        <Field label="Description Gestion des déchets" colSpan="col-span-12 md:col-span-8">
          <LongTextField rows={1} value={furnitureData.descGestionDechets} onChange={(v: string) => handleUpdate('details.kitchen.furniture.descGestionDechets', v)} />
        </Field>
      </Section>

      {/* 3. Accessoire de meuble */}
      <Section title="Accessoire de meuble" icon={Plus}>
        <Field label="Sélectionner les accessoires" colSpan="col-span-12 md:col-span-6">
          <CustomDropdown 
            multiple
            value={furnitureData.accessoires || []} 
            options={['Bloc prise', 'Bloc prise avec USB-A', 'Bloc prise avec USB-C', 'Chargeur induction', 'Organiseur sous-évier', 'Coulissant bouteilles', 'Coulissant pain-bouteilles', 'Rangement éponges', 'Portes torchons', 'Range couvercles de casserolles', 'Casier couvert', 'escabeau pliant', 'Portes verres', 'Portes mug', 'Barres de crédence']} 
            onChange={(v: string[]) => handleUpdate('details.kitchen.furniture.accessoires', v)} 
          />
        </Field>
        <Field label="Commentaire" colSpan="col-span-12 md:col-span-6">
          <LongTextField 
            rows={1}
            value={furnitureData.commentaireAccessoires} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.commentaireAccessoires', v)} 
          />
        </Field>
      </Section>

      {/* 4. Plans (Nouveau Bloc regroupé) */}
      <Section title="Plans" icon={MoveHorizontal}>
        
        {/* Sous-bloc : Plan de travail */}
        <SubHeader title="Plan de travail" />
        <Field label="Hauteur actuelle" colSpan="col-span-12 md:col-span-6">
          <NumberInput unit="mm" value={furnitureData.hauteurPlanActuelle} onChange={(v) => handleUpdate('details.kitchen.furniture.hauteurPlanActuelle', v)} />
        </Field>
        <Field label="Hauteur souhaitée" colSpan="col-span-12 md:col-span-6">
          <NumberInput unit="mm" value={furnitureData.hauteurPlanSouhaitee} onChange={(v) => handleUpdate('details.kitchen.furniture.hauteurPlanSouhaitee', v)} />
        </Field>

        {/* Sous-bloc : Plan de dépose */}
        <div className="col-span-12 mt-4">
          <SubHeader title="Plan de dépose" />
        </div>
        <Field label="Appareil.s à poser" colSpan="col-span-12 md:col-span-6">
          <CustomDropdown 
            multiple
            value={furnitureData.appareilsAPoser || []} 
            options={['Cafetière', 'Grille-pain', 'Robot culinaire', 'Micro-ondes', 'Bouilloire', 'Plancha', 'Airfryer', 'Balance']} 
            onChange={(v: string[]) => handleUpdate('details.kitchen.furniture.appareilsAPoser', v)} 
          />
        </Field>
        <Field label="Longueur à prévoir" colSpan="col-span-12 md:col-span-2">
          <NumberInput unit="mm" value={furnitureData.longueurDepose} onChange={(v) => handleUpdate('details.kitchen.furniture.longueurDepose', v)} />
        </Field>
        <Field label="Description" colSpan="col-span-12 md:col-span-4">
          <LongTextField 
            rows={1}
            value={furnitureData.descriptionDepose} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.descriptionDepose', v)} 
          />
        </Field>

        {/* Sous-bloc : Plan de préparation */}
        <div className="col-span-12 mt-4">
          <SubHeader title="Plan de préparation" />
        </div>
        <Field label="Longueur à prévoir" colSpan="col-span-12 md:col-span-4">
          <NumberInput unit="mm" value={furnitureData.longueurPreparation} onChange={(v) => handleUpdate('details.kitchen.furniture.longueurPreparation', v)} />
        </Field>
        <Field label="Description" colSpan="col-span-12 md:col-span-8">
          <LongTextField 
            rows={1}
            value={furnitureData.descriptionDechetsPrepa} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.descriptionDechetsPrepa', v)} 
          />
        </Field>
      </Section>

      {/* 5. Espace Repas */}
      <Section title="Espace Repas" icon={Plus}>
        <Field label="Repas quotidiennement" colSpan="col-span-12 md:col-span-6">
          <div className="flex gap-4">
            <UsageCounter label="Adultes" value={furnitureData.repasQuotidienAdultes} onChange={(v) => handleUpdate('details.kitchen.furniture.repasQuotidienAdultes', v)} />
            <UsageCounter label="Enfants" value={furnitureData.repasQuotidienEnfants} onChange={(v) => handleUpdate('details.kitchen.furniture.repasQuotidienEnfants', v)} />
          </div>
        </Field>
        <Field label="Repas exceptionnellement" colSpan="col-span-12 md:col-span-6">
          <div className="flex gap-4">
            <UsageCounter label="Adultes" value={furnitureData.repasExcepAdultes} onChange={(v) => handleUpdate('details.kitchen.furniture.repasExcepAdultes', v)} />
            <UsageCounter label="Enfants" value={furnitureData.repasExcepEnfants} onChange={(v) => handleUpdate('details.kitchen.furniture.repasExcepEnfants', v)} />
          </div>
        </Field>
        <Field label="Description" colSpan="col-span-12">
          <LongTextField 
            rows={2}
            value={furnitureData.usageDescriptionDechets} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.usageDescriptionDechets', v)} 
          />
        </Field>
      </Section>

      {/* 6. Éclairages (DÉPLACÉ ICI TOUT EN BAS) */}
      <Section title="Éclairages" icon={Plus}>
        <Field label="Luminosité pièce" colSpan="col-span-12 md:col-span-6">
          <CustomDropdown 
            value={furnitureData.luminosite} 
            options={['Très sombre', 'Sombre', 'Normale', 'Claire', 'Très claire']} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.luminosite', v)} 
          />
        </Field>
        <Field label="Température de l’éclairage" colSpan="col-span-12 md:col-span-6">
          <CustomDropdown 
            value={furnitureData.temperatureEclairage} 
            options={['Blanc chaud 3000°K', 'Blanc neutre 4000°K', 'Blanc froid 6500°K', 'à définir']} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.temperatureEclairage', v)} 
          />
        </Field>
        <Field label="Description de l’éclairage" colSpan="col-span-12">
          <LongTextField 
            rows={2}
            value={furnitureData.descriptionEclairage} 
            onChange={(v: string) => handleUpdate('details.kitchen.furniture.descriptionEclairage', v)} 
          />
        </Field>
      </Section>

    </div>
  );
};

export default ProjectKitchenFurniture;
