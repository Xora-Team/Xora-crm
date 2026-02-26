
import React, { useState, useRef } from 'react';
import { X, Upload, AlertCircle, FileSpreadsheet, ArrowLeft, Check, Loader2, Save } from 'lucide-react';

interface ArticleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>; // Nouvelle prop pour envoyer les données parsées au parent
  isImporting: boolean;
}

const ArticleImportModal: React.FC<ArticleImportModalProps> = ({ isOpen, onClose, onImport, isImporting }) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
    // Reset input pour permettre de re-sélectionner le même fichier si besoin
    e.target.value = '';
  };

  const parseCSV = (text: string) => {
    // Détection basique du séparateur
    const firstLine = text.split('\n')[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    const lines = text.split(/\r?\n/);
    const parsedItems: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Ignorer les lignes vides ou les en-têtes (détection insensible à la casse)
      if (!line || line.startsWith(';;') || (line.toLowerCase().includes('métier') && line.toLowerCase().includes('rubrique'))) continue;

      const cols = line.split(separator);
      
      // On accepte les lignes avec au moins 2 colonnes (Métier/Rubrique) pour être plus tolérant
      // Les champs manquants seront vides
      if (cols.length < 2) continue;

      const parsePrice = (val: string) => {
        if (!val) return 0;
        // Nettoyage : garde chiffres, virgule, point, moins. Supprime espaces.
        // Remplace virgule par point pour le parsing float standard JS
        const cleaned = val.replace(/\s/g, '').replace(',', '.');
        // Supprime tout ce qui n'est pas chiffre ou point
        const numberReady = cleaned.replace(/[^\d.-]/g, '');
        return parseFloat(numberReady) || 0;
      };

      parsedItems.push({
        metier: cols[0]?.trim() || 'Cuisine',
        rubrique: cols[1]?.trim() || 'Général',
        famille: cols[2]?.trim() || 'Non classé',
        collection: cols[3]?.trim() || '',
        descriptif: cols[4]?.trim() || 'Article importé',
        prixMiniTTC: parsePrice(cols[5]),
        prixMaxiTTC: parsePrice(cols[6]),
      });
    }

    if (parsedItems.length > 0) {
      setPreviewData(parsedItems);
      setStep('preview');
    } else {
      alert(`Aucune donnée valide trouvée. Vérifiez que votre fichier utilise le séparateur "${separator}" et contient des données.`);
    }
  };

  const handleConfirmImport = async () => {
    await onImport(previewData);
    if (!isImporting) {
        setStep('upload');
        setPreviewData([]);
    }
  };

  const handleBackToUpload = () => {
    setStep('upload');
    setPreviewData([]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-[24px] shadow-2xl w-full ${step === 'preview' ? 'max-w-6xl h-[90vh]' : 'max-w-xl'} overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col transition-all`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 shadow-sm">
                <FileSpreadsheet size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Importer des articles</h2>
                {step === 'preview' && <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{previewData.length} articles prêts</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {step === 'upload' ? (
            <div className="p-8 space-y-8">
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-4">
                <div className="p-2 bg-indigo-100 rounded-lg h-fit text-indigo-600"><AlertCircle size={20} /></div>
                <div className="space-y-1.5">
                <p className="text-sm font-bold text-indigo-900">Format CSV requis</p>
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                    Le fichier doit respecter strictement l'ordre des colonnes ci-dessous. Le séparateur doit être un point-virgule (;) ou une virgule (,).
                </p>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Structure attendue</p>
                <div className="bg-gray-900 text-gray-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-gray-800">
                Métier;Rubrique;Famille;Collection;Descriptif;PrixMin;PrixMax
                </div>
                <div className="px-1">
                <p className="text-[11px] text-gray-400 font-medium italic">Exemple : Cuisine;Electromenager;Four;Bosch;Four Pyrolyse Série 8;800;1200</p>
                </div>
            </div>

            <div className="pt-2">
                <label className={`group w-full flex flex-col items-center justify-center gap-3 px-6 py-10 bg-white border-2 border-dashed border-gray-300 hover:border-gray-900 rounded-2xl transition-all cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="p-4 bg-gray-50 rounded-full group-hover:bg-gray-100 transition-colors">
                    <Upload size={24} className="text-gray-400 group-hover:text-gray-900" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-gray-900">Cliquez pour sélectionner un fichier CSV</p>
                    <p className="text-xs text-gray-400">ou glissez-le ici</p>
                </div>
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    disabled={isImporting}
                />
                </label>
            </div>
            
            <div className="flex justify-end">
                <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                Annuler
                </button>
            </div>
            </div>
        ) : (
            <>
                {/* Preview Table */}
                <div className="flex-1 overflow-auto p-0 bg-gray-50/50 relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="bg-white border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4">Métier</th>
                                <th className="px-6 py-4">Rubrique</th>
                                <th className="px-6 py-4">Famille</th>
                                <th className="px-6 py-4">Collection</th>
                                <th className="px-6 py-4">Descriptif</th>
                                <th className="px-6 py-4 text-right">Prix Mini</th>
                                <th className="px-6 py-4 text-right">Prix Maxi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {previewData.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 text-[12px] font-bold text-gray-700">{item.metier}</td>
                                    <td className="px-6 py-3 text-[12px] text-gray-600">{item.rubrique}</td>
                                    <td className="px-6 py-3 text-[12px] font-bold text-gray-900">{item.famille}</td>
                                    <td className="px-6 py-3 text-[12px] text-gray-500 italic">{item.collection}</td>
                                    <td className="px-6 py-3 text-[12px] text-gray-800 max-w-xs truncate" title={item.descriptif}>{item.descriptif}</td>
                                    <td className="px-6 py-3 text-[12px] font-mono text-gray-600 text-right">{item.prixMiniTTC?.toLocaleString()}€</td>
                                    <td className="px-6 py-3 text-[12px] font-mono font-bold text-gray-900 text-right">{item.prixMaxiTTC?.toLocaleString()}€</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Preview */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
                    <button 
                        onClick={handleBackToUpload}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        <ArrowLeft size={16} /> Retour
                    </button>
                    <button 
                        onClick={handleConfirmImport}
                        disabled={isImporting}
                        className="flex items-center gap-3 px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-70"
                    >
                        {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isImporting ? 'Importation en cours...' : `Importer ${previewData.length} articles`}
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ArticleImportModal;
