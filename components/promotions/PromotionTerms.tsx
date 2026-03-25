"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { PROMOTION_BY_CAMPAIGN_ID_QUERYResult } from "@/sanity.types";
import { useTranslation } from "react-i18next";

type Promotion = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;

type PromotionTermsProps = {
  promotion: Promotion;
};

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `$${value.toFixed(2)}`;
};

const formatDate = (
  locale: string,
  fallback: string,
  value?: string | null
) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

export function PromotionTerms({ promotion }: PromotionTermsProps) {
  const { t, i18n } = useTranslation();
  const tbdLabel = t("client.promotions.terms.tbd", "TBD");
  const terms: { label: string; value: string | null }[] = [
    { label: t("client.promotions.terms.labels.campaignId", "Campaign ID"), value: promotion.campaignId || null },
    { label: t("client.promotions.terms.labels.status", "Status"), value: promotion.status || null },
    {
      label: t("client.promotions.terms.labels.starts", "Starts"),
      value: formatDate(i18n.language || "en-US", tbdLabel, promotion.startDate),
    },
    {
      label: t("client.promotions.terms.labels.ends", "Ends"),
      value: formatDate(i18n.language || "en-US", tbdLabel, promotion.endDate),
    },
    { label: t("client.promotions.terms.labels.timezone", "Timezone"), value: promotion.timezone || "UTC" },
    { label: t("client.promotions.terms.labels.discountType", "Discount type"), value: promotion.discountType || null },
    {
      label: t("client.promotions.terms.labels.discountValue", "Discount value"),
      value:
        promotion.discountType === "percentage"
          ? `${Math.round(promotion.discountValue ?? 0)}%`
          : formatCurrency(promotion.discountValue),
    },
    { label: t("client.promotions.terms.labels.minimumOrder", "Minimum order"), value: formatCurrency(promotion.minimumOrderValue) },
    { label: t("client.promotions.terms.labels.maximumDiscount", "Maximum discount"), value: formatCurrency(promotion.maximumDiscount) },
    {
      label: t("client.promotions.terms.labels.usageLimit", "Usage limit"),
      value: promotion.usageLimit
        ? t("client.promotions.terms.usageLimitValue", {
            defaultValue: "{{count}} redemptions",
            count: promotion.usageLimit,
          })
        : t("client.promotions.terms.unlimited", "Unlimited"),
    },
    {
      label: t("client.promotions.terms.labels.perCustomerLimit", "Per-customer limit"),
      value: promotion.perCustomerLimit
        ? t("client.promotions.terms.perCustomerValue", {
            defaultValue: "{{count}} per customer",
            count: promotion.perCustomerLimit,
          })
        : t("client.promotions.terms.unlimited", "Unlimited"),
    },
    {
      label: t("client.promotions.terms.labels.targetSegment", "Target segment"),
      value:
        promotion.targetAudience?.segmentType ||
        t("client.promotions.terms.allCustomers", "All customers"),
    },
  ];

  return (
    <Card className="border border-gray-100 bg-white/90 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("client.promotions.terms.kicker", "Terms")}
            </p>
            <h2 className="text-lg font-bold text-gray-900">
              {t("client.promotions.terms.title", "Promotion details")}
            </h2>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {terms
            .filter((term) => term.value)
            .map((term) => (
              <div key={term.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{term.label}</dt>
                <dd className="text-sm font-medium text-gray-900">{term.value}</dd>
              </div>
            ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export default PromotionTerms;
