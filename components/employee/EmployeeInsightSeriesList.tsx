"use client";

/*
[PROPOSED] EmployeeInsightSeriesList - scaffolded insight series list view for content ops.
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

type SeriesStatus = "active" | "draft" | "archived";
type SeriesVisibility = "internal" | "external";
type SeriesCadence = "weekly" | "monthly" | "quarterly";

type SeriesRow = {
  id: string;
  title: string;
  status: SeriesStatus;
  visibility: SeriesVisibility;
  cadence: SeriesCadence;
  insightCount: number;
  owner: string;
  updatedAt: string;
  summary: string;
  slug: string;
};

const SERIES: SeriesRow[] = [
  {
    id: "SER-3001",
    title: "Operational Excellence Weekly",
    status: "active",
    visibility: "external",
    cadence: "weekly",
    insightCount: 14,
    owner: "Alicia Park",
    updatedAt: "2026-01-12",
    summary: "Weekly deep dives on plant performance, reliability, and uptime.",
    slug: "operational-excellence-weekly",
  },
  {
    id: "SER-3002",
    title: "Sustainability Scorecard",
    status: "draft",
    visibility: "external",
    cadence: "monthly",
    insightCount: 6,
    owner: "Jordan Lee",
    updatedAt: "2026-01-10",
    summary: "Monthly sustainability benchmarks, audits, and reporting insights.",
    slug: "sustainability-scorecard",
  },
  {
    id: "SER-3003",
    title: "Risk Response Digest",
    status: "active",
    visibility: "internal",
    cadence: "monthly",
    insightCount: 9,
    owner: "Priya Nair",
    updatedAt: "2026-01-08",
    summary: "Incident response tactics, drills, and compliance reminders.",
    slug: "risk-response-digest",
  },
  {
    id: "SER-3004",
    title: "Customer Adoption Playbooks",
    status: "archived",
    visibility: "internal",
    cadence: "quarterly",
    insightCount: 4,
    owner: "Dana Hughes",
    updatedAt: "2025-12-28",
    summary: "Quarterly enablement content for customer success teams.",
    slug: "customer-adoption-playbooks",
  },
];

type SeriesFilters = {
  status: string;
  visibility: string;
  cadence: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: SeriesFilters = {
  status: "all",
  visibility: "all",
  cadence: "all",
  sort: "updated_desc",
  search: "",
};

const statusStyles: Record<SeriesStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const visibilityStyles: Record<SeriesVisibility, string> = {
  internal: "bg-slate-100 text-slate-700 border-slate-200",
  external: "bg-sky-50 text-sky-700 border-sky-200",
};

const EmployeeInsightSeriesList = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<SeriesFilters>(DEFAULT_FILTERS);

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

  const handleChange = useCallback((updates: Partial<SeriesFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: SERIES.length,
      active: 0,
      draft: 0,
      archived: 0,
    };

    SERIES.forEach((series) => {
      if (series.status === "active") counts.active += 1;
      if (series.status === "draft") counts.draft += 1;
      if (series.status === "archived") counts.archived += 1;
    });

    return counts;
  }, []);

  const localizedSeries = useMemo(
    () =>
      SERIES.map((series) => ({
        ...series,
        title: t(`employee.insightSeries.mock.${series.id}.title`, series.title),
        summary: t(`employee.insightSeries.mock.${series.id}.summary`, series.summary),
        owner: t(`employee.insightSeries.mock.${series.id}.owner`, series.owner),
      })),
    [t]
  );

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "select",
        label: t("employee.insightSeries.filters.status.label"),
        options: [
          { label: t("employee.insightSeries.filters.status.all"), value: "all" },
          { label: t("employee.insightSeries.status.active"), value: "active" },
          { label: t("employee.insightSeries.status.draft"), value: "draft" },
          { label: t("employee.insightSeries.status.archived"), value: "archived" },
        ],
        value: filters.status,
        onChange: (value) => handleChange({ status: value as string }),
      },
      {
        type: "select",
        label: t("employee.insightSeries.filters.visibility.label"),
        options: [
          { label: t("employee.insightSeries.filters.visibility.all"), value: "all" },
          { label: t("employee.insightSeries.visibility.external"), value: "external" },
          { label: t("employee.insightSeries.visibility.internal"), value: "internal" },
        ],
        value: filters.visibility,
        onChange: (value) => handleChange({ visibility: value as string }),
      },
      {
        type: "select",
        label: t("employee.insightSeries.filters.cadence.label"),
        options: [
          { label: t("employee.insightSeries.filters.cadence.all"), value: "all" },
          { label: t("employee.insightSeries.cadence.weekly"), value: "weekly" },
          { label: t("employee.insightSeries.cadence.monthly"), value: "monthly" },
          { label: t("employee.insightSeries.cadence.quarterly"), value: "quarterly" },
        ],
        value: filters.cadence,
        onChange: (value) => handleChange({ cadence: value as string }),
      },
      {
        type: "search",
        label: t("employee.insightSeries.filters.search.label"),
        placeholder: t("employee.insightSeries.filters.search.placeholder"),
        value: filters.search,
        onChange: (value) =>
          handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 350,
      },
      {
        type: "sort",
        label: t("employee.insightSeries.filters.sort.label"),
        options: [
          { label: t("employee.insightSeries.filters.sort.updatedDesc"), value: "updated_desc" },
          { label: t("employee.insightSeries.filters.sort.updatedAsc"), value: "updated_asc" },
          { label: t("employee.insightSeries.filters.sort.titleAsc"), value: "title_asc" },
          { label: t("employee.insightSeries.filters.sort.cadence"), value: "cadence" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as string }),
      },
    ],
    [
      filters.cadence,
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

    return localizedSeries.filter((series) => {
      if (filters.status !== "all" && series.status !== filters.status) {
        return false;
      }
      if (
        filters.visibility !== "all" &&
        series.visibility !== filters.visibility
      ) {
        return false;
      }
      if (filters.cadence !== "all" && series.cadence !== filters.cadence) {
        return false;
      }
      if (term) {
        const haystack = `${series.title} ${series.owner} ${series.summary}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [filters.cadence, filters.search, filters.status, filters.visibility, localizedSeries]);

  const sorted = useMemo(() => {
    const next = [...filtered];

    if (filters.sort === "updated_asc") {
      next.sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
    } else if (filters.sort === "title_asc") {
      next.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sort === "cadence") {
      next.sort((a, b) => a.cadence.localeCompare(b.cadence));
    } else {
      next.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    return next;
  }, [filtered, filters.sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            {t("employee.insightSeries.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("employee.insightSeries.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/insight-series/new">
            <Plus className="h-4 w-4" />
            {t("employee.insightSeries.actions.new")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightSeries.stats.total")}
            </p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightSeries.stats.active")}
            </p>
            <p className="text-2xl font-semibold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightSeries.stats.draft")}
            </p>
            <p className="text-2xl font-semibold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightSeries.stats.archived")}
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
                <TableHead>{t("employee.insightSeries.table.series")}</TableHead>
                <TableHead>{t("employee.insightSeries.table.cadence")}</TableHead>
                <TableHead>{t("employee.insightSeries.table.status")}</TableHead>
                <TableHead>{t("employee.insightSeries.table.visibility")}</TableHead>
                <TableHead>{t("employee.insightSeries.table.owner")}</TableHead>
                <TableHead>{t("employee.insightSeries.table.updated")}</TableHead>
                <TableHead className="text-right">
                  {t("employee.insightSeries.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("employee.insightSeries.empty.title")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("employee.insightSeries.empty.subtitle")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((series) => (
                  <TableRow key={series.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/employee/content/insight-series/${series.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {series.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {t("employee.insightSeries.table.meta", {
                            count: series.insightCount,
                            summary: series.summary,
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t(`employee.insightSeries.cadence.${series.cadence}`)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusStyles[series.status]}`}
                      >
                        {t(`employee.insightSeries.status.${series.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={visibilityStyles[series.visibility]}
                      >
                        {t(`employee.insightSeries.visibility.${series.visibility}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{series.owner}</TableCell>
                    <TableCell>{formatDate(series.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insight-series/${series.id}`}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {t("employee.insightSeries.actions.view")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insight-series/${series.id}/edit`}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("employee.insightSeries.actions.edit")}
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
        {t("employee.insightSeries.footer.showing", {
          shown: sorted.length,
          total: SERIES.length,
        })}
      </div>
    </div>
  );
};

export default EmployeeInsightSeriesList;
