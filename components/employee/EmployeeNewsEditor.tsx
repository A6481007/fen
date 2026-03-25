"use client";

/*
[PROPOSED] EmployeeNewsEditor - scaffolded news create/edit view for content ops.
[EXISTING] uses Badge, Button, Card, Input, Label, Select, Separator, Switch, Tabs, Textarea.
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Eye, Save, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

type NewsStatus = "draft" | "review" | "scheduled" | "published" | "archived";
type NewsType = "press" | "product" | "event" | "update";
type NewsPriority = "standard" | "high";

type NewsDetail = {
  id: string;
  title: string;
  status: NewsStatus;
  type: NewsType;
  summary: string;
  slug: string;
  owner: string;
  reviewer: string;
  region: string;
  priority: NewsPriority;
  updatedAt: string;
  publishAt: string | null;
  heroHeadline: string;
  heroSubhead: string;
  channels: string[];
  segments: string[];
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  usageRights?: string;
  notes?: string;
};

const NEWS_ITEMS: NewsDetail[] = [
  {
    id: "NEWS-2001",
    title: "NCS launches predictive maintenance bundle",
    status: "draft",
    type: "product",
    summary:
      "Bundle announcement focused on reducing downtime with sensor kits and analytics dashboards.",
    slug: "predictive-maintenance-bundle",
    owner: "Alicia Park",
    reviewer: "Dana Hughes",
    region: "Global",
    priority: "high",
    updatedAt: "2026-01-12",
    publishAt: "2026-01-20",
    heroHeadline: "Predict downtime before it starts",
    heroSubhead: "New bundle combines sensors, dashboards, and service plans.",
    channels: ["homepage", "email", "sales"],
    segments: ["manufacturing", "operations"],
    seoTitle: "Predictive maintenance bundle launch",
    seoDescription:
      "Launch announcement for the predictive maintenance bundle with sensors and analytics.",
    keywords: ["predictive", "maintenance", "bundle"],
    ogTitle: "New predictive maintenance bundle",
    ogDescription: "A complete kit to reduce downtime and boost reliability.",
    ogImageAlt: "Technicians monitoring predictive maintenance dashboards",
  },
  {
    id: "NEWS-2002",
    title: "Q1 Operations Summit announced",
    status: "scheduled",
    type: "event",
    summary:
      "Announcing the quarterly virtual summit focused on plant throughput and operational resilience.",
    slug: "q1-operations-summit",
    owner: "Ravi Patel",
    reviewer: "Jordan Lee",
    region: "North America",
    priority: "standard",
    updatedAt: "2026-01-10",
    publishAt: "2026-01-18",
    heroHeadline: "Q1 Operations Summit",
    heroSubhead: "Register for virtual sessions on throughput and reliability.",
    channels: ["events", "email"],
    segments: ["enterprise", "operations"],
    seoTitle: "Q1 Operations Summit announcement",
    seoDescription: "Register for NCSShop's Q1 Operations Summit virtual event.",
    keywords: ["summit", "operations", "event"],
    ogTitle: "Q1 Operations Summit",
    ogDescription: "Virtual sessions for operations leaders and plant managers.",
    ogImageAlt: "Virtual summit stage with speakers",
  },
  {
    id: "NEWS-2003",
    title: "Press release: NCSShop expands logistics network",
    status: "published",
    type: "press",
    summary:
      "Press release covering expanded delivery hubs and improved fulfillment times.",
    slug: "logistics-network-expansion",
    owner: "Jordan Lee",
    reviewer: "Priya Nair",
    region: "Global",
    priority: "high",
    updatedAt: "2026-01-08",
    publishAt: "2026-01-08",
    heroHeadline: "Logistics network expansion",
    heroSubhead: "New hubs reduce delivery time across key regions.",
    channels: ["press", "homepage", "sales"],
    segments: ["logistics", "enterprise"],
    seoTitle: "NCSShop expands logistics network",
    seoDescription: "Press release on new delivery hubs and faster fulfillment.",
    keywords: ["press", "logistics", "expansion"],
    ogTitle: "NCSShop expands logistics network",
    ogDescription: "Faster fulfillment through expanded delivery hubs.",
    ogImageAlt: "Logistics warehouse with delivery trucks",
  },
];

const DEFAULT_NEWS: NewsDetail = {
  id: "NEWS-NEW",
  title: "New headline",
  status: "draft",
  type: "update",
  summary: "Draft a summary to align stakeholders on the announcement.",
  slug: "new-headline",
  owner: "Content Operations",
  reviewer: "",
  region: "Global",
  priority: "standard",
  updatedAt: "2026-01-19",
  publishAt: null,
  heroHeadline: "Headline for hero module",
  heroSubhead: "Optional subhead for the hero section.",
  channels: ["homepage"],
  segments: ["general"],
  seoTitle: "SEO title",
  seoDescription: "SEO description for the news article.",
  keywords: ["news", "update"],
  ogTitle: "Open Graph title",
  ogDescription: "Open Graph description for social sharing.",
  ogImageAlt: "Social share preview image alt text",
  usageRights: "",
  notes: "",
};

const statusStyles: Record<NewsStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const regionKeyMap: Record<string, string> = {
  Global: "global",
  "North America": "northAmerica",
  APAC: "apac",
};

type EmployeeNewsEditorProps = {
  mode: "create" | "edit";
  newsId?: string;
};

const EmployeeNewsEditor = ({ mode, newsId }: EmployeeNewsEditorProps) => {
  const { t, i18n } = useTranslation();
  const isEditing = mode === "edit";

  const getRegionLabel = useCallback(
    (region: string) =>
      t(`employee.news.region.${regionKeyMap[region] ?? ""}`, region),
    [t]
  );

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t("employee.news.notScheduled");
      return new Date(value).toLocaleDateString(
        i18n.language === "th" ? "th-TH" : "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    },
    [i18n.language, t]
  );

  const localizeNews = useCallback(
    (item: NewsDetail) => ({
      ...item,
      title: t(`employee.news.editor.mock.${item.id}.title`, item.title),
      summary: t(`employee.news.editor.mock.${item.id}.summary`, item.summary),
      owner: t(`employee.news.editor.mock.${item.id}.owner`, item.owner),
      reviewer: t(
        `employee.news.editor.mock.${item.id}.reviewer`,
        item.reviewer
      ),
      region: getRegionLabel(item.region),
      heroHeadline: t(
        `employee.news.editor.mock.${item.id}.heroHeadline`,
        item.heroHeadline
      ),
      heroSubhead: t(
        `employee.news.editor.mock.${item.id}.heroSubhead`,
        item.heroSubhead
      ),
      seoTitle: t(
        `employee.news.editor.mock.${item.id}.seoTitle`,
        item.seoTitle
      ),
      seoDescription: t(
        `employee.news.editor.mock.${item.id}.seoDescription`,
        item.seoDescription
      ),
      ogTitle: t(
        `employee.news.editor.mock.${item.id}.ogTitle`,
        item.ogTitle
      ),
      ogDescription: t(
        `employee.news.editor.mock.${item.id}.ogDescription`,
        item.ogDescription
      ),
      ogImageAlt: t(
        `employee.news.editor.mock.${item.id}.ogImageAlt`,
        item.ogImageAlt
      ),
      usageRights: t(
        `employee.news.editor.mock.${item.id}.usageRights`,
        item.usageRights ?? ""
      ),
      notes: t(
        `employee.news.editor.mock.${item.id}.notes`,
        item.notes ?? ""
      ),
    }),
    [getRegionLabel, t]
  );

  const news = useMemo(() => {
    if (!isEditing) return localizeNews(DEFAULT_NEWS);
    const found = NEWS_ITEMS.find((item) => item.id === newsId);
    return found ? localizeNews(found) : null;
  }, [isEditing, newsId, localizeNews]);

  const [ogAlt, setOgAlt] = useState(news?.ogImageAlt ?? "");
  useEffect(() => {
    setOgAlt(news?.ogImageAlt ?? "");
  }, [news]);
  const ogAltLength = ogAlt.length;
  const ogAltTooLong = ogAltLength > 125;

  if (!news) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">
            {t("employee.news.editor.notFound.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("employee.news.editor.notFound.subtitle", { newsId })}
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/news">
              {t("employee.news.editor.actions.backToNews")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewHref = `/news/${news.slug}`;
  const fieldPrefix = isEditing ? news.id.toLowerCase() : "news-new";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/news">
              <ArrowLeft className="h-4 w-4" />
              {t("employee.news.editor.actions.backToNews")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">
              {isEditing
                ? t("employee.news.editor.title.edit")
                : t("employee.news.editor.title.create")}
            </h1>
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[news.status]}`}
            >
              {t(`employee.news.status.${news.status}`)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {t(`employee.news.type.${news.type}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{news.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <Button asChild variant="outline" className="gap-2">
              <Link href={previewHref}>
                <Eye className="h-4 w-4" />
                {t("employee.news.editor.actions.preview")}
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            {t("employee.news.editor.actions.saveDraft")}
          </Button>
          <Button variant="outline" className="gap-2">
            <Send className="h-4 w-4" />
            {t("employee.news.editor.actions.requestReview")}
          </Button>
          <Button className="gap-2">
            <Send className="h-4 w-4" />
            {t("employee.news.editor.actions.publish")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="content">
            {t("employee.news.editor.tabs.content")}
          </TabsTrigger>
          <TabsTrigger value="distribution">
            {t("employee.news.editor.tabs.distribution")}
          </TabsTrigger>
          <TabsTrigger value="seo">{t("employee.news.editor.tabs.seo")}</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.news.editor.sections.storyDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-title`}>
                    {t("employee.news.editor.fields.headline")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-title`}
                    defaultValue={news.title}
                    placeholder={t("employee.news.editor.placeholders.headline")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-summary`}>
                    {t("employee.news.editor.fields.summary")}
                  </Label>
                  <Textarea
                    id={`${fieldPrefix}-summary`}
                    defaultValue={news.summary}
                    placeholder={t("employee.news.editor.placeholders.summary")}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-slug`}>
                    {t("employee.news.editor.fields.slug")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-slug`}
                    defaultValue={news.slug}
                    placeholder={t("employee.news.editor.placeholders.slug")}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-hero-headline`}>
                    {t("employee.news.editor.fields.heroHeadline")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-hero-headline`}
                    defaultValue={news.heroHeadline}
                    placeholder={t(
                      "employee.news.editor.placeholders.heroHeadline"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-hero-subhead`}>
                    {t("employee.news.editor.fields.heroSubhead")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-hero-subhead`}
                    defaultValue={news.heroSubhead}
                    placeholder={t(
                      "employee.news.editor.placeholders.heroSubhead"
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("employee.news.editor.sections.publishing")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("employee.news.editor.fields.status")}</Label>
                  <Select defaultValue={news.status}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "employee.news.editor.placeholders.selectStatus"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        {t("employee.news.status.draft")}
                      </SelectItem>
                      <SelectItem value="review">
                        {t("employee.news.status.review")}
                      </SelectItem>
                      <SelectItem value="scheduled">
                        {t("employee.news.status.scheduled")}
                      </SelectItem>
                      <SelectItem value="published">
                        {t("employee.news.status.published")}
                      </SelectItem>
                      <SelectItem value="archived">
                        {t("employee.news.status.archived")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("employee.news.editor.fields.type")}</Label>
                  <Select defaultValue={news.type}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "employee.news.editor.placeholders.selectType"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="press">
                        {t("employee.news.type.press")}
                      </SelectItem>
                      <SelectItem value="product">
                        {t("employee.news.type.product")}
                      </SelectItem>
                      <SelectItem value="event">
                        {t("employee.news.type.event")}
                      </SelectItem>
                      <SelectItem value="update">
                        {t("employee.news.type.update")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("employee.news.editor.fields.priority")}</Label>
                  <Select defaultValue={news.priority}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "employee.news.editor.placeholders.selectPriority"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        {t("employee.news.editor.priority.standard")}
                      </SelectItem>
                      <SelectItem value="high">
                        {t("employee.news.editor.priority.high")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-publish-date`}>
                    {t("employee.news.editor.fields.publishDate")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-publish-date`}
                    type="date"
                    defaultValue={news.publishAt ?? ""}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.news.editor.features.homepage.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.news.editor.features.homepage.subtitle")}
                    </p>
                  </div>
                  <Switch defaultChecked={news.channels.includes("homepage")} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.news.editor.features.email.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.news.editor.features.email.subtitle")}
                    </p>
                  </div>
                  <Switch defaultChecked={news.channels.includes("email")} />
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.news.editor.fields.updated")}
                    </span>
                    <span className="font-medium">{formatDate(news.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.news.editor.fields.scheduled")}
                    </span>
                    <span className="font-medium">{formatDate(news.publishAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("employee.news.editor.sections.ownership")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`${fieldPrefix}-owner`}>
                  {t("employee.news.editor.fields.owner")}
                </Label>
                <Input
                  id={`${fieldPrefix}-owner`}
                  defaultValue={news.owner}
                  placeholder={t("employee.news.editor.placeholders.owner")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldPrefix}-reviewer`}>
                  {t("employee.news.editor.fields.reviewer")}
                </Label>
                <Input
                  id={`${fieldPrefix}-reviewer`}
                  defaultValue={news.reviewer}
                  placeholder={t("employee.news.editor.placeholders.reviewer")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldPrefix}-region`}>
                  {t("employee.news.editor.fields.region")}
                </Label>
                <Input
                  id={`${fieldPrefix}-region`}
                  defaultValue={news.region}
                  placeholder={t("employee.news.editor.placeholders.region")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.news.editor.sections.channelMix")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.news.editor.channels.homepage.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.news.editor.channels.homepage.subtitle")}
                    </p>
                  </div>
                  <Switch defaultChecked={news.channels.includes("homepage")} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.news.editor.channels.email.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.news.editor.channels.email.subtitle")}
                    </p>
                  </div>
                  <Switch defaultChecked={news.channels.includes("email")} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.news.editor.channels.sales.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.news.editor.channels.sales.subtitle")}
                    </p>
                  </div>
                  <Switch defaultChecked={news.channels.includes("sales")} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.news.editor.channels.press.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.news.editor.channels.press.subtitle")}
                    </p>
                  </div>
                  <Switch defaultChecked={news.channels.includes("press")} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.news.editor.sections.audienceTargeting")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-segments`}>
                    {t("employee.news.editor.fields.segments")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-segments`}
                    defaultValue={news.segments.join(", ")}
                    placeholder={t("employee.news.editor.placeholders.segments")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-region-target`}>
                    {t("employee.news.editor.fields.regionalFocus")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-region-target`}
                    defaultValue={news.region}
                    placeholder={t("employee.news.editor.placeholders.region")}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("employee.news.editor.fields.currentChannels")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {news.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="capitalize">
                        {t(`employee.news.channels.${channel}`)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.news.editor.sections.searchMetadata")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-seo-title`}>
                    {t("employee.news.editor.fields.seoTitle")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-seo-title`}
                    defaultValue={news.seoTitle}
                    placeholder={t("employee.news.editor.placeholders.seoTitle")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-seo-description`}>
                    {t("employee.news.editor.fields.seoDescription")}
                  </Label>
                  <Textarea
                    id={`${fieldPrefix}-seo-description`}
                    defaultValue={news.seoDescription}
                    placeholder={t(
                      "employee.news.editor.placeholders.seoDescription"
                    )}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-keywords`}>
                    {t("employee.news.editor.fields.keywords")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-keywords`}
                    defaultValue={news.keywords.join(", ")}
                    placeholder={t("employee.news.editor.placeholders.keywords")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("employee.news.editor.sections.socialPreview")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-og-title`}>
                    {t("employee.news.editor.fields.ogTitle")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-og-title`}
                    defaultValue={news.ogTitle}
                    placeholder={t("employee.news.editor.placeholders.ogTitle")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-og-description`}>
                    {t("employee.news.editor.fields.ogDescription")}
                  </Label>
                  <Textarea
                    id={`${fieldPrefix}-og-description`}
                    defaultValue={news.ogDescription}
                    placeholder={t(
                      "employee.news.editor.placeholders.ogDescription"
                    )}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-og-alt`}>
                    {t("employee.news.editor.fields.ogImageAlt")}
                  </Label>
                  <div className="space-y-1">
                    <Input
                      id={`${fieldPrefix}-og-alt`}
                      value={ogAlt}
                      onChange={(event) => setOgAlt(event.target.value)}
                      placeholder={t(
                        "employee.news.editor.placeholders.ogImageAlt"
                      )}
                    />
                    <div className="flex justify-end text-[11px] font-medium text-slate-400">
                      <span className={ogAltTooLong ? "text-amber-500" : "text-slate-400"}>
                        {ogAltLength} / 125 chars
                      </span>
                    </div>
                    <p className={`text-[11px] transition-opacity duration-150 ${ogAltTooLong ? "text-amber-500" : "opacity-0"}`}>
                      Screen readers recommend alt text under 125 characters
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeNewsEditor;
