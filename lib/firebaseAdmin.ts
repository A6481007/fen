import "server-only";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Required Firebase Admin environment variables for server initialization.
 */
const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

type RequiredEnvKey = (typeof requiredEnvVars)[number];

const missingEnvVars = requiredEnvVars.filter(
  (key: RequiredEnvKey) => !process.env[key],
);

export const firebaseAdminAvailable = missingEnvVars.length === 0;

if (missingEnvVars.length > 0 && process.env.NODE_ENV === "production") {
  throw new Error(
    `Missing Firebase Admin environment variables: ${missingEnvVars.join(
      ", ",
    )}`,
  );
} else if (missingEnvVars.length > 0 && process.env.NEXT_PUBLIC_DEBUG_FIREBASE === "1") {
  console.info(
    `[firebase-admin] Disabled (missing env vars: ${missingEnvVars.join(", ")})`,
  );
}

// In non-production we silently disable Firebase Admin when env vars are absent
// to avoid noisy console warnings during local/dev usage.

const projectId = process.env.FIREBASE_PROJECT_ID as string;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL as string;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY as string;
const databaseURL = process.env.FIREBASE_DATABASE_URL;

/**
 * Service account credentials for Firebase Admin.
 * Newlines in the private key are restored for certificate parsing.
 */
const serviceAccount: ServiceAccount | null = firebaseAdminAvailable
  ? {
      projectId,
      clientEmail,
      privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
    }
  : null;

const existingApps = getApps();
const isReusingApp = existingApps.length > 0;

/**
 * Firebase Admin app singleton. Reuses the existing instance when available.
 * @remarks This module is server-only; importing it on the client will error.
 */
export const adminApp: App | null =
  firebaseAdminAvailable && (existingApps[0] ??
    initializeApp({
      credential: cert(serviceAccount!),
      ...(databaseURL ? { databaseURL } : {}),
    })) || null;

if (adminApp) {
  console.info(
    `[firebase-admin] ${
      isReusingApp ? "Reusing existing" : "Initialized new"
    } app for project ${projectId}`,
  );
}

/**
 * Firestore instance for privileged server operations.
 */
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;

/**
 * Auth instance for verifying and managing server-side credentials.
 */
export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;

/**
 * Firestore helpers for atomic operations and server timestamps.
 */
export { FieldValue, Timestamp };
