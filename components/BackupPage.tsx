
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Download, ShieldCheck, Loader2, FileText, Search, AlertTriangle, CheckCircle2, UserX, User, X } from 'lucide-react';
import { toast } from 'sonner';

interface BackupPageProps {
  userProfile: any;
}

interface AuditResult {
  duplicates: any[];
  invertedNames: any[];
  totalCount: number;
}

const BackupPage: React.FC<BackupPageProps> = ({ userProfile }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [dbCount, setDbCount] = useState<{clients: number | null, users: number | null}>({clients: null, users: null});
  const [collabAnalysis, setCollabAnalysis] = useState<any[]>([]);
  const [isAnalyzingCollabs, setIsAnalyzingCollabs] = useState(false);

  const runCollabAnalysis = async () => {
    if (!userProfile?.companyId) return;
    setIsAnalyzingCollabs(true);
    setStatus("Analyse des collaborateurs (champ 'referent' dans Clients)...");
    try {
      const q = query(collection(db, 'clients'), where("companyId", "==", userProfile.companyId));
      const snap = await getDocs(q);
      const clients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const collabMap: Record<string, number> = {};
      
      clients.forEach((client: any) => {
        // The user wants the value found in the field for collaborator/assigned user
        // In this app, it's typically client.details.referent (the name string)
        // or client.addedBy.name
        const referentName = client.details?.referent || client.addedBy?.name || 'Non assigné';
        
        collabMap[referentName] = (collabMap[referentName] || 0) + 1;
      });
      
      const results = Object.entries(collabMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
        
      setCollabAnalysis(results);
      setStatus(`Analyse terminée : ${clients.length} clients analysés.`);
    } catch (error: any) {
      console.error(error);
      setStatus(`Erreur analyse : ${error.message}`);
    } finally {
      setIsAnalyzingCollabs(false);
    }
  };

  const checkCount = async () => {
    if (!userProfile?.companyId) return;
    try {
      const qClients = query(collection(db, 'clients'), where("companyId", "==", userProfile.companyId));
      const snapClients = await getDocs(qClients);
      
      const qUsers = query(collection(db, 'users'), where("companyId", "==", userProfile.companyId));
      const snapUsers = await getDocs(qUsers);
      
      setDbCount({
        clients: snapClients.size,
        users: snapUsers.size
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkCount();
  }, [userProfile?.companyId]);

  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const flattenObject = (obj: any, prefix = ''): any => {
    return Object.keys(obj).reduce((acc: any, k: string) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]) && !(obj[k] instanceof Date)) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else if (Array.isArray(obj[k])) {
        acc[pre + k] = JSON.stringify(obj[k]);
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const exportToCSV = async (collectionName: string) => {
    if (!userProfile?.companyId) {
      toast.error("Erreur : ID de société non trouvé.");
      return;
    }

    setIsExporting(true);
    setStatus(`Export de ${collectionName} en cours...`);
    try {
      const q = query(
        collection(db, collectionName), 
        where("companyId", "==", userProfile.companyId)
      );

      const querySnapshot = await getDocs(q);
      const allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...flattenObject(doc.data()) }));

      if (allData.length === 0) {
        toast.error(`La collection ${collectionName} est vide pour cette société.`);
        setStatus(`Aucun document trouvé pour ${collectionName}.`);
        return;
      }

      setStatus(`Préparation du fichier CSV (${allData.length} documents)...`);
      const headers = Array.from(new Set(allData.flatMap(row => Object.keys(row))));
      const csvRows = [
        headers.join(','),
        ...allData.map(row => headers.map(header => {
          const val = row[header];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(','))
      ];
      
      const csvContent = "\ufeff" + csvRows.join('\n');
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`backup_${collectionName}_${date}.csv`, csvContent);
      setStatus(`Export ${collectionName} terminé (${allData.length} documents).`);
    } catch (error: any) {
      console.error(error);
      setStatus(`Erreur lors de l'export ${collectionName} : ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const runAudit = async () => {
    if (!userProfile?.companyId) return;
    setIsAuditing(true);
    setStatus("Audit en cours : Récupération de tous les clients...");
    
    try {
      const q = query(
        collection(db, 'clients'), 
        where("companyId", "==", userProfile.companyId)
      );

      const querySnapshot = await getDocs(q);
      const allClients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (allClients.length === 0) {
        setStatus("Aucun client trouvé pour l'audit.");
        return;
      }

      setStatus(`Analyse de ${allClients.length} clients...`);
      
      const duplicates: any[] = [];
      const invertedNames: any[] = [];
      const seenNames = new Map<string, any>();
      const normalizedNames = new Map<string, any>();

      allClients.forEach((client: any) => {
        const rawName = (client.name || "").trim().toUpperCase();
        if (!rawName) return;

        // Check exact duplicates
        if (seenNames.has(rawName)) {
          duplicates.push({
            original: seenNames.get(rawName),
            duplicate: client
          });
        } else {
          seenNames.set(rawName, client);
        }

        // Check inverted names (e.g., "JEAN DUPONT" vs "DUPONT JEAN")
        const parts = rawName.split(/\s+/).sort().join(' ');
        if (normalizedNames.has(parts)) {
          const existing = normalizedNames.get(parts);
          if (existing.name.trim().toUpperCase() !== rawName) {
            invertedNames.push({
              original: existing,
              inverted: client
            });
          }
        } else {
          normalizedNames.set(parts, client);
        }
      });

      setAuditResult({
        duplicates,
        invertedNames,
        totalCount: allClients.length
      });
      setStatus("Audit terminé.");
    } catch (error: any) {
      console.error(error);
      setStatus(`Erreur lors de l'audit : ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gray-900 text-white rounded-2xl">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Sauvegarde de Sécurité</h1>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Export complet de la base de données</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-indigo-500 font-mono">ID Société : {userProfile?.companyId || 'Non trouvé'}</p>
            {dbCount.clients !== null && (
              <p className="text-[10px] text-emerald-500 font-mono border-l border-gray-200 pl-2">Clients en base : {dbCount.clients}</p>
            )}
            {dbCount.users !== null && (
              <p className="text-[10px] text-amber-500 font-mono border-l border-gray-200 pl-2">Collaborateurs en base : {dbCount.users}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Table Clients</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Exporte tous les clients, prospects, leads et leurs détails complets au format CSV.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => exportToCSV('clients')}
              disabled={isExporting || isAuditing}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50"
            >
              {isExporting && status.includes('clients') ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Exporter les Clients
            </button>
            <button 
              onClick={runAudit}
              disabled={isExporting || isAuditing}
              className="w-full py-4 bg-white border-2 border-gray-900 text-gray-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              {isAuditing ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Lancer l'Audit des Doublons
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Table Collaborateurs</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Exporte tous les profils utilisateurs et collaborateurs enregistrés au format CSV.</p>
          </div>
          <button 
            onClick={() => exportToCSV('users')}
            disabled={isExporting || isAuditing}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50"
          >
            {isExporting && status.includes('users') ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter les Collaborateurs
          </button>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <User size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Analyse Assignations</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Identifiez les collaborateurs assignés aux clients pour détecter les erreurs d'import.</p>
          </div>
          <button 
            onClick={runCollabAnalysis}
            disabled={isAnalyzingCollabs}
            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-amber-600 transition-all disabled:opacity-50"
          >
            {isAnalyzingCollabs ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Analyser les Assignations
          </button>
        </div>
      </div>

      {collabAnalysis.length > 0 && (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Analyse des Collaborateurs Assignés</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Répartition des clients par agenceur référent</p>
              </div>
            </div>
            <button 
              onClick={() => {
                const csvHeaders = ["Valeur collaborateur trouvée dans les clients", "Nombre de clients"];
                const csvRows = collabAnalysis.map(c => [`"${c.name}"`, c.count].join(','));
                const csvContent = "\ufeff" + [csvHeaders.join(','), ...csvRows].join('\n');
                downloadCSV(`analyse_collaborateurs_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={14} /> Exporter l'analyse
            </button>
            <button onClick={() => setCollabAnalysis([])} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valeur collaborateur trouvée dans les clients</th>
                  <th className="text-right py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre de clients</th>
                </tr>
              </thead>
              <tbody>
                {collabAnalysis.map((collab, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-gray-900">{collab.name}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-black">
                        {collab.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {auditResult && (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Résultats de l'Audit</h3>
            </div>
            <div className="px-4 py-2 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
              {auditResult.totalCount} Clients analysés
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={20} />
                <span className="font-black uppercase tracking-widest text-xs">Doublons Exacts ({auditResult.duplicates.length})</span>
              </div>
              <div className="max-h-60 overflow-auto space-y-2 pr-2 custom-scrollbar">
                {auditResult.duplicates.length === 0 ? (
                  <p className="text-xs text-red-400 italic">Aucun doublon exact trouvé.</p>
                ) : (
                  auditResult.duplicates.map((d, i) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-red-100 text-[10px] space-y-1">
                      <p className="font-bold text-gray-900">{d.original.name}</p>
                      <p className="text-gray-400 font-mono">IDs: {d.original.id.slice(0,8)}... / {d.duplicate.id.slice(0,8)}...</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <UserX size={20} />
                <span className="font-black uppercase tracking-widest text-xs">Noms Inversés ({auditResult.invertedNames.length})</span>
              </div>
              <div className="max-h-60 overflow-auto space-y-2 pr-2 custom-scrollbar">
                {auditResult.invertedNames.length === 0 ? (
                  <p className="text-xs text-amber-400 italic">Aucun nom inversé trouvé.</p>
                ) : (
                  auditResult.invertedNames.map((d, i) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-amber-100 text-[10px] space-y-1">
                      <p className="font-bold text-gray-900">{d.original.name} <span className="text-amber-500">↔</span> {d.inverted.name}</p>
                      <p className="text-gray-400 font-mono">IDs: {d.original.id.slice(0,8)}... / {d.inverted.id.slice(0,8)}...</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{status}</p>
        </div>
      )}

      <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg h-fit">
          <ShieldCheck size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-900">Information de sécurité</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Ces fichiers contiennent des données sensibles. Veuillez les conserver dans un endroit sûr et les supprimer une fois les modifications terminées.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackupPage;
