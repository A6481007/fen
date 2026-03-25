"use client";

/*
[PROPOSED] EmployeeInsightCategoriesList - scaffolded insight category list view for content ops.
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

type CategoryStatus = "active" | "draft" | "archived";
type CategoryVisibility = "internal" | "external";

type CategoryRow = {
  id: string;
  name: string;
  status: CategoryStatus;
  visibility: CategoryVisibility;
  insightCount: number;
  owner: string;
  updatedAt: string;
  description: string;
  slug: string;
};

const CATEGORIES: CategoryRow[] = [
  {
    id: "CAT-2001",
    name: "Manufacturing",
    status: "active",
    visibility: "external",
    insightCount: 12,
    owner: "Alicia Park",
    updatedAt: "2026-01-12",
    description: "Operational playbooks for plant leaders and engineers.",
    slug: "manufacturing",
  },
  {
    id: "CAT-2002",
    name: "Operations",
    status: "active",
    visibility: "external",
    insightCount: 9,
    owner: "Ravi Patel",
    updatedAt: "2026-01-10",
    description: "Shift-level execution, throughput, and daily management.",
    slug: "operations",
  },
  {
    id: "CAT-2003",
    name: "Sustainability",
    status: "draft",
    visibility: "external",
    insightCount: 4,
    owner: "Jordan Lee",
    updatedAt: "2026-01-08",
    description: "Energy efficiency, emissions reporting, and ESG enablement.",
    slug: "sustainability",
  },
  {
    id: "CAT-2004",
    name: "Risk",
    status: "archived",
    visibility: "internal",
    insightCount: 2,
    owner: "Priya Nair",
    updatedAt: "2025-12-28",
    description: "Incident response checklists and control frameworks.",
    slug: "risk",
  },
  {
    id: "CAT-2005",
    name: "Customer Success",
    status: "draft",
    visibility: "internal",
    insightCount: 6,
    owner: "Dana Hughes",
    updatedAt: "2025-12-22",
    description: "Voice-of-customer stories and adoption guidance.",
    slug: "customer-success",
  },
];

type CategoryFilters = {
  status: string;
  visibility: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: CategoryFilters = {
  status: "all",
  visibility: "all",
  sort: "updated_desc",
  search: "",
};

const statusStyles: Record<CategoryStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const visibilityStyles: Record<CategoryVisibility, string> = {
  internal: "bg-slate-100 text-slate-700 border-slate-200",
  external: "bg-sky-50 text-sky-700 border-sky-200",
};

const EmployeeInsightCategoriesList = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<CategoryFilters>(DEFAULT_FILTERS);

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

  const handleChange = useCallback((updates: Partial<CategoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: CATEGORIES.length,
      active: 0,
      draft: 0,
      archived: 0,
    };

    CATEGORIES.forEach((category) => {
      if (category.status === "active") counts.active += 1;
      if (category.status === "draft") counts.draft += 1;
      if (category.status === "archived") counts.archived += 1;
    });

    return counts;
  }, []);

  const localizedCategories = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        name: t(`employee.insightCategories.mock.${category.id}.name`, category.name),
        description: t(
          `employee.insightCategories.mock.${category.id}.description`,
          category.description
        ),
        owner: t(`employee.insightCategories.mock.${category.id}.owner`, category.owner),
      })),
    [t]
  );

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "select",
        label: t("employee.insightCategories.filters.status.label"),
        options: [
          { label: t("employee.insightCategories.filters.status.all"), value: "all" },
          { label: t("employee.insightCategories.status.active"), value: "active" },
          { label: t("employee.insightCategories.status.draft"), value: "draft" },
          { label: t("employee.insightCategories.status.archived"), value: "archived" },
        ],
        value: filters.status,
        onChange: (value) => handleChange({ status: value as string }),
      },
      {
        type: "select",
        label: t("employee.insightCategories.filters.visibility.label"),
        options: [
          { label: t("employee.insightCategories.filters.visibility.all"), value: "all" },
          { label: t("employee.insightCategories.visibility.external"), value: "external" },
          { label: t("employee.insightCategories.visibility.internal"), value: "internal" },
        ],
        value: filters.visibility,
        onChange: (value) => handleChange({ visibility: value as string }),
      },
      {
        type: "search",
        label: t("employee.insightCategories.filters.search.label"),
        placeholder: t("employee.insightCategories.filters.search.placeholder"),
        value: filters.search,
        onChange: (value) =>
          handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 350,
      },
      {
        type: "sort",
        label: t("employee.insightCategories.filters.sort.label"),
        options: [
          { label: t("employee.insightCategories.filters.sort.updatedDesc"), value: "updated_desc" },
          { label: t("employee.insightCategories.filters.sort.updatedAsc"), value: "updated_asc" },
          { label: t("employee.insightCategories.filters.sort.nameAsc"), value: "name_asc" },
          { label: t("employee.insightCategories.filters.sort.insightsDesc"), value: "insights_desc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as string }),
      },
    ],
    [filters.search, filters.sort, filters.status, filters.visibility, handleChange, t]
  );

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return localizedCategories.filter((category) => {
      if (filters.status !== "all" && category.status !== filters.status) {
        return false;
      }
      if (
        filters.visibility !== "all" &&
        category.visibility !== filters.visibility
      ) {
        return false;
      }
      if (term) {
        const haystack = `${category.name} ${category.description} ${category.owner}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [filters.search, filters.status, filters.visibility, localizedCategories]);

  const sorted = useMemo(() => {
    const next = [...filtered];

    if (filters.sort === "updated_asc") {
      next.sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
    } else if (filters.sort === "name_asc") {
      next.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sort === "insights_desc") {
      next.sort((a, b) => b.insightCount - a.insightCount);
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
            {t("employee.insightCategories.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("employee.insightCategories.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/insight-categories/new">
            <Plus className="h-4 w-4" />
            {t("employee.insightCategories.actions.new")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightCategories.stats.total")}
            </p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightCategories.stats.active")}
            </p>
            <p className="text-2xl font-semibold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightCategories.stats.draft")}
            </p>
            <p className="text-2xl font-semibold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.insightCategories.stats.archived")}
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
                <TableHead>{t("employee.insightCategories.table.category")}</TableHead>
                <TableHead>{t("employee.insightCategories.table.status")}</TableHead>
                <TableHead>{t("employee.insightCategories.table.visibility")}</TableHead>
                <TableHead>{t("employee.insightCategories.table.insights")}</TableHead>
                <TableHead>{t("employee.insightCategories.table.owner")}</TableHead>
                <TableHead>{t("employee.insightCategories.table.updated")}</TableHead>
                <TableHead className="text-right">
                  {t("employee.insightCategories.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("employee.insightCategories.empty.title")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("employee.insightCategories.empty.subtitle")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((category) => (
                  <TableRow key={category.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/employee/content/insight-categories/${category.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {category.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusStyles[category.status]}`}
                      >
                        {t(`employee.insightCategories.status.${category.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={visibilityStyles[category.visibility]}
                      >
                        {t(`employee.insightCategories.visibility.${category.visibility}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{category.insightCount}</TableCell>
                    <TableCell>{category.owner}</TableCell>
                    <TableCell>{formatDate(category.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insight-categories/${category.id}`}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {t("employee.insightCategories.actions.view")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insight-categories/${category.id}/edit`}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("employee.insightCategories.actions.edit")}
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
        {t("employee.insightCategories.footer.showing", {
          shown: sorted.length,
          total: CATEGORIES.length,
        })}
      </div>
    </div>
  );
};

export default EmployeeInsightCategoriesList;
