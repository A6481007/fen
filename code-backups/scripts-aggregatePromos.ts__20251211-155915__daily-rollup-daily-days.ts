import { adminDb, FieldValue, Timestamp } from "../lib/firebaseAdmin";
import { recordDailyRollup } from "../lib/promotions/analytics";

type Channel = "email" | "sms" | "push" | "organic";

interface ChannelMetrics {
  impressions: number;
  conversions: number;
  revenue: number;
}

interface SegmentMetrics {
  impressions: number;
  conversions: number;
  revenue: number;
}

interface DailyMetrics {
  date: string;
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  revenue: number;
  discountSpent: number;
  averageOrderValue: number;
  conversionRate: number;
  uniqueUsers: number;
  interactionCount: number;
  byChannel: Record<Channel, ChannelMetrics>;
  bySegment: Record<string, SegmentMetrics>;
  byDevice: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  lastInteractionAt: Timestamp | null;
}

type AggregationOptions = {
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  force?: boolean;
};

type AggregationOutcome = {
  date: string;
  status: "written" | "skipped";
  interactionCount: number;
};

const PROMOTION_STATUSES = ["active", "ended", "paused"] as const;

const promotionsCollection = adminDb.collection("promotions");
const analyticsCollection = (campaignId: string) =>
  promotionsCollection.doc(campaignId).collection("analytics");
const dailyCollection = (campaignId: string) =>
  analyticsCollection(campaignId).collection("daily");
const interactionsCollection = (campaignId: string) =>
  promotionsCollection.doc(campaignId).collection("interactions");

const isIsoDate = (value: string | undefined): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0];
};

const addDays = (date: string, amount: number): string => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().split("T")[0];
};

const buildDateRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  let cursor = start;

  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
};

const startOfDay = (date: string) =>
  Timestamp.fromDate(new Date(`${date}T00:00:00.000Z`));

const endOfDay = (date: string) =>
  Timestamp.fromDate(new Date(`${date}T23:59:59.999Z`));

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeChannel = (value: unknown): Channel => {
  if (value === "email" || value === "sms" || value === "push") {
    return value;
  }

  return "organic";
};

const normalizeDevice = (value: unknown): keyof DailyMetrics["byDevice"] => {
  if (value === "mobile" || value === "tablet") {
    return value;
  }

  return "desktop";
};

const aggregateInteractions = (
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): { metrics: DailyMetrics; latestAt: Timestamp | null } => {
  const metrics: DailyMetrics = {
    date: "",
    impressions: 0,
    clicks: 0,
    addToCarts: 0,
    conversions: 0,
    revenue: 0,
    discountSpent: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    uniqueUsers: 0,
    interactionCount: docs.length,
    byChannel: {
      email: { impressions: 0, conversions: 0, revenue: 0 },
      sms: { impressions: 0, conversions: 0, revenue: 0 },
      push: { impressions: 0, conversions: 0, revenue: 0 },
      organic: { impressions: 0, conversions: 0, revenue: 0 },
    },
    bySegment: {},
    byDevice: { mobile: 0, desktop: 0, tablet: 0 },
    lastInteractionAt: null,
  };

  const uniqueActors = new Set<string>();

  for (const doc of docs) {
    const data = doc.data();
    const action = data.action;
    const channel = normalizeChannel(data.channel);
    const segment = typeof data.segment === "string" ? data.segment : "unknown";
    const device = normalizeDevice(data.deviceType);
    const userKey =
      (typeof data.userId === "string" && data.userId) ||
      (typeof data.sessionId === "string" && data.sessionId);
    const timestampValue = data.timestamp;

    if (userKey) {
      uniqueActors.add(userKey);
    }

    if (timestampValue instanceof Timestamp) {
      metrics.lastInteractionAt =
        metrics.lastInteractionAt &&
        metrics.lastInteractionAt.toMillis() > timestampValue.toMillis()
          ? metrics.lastInteractionAt
          : timestampValue;
    }

    switch (action) {
      case "view":
        metrics.impressions++;
        metrics.byChannel[channel].impressions++;
        break;
      case "click":
        metrics.clicks++;
        break;
      case "addToCart":
        metrics.addToCarts++;
        break;
      case "purchase":
        metrics.conversions++;
        metrics.revenue += toNumber((data as any).orderValue);
        metrics.discountSpent += toNumber((data as any).discountAmount);
        metrics.byChannel[channel].conversions++;
        metrics.byChannel[channel].revenue += toNumber(
          (data as any).orderValue,
        );
        break;
      default:
        break;
    }

    if (!metrics.bySegment[segment]) {
      metrics.bySegment[segment] = {
        impressions: 0,
        conversions: 0,
        revenue: 0,
      };
    }

    if (action === "view") {
      metrics.bySegment[segment].impressions++;
    } else if (action === "purchase") {
      metrics.bySegment[segment].conversions++;
      metrics.bySegment[segment].revenue += toNumber(
        (data as any).orderValue,
      );
    }

    metrics.byDevice[device]++;
  }

  metrics.uniqueUsers = uniqueActors.size;
  metrics.averageOrderValue =
    metrics.conversions > 0 ? metrics.revenue / metrics.conversions : 0;
  metrics.conversionRate =
    metrics.impressions > 0 ? metrics.conversions / metrics.impressions : 0;

  return { metrics, latestAt: metrics.lastInteractionAt };
};

const getLastAggregatedDate = async (
  campaignId: string,
): Promise<string | null> => {
  const snapshot = await dailyCollection(campaignId)
    .orderBy("date", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const storedDate = doc.get("date");
  return typeof storedDate === "string" ? storedDate : doc.id;
};

const getEarliestInteractionDate = async (
  campaignId: string,
): Promise<string | null> => {
  const snapshot = await interactionsCollection(campaignId)
    .orderBy("timestamp", "asc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const firstTs = snapshot.docs[0].get("timestamp");
  if (firstTs instanceof Timestamp) {
    return firstTs.toDate().toISOString().split("T")[0];
  }

  return null;
};

const resolveStartDate = async (
  campaignId: string,
  endDate: string,
  startOverride?: string,
): Promise<string | null> => {
  if (startOverride) {
    return startOverride;
  }

  const lastAggregated = await getLastAggregatedDate(campaignId);
  if (lastAggregated) {
    const next = addDays(lastAggregated, 1);
    return next > endDate ? null : next;
  }

  const earliestInteraction = await getEarliestInteractionDate(campaignId);
  return earliestInteraction ?? endDate;
};

async function aggregateDailyMetrics(
  campaignId: string,
  date: string,
  force: boolean,
): Promise<AggregationOutcome> {
  const dailyRef = dailyCollection(campaignId).doc(date);
  const existingSnapshot = await dailyRef.get();

  const interactionsSnap = await interactionsCollection(campaignId)
    .where("timestamp", ">=", startOfDay(date))
    .where("timestamp", "<=", endOfDay(date))
    .get();

  const { metrics, latestAt } = aggregateInteractions(interactionsSnap.docs);
  metrics.date = date;

  if (existingSnapshot.exists && !force) {
    const aggregatedAt = existingSnapshot.get("aggregatedAt");
    if (
      aggregatedAt instanceof Timestamp &&
      latestAt instanceof Timestamp &&
      aggregatedAt.toMillis() >= latestAt.toMillis()
    ) {
      console.log(
        `[promotions][${campaignId}] Skipping ${date} (already up to date)`,
      );
      return {
        date,
        status: "skipped",
        interactionCount: interactionsSnap.size,
      };
    }
  }

  const payload = {
    ...metrics,
    aggregatedAt: FieldValue.serverTimestamp(),
    rollupSource: "interactions",
  };

  await dailyRef.set(payload, { merge: true });

  // Capture a real-time snapshot as a lightweight safety net for the day.
  await recordDailyRollup(campaignId, date);

  console.log(
    `[promotions][${campaignId}] Aggregated ${interactionsSnap.size} interactions for ${date}`,
  );

  return { date, status: "written", interactionCount: interactionsSnap.size };
}

async function aggregateCampaign(
  campaignId: string,
  options: AggregationOptions,
): Promise<AggregationOutcome[]> {
  const endDate = options.endDate ?? getYesterdayDate();

  if (!isIsoDate(endDate)) {
    throw new Error(`Invalid endDate: ${endDate}`);
  }

  const startDate = await resolveStartDate(
    campaignId,
    endDate,
    options.startDate,
  );

  if (!startDate) {
    console.log(
      `[promotions][${campaignId}] No dates to aggregate (endDate: ${endDate})`,
    );
    return [];
  }

  if (!isIsoDate(startDate)) {
    throw new Error(`Invalid startDate: ${startDate}`);
  }

  const dates = buildDateRange(startDate, endDate);
  const results: AggregationOutcome[] = [];

  for (const date of dates) {
    try {
      const outcome = await aggregateDailyMetrics(
        campaignId,
        date,
        options.force ?? false,
      );
      results.push(outcome);
    } catch (error) {
      console.error(
        `[promotions][${campaignId}] Failed to aggregate ${date}`,
        error,
      );
      results.push({ date, status: "skipped", interactionCount: 0 });
    }
  }

  return results;
}

export async function backfillCampaign(
  campaignId: string,
  startDate: string,
  endDate: string,
  force = false,
): Promise<AggregationOutcome[]> {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw new Error(
      `Invalid backfill range: start=${startDate}, end=${endDate}`,
    );
  }

  return aggregateCampaign(campaignId, { startDate, endDate, force });
}

export async function aggregatePromotionAnalytics(
  options: AggregationOptions = {},
): Promise<void> {
  console.log("Starting promotion analytics aggregation...");
  const startTime = Date.now();
  const failures: Record<string, string[]> = {};

  try {
    const promotionsSnap = options.campaignId
      ? {
          docs: [
            await promotionsCollection.doc(options.campaignId).get(),
          ].filter((doc) => doc.exists),
        }
      : await promotionsCollection
          .where("status", "in", PROMOTION_STATUSES)
          .get();

    const campaigns = promotionsSnap.docs.map((doc) => doc.id);
    console.log(`Found ${campaigns.length} promotions to process`);

    for (const campaignId of campaigns) {
      try {
        await aggregateCampaign(campaignId, options);
      } catch (error) {
        console.error(
          `[promotions][${campaignId}] Campaign aggregation failed`,
          error,
        );
        failures[campaignId] = ["campaign-level failure"];
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Aggregation complete in ${duration}ms`);

    await adminDb.collection("aggregationLogs").add({
      type: "promotionAnalytics",
      campaignsProcessed: campaigns.length,
      duration,
      options,
      failures: Object.keys(failures).length > 0 ? failures : undefined,
      completedAt: FieldValue.serverTimestamp(),
      status: Object.keys(failures).length === 0 ? "success" : "partial",
    });
  } catch (error) {
    console.error("Aggregation failed:", error);

    await adminDb.collection("aggregationLogs").add({
      type: "promotionAnalytics",
      error: error instanceof Error ? error.message : "Unknown error",
      options,
      completedAt: FieldValue.serverTimestamp(),
      status: "failed",
    });

    throw error;
  }
}

const parseCliOptions = (): AggregationOptions => {
  const arg = (name: string) =>
    process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];

  const campaignId = arg("campaignId");
  const startDate = arg("start");
  const endDate = arg("end");
  const force = process.argv.includes("--force");

  return {
    campaignId,
    startDate,
    endDate,
    force,
  };
};

/**
 * Cron / Cloud Function notes:
 * - Cron example (daily at 2am UTC): 0 2 * * * cd /path/to/repo && pnpm ts-node scripts/aggregatePromos.ts >> /var/log/aggregate-promos.log 2>&1
 * - Cloud Function: export a scheduled function that calls aggregatePromotionAnalytics(); e.g.
 *   exports.aggregatePromos = functions.pubsub
 *     .schedule("0 2 * * *")
 *     .timeZone("UTC")
 *     .onRun(() => aggregatePromotionAnalytics());
 */
if (require.main === module) {
  aggregatePromotionAnalytics(parseCliOptions())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
