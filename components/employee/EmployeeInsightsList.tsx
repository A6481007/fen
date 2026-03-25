"use client";

/*
[PROPOSED] EmployeeInsightsList - scaffolded insights list view for employee content ops.
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
import {
  INSIGHT_STATUS_OPTIONS,
  INSIGHT_TYPE_OPTIONS,
  getInsightTypeLabel,
} from "@/lib/insightForm";
import { useTranslation } from "react-i18next";

type InsightListItem = {
  _id: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  insightType?: string | null;
  status?: string | null;
  readingTime?: number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author?: { name?: string | null } | null;
  primaryCategory?: { _id?: string | null; title?: string | null } | null;
  categories?: Array<{ _id?: string | null; title?: string | null }> | null;
};

type InsightCategoryOption = {
  _id: string;
  title?: string | null;
};

type InsightFilters = {
  status: string;
  type: string;
  category: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: InsightFilters = {
  status: "all",
  type: "all",
  category: "all",
  sort: "updated_desc",
  search: "",
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const EmployeeInsightsList = ({
  insights,
  categories,
}: {
  insights: InsightListItem[];
  categories: InsightCategoryOption[];
}) => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<InsightFilters>(DEFAULT_FILTERS);

  const formatDate = useCallback(
    (value?: string | null) => {
      if (!value) return t("employee.insights.date.notSet");
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return t("employee.insights.date.notSet");
      return parsed.toLocaleDateString(
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

  const handleChange = useCallback((updates: Partial<InsightFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: insights.length,
      draft: 0,
      published: 0,
      archived: 0,
    };

    insights.forEach((insight) => {
      if (insight.status === "draft") counts.draft += 1;
      if (insight.status === "published") counts.published += 1;
      if (insight.status === "archived") counts.archived += 1;
    });

    return counts;
  }, [insights]);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "select",
        label: t("employee.insights.filters.status.label"),
        options: [
          { label: t("employee.insights.filters.status.all"), value: "all" },
          ...INSIGHT_STATUS_OPTIONS.map((option) => ({
            label: t(`employee.insights.status.${option.value}`, option.label),
            value: option.value,
          })),
        ],
        value: filters.status,
        onChange: (value) => handleChange({ status: value as string }),
      },
      {
        type: "select",
        label: t("employee.insights.filters.type.label"),
        options: [
          { label: t("employee.insights.filters.type.all"), value: "all" },
          ...INSIGHT_TYPE_OPTIONS.map((option) => ({
            label: t(`employee.insights.type.${option.value}`, option.label),
            value: option.value,
          })),
        ],
        value: filters.type,
        onChange: (value) => handleChange({ type: value as string }),
      },
      {
        type: "select",
        label: t("employee.insights.filters.category.label"),
        options: [
          { label: t("employee.insights.filters.category.all"), value: "all" },
          ...categories.map((category) => ({
            label: category.title || t("employee.insights.placeholders.untitled"),
            value: category._id,
          })),
        ],
        value: filters.category,
        onChange: (value) => handleChange({ category: value as string }),
      },
      {
        type: "search",
        label: t("employee.insights.filters.search.label"),
        placeholder: t("employee.insights.filters.search.placeholder"),
        value: filters.search,
        onChange: (value) =>
          handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 350,
      },
      {
        type: "sort",
        label: t("employee.insights.filters.sort.label"),
        options: [
          { label: t("employee.insights.filters.sort.updatedDesc"), value: "updated_desc" },
          { label: t("employee.insights.filters.sort.updatedAsc"), value: "updated_asc" },
          { label: t("employee.insights.filters.sort.titleAsc"), value: "title_asc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as string }),
      },
    ],
    [
      categories,
      filters.category,
      filters.search,
      filters.sort,
      filters.status,
      filters.type,
      handleChange,
      t,
    ]
  );

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return insights.filter((insight) => {
      if (filters.status !== "all" && insight.status !== filters.status) {
        return false;
      }
      if (filters.type !== "all" && insight.insightType !== filters.type) {
        return false;
      }
      if (filters.category !== "all") {
        const matchesPrimary = insight.primaryCategory?._id === filters.category;
        const matchesSecondary =
          insight.categories?.some((category) => category?._id === filters.category) ?? false;
        if (!matchesPrimary && !matchesSecondary) {
          return false;
        }
      }
      if (term) {
        const authorName = insight.author?.name || "";
        const primaryCategory = insight.primaryCategory?.title || "";
        const secondaryCategories =
          insight.categories?.map((category) => category?.title).join(" ") || "";
        const haystack = `${insight.title || ""} ${primaryCategory} ${secondaryCategories} ${authorName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [filters.category, filters.search, filters.status, filters.type, insights]);

  const sorted = useMemo(() => {
    const next = [...filtered];

    if (filters.sort === "updated_asc") {
      next.sort(
        (a, b) =>
          new Date(a.updatedAt || a.publishedAt || 0).getTime() -
          new Date(b.updatedAt || b.publishedAt || 0).getTime()
      );
    } else if (filters.sort === "title_asc") {
      next.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else {
      next.sort(
        (a, b) =>
          new Date(b.updatedAt || b.publishedAt || 0).getTime() -
          new Date(a.updatedAt || a.publishedAt || 0).getTime()
      );
    }

    return next;
  }, [filtered, filters.sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{t("employee.insights.title")}</h1>
          <p className="text-muted-foreground">
            {t("employee.insights.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/insights/new">
            <Plus className="h-4 w-4" />
            {t("employee.insights.actions.new")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insights.stats.total")}
            </p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insights.stats.draft")}
            </p>
            <p className="text-2xl font-semibold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insights.stats.published")}
            </p>
            <p className="text-2xl font-semibold">{stats.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insights.stats.archived")}
            </p>
            <p className="text-2xl font-semibold">{stats.archived}</p>
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
                <TableHead>{t("employee.insights.table.insight")}</TableHead>
                <TableHead>{t("employee.insights.table.type")}</TableHead>
                <TableHead>{t("employee.insights.table.status")}</TableHead>
                <TableHead>{t("employee.insights.table.author")}</TableHead>
                <TableHead>{t("employee.insights.table.updated")}</TableHead>
                <TableHead className="text-right">
                  {t("employee.insights.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("employee.insights.empty.title")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("employee.insights.empty.subtitle")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((insight) => (
                  <TableRow key={insight._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/employee/content/insights/${insight._id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {insight.title || t("employee.insights.placeholders.untitledInsight")}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {(insight.primaryCategory?.title ||
                            insight.categories?.[0]?.title ||
                            t("employee.insights.placeholders.uncategorized")) + " · "}
                          {insight.readingTime
                            ? t("employee.insights.table.readingTime", {
                                minutes: insight.readingTime,
                              })
                            : t("employee.insights.table.noReadingTime")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {t(
                          `employee.insights.type.${insight.insightType ?? "unclassified"}`,
                          getInsightTypeLabel(insight.insightType)
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusStyles[insight.status || "draft"]}`}
                      >
                        {t(`employee.insights.status.${insight.status || "draft"}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {insight.author?.name || t("employee.insights.placeholders.unassigned")}
                    </TableCell>
                    <TableCell>{formatDate(insight.updatedAt || insight.publishedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insights/${insight._id}`}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {t("employee.insights.actions.view")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insights/${insight._id}/edit`}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("employee.insights.actions.edit")}
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
        {t("employee.insights.footer.showing", {
          shown: sorted.length,
          total: insights.length,
        })}
      </div>
    </div>
  );
};

export default EmployeeInsightsList;
