
import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Building2, User, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { auth, db, seedDatabase } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
// Use @firebase/firestore to fix named export resolution issues
import { doc, setDoc } from '@firebase/firestore';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invitation State
  const [invitationData, setInvitationData] = useState<{
    inviteId: string;
    role: string;
    email: string;
  } | null>(null);

  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register States
  const [registerData, setRegisterData] = useState({
    companyName: '',
    activity: 'Cuisiniste',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const LOGO_URL = "https://framerusercontent.com/images/BrlQcPpho2hjJ0qjdKGIdbfXY.png?width=1024&height=276";

  useEffect(() => {
    // Check for invitation params in URL
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('inviteId');
    const role = params.get('role');
    const email = params.get('email');
    const viewParam = params.get('view');

    if (viewParam === 'register') {
      setView('register');
    }

    if (inviteId && role) {
      setInvitationData({ inviteId, role, email: email || '' });
      setRegisterData(prev => ({ ...prev, email: email || '' }));
      setView('register');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      onLogin();
    } catch (err: any) {
      setError("Identifiants incorrects ou problème de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (registerData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      const user = userCredential.user;

      // Si c'est une invitation, on utilise l'ID de société fourni et le rôle. Sinon, on crée une nouvelle société.
      let companyId = invitationData?.inviteId;
      let role = invitationData?.role || 'Administrateur';
      
      if (!companyId) {
         companyId = `comp_${Math.random().toString(36).substr(2, 9)}`;
      }

      const cleanFirst = registerData.firstName.trim().charAt(0).toUpperCase() + registerData.firstName.trim().slice(1).toLowerCase();
      const cleanLast = registerData.lastName.trim().toUpperCase();
      const fullName = `${cleanFirst} ${cleanLast}`;

      await updateProfile(user, { displayName: fullName });

      const userProfile = {
        uid: user.uid,
        name: fullName,
        firstName: cleanFirst,
        lastName: cleanLast,
        email: registerData.email.toLowerCase(),
        companyId: companyId,
        companyName: invitationData ? 'Agence (Rejoint)' : registerData.companyName,
        role: role,
        jobTitle: invitationData ? role : `Gérant - ${registerData.activity}`,
        avatar: `https://i.pravatar.cc/150?u=${user.uid}`,
        createdAt: new Date().toISOString(),
        isSubscriptionActive: true
      };

      // Création forcée du document utilisateur avec les bonnes valeurs
      await setDoc(doc(db, 'users', user.uid), userProfile);

      // Initialisation des données par défaut uniquement si création de nouvelle société
      if (!invitationData) {
        await seedDatabase(companyId, userProfile);
      }

      onLogin();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Cette adresse e-mail est déjà utilisée.");
      } else {
        setError("Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-900">
        <img 
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" 
          alt="Modern Kitchen" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 animate-in fade-in duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-between h-full p-16 text-white">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} className="h-10 w-auto brightness-0 invert" alt="Xora Logo" />
          </div>
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-5xl font-black leading-[1.1] tracking-tighter">
              {view === 'login' ? 'Simplifiez votre gestion,' : 'Rejoignez la révolution'} <span className="text-[#F97316] drop-shadow-md">{view === 'login' ? 'sublimez vos projets.' : 'de l\'aménagement.'}</span>
            </h2>
            <p className="text-lg text-gray-200 font-medium leading-relaxed max-w-lg">
              {view === 'login' ? 'La plateforme tout-en-un conçue pour les cuisinistes, par des cuisinistes.' : 'Créez votre espace entreprise en moins de 2 minutes.'}
            </p>
          </div>
          <div className="text-sm text-gray-400 font-medium">© 2025 Xora Technologies Inc.</div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 py-10">
          <div className="lg:hidden mb-4 flex justify-center"><img src={LOGO_URL} className="h-10 w-auto" alt="Xora Logo" /></div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
              {view === 'login' ? 'Ravi de vous revoir' : (invitationData ? 'Rejoindre votre équipe' : 'Créer votre compte Xora')}
            </h3>
            <p className="text-gray-500 font-medium">
              {view === 'login' 
                ? 'Accédez à votre tableau de bord.' 
                : (invitationData ? `Vous avez été invité en tant que ${invitationData.role}.` : 'Initialisez votre société.')}
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0" /><p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Adresse e-mail</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                  <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="nom@entreprise.com" className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1"><label className="text-[13px] font-bold text-gray-700">Mot de passe</label><button type="button" className="text-[12px] font-bold text-gray-400">Oublié ?</button></div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type={showPassword ? "text" : "password"} required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#F8F9FA] border border-gray-100 rounded-2xl pl-12 pr-12 py-4 text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-gray-900 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><ArrowRight size={18} /> Se connecter</>}
              </button>
              <div className="pt-4 text-center"><p className="text-sm font-bold text-gray-400">Nouveau sur XORA ? <button type="button" onClick={() => setView('register')} className="text-gray-900 hover:underline">Créer un compte</button></p></div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300 pb-10">
              
              {/* Masquer les infos société si c'est une invitation */}
              {!invitationData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#F97316]"><Building2 size={16} /><span className="text-[11px] font-black uppercase tracking-widest">Ma Société</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required placeholder="Enseigne" value={registerData.companyName} onChange={(e) => setRegisterData({...registerData, companyName: e.target.value})} className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-gray-900 transition-all outline-none" />
                    <select value={registerData.activity} onChange={(e) => setRegisterData({...registerData, activity: e.target.value})} className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-gray-900 transition-all outline-none"><option>Cuisiniste</option><option>Bainiste</option><option>Décorateur</option></select>
                  </div>
                </div>
              )}

              <div className={`space-y-4 ${!invitationData ? 'pt-4' : ''}`}>
                <div className="flex items-center gap-2 text-indigo-500"><User size={16} /><span className="text-[11px] font-black uppercase tracking-widest">{invitationData ? 'Mes informations' : 'Compte Administrateur'}</span></div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" required placeholder="Prénom" value={registerData.firstName} onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})} className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900" />
                  <input type="text" required placeholder="Nom" value={registerData.lastName} onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})} className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900" />
                </div>
                <input type="email" required placeholder="Email professionnel" value={registerData.email} onChange={(e) => setRegisterData({...registerData, email: e.target.value})} className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="password" required placeholder="Mot de passe" value={registerData.password} onChange={(e) => setRegisterData({...registerData, password: e.target.value})} className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900" />
                  <input type="password" required placeholder="Confirmer" value={registerData.confirmPassword} onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})} className="w-full bg-[#F8F9FA] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-900" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setView('login')} className="flex-1 px-6 py-4 border border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"><ArrowLeft size={18} /> Retour</button>
                <button type="submit" disabled={isLoading} className="flex-[2] bg-gray-900 text-white rounded-2xl py-4 font-bold text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70">{isLoading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={18} /> {invitationData ? 'Rejoindre l\'espace' : 'Créer mon espace'}</>}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
