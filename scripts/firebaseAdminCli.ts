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

const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

type RequiredEnvKey = (typeof requiredEnvVars)[number];

const missingEnvVars = requiredEnvVars.filter(
  (key: RequiredEnvKey) => !process.env[key],
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Firebase Admin environment variables: ${missingEnvVars.join(
      ", ",
    )}`,
  );
}

const projectId = process.env.FIREBASE_PROJECT_ID as string;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL as string;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY as string;
const databaseURL = process.env.FIREBASE_DATABASE_URL;

const serviceAccount: ServiceAccount = {
  projectId,
  clientEmail,
  privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
};

const existingApps = getApps();
const isReusingApp = existingApps.length > 0;

export const adminApp: App =
  existingApps[0] ??
  initializeApp({
    credential: cert(serviceAccount),
    ...(databaseURL ? { databaseURL } : {}),
  });

export const adminDb: Firestore = getFirestore(adminApp);
export const adminAuth: Auth = getAuth(adminApp);

export { FieldValue, Timestamp };

if (process.env.DEBUG?.includes("firebaseAdminCli")) {
  console.info(
    `[firebase-admin-cli] ${
      isReusingApp ? "Reusing existing" : "Initialized new"
    } app for project ${projectId}`,
  );
}
