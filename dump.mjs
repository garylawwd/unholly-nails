import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDb() {
  const uid = "0TMvGP1VIja7VzVM87MPQaacoY03";
  const q = collection(db, "users", uid, "nail_sets");
  const snap = await getDocs(q);
  
  console.log("Checking DB for UID:", uid);
  snap.forEach(doc => {
    const data = doc.data();
    if (!data.imagePath || !data.imagePath.startsWith("http")) {
      console.log(`- BROKEN ITEM: ${data.name} (${doc.id})`);
      console.log(`  imagePath: ${data.imagePath}`);
    } else {
      console.log(`- OK ITEM: ${data.name} (${doc.id})`);
    }
  });
  console.log("Done");
}

checkDb().catch(console.error);
