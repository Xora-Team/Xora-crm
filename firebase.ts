
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Use @firebase/firestore to fix named export resolution issues
import { getFirestore, doc, writeBatch, collection, getDoc } from "@firebase/firestore";
import { getStorage } from "firebase/storage";

const getEnv = (key: string, fallback: string): string => {
  try {
    // @ts-ignore
    return process.env[key] || fallback;
  } catch (e) {
    return fallback;
  }
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyAN59kl6vkvbxdMsBG3mvcg3N8ynnYxK9c"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "xora-41903.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "xora-41903"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "xora-41903.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "250582798310"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:250582798310:web:2d19531984e8d9fb6e1027"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-3DD87LVRGG")
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
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
