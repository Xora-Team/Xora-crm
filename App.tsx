
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Directory from './components/Directory';
import Agenda from './components/Agenda';
import Modal from './components/Modal';
import ClientDetails from './components/ClientDetails';
import Articles from './components/Articles';
import TasksMemo from './components/TasksMemo';
import ProjectTracking from './components/ProjectTracking';
import ProjectDetails from './components/ProjectDetails';
import UserProfile from './components/UserProfile';
import CompanyManagement from './components/CompanyManagement';
import OurCompany from './components/OurCompany';
import KPIManagement from './components/KPIManagement';
import LoginPage from './components/LoginPage';
import BackupPage from './components/BackupPage';
import AddTaskModal from './components/AddTaskModal';
import { Page, Client } from './types';
import { Construction, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// Use @firebase/firestore to fix named export resolution issues
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';

// Wrapper component to handle ClientDetails with URL params
const ClientDetailsWrapper = ({ userProfile, onProjectSelect }: { userProfile: any, onProjectSelect: (project: any) => void }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'clients', id), (docSnap) => {
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...docSnap.data() } as Client);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
    </div>
  );

  if (!client) return (
    <div className="p-8 text-center text-gray-500">Client non trouvé</div>
  );

  return (
    <ClientDetails 
      client={client} 
      userProfile={userProfile} 
      onBack={() => navigate(-1)}
      onProjectSelect={onProjectSelect}
      onClientClick={(c) => navigate(`/contact/${c.id}`)}
    />
  );
};

const ProjectDetailsWrapper: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'projects', id), (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      } else {
        setProject(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
  if (!project) return <div className="p-8 text-center">Projet non trouvé.</div>;

  return (
    <ProjectDetails 
      project={project} 
      userProfile={userProfile} 
      onBack={() => navigate(-1)} 
    />
  );
};

import { Toaster } from 'sonner';

function App() {
  const navigate = useNavigate();
  const cleanupInProgress = useRef(false);
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [directoryActiveTab, setDirectoryActiveTab] = useState('Tous');
  const [initialFilter, setInitialFilter] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'contacts' | 'suppliers' | 'artisans' | 'prescribers'>('contacts');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isLeadAutoTaskActive, setIsLeadAutoTaskActive] = useState(false); 
  const [taskModalForClient, setTaskModalForClient] = useState<{id: string, name: string} | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const getCurrentPage = (): Page => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path === '/contacts') return 'directory';
    if (path === '/suppliers') return 'suppliers';
    if (path === '/artisans') return 'artisans';
    if (path === '/prescriber') return 'prescriber';
    if (path === '/agenda') return 'agenda';
    if (path === '/articles') return 'articles';
    if (path === '/tasks') return 'tasks';
    if (path === '/projects') return 'projects';
    if (path === '/company') return 'company';
    if (path === '/our_company') return 'our_company';
    if (path === '/profile') return 'profile';
    if (path === '/kpi') return 'kpi';
    if (path.startsWith('/contact/')) return 'directory';
    return 'dashboard';
  };

  const currentPage = getCurrentPage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthError(null);
        const unsubDoc = onSnapshot(
          doc(db, 'users', user.uid), 
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile({ uid: user.uid, ...docSnap.data() });
              setIsAuthenticated(true);
              setIsLoadingAuth(false);
            } else {
              const defaultProfile = {
                name: user.displayName || 'Utilisateur',
                email: user.email,
                companyId: 'temp_company',
                avatar: null,
                role: 'Concepteur.rice',
                lastName: '',
                firstName: '',
                isSubscriptionActive: true
              };
              setDoc(doc(db, 'users', user.uid), defaultProfile)
                .catch(err => console.error("Erreur creation profil auto:", err));
              
              setUserProfile({ uid: user.uid, ...defaultProfile });
              setIsAuthenticated(true);
              setIsLoadingAuth(false);
            }
          },
          (error) => {
            console.error("Erreur Permission Firestore:", error);
            if (error.code === 'permission-denied' && auth.currentUser) {
              setAuthError("Accès refusé : Veuillez configurer les règles de sécurité Firestore dans la console Firebase.");
            }
            setIsLoadingAuth(false);
          }
        );
        return () => unsubDoc();
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
        setAuthError(null); 
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cleanupSpontane = async () => {
      if (!isAuthenticated || !userProfile?.companyId || cleanupInProgress.current) return;
      
      const cleanupDone = sessionStorage.getItem('xora_cleanup_spontane_done');
      if (cleanupDone) return;

      cleanupInProgress.current = true;

      try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('companyId', '==', userProfile.companyId));
        const querySnapshot = await getDocs(q);
        
        const docsToUpdate: { id: string, data: any }[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let needsUpdate = false;
          const updateData: any = {};

          if (data.origin && (data.origin.toLowerCase() === 'spontanné' || data.origin === 'SPONTANNÉ')) {
            updateData.origin = 'Spontané';
            needsUpdate = true;
          }

          if (data.details?.origin && (data.details.origin.toLowerCase() === 'spontanné' || data.details.origin === 'SPONTANNÉ')) {
            if (!updateData.details) updateData.details = { ...data.details };
            updateData.details.origin = 'Spontané';
            needsUpdate = true;
          }

          if (needsUpdate) {
            docsToUpdate.push({ id: docSnap.id, data: updateData });
          }
        });

        if (docsToUpdate.length > 0) {
          const BATCH_SIZE = 500;
          for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);
            chunk.forEach(item => {
              batch.update(doc(db, 'clients', item.id), item.data);
            });
            await batch.commit();
          }
        }
        
        sessionStorage.setItem('xora_cleanup_spontane_done', 'true');
      } catch (error) {
        console.error("Erreur lors du nettoyage de la base de données:", error);
      } finally {
        cleanupInProgress.current = false;
      }
    };

    cleanupSpontane();
  }, [isAuthenticated, userProfile?.companyId]);

  useEffect(() => {
    const runRgpdMigration = async () => {
      if (!isAuthenticated || !userProfile?.companyId) return;
      
      const migrationDone = localStorage.getItem('xora_rgpd_migration_done');
      if (migrationDone) return;

      try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('companyId', '==', userProfile.companyId));
        const querySnapshot = await getDocs(q);
        
        const docsToUpdate: { id: string, data: any }[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const details = data.details || {};
          
          // If rgpd exists but rgpdConsent doesn't, or they are different
          if (details.rgpd !== undefined && details.rgpdConsent === undefined) {
            docsToUpdate.push({
              id: docSnap.id,
              data: { 'details.rgpdConsent': details.rgpd }
            });
          }
        });

        if (docsToUpdate.length > 0) {
          const BATCH_SIZE = 500;
          for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);
            chunk.forEach(item => {
              batch.update(doc(db, 'clients', item.id), item.data);
            });
            await batch.commit();
          }
          console.log(`${docsToUpdate.length} clients updated for RGPD consent.`);
        }
        
        localStorage.setItem('xora_rgpd_migration_done', 'true');
      } catch (error) {
        console.error("Erreur lors de la migration RGPD:", error);
      }
    };

    runRgpdMigration();
  }, [isAuthenticated, userProfile?.companyId]);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    const unsub = onSnapshot(doc(db, 'companies', userProfile.companyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCompanyLogo(data.logo || null);
        // Sync company name if it changed
        if (data.name && userProfile.companyName !== data.name) {
          setUserProfile((prev: any) => ({ ...prev, companyName: data.name }));
        }
      }
    });
    return () => unsub();
  }, [userProfile?.companyId, userProfile?.companyName]);

  const getHeaderTitle = (page: Page) => {
    switch (page) {
      case 'dashboard': return 'Tableau de bord';
      case 'directory': return 'Annuaire Clients / Prospects';
      case 'suppliers': return 'Annuaire Fournisseurs';
      case 'artisans': return 'Annuaire Artisans';
      case 'prescriber': return 'Annuaire Prescripteurs';
      case 'agenda': return 'Agenda';
      case 'articles': return 'Articles';
      case 'tasks': return 'Tâches & mémos';
      case 'projects': return 'Suivi projets';
      case 'company': return 'Paramètres';
      case 'our_company': return 'Notre entreprise';
      case 'profile': return 'Mon profil';
      case 'kpi': return 'KPI';
      default: return 'XORA';
    }
  };

  const handlePageChange = (page: Page, options?: { tab?: string; filter?: string }) => {
    let path = '/';
    switch (page) {
      case 'dashboard': path = '/'; break;
      case 'directory': path = '/contacts'; break;
      case 'suppliers': path = '/suppliers'; break;
      case 'artisans': path = '/artisans'; break;
      case 'prescriber': path = '/prescriber'; break;
      case 'agenda': path = '/agenda'; break;
      case 'articles': path = '/articles'; break;
      case 'tasks': path = '/tasks'; break;
      case 'projects': path = '/projects'; break;
      case 'company': path = '/company'; break;
      case 'our_company': path = '/our_company'; break;
      case 'profile': path = '/profile'; break;
      case 'kpi': path = '/kpi'; break;
    }

    if (page === 'directory' && options?.tab) {
      setDirectoryActiveTab(options.tab);
    } else {
      setDirectoryActiveTab('Tous');
    }
    
    if (options?.filter) {
      setInitialFilter(options.filter);
    } else {
      setInitialFilter(null);
    }

    navigate(path);
  };

  const handleProjectSelect = (project: any) => {
    navigate(`/project/${project.id}`);
  };

  const handleClientCreated = (clientId: string, clientName: string) => {
    setIsModalOpen(false);
    // Rafraîchir la vue en se positionnant sur l'onglet Lead
    if (modalMode === 'contacts') {
      setDirectoryActiveTab('Lead');
      setTimeout(() => {
        setTaskModalForClient({ id: clientId, name: clientName });
        setIsLeadAutoTaskActive(true); 
        setIsTaskModalOpen(true);
      }, 400);
    }
  };

  const handleLogout = async () => {
    try {
      setAuthError(null);
      setIsAuthenticated(false);
      setUserProfile(null);
      navigate('/');
      await signOut(auth);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-400 animate-pulse uppercase tracking-widest">Chargement XORA...</p>
        </div>
      </div>
    );
  }

  if (authError && isAuthenticated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[32px] shadow-xl border border-red-50 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Problème de configuration</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{authError}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {}} />;
  }

  if (userProfile?.role === 'Aucun') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[32px] shadow-xl border border-gray-100 text-center space-y-6">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-400 mx-auto">
            <ShieldAlert size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Accès restreint</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Votre compte n'a pas les autorisations nécessaires pour accéder à Xora. 
              Veuillez contacter votre administrateur pour plus d'informations.
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Toaster position="top-right" richColors />
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={(page) => handlePageChange(page)} 
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        companyLogo={companyLogo}
        userProfile={userProfile}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">
        {(!location.pathname.startsWith('/project/') && currentPage !== 'profile' && currentPage !== 'kpi' && !location.pathname.startsWith('/contact/')) && (
          <Header 
            title={getHeaderTitle(currentPage)} 
            user={userProfile} 
            onProfileClick={() => navigate('/profile')} 
            onSettingsClick={() => navigate('/company')}
          />
        )}
        <main className="flex-1 overflow-auto bg-gray-50">
          <Routes>
            <Route path="/" element={
              <Dashboard 
                userProfile={userProfile} 
                onClientClick={(client) => navigate(`/contact/${client.id}`)}
                onAddClientClick={() => { setModalMode('contacts'); setIsModalOpen(true); }}
                onNavigate={(page, options) => handlePageChange(page, options)}
              />
            } />
            <Route path="/contacts" element={
              <Directory 
                userProfile={userProfile}
                initialTab={directoryActiveTab}
                onAddClick={() => { setModalMode('contacts'); setIsModalOpen(true); }} 
                onClientClick={(client) => navigate(`/contact/${client.id}`)}
                mode="contacts"
              />
            } />
            <Route path="/contact/:id" element={
              <ClientDetailsWrapper 
                userProfile={userProfile} 
                onProjectSelect={handleProjectSelect}
              />
            } />
            <Route path="/suppliers" element={
              <Directory 
                userProfile={userProfile}
                initialTab="Tous"
                onAddClick={() => { setModalMode('suppliers'); setIsModalOpen(true); }} 
                onClientClick={(client) => navigate(`/contact/${client.id}`)}
                mode="suppliers"
              />
            } />
            <Route path="/artisans" element={
              <Directory 
                userProfile={userProfile}
                initialTab="Tous"
                onAddClick={() => { setModalMode('artisans'); setIsModalOpen(true); }} 
                onClientClick={(client) => navigate(`/contact/${client.id}`)}
                mode="artisans"
              />
            } />
            <Route path="/prescriber" element={
              <Directory 
                userProfile={userProfile}
                initialTab="Tous"
                onAddClick={() => { setModalMode('prescribers'); setIsModalOpen(true); }} 
                onClientClick={(client) => navigate(`/contact/${client.id}`)}
                mode="prescribers"
              />
            } />
            <Route path="/agenda" element={<Agenda userProfile={userProfile} />} />
            <Route path="/articles" element={<Articles userProfile={userProfile} />} />
            <Route path="/tasks" element={<TasksMemo userProfile={userProfile} initialFilter={initialFilter} />} />
            <Route path="/projects" element={
              <ProjectTracking 
                userProfile={userProfile}
                onProjectClick={(project) => navigate(`/project/${project.id}`)} 
                initialFilter={initialFilter}
              />
            } />
            <Route path="/project/:id" element={<ProjectDetailsWrapper userProfile={userProfile} />} />
            <Route path="/company" element={userProfile?.role === 'Administrateur.rice' ? <CompanyManagement userProfile={userProfile} /> : <Navigate to="/" replace />} />
            <Route path="/our_company" element={<OurCompany userProfile={userProfile} />} />
            <Route path="/profile" element={<UserProfile userProfile={userProfile} setUserProfile={setUserProfile} onBack={() => navigate(-1)} readOnly={false} />} />
            <Route path="/kpi" element={<KPIManagement userProfile={userProfile} />} />
            <Route path="/backup" element={<BackupPage userProfile={userProfile} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userProfile={userProfile}
        onClientCreated={handleClientCreated}
        mode={modalMode}
      />

      <AddTaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setIsLeadAutoTaskActive(false); 
          setTaskModalForClient(null);
        }}
        userProfile={userProfile}
        initialClientId={taskModalForClient?.id}
        initialClientName={taskModalForClient?.name}
        isLeadAutoTask={isLeadAutoTaskActive}
      />
    </div>
  );
}

export default App;
