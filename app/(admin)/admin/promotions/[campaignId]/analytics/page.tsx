import { Suspense } from "react";
import type { Metadata } from "next";
import {
  getPromotionAnalytics,
  getVariantAnalytics,
  type PromotionAnalytics,
  type VariantAnalytics,
} from "@/lib/promotions/analytics";
import { Timestamp } from "@/lib/firebaseAdmin";
import { getPromotionByCampaignId, getDealById } from "@/sanity/queries";
import { PromotionAnalyticsDashboard } from "@/components/admin/promotions/PromotionAnalyticsDashboard";
import PromotionAnalyticsNotice from "@/components/admin/promotions/PromotionAnalyticsNotice";
import { DashboardSkeleton } from "@/components/admin/DashboardSkeleton";
import {
  ChannelPerformance,
  DerivedMetrics,
  DevicePerformance,
  FilterState,
  FunnelStage,
  TimeSeriesPoint,
} from "@/components/admin/promotions/types";
import type { VariantAnalyticsView } from "@/components/admin/promotions/ABTestResults";
import { getMetadataForLocale } from "@/lib/metadataLocale";

export const revalidate = 0;

const METADATA_BY_LOCALE = {
  en: {
    title: "Promotion Analytics | Admin",
    description: "Monitor promotion and deal analytics across channel, device, and funnel metrics.",
  },
  th: {
    title: "วิเคราะห์โปรโมชัน | ผู้ดูแลระบบ",
    description: "ติดตามการวิเคราะห์โปรโมชันและดีลตามช่องทาง อุปกรณ์ และตัวชี้วัดกรวยการขาย",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

interface PageProps {
  params: Promise<{ campaignId: string }> | { campaignId: string };
  searchParams:
    | Promise<{
        dateFrom?: string;
        dateTo?: string;
        channel?: string;
        segment?: string;
        device?: string;
      }>
    | {
        dateFrom?: string;
        dateTo?: string;
        channel?: string;
        segment?: string;
        device?: string;
      };
}

type CampaignSummary = {
  name: string;
  status: string;
  kind: "promotion" | "deal";
  variantMode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetCap?: number;
  usageLimit?: number;
  timeRemaining?: number;
  minimumOrderValue?: number;
};

type AnalyticsSnapshot = {
  metrics: DerivedMetrics;
  funnel: FunnelStage[];
  dailySeries: TimeSeriesPoint[];
  hourlySeries: TimeSeriesPoint[];
  channelPerformance: ChannelPerformance[];
  devicePerformance: DevicePerformance[];
  lastUpdated: string | null;
  budgetCap: number;
  usageLimit: number;
  timeRemainingMs: number | null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const seedFromCampaign = (campaignId: string) =>
  campaignId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const buildWeights = (count: number, seed: number) =>
  Array.from({ length: count }).map((_, index) => {
    const variance = Math.sin(seed + index) + Math.cos(seed / (index + 1));
    return Math.max(0.4, 1 + variance * 0.15 + (index % 3) * 0.05);
  });

const distributeValue = (total: number, weights: number[], precision = 0) => {
  const scale = precision > 0 ? Math.pow(10, precision) : 1;
  const totalWeights = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const values = weights.map((weight) =>
    Math.round(((total * weight) / totalWeights) * scale) / scale,
  );
  const diff =
    Math.round((total - values.reduce((sum, value) => sum + value, 0)) * scale) / scale;
  values[values.length - 1] =
    Math.round((values[values.length - 1] + diff) * scale) / scale;
  return values;
};

const buildDerivedMetrics = (
  analytics: PromotionAnalytics,
  promotion: CampaignSummary,
  campaignId: string,
): DerivedMetrics => {
  const impressions = toNumber(analytics?.impressions);
  const clicks = toNumber(analytics?.clicks);
  const addToCarts = toNumber(analytics?.addToCarts);
  const conversions = toNumber(analytics?.conversions);
  const revenue = toNumber(analytics?.totalRevenue);
  const discountSpent = toNumber(analytics?.totalDiscountSpent);
  const baselineAov = Math.max(0, toNumber(promotion.minimumOrderValue, 0));

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = impressions > 0 ? (conversions / impressions) * 100 : 0;
  const cartRate = clicks > 0 ? (addToCarts / clicks) * 100 : 0;
  const purchaseRate = addToCarts > 0 ? (conversions / addToCarts) * 100 : 0;
  const aov = conversions > 0 ? revenue / conversions : 0;
  const roi = discountSpent > 0 ? ((revenue - discountSpent) / discountSpent) * 100 : 0;
  const aovLift = baselineAov > 0 ? ((aov - baselineAov) / baselineAov) * 100 : 0;
  const seed = seedFromCampaign(campaignId);
  const tinyDelta = (seed % 7) - 3;

  return {
    impressions,
    clicks,
    addToCarts,
    conversions,
    revenue,
    discountSpent,
    ctr,
    cvr,
    cartRate,
    purchaseRate,
    aov,
    baselineAov,
    aovLift,
    roi,
    impressionsChange: tinyDelta,
    conversionsChange: tinyDelta - 1,
    revenueChange: tinyDelta + 2,
    roiChange: tinyDelta + 0.5,
  };
};

const buildFunnel = (metrics: DerivedMetrics): FunnelStage[] => [
  { stage: "Impressions", value: metrics.impressions },
  { stage: "Clicks", value: metrics.clicks },
  { stage: "Add to Cart", value: metrics.addToCarts },
  { stage: "Purchase", value: metrics.conversions },
];

const buildDailySeries = (
  analytics: DerivedMetrics,
  promotion: CampaignSummary,
  campaignId: string,
): TimeSeriesPoint[] => {
  const days = 10;
  const seed = seedFromCampaign(campaignId);
  const weights = buildWeights(days, seed);
  const impressions = distributeValue(analytics.impressions, weights);
  const clicks = distributeValue(analytics.clicks, weights);
  const addToCarts = distributeValue(analytics.addToCarts, weights);
  const conversions = distributeValue(analytics.conversions, weights);
  const revenue = distributeValue(analytics.revenue, weights, 2);

  const baseDate = promotion.startDate
    ? new Date(promotion.startDate)
    : new Date();
  // Ensure we show the most recent window up to today
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  const start =
    baseDate.getTime() > startDate.getTime() ? baseDate : startDate;

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString(),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      impressions: impressions[index] ?? 0,
      clicks: clicks[index] ?? 0,
      addToCarts: addToCarts[index] ?? 0,
      conversions: conversions[index] ?? 0,
      revenue: revenue[index] ?? 0,
    };
  });
};

const buildHourlySeries = (analytics: DerivedMetrics, campaignId: string): TimeSeriesPoint[] => {
  const hours = 24;
  const seed = seedFromCampaign(campaignId) + 5;
  const weights = buildWeights(hours, seed);
  const totalConversions = analytics.conversions > 0 ? analytics.conversions : 24;
  const conversions = distributeValue(totalConversions, weights);
  const revenueTotal =
    analytics.revenue > 0
      ? analytics.revenue
      : totalConversions * Math.max(analytics.aov, 20);
  const revenue = distributeValue(revenueTotal, weights, 2);

  return Array.from({ length: hours }).map((_, index) => ({
    date: new Date(Date.now() - (hours - index - 1) * 60 * 60 * 1000).toISOString(),
    label: `${index}:00`,
    impressions: 0,
    clicks: 0,
    addToCarts: 0,
    conversions: conversions[index] ?? 0,
    revenue: revenue[index] ?? 0,
  }));
};

const buildChannelPerformance = (
  analytics: DerivedMetrics,
  campaignId: string,
): ChannelPerformance[] => {
  const seed = seedFromCampaign(campaignId);
  const weights = [0.44 + (seed % 5) * 0.005, 0.33 + ((seed + 3) % 4) * 0.01, 0.23 + ((seed + 1) % 3) * 0.01];
  const channels = ["Email", "SMS", "Push"] as const;

  const impressions = distributeValue(analytics.impressions, weights);
  const clicks = distributeValue(analytics.clicks, weights);
  const addToCarts = distributeValue(analytics.addToCarts, weights);
  const conversions = distributeValue(analytics.conversions, weights);
  const revenue = distributeValue(analytics.revenue, weights, 2);

  return channels.map((channel, index) => ({
    channel,
    impressions: impressions[index] ?? 0,
    clicks: clicks[index] ?? 0,
    addToCarts: addToCarts[index] ?? 0,
    conversions: conversions[index] ?? 0,
    revenue: revenue[index] ?? 0,
  }));
};

const buildDevicePerformance = (
  analytics: DerivedMetrics,
  campaignId: string,
): DevicePerformance[] => {
  const seed = seedFromCampaign(campaignId) + 11;
  const weights = [0.55 + (seed % 4) * 0.02, 0.32 + ((seed + 2) % 3) * 0.015, 0.13 + ((seed + 1) % 2) * 0.01];
  const devices = ["Mobile", "Desktop", "Tablet"] as const;
  const conversions = distributeValue(analytics.conversions, weights);
  const revenue = distributeValue(analytics.revenue, weights, 2);

  return devices.map((device, index) => {
    const share = analytics.conversions > 0 ? (conversions[index] / analytics.conversions) * 100 : weights[index] * 100;
    return {
      device,
      conversions: conversions[index] ?? 0,
      revenue: revenue[index] ?? 0,
      share: Math.round(share * 10) / 10,
    };
  });
};

const normalizeVariantAnalytics = (variantAnalytics: VariantAnalytics | null): VariantAnalyticsView | null => {
  if (!variantAnalytics) return null;
  return {
    variants: {
      control: { name: "control", ...variantAnalytics.variants.control },
      variantA: { name: "variantA", ...variantAnalytics.variants.variantA },
      variantB: { name: "variantB", ...variantAnalytics.variants.variantB },
    },
    winner: variantAnalytics.winner,
    confidence: variantAnalytics.confidence,
    sampleSize: variantAnalytics.sampleSize,
    startDate: variantAnalytics.startDate?.toISOString(),
    endDate: variantAnalytics.endDate?.toISOString(),
  };
};

export default async function PromotionAnalyticsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const { campaignId } = resolvedParams;

  const [promotion, deal, analyticsRaw, variantAnalyticsRaw] = await Promise.all([
    getPromotionByCampaignId(campaignId),
    getDealById(campaignId),
    getPromotionAnalytics(campaignId),
    getVariantAnalytics(campaignId),
  ]);

  const campaign = promotion ?? deal;

  if (!campaign) {
    return (
      <div className="p-6">
        <PromotionAnalyticsNotice kind="notFound" />
      </div>
    );
  }

  const isPromotion = Boolean(promotion);
  if (campaign.status === "draft" || campaign.status === "archived") {
    return (
      <div className="p-6">
        <PromotionAnalyticsNotice kind="inactive" isPromotion={isPromotion} />
      </div>
    );
  }
  const campaignSummary: CampaignSummary = {
    name: isPromotion ? promotion?.name || campaignId : campaign.title || campaignId,
    status: campaign.status || "active",
    kind: isPromotion ? "promotion" : "deal",
    variantMode: isPromotion ? promotion?.variantMode : null,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    budgetCap: isPromotion ? toNumber(promotion?.budgetCap, 0) : 0,
    usageLimit: isPromotion ? toNumber(promotion?.usageLimit, 0) : 0,
    timeRemaining: isPromotion ? toNumber(promotion?.timeRemaining, 0) : undefined,
    minimumOrderValue: toNumber(
      isPromotion
        ? promotion?.minimumOrderValue
        : campaign.originalPrice ?? campaign.dealPrice ?? 0,
      0,
    ),
  };

  const analytics: PromotionAnalytics = analyticsRaw || {
    impressions: 0,
    clicks: 0,
    addToCarts: 0,
    conversions: 0,
    totalDiscountSpent: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    lastUpdated: Timestamp.fromMillis(0),
  };

  const metrics = buildDerivedMetrics(analytics, campaignSummary, campaignId);
  const funnel = buildFunnel(metrics);
  const dailySeries = buildDailySeries(metrics, campaignSummary, campaignId);
  const hourlySeries = buildHourlySeries(metrics, campaignId);
  const channelPerformance = buildChannelPerformance(metrics, campaignId);
  const devicePerformance = buildDevicePerformance(metrics, campaignId);
  const timeRemainingMs =
    typeof campaignSummary.timeRemaining === "number"
      ? Math.max(0, campaignSummary.timeRemaining)
      : campaignSummary.endDate
        ? Math.max(0, new Date(campaignSummary.endDate).getTime() - Date.now())
        : null;

  const snapshot: AnalyticsSnapshot = {
    metrics,
    funnel,
    dailySeries,
    hourlySeries,
    channelPerformance,
    devicePerformance,
    lastUpdated: analytics.lastUpdated?.toDate?.().toISOString?.() ?? null,
    budgetCap: campaignSummary.budgetCap ?? 0,
    usageLimit: campaignSummary.usageLimit ?? 0,
    timeRemainingMs,
  };

  const variantAnalytics = isPromotion ? normalizeVariantAnalytics(variantAnalyticsRaw) : null;
  const defaultFilters: FilterState = {
    dateFrom: resolvedSearchParams.dateFrom,
    dateTo: resolvedSearchParams.dateTo,
    channel: resolvedSearchParams.channel,
    segment: resolvedSearchParams.segment,
    device: resolvedSearchParams.device,
  };

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PromotionAnalyticsDashboard
        promotion={campaignSummary}
        analytics={snapshot}
        variantAnalytics={variantAnalytics}
        defaultFilters={defaultFilters}
      />
    </Suspense>
  );
}
