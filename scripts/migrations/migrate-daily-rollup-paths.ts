import { adminDb, Timestamp } from "../../lib/firebaseAdmin";

type MigrationArgs = {
  campaignId?: string;
  date?: string;
  dryRun: boolean;
};

const promotionsCollection = adminDb.collection("promotions");
const analyticsCollection = (campaignId: string) =>
  promotionsCollection.doc(campaignId).collection("analytics");
const dailyCollection = (campaignId: string) =>
  analyticsCollection(campaignId).collection("daily");

const isDate = (value: string | undefined) =>
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

  if (date && !isDate(date)) {
    throw new Error(
      `Invalid date "${date}". Expected ISO 8601 format YYYY-MM-DD.`,
    );
  }

  return { campaignId, date, dryRun };
};

const fetchLegacyDocs = async (
  campaignId: string,
  dateFilter?: string,
) => {
  const analyticsRef = analyticsCollection(campaignId);

  if (dateFilter) {
    const legacyRef = analyticsRef.doc(`daily-${dateFilter}`);
    const snapshot = await legacyRef.get();
    return [snapshot];
  }

  const snapshot = await analyticsRef.get();
  return snapshot.docs.filter((doc) => doc.id.startsWith("daily-"));
};

const migrateLegacyDoc = async (
  campaignId: string,
  legacyId: string,
  legacyData: Record<string, unknown>,
  dryRun: boolean,
) => {
  const date = legacyId.replace(/^daily-/, "");

  if (!isDate(date)) {
    console.warn(
      `[promotions][${campaignId}] Skipping legacy doc "${legacyId}" (cannot parse date)`,
    );
    return;
  }

  const newRef = dailyCollection(campaignId).doc(date);
  const newSnapshot = await newRef.get();

  if (newSnapshot.exists) {
    const newData = (newSnapshot.data() as Record<string, unknown>) ?? {};
    const matches = dataMatches(legacyData, newData);

    if (matches) {
      console.info(
        `[promotions][${campaignId}] analytics/daily/${date} already matches legacy daily-${date} (${dryRun ? "dry run" : "deleting legacy doc"})`,
      );

      if (!dryRun) {
        await promotionsCollection
          .doc(campaignId)
          .collection("analytics")
          .doc(legacyId)
          .delete();
      }

      return;
    }

    console.warn(
      `[promotions][${campaignId}] analytics/daily/${date} already exists with different data; skipped deleting legacy daily-${date}`,
    );
    return;
  }

  console.info(
    `[promotions][${campaignId}] Copying legacy analytics/daily-${date} -> analytics/daily/${date}${dryRun ? " (dry run)" : ""}`,
  );

  if (dryRun) {
    return;
  }

  await newRef.set(legacyData);
  const verifySnapshot = await newRef.get();
  const verifyData = (verifySnapshot.data() as Record<string, unknown>) ?? {};
  const verified = dataMatches(legacyData, verifyData);

  if (!verified) {
    console.warn(
      `[promotions][${campaignId}] Verification failed for analytics/daily/${date}; legacy daily-${date} retained`,
    );
    return;
  }

  await promotionsCollection
    .doc(campaignId)
    .collection("analytics")
    .doc(legacyId)
    .delete();
};

const migrateCampaign = async (
  campaignId: string,
  dateFilter: string | undefined,
  dryRun: boolean,
) => {
  const legacyDocs = await fetchLegacyDocs(campaignId, dateFilter);
  const validDocs = legacyDocs.filter((doc) => doc.exists);

  if (dateFilter && !legacyDocs[0]?.exists) {
    console.warn(
      `[promotions][${campaignId}] Legacy doc analytics/daily-${dateFilter} missing; nothing to migrate`,
    );
    return;
  }

  if (validDocs.length === 0) {
    console.info(`[promotions][${campaignId}] No legacy daily rollups found`);
    return;
  }

  for (const legacyDoc of validDocs) {
    const legacyData =
      (legacyDoc.data() as Record<string, unknown> | undefined) ?? {};
    await migrateLegacyDoc(
      campaignId,
      legacyDoc.id,
      legacyData,
      dryRun,
    );
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
      "Dry run complete. Re-run with --apply to write new docs and remove verified legacy docs.",
    );
  }
}

main().catch((error) => {
  console.error("[promotions] Failed to migrate daily rollup paths", error);
  process.exit(1);
});
