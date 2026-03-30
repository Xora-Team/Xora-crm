
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, ArrowLeft, Check, Loader2, AlertTriangle, User, ShieldCheck, Mail } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { HIERARCHY_DATA } from '../constants';
import { toast } from 'sonner';

interface ClientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
  isImporting: boolean;
  userProfile: any;
}

interface AuditReport {
  totalRows: number;
  unknownCollaborators: string[];
  originErrors: { row: number; name: string; origin: string; subOrigin: string; source: string; error: string }[];
  emailDuplicates: { row: number; name: string; email: string; type: 'internal' | 'external' }[];
  readyToImport: number;
}

const normalizeCivility = (val: string) => {
  const v = val.trim().toLowerCase();
  if (!v) return '';
  if (v === 'mme' || v === 'madame' || v === 'mme.') return 'Mme';
  if (v === 'm.' || v === 'mr' || v === 'monsieur' || v === 'm') return 'M.';
  if (v === 'sci') return 'Sci';
  if (v === 'association') return 'Association';
  if (v === 'sas') return 'Sas';
  if (v === 'société' || v === 'societe') return 'Société';
  return val.trim();
};

const ClientImportModal: React.FC<ClientImportModalProps> = ({ isOpen, onClose, onImport, isImporting, userProfile }) => {
  const [step, setStep] = useState<'upload' | 'audit'>('upload');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [collaboratorMapping, setCollaboratorMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.companyId) return;
      
      try {
        // Fetch Team
        const qTeam = query(collection(db, 'users'), where('companyId', '==', userProfile.companyId));
        const snapTeam = await getDocs(qTeam);
        setTeamMembers(snapTeam.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Existing Client Emails - ALL clients of the company
        const qClients = query(collection(db, 'clients'), where('companyId', '==', userProfile.companyId));
        const snapClients = await getDocs(qClients);
        const emails = new Set<string>();
        snapClients.docs.forEach(doc => {
          const data = doc.data();
          // Check both root and details for email to be exhaustive
          const email = data.details?.email || data.email;
          if (email && typeof email === 'string') {
            emails.add(email.toLowerCase().trim());
          }
        });
        setExistingEmails(emails);
      } catch (error) {
        console.error("Error fetching data for import audit:", error);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen, userProfile?.companyId]);

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
    e.target.value = '';
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return;

    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    const parsedItems: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip header or empty lines
      if (!line || line.toLowerCase().includes('civilité') || line.toLowerCase().includes('nom')) continue;

      const cols = line.split(separator);
      if (cols.length < 2) continue;

      // Format: Civilité,Nom,Prénom,email,Portable,Fixe,adresse,statut,Prénom collab,Nom collab,Origine,Sous origine,Sources,Année
      const firstNameCollab = cols[8]?.trim() || '';
      const lastNameCollab = cols[9]?.trim() || '';
      const collabFullName = `${firstNameCollab} ${lastNameCollab}`.trim();

      parsedItems.push({
        civility: normalizeCivility(cols[0]?.trim() || ''),
        lastName: cols[1]?.trim() || '',
        firstName: cols[2]?.trim() || '',
        email: cols[3]?.trim() || '',
        phone: cols[4]?.trim() || '',
        fixed: cols[5]?.trim() || '',
        address: cols[6]?.trim() || '',
        status: cols[7]?.trim() || 'Prospect',
        rawCollaborator: collabFullName,
        origin: cols[10]?.trim() || '',
        subOrigin: cols[11]?.trim() || '',
        source: cols[12]?.trim() || '',
        year: cols[13]?.trim() || '',
      });
    }

    if (parsedItems.length > 0) {
      runAudit(parsedItems);
    } else {
      toast.error(`Aucune donnée valide trouvée. Vérifiez le format du fichier.`);
    }
  };

  const findKeyCaseInsensitive = (obj: Record<string, any>, key: string) => {
    return Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  };

  const findValueCaseInsensitive = (arr: string[], value: string) => {
    return arr.find(v => v.toLowerCase() === value.toLowerCase());
  };

  const runAudit = (data: any[]) => {
    const unknownCollabs = new Set<string>();
    const originErrors: any[] = [];
    const emailDuplicates: any[] = [];
    const seenEmailsInCSV = new Map<string, number>();
    
    data.forEach((item, index) => {
      const rowNum = index + 1;
      const clientName = `${item.firstName} ${item.lastName}`.trim();

      // 1. Check collaborator
      if (item.rawCollaborator) {
        const match = teamMembers.find(m => 
          m.name?.toLowerCase() === item.rawCollaborator.toLowerCase() ||
          `${m.firstName} ${m.lastName}`.toLowerCase() === item.rawCollaborator.toLowerCase()
        );
        if (!match) {
          unknownCollabs.add(item.rawCollaborator);
        }
      }

      // 2. Check Origins Hierarchy (Case-Insensitive)
      const origin = item.origin;
      const subOrigin = item.subOrigin;
      const source = item.source;

      const matchedOriginKey = origin ? findKeyCaseInsensitive(HIERARCHY_DATA, origin) : null;

      if (!origin) {
        originErrors.push({ row: rowNum, name: clientName, origin, subOrigin, source, error: `L'origine est manquante.` });
      } else if (!matchedOriginKey) {
        originErrors.push({ row: rowNum, name: clientName, origin, subOrigin, source, error: `L'origine "${origin}" n'existe pas dans le référentiel.` });
      } else {
        const subOrigins = HIERARCHY_DATA[matchedOriginKey];
        const matchedSubOriginKey = subOrigin ? findKeyCaseInsensitive(subOrigins, subOrigin) : null;

        if (!subOrigin) {
          originErrors.push({ row: rowNum, name: clientName, origin, subOrigin, source, error: `La sous-origine est manquante.` });
        } else if (!matchedSubOriginKey) {
          originErrors.push({ row: rowNum, name: clientName, origin, subOrigin, source, error: `La sous-origine "${subOrigin}" n'est pas valide pour l'origine "${origin}".` });
        } else {
          const sources = subOrigins[matchedSubOriginKey];
          const matchedSource = source ? findValueCaseInsensitive(sources, source) : null;

          if (sources.length > 0 && !source) {
            originErrors.push({ row: rowNum, name: clientName, origin, subOrigin, source, error: `La source est manquante.` });
          } else if (source && !matchedSource) {
            originErrors.push({ row: rowNum, name: clientName, origin, subOrigin, source, error: `La source "${source}" n'est pas valide pour "${origin} > ${subOrigin}".` });
          }
        }
      }

      // 3. Check Email Duplicates
      if (item.email) {
        const email = item.email.toLowerCase().trim();
        
        // Check in CSV
        if (seenEmailsInCSV.has(email)) {
          emailDuplicates.push({ 
            row: rowNum, 
            name: clientName, 
            email: item.email, 
            type: 'internal',
            originalRow: seenEmailsInCSV.get(email)
          });
        } else {
          seenEmailsInCSV.set(email, rowNum);
          
          // Check in Database
          if (existingEmails.has(email)) {
            emailDuplicates.push({ 
              row: rowNum, 
              name: clientName, 
              email: item.email, 
              type: 'external' 
            });
          }
        }
      }
    });

    setAuditReport({
      totalRows: data.length,
      unknownCollaborators: Array.from(unknownCollabs),
      originErrors,
      emailDuplicates,
      readyToImport: data.length
    });
    setPreviewData(data);
    setStep('audit');
  };

  const handleConfirmImport = async () => {
    const finalData = previewData.map(item => {
      let collaborator = null;
      if (item.rawCollaborator) {
        const match = teamMembers.find(m => 
          m.name?.toLowerCase() === item.rawCollaborator.toLowerCase() ||
          `${m.firstName} ${m.lastName}`.toLowerCase() === item.rawCollaborator.toLowerCase()
        );
        if (match) {
          collaborator = { id: match.id, name: match.name || `${match.firstName} ${match.lastName}`, avatar: match.avatar };
        } else if (collaboratorMapping[item.rawCollaborator]) {
          const mapped = teamMembers.find(m => m.id === collaboratorMapping[item.rawCollaborator]);
          if (mapped) {
            collaborator = { id: mapped.id, name: mapped.name || `${mapped.firstName} ${mapped.lastName}`, avatar: mapped.avatar };
          }
        } else {
          // Si le collaborateur est inconnu et que l'utilisateur a choisi "Laisser vide"
          collaborator = { id: 'none', name: 'Sans agenceur', avatar: '' };
        }
      } else {
        // Si aucun collaborateur n'est renseigné dans le fichier
        collaborator = { id: 'none', name: 'Sans agenceur', avatar: '' };
      }

      // Case-Insensitive Origin Mapping
      let cleanOrigin = item.origin;
      let cleanSubOrigin = item.subOrigin;
      let cleanSource = item.source;

      const matchedOriginKey = cleanOrigin ? findKeyCaseInsensitive(HIERARCHY_DATA, cleanOrigin) : null;

      if (!matchedOriginKey) {
        cleanOrigin = '';
        cleanSubOrigin = '';
        cleanSource = '';
      } else {
        cleanOrigin = matchedOriginKey; // Use the canonical casing from HIERARCHY_DATA
        const subOrigins = HIERARCHY_DATA[matchedOriginKey];
        const matchedSubOriginKey = cleanSubOrigin ? findKeyCaseInsensitive(subOrigins, cleanSubOrigin) : null;

        if (!matchedSubOriginKey) {
          cleanSubOrigin = '';
          cleanSource = '';
        } else {
          cleanSubOrigin = matchedSubOriginKey; // Use canonical casing
          const sources = subOrigins[matchedSubOriginKey];
          const matchedSource = cleanSource ? findValueCaseInsensitive(sources, cleanSource) : null;

          if (!matchedSource) {
            cleanSource = '';
          } else {
            cleanSource = matchedSource; // Use canonical casing
          }
        }
      }

      return {
        ...item,
        origin: cleanOrigin,
        subOrigin: cleanSubOrigin,
        source: cleanSource,
        collaborator
      };
    });

    await onImport(finalData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-[24px] shadow-2xl w-full ${step !== 'upload' ? 'max-w-5xl h-[90vh]' : 'max-w-xl'} overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col transition-all`}>
        
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 shadow-sm">
                <FileSpreadsheet size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Importation Sécurisée</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Audit & Validation des données</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50/30">
          {step === 'upload' && (
            <div className="p-8 space-y-8">
              <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-4">
                  <div className="p-2 bg-indigo-100 rounded-lg h-fit text-indigo-600"><ShieldCheck size={20} /></div>
                  <div className="space-y-1.5">
                  <p className="text-sm font-bold text-indigo-900">Audit Obligatoire</p>
                  <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                      Chaque fichier est audité avant importation. Nous vérifions la correspondance des collaborateurs et la cohérence des origines.
                  </p>
                  </div>
              </div>

              <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Structure CSV attendue</p>
                  <div className="bg-gray-900 text-gray-200 p-5 rounded-2xl font-mono text-[10px] overflow-x-auto shadow-inner border border-gray-800 leading-relaxed">
                  Civilité;Nom;Prénom;Email;Portable;Fixe;Adresse;Statut;Prénom Collab;Nom Collab;Origine;Sous-origine;Source;Année
                  </div>
              </div>

              <div className="pt-2">
                  <label className={`group w-full flex flex-col items-center justify-center gap-3 px-6 py-10 bg-white border-2 border-dashed border-gray-300 hover:border-gray-900 rounded-2xl transition-all cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="p-4 bg-gray-50 rounded-full group-hover:bg-gray-100 transition-colors">
                      <Upload size={24} className="text-gray-400 group-hover:text-gray-900" />
                  </div>
                  <div className="text-center space-y-1">
                      <p className="text-sm font-bold text-gray-900">Sélectionnez votre fichier Excel/CSV</p>
                      <p className="text-xs text-gray-400">Analyse automatique après sélection</p>
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
            </div>
          )}

          {step === 'audit' && auditReport && (
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Lignes</p>
                  <p className="text-2xl font-black text-gray-900">{auditReport.totalRows}</p>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm space-y-1 ${auditReport.unknownCollaborators.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'}`}>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Collab. Inconnus</p>
                  <p className={`text-2xl font-black ${auditReport.unknownCollaborators.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{auditReport.unknownCollaborators.length}</p>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm space-y-1 ${auditReport.originErrors.length > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Erreurs Origines</p>
                  <p className={`text-2xl font-black ${auditReport.originErrors.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{auditReport.originErrors.length}</p>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm space-y-1 ${auditReport.emailDuplicates.length > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'}`}>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Doublons Emails</p>
                  <p className={`text-2xl font-black ${auditReport.emailDuplicates.length > 0 ? 'text-indigo-600' : 'text-gray-900'}`}>{auditReport.emailDuplicates.length}</p>
                </div>
              </div>

              {auditReport.unknownCollaborators.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-amber-500" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Association des Collaborateurs</h3>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-amber-100/50 text-[10px] font-black text-amber-800 uppercase tracking-widest">
                          <th className="px-6 py-3">Nom dans le fichier</th>
                          <th className="px-6 py-3">Action / Association</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {auditReport.unknownCollaborators.map(name => (
                          <tr key={name}>
                            <td className="px-6 py-4 text-sm font-bold text-gray-700">{name}</td>
                            <td className="px-6 py-4">
                              <select 
                                value={collaboratorMapping[name] || ''}
                                onChange={(e) => setCollaboratorMapping({...collaboratorMapping, [name]: e.target.value})}
                                className="w-full max-w-xs bg-white border border-amber-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-amber-500 shadow-sm"
                              >
                                <option value="">Laisser vide (Non affecté)</option>
                                {teamMembers.map(m => (
                                  <option key={m.id} value={m.id}>{m.name || `${m.firstName} ${m.lastName}`}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {auditReport.originErrors.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Anomalies Origines & Sources</h3>
                  </div>
                  <div className="bg-red-50/50 border border-red-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-red-100/50 text-[10px] font-black text-red-800 uppercase tracking-widest sticky top-0">
                          <th className="px-6 py-3">Ligne</th>
                          <th className="px-6 py-3">Client</th>
                          <th className="px-6 py-3">Données</th>
                          <th className="px-6 py-3">Anomalie</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {auditReport.originErrors.map((err, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4 text-xs font-bold text-gray-500">#{err.row}</td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-900">{err.name}</td>
                            <td className="px-6 py-4 text-[10px] text-gray-600 font-medium">
                              {err.origin} {err.subOrigin && `> ${err.subOrigin}`} {err.source && `> ${err.source}`}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-red-600">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {auditReport.emailDuplicates.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Doublons d'adresses email détectés</h3>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-indigo-100/50 text-[10px] font-black text-indigo-800 uppercase tracking-widest sticky top-0">
                          <th className="px-6 py-3">Ligne</th>
                          <th className="px-6 py-3">Client</th>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Type de doublon</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100">
                        {auditReport.emailDuplicates.map((dup, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4 text-xs font-bold text-gray-500">#{dup.row}</td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-900">{dup.name}</td>
                            <td className="px-6 py-4 text-xs font-medium text-indigo-600">
                              {dup.email}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                                dup.type === 'internal' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {dup.type === 'internal' ? 'Déjà présent dans le fichier' : 'Déjà présent dans l\'annuaire'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {auditReport.unknownCollaborators.length === 0 && auditReport.originErrors.length === 0 && auditReport.emailDuplicates.length === 0 && (
                <div className="p-10 bg-emerald-50 border border-emerald-100 rounded-[32px] flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <Check size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Audit Favorable</h3>
                    <p className="text-sm text-emerald-700 font-medium">Toutes les données sont conformes au référentiel.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
          {step === 'upload' ? (
            <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              Annuler
            </button>
          ) : (
            <button 
              onClick={() => setStep('upload')}
              disabled={isImporting}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <ArrowLeft size={16} /> Retour
            </button>
          )}

          {step === 'audit' && (
            <button 
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-70"
            >
              {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isImporting ? 'Importation en cours...' : 'Confirmer l\'importation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientImportModal;
