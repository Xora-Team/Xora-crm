
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  PenSquare, 
  Phone, 
  Mail, 
  ChevronDown, 
  Camera, 
  Loader2, 
  User, 
  Briefcase, 
  Settings, 
  Laptop, 
  Car, 
  Smartphone,
  Palette,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { db } from '../firebase';
// Use @firebase/firestore to fix named export resolution issues
import { doc, updateDoc, onSnapshot, writeBatch, collection, query, where, getDocs } from '@firebase/firestore';
import UserDocuments from './UserDocuments';

interface UserProfileProps {
  userProfile: any;
  setUserProfile: (profile: any) => void;
  onBack?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userProfile, setUserProfile, onBack }) => {
  const [activeTab, setActiveTab] = useState('Informations');
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    civility: userProfile?.civility || 'Mr',
    lastName: userProfile?.lastName || '',
    firstName: userProfile?.firstName || '',
    email: userProfile?.email || '',
    portable: userProfile?.portable || userProfile?.phone || '',
    fixed: userProfile?.fixed || '',
    contractType: userProfile?.contractType || 'CDI',
    jobTitle: userProfile?.jobTitle || userProfile?.role || 'Agenceur',
    hasPhone: userProfile?.hasPhone ?? true,
    hasCar: userProfile?.hasCar ?? true,
    hasLaptop: userProfile?.hasLaptop ?? true,
    agendaColor: userProfile?.agendaColor || '#6366f1',
    isSubscriptionActive: userProfile?.isSubscriptionActive ?? true,
    avatar: userProfile?.avatar || `https://i.pravatar.cc/150?u=${userProfile?.uid}`
  });

  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        lastName: userProfile.lastName || prev.lastName,
        firstName: userProfile.firstName || prev.firstName,
        email: userProfile.email || prev.email,
        jobTitle: userProfile.jobTitle || userProfile.role || prev.jobTitle,
        avatar: userProfile.avatar || prev.avatar,
        agendaColor: userProfile.agendaColor || prev.agendaColor,
        hasPhone: userProfile.hasPhone ?? prev.hasPhone,
        hasCar: userProfile.hasCar ?? prev.hasCar,
        hasLaptop: userProfile.hasLaptop ?? prev.hasLaptop,
        isSubscriptionActive: userProfile.isSubscriptionActive ?? prev.isSubscriptionActive
      }));
    }
  }, [userProfile]);

  const syncProfileEverywhere = async (newName: string, newAvatar: string) => {
    if (!userProfile?.uid) return;
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      const clientsQ = query(collection(db, 'clients'), where('addedBy.uid', '==', userProfile.uid));
      const clientsSnap = await getDocs(clientsQ);
      clientsSnap.forEach(d => {
        batch.update(doc(db, 'clients', d.id), {
          "addedBy.name": newName,
          "addedBy.avatar": newAvatar
        });
      });
      const projectsQ = query(collection(db, 'projects'), where('agenceur.uid', '==', userProfile.uid));
      const projectsSnap = await getDocs(projectsQ);
      projectsSnap.forEach(d => {
        batch.update(doc(db, 'projects', d.id), {
          "agenceur.name": newName,
          "agenceur.avatar": newAvatar
        });
      });
      await batch.commit();
    } catch (e) {
      console.error("Erreur synchro profil:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdate = async (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    try {
      if (userProfile?.uid) {
        const userRef = doc(db, 'users', userProfile.uid);
        let finalFirst = formData.firstName;
        let finalLast = formData.lastName;
        let finalAvatar = formData.avatar;

        if (field === 'firstName') finalFirst = value;
        if (field === 'lastName') finalLast = value.toUpperCase();
        if (field === 'avatar') finalAvatar = value;

        const fullName = `${finalFirst} ${finalLast}`;
        
        await updateDoc(userRef, { 
          [field]: value,
          name: fullName,
          lastName: finalLast 
        });

        if (field === 'firstName' || field === 'lastName' || field === 'avatar') {
          await syncProfileEverywhere(fullName, finalAvatar);
        }

        setUserProfile({ ...userProfile, ...newFormData, name: fullName, lastName: finalLast });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("L'image est trop lourde (max 1Mo)."); return; }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await handleUpdate('avatar', base64String);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
        <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] overflow-y-auto hide-scrollbar font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      {/* Header Stylisé */}
      <div className="px-10 py-10 flex justify-between items-end shrink-0">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-6">
            <div onClick={handleAvatarClick} className="relative group cursor-pointer w-24 h-24 flex-shrink-0">
              <img 
                src={formData.avatar} 
                className={`w-full h-full rounded-[32px] aspect-square object-cover border-4 border-white shadow-xl transition-all ${isUploading ? 'opacity-50' : 'group-hover:brightness-75'}`} 
                alt="" 
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? <Loader2 className="text-white animate-spin" size={24} /> : <Camera className="text-white" size={24} />}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{formData.firstName} {formData.lastName}</h1>
                {formData.isSubscriptionActive && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Compte Vérifié</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <p className="text-sm font-bold text-gray-400">{formData.jobTitle}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-gray-600">
                    <Phone size={14} className="text-gray-300" /> {formData.portable || 'Non renseigné'}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold text-gray-600">
                    <Mail size={14} className="text-gray-300" /> {formData.email}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex bg-white rounded-2xl p-1 border border-gray-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('Informations')} 
            className={`px-8 py-2.5 text-[13px] font-bold rounded-xl transition-all ${activeTab === 'Informations' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Mon Profil
          </button>
          <button 
            onClick={() => setActiveTab('Documents')} 
            className={`px-8 py-2.5 text-[13px] font-bold rounded-xl transition-all ${activeTab === 'Documents' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Mes Documents
          </button>
        </div>
      </div>

      <div className="px-10 pb-10 flex-1 relative">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
          
          {activeTab === 'Informations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Colonne de gauche : Formulaires */}
              <div className="lg:col-span-2 space-y-8">
                
                <Section title="Identité personnelle" icon={User}>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Civilité</label>
                    <div className="relative">
                      <select 
                        value={formData.civility} 
                        onChange={(e) => handleUpdate('civility', e.target.value)} 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                      >
                        <option>Mr</option>
                        <option>Mme</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Prénom</label>
                      <input type="text" value={formData.firstName} onChange={(e) => handleUpdate('firstName', e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Nom</label>
                      <input type="text" value={formData.lastName} onChange={(e) => handleUpdate('lastName', e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm uppercase" />
                    </div>
                  </div>
                </Section>

                <Section title="Poste & Contrat" icon={Briefcase}>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Fonction</label>
                    <input type="text" value={formData.jobTitle} onChange={(e) => handleUpdate('jobTitle', e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Type de contrat</label>
                    <div className="relative">
                      <select 
                        value={formData.contractType} 
                        onChange={(e) => handleUpdate('contractType', e.target.value)} 
                        className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                      >
                        <option>CDI</option>
                        <option>CDD</option>
                        <option>Alternance</option>
                        <option>Freelance</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    </div>
                  </div>
                </Section>

                <Section title="Personnalisation" icon={Palette}>
                  <div className="md:col-span-2 flex items-center justify-between bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Couleur d'agenda</h4>
                      <p className="text-[11px] text-gray-400 font-medium">Cette couleur sera utilisée pour vos rendez-vous.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-xl shadow-lg border-2 border-white" 
                        style={{ backgroundColor: formData.agendaColor }}
                      />
                      <input 
                        type="color" 
                        value={formData.agendaColor} 
                        onChange={(e) => handleUpdate('agendaColor', e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer opacity-0 absolute"
                      />
                      <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-700 shadow-sm">Modifier</button>
                    </div>
                  </div>
                </Section>

              </div>

              {/* Colonne de droite : Outils & Statut */}
              <div className="space-y-8">
                
                {/* Statut du compte */}
                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-400">
                      <CreditCard size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Abonnement</h3>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl border border-gray-100">
                    <span className="text-[13px] font-bold text-gray-700">Accès plateforme</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-black uppercase ${formData.isSubscriptionActive ? 'text-green-500' : 'text-red-500'}`}>
                        {formData.isSubscriptionActive ? 'Actif' : 'Désactivé'}
                      </span>
                      <button 
                        onClick={() => handleUpdate('isSubscriptionActive', !formData.isSubscriptionActive)}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.isSubscriptionActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${formData.isSubscriptionActive ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic px-2">
                    L'abonnement Xora est géré par l'administrateur de votre société.
                  </p>
                </div>

                {/* Équipements */}
                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                    <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
                      <Settings size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Équipements</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { key: 'hasLaptop', label: 'Ordinateur pro', icon: Laptop },
                      { key: 'hasPhone', label: 'Mobile pro', icon: Smartphone },
                      { key: 'hasCar', label: 'Véhicule société', icon: Car },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all group">
                        <div className="flex items-center gap-3">
                          <item.icon size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                          <span className="text-[13px] font-bold text-gray-600">{item.label}</span>
                        </div>
                        <button 
                          onClick={() => handleUpdate(item.key, !formData[item.key as keyof typeof formData])}
                          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${formData[item.key as keyof typeof formData] ? 'bg-gray-800' : 'bg-gray-200'}`}
                        >
                          <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all duration-300 shadow-sm ${formData[item.key as keyof typeof formData] ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'Documents' && (
            <UserDocuments userId={userProfile.uid} userProfile={userProfile} />
          )}

        </div>
      </div>
    </div>
  );
};

export default UserProfile;
