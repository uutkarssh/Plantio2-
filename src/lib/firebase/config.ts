import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!firebaseApiKey) {
  throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY environment variable.");
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: "plantio-c3882.firebaseapp.com",
  projectId: "plantio-c3882",
  storageBucket: "plantio-c3882.firebasestorage.app",
  messagingSenderId: "440090239604",
  appId: "1:440090239604:web:27dfea254ce18cf434a721",
  measurementId: "G-957QW77DPM",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
