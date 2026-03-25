import { createClient } from "@sanity/client";
import { apiVersion, dataset, projectId } from "../sanity/env";

type KeywordDocument = {
  _id: string;
  _type?: string;
  primaryKeyword?: unknown;
  primaryKeywordTh?: unknown;
  seoPrimaryKeyword?: unknown;
};

const THAI_REGEX = /[\u0E00-\u0E7F]/;
const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

const token = process.env.SANITY_API_TOKEN;
if (!token) {
  console.error("Missing SANITY_API_TOKEN. Set it and re-run the script.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token,
});

const QUERY = `
  *[
    defined(primaryKeyword) || defined(seo.primaryKeyword)
  ]{
    _id,
    _type,
    primaryKeyword,
    primaryKeywordTh,
    "seoPrimaryKeyword": seo.primaryKeyword
  }
`;

const normalizeKeyword = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

type PatchSpec = {
  _id: string;
  set: Record<string, unknown>;
  unset: string[];
  sourceLocale: "th" | "en";
  keyword: string;
};

const buildPatches = (docs: KeywordDocument[]): PatchSpec[] => {
  const patches: PatchSpec[] = [];

  docs.forEach((doc) => {
    const keyword = normalizeKeyword(doc.primaryKeyword ?? doc.seoPrimaryKeyword);
    if (!keyword) return;

    const hasThai = THAI_REGEX.test(keyword);
    const set: Record<string, unknown> = {};
    const unset: string[] = [];

    if (hasThai) {
      if (!normalizeKeyword(doc.primaryKeywordTh)) {
        set.primaryKeywordTh = keyword;
      }
      // Remove Thai keyword from the English slot if duplicated there.
      if (normalizeKeyword(doc.primaryKeyword) === keyword) {
        unset.push("primaryKeyword");
      }
      if (normalizeKeyword(doc.seoPrimaryKeyword) === keyword) {
        unset.push("seo.primaryKeyword");
      }
    } else {
      set.primaryKeyword = keyword;
      if (normalizeKeyword(doc.seoPrimaryKeyword) === keyword) {
        unset.push("seo.primaryKeyword");
      }
    }

    if (Object.keys(set).length === 0 && unset.length === 0) {
      return;
    }

    patches.push({
      _id: doc._id,
      set,
      unset,
      sourceLocale: hasThai ? "th" : "en",
      keyword,
    });
  });

  return patches;
};

const commitPatches = async (patches: PatchSpec[]) => {
  if (!patches.length) {
    console.log("No documents needed updates.");
    return;
  }

  const BATCH_SIZE = 20;
  for (let i = 0; i < patches.length; i += BATCH_SIZE) {
    const batch = patches.slice(i, i + BATCH_SIZE);
    const tx = client.transaction();

    batch.forEach((item) => {
      tx.patch(item._id, (p) => {
        let next = p;
        if (Object.keys(item.set).length) {
          next = next.set(item.set);
        }
        if (item.unset.length) {
          next = next.unset(item.unset);
        }
        return next;
      });
    });

    if (DRY_RUN) {
      console.log(
        `[dry-run] Would patch ${batch.length} document(s):`,
        batch.map((item) => ({
          _id: item._id,
          locale: item.sourceLocale,
          set: item.set,
          unset: item.unset,
        }))
      );
      continue;
    }

    const result = await tx.commit();
    console.log(
      `Patched ${batch.length} document(s) (tx id: ${result.transactionId ?? "n/a"})`
    );
  }
};

async function run() {
  console.log(`Fetching documents with primaryKeyword… (dataset: ${dataset}, project: ${projectId})`);
  const docs = await client.fetch<KeywordDocument[]>(QUERY);
  console.log(`Found ${docs.length} document(s) with primary keywords.`);

  const patches = buildPatches(docs);
  console.log(
    `${patches.length} document(s) need updates. DRY_RUN=${DRY_RUN ? "true" : "false"}`
  );

  await commitPatches(patches);
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
