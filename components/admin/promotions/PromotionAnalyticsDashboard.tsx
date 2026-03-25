'use client';

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DateRangeSelector } from "./DateRangeSelector";
import { MetricCard } from "./MetricCard";
import { BudgetMeter } from "./BudgetMeter";
import { UsageMeter } from "./UsageMeter";
import { FunnelChart } from "./FunnelChart";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { ChannelBreakdownChart } from "./ChannelBreakdownChart";
import { DeviceBreakdownChart } from "./DeviceBreakdownChart";
import { ABTestResults, type VariantAnalyticsView } from "./ABTestResults";
import { MetricsTable } from "./MetricsTable";
import { StatusBadge } from "./StatusBadge";
import { LiveConversionCounter, TimeRemainingWidget } from "./LiveWidgets";
import {
  ChannelPerformance,
  DerivedMetrics,
  DevicePerformance,
  FilterState,
  FunnelStage,
  TimeSeriesPoint,
} from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type PromotionSummary = {
  name: string;
  status: string;
  variantMode?: string | null;
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

type PromotionAnalyticsDashboardProps = {
  promotion: PromotionSummary;
  analytics: AnalyticsSnapshot;
  variantAnalytics?: VariantAnalyticsView | null;
  defaultFilters?: FilterState;
};

const SEGMENT_MULTIPLIER: Record<string, number> = {
  all: 1,
  new: 0.92,
  returning: 1.05,
  highIntent: 1.1,
  churnRisk: 0.88,
};

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const filterSeriesByDate = (series: TimeSeriesPoint[], filters: FilterState) => {
  const from = parseDate(filters.dateFrom);
  const to = parseDate(filters.dateTo);
  if (!from && !to) return series;

  return series.filter((point) => {
    const pointDate = parseDate(point.date);
    if (!pointDate) return true;
    if (from && pointDate < from) return false;
    if (to) {
      const normalizedTo = new Date(to);
      normalizedTo.setHours(23, 59, 59, 999);
      if (pointDate > normalizedTo) return false;
    }
    return true;
  });
};

const summarizeSeries = (series: TimeSeriesPoint[]) =>
  series.reduce(
    (acc, point) => {
      acc.impressions += point.impressions;
      acc.clicks += point.clicks;
      acc.addToCarts += point.addToCarts;
      acc.conversions += point.conversions;
      acc.revenue += point.revenue;
      return acc;
    },
    { impressions: 0, clicks: 0, addToCarts: 0, conversions: 0, revenue: 0 },
  );

const multiplyTotals = (
  totals: { impressions: number; clicks: number; addToCarts: number; conversions: number; revenue: number },
  multiplier: number,
) => ({
  impressions: Math.round(totals.impressions * multiplier),
  clicks: Math.round(totals.clicks * multiplier),
  addToCarts: Math.round(totals.addToCarts * multiplier),
  conversions: Math.round(totals.conversions * multiplier),
  revenue: Math.round(totals.revenue * multiplier * 100) / 100,
});

const recalcMetrics = (
  totals: {
    impressions: number;
    clicks: number;
    addToCarts: number;
    conversions: number;
    revenue: number;
    discountSpent: number;
  },
  baselineAov: number,
) => {
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cvr = totals.impressions > 0 ? (totals.conversions / totals.impressions) * 100 : 0;
  const cartRate = totals.clicks > 0 ? (totals.addToCarts / totals.clicks) * 100 : 0;
  const purchaseRate = totals.addToCarts > 0 ? (totals.conversions / totals.addToCarts) * 100 : 0;
  const aov = totals.conversions > 0 ? totals.revenue / totals.conversions : 0;
  const roi =
    totals.discountSpent > 0 ? ((totals.revenue - totals.discountSpent) / totals.discountSpent) * 100 : 0;
  const aovLift = baselineAov > 0 ? ((aov - baselineAov) / baselineAov) * 100 : 0;

  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    addToCarts: totals.addToCarts,
    conversions: totals.conversions,
    revenue: totals.revenue,
    discountSpent: totals.discountSpent,
    ctr,
    cvr,
    cartRate,
    purchaseRate,
    aov,
    baselineAov,
    aovLift,
    roi,
    impressionsChange: 0,
    conversionsChange: 0,
    revenueChange: 0,
    roiChange: 0,
  } satisfies DerivedMetrics;
};

const channelLabelKey = (channel: string) =>
  `admin.promotions.channels.${channel.toLowerCase()}`;
const deviceLabelKey = (device: string) =>
  `admin.promotions.devices.${device.toLowerCase()}`;

export function PromotionAnalyticsDashboard({
  promotion,
  analytics,
  variantAnalytics,
  defaultFilters,
}: PromotionAnalyticsDashboardProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(defaultFilters ?? {});

  const {
    adjustedMetrics,
    filteredFunnel,
    filteredDailySeries,
    filteredHourlySeries,
    channelChartData,
    deviceChartData,
    budgetSpent,
    usageCount,
  } = useMemo(() => {
    const selectedChannel = analytics.channelPerformance.find(
      (channel) =>
        filters.channel &&
        channel.channel.toLowerCase() === filters.channel.toLowerCase(),
    );
    const channelRatio =
      selectedChannel && analytics.metrics.conversions > 0
        ? selectedChannel.conversions / analytics.metrics.conversions
        : 1;

    const selectedDevice = analytics.devicePerformance.find(
      (device) =>
        filters.device &&
        device.device.toLowerCase() === filters.device.toLowerCase(),
    );
    const deviceRatio = selectedDevice ? selectedDevice.share / 100 : 1;
    const segmentMultiplier =
      SEGMENT_MULTIPLIER[filters.segment ?? "all"] ?? SEGMENT_MULTIPLIER.all;

    const dateFilteredSeries = filterSeriesByDate(
      analytics.dailySeries,
      filters,
    );
    const baseSeries =
      dateFilteredSeries.length > 0 ? dateFilteredSeries : analytics.dailySeries;
    const baseTotals = summarizeSeries(baseSeries);
    const rangeFactor =
      analytics.metrics.conversions > 0
        ? (baseTotals.conversions || analytics.metrics.conversions) /
          analytics.metrics.conversions
        : 1;

    const multiplier = Math.max(0, channelRatio * deviceRatio * segmentMultiplier);
    const adjustedTotals = multiplyTotals(baseTotals, multiplier);
    const adjustedDiscount =
      analytics.metrics.discountSpent * rangeFactor * multiplier;
    const recalculatedMetrics = recalcMetrics(
      {
        ...adjustedTotals,
        discountSpent: adjustedDiscount,
      },
      analytics.metrics.baselineAov,
    );

    const funnelData: FunnelStage[] = [
      {
        stage: t("admin.promotions.analytics.funnel.impressions"),
        value: recalculatedMetrics.impressions,
      },
      {
        stage: t("admin.promotions.analytics.funnel.clicks"),
        value: recalculatedMetrics.clicks,
      },
      {
        stage: t("admin.promotions.analytics.funnel.addToCart"),
        value: recalculatedMetrics.addToCarts,
      },
      {
        stage: t("admin.promotions.analytics.funnel.purchase"),
        value: recalculatedMetrics.conversions,
      },
    ];

    const scaledDailySeries = baseSeries.map((point) => ({
      ...point,
      impressions: Math.round(point.impressions * multiplier),
      clicks: Math.round(point.clicks * multiplier),
      addToCarts: Math.round(point.addToCarts * multiplier),
      conversions: Math.round(point.conversions * multiplier),
      revenue: Math.round(point.revenue * multiplier * 100) / 100,
    }));

    const scaledHourlySeries = analytics.hourlySeries.map((point) => ({
      ...point,
      impressions: Math.round(point.impressions * multiplier),
      clicks: Math.round(point.clicks * multiplier),
      addToCarts: Math.round(point.addToCarts * multiplier),
      conversions: Math.round(point.conversions * multiplier),
      revenue: Math.round(point.revenue * multiplier * 100) / 100,
    }));

    const channelRangeMultiplier = rangeFactor * deviceRatio * segmentMultiplier;
    const channelData = filters.channel && selectedChannel
      ? [
          {
            ...selectedChannel,
            impressions: Math.round(selectedChannel.impressions * channelRangeMultiplier),
            clicks: Math.round(selectedChannel.clicks * channelRangeMultiplier),
            addToCarts: Math.round(selectedChannel.addToCarts * channelRangeMultiplier),
            conversions: Math.round(selectedChannel.conversions * channelRangeMultiplier),
            revenue: Math.round(selectedChannel.revenue * channelRangeMultiplier * 100) / 100,
          },
        ]
      : analytics.channelPerformance.map((channel) => ({
          ...channel,
          impressions: Math.round(channel.impressions * channelRangeMultiplier),
          clicks: Math.round(channel.clicks * channelRangeMultiplier),
          addToCarts: Math.round(channel.addToCarts * channelRangeMultiplier),
          conversions: Math.round(channel.conversions * channelRangeMultiplier),
          revenue: Math.round(channel.revenue * channelRangeMultiplier * 100) / 100,
        }));

    const deviceRangeMultiplier = rangeFactor * channelRatio * segmentMultiplier;
    const deviceData = analytics.devicePerformance.map((device) => ({
      ...device,
      conversions: Math.round(device.conversions * deviceRangeMultiplier),
      revenue: Math.round(device.revenue * deviceRangeMultiplier * 100) / 100,
    }));

    return {
      adjustedMetrics: recalculatedMetrics,
      filteredFunnel: funnelData,
      filteredDailySeries: scaledDailySeries,
      filteredHourlySeries: scaledHourlySeries,
      channelChartData: channelData,
      deviceChartData: deviceData,
      budgetSpent: adjustedDiscount,
      usageCount: recalculatedMetrics.conversions,
    };
  }, [analytics, filters, t]);

  const filterOptionValue = (value?: string) => value ?? "all";

  return (
    <main className="admin-analytics space-y-8 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">{t("admin.promotions.analytics.title")}</p>
          <h1 className="text-2xl font-bold text-gray-900">{promotion.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={promotion.status} />
          <DateRangeSelector
            defaultFrom={filters.dateFrom}
            defaultTo={filters.dateTo}
            onChange={(range) => setFilters((prev) => ({ ...prev, ...range }))}
          />
        </div>
      </header>

      <Card className="border border-gray-100/80 shadow-sm">
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap gap-3">
            <Select
              value={filterOptionValue(filters.channel)}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  channel: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("admin.promotions.analytics.filters.channel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.promotions.analytics.filters.allChannels")}</SelectItem>
                {analytics.channelPerformance.map((channel) => (
                  <SelectItem key={channel.channel} value={channel.channel.toLowerCase()}>
                    {t(channelLabelKey(channel.channel), channel.channel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterOptionValue(filters.segment)}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  segment: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("admin.promotions.analytics.filters.segment")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.promotions.analytics.filters.allSegments")}</SelectItem>
                <SelectItem value="new">{t("admin.promotions.analytics.filters.newShoppers")}</SelectItem>
                <SelectItem value="returning">{t("admin.promotions.analytics.filters.returningBuyers")}</SelectItem>
                <SelectItem value="highIntent">{t("admin.promotions.analytics.filters.highIntent")}</SelectItem>
                <SelectItem value="churnRisk">{t("admin.promotions.analytics.filters.churnRisk")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterOptionValue(filters.device)}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  device: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("admin.promotions.analytics.filters.deviceType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.promotions.analytics.filters.allDevices")}</SelectItem>
                {analytics.devicePerformance.map((device) => (
                  <SelectItem key={device.device} value={device.device.toLowerCase()}>
                    {t(deviceLabelKey(device.device), device.device)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("admin.promotions.analytics.metrics.impressions")}
          value={adjustedMetrics.impressions.toLocaleString()}
          change={analytics.metrics.impressionsChange}
          icon="I"
        />
        <MetricCard
          title={t("admin.promotions.analytics.metrics.clicks")}
          value={adjustedMetrics.clicks.toLocaleString()}
          change={adjustedMetrics.ctr}
          helperText={t("admin.promotions.analytics.metrics.ctrHelper", {
            value: adjustedMetrics.ctr.toFixed(2),
          })}
          icon="C"
        />
        <MetricCard
          title={t("admin.promotions.analytics.metrics.conversions")}
          value={adjustedMetrics.conversions.toLocaleString()}
          change={analytics.metrics.conversionsChange}
          icon="V"
        />
        <MetricCard
          title={t("admin.promotions.analytics.metrics.revenue")}
          value={`$${adjustedMetrics.revenue.toLocaleString()}`}
          change={analytics.metrics.revenueChange}
          icon="R"
        />
        <MetricCard
          title={t("admin.promotions.analytics.metrics.ctr")}
          value={`${adjustedMetrics.ctr.toFixed(2)}%`}
          change={analytics.metrics.impressionsChange}
          icon="CTR"
        />
        <MetricCard
          title={t("admin.promotions.analytics.metrics.cvr")}
          value={`${adjustedMetrics.cvr.toFixed(2)}%`}
          change={analytics.metrics.conversionsChange}
          icon="CVR"
        />
        <MetricCard
          title={t("admin.promotions.analytics.metrics.aovVsBaseline")}
          value={`$${adjustedMetrics.aov.toFixed(2)}`}
          change={adjustedMetrics.aovLift}
          helperText={t("admin.promotions.analytics.metrics.baseline", {
            value: `$${adjustedMetrics.baselineAov.toFixed(2)}`,
          })}
          icon="AOV"
          highlight={adjustedMetrics.aovLift > 0}
        />
        <MetricCard
          title={t("admin.promotions.analytics.metrics.roi")}
          value={`${adjustedMetrics.roi.toFixed(1)}%`}
          change={analytics.metrics.roiChange}
          icon="ROI"
          highlight={adjustedMetrics.roi > 100}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LiveConversionCounter
          count={adjustedMetrics.conversions}
          lastUpdated={analytics.lastUpdated}
        />
        <BudgetMeter spent={budgetSpent} cap={analytics.budgetCap} />
        <UsageMeter used={usageCount} limit={analytics.usageLimit} />
        <TimeRemainingWidget timeRemainingMs={analytics.timeRemainingMs} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">
            {t("admin.promotions.analytics.sections.funnel")}
          </h2>
          <FunnelChart data={filteredFunnel} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">
            {t("admin.promotions.analytics.sections.performance")}
          </h2>
          <TimeSeriesChart daily={filteredDailySeries} hourly={filteredHourlySeries} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChannelBreakdownChart data={channelChartData} />
        <DeviceBreakdownChart data={deviceChartData} />
      </section>

      {promotion.variantMode === "split" && variantAnalytics ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">
            {t("admin.promotions.analytics.sections.abComparison")}
          </h2>
          <ABTestResults analytics={variantAnalytics} />
        </section>
      ) : null}

      <Separator />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t("admin.promotions.analytics.sections.details")}
          </h2>
          <p className="text-sm text-gray-500">
            {t("admin.promotions.analytics.sections.detailsDescription")}
          </p>
        </div>
        <MetricsTable
          metrics={adjustedMetrics}
          campaignName={promotion.name}
          filters={filters}
          lastUpdated={analytics.lastUpdated}
        />
      </section>
    </main>
  );
}
