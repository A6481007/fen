"use client";

/*
[PROPOSED] EmployeeCatalogsList - scaffolded catalog list view for content ops.
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
import { Eye, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

type CatalogStatus = "draft" | "review" | "published" | "archived";
type CatalogFormat = "pdf" | "ppt" | "doc" | "zip";
type CatalogVisibility = "internal" | "external";

type CatalogRow = {
  id: string;
  title: string;
  status: CatalogStatus;
  format: CatalogFormat;
  category: string;
  owner: string;
  updatedAt: string;
  slug: string;
  visibility: CatalogVisibility;
  version: string;
};

const CATALOG_ITEMS: CatalogRow[] = [
  {
    id: "CATALOG-1201",
    title: "Smart Sensors 2026 product sheet",
    status: "published",
    format: "pdf",
    category: "Sensors",
    owner: "Alicia Park",
    updatedAt: "2026-01-12",
    slug: "smart-sensors-2026",
    visibility: "external",
    version: "v3.2",
  },
  {
    id: "CATALOG-1202",
    title: "Factory automation starter kit",
    status: "review",
    format: "ppt",
    category: "Automation",
    owner: "Ravi Patel",
    updatedAt: "2026-01-10",
    slug: "factory-automation-kit",
    visibility: "internal",
    version: "v1.4",
  },
  {
    id: "CATALOG-1203",
    title: "Sustainability retrofit guide",
    status: "draft",
    format: "pdf",
    category: "Sustainability",
    owner: "Jordan Lee",
    updatedAt: "2026-01-08",
    slug: "sustainability-retrofit-guide",
    visibility: "external",
    version: "v0.9",
  },
  {
    id: "CATALOG-1204",
    title: "Preventive maintenance checklist",
    status: "archived",
    format: "doc",
    category: "Maintenance",
    owner: "Priya Nair",
    updatedAt: "2025-12-28",
    slug: "preventive-maintenance-checklist",
    visibility: "internal",
    version: "v2.0",
  },
];

type CatalogFilters = {
  status: string;
  format: string;
  visibility: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: CatalogFilters = {
  status: "all",
  format: "all",
  visibility: "all",
  sort: "updated_desc",
  search: "",
};

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

const EmployeeCatalogsList = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);

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

  const handleChange = useCallback((updates: Partial<CatalogFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: CATALOG_ITEMS.length,
      draft: 0,
      review: 0,
      published: 0,
    };

    CATALOG_ITEMS.forEach((item) => {
      if (item.status === "draft") counts.draft += 1;
      if (item.status === "review") counts.review += 1;
      if (item.status === "published") counts.published += 1;
    });

    return counts;
  }, []);

  const localizedItems = useMemo(
    () =>
      CATALOG_ITEMS.map((item) => ({
        ...item,
        title: t(`employee.catalogs.mock.${item.id}.title`, item.title),
        category: t(`employee.catalogs.mock.${item.id}.category`, item.category),
        owner: t(`employee.catalogs.mock.${item.id}.owner`, item.owner),
      })),
    [t]
  );

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "select",
        label: t("employee.catalogs.filters.status.label"),
        options: [
          { label: t("employee.catalogs.filters.status.all"), value: "all" },
          { label: t("employee.catalogs.status.draft"), value: "draft" },
          { label: t("employee.catalogs.status.review"), value: "review" },
          { label: t("employee.catalogs.status.published"), value: "published" },
          { label: t("employee.catalogs.status.archived"), value: "archived" },
        ],
        value: filters.status,
        onChange: (value) => handleChange({ status: value as string }),
      },
      {
        type: "select",
        label: t("employee.catalogs.filters.format.label"),
        options: [
          { label: t("employee.catalogs.filters.format.all"), value: "all" },
          { label: t("employee.catalogs.format.pdf"), value: "pdf" },
          { label: t("employee.catalogs.format.ppt"), value: "ppt" },
          { label: t("employee.catalogs.format.doc"), value: "doc" },
          { label: t("employee.catalogs.format.zip"), value: "zip" },
        ],
        value: filters.format,
        onChange: (value) => handleChange({ format: value as string }),
      },
      {
        type: "select",
        label: t("employee.catalogs.filters.visibility.label"),
        options: [
          { label: t("employee.catalogs.filters.visibility.all"), value: "all" },
          { label: t("employee.catalogs.visibility.external"), value: "external" },
          { label: t("employee.catalogs.visibility.internal"), value: "internal" },
        ],
        value: filters.visibility,
        onChange: (value) => handleChange({ visibility: value as string }),
      },
      {
        type: "search",
        label: t("employee.catalogs.filters.search.label"),
        placeholder: t("employee.catalogs.filters.search.placeholder"),
        value: filters.search,
        onChange: (value) =>
          handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 350,
      },
      {
        type: "sort",
        label: t("employee.catalogs.filters.sort.label"),
        options: [
          {
            label: t("employee.catalogs.filters.sort.updatedDesc"),
            value: "updated_desc",
          },
          {
            label: t("employee.catalogs.filters.sort.updatedAsc"),
            value: "updated_asc",
          },
          { label: t("employee.catalogs.filters.sort.titleAsc"), value: "title_asc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as string }),
      },
    ],
    [
      filters.format,
      filters.search,
      filters.sort,
      filters.status,
      filters.visibility,
      handleChange,
      t,
    ]
  );

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return localizedItems.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }
      if (filters.format !== "all" && item.format !== filters.format) {
        return false;
      }
      if (filters.visibility !== "all" && item.visibility !== filters.visibility) {
        return false;
      }
      if (term) {
        const haystack = `${item.title} ${item.category} ${item.owner} ${item.slug}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [filters.format, filters.search, filters.status, filters.visibility, localizedItems]);

  const sorted = useMemo(() => {
    const next = [...filtered];

    if (filters.sort === "updated_asc") {
      next.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    } else if (filters.sort === "title_asc") {
      next.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return next;
  }, [filtered, filters.sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{t("employee.catalogs.title")}</h1>
          <p className="text-muted-foreground">
            {t("employee.catalogs.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/catalogs/new">
            <Plus className="h-4 w-4" />
            {t("employee.catalogs.actions.new")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.catalogs.stats.total")}
            </p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.catalogs.stats.drafts")}
            </p>
            <p className="text-2xl font-semibold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.catalogs.stats.review")}
            </p>
            <p className="text-2xl font-semibold">{stats.review}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.catalogs.stats.published")}
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
                <TableHead>{t("employee.catalogs.table.asset")}</TableHead>
                <TableHead>{t("employee.catalogs.table.category")}</TableHead>
                <TableHead>{t("employee.catalogs.table.status")}</TableHead>
                <TableHead>{t("employee.catalogs.table.format")}</TableHead>
                <TableHead>{t("employee.catalogs.table.owner")}</TableHead>
                <TableHead>{t("employee.catalogs.table.updated")}</TableHead>
                <TableHead className="text-right">
                  {t("employee.catalogs.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("employee.catalogs.empty.title")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("employee.catalogs.empty.subtitle")}
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
                          href={`/employee/content/catalogs/${item.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {t("employee.catalogs.table.meta", {
                            slug: item.slug,
                            version: item.version,
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={`capitalize ${statusStyles[item.status]}`}
                        >
                          {t(`employee.catalogs.status.${item.status}`)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={visibilityStyles[item.visibility]}
                        >
                          {t(`employee.catalogs.visibility.${item.visibility}`)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`employee.catalogs.format.${item.format}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell>{formatDate(item.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/catalog/${item.slug}`}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {t("employee.catalogs.actions.preview")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/catalogs/${item.id}/edit`}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("employee.catalogs.actions.edit")}
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
        {t("employee.catalogs.footer.showing", {
          shown: sorted.length,
          total: CATALOG_ITEMS.length,
        })}
      </div>
    </div>
  );
};

export default EmployeeCatalogsList;
