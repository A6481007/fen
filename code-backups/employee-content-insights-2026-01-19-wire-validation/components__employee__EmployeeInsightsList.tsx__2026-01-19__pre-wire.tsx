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

type InsightStatus = "draft" | "review" | "published" | "archived";
type InsightType = "knowledge" | "solution";

type InsightRow = {
  id: string;
  title: string;
  type: InsightType;
  status: InsightStatus;
  category: string;
  author: string;
  updatedAt: string;
  readingTime: string;
};

const INSIGHTS: InsightRow[] = [
  {
    id: "INS-1001",
    title: "Reducing downtime with predictive maintenance",
    type: "knowledge",
    status: "draft",
    category: "Manufacturing",
    author: "Alicia Park",
    updatedAt: "2026-01-12",
    readingTime: "6 min",
  },
  {
    id: "INS-1002",
    title: "Optimizing plant throughput with IoT visibility",
    type: "solution",
    status: "review",
    category: "Operations",
    author: "Ravi Patel",
    updatedAt: "2026-01-10",
    readingTime: "8 min",
  },
  {
    id: "INS-1003",
    title: "Energy savings playbook for regional factories",
    type: "knowledge",
    status: "published",
    category: "Sustainability",
    author: "Jordan Lee",
    updatedAt: "2026-01-08",
    readingTime: "5 min",
  },
  {
    id: "INS-1004",
    title: "Incident response automation checklist",
    type: "solution",
    status: "archived",
    category: "Risk",
    author: "Priya Nair",
    updatedAt: "2025-12-28",
    readingTime: "7 min",
  },
];

type InsightFilters = {
  status: string;
  type: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: InsightFilters = {
  status: "all",
  type: "all",
  sort: "updated_desc",
  search: "",
};

const statusStyles: Record<InsightStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const typeLabels: Record<InsightType, string> = {
  knowledge: "Knowledge",
  solution: "Solution",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const EmployeeInsightsList = () => {
  const [filters, setFilters] = useState<InsightFilters>(DEFAULT_FILTERS);

  const handleChange = useCallback((updates: Partial<InsightFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: INSIGHTS.length,
      draft: 0,
      review: 0,
      published: 0,
    };

    INSIGHTS.forEach((insight) => {
      if (insight.status === "draft") counts.draft += 1;
      if (insight.status === "review") counts.review += 1;
      if (insight.status === "published") counts.published += 1;
    });

    return counts;
  }, []);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "select",
        label: "Status",
        options: [
          { label: "All statuses", value: "all" },
          { label: "Draft", value: "draft" },
          { label: "In review", value: "review" },
          { label: "Published", value: "published" },
          { label: "Archived", value: "archived" },
        ],
        value: filters.status,
        onChange: (value) => handleChange({ status: value as string }),
      },
      {
        type: "select",
        label: "Type",
        options: [
          { label: "All types", value: "all" },
          { label: "Knowledge", value: "knowledge" },
          { label: "Solution", value: "solution" },
        ],
        value: filters.type,
        onChange: (value) => handleChange({ type: value as string }),
      },
      {
        type: "search",
        label: "Search insights",
        placeholder: "Search titles, categories, or authors",
        value: filters.search,
        onChange: (value) =>
          handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 350,
      },
      {
        type: "sort",
        label: "Sort",
        options: [
          { label: "Updated (newest)", value: "updated_desc" },
          { label: "Updated (oldest)", value: "updated_asc" },
          { label: "Title (A-Z)", value: "title_asc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as string }),
      },
    ],
    [filters.search, filters.sort, filters.status, filters.type, handleChange]
  );

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return INSIGHTS.filter((insight) => {
      if (filters.status !== "all" && insight.status !== filters.status) {
        return false;
      }
      if (filters.type !== "all" && insight.type !== filters.type) {
        return false;
      }
      if (term) {
        const haystack = `${insight.title} ${insight.category} ${insight.author}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [filters.search, filters.status, filters.type]);

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
          <h1 className="text-3xl font-bold">Insights</h1>
          <p className="text-muted-foreground">
            Curate knowledge and solution content for the Insight Hub.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/insights/new">
            <Plus className="h-4 w-4" />
            New insight
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total insights</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Drafts</p>
            <p className="text-2xl font-semibold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">In review</p>
            <p className="text-2xl font-semibold">{stats.review}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Published</p>
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
                <TableHead>Insight</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">No insights found</p>
                      <p className="text-xs text-muted-foreground">
                        Adjust filters or create a new insight draft.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((insight) => (
                  <TableRow key={insight.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/employee/content/insights/${insight.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {insight.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {insight.category} · {insight.readingTime}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {typeLabels[insight.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusStyles[insight.status]}`}
                      >
                        {insight.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{insight.author}</TableCell>
                    <TableCell>{formatDate(insight.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insights/${insight.id}`}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/insights/${insight.id}/edit`}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
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
        Showing {sorted.length} of {INSIGHTS.length} insights.
      </div>
    </div>
  );
};

export default EmployeeInsightsList;
