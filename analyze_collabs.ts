
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyze() {
  const companyId = "comp_rmpm0zufl";
  console.log(`Analyzing for company: ${companyId}`);
  
  try {
    console.log("Attempting to fetch 1 client to test permissions...");
    const testQ = query(collection(db, 'clients'), where("companyId", "==", companyId), limit(1));
    const testSnap = await getDocs(testQ);
    console.log(`Test fetch successful. Found ${testSnap.size} clients in test.`);

    const q = query(collection(db, 'clients'), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    const clients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${clients.length} clients.`);
    
    if (clients.length === 0) {
        console.log("No clients found for this companyId.");
        process.exit(0);
    }

    const collabMap: Record<string, { name: string, id: string, count: number }> = {};
    
    clients.forEach((client: any) => {
      const addedBy = client.addedBy;
      const referentName = client.details?.referent;
      
      let collabId = addedBy?.uid || 'N/A';
      let collabName = referentName || addedBy?.name || 'Inconnu';
      
      const key = `${collabName}_${collabId}`;
      
      if (!collabMap[key]) {
        collabMap[key] = { name: collabName, id: collabId, count: 0 };
      }
      collabMap[key].count++;
    });
    
    const results = Object.values(collabMap).sort((a, b) => b.count - a.count);
    console.log("\nNom collaborateur | ID collaborateur | Nombre de clients associés");
    console.log("------------------|------------------|---------------------------");
    results.forEach(r => {
        console.log(`${r.name.padEnd(18)} | ${r.id.padEnd(16)} | ${r.count}`);
    });
    
  } catch (e: any) {
    console.error("Error during analysis:", e.message || e);
    if (e.code) console.error(`Error code: ${e.code}`);
  }
  process.exit(0);
}

analyze();
