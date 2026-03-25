"use client";

import Link from "next/link";
import { BarChart3, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";

type PromotionCampaign = {
  _id?: string;
  campaignId?: string | null;
  name?: string | null;
  status?: string | null;
  type?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  isExpired?: boolean | null;
  isUpcoming?: boolean | null;
};

type PromotionAnalyticsIndexClientProps = {
  campaigns: PromotionCampaign[];
  hasMarketingAccess: boolean;
};

export function PromotionAnalyticsIndexClient({
  campaigns,
  hasMarketingAccess,
}: PromotionAnalyticsIndexClientProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";

  const formatDate = (value?: string | null) => {
    if (!value) return t("admin.promotions.index.notScheduled");
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? t("admin.promotions.index.notScheduled")
      : new Intl.DateTimeFormat(locale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(date);
  };

  const describeLifecycle = (promotion: PromotionCampaign) => {
    if (promotion.isActive) return t("admin.promotions.index.lifecycle.active");
    if (promotion.isUpcoming) return t("admin.promotions.index.lifecycle.upcoming");
    if (promotion.isExpired) return t("admin.promotions.index.lifecycle.ended");
    return t("admin.promotions.index.lifecycle.draft");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BarChart3 className="h-4 w-4 text-brand-text-main" />
            {t("admin.promotions.index.title")}
          </div>
          <p className="text-sm text-slate-600">
            {t("admin.promotions.index.subtitle")}
          </p>
        </div>
        {hasMarketingAccess && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/marketing/promotions">
                {t("admin.promotions.index.manage")}
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/marketing/promotions/new">
                {t("admin.promotions.index.new")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.promotions.index.empty.title")}</CardTitle>
            <CardDescription>
              {t("admin.promotions.index.empty.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              {t("admin.promotions.index.empty.body")}
            </p>
            {hasMarketingAccess && (
              <Button size="sm" asChild>
                <Link href="/admin/marketing/promotions/new">
                  {t("admin.promotions.index.empty.cta")}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((promotion) => (
            <Card key={promotion.campaignId ?? promotion._id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {promotion.name ?? t("admin.promotions.index.untitled")}
                  </CardTitle>
                  <CardDescription>
                    {t("admin.promotions.index.campaignId", {
                      id: promotion.campaignId,
                    })}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {promotion.status ?? t("admin.promotions.index.statusFallback")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-brand-text-main" />
                    <span className="capitalize">
                      {promotion.type ?? t("admin.promotions.index.notAvailable")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(promotion.startDate)} {t("admin.promotions.index.to")}{" "}
                    {formatDate(promotion.endDate)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {describeLifecycle(promotion)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {t("admin.promotions.index.available")}
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/admin/promotions/${promotion.campaignId}/analytics`}>
                      {t("admin.promotions.index.view")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
