"use client";

/*
[PROPOSED] EmployeeDownloadDetail - scaffolded download detail view for content ops.
[EXISTING] uses Button, Card, Badge, Tabs, Separator.
*/

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

type DownloadStatus = "draft" | "review" | "published" | "archived";
type DownloadVisibility = "public" | "partner" | "internal";
type DownloadFormat = "pdf" | "ppt" | "zip" | "image";

type DownloadDetail = {
  id: string;
  title: string;
  status: DownloadStatus;
  visibility: DownloadVisibility;
  format: DownloadFormat;
  category: string;
  slug: string;
  summary: string;
  owner: string;
  manager: string;
  createdAt: string;
  updatedAt: string;
  lastPublished: string | null;
  fileSize: string;
  downloadCount: number;
  downloadLabel: string;
  downloadUrl: string;
  regions: string[];
  channels: string[];
  audiences: string[];
  tags: string[];
  usageRights: string;
  notes: string;
};

const DOWNLOADS: DownloadDetail[] = [
  {
    id: "DL-3001",
    title: "2026 brand kit (logos + color system)",
    status: "published",
    visibility: "public",
    format: "zip",
    category: "Branding",
    slug: "brand-kit-2026",
    summary: "Primary brand assets for press, partners, and sales enablement teams.",
    owner: "Alicia Park",
    manager: "Dana Hughes",
    createdAt: "2025-10-14",
    updatedAt: "2026-01-14",
    lastPublished: "2026-01-14",
    fileSize: "124 MB",
    downloadCount: 1240,
    downloadLabel: "Brand kit",
    downloadUrl: "/news/downloads",
    regions: ["Global", "APAC"],
    channels: ["Press", "Partner Portal"],
    audiences: ["Press", "Channel Partners"],
    tags: ["logos", "brand", "color"],
    usageRights: "Approved for external use with standard attribution.",
    notes: "Ensure the 2026 wordmark is used on all press releases.",
  },
  {
    id: "DL-3002",
    title: "Predictive maintenance deck",
    status: "review",
    visibility: "partner",
    format: "ppt",
    category: "Product",
    slug: "predictive-maintenance-deck",
    summary: "Partner-facing deck for predictive maintenance bundles and pricing tiers.",
    owner: "Ravi Patel",
    manager: "Priya Nair",
    createdAt: "2025-11-08",
    updatedAt: "2026-01-11",
    lastPublished: null,
    fileSize: "18.6 MB",
    downloadCount: 312,
    downloadLabel: "Partner deck",
    downloadUrl: "/news/downloads",
    regions: ["North America"],
    channels: ["Partner Portal", "Sales Enablement"],
    audiences: ["Channel Partners"],
    tags: ["deck", "pricing", "maintenance"],
    usageRights: "Partner-only distribution. Do not share externally.",
    notes: "Awaiting legal review for updated pricing slide.",
  },
  {
    id: "DL-3003",
    title: "Sustainability snapshot report",
    status: "draft",
    visibility: "public",
    format: "pdf",
    category: "Sustainability",
    slug: "sustainability-snapshot",
    summary: "Quarterly impact summary for sustainability initiatives and KPIs.",
    owner: "Jordan Lee",
    manager: "Alicia Park",
    createdAt: "2025-12-01",
    updatedAt: "2026-01-09",
    lastPublished: null,
    fileSize: "6.4 MB",
    downloadCount: 0,
    downloadLabel: "Report",
    downloadUrl: "/news/downloads",
    regions: ["Global"],
    channels: ["Website", "Press"],
    audiences: ["Press", "Investors"],
    tags: ["sustainability", "impact", "ESG"],
    usageRights: "Draft only. Review with ESG team before publishing.",
    notes: "Add 2025 Q4 benchmark chart before launch.",
  },
  {
    id: "DL-3004",
    title: "Q1 product photography pack",
    status: "published",
    visibility: "public",
    format: "image",
    category: "Media",
    slug: "q1-photo-pack",
    summary: "High-resolution product imagery for newsroom and partner use.",
    owner: "Priya Nair",
    manager: "Dana Hughes",
    createdAt: "2025-09-18",
    updatedAt: "2026-01-06",
    lastPublished: "2026-01-06",
    fileSize: "240 MB",
    downloadCount: 980,
    downloadLabel: "Photo pack",
    downloadUrl: "/news/downloads",
    regions: ["Global"],
    channels: ["Press", "Marketing"],
    audiences: ["Press", "Marketing"],
    tags: ["photo", "product", "media"],
    usageRights: "Approved for press and marketing campaigns.",
    notes: "Replace hero shot after Q2 launch.",
  },
  {
    id: "DL-3005",
    title: "Installer onboarding checklist",
    status: "archived",
    visibility: "internal",
    format: "pdf",
    category: "Operations",
    slug: "installer-onboarding-checklist",
    summary: "Internal checklist used by field teams during onboarding.",
    owner: "Dana Hughes",
    manager: "Ravi Patel",
    createdAt: "2024-09-18",
    updatedAt: "2025-12-18",
    lastPublished: "2025-05-02",
    fileSize: "1.1 MB",
    downloadCount: 54,
    downloadLabel: "Checklist",
    downloadUrl: "/news/downloads",
    regions: ["Internal"],
    channels: ["Internal Wiki"],
    audiences: ["Field Ops"],
    tags: ["onboarding", "checklist"],
    usageRights: "Internal-only. Archived after 2025 process update.",
    notes: "Use the 2026 onboarding toolkit instead.",
  },
];

const statusStyles: Record<DownloadStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const visibilityStyles: Record<DownloadVisibility, string> = {
  public: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partner: "bg-sky-50 text-sky-700 border-sky-200",
  internal: "bg-slate-100 text-slate-700 border-slate-200",
};

const EmployeeDownloadDetail = ({ downloadId }: { downloadId: string }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const formatDate = (value: string | null) => {
    if (!value) return t("employee.downloads.detail.values.notPublished");
    return new Date(value).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const visibilityLabel = (value: DownloadVisibility) =>
    t(`employee.downloads.visibility.${value}`, value);
  const formatLabel = (value: DownloadFormat) =>
    t(`employee.downloads.format.${value}`, value.toUpperCase());
  const statusLabel = (value: DownloadStatus) =>
    t(`employee.downloads.status.${value}`, value);
  const categoryLabel = (value: string) =>
    t(`employee.downloads.category.${value.toLowerCase()}`, value);

  const download = useMemo(
    () => DOWNLOADS.find((item) => item.id === downloadId),
    [downloadId]
  );

  if (!download) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">{t("employee.downloads.detail.notFound.title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("employee.downloads.detail.notFound.description", { id: downloadId })}
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/downloads">{t("employee.downloads.detail.backToDownloads")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const downloadHref = download.downloadUrl || "/news/downloads";

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="gap-2 w-fit">
        <Link href="/employee/content/downloads">
          <ArrowLeft className="h-4 w-4" />
          {t("employee.downloads.detail.backToDownloads")}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{download.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[download.status]}`}
            >
              {statusLabel(download.status)}
            </Badge>
            <Badge
              variant="outline"
              className={visibilityStyles[download.visibility]}
            >
              {visibilityLabel(download.visibility)}
            </Badge>
            <Badge variant="outline">{formatLabel(download.format)}</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{download.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={downloadHref}>
              <Download className="h-4 w-4" />
              {t("employee.downloads.actions.download")}
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href={`/employee/content/downloads/${download.id}/edit`}>
              <Pencil className="h-4 w-4" />
              {t("employee.downloads.actions.edit")}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">{t("employee.downloads.detail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="distribution">{t("employee.downloads.detail.tabs.distribution")}</TabsTrigger>
          <TabsTrigger value="metadata">{t("employee.downloads.detail.tabs.metadata")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.downloads.detail.sections.assetDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.category")}</span>
                  <span className="font-medium">{categoryLabel(download.category)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.format")}</span>
                  <span className="font-medium">{formatLabel(download.format)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.fileSize")}</span>
                  <span className="font-medium">{download.fileSize}</span>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("employee.downloads.detail.fields.slug")}</p>
                  <p className="font-medium">{download.slug}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("employee.downloads.detail.sections.ownership")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.owner")}</span>
                  <span className="font-medium">{download.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.manager")}</span>
                  <span className="font-medium">{download.manager}</span>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("employee.downloads.detail.fields.usageRights")}</p>
                  <p className="text-sm">{download.usageRights}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("employee.downloads.detail.sections.timeline")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.created")}</span>
                  <span className="font-medium">{formatDate(download.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.lastUpdated")}</span>
                  <span className="font-medium">{formatDate(download.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.lastPublished")}</span>
                  <span className="font-medium">{formatDate(download.lastPublished)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.downloads.detail.fields.downloads")}</span>
                  <span className="font-medium">{download.downloadCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.downloads.detail.sections.regions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {download.regions.map((region) => (
                  <Badge key={region} variant="outline" className="mr-2">
                    {region}
                  </Badge>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.downloads.detail.sections.channels")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {download.channels.map((channel) => (
                  <Badge key={channel} variant="outline" className="mr-2">
                    {channel}
                  </Badge>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.downloads.detail.sections.audiences")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {download.audiences.map((audience) => (
                  <Badge key={audience} variant="outline" className="mr-2">
                    {audience}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("employee.downloads.detail.sections.tags")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {download.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="mr-2">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("employee.downloads.detail.sections.downloadMetadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t("employee.downloads.detail.fields.downloadLabel")}</p>
                <p className="font-medium">{download.downloadLabel}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">{t("employee.downloads.detail.fields.downloadUrl")}</p>
                <p className="text-sm break-all">{download.downloadUrl}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">{t("employee.downloads.detail.fields.notes")}</p>
                <p className="text-sm">{download.notes}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDownloadDetail;
