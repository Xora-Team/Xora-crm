
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
    contractType: 'CDI',
    jobTitle: 'Agenceur',
    role: 'Agenceur',
    hasPhone: false,
    hasCar: false,
    hasLaptop: false,
    agendaColor: '#A8A8A8'
  });

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
      
      const registrationLink = `${appUrl}?view=register&inviteId=${userProfile.companyId}&email=${encodeURIComponent(inviteEmail)}&firstName=${encodeURIComponent(formData.firstName)}&lastName=${encodeURIComponent(formData.lastName)}&role=${encodeURIComponent(formData.role)}`;

      await addDoc(collection(db, 'invitations'), {
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
          contractType: 'CDI',
          jobTitle: 'Agenceur',
          role: 'Agenceur',
          hasPhone: false,
          hasCar: false,
          hasLaptop: false,
          agendaColor: '#A8A8A8'
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Civilité du membre</label>
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
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nom du membre</label>
                    <input 
                      type="text" 
                      placeholder="COLOMB" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Prénom du membre</label>
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
                        placeholder="Entrer un numéro" 
                        value={formData.phoneMobile}
                        onChange={(e) => setFormData({...formData, phoneMobile: e.target.value})}
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
                        placeholder="Entrer un numéro" 
                        value={formData.phoneFixed}
                        onChange={(e) => setFormData({...formData, phoneFixed: e.target.value})}
                        className="w-full pl-16 pr-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Type de contrat</label>
                    <input 
                      type="text" 
                      placeholder="CDI" 
                      value={formData.contractType}
                      onChange={(e) => setFormData({...formData, contractType: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Métier</label>
                    <input 
                      type="text" 
                      placeholder="Agenceur" 
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Droit</label>
                    <div className="relative">
                      <select 
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full appearance-none px-4 py-3 bg-[#F8F9FA] border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                      >
                        <option>Agenceur</option>
                        <option>Administrateur</option>
                        <option>Métreur</option>
                        <option>Poseur</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Téléphone mise à disposition</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, hasPhone: !formData.hasPhone})}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${formData.hasPhone ? 'bg-gray-800' : 'bg-gray-200'}`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all duration-300 shadow-sm ${formData.hasPhone ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Véhicule</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, hasCar: !formData.hasCar})}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${formData.hasCar ? 'bg-gray-800' : 'bg-gray-200'}`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all duration-300 shadow-sm ${formData.hasCar ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Oui</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Ordinateur portable</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Non</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, hasLaptop: !formData.hasLaptop})}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${formData.hasLaptop ? 'bg-gray-800' : 'bg-gray-200'}`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all duration-300 shadow-sm ${formData.hasLaptop ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Oui</span>
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
                Ajouter le membre
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteCollaboratorModal;
