
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAN59kl6vkvbxdMsBG3mvcg3N8ynnYxK9c",
  authDomain: "xora-41903.firebaseapp.com",
  projectId: "xora-41903",
  storageBucket: "xora-41903.firebasestorage.app",
  messagingSenderId: "250582798310",
  appId: "1:250582798310:web:2d19531984e8d9fb6e1027",
  measurementId: "G-3DD87LVRGG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function countClients() {
  const companyId = "comp_cl880n4m0";
  const q = query(collection(db, "clients"), where("companyId", "==", companyId));
  const snap = await getDocs(q);
  console.log(`Total clients for ${companyId}: ${snap.size}`);
}

countClients().catch(console.error);
