/*
  Fix portable text blocks missing _key fields in Sanity.

  Usage:
    # Ensure SANITY_API_TOKEN is available (loads .env.local/.env if unset)
    npx ts-node -r tsconfig-paths/register scripts/fix-portable-text-keys.ts
*/

import fs from "fs";
import path from "path";
import { createClient } from "@sanity/client";
import { buildPortableTextPatch } from "../lib/portableTextKeys.ts";

type PortableFieldsDoc = {
  _id: string;
  body?: unknown;
  bodyTh?: unknown;
  content?: unknown;
  contentTh?: unknown;
};

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

const loadEnv = () => {
  const root = process.cwd();
  [".env.local", ".env"].forEach((filename) => loadEnvFile(path.join(root, filename)));
};

const run = async () => {
  loadEnv();

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "td5crv6z";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-11-09";
  const token = process.env.SANITY_API_TOKEN;

  if (!token) {
    throw new Error("Missing SANITY_API_TOKEN in environment");
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  });

  const docs = await client.fetch<PortableFieldsDoc[]>(
    `*[_type == "news" && (defined(body) || defined(content) || defined(bodyTh) || defined(contentTh))]{
      _id,
      body,
      bodyTh,
      content,
      contentTh
    }`,
  );

  let patchedCount = 0;

  for (const doc of docs) {
    const { patch, changed } = buildPortableTextPatch(doc as Record<string, unknown>, [
      "body",
      "bodyTh",
      "content",
      "contentTh",
    ]);

    if (!changed) continue;

    await client.patch(doc._id).set(patch).commit({ autoGenerateArrayKeys: false });
    patchedCount += 1;
    // eslint-disable-next-line no-console
    console.log(`Patched ${doc._id}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Portable text key fix complete. Updated ${patchedCount} document(s).`);
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
