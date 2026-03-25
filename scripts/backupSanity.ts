/*
  Usage (example):
    # Choose whatever runner the repo already uses for TS scripts (ts-node, tsx, etc.)
    # Ensure SANITY_API_TOKEN is set in the environment.
    node scripts/backupSanity.ts
*/

import fs from "fs";
import path from "path";

import { backendClient } from "../sanity/lib/backendClient";

const TYPES = [
  "insight",
  "insightCategory",
  "insightAuthor",
  "insightSeries",
  "news",
  "event",
  "eventRsvp",
  "promotion",
  "deal",
  "catalog",
  "download",
  "contact",
  "subscription",
  "sentNotification",
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
  if (!process.env.SANITY_API_TOKEN) {
    throw new Error("Missing SANITY_API_TOKEN in environment");
  }

  const outDir = path.join(process.cwd(), "backups", "sanity", nowStamp());
  fs.mkdirSync(outDir, { recursive: true });

  for (const type of TYPES) {
    // NOTE: include drafts by fetching both published and drafts if needed.
    // This starter keeps it simple and exports all docs of the type.
    const docs = await backendClient.fetch(
      `*[_type == $type] | order(_updatedAt desc)`,
      { type },
    );

    const outPath = path.join(outDir, `${type}.json`);
    fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf8");
    // eslint-disable-next-line no-console
    console.log(
      `Wrote ${type}: ${Array.isArray(docs) ? docs.length : 0} docs -> ${outPath}`,
    );
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
