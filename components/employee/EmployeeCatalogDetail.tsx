"use client";

/*
[PROPOSED] EmployeeCatalogDetail - scaffolded catalog detail view for content ops.
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

type CatalogStatus = "draft" | "review" | "published" | "archived";
type CatalogVisibility = "internal" | "external";
type CatalogFormat = "pdf" | "ppt" | "doc" | "zip";

type CatalogDetail = {
  id: string;
  title: string;
  status: CatalogStatus;
  visibility: CatalogVisibility;
  format: CatalogFormat;
  category: string;
  slug: string;
  summary: string;
  owner: string;
  manager: string;
  createdAt: string;
  updatedAt: string;
  lastPublished: string | null;
  version: string;
  fileSize: string;
  downloadCount: number;
  regions: string[];
  channels: string[];
  tags: string[];
  relatedSkus: string[];
  seoTitle: string;
  seoDescription: string;
  complianceNotes: string;
};

const CATALOGS: CatalogDetail[] = [
  {
    id: "CATALOG-1201",
    title: "Smart Sensors 2026 product sheet",
    status: "published",
    visibility: "external",
    format: "pdf",
    category: "Sensors",
    slug: "smart-sensors-2026",
    summary: "Flagship sensor lineup for 2026 with tiering, specs, and positioning.",
    owner: "Alicia Park",
    manager: "Dana Hughes",
    createdAt: "2025-10-14",
    updatedAt: "2026-01-12",
    lastPublished: "2026-01-12",
    version: "v3.2",
    fileSize: "2.4 MB",
    downloadCount: 842,
    regions: ["Global", "APAC"],
    channels: ["Catalog", "Sales Enablement", "Partner Portal"],
    tags: ["sensors", "datasheet", "2026"],
    relatedSkus: ["SNS-440", "SNS-530"],
    seoTitle: "Smart Sensors 2026 product sheet",
    seoDescription: "Product sheet with specs, use cases, and ordering info for Smart Sensors.",
    complianceNotes: "Reviewed for external release; pricing table hidden.",
  },
  {
    id: "CATALOG-1202",
    title: "Factory automation starter kit",
    status: "review",
    visibility: "internal",
    format: "ppt",
    category: "Automation",
    slug: "factory-automation-kit",
    summary: "Starter deck to pitch automation bundles for mid-market plants.",
    owner: "Ravi Patel",
    manager: "Priya Nair",
    createdAt: "2025-11-08",
    updatedAt: "2026-01-10",
    lastPublished: null,
    version: "v1.4",
    fileSize: "6.1 MB",
    downloadCount: 212,
    regions: ["North America"],
    channels: ["Sales Enablement", "Partner Portal"],
    tags: ["automation", "deck", "bundle"],
    relatedSkus: ["AUTO-180", "AUTO-220"],
    seoTitle: "Factory automation starter kit",
    seoDescription: "Internal enablement deck for automation starter kits.",
    complianceNotes: "Legal review required before publishing.",
  },
  {
    id: "CATALOG-1203",
    title: "Sustainability retrofit guide",
    status: "draft",
    visibility: "external",
    format: "pdf",
    category: "Sustainability",
    slug: "sustainability-retrofit-guide",
    summary: "Guide to retrofit legacy equipment for energy savings.",
    owner: "Jordan Lee",
    manager: "Alicia Park",
    createdAt: "2025-12-01",
    updatedAt: "2026-01-08",
    lastPublished: null,
    version: "v0.9",
    fileSize: "3.3 MB",
    downloadCount: 0,
    regions: ["Global"],
    channels: ["Catalog"],
    tags: ["sustainability", "retrofit"],
    relatedSkus: ["ECO-110"],
    seoTitle: "Sustainability retrofit guide",
    seoDescription: "Energy-saving retrofit guidance for legacy equipment.",
    complianceNotes: "Pending ESG team review for external release.",
  },
  {
    id: "CATALOG-1204",
    title: "Preventive maintenance checklist",
    status: "archived",
    visibility: "internal",
    format: "doc",
    category: "Maintenance",
    slug: "preventive-maintenance-checklist",
    summary: "Internal checklist for routine maintenance planning.",
    owner: "Priya Nair",
    manager: "Ravi Patel",
    createdAt: "2024-09-18",
    updatedAt: "2025-12-28",
    lastPublished: "2025-03-02",
    version: "v2.0",
    fileSize: "980 KB",
    downloadCount: 96,
    regions: ["Internal"],
    channels: ["Internal Wiki"],
    tags: ["maintenance", "checklist"],
    relatedSkus: ["SERV-42"],
    seoTitle: "Preventive maintenance checklist",
    seoDescription: "Internal checklist for preventive maintenance workflows.",
    complianceNotes: "Archived after 2025 process update.",
  },
];

const statusStyles: Record<CatalogStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const visibilityStyles: Record<CatalogVisibility, string> = {
  internal: "bg-slate-100 text-slate-700 border-slate-200",
  external: "bg-sky-50 text-sky-700 border-sky-200",
};

const visibilityLabels: Record<CatalogVisibility, string> = {
  internal: "Internal",
  external: "External",
};

const formatLabels: Record<CatalogFormat, string> = {
  pdf: "PDF",
  ppt: "PPT",
  doc: "DOC",
  zip: "ZIP",
};

const formatDate = (value: string | null) => {
  if (!value) return "Not published";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const EmployeeCatalogDetail = ({ catalogId }: { catalogId: string }) => {
  const catalog = useMemo(
    () => CATALOGS.find((item) => item.id === catalogId),
    [catalogId]
  );

  if (!catalog) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">Catalog item not found</p>
          <p className="text-xs text-muted-foreground">
            The catalog ID {catalogId} does not match any catalog items in the list.
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/catalogs">Back to catalogs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewHref = `/catalog/${catalog.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/catalogs">
              <ArrowLeft className="h-4 w-4" />
              Back to catalogs
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{catalog.title}</h1>
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[catalog.status]}`}
            >
              {catalog.status}
            </Badge>
            <Badge
              variant="outline"
              className={visibilityStyles[catalog.visibility]}
            >
              {visibilityLabels[catalog.visibility]}
            </Badge>
            <Badge variant="outline">{formatLabels[catalog.format]}</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{catalog.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={previewHref}>
              <Eye className="h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href={`/employee/content/catalogs/${catalog.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Asset details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{catalog.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">{catalog.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">File size</span>
                  <span className="font-medium">{catalog.fileSize}</span>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Slug</p>
                  <p className="font-medium">{catalog.slug}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ownership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium">{catalog.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Manager</span>
                  <span className="font-medium">{catalog.manager}</span>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Compliance notes</p>
                  <p className="text-sm">{catalog.complianceNotes}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDate(catalog.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last updated</span>
                  <span className="font-medium">{formatDate(catalog.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last published</span>
                  <span className="font-medium">{formatDate(catalog.lastPublished)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Downloads</span>
                  <span className="font-medium">{catalog.downloadCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Regions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {catalog.regions.map((region) => (
                  <Badge key={region} variant="outline" className="mr-2">
                    {region}
                  </Badge>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {catalog.channels.map((channel) => (
                  <Badge key={channel} variant="outline" className="mr-2">
                    {channel}
                  </Badge>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Related SKUs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {catalog.relatedSkus.map((sku) => (
                  <Badge key={sku} variant="outline" className="mr-2">
                    {sku}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {catalog.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="mr-2">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">SEO title</p>
                <p className="font-medium">{catalog.seoTitle}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">SEO description</p>
                <p className="text-sm">{catalog.seoDescription}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeCatalogDetail;
