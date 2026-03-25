"use client";

/*
[PROPOSED] EmployeeDownloadsList - scaffolded downloads list view for content ops.
[EXISTING] uses FilterPanel, Card, Badge, Button, Table, Separator.
*/

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

type DownloadStatus = "draft" | "review" | "published" | "archived";
type DownloadFormat = "pdf" | "ppt" | "zip" | "image";
type DownloadVisibility = "public" | "partner" | "internal";

type DownloadRow = {
  id: string;
  title: string;
  status: DownloadStatus;
  format: DownloadFormat;
  category: string;
  owner: string;
  updatedAt: string;
  slug: string;
  visibility: DownloadVisibility;
  fileSize: string;
  downloadCount: number;
  downloadLabel: string;
  downloadUrl: string;
};

const DOWNLOAD_ITEMS: DownloadRow[] = [
  {
    id: "DL-3001",
    title: "2026 brand kit (logos + color system)",
    status: "published",
    format: "zip",
    category: "Branding",
    owner: "Alicia Park",
    updatedAt: "2026-01-14",
    slug: "brand-kit-2026",
    visibility: "public",
    fileSize: "124 MB",
    downloadCount: 1240,
    downloadLabel: "Brand kit",
    downloadUrl: "/news/downloads",
  },
  {
    id: "DL-3002",
    title: "Predictive maintenance deck",
    status: "review",
    format: "ppt",
    category: "Product",
    owner: "Ravi Patel",
    updatedAt: "2026-01-11",
    slug: "predictive-maintenance-deck",
    visibility: "partner",
    fileSize: "18.6 MB",
    downloadCount: 312,
    downloadLabel: "Partner deck",
    downloadUrl: "/news/downloads",
  },
  {
    id: "DL-3003",
    title: "Sustainability snapshot report",
    status: "draft",
    format: "pdf",
    category: "Sustainability",
    owner: "Jordan Lee",
    updatedAt: "2026-01-09",
    slug: "sustainability-snapshot",
    visibility: "public",
    fileSize: "6.4 MB",
    downloadCount: 0,
    downloadLabel: "Report",
    downloadUrl: "/news/downloads",
  },
  {
    id: "DL-3004",
    title: "Q1 product photography pack",
    status: "published",
    format: "image",
    category: "Media",
    owner: "Priya Nair",
    updatedAt: "2026-01-06",
    slug: "q1-photo-pack",
    visibility: "public",
    fileSize: "240 MB",
    downloadCount: 980,
    downloadLabel: "Photo pack",
    downloadUrl: "/news/downloads",
  },
  {
    id: "DL-3005",
    title: "Installer onboarding checklist",
    status: "archived",
    format: "pdf",
    category: "Operations",
    owner: "Dana Hughes",
    updatedAt: "2025-12-18",
    slug: "installer-onboarding-checklist",
    visibility: "internal",
    fileSize: "1.1 MB",
    downloadCount: 54,
    downloadLabel: "Checklist",
    downloadUrl: "/news/downloads",
  },
];

type DownloadFilters = {
  status: string;
  format: string;
  visibility: string;
  category: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: DownloadFilters = {
  status: "all",
  format: "all",
  visibility: "all",
  category: "all",
  sort: "updated_desc",
  search: "",
};

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

const categoryKeyMap: Record<string, string> = {
  Branding: "branding",
  Product: "product",
  Sustainability: "sustainability",
  Media: "media",
  Operations: "operations",
};

const EmployeeDownloadsList = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<DownloadFilters>(DEFAULT_FILTERS);

  const handleChange = useCallback((updates: Partial<DownloadFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: DOWNLOAD_ITEMS.length,
      draft: 0,
      review: 0,
      published: 0,
    };

    DOWNLOAD_ITEMS.forEach((item) => {
      if (item.status === "draft") counts.draft += 1;
      if (item.status === "review") counts.review += 1;
      if (item.status === "published") counts.published += 1;
    });

    return counts;
  }, []);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "select",
        label: t("employee.downloads.filters.status.label"),
        options: [
          { label: t("employee.downloads.filters.status.all"), value: "all" },
          { label: t("employee.downloads.status.draft"), value: "draft" },
          { label: t("employee.downloads.status.review"), value: "review" },
          { label: t("employee.downloads.status.published"), value: "published" },
          { label: t("employee.downloads.status.archived"), value: "archived" },
        ],
        value: filters.status,
        onChange: (value) => handleChange({ status: value as string }),
      },
      {
        type: "select",
        label: t("employee.downloads.filters.format.label"),
        options: [
          { label: t("employee.downloads.filters.format.all"), value: "all" },
          { label: t("employee.downloads.format.pdf"), value: "pdf" },
          { label: t("employee.downloads.format.ppt"), value: "ppt" },
          { label: t("employee.downloads.format.zip"), value: "zip" },
          { label: t("employee.downloads.format.image"), value: "image" },
        ],
        value: filters.format,
        onChange: (value) => handleChange({ format: value as string }),
      },
      {
        type: "select",
        label: t("employee.downloads.filters.visibility.label"),
        options: [
          { label: t("employee.downloads.filters.visibility.all"), value: "all" },
          { label: t("employee.downloads.visibility.public"), value: "public" },
          { label: t("employee.downloads.visibility.partner"), value: "partner" },
          { label: t("employee.downloads.visibility.internal"), value: "internal" },
        ],
        value: filters.visibility,
        onChange: (value) => handleChange({ visibility: value as string }),
      },
      {
        type: "select",
        label: t("employee.downloads.filters.category.label"),
        options: [
          { label: t("employee.downloads.filters.category.all"), value: "all" },
          { label: t("employee.downloads.category.branding"), value: "Branding" },
          { label: t("employee.downloads.category.product"), value: "Product" },
          { label: t("employee.downloads.category.sustainability"), value: "Sustainability" },
          { label: t("employee.downloads.category.media"), value: "Media" },
          { label: t("employee.downloads.category.operations"), value: "Operations" },
        ],
        value: filters.category,
        onChange: (value) => handleChange({ category: value as string }),
      },
      {
        type: "search",
        label: t("employee.downloads.filters.search.label"),
        placeholder: t("employee.downloads.filters.search.placeholder"),
        value: filters.search,
        onChange: (value) =>
          handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 350,
      },
      {
        type: "sort",
        label: t("employee.downloads.filters.sort.label"),
        options: [
          { label: t("employee.downloads.filters.sort.updatedDesc"), value: "updated_desc" },
          { label: t("employee.downloads.filters.sort.updatedAsc"), value: "updated_asc" },
          { label: t("employee.downloads.filters.sort.titleAsc"), value: "title_asc" },
          { label: t("employee.downloads.filters.sort.downloadsDesc"), value: "downloads_desc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as string }),
      },
    ],
    [
      filters.category,
      filters.format,
      filters.search,
      filters.sort,
      filters.status,
      filters.visibility,
      handleChange,
      t,
    ]
  );

  const getCategoryLabel = useCallback(
    (category: string) =>
      t(
        `employee.downloads.category.${categoryKeyMap[category] ?? ""}`,
        category
      ),
    [t]
  );

  const getTitle = useCallback(
    (item: DownloadRow) =>
      t(`employee.downloads.mock.${item.id}.title`, item.title),
    [t]
  );

  const getOwner = useCallback(
    (item: DownloadRow) =>
      t(`employee.downloads.mock.${item.id}.owner`, item.owner),
    [t]
  );

  const getDownloadLabel = useCallback(
    (item: DownloadRow) =>
      t(`employee.downloads.mock.${item.id}.label`, item.downloadLabel),
    [t]
  );

  const formatDate = useCallback(
    (value: string) =>
      new Date(value).toLocaleDateString(
        i18n.language === "th" ? "th-TH" : "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      ),
    [i18n.language]
  );

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return DOWNLOAD_ITEMS.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }
      if (filters.format !== "all" && item.format !== filters.format) {
        return false;
      }
      if (filters.visibility !== "all" && item.visibility !== filters.visibility) {
        return false;
      }
      if (filters.category !== "all" && item.category !== filters.category) {
        return false;
      }
      if (term) {
        const haystack =
          `${getTitle(item)} ${getCategoryLabel(item.category)} ${getOwner(item)} ${getDownloadLabel(item)} ${item.slug}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [
    filters.category,
    filters.format,
    filters.search,
    filters.status,
    filters.visibility,
    getCategoryLabel,
    getDownloadLabel,
    getOwner,
    getTitle,
  ]);

  const sorted = useMemo(() => {
    const next = [...filtered];

    if (filters.sort === "updated_asc") {
      next.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    } else if (filters.sort === "title_asc") {
      next.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sort === "downloads_desc") {
      next.sort((a, b) => b.downloadCount - a.downloadCount);
    } else {
      next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return next;
  }, [filtered, filters.sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            {t("employee.downloads.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("employee.downloads.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/downloads/new">
            <Plus className="h-4 w-4" />
            {t("employee.downloads.actions.new")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.downloads.stats.total")}
            </p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.downloads.stats.draft")}
            </p>
            <p className="text-2xl font-semibold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.downloads.stats.review")}
            </p>
            <p className="text-2xl font-semibold">{stats.review}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.downloads.stats.published")}
            </p>
            <p className="text-2xl font-semibold">{stats.published}</p>
          </CardContent>
        </Card>
      </div>

      <FilterPanel
        filters={filterConfigs}
        onReset={handleReset}
        resultCount={sorted.length}
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>{t("employee.downloads.table.asset")}</TableHead>
                <TableHead>{t("employee.downloads.table.category")}</TableHead>
                <TableHead>{t("employee.downloads.table.status")}</TableHead>
                <TableHead>{t("employee.downloads.table.format")}</TableHead>
                <TableHead>{t("employee.downloads.table.owner")}</TableHead>
                <TableHead>{t("employee.downloads.table.updated")}</TableHead>
                <TableHead className="text-right">
                  {t("employee.downloads.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("employee.downloads.empty.title")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("employee.downloads.empty.subtitle")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/employee/content/downloads/${item.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {getTitle(item)}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {t("employee.downloads.table.meta", {
                            slug: item.slug,
                            size: item.fileSize,
                            count: item.downloadCount,
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryLabel(item.category)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={`capitalize ${statusStyles[item.status]}`}
                        >
                          {t(`employee.downloads.status.${item.status}`)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={visibilityStyles[item.visibility]}
                        >
                          {t(`employee.downloads.visibility.${item.visibility}`)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`employee.downloads.format.${item.format}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getOwner(item)}</TableCell>
                    <TableCell>{formatDate(item.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={item.downloadUrl}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            {t("employee.downloads.actions.download")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/downloads/${item.id}/edit`}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("employee.downloads.actions.edit")}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-xs text-muted-foreground">
        {t("employee.downloads.footer.showing", {
          shown: sorted.length,
          total: DOWNLOAD_ITEMS.length,
        })}
      </div>
    </div>
  );
};

export default EmployeeDownloadsList;
