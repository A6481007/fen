"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SOLUTION_TYPES, type InsightTypeKey } from "@/constants/insightTypes";

type InsightDetail = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  insightType?: string;
  status?: string;
  summary?: string;
  publishedAt?: string;
  updatedAt?: string;
  _updatedAt?: string;
  author?: { name?: string };
  reviewer?: { name?: string };
  primaryCategory?: { title?: string };
  categories?: { title?: string }[];
  linkedProducts?: { name?: string }[];
  linkedInsights?: { title?: string }[];
  tags?: string[];
  mainImage?: { asset?: { _ref?: string } };
  publishAsBanner?: boolean;
  bannerSettings?: { startDate?: string; endDate?: string };
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
  };
};

type InsightDetailClientProps = {
  insight: InsightDetail;
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const buildPublicHref = (slug?: string, insightType?: string) => {
  if (!slug) return null;
  const isSolution = SOLUTION_TYPES.has((insightType ?? "") as InsightTypeKey);
  return isSolution ? `/insight/solutions/${slug}` : `/insight/knowledge/${slug}`;
};

const InsightDetailClient = ({ insight }: InsightDetailClientProps) => {
  const { t, i18n } = useTranslation();

  const locale = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("th") ? "th-TH" : "en-US"),
    [i18n.language],
  );

  const formatDate = (value?: string) => {
    if (!value) return t("admin.content.insights.detail.values.notSet");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t("admin.content.insights.detail.values.notSet");
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  };

  const statusLabel = (value?: string) => {
    if (!value) return t("admin.content.insights.status.draft");
    return t(`admin.content.insights.status.${value}`, value);
  };

  const insightTypeLabel = (value?: string) => {
    if (!value) return null;
    return t(`admin.content.insights.types.${value}`, value);
  };

  const slug = insight.slug?.current ?? "";
  const publicHref = buildPublicHref(slug, insight.insightType);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/content/insights">{t("admin.content.insights.detail.backToInsights")}</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {insight.title ?? t("admin.content.insights.detail.untitled")}
            </h1>
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[insight.status ?? "draft"] ?? statusStyles.draft}`}
            >
              {statusLabel(insight.status)}
            </Badge>
            {insight.insightType ? (
              <Badge variant="outline" className="capitalize">
                {insightTypeLabel(insight.insightType)}
              </Badge>
            ) : null}
          </div>
          <p className="max-w-2xl text-sm text-slate-600">
            {insight.summary || t("admin.content.insights.detail.summaryFallback")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/content/insights/${insight._id}/edit`}>
              {t("admin.content.insights.detail.editGovernance")}
            </Link>
          </Button>
          <Button asChild disabled={!publicHref}>
            <Link href={publicHref || "#"} aria-disabled={!publicHref}>
              {t("admin.content.insights.detail.viewPublicPage")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.content.insights.detail.sections.publishing")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.status")}</span>
              <span className="font-medium capitalize">{statusLabel(insight.status)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.published")}</span>
              <span className="font-medium">{formatDate(insight.publishedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.updated")}</span>
              <span className="font-medium">{formatDate(insight.updatedAt || insight._updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.content.insights.detail.sections.ownership")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.author")}</span>
              <span className="font-medium">
                {insight.author?.name ?? t("admin.content.insights.detail.values.unassigned")}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.reviewer")}</span>
              <span className="font-medium">
                {insight.reviewer?.name ?? t("admin.content.insights.detail.values.notAssigned")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.primaryCategory")}</span>
              <span className="font-medium">
                {insight.primaryCategory?.title ?? t("admin.content.insights.detail.values.uncategorized")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.content.insights.detail.sections.seo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-slate-500">{t("admin.content.insights.detail.fields.metaTitle")}</p>
              <p className="font-medium">
                {insight.seoMetadata?.metaTitle || t("admin.content.insights.detail.values.notSet")}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-slate-500">{t("admin.content.insights.detail.fields.metaDescription")}</p>
              <p className="font-medium">
                {insight.seoMetadata?.metaDescription || t("admin.content.insights.detail.values.notSet")}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-slate-500">{t("admin.content.insights.detail.fields.canonicalUrl")}</p>
              <p className="font-medium">
                {insight.seoMetadata?.canonicalUrl || t("admin.content.insights.detail.values.notSet")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.content.insights.detail.sections.relationships")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500">{t("admin.content.insights.detail.fields.categories")}</p>
              <p className="font-medium">
                {(insight.categories || [])
                  .map((category) => category?.title)
                  .filter(Boolean)
                  .join(", ") || t("admin.content.insights.detail.values.none")}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t("admin.content.insights.detail.fields.linkedProducts")}</p>
              <p className="font-medium">
                {(insight.linkedProducts || [])
                  .map((product) => product?.name)
                  .filter(Boolean)
                  .join(", ") || t("admin.content.insights.detail.values.none")}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t("admin.content.insights.detail.fields.linkedInsights")}</p>
              <p className="font-medium">
                {(insight.linkedInsights || [])
                  .map((linked) => linked?.title)
                  .filter(Boolean)
                  .join(", ") || t("admin.content.insights.detail.values.none")}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t("admin.content.insights.detail.fields.tags")}</p>
              <p className="font-medium">
                {(insight.tags || []).filter(Boolean).join(", ") || t("admin.content.insights.detail.values.none")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.content.insights.detail.sections.governanceChecks")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.heroImage")}</span>
              <span className="font-medium">
                {insight.mainImage?.asset?._ref
                  ? t("admin.content.insights.detail.values.set")
                  : t("admin.content.insights.detail.values.missing")}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.bannerEnabled")}</span>
              <span className="font-medium">
                {insight.publishAsBanner
                  ? t("admin.content.insights.detail.values.yes")
                  : t("admin.content.insights.detail.values.no")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("admin.content.insights.detail.fields.bannerSchedule")}</span>
              <span className="font-medium">
                {insight.bannerSettings?.startDate || insight.bannerSettings?.endDate
                  ? t("admin.content.insights.detail.values.scheduled")
                  : t("admin.content.insights.detail.values.none")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InsightDetailClient;
