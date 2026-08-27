import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase web API keys are public client configuration, not server secrets.
// Keep this client config available at build time so static pages can prerender
// without requiring a Vercel environment variable. Restrict the key in the
// Firebase/Google Cloud console to the domains and APIs used by Plantio.
const firebaseConfig = {
  apiKey: "AIzaSyDRZczZyqxzO_pIgmXhIdaNM7xL6IcB-rY",
  authDomain: "plantio-c3882.firebaseapp.com",
  projectId: "plantio-c3882",
  storageBucket: "plantio-c3882.firebasestorage.app",
  messagingSenderId: "440090239604",
  appId: "1:440090239604:web:27dfea254ce18cf434a721",
  measurementId: "G-957QW77DPM",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
