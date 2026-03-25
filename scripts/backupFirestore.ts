/*
  Usage (example):
    # Requires Firebase Admin env vars (see lib/firebaseAdmin.ts):
    # FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
    node scripts/backupFirestore.ts
*/

import fs from "fs";
import path from "path";

import { adminDb } from "../lib/firebaseAdmin";

const COLLECTIONS = [
  "promotions",
  "deals",
  "analytics",
  "interactions",
  "sessions",
  "messageHistory",
  "messageEvents",
  "outbound",
  "sendLogs",
] as const;

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function run() {
  if (!adminDb) {
    throw new Error("Firebase Admin is not available (missing env vars)");
  }

  const outDir = path.join(process.cwd(), "backups", "firestore", nowStamp());
  fs.mkdirSync(outDir, { recursive: true });

  for (const name of COLLECTIONS) {
    const snap = await adminDb.collection(name).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const outPath = path.join(outDir, `${name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");
    // eslint-disable-next-line no-console
    console.log(`Wrote ${name}: ${rows.length} docs -> ${outPath}`);
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
