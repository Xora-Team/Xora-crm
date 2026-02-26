
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Trees, Factory, Wind, Columns, Plus, HelpCircle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, updateDoc } from '@firebase/firestore';

// --- Sous-composants UI Déplacés hors du rendu pour éviter la perte de focus ---

const Section = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="bg-white border border-gray-100 rounded-[24px] p-8 space-y-6 shadow-sm mb-6">
    <h3 className="text-[15px] font-bold text-gray-800">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {children}
    </div>
  </div>
);

const Field = ({ label, children, colSpan = "col-span-12 md:col-span-4" }: { label: string; children?: React.ReactNode; colSpan?: string }) => (
  <div className={colSpan}>
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
    {children}
  </div>
);

const LongTextField = ({ value, onChange, placeholder = "Saisir ici...", rows = 3, colSpan = "col-span-12" }: any) => (
  <div className={colSpan}>
    <textarea 
      rows={rows}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[13px] font-medium text-gray-800 outline-none focus:bg-white focus:border-gray-300 transition-all resize-none shadow-inner"
    />
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {options.map((opt) => {
        const isSelected = Array.isArray(value) && value.includes(opt.label);
        const Icon = opt.icon;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => toggleOption(opt.label)}
            className={`flex flex-col items-center justify-center p-6 rounded-[20px] border-2 transition-all duration-300 group relative ${
              isSelected 
                ? 'bg-indigo-50 border-indigo-600 shadow-lg shadow-indigo-100' 
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className={`p-3 rounded-2xl mb-3 transition-all duration-300 ${
              isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:text-gray-900 group-hover:bg-white'
            }`}>
              <Icon size={24} />
            </div>
            <span className={`text-[12px] font-bold text-center leading-tight uppercase tracking-tight ${
              isSelected ? 'text-indigo-900' : 'text-gray-500 group-hover:text-gray-900'
            }`}>
              {opt.label}
            </span>
            {isSelected && (
              <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5 animate-in zoom-in duration-200">
                <Check size={12} strokeWidth={4} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface ProjectKitchenAmbianceProps {
  project: any;
}

const ProjectKitchenAmbiance: React.FC<ProjectKitchenAmbianceProps> = ({ project }) => {
  const handleUpdate = async (field: string, value: any) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { [field]: value });
    } catch (e) {
      console.error("Erreur update ambiance:", e);
    }
  };

  const ambianceOptions = [
    { label: "Contemporaine", icon: Sparkles },
    { label: "Industrielle", icon: Factory },
    { label: "Campagne Chic", icon: Trees },
    { label: "Scandinave", icon: Wind },
    { label: "Epurée", icon: Columns },
    { label: "Autre", icon: Plus },
    { label: "Ne sait pas", icon: HelpCircle }
  ];

  const mobilierConserveOptions = [
    "Canapé",
    "Fauteuils",
    "Table",
    "Chaises",
    "Meubles Meublants",
    "Autre"
  ];

  return (
    <div className="animate-in fade-in duration-300 pb-10">
      
      {/* 1. Bloc Ambiance */}
      <Section title="Ambiance">
        <Field label="Ambiance.s recherchée.s (Sélection multiple)" colSpan="col-span-12">
          <VisualMultiSelect 
            value={project.details?.kitchen?.ambianceSelection || []}
            options={ambianceOptions}
            onChange={(v: string[]) => handleUpdate('details.kitchen.ambianceSelection', v)}
          />
        </Field>
        
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <Field label="Ambiance appréciée" colSpan="col-span-12">
            <LongTextField 
              value={project.details?.kitchen?.ambianceAppreciee} 
              onChange={(v: string) => handleUpdate('details.kitchen.ambianceAppreciee', v)} 
              placeholder="Décrivez ce que le client aime..."
            />
          </Field>
          <Field label="Ambiance à éviter" colSpan="col-span-12">
            <LongTextField 
              value={project.details?.kitchen?.ambianceAEviter} 
              onChange={(v: string) => handleUpdate('details.kitchen.ambianceAEviter', v)} 
              placeholder="Ce que le client ne veut surtout pas..."
            />
          </Field>
        </div>
      </Section>

      {/* 2. Bloc Modèle final (Présentation client) */}
      <Section title="Modèle final (Présentation client)">
        <Field label="Mobilier" colSpan="col-span-12 md:col-span-4">
          <LongTextField 
            rows={2}
            value={project.details?.kitchen?.modeleFinal?.mobilier} 
            onChange={(v: string) => handleUpdate('details.kitchen.modeleFinal.mobilier', v)} 
            placeholder="Précisez le modèle de mobilier..."
          />
        </Field>
        <Field label="Poignées" colSpan="col-span-12 md:col-span-4">
          <LongTextField 
            rows={2}
            value={project.details?.kitchen?.modeleFinal?.poignees} 
            onChange={(v: string) => handleUpdate('details.kitchen.modeleFinal.poignees', v)} 
            placeholder="Type de poignées..."
          />
        </Field>
        <Field label="Plan de travail" colSpan="col-span-12 md:col-span-4">
          <LongTextField 
            rows={2}
            value={project.details?.kitchen?.modeleFinal?.planDeTravail} 
            onChange={(v: string) => handleUpdate('details.kitchen.modeleFinal.planDeTravail', v)} 
            placeholder="Matériau et coloris du plan..."
          />
        </Field>
      </Section>

      {/* 3. Bloc Matériaux client conservés */}
      <Section title="Matériaux client conservés">
        <Field label="Sol cuisine" colSpan="col-span-12 md:col-span-4">
          <LongTextField 
            rows={2}
            value={project.details?.kitchen?.materiauxConserves?.sol} 
            onChange={(v: string) => handleUpdate('details.kitchen.materiauxConserves.sol', v)} 
            placeholder="Carrelage, parquet..."
          />
        </Field>
        <Field label="Mur cuisine" colSpan="col-span-12 md:col-span-4">
          <LongTextField 
            rows={2}
            value={project.details?.kitchen?.materiauxConserves?.mur} 
            onChange={(v: string) => handleUpdate('details.kitchen.materiauxConserves.mur', v)} 
            placeholder="Peinture, faïence..."
          />
        </Field>
        <Field label="Autre.s" colSpan="col-span-12 md:col-span-4">
          <LongTextField 
            rows={2}
            value={project.details?.kitchen?.materiauxConserves?.autres} 
            onChange={(v: string) => handleUpdate('details.kitchen.materiauxConserves.autres', v)} 
            placeholder="Plafond, éclairage existant..."
          />
        </Field>

        <div className="col-span-12 grid grid-cols-12 gap-6 pt-2">
          <Field label="Sélection Mobilier" colSpan="col-span-12 md:col-span-4">
             <div className="flex flex-wrap gap-2 pt-1">
                {mobilierConserveOptions.map(opt => {
                  const isSel = (project.details?.kitchen?.materiauxConserves?.selectionMobilier || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const curr = project.details?.kitchen?.materiauxConserves?.selectionMobilier || [];
                        const next = curr.includes(opt) ? curr.filter((c:any) => c !== opt) : [...curr, opt];
                        handleUpdate('details.kitchen.materiauxConserves.selectionMobilier', next);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        isSel ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
             </div>
          </Field>
          <Field label="Description (Sol, mur, déco, etc...)" colSpan="col-span-12 md:col-span-8">
            <LongTextField 
              rows={2}
              value={project.details?.kitchen?.materiauxConserves?.description} 
              onChange={(v: string) => handleUpdate('details.kitchen.materiauxConserves.description', v)} 
              placeholder="Précisions supplémentaires sur l'état des matériaux..."
            />
          </Field>
        </div>
      </Section>

    </div>
  );
};

export default ProjectKitchenAmbiance;
