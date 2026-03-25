"use client";

/*
[PROPOSED] EmployeeInsightDetail - scaffolded insight detail view for content ops.
[EXISTING] uses Button, Card, Badge, Tabs, Separator.
*/

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { getInsightTypeGroup, getInsightTypeLabel } from "@/lib/insightForm";
import { useTranslation } from "react-i18next";

type InsightDetailRecord = {
  _id: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  insightType?: string | null;
  summary?: string | null;
  status?: string | null;
  readingTime?: number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  nextReviewDate?: string | null;
  author?: { name?: string | null; title?: string | null } | null;
  reviewer?: { name?: string | null; title?: string | null } | null;
  primaryCategory?: { title?: string | null } | null;
  categories?: Array<{ _id?: string | null; title?: string | null }> | null;
  tags?: string[] | null;
  seoMetadata?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean | null;
  } | null;
  linkedProducts?: Array<{ _id?: string | null; name?: string | null }> | null;
  linkedInsights?: Array<{ _id?: string | null; title?: string | null }> | null;
  pillarPage?: { _id?: string | null; title?: string | null } | null;
  primaryKeyword?: string | null;
  primaryKeywordVolume?: number | null;
  primaryKeywordDifficulty?: number | null;
  secondaryKeywords?: Array<{ keyword?: string | null; volume?: number | null; difficulty?: number | null }> | null;
  solutionMaturity?: string | null;
  solutionComplexity?: string | null;
  implementationTimeline?: string | null;
  clientContext?: {
    clientName?: string | null;
    industry?: string | null;
    challengeDescription?: string | null;
    solutionDescription?: string | null;
  } | null;
  metrics?: Array<{ metricLabel?: string | null; metricValue?: string | null; metricDescription?: string | null }> | null;
  solutionProducts?: Array<{
    product?: { _id?: string | null; name?: string | null } | null;
    quantity?: number | null;
    isRequired?: boolean | null;
    notes?: string | null;
  }> | null;
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const EmployeeInsightDetail = ({ insight }: { insight: InsightDetailRecord | null }) => {
  const { t, i18n } = useTranslation();
  const formatDate = (value?: string | null) => {
    if (!value) return t("employee.insights.detail.values.notSet");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t("employee.insights.detail.values.notSet");
    return parsed.toLocaleDateString(i18n.language === "th" ? "th-TH" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!insight) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">{t("employee.insights.detail.notFound.title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("employee.insights.detail.notFound.subtitle")}
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/insights">{t("employee.insights.detail.actions.backToInsights")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const slug = insight.slug?.current;
  const previewHref = slug
    ? getInsightTypeGroup(insight.insightType) === "knowledge"
      ? `/insight/knowledge/${slug}`
      : `/insight/solutions/${slug}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/insights">
              <ArrowLeft className="h-4 w-4" />
              {t("employee.insights.detail.actions.backToInsights")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{insight.title || t("employee.insights.detail.values.untitledInsight")}</h1>
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[insight.status || "draft"]}`}
            >
              {t(`employee.insights.status.${insight.status || "draft"}`)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {t(
                `employee.insights.type.${insight.insightType ?? "unclassified"}`,
                getInsightTypeLabel(insight.insightType)
              )}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {insight.summary || t("employee.insights.detail.values.summaryFallback")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {previewHref ? (
            <Button asChild variant="outline" className="gap-2">
              <Link href={previewHref}>
                <Eye className="h-4 w-4" />
                {t("employee.insights.detail.actions.preview")}
              </Link>
            </Button>
          ) : null}
          <Button asChild className="gap-2">
            <Link href={`/employee/content/insights/${insight._id}/edit`}>
              <Pencil className="h-4 w-4" />
              {t("employee.insights.detail.actions.edit")}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview">{t("employee.insights.detail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="seo">{t("employee.insights.detail.tabs.seo")}</TabsTrigger>
          <TabsTrigger value="relations">{t("employee.insights.detail.tabs.relations")}</TabsTrigger>
          <TabsTrigger value="solutions">{t("employee.insights.detail.tabs.solutions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("employee.insights.detail.sections.publishing")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.status")}</span>
                  <span className="font-medium capitalize">{t(`employee.insights.status.${insight.status || "draft"}`)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.updated")}</span>
                  <span className="font-medium">{formatDate(insight.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.published")}</span>
                  <span className="font-medium">{formatDate(insight.publishedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.nextReview")}</span>
                  <span className="font-medium">{formatDate(insight.nextReviewDate)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("employee.insights.detail.sections.ownership")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.author")}</span>
                  <span className="font-medium">{insight.author?.name || t("employee.insights.placeholders.unassigned")}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.reviewer")}</span>
                  <span className="font-medium">{insight.reviewer?.name || t("employee.insights.detail.values.notAssigned")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.readingTime")}</span>
                  <span className="font-medium">
                    {insight.readingTime ? t("employee.insights.table.readingTime", { minutes: insight.readingTime }) : t("employee.insights.date.notSet")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("employee.insights.detail.sections.metadata")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.slug")}</span>
                  <span className="font-medium">{slug || t("employee.insights.detail.values.notSet")}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.primaryCategory")}</span>
                  <span className="font-medium">{insight.primaryCategory?.title || t("employee.insights.date.notSet")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("employee.insights.detail.fields.tags")}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insight.tags?.length ? (
                      insight.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="capitalize">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("employee.insights.detail.values.noTags")}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("employee.insights.detail.sections.searchMetadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.primaryKeyword")}</p>
                <p className="font-medium">{insight.primaryKeyword || t("employee.insights.detail.values.notSet")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("employee.insights.detail.fields.keywordVolume")}</p>
                  <p className="font-medium">
                    {insight.primaryKeywordVolume ?? t("employee.insights.detail.values.notSet")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("employee.insights.detail.fields.keywordDifficulty")}</p>
                  <p className="font-medium">
                    {insight.primaryKeywordDifficulty ?? t("employee.insights.detail.values.notSet")}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.seoTitle")}</p>
                <p className="font-medium">{insight.seoMetadata?.metaTitle || t("employee.insights.detail.values.notSet")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.seoDescription")}</p>
                <p className="font-medium">
                  {insight.seoMetadata?.metaDescription || t("employee.insights.detail.values.notSet")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.canonicalUrl")}</p>
                <p className="font-medium">{insight.seoMetadata?.canonicalUrl || t("employee.insights.detail.values.notSet")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("employee.insights.detail.sections.linkedItems")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.linkedProducts")}</p>
                <p className="font-medium">
                  {insight.linkedProducts?.length
                    ? insight.linkedProducts.map((product) => product.name).filter(Boolean).join(", ")
                    : t("employee.insights.detail.values.noLinkedProducts")}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.linkedInsights")}</p>
                <p className="font-medium">
                  {insight.linkedInsights?.length
                    ? insight.linkedInsights.map((linked) => linked.title).filter(Boolean).join(", ")
                    : t("employee.insights.detail.values.noLinkedInsights")}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.pillarPage")}</p>
                <p className="font-medium">{insight.pillarPage?.title || t("employee.insights.detail.values.notSet")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("employee.insights.detail.sections.solutionDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">{t("employee.insights.detail.fields.solutionMaturity")}</p>
                  <p className="font-medium">{insight.solutionMaturity || t("employee.insights.detail.values.notSet")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("employee.insights.detail.fields.solutionComplexity")}</p>
                  <p className="font-medium">{insight.solutionComplexity || t("employee.insights.detail.values.notSet")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("employee.insights.detail.fields.implementationTimeline")}</p>
                  <p className="font-medium">{insight.implementationTimeline || t("employee.insights.detail.values.notSet")}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.clientContext")}</p>
                <div className="space-y-1">
                  <p className="font-medium">{insight.clientContext?.clientName || t("employee.insights.detail.values.clientNameNotSet")}</p>
                  <p className="text-muted-foreground">{insight.clientContext?.industry || t("employee.insights.detail.values.industryNotSet")}</p>
                  <p>{insight.clientContext?.challengeDescription || t("employee.insights.detail.values.challengeNotSet")}</p>
                  <p>{insight.clientContext?.solutionDescription || t("employee.insights.detail.values.solutionNotSet")}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.metrics")}</p>
                <div className="mt-2 space-y-2">
                  {insight.metrics?.length ? (
                    insight.metrics.map((metric) => (
                      <div key={`${metric.metricLabel}-${metric.metricValue}`} className="rounded-md border border-slate-100 p-3">
                        <p className="font-medium">
                          {metric.metricLabel || t("employee.insights.detail.values.metric")} {metric.metricValue ? ` - ${metric.metricValue}` : ""}
                        </p>
                        <p className="text-muted-foreground">{metric.metricDescription || t("employee.insights.detail.values.noDescription")}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("employee.insights.detail.values.noMetricsDefined")}</p>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">{t("employee.insights.detail.fields.solutionProducts")}</p>
                <div className="mt-2 space-y-2">
                  {insight.solutionProducts?.length ? (
                    insight.solutionProducts.map((entry) => (
                      <div key={`${entry.product?._id}-${entry.notes}`} className="rounded-md border border-slate-100 p-3">
                        <p className="font-medium">{entry.product?.name || t("employee.insights.detail.values.product")}</p>
                        <p className="text-muted-foreground">
                          {t("employee.insights.detail.values.qty")}: {entry.quantity ?? 1} - {entry.isRequired ? t("employee.insights.detail.values.required") : t("employee.insights.detail.values.optional")}
                        </p>
                        <p className="text-muted-foreground">{entry.notes || t("employee.insights.detail.values.noNotes")}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("employee.insights.detail.values.noSolutionProducts")}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeInsightDetail;
