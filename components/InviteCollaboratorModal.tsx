
import React, { useState } from 'react';
import { X, UserPlus, Mail, User, ChevronDown, CheckCircle2, Loader2, Send, Smartphone, Car, Laptop, Palette, ShieldCheck, Phone } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from '@firebase/firestore';

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

const InviteCollaboratorModal: React.FC<InviteCollaboratorModalProps> = ({ isOpen, onClose, userProfile }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    hasSubscription: true,
    civility: 'Mr',
    lastName: '',
    firstName: '',
    emailPro: '',
    emailPerso: '',
    phoneMobile: '',
    phoneFixed: '',
    address: '',
    contractType: 'CDI',
    metier: [] as string[],
    role: 'Concepteur.rice',
    hasPhone: false,
    hasCar: false,
    hasLaptop: false,
    agendaColor: '#A8A8A8',
    avatar: null as string | null
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const contractTypes = [
    'CDI',
    'CDD',
    'Contrat d\'apprentissage',
    'Stagiaire',
    'Gérant',
    'Agent Commercial',
    'Freelance'
  ];

  const jobs = [
    'Concepteur.rice',
    'Assistant.e commercial.e',
    'Adv',
    'Assistant.e de direction',
    'Poseur',
    'Métreur',
    'Secrétaire',
    'Magasinier.e',
    'Directeur.rice',
    'Chef.fe d\'entreprise'
  ];

  const toggleJob = (job: string) => {
    const currentJobs = formData.metier;
    let newJobs;
    if (currentJobs.includes(job)) {
      newJobs = currentJobs.filter(j => j !== job);
    } else {
      newJobs = [...currentJobs, job];
    }
    
    const updates: any = { metier: newJobs };
    // Si Chef.fe d'entreprise est sélectionné, on force le rôle Administrateur.rice
    if (newJobs.includes("Chef.fe d'entreprise")) {
      updates.role = "Administrateur.rice";
    }
    
    setFormData({ ...formData, ...updates });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.emailPro || !userProfile?.companyId) return;

    if (formData.hasSubscription && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsLoading(true);
    try {
      const inviteEmail = formData.emailPro.toLowerCase().trim();
      const appUrl = 'https://app.xora.fr/';
      
      const { doc, collection, setDoc } = await import('@firebase/firestore');
      const invitationRef = doc(collection(db, 'invitations'));
      const invitationId = invitationRef.id;
      
      const registrationLink = `${appUrl}?view=register&inviteId=${userProfile.companyId}&email=${encodeURIComponent(inviteEmail)}&firstName=${encodeURIComponent(formData.firstName)}&lastName=${encodeURIComponent(formData.lastName)}&role=${encodeURIComponent(formData.role)}&hasSubscription=${formData.hasSubscription}&address=${encodeURIComponent(formData.address)}&avatar=${encodeURIComponent(formData.avatar || '')}`;

      await setDoc(invitationRef, {
        to: inviteEmail,
        message: {
          subject: `🚀 Rejoignez l'équipe de ${userProfile.companyName || 'Xora'}`,
          html: `
            <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 24px; padding: 40px; color: #111827; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">XORA <span style="color: #6366f1;">CRM</span></h1>
              </div>
              
              <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Bonjour ${formData.firstName},</h2>
              
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
                <strong>${userProfile.name}</strong> vous invite à rejoindre l'espace collaborateur de <strong>${userProfile.companyName || 'votre agence'}</strong> en tant que <strong>${formData.role}</strong>.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${registrationLink}" style="background-color: #111827; color: #ffffff; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                  Accepter l'invitation
                </a>
              </div>
              
              <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 32px; border-top: 1px solid #f3f4f6; pt: 24px;">
                Si le bouton ne fonctionne pas, copiez ce lien : <br/>
                <span style="word-break: break-all; color: #6366f1;">${registrationLink}</span>
              </p>
            </div>
          `,
        },
        meta: {
          ...formData,
          companyId: userProfile.companyId,
          invitedBy: userProfile.name,
          invitedByUid: userProfile.uid,
          status: 'pending',
          createdAt: serverTimestamp()
        }
      });

      // Notification à bonjour@xora.fr si abonnement actif
      if (formData.hasSubscription) {
        await addDoc(collection(db, 'invitations'), {
          to: 'bonjour@xora.fr',
          message: {
            subject: `🔔 Nouvelle adhésion Xora : ${formData.firstName} ${formData.lastName}`,
            html: `
              <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 24px; padding: 40px; color: #111827; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">XORA <span style="color: #6366f1;">CRM</span></h1>
                </div>
                
                <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">Nouvelle adhésion détectée</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
                  Un nouveau collaborateur a été invité avec une <strong>licence Xora active</strong>.
                </p>
                
                <div style="background-color: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Collaborateur</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formData.firstName} ${formData.lastName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formData.emailPro}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Société</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${userProfile.companyName || 'Non renseignée'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invité par</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${userProfile.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Rôle</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formData.role}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px;">
                  Ceci est une notification automatique de Xora CRM.
                </p>
              </div>
            `
          }
        });
      }

      setSuccess(true);
      setShowConfirmation(false);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          hasSubscription: true,
          civility: 'Mr',
          lastName: '',
          firstName: '',
          emailPro: '',
          emailPerso: '',
          phoneMobile: '',
          phoneFixed: '',
          address: '',
          contractType: 'CDI',
          metier: [],
          role: 'Concepteur.rice',
          hasPhone: false,
          hasCar: false,
          hasLaptop: false,
          agendaColor: '#A8A8A8',
          avatar: null
        });
      }, 2500);
    } catch (error) {
      console.error("Erreur invitation:", error);
      alert("Une erreur est survenue lors de l'envoi de l'invitation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative">
        
        {/* Confirmation Overlay */}
        {showConfirmation && (
          <div className="absolute inset-0 z-[110] bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-r from-orange-400 via-purple-500 to-blue-500 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                    <img src="/logo-icon.png" className="w-6 h-6 object-contain" alt="" onError={(e) => {
                      e.currentTarget.src = "https://ais-pre-j7ztokxgij6hd552ebx6b7-346209007011.europe-west2.run.app/logo-icon.png";
                    }} />
                  </div>
                  <h3 className="text-white font-bold text-lg">Activer l'accès à Xora</h3>
                </div>
                <button onClick={() => setShowConfirmation(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-8 text-center">
                <p className="text-gray-600 text-[15px] font-medium">
                  Vous êtes sur le point d'activer l'accès à Xora pour <span className="font-bold text-gray-900">{formData.firstName} {formData.lastName}</span>, êtes vous sûr ?
                </p>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData({...formData, hasSubscription: false});
                      setShowConfirmation(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-50 text-gray-700 text-sm font-bold hover:bg-gray-100 rounded-2xl transition-all border border-gray-100"
                  >
                    <X size={18} /> Non, je ne prends pas d'abonnement
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-50 text-gray-900 text-sm font-bold hover:bg-gray-100 rounded-2xl transition-all border border-gray-100"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Oui activer l'abonnement Xora
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-tighter">Invitation envoyée !</h3>
              <p className="text-gray-400 font-medium mt-2">Un email a été envoyé à <strong>{formData.emailPro}</strong> pour rejoindre votre équipe.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[#FBFBFB]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-[18px] font-black text-gray-900 tracking-tight uppercase">Ajouter un collaborateur</h2>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
                <X size={22} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Subscription Toggle */}
              <div className="bg-gradient-to-r from-orange-400 via-purple-500 to-blue-500 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-sm">Abonnement Xora</span>
                  <div className="px-2 py-0.5 bg-white/20 rounded-lg border border-white/30">
                    <span className="text-[10px] font-black text-white tracking-widest">XORA</span>
                  </div>
                </div>
                <div className="flex bg-white/20 p-1 rounded-xl border border-white/30">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, hasSubscription: false})}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!formData.hasSubscription ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white'}`}
                  >
                    Non
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, hasSubscription: true})}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.hasSubscription ? 'bg-gray-900 text-white shadow-sm' : 'text-white/70 hover:text-white'}`}
                  >
                    Oui
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-6">
                {/* Photo Upload Section */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Photo du collaborateur</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shadow-inner group relative">
                        {formData.avatar ? (
                          <>
                            <img src={formData.avatar} className="w-full h-full object-cover" alt="Preview" />
                            <button 
                              type="button"
                              onClick={() => setFormData({ ...formData, avatar: null })}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={20} className="text-white" />
                            </button>
                          </>
                        ) : (
                          <User size={32} className="text-gray-200" />
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                      >
                        Sélectionner une photo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Civilité du collaborateur</label>
                    <div className="relative">
                      <select 
                        value={formData.civility}
                        onChange={(e) => setFormData({...formData, civility: e.target.value})}
                        className="w-full appearance-none px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                      >
                        <option>Mr</option>
                        <option>Mme</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nom du collaborateur</label>
                    <input 
                      type="text" 
                      placeholder="COLOMB" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Prénom du collaborateur</label>
                    <input 
                      type="text" 
                      placeholder="Jérémy" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email professionnel</label>
                    <input 
                      required
                      type="email" 
                      placeholder="jeremy.colomb@travauxconfort.com" 
                      value={formData.emailPro}
                      onChange={(e) => setFormData({...formData, emailPro: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email perso</label>
                    <input 
                      type="email" 
                      placeholder="jeremy.colomb@gmail.com" 
                      value={formData.emailPerso}
                      onChange={(e) => setFormData({...formData, emailPerso: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Téléphone portable</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <img src="https://flagcdn.com/w20/fr.png" className="w-5 h-3 object-cover rounded-sm" alt="FR" />
                        <ChevronDown size={12} className="text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="06 00 00 00 00" 
                        value={formData.phoneMobile}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
                          const formatted = digits.match(/.{1,2}/g)?.join(' ') || digits;
                          setFormData({...formData, phoneMobile: formatted});
                        }}
                        className="w-full pl-16 pr-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Téléphone fixe</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <img src="https://flagcdn.com/w20/fr.png" className="w-5 h-3 object-cover rounded-sm" alt="FR" />
                        <ChevronDown size={12} className="text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="01 00 00 00 00" 
                        value={formData.phoneFixed}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
                          const formatted = digits.match(/.{1,2}/g)?.join(' ') || digits;
                          setFormData({...formData, phoneFixed: formatted});
                        }}
                        className="w-full pl-16 pr-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Adresse du collaborateur</label>
                  <input 
                    type="text" 
                    placeholder="12 rue des Mimosas, 11100 Narbonne" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Type de contrat</label>
                    <div className="relative">
                      <select 
                        value={formData.contractType}
                        onChange={(e) => setFormData({...formData, contractType: e.target.value})}
                        className="w-full appearance-none px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                      >
                        {contractTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Métier</label>
                    <div className="relative group">
                      <div className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none min-h-[46px] flex flex-wrap gap-2 shadow-inner">
                        {formData.metier.length > 0 ? (
                          formData.metier.map(job => (
                            <span key={job} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1">
                              {job}
                              <X size={10} className="cursor-pointer" onClick={() => toggleJob(job)} />
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 font-normal italic">Sélectionner un ou plusieurs métiers</span>
                        )}
                      </div>
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto hidden group-hover:block hover:block">
                        {jobs.map(job => (
                          <div 
                            key={job}
                            onClick={() => toggleJob(job)}
                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${formData.metier.includes(job) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'}`}
                          >
                            {job}
                            {formData.metier.includes(job) && <CheckCircle2 size={14} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Rôle</label>
                    <div className="relative">
                      <select 
                        disabled={formData.metier.includes("Chef.fe d'entreprise")}
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full appearance-none px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner disabled:opacity-50 disabled:bg-gray-100"
                      >
                        <option value="Administrateur.rice">Administrateur.rice</option>
                        <option value="Concepteur.rice">Concepteur.rice</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {formData.metier.includes("Chef.fe d'entreprise") && (
                      <p className="text-[10px] text-indigo-500 font-bold ml-1">Le rôle Administrateur.rice est requis pour ce métier.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase text-center leading-tight">Téléphone mise à disposition</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, hasPhone: !formData.hasPhone})}
                        className={`w-11 h-6 rounded-full relative transition-all duration-300 ${formData.hasPhone ? 'bg-gray-900' : 'bg-gray-200'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.hasPhone ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase text-center leading-tight">Véhicule</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, hasCar: !formData.hasCar})}
                        className={`w-11 h-6 rounded-full relative transition-all duration-300 ${formData.hasCar ? 'bg-gray-900' : 'bg-gray-200'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.hasCar ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase text-center leading-tight">Ordinateur portable</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, hasLaptop: !formData.hasLaptop})}
                        className={`w-11 h-6 rounded-full relative transition-all duration-300 ${formData.hasLaptop ? 'bg-gray-900' : 'bg-gray-200'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.hasLaptop ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Picker */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Couleur collaborateur agenda</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl border border-gray-100 shadow-sm shrink-0"
                    style={{ backgroundColor: formData.agendaColor }}
                  />
                  <div className="relative flex-1">
                    <input 
                      type="color"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={formData.agendaColor}
                      onChange={(e) => setFormData({...formData, agendaColor: e.target.value})}
                    />
                    <div className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 pointer-events-none">
                      <span className="uppercase">{formData.agendaColor.replace('#', '')}</span>
                      <ChevronDown size={18} className="text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-[#FBFBFB] flex justify-center">
              <button 
                type="submit"
                disabled={isLoading || !formData.emailPro}
                className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-white border border-gray-200 text-gray-900 rounded-2xl text-[15px] font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                Ajouter le collaborateur
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteCollaboratorModal;
