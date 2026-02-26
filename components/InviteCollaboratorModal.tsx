
import React, { useState } from 'react';
import { X, UserPlus, Mail, User, ChevronDown, CheckCircle2, Loader2, Send } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'Agenceur'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !userProfile?.companyId) return;

    setIsLoading(true);
    try {
      const inviteEmail = formData.email.toLowerCase().trim();
      const appUrl = window.location.origin;
      
      // Le lien vers lequel le collaborateur sera redirigé pour créer son compte
      // On passe l'ID de la société et le rôle souhaité dans l'URL
      const registrationLink = `${appUrl}?view=register&inviteId=${userProfile.companyId}&email=${encodeURIComponent(inviteEmail)}&role=${encodeURIComponent(formData.role)}`;

      // Création du document dans la collection 'invitations'
      // Ce document sera détecté par l'extension Firebase "Trigger Email"
      await addDoc(collection(db, 'invitations'), {
        // Champs standards pour l'extension Firebase Email
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
        // Meta-données pour notre propre suivi en base de données
        meta: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          companyId: userProfile.companyId,
          invitedBy: userProfile.name,
          invitedByUid: userProfile.uid,
          status: 'pending',
          createdAt: serverTimestamp()
        }
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({ email: '', firstName: '', lastName: '', role: 'Agenceur' });
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
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-tighter">Invitation envoyée !</h3>
              <p className="text-gray-400 font-medium mt-2">Un email a été envoyé à <strong>{formData.email}</strong> pour rejoindre votre équipe.</p>
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
                  <h2 className="text-[18px] font-black text-gray-900 tracking-tight uppercase">Inviter un collaborateur</h2>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Équipe {userProfile?.companyName}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
                <X size={22} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Adresse Email*</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" size={18} />
                  <input 
                    required
                    type="email" 
                    placeholder="pro@agence-cuisine.fr" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Prénom</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="Jean" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom</label>
                  <input 
                    type="text" 
                    placeholder="DUBOIS" 
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Rôle au sein de l'agence</label>
                <div className="relative">
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full appearance-none px-5 py-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all shadow-inner"
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

            <div className="p-8 border-t border-gray-100 bg-[#FBFBFB] flex justify-center">
              <button 
                type="submit"
                disabled={isLoading || !formData.email}
                className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-2xl text-[15px] font-bold shadow-2xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
                Envoyer l'invitation Xora
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteCollaboratorModal;
