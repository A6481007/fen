import { adminDb, Timestamp } from "../lib/firebaseAdmin";

type MigrationArgs = {
  campaignId?: string;
  date?: string;
  dryRun: boolean;
};

type LegacyDoc = {
  date: string;
  source: "prefixed" | "flat";
  ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  data: Record<string, unknown>;
};

const promotionsCollection = adminDb.collection("promotions");
const analyticsCollection = (campaignId: string) =>
  promotionsCollection.doc(campaignId).collection("analytics");
const targetCollection = (campaignId: string) =>
  analyticsCollection(campaignId).doc("daily").collection("days");

const isIsoDate = (value: string | undefined) =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalize = (value: unknown): unknown => {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

const dataMatches = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) => JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));

const parseArgs = (): MigrationArgs => {
  const getValue = (prefix: string) => {
    const match = process.argv.find((arg) => arg.startsWith(prefix));
    return match ? match.split("=")[1] : undefined;
  };

  const campaignId =
    getValue("--campaignId=") ?? getValue("--campaign=") ?? undefined;
  const date = getValue("--date=");
  const dryRun = !process.argv.includes("--apply");

  if (date && !isIsoDate(date)) {
    throw new Error(
      `Invalid date "${date}". Expected ISO 8601 format YYYY-MM-DD.`,
    );
  }

  return { campaignId, date, dryRun };
};

const fetchLegacyDocs = async (
  campaignId: string,
  dateFilter?: string,
): Promise<LegacyDoc[]> => {
  const analyticsRef = analyticsCollection(campaignId);

  if (dateFilter) {
    const prefixedSnapshot = await analyticsRef
      .doc(`daily-${dateFilter}`)
      .get();
    const flatSnapshot = await analyticsRef.doc(dateFilter).get();

    const docs: LegacyDoc[] = [];

    if (prefixedSnapshot.exists) {
      docs.push({
        date: dateFilter,
        source: "prefixed",
        ref: prefixedSnapshot.ref,
        data:
          (prefixedSnapshot.data() as Record<string, unknown> | undefined) ??
          {},
      });
    }

    if (flatSnapshot.exists) {
      docs.push({
        date: dateFilter,
        source: "flat",
        ref: flatSnapshot.ref,
        data:
          (flatSnapshot.data() as Record<string, unknown> | undefined) ?? {},
      });
    }

    return docs;
  }

  const snapshot = await analyticsRef.get();
  const legacyDocs: LegacyDoc[] = [];

  for (const doc of snapshot.docs) {
    if (doc.id.startsWith("daily-")) {
      const date = doc.id.replace(/^daily-/, "");
      if (!isIsoDate(date)) {
        continue;
      }

      legacyDocs.push({
        date,
        source: "prefixed",
        ref: doc.ref,
        data: (doc.data() as Record<string, unknown> | undefined) ?? {},
      });
      continue;
    }

    if (isIsoDate(doc.id)) {
      legacyDocs.push({
        date: doc.id,
        source: "flat",
        ref: doc.ref,
        data: (doc.data() as Record<string, unknown> | undefined) ?? {},
      });
    }
  }

  return legacyDocs;
};

const migrateLegacyDoc = async (
  campaignId: string,
  legacy: LegacyDoc,
  dryRun: boolean,
) => {
  const targetRef = targetCollection(campaignId).doc(legacy.date);
  const existingSnapshot = await targetRef.get();
  const existingData =
    (existingSnapshot.data() as Record<string, unknown> | undefined) ?? {};

  if (existingSnapshot.exists && dataMatches(existingData, legacy.data)) {
    console.info(
      `[promotions][${campaignId}] analytics/daily/days/${legacy.date} already matches ${legacy.source} legacy doc (dryRun=${dryRun})`,
    );

    if (!dryRun && legacy.ref.path !== targetRef.path) {
      await legacy.ref.delete();
    }

    return;
  }

  if (existingSnapshot.exists && dryRun && !dataMatches(existingData, {})) {
    console.warn(
      `[promotions][${campaignId}] Would skip overwriting analytics/daily/days/${legacy.date} because target differs from ${legacy.source} legacy doc (dry run)`,
    );
    return;
  }

  if (existingSnapshot.exists && !dryRun && !dataMatches(existingData, {})) {
    console.warn(
      `[promotions][${campaignId}] Skipped overwriting analytics/daily/days/${legacy.date} because target differs from ${legacy.source} legacy doc`,
    );
    return;
  }

  console.info(
    `[promotions][${campaignId}] Copying ${legacy.source} daily rollup for ${legacy.date} -> analytics/daily/days/${legacy.date}${
      dryRun ? " (dry run)" : ""
    }`,
  );

  if (dryRun) {
    return;
  }

  await targetRef.set(legacy.data);
  const verificationSnapshot = await targetRef.get();
  const verificationData =
    (verificationSnapshot.data() as Record<string, unknown> | undefined) ?? {};

  if (!dataMatches(legacy.data, verificationData)) {
    console.warn(
      `[promotions][${campaignId}] Verification failed for analytics/daily/days/${legacy.date}; legacy doc retained`,
    );
    return;
  }

  if (legacy.ref.path !== targetRef.path) {
    await legacy.ref.delete();
  }
};

const migrateCampaign = async (
  campaignId: string,
  dateFilter: string | undefined,
  dryRun: boolean,
) => {
  const legacyDocs = await fetchLegacyDocs(campaignId, dateFilter);

  if (legacyDocs.length === 0) {
    console.info(
      `[promotions][${campaignId}] No legacy daily rollups found${
        dateFilter ? ` for ${dateFilter}` : ""
      }`,
    );
    return;
  }

  for (const legacy of legacyDocs) {
    await migrateLegacyDoc(campaignId, legacy, dryRun);
  }
};

async function main() {
  const { campaignId, date, dryRun } = parseArgs();
  const promotionRefs = campaignId
    ? [promotionsCollection.doc(campaignId)]
    : await promotionsCollection.listDocuments();

  for (const promotionRef of promotionRefs) {
    await migrateCampaign(promotionRef.id, date, dryRun);
  }

  if (dryRun) {
    console.info(
      "Dry run complete. Re-run with --apply to write new docs and delete verified legacy docs.",
    );
  }
}

main().catch((error) => {
  console.error("[promotions] Failed to migrate daily rollups", error);
  process.exit(1);
});
