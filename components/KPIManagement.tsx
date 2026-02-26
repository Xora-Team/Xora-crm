
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Plus, 
  Target, 
  Euro, 
  Search, 
  FileText, 
  User, 
  TrendingUp, 
  PieChart, 
  Settings2,
  Trash2,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, deleteDoc } from '@firebase/firestore';
import { FinancialKPI } from '../types';

const ICON_OPTIONS = [
  { id: 'euro', icon: Euro, label: 'Monnaie' },
  { id: 'target', icon: Target, label: 'Objectif' },
  { id: 'search', icon: Search, label: 'Recherche' },
  { id: 'file', icon: FileText, label: 'Document' },
  { id: 'user', icon: User, label: 'Client' },
  { id: 'trending-up', icon: TrendingUp, label: 'Croissance' },
  { id: 'pie-chart', icon: PieChart, label: 'Analyse' },
  { id: 'bar-chart', icon: BarChart3, label: 'Performance' },
];

/**
 * Composant de Carte KPI Individuelle
 */
/* Added interface for KPICard props and updated to React.FC to handle React-specific props like key correctly */
interface KPICardProps {
  kpi: FinancialKPI;
}

const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const [localKpi, setLocalKpi] = useState<FinancialKPI>(kpi);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number>(0);

  useEffect(() => {
    // On ne synchronise l'état local avec la BDD que si l'utilisateur n'est pas en train de taper
    if (Date.now() - lastSaved > 2000) {
      setLocalKpi(kpi);
    }
  }, [kpi, lastSaved]);

  const persistToFirebase = async (updates: Partial<FinancialKPI>) => {
    setIsSaving(true);
    try {
      // kpi.id est ici l'identifiant réel du document Firestore
      const kpiRef = doc(db, 'kpis', kpi.id);
      await setDoc(kpiRef, updates, { merge: true });
      setLastSaved(Date.now());
    } catch (e) {
      console.error("Erreur mise à jour KPI:", e);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleLocalChange = (field: keyof FinancialKPI, value: any) => {
    const updated = { ...localKpi, [field]: value };
    setLocalKpi(updated);
    
    if (field === 'iconName' || field === 'percentage') {
      persistToFirebase({ [field]: value });
    }
  };

  const handleBlur = (field: keyof FinancialKPI, value: any) => {
    persistToFirebase({ [field]: value });
  };

  const handleDelete = async () => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet indicateur de votre tableau de bord ?")) return;
    
    try {
      console.log("Tentative de suppression du document ID:", kpi.id);
      const kpiRef = doc(db, 'kpis', kpi.id);
      await deleteDoc(kpiRef);
    } catch (e) {
      console.error("Erreur lors de la suppression réelle:", e);
      alert("Erreur technique lors de la suppression.");
    }
  };

  const renderIcon = (name: string, size = 20) => {
    const option = ICON_OPTIONS.find(o => o.id === name) || ICON_OPTIONS[1];
    const IconComponent = option.icon;
    return <IconComponent size={size} />;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm flex flex-col lg:flex-row gap-8 group hover:border-[#A886D7]/30 transition-all">
      
      {/* Configuration Panel */}
      <div className="flex-1 space-y-6">
        <div className="space-y-4">
           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Titre de l'indicateur</label>
              <input 
                type="text" 
                value={localKpi.label}
                onChange={(e) => handleLocalChange('label', e.target.value)}
                onBlur={(e) => handleBlur('label', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:bg-white focus:border-[#A886D7] transition-all"
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Objectif cible (Texte)</label>
                <input 
                  type="text" 
                  value={localKpi.target}
                  onChange={(e) => handleLocalChange('target', e.target.value)}
                  onBlur={(e) => handleBlur('target', e.target.value)}
                  placeholder="Ex: 100.000€"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:bg-white focus:border-[#A886D7] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Valeur actuelle</label>
                <input 
                  type="text" 
                  value={localKpi.value}
                  onChange={(e) => handleLocalChange('value', e.target.value)}
                  onBlur={(e) => handleBlur('value', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:bg-white focus:border-[#A886D7] transition-all"
                />
              </div>
           </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Icône de l'indicateur</label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleLocalChange('iconName', opt.id)}
                className={`p-3 rounded-xl border transition-all ${
                  localKpi.iconName === opt.id 
                  ? 'bg-gray-900 border-gray-900 text-white shadow-md' 
                  : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
                title={opt.label}
              >
                <opt.icon size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center">
          <button 
            type="button"
            onClick={handleDelete}
            className="text-[11px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2 hover:text-red-600 transition-all py-2 px-4 hover:bg-red-50 rounded-xl"
          >
            <Trash2 size={14} /> Supprimer l'indicateur
          </button>
          
          <div className="flex items-center gap-2">
            {isSaving ? (
              <div className="flex items-center gap-2 text-[#A886D7] animate-pulse">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sauvegarde...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Sauvegardé</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Panel (Dashboard Style) */}
      <div className="w-full lg:w-[320px] bg-[#FBFBFB] rounded-[24px] border border-gray-100 p-8 flex flex-col justify-center space-y-8 relative">
         <div className="absolute top-4 left-6">
            <span className="text-[9px] font-black text-[#A886D7] uppercase tracking-widest">Aperçu Dashboard</span>
         </div>
         
         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-44">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-[#A886D7] shadow-lg shadow-purple-100 text-white">
                    {renderIcon(localKpi.iconName)}
                </div>
                <span className="text-[11px] font-black text-gray-300 uppercase tracking-tight max-w-[120px] text-right leading-tight">{localKpi.label || 'Titre KPI'}</span>
            </div>
            <div>
                <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-gray-900">{localKpi.value || '0€'}</span>
                    <span className="text-[11px] text-gray-400 font-bold">/ {localKpi.target || '0€'}</span>
                </div>
                <div className="mt-4 relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#A886D7] rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(168,134,215,0.3)]" 
                      style={{ width: `${localKpi.percentage || 0}%` }}
                    ></div>
                </div>
                <div className="text-right mt-2">
                    <span className="text-[10px] font-black text-gray-900">{localKpi.percentage || 0}%</span>
                </div>
            </div>
         </div>

         <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1 text-center block">Calibration % (Barre de test)</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={localKpi.percentage || 0}
              onChange={(e) => handleLocalChange('percentage', Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A886D7] shadow-inner"
            />
         </div>
      </div>
    </div>
  );
};

interface KPIManagementProps {
  userProfile: any;
}

const KPIManagement: React.FC<KPIManagementProps> = ({ userProfile }) => {
  const [kpis, setKpis] = useState<FinancialKPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!userProfile?.companyId) return;

    const q = query(collection(db, 'kpis'), where('companyId', '==', userProfile.companyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        // CRUCIAL : On s'assure que l'ID du document Firestore (doc.id) 
        // est celui utilisé, même si les données contiennent un champ id.
        return { ...d, id: doc.id };
      }) as FinancialKPI[];
      
      // Tri par nom pour éviter les sauts de cartes lors des updates
      data.sort((a, b) => a.label.localeCompare(b.label));
      
      setKpis(data);
      setIsLoading(false);
    }, (err) => {
      console.error("Erreur Firestore KPIManagement:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.companyId]);

  const handleAddKPI = async () => {
    if (!userProfile?.companyId) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'kpis'), {
        label: 'Nouveau KPI',
        value: '0€',
        target: '10.000€',
        percentage: 0,
        iconName: 'target',
        color: 'purple',
        companyId: userProfile.companyId
      });
    } catch (e) {
      console.error("Erreur ajout KPI:", e);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-10 bg-[#F8F9FA] min-h-full space-y-10 font-sans">
      
      {/* Header Page */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-[#A886D7]">
            <Settings2 size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuration des KPI</h1>
            <p className="text-sm text-gray-400 font-medium">Calibrez vos objectifs stratégiques en temps réel.</p>
          </div>
        </div>
        <button 
          onClick={handleAddKPI}
          disabled={isAdding}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-[14px] font-bold shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50"
        >
          {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          Ajouter un indicateur
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#A886D7]/20" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-500">
          {kpis.map((kpi) => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
          
          {kpis.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white border border-dashed border-gray-200 rounded-[32px]">
                <BarChart3 size={48} className="mx-auto text-gray-100 mb-4" />
                <p className="text-gray-400 font-medium italic">Aucun indicateur configuré. Cliquez sur "Ajouter" pour commencer.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KPIManagement;
