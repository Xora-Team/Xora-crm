
import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Loader2,
  ExternalLink,
  X,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface UserDocumentsProps {
  userId: string;
  userProfile: any;
}

interface DocumentMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: any;
  url: string;
  storagePath: string;
}

const UserDocuments: React.FC<UserDocumentsProps> = ({ userId, userProfile }) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    const q = query(collection(db, 'user_documents'), where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DocumentMetadata[];
      
      docs.sort((a, b) => {
        const timeB = b.uploadedAt?.seconds || 0;
        const timeA = a.uploadedAt?.seconds || 0;
        return timeB - timeA;
      });

      setDocuments(docs);
      setIsLoading(false);
    }, (error) => {
      console.error("Erreur Firestore User Documents:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !userId) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uniqueId = Date.now() + Math.random().toString(36).substring(7);
        const fileName = `${uniqueId}_${file.name}`;
        
        const storagePath = `users/${userId}/documents/${fileName}`;
        const fileRef = ref(storage, storagePath);

        const uploadResult = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        await addDoc(collection(db, 'user_documents'), {
          userId,
          companyId: userProfile.companyId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: downloadUrl,
          storagePath: storagePath, 
          uploadedAt: serverTimestamp(),
          uploadedBy: userProfile.name
        });
      }
    } catch (e: any) {
      console.error("Échec du transfert:", e);
      alert(`Erreur lors du transfert : ${e.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    
    const docData = docToDelete;
    setDocToDelete(null);

    setDeletingIds(prev => {
      const next = new Set(prev);
      next.add(docData.id);
      return next;
    });

    try {
      if (docData.storagePath) {
        try {
          const fileRef = ref(storage, docData.storagePath);
          await deleteObject(fileRef);
        } catch (storageErr: any) {
          console.warn("Storage err:", storageErr.code);
        }
      }
      await deleteDoc(doc(db, 'user_documents', docData.id));
    } catch (e: any) {
      console.error("Erreur Firestore:", e);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(docData.id);
        return next;
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="text-blue-500" size={24} />;
    if (type.includes('pdf')) return <FileText className="text-red-500" size={24} />;
    return <File className="text-gray-400" size={24} />;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#F8F9FA] rounded-2xl flex items-center justify-center text-gray-800 shadow-sm border border-gray-100">
            <FolderOpen size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Mon coffre-fort numérique</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Stockez vos documents personnels importants</p>
          </div>
        </div>
      </div>

      <div className="bg-[#f8f9fa] border border-gray-100 rounded-[32px] p-8 min-h-[450px] space-y-8 shadow-sm">
        
        <div 
          onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-[24px] p-12 flex flex-col items-center justify-center transition-all cursor-pointer group ${
            dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-inner shadow-sm'
          }`}
        >
          <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${isUploading ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-gray-50 text-gray-400 group-hover:scale-110 group-hover:text-indigo-500'}`}>
            {isUploading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold text-gray-800">{isUploading ? "Transfert en cours..." : "Charger un document"}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-1">Contrat, RIB, Diplôme... PDF ou Images acceptés</p>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-gray-200" size={32} /></div>
          ) : documents.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white border border-gray-100 rounded-[24px]">
               <File size={40} className="mx-auto text-gray-100" />
               <p className="text-[13px] font-bold text-gray-300 italic">Aucun document stocké.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((docItem) => {
                const isDeleting = deletingIds.has(docItem.id);
                return (
                  <div key={docItem.id} className={`bg-white border border-gray-100 rounded-[24px] p-5 flex items-center justify-between group transition-all ${isDeleting ? 'opacity-50 grayscale pointer-events-none' : 'hover:shadow-xl hover:border-indigo-100'}`}>
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100">
                        {getFileIcon(docItem.type)}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-[13px] font-black text-gray-900 truncate uppercase tracking-tighter" title={docItem.name}>{docItem.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                          <span>{formatSize(docItem.size)}</span>
                          <span>•</span>
                          <span>{docItem.uploadedAt ? docItem.uploadedAt.toDate().toLocaleDateString('fr-FR') : 'Synchro...'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isDeleting ? (
                        <div className="p-2"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>
                      ) : (
                        <>
                          <a href={docItem.url} target="_blank" rel="noreferrer" className="p-2.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><ExternalLink size={18} /></a>
                          <button onClick={() => setDocToDelete(docItem)} className="p-2.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {docToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-8 shadow-inner"><AlertTriangle size={40} /></div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Supprimer définitivement ?</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-10">"{docToDelete.name}" sera effacé de votre coffre-fort personnel.</p>
              <div className="flex gap-4 w-full">
                <button onClick={() => setDocToDelete(null)} className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[13px] hover:bg-gray-100 transition-all border border-gray-100">Annuler</button>
                <button onClick={confirmDelete} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold text-[13px] hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95">Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDocuments;
