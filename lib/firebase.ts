// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredConfigKeys: Array<keyof typeof firebaseConfig> = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missingKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);
const hasValidConfig = missingKeys.length === 0;
export const firebaseClientAvailable = hasValidConfig;

let app: FirebaseApp | null = null;
if (hasValidConfig) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
} else if (process.env.NODE_ENV === "production") {
  // In production we fail fast so misconfiguration is visible.
  throw new Error(`[firebase] Missing client config values: ${missingKeys.join(", ")}`);
} else if (process.env.NEXT_PUBLIC_DEBUG_FIREBASE === "1") {
  // Optional debug logging in development to avoid noisy warnings by default.
  console.info("[firebase] Client SDK disabled (missing config):", missingKeys.join(", "));
}

let analytics: Analytics | null = null;
if (typeof window !== "undefined" && app) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, analytics };
