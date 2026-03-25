
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, writeBatch, collection, getDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configuration optimisée pour la réactivité avec cache persistant
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);

export const seedDatabase = async (companyId: string, currentUser: any) => {
  const batch = writeBatch(db);

  // 1. Initialisation / Mise à jour de la Société
  const companyRef = doc(db, 'companies', companyId);
  const companySnap = await getDoc(companyRef);
  
  if (!companySnap.exists()) {
    batch.set(companyRef, {
      id: companyId,
      name: currentUser.companyName || "Ma Nouvelle Société",
      activity: "Cuisiniste",
      createdAt: new Date().toISOString(),
      ownerId: currentUser.uid,
      plan: 'Pro'
    });

    // Notification à bonjour@xora.fr pour la création d'une nouvelle entreprise
    const notificationRef = doc(collection(db, 'invitations'));
    batch.set(notificationRef, {
      to: 'bonjour@xora.fr',
      message: {
        subject: `🏢 Nouvelle entreprise Xora : ${currentUser.companyName || 'Non renseignée'}`,
        html: `
          <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 24px; padding: 40px; color: #111827; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">XORA <span style="color: #6366f1;">CRM</span></h1>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827;">Nouvelle entreprise créée</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
              Une nouvelle entreprise vient de s'inscrire sur <strong>Xora CRM</strong>.
            </p>
            
            <div style="background-color: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Entreprise</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${currentUser.companyName || 'Non renseignée'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Administrateur</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${currentUser.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${currentUser.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Activité</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${currentUser.jobTitle || 'Non renseignée'}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px;">
              Ceci est une notification automatique de Xora CRM.
            </p>
          </div>
        `
      },
      meta: {
        type: 'new_company',
        companyId: companyId,
        companyName: currentUser.companyName,
        adminName: currentUser.name,
        adminEmail: currentUser.email,
        createdAt: serverTimestamp()
      }
    });
  }

  // 2. KPIs Financiers - Utilisation des types d'icônes mis à jour
  const kpis = [
    { id: 'ca', label: 'CA Généré', value: '53.456€', target: '110.000€', percentage: 65, iconName: 'euro', companyId },
    { id: 'marge', label: 'Marge générée', value: '12.326€', target: '15.000€', percentage: 73, iconName: 'trending-up', companyId },
    { id: 'taux_marge', label: 'Taux de marge', value: '23,4%', target: '35%', percentage: 68, iconName: 'pie-chart', companyId },
    { id: 'taux_transfo', label: 'Taux de transformation', value: '32,2%', target: '33%', percentage: 96, iconName: 'target', companyId },
  ];

  kpis.forEach(kpi => {
    const ref = doc(db, 'kpis', `${companyId}_${kpi.id}`);
    batch.set(ref, kpi);
  });

  // 3. Statuts du Dashboard
  const statusCards = [
    { id: 'leads', label: 'Leads', count: 3, color: 'purple', order: 1, companyId },
    { id: 'etudes', label: 'Etudes en cours', count: 2, color: 'fuchsia', order: 2, companyId },
    { id: 'commandes', label: 'Commandes clients', count: 1, color: 'blue', order: 3, companyId },
    { id: 'dossiers', label: 'Dossiers tech & install', count: 0, color: 'cyan', order: 4, companyId },
    { id: 'sav', label: 'SAV', count: 0, color: 'orange', order: 5, companyId },
  ];

  statusCards.forEach(card => {
    const ref = doc(db, 'status_overview', `${companyId}_${card.id}`);
    batch.set(ref, card);
  });

  // 4. Quelques clients exemples
  const clientsData = [
    {
      name: "CHARLES DUBOIS",
      status: "Client",
      origin: "Relation",
      location: "Montpellier",
      companyId,
      dateAdded: new Date().toLocaleDateString('fr-FR'),
      addedBy: { uid: currentUser.uid, name: currentUser.name, avatar: currentUser.avatar },
      details: {
        address: "12 Rue de la Loge, 34000 Montpellier",
        phone: "06 12 34 56 78",
        email: "charles.dubois@gmail.com",
        properties: [
          { id: "p1", number: 1, address: "12 Rue de la Loge, 34000 Montpellier", isMain: true },
          { id: "p2", number: 2, address: "Résidence le Cap, 34300 Agde", isMain: false }
        ]
      },
      projectCount: 0
    },
    {
      name: "MARIE BERNARD",
      status: "Prospect",
      origin: "Web",
      location: "Béziers",
      companyId,
      dateAdded: new Date().toLocaleDateString('fr-FR'),
      addedBy: { uid: currentUser.uid, name: currentUser.name, avatar: currentUser.avatar },
      details: {
        address: "5 Avenue Foch, 34500 Béziers",
        phone: "07 88 99 00 11",
        email: "m.bernard@outlook.fr"
      },
      projectCount: 0
    }
  ];

  clientsData.forEach(client => {
    const ref = doc(collection(db, 'clients'));
    batch.set(ref, client);
  });

  await batch.commit();
  console.log("Base de données initialisée avec succès !");
};
