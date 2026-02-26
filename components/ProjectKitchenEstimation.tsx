
import React from 'react';
// Added Check icon to imports
import { Calculator, Euro, Info, Receipt, Percent, Truck, Check } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from '@firebase/firestore';

interface ProjectKitchenEstimationProps {
  project: any;
}

const ProjectKitchenEstimation: React.FC<ProjectKitchenEstimationProps> = ({ project }) => {
  const estimationData = project.details?.kitchen?.estimation || {};
  const simulationData = estimationData.simulation || { montantTotal: 0, acomptePct: 30 };
  
  // NOUVELLE LOGIQUE : Récupération depuis details.kitchen.items (structure accordéon)
  const itemsMap = project.details?.kitchen?.items || {};

  // Définition des clés pour catégoriser (doit correspondre aux clés utilisées dans ProjectKitchenElectros)
  const ELECTRO_KEYS = [
    "Four", "Micro-ondes", "Tiroir chauffe-plat", "Cafetière", 
    "Plaque de cuisson", "Hotte", "Réfrigérateur", "Congélateur", 
    "Cave à vins", "Lave-vaisselle", "Lave-linge"
  ];

  const SANITAIRE_KEYS = [
    "Evier", "Mitigeur", "Distributeur savon", "Égouttoir pliable", 
    "Vidage automatique", "Panier égouttoir", "Planche à découper", 
    "Bonde + trop-plein", "Cache bonde"
  ];

  const calculateTotal = (keys: string[]) => {
    let min = 0;
    let max = 0;
    keys.forEach(key => {
      const itemData = itemsMap[key];
      // On additionne les prix des articles présents dans la liste
      if (itemData?.articles && Array.isArray(itemData.articles)) {
         itemData.articles.forEach((art: any) => {
           min += Number(art.prixMiniTTC) || 0;
           max += Number(art.prixMaxiTTC) || 0;
         });
      }
    });
    return { min, max };
  };

  const electroTotals = calculateTotal(ELECTRO_KEYS);
  const sanitaireTotals = calculateTotal(SANITAIRE_KEYS);

  // Calcul automatique pour Electroménager
  const electroMini = electroTotals.min;
  const electroMaxi = electroTotals.max;

  // Calcul automatique pour Sanitaire
  const sanitaireMini = sanitaireTotals.min;
  const sanitaireMaxi = sanitaireTotals.max;

  const handleUpdate = async (field: string, value: number) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`details.kitchen.estimation.${field}`]: value
      });
    } catch (e) {
      console.error("Erreur update estimation:", e);
    }
  };

  const handleUpdateSimulation = async (field: string, value: number) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`details.kitchen.estimation.simulation.${field}`]: value
      });
    } catch (e) {
      console.error("Erreur update simulation:", e);
    }
  };

  const rows = [
    { id: 'mobilier', label: 'Mobilier', isAuto: false },
    { id: 'planTravail', label: 'Plan de travail', isAuto: false },
    { id: 'accessoireMeuble', label: 'Accessoire meuble', isAuto: false },
    { id: 'electromenager', label: 'Electroménager', isAuto: true, mini: electroMini, maxi: electroMaxi },
    { id: 'sanitaire', label: 'Sanitaire & ses accesoires', isAuto: true, mini: sanitaireMini, maxi: sanitaireMaxi },
    { id: 'moXL', label: "Main d'oeuvre XL", isAuto: false },
    { id: 'livraison', label: 'Livraison', isAuto: false },
    { id: 'moArtisans', label: "Main d'oeuvre artisans", isAuto: false },
  ];

  // Calcul des totaux globaux
  const totalMin = rows.reduce((sum, row) => {
    const val = row.isAuto ? (row.mini || 0) : (Number(estimationData[`${row.id}Mini`]) || 0);
    return sum + val;
  }, 0);

  const totalMax = rows.reduce((sum, row) => {
    const val = row.isAuto ? (row.maxi || 0) : (Number(estimationData[`${row.id}Maxi`]) || 0);
    return sum + val;
  }, 0);

  // Calculs Simulation
  const isAmountTooLow = simulationData.montantTotal > 0 && simulationData.montantTotal < totalMin;
  const montantAcompte = (Number(simulationData.montantTotal) || 0) * ((Number(simulationData.acomptePct) || 0) / 100);
  const montantLivraison = (Number(simulationData.montantTotal) || 0) - montantAcompte;

  return (
    <div className="animate-in fade-in duration-300 pb-10 space-y-8">
      
      {/* BLOC 1 : ESTIMATION */}
      <div className="bg-[#f8f9fa] border border-gray-100 rounded-[32px] p-8 space-y-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Calculator size={28} />
            </div>
            <div>
              <h3 className="text-[18px] font-black text-gray-900 tracking-tight uppercase">Estimation enveloppe financière</h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Budget prévisionnel global du projet</p>
            </div>
          </div>

          <div className="flex gap-10">
            <div className="text-right">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest block mb-1">Total min (TTC)</span>
              <span className="text-[24px] font-black text-gray-900">{totalMin.toLocaleString()} €</span>
            </div>
            <div className="w-px h-12 bg-gray-100"></div>
            <div className="text-right">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest block mb-1">Total max (TTC)</span>
              <span className="text-[24px] font-black text-indigo-600">{totalMax.toLocaleString()} €</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border border-gray-200 rounded-[24px] bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Métier</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Prix mini (TTC)</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Prix maxi (TTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] font-bold text-gray-900">{row.label}</span>
                      {row.isAuto && (
                        <div className="group/info relative">
                           <Info size={14} className="text-gray-300 cursor-help" />
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-xl">
                             Calculé automatiquement depuis vos sélections d'articles
                           </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    {row.isAuto ? (
                      <div className="w-full bg-gray-50 border border-gray-100 rounded-[14px] px-4 py-3 text-[14px] font-black text-gray-400 flex justify-between items-center italic">
                        <span>{row.mini?.toLocaleString()}</span>
                        <span className="text-[10px] uppercase font-bold not-italic">€ (Auto)</span>
                      </div>
                    ) : (
                      <div className="relative group/input">
                        <input 
                          type="number"
                          placeholder="0"
                          value={estimationData[`${row.id}Mini`] || ''}
                          onChange={(e) => handleUpdate(`${row.id}Mini`, Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-[14px] px-4 py-3 text-[14px] font-black text-gray-900 outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-50 transition-all shadow-sm"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-gray-300">€</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-4">
                    {row.isAuto ? (
                      <div className="w-full bg-gray-50 border border-gray-100 rounded-[14px] px-4 py-3 text-[14px] font-black text-gray-400 flex justify-between items-center italic">
                        <span>{row.maxi?.toLocaleString()}</span>
                        <span className="text-[10px] uppercase font-bold not-italic">€ (Auto)</span>
                      </div>
                    ) : (
                      <div className="relative group/input">
                        <input 
                          type="number"
                          placeholder="0"
                          value={estimationData[`${row.id}Maxi`] || ''}
                          onChange={(e) => handleUpdate(`${row.id}Maxi`, Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-[14px] px-4 py-3 text-[14px] font-black text-gray-900 outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-50 transition-all shadow-sm"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-gray-300">€</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-900 text-white">
                <td className="px-8 py-6 text-[13px] font-black uppercase tracking-widest">Total Estimé (TTC)</td>
                <td className="px-8 py-6 text-[18px] font-black">{totalMin.toLocaleString()} €</td>
                <td className="px-8 py-6 text-[18px] font-black text-indigo-400">{totalMax.toLocaleString()} €</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-[11px] text-gray-400 font-medium italic px-4">
          * Les montants "Auto" sont basés sur les prix conseillés des articles ajoutés dans l'onglet technique. Pour les autres postes, saisissez vos estimations manuelles.
        </p>
      </div>

      {/* BLOC 2 : SIMULATION DE REGLEMENT */}
      <div className="bg-[#f8f9fa] border border-gray-100 rounded-[32px] p-8 space-y-8 shadow-sm">
        <div className="flex items-center gap-4 px-2">
          <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-900 shadow-sm">
            <Receipt size={24} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-gray-900 tracking-tight uppercase">Simulation de règlement</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Plan de financement prévisionnel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Montant Total */}
          <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Euro size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Montant total</span>
            </div>
            <div className="relative">
              <input 
                type="number"
                placeholder="Ex: 15000"
                value={simulationData.montantTotal || ''}
                onChange={(e) => handleUpdateSimulation('montantTotal', Number(e.target.value))}
                className={`w-full bg-white border rounded-[14px] px-4 py-3 text-[15px] font-black text-gray-900 outline-none transition-all ${
                  isAmountTooLow ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-gray-900 focus:ring-4 focus:ring-gray-50'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-gray-300">€</span>
            </div>
            {isAmountTooLow && (
              <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter animate-pulse">
                Inférieur au minimum estimé ({totalMin.toLocaleString()} €)
              </p>
            )}
          </div>

          {/* Pourcentage Acompte */}
          <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Percent size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Pourcentage acompte</span>
            </div>
            <div className="relative">
              <input 
                type="number"
                placeholder="30"
                value={simulationData.acomptePct || ''}
                onChange={(e) => handleUpdateSimulation('acomptePct', Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-[14px] px-4 py-3 text-[15px] font-black text-gray-900 outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-50 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-gray-300">%</span>
            </div>
          </div>

          {/* Montant Acompte (Auto) */}
          <div className="bg-indigo-50/50 p-6 rounded-[24px] border border-indigo-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              {/* Check was missing from imports */}
              <Check size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Montant acompte (Auto)</span>
            </div>
            <div className="pt-1">
              <span className="text-[22px] font-black text-indigo-600">
                {montantAcompte.toLocaleString()} €
              </span>
              <p className="text-[9px] text-indigo-400 font-bold uppercase mt-1">À la commande</p>
            </div>
          </div>

          {/* Livraison (Auto) */}
          <div className="bg-gray-900 p-6 rounded-[24px] border border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Truck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Solde Livraison (Auto)</span>
            </div>
            <div className="pt-1">
              <span className="text-[22px] font-black text-white">
                {montantLivraison.toLocaleString()} €
              </span>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Au départ usine</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProjectKitchenEstimation;
