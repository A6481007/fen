import { adminDb, FieldValue, Timestamp } from "./firebaseAdminCli.ts";
import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";

type Device = "mobile" | "desktop" | "tablet";

type ChannelMetrics = {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

type SegmentMetrics = {
  impressions: number;
  conversions: number;
  revenue: number;
};

type DailyRollup = {
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
  byChannel: Record<string, ChannelMetrics>;
  bySegment: Record<string, SegmentMetrics>;
  byDevice: Record<Device, number>;
  lastInteractionAt: Timestamp | null;
};

type AggregationOutcome = {
  campaignId: string;
  date: string;
  status: "written" | "skipped" | "failed";
  interactionCount: number;
  reason?: string;
};

type AggregationOptions = {
  backfill?: boolean;
  start?: string;
  end?: string;
  campaign?: string;
  force?: boolean;
};

type CampaignAggregationResult = {
  campaignId: string;
  outcomes: AggregationOutcome[];
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_CHANNELS = ["email", "sms", "push", "organic"];
const TARGET_STATUSES = ["active", "ended"] as const;

const promotionsCollection = adminDb.collection("promotions");
const analyticsDailyCollection = (campaignId: string) =>
  promotionsCollection
    .doc(campaignId)
    .collection("analytics")
    .doc("daily")
    .collection("days");
const interactionsCollection = (campaignId: string) =>
  promotionsCollection.doc(campaignId).collection("interactions");
const aggregationLogsCollection = adminDb.collection("aggregationLogs");

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeString = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
};

const normalizeChannel = (value: unknown): string => {
  const normalized = normalizeString(value, "unknown");
  const lower = normalized.toLowerCase();

  if (DEFAULT_CHANNELS.includes(lower)) {
    return lower;
  }

  return normalized;
};

const normalizeSegment = (value: unknown): string =>
  normalizeString(value, "unknown");

const normalizeDevice = (value: unknown): Device => {
  const normalized = normalizeString(value, "desktop").toLowerCase();

  if (normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "desktop";
};

const startOfDay = (date: string) =>
  Timestamp.fromDate(new Date(`${date}T00:00:00.000Z`));

const endOfDay = (date: string) =>
  Timestamp.fromDate(new Date(`${date}T23:59:59.999Z`));

const toIsoDate = (value: Date): string =>
  value.toISOString().split("T")[0]!;

const getYesterday = (): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return toIsoDate(date);
};

const addDays = (date: string, amount: number): string => {
  const cursor = new Date(`${date}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + amount);
  return toIsoDate(cursor);
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

const parseCliArgs = (): AggregationOptions => {
  const args = process.argv.slice(2);
  const getValue = (flag: string) => {
    const inline = args.find((arg) => arg.startsWith(`--${flag}=`));
    if (inline) {
      return inline.split("=")[1];
    }

    const index = args.findIndex((arg) => arg === `--${flag}`);
    if (index !== -1) {
      return args[index + 1];
    }

    return undefined;
  };

  return {
    backfill: args.includes("--backfill"),
    start: getValue("start"),
    end: getValue("end"),
    campaign: getValue("campaign") ?? getValue("campaignId"),
    force: args.includes("--force"),
  };
};

const validateIsoDate = (value: string, label: string) => {
  if (!ISO_DATE_REGEX.test(value)) {
    throw new Error(`Invalid ${label} "${value}". Use YYYY-MM-DD format.`);
  }
};

const resolveDateWindow = (options: AggregationOptions) => {
  if (options.backfill || options.start || options.end) {
    const startDate = options.start ?? options.end;
    const endDate = options.end ?? options.start ?? startDate;

    if (!startDate || !endDate) {
      throw new Error(
        "Backfill requires both --start and --end (YYYY-MM-DD).",
      );
    }

    validateIsoDate(startDate, "start date");
    validateIsoDate(endDate, "end date");

    if (startDate > endDate) {
      throw new Error("Start date cannot be after end date.");
    }

    return { startDate, endDate };
  }

  const yesterday = getYesterday();
  return { startDate: yesterday, endDate: yesterday };
};

const fetchCampaignIds = async (campaignOverride?: string) => {
  if (campaignOverride) {
    const snapshot = await promotionsCollection.doc(campaignOverride).get();
    if (!snapshot.exists) {
      throw new Error(`Campaign "${campaignOverride}" not found.`);
    }

    return [campaignOverride];
  }

  const snapshot = await promotionsCollection
    .where("status", "in", TARGET_STATUSES)
    .get();

  return snapshot.docs.map((doc) => doc.id);
};

const aggregateInteractions = (
  docs: QueryDocumentSnapshot[],
): { metrics: DailyRollup; latestAt: Timestamp | null } => {
  const metrics: DailyRollup = {
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
    byChannel: DEFAULT_CHANNELS.reduce<Record<string, ChannelMetrics>>(
      (acc, channel) => {
        acc[channel] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        };
        return acc;
      },
      {},
    ),
    bySegment: {},
    byDevice: { mobile: 0, desktop: 0, tablet: 0 },
    lastInteractionAt: null,
  };

  const uniqueActors = new Set<string>();

  for (const doc of docs) {
    const data = doc.data();
    const action = typeof data.action === "string" ? data.action : undefined;
    const channel = normalizeChannel(data.channel);
    const segment = normalizeSegment(data.segment);
    const device = normalizeDevice((data as Record<string, unknown>).deviceType);
    const userKey =
      (typeof data.userId === "string" && data.userId) ||
      (typeof data.sessionId === "string" && data.sessionId);

    if (!metrics.byChannel[channel]) {
      metrics.byChannel[channel] = {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      };
    }

    if (!metrics.bySegment[segment]) {
      metrics.bySegment[segment] = {
        impressions: 0,
        conversions: 0,
        revenue: 0,
      };
    }

    if (userKey) {
      uniqueActors.add(userKey);
    }

    const timestamp = data.timestamp;
    if (timestamp instanceof Timestamp) {
      metrics.lastInteractionAt =
        metrics.lastInteractionAt &&
        metrics.lastInteractionAt.toMillis() > timestamp.toMillis()
          ? metrics.lastInteractionAt
          : timestamp;
    }

    switch (action) {
      case "view":
        metrics.impressions++;
        metrics.byChannel[channel].impressions++;
        metrics.bySegment[segment].impressions++;
        break;
      case "click":
        metrics.clicks++;
        metrics.byChannel[channel].clicks++;
        break;
      case "addToCart":
        metrics.addToCarts++;
        break;
      case "purchase":
        metrics.conversions++;
        metrics.revenue += toNumber((data as Record<string, unknown>).orderValue);
        metrics.discountSpent += toNumber(
          (data as Record<string, unknown>).discountAmount,
        );
        metrics.byChannel[channel].conversions++;
        metrics.byChannel[channel].revenue += toNumber(
          (data as Record<string, unknown>).orderValue,
        );
        metrics.bySegment[segment].conversions++;
        metrics.bySegment[segment].revenue += toNumber(
          (data as Record<string, unknown>).orderValue,
        );
        break;
      default:
        break;
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

const shouldSkipWrite = (
  existing: DocumentSnapshot<DocumentData>,
  latestAt: Timestamp | null,
  force?: boolean,
) => {
  if (!existing.exists || force) {
    return false;
  }

  const aggregatedAt = existing.get("aggregatedAt");
  const lastInteractionAt = existing.get("lastInteractionAt");

  if (!latestAt && aggregatedAt instanceof Timestamp) {
    return true;
  }

  if (
    latestAt &&
    aggregatedAt instanceof Timestamp &&
    aggregatedAt.toMillis() >= latestAt.toMillis()
  ) {
    return true;
  }

  if (
    latestAt &&
    lastInteractionAt instanceof Timestamp &&
    lastInteractionAt.toMillis() >= latestAt.toMillis()
  ) {
    return true;
  }

  return false;
};

const aggregateDateForCampaign = async (
  campaignId: string,
  date: string,
  force: boolean,
  runId: string,
): Promise<AggregationOutcome> => {
  const dailyRef = analyticsDailyCollection(campaignId).doc(date);
  const existingSnapshot = await dailyRef.get();

  const interactionsSnap = await interactionsCollection(campaignId)
    .where("timestamp", ">=", startOfDay(date))
    .where("timestamp", "<=", endOfDay(date))
    .get();

  const { metrics, latestAt } = aggregateInteractions(interactionsSnap.docs);
  metrics.date = date;

  if (shouldSkipWrite(existingSnapshot, latestAt, force)) {
    console.info(
      `[analytics][${campaignId}] Skipping ${date} (already aggregated)`,
    );
    return {
      campaignId,
      date,
      status: "skipped",
      interactionCount: interactionsSnap.size,
    };
  }

  await dailyRef.set(
    {
      ...metrics,
      lastInteractionAt: latestAt ?? null,
      aggregatedAt: FieldValue.serverTimestamp(),
      rollupSource: "nightly-analytics-script",
      runId,
    },
    { merge: true },
  );

  console.info(
    `[analytics][${campaignId}] Aggregated ${interactionsSnap.size} interactions for ${date}`,
  );

  return {
    campaignId,
    date,
    status: "written",
    interactionCount: interactionsSnap.size,
  };
};

const aggregateCampaign = async (
  campaignId: string,
  dates: string[],
  force: boolean,
  runId: string,
): Promise<CampaignAggregationResult> => {
  const outcomes: AggregationOutcome[] = [];

  for (const date of dates) {
    try {
      const outcome = await aggregateDateForCampaign(
        campaignId,
        date,
        force,
        runId,
      );
      outcomes.push(outcome);
    } catch (error) {
      console.error(
        `[analytics][${campaignId}] Failed to aggregate ${date}`,
        error,
      );
      outcomes.push({
        campaignId,
        date,
        status: "failed",
        interactionCount: 0,
        reason:
          error instanceof Error ? error.message : "Unknown aggregation error",
      });
    }
  }

  return { campaignId, outcomes };
};

const summarizeOutcomes = (results: CampaignAggregationResult[]) => {
  let written = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Record<string, string[]> = {};

  for (const campaign of results) {
    for (const outcome of campaign.outcomes) {
      if (outcome.status === "written") written++;
      if (outcome.status === "skipped") skipped++;
      if (outcome.status === "failed") {
        failed++;
        if (!failures[campaign.campaignId]) {
          failures[campaign.campaignId] = [];
        }
        failures[campaign.campaignId].push(
          `${outcome.date}: ${outcome.reason ?? "unknown error"}`,
        );
      }
    }
  }

  return { written, skipped, failed, failures };
};

export const runAggregateAnalytics = async (
  options: AggregationOptions = {},
) => {
  const { startDate, endDate } = resolveDateWindow(options);
  const dates = buildDateRange(startDate, endDate);
  const runId = `analytics-${Date.now()}`;
  const startedAt = Date.now();

  console.info(
    `[analytics] Starting aggregation run ${runId} for ${dates.length} day(s): ${dates.join(
      ", ",
    )}`,
  );

  const campaigns = await fetchCampaignIds(options.campaign);
  console.info(`[analytics] Found ${campaigns.length} campaign(s) to process`);

  const campaignResults: CampaignAggregationResult[] = [];

  for (const campaignId of campaigns) {
    const result = await aggregateCampaign(
      campaignId,
      dates,
      options.force ?? false,
      runId,
    );
    campaignResults.push(result);
  }

  const durationMs = Date.now() - startedAt;
  const summary = summarizeOutcomes(campaignResults);
  const status =
    summary.failed === 0
      ? "success"
      : summary.written > 0 || summary.skipped > 0
        ? "partial"
        : "failed";

  await aggregationLogsCollection.add({
    type: "promotionAnalyticsNightly",
    runId,
    options: {
      ...options,
      startDate,
      endDate,
    },
    campaignsProcessed: campaigns.length,
    datesProcessed: dates.length,
    stats: summary,
    durationMs,
    startedAt: Timestamp.fromMillis(startedAt),
    completedAt: FieldValue.serverTimestamp(),
    status,
  });

  console.info(
    `[analytics] Run ${runId} finished in ${durationMs}ms (written=${summary.written}, skipped=${summary.skipped}, failed=${summary.failed})`,
  );

  return { runId, durationMs, summary, dates, campaigns };
};

if (
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module
) {
  runAggregateAnalytics(parseCliArgs())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
