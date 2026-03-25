"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface PromotionAnalyticsBarProps {
  analytics: {
    impressions: number;
    clicks: number;
    conversions: number;
    totalDiscountSpent: number;
    totalRevenue: number;
  } | null;
  budgetCap?: number;
  usageLimit?: number;
  showPublicStats?: boolean;
  showAdminStats?: boolean;
  variant?: "bar" | "cards" | "minimal";
  className?: string;
}

export function PromotionAnalyticsBar({
  analytics,
  budgetCap,
  usageLimit,
  showPublicStats = true,
  showAdminStats = false,
  variant = "bar",
  className = "",
}: PromotionAnalyticsBarProps) {
  const { t } = useTranslation();

  if (!analytics) return null;

  const metrics = useMemo(() => {
    const conversionRate =
      analytics.impressions > 0
        ? ((analytics.conversions / analytics.impressions) * 100).toFixed(1)
        : "0";

    const clickRate =
      analytics.impressions > 0
        ? ((analytics.clicks / analytics.impressions) * 100).toFixed(1)
        : "0";

    const avgOrderValue =
      analytics.conversions > 0
        ? (analytics.totalRevenue / analytics.conversions).toFixed(2)
        : "0";

    const roi =
      analytics.totalDiscountSpent > 0
        ? (
            ((analytics.totalRevenue - analytics.totalDiscountSpent) /
              analytics.totalDiscountSpent) *
            100
          ).toFixed(0)
        : "0";

    const budgetUsed = budgetCap
      ? Math.min(100, (analytics.totalDiscountSpent / budgetCap) * 100)
      : 0;

    const usagePercent = usageLimit
      ? Math.min(100, (analytics.conversions / usageLimit) * 100)
      : 0;

    return {
      conversionRate,
      clickRate,
      avgOrderValue,
      roi,
      budgetUsed,
      usagePercent,
    };
  }, [analytics, budgetCap, usageLimit]);

  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-4 text-sm ${className}`}>
        <span className="flex items-center gap-1">
          <span className="font-medium">{analytics.conversions.toLocaleString()}</span>
          <span className="text-gray-500">
            {t("client.promotions.analytics.redeemed", "redeemed")}
          </span>
        </span>
        {usageLimit ? (
          <span className="text-gray-400">
            {t("client.promotions.analytics.of", {
              defaultValue: "of {{count}}",
              count: usageLimit.toLocaleString(),
            })}
          </span>
        ) : null}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className}`}>
        {showPublicStats && (
          <>
            <StatCard
              label={t("client.promotions.analytics.cards.peopleSaved", "People Saved")}
              value={analytics.conversions.toLocaleString()}
            />
            <StatCard
              label={t("client.promotions.analytics.cards.totalSaved", "Total Saved")}
              value={`$${analytics.totalDiscountSpent.toLocaleString()}`}
            />
          </>
        )}

        {showAdminStats && (
          <>
            <StatCard
              label={t("client.promotions.analytics.cards.impressions", "Impressions")}
              value={analytics.impressions.toLocaleString()}
              subtext={t("client.promotions.analytics.cards.ctr", {
                defaultValue: "{{value}}% CTR",
                value: metrics.clickRate,
              })}
            />
            <StatCard
              label={t("client.promotions.analytics.cards.conversions", "Conversions")}
              value={analytics.conversions.toLocaleString()}
              subtext={t("client.promotions.analytics.cards.cvr", {
                defaultValue: "{{value}}% CVR",
                value: metrics.conversionRate,
              })}
            />
            <StatCard
              label={t("client.promotions.analytics.cards.revenue", "Revenue")}
              value={`$${analytics.totalRevenue.toLocaleString()}`}
              subtext={t("client.promotions.analytics.cards.aov", {
                defaultValue: "${{value}} AOV",
                value: metrics.avgOrderValue,
              })}
            />
            <StatCard
              label={t("client.promotions.analytics.cards.roi", "ROI")}
              value={`${metrics.roi}%`}
              subtext={t("client.promotions.analytics.cards.spent", {
                defaultValue: "${{value}} spent",
                value: analytics.totalDiscountSpent.toLocaleString(),
              })}
              highlight={Number(metrics.roi) > 100}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-gray-50 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {showPublicStats && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {analytics.conversions.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {t("client.promotions.analytics.peopleSaved", "people saved")}
              </p>
            </div>
            {usageLimit ? (
              <div className="max-w-[200px] flex-1">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>{t("client.promotions.analytics.claimed", "Claimed")}</span>
                  <span>{metrics.usagePercent.toFixed(0)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${metrics.usagePercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {t("client.promotions.analytics.remaining", {
                    defaultValue: "{{count}} remaining",
                    count: (usageLimit - analytics.conversions).toLocaleString(),
                  })}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {showAdminStats && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">
                {t("client.promotions.analytics.ctrLabel", "CTR:")}
              </span>{" "}
              <span className="font-medium">{metrics.clickRate}%</span>
            </div>
            <div>
              <span className="text-gray-500">
                {t("client.promotions.analytics.cvrLabel", "CVR:")}
              </span>{" "}
              <span className="font-medium">{metrics.conversionRate}%</span>
            </div>
            <div>
              <span className="text-gray-500">
                {t("client.promotions.analytics.aovLabel", "AOV:")}
              </span>{" "}
              <span className="font-medium">${metrics.avgOrderValue}</span>
            </div>
            <div>
              <span className="text-gray-500">
                {t("client.promotions.analytics.roiLabel", "ROI:")}
              </span>{" "}
              <span
                className={`font-medium ${
                  Number(metrics.roi) > 100 ? "text-green-600" : "text-gray-900"
                }`}
              >
                {metrics.roi}%
              </span>
            </div>
            {budgetCap ? (
              <div>
                <span className="text-gray-500">
                  {t("client.promotions.analytics.budgetLabel", "Budget:")}
                </span>{" "}
                <span
                  className={`font-medium ${metrics.budgetUsed > 80 ? "text-orange-600" : ""}`}
                >
                  {metrics.budgetUsed.toFixed(0)}%{" "}
                  {t("client.promotions.analytics.budgetUsedSuffix", "used")}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        highlight ? "border-green-500 bg-green-50" : ""
      }`}
    >
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${highlight ? "text-green-600" : ""}`}>{value}</p>
        {subtext ? <p className="mt-1 text-xs text-gray-400">{subtext}</p> : null}
      </div>
    </div>
  );
}
