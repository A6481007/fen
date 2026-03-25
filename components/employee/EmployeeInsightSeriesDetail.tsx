"use client";

/*
[PROPOSED] EmployeeInsightSeriesDetail - scaffolded insight series detail view for content ops.
[EXISTING] uses Button, Card, Badge, Tabs, Separator.
*/

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

type SeriesStatus = "active" | "draft" | "archived";
type SeriesVisibility = "internal" | "external";
type SeriesCadence = "weekly" | "monthly" | "quarterly";

type SeriesDetail = {
  id: string;
  title: string;
  status: SeriesStatus;
  visibility: SeriesVisibility;
  cadence: SeriesCadence;
  summary: string;
  slug: string;
  owner: string;
  editor: string;
  createdAt: string;
  updatedAt: string;
  lastIssue: string | null;
  nextIssue: string | null;
  insightCount: number;
  focusAreas: string[];
  distribution: string[];
  featuredInsights: string[];
  seoTitle: string;
  seoDescription: string;
};

const SERIES: SeriesDetail[] = [
  {
    id: "SER-3001",
    title: "Operational Excellence Weekly",
    status: "active",
    visibility: "external",
    cadence: "weekly",
    summary: "Weekly deep dives on plant performance, reliability, and uptime.",
    slug: "operational-excellence-weekly",
    owner: "Alicia Park",
    editor: "Dana Hughes",
    createdAt: "2025-11-03",
    updatedAt: "2026-01-12",
    lastIssue: "2026-01-10",
    nextIssue: "2026-01-17",
    insightCount: 14,
    focusAreas: ["Reliability", "Throughput", "Maintenance"],
    distribution: ["Insight Hub", "Email Digest", "Sales Enablement"],
    featuredInsights: ["INS-1001", "INS-0998", "INS-0982"],
    seoTitle: "Operational excellence insights",
    seoDescription:
      "Weekly insights on manufacturing excellence, reliability, and uptime programs.",
  },
  {
    id: "SER-3002",
    title: "Sustainability Scorecard",
    status: "draft",
    visibility: "external",
    cadence: "monthly",
    summary: "Monthly sustainability benchmarks, audits, and reporting insights.",
    slug: "sustainability-scorecard",
    owner: "Jordan Lee",
    editor: "Priya Nair",
    createdAt: "2025-09-14",
    updatedAt: "2026-01-10",
    lastIssue: "2025-12-14",
    nextIssue: "2026-01-14",
    insightCount: 6,
    focusAreas: ["Energy", "Emissions", "Reporting"],
    distribution: ["Insight Hub", "Executive Brief"],
    featuredInsights: ["INS-1003"],
    seoTitle: "Sustainability scorecard series",
    seoDescription:
      "Monthly sustainability reporting insights for operations and ESG leaders.",
  },
  {
    id: "SER-3003",
    title: "Risk Response Digest",
    status: "active",
    visibility: "internal",
    cadence: "monthly",
    summary: "Incident response tactics, drills, and compliance reminders.",
    slug: "risk-response-digest",
    owner: "Priya Nair",
    editor: "Ravi Patel",
    createdAt: "2025-08-09",
    updatedAt: "2026-01-08",
    lastIssue: "2026-01-05",
    nextIssue: "2026-02-05",
    insightCount: 9,
    focusAreas: ["Incident Response", "Compliance"],
    distribution: ["Internal Wiki", "Leadership Brief"],
    featuredInsights: ["INS-1004", "INS-0974"],
    seoTitle: "Risk response digest",
    seoDescription:
      "Internal digest of incident response checklists and readiness drills.",
  },
];

const statusStyles: Record<SeriesStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const visibilityStyles: Record<SeriesVisibility, string> = {
  internal: "bg-slate-100 text-slate-700 border-slate-200",
  external: "bg-sky-50 text-sky-700 border-sky-200",
};

const EmployeeInsightSeriesDetail = ({ seriesId }: { seriesId: string }) => {
  const { t, i18n } = useTranslation();
  const localizedSeries = useMemo(
    () =>
      SERIES.map((item) => ({
        ...item,
        title: t(`employee.insightSeries.mock.${item.id}.title`, item.title),
        summary: t(`employee.insightSeries.mock.${item.id}.summary`, item.summary),
        owner: t(`employee.insightSeries.mock.${item.id}.owner`, item.owner),
        editor: t(`employee.insightSeries.mock.${item.id}.editor`, item.editor),
        seoTitle: t(`employee.insightSeries.mock.${item.id}.seoTitle`, item.seoTitle),
        seoDescription: t(
          `employee.insightSeries.mock.${item.id}.seoDescription`,
          item.seoDescription
        ),
        focusAreas: item.focusAreas.map((area, index) =>
          t(`employee.insightSeries.mock.${item.id}.focusArea${index + 1}`, area)
        ),
        distribution: item.distribution.map((channel, index) =>
          t(`employee.insightSeries.mock.${item.id}.distribution${index + 1}`, channel)
        ),
      })),
    [t]
  );
  const series = useMemo(
    () => localizedSeries.find((item) => item.id === seriesId),
    [localizedSeries, seriesId]
  );
  const formatDate = (value: string | null) => {
    if (!value) return t("employee.insightSeries.detail.schedule.notScheduled");
    return new Date(value).toLocaleDateString(
      i18n.language === "th" ? "th-TH" : "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  if (!series) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">
            {t("employee.insightSeries.detail.notFound.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("employee.insightSeries.detail.notFound.subtitle", { seriesId })}
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/insight-series">
              {t("employee.insightSeries.detail.actions.backToSeries")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const insightsHref = `/employee/content/insights?series=${series.slug}`;
  const previewHref = `/insight-series/${series.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/insight-series">
              <ArrowLeft className="h-4 w-4" />
              {t("employee.insightSeries.detail.actions.backToSeries")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{series.title}</h1>
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[series.status]}`}
            >
              {t(`employee.insightSeries.status.${series.status}`)}
            </Badge>
            <Badge
              variant="outline"
              className={visibilityStyles[series.visibility]}
            >
              {t(`employee.insightSeries.visibility.${series.visibility}`)}
            </Badge>
            <Badge variant="outline">
              {t(`employee.insightSeries.cadence.${series.cadence}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{series.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={previewHref}>
              <Eye className="h-4 w-4" />
              {t("employee.insightSeries.detail.actions.preview")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={insightsHref}>
              <Eye className="h-4 w-4" />
              {t("employee.insightSeries.detail.actions.viewInsights")}
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href={`/employee/content/insight-series/${series.id}/edit`}>
              <Pencil className="h-4 w-4" />
              {t("employee.insightSeries.actions.edit")}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">
            {t("employee.insightSeries.detail.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="cadence">
            {t("employee.insightSeries.detail.tabs.cadence")}
          </TabsTrigger>
          <TabsTrigger value="seo">
            {t("employee.insightSeries.detail.tabs.seo")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.insightSeries.detail.sections.ownership")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.insightSeries.detail.fields.owner")}
                  </span>
                  <span className="font-medium">{series.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.insightSeries.detail.fields.editor")}
                  </span>
                  <span className="font-medium">{series.editor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.insightSeries.detail.fields.created")}
                  </span>
                  <span className="font-medium">{formatDate(series.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.insightSeries.detail.fields.lastUpdated")}
                  </span>
                  <span className="font-medium">{formatDate(series.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.insightSeries.detail.sections.distribution")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.channels")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {series.distribution.map((channel) => (
                    <Badge key={channel} variant="outline">
                      {channel}
                    </Badge>
                  ))}
                </div>
                <Separator className="my-3" />
                <p className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.focusAreas")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {series.focusAreas.map((area) => (
                    <Badge key={area} variant="outline">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.insightSeries.detail.sections.content")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.insightSeries.detail.fields.insights")}
                  </span>
                  <span className="font-medium">{series.insightCount}</span>
                </div>
                <p className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.featuredInsights")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {series.featuredInsights.map((insight) => (
                    <Badge key={insight} variant="outline">
                      {insight}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cadence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("employee.insightSeries.detail.sections.issueSchedule")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.cadence")}
                </span>
                <span className="font-medium">
                  {t(`employee.insightSeries.cadence.${series.cadence}`)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.lastIssue")}
                </span>
                <span className="font-medium">{formatDate(series.lastIssue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.nextIssue")}
                </span>
                <span className="font-medium">{formatDate(series.nextIssue)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("employee.insightSeries.detail.sections.seoMetadata")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.seoTitle")}
                </p>
                <p className="font-medium">{series.seoTitle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.seoDescription")}
                </p>
                <p className="font-medium">{series.seoDescription}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  {t("employee.insightSeries.detail.fields.seriesSlug")}
                </p>
                <p className="font-medium">{series.slug}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeInsightSeriesDetail;
