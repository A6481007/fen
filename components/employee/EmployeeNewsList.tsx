"use client";

/*
[PROPOSED] EmployeeNewsList - scaffolded news list view for employee content ops.
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

type NewsStatus = "draft" | "review" | "scheduled" | "published" | "archived";
type NewsType = "press" | "product" | "event" | "update";

type NewsRow = {
  id: string;
  title: string;
  type: NewsType;
  status: NewsStatus;
  owner: string;
  updatedAt: string;
  publishAt: string | null;
  slug: string;
  region: string;
};

const NEWS_ITEMS: NewsRow[] = [
  {
    id: "NEWS-2001",
    title: "NCS launches predictive maintenance bundle",
    type: "product",
    status: "draft",
    owner: "Alicia Park",
    updatedAt: "2026-01-12",
    publishAt: "2026-01-20",
    slug: "predictive-maintenance-bundle",
    region: "Global",
  },
  {
    id: "NEWS-2002",
    title: "Q1 Operations Summit announced",
    type: "event",
    status: "scheduled",
    owner: "Ravi Patel",
    updatedAt: "2026-01-10",
    publishAt: "2026-01-18",
    slug: "q1-operations-summit",
    region: "North America",
  },
  {
    id: "NEWS-2003",
    title: "Press release: NCSShop expands logistics network",
    type: "press",
    status: "published",
    owner: "Jordan Lee",
    updatedAt: "2026-01-08",
    publishAt: "2026-01-08",
    slug: "logistics-network-expansion",
    region: "Global",
  },
  {
    id: "NEWS-2004",
    title: "Platform update: Insight Hub personalization",
    type: "update",
    status: "review",
    owner: "Priya Nair",
    updatedAt: "2026-01-06",
    publishAt: null,
    slug: "insight-hub-personalization",
    region: "APAC",
  },
  {
    id: "NEWS-2005",
    title: "Archived: 2025 Sustainability recap",
    type: "press",
    status: "archived",
    owner: "Dana Hughes",
    updatedAt: "2025-12-20",
    publishAt: "2025-12-20",
    slug: "sustainability-recap-2025",
    region: "Global",
  },
];

type NewsFilters = {
  status: string;
  type: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: NewsFilters = {
  status: "all",
  type: "all",
  sort: "updated_desc",
  search: "",
};

const statusStyles: Record<NewsStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const typeLabels: Record<NewsType, string> = {
  press: "Press",
  product: "Product",
  event: "Event",
  update: "Update",
};

const formatDate = (value: string | null) => {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const EmployeeNewsList = () => {
  const [filters, setFilters] = useState<NewsFilters>(DEFAULT_FILTERS);

  const handleChange = useCallback((updates: Partial<NewsFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: NEWS_ITEMS.length,
      draft: 0,
      scheduled: 0,
      published: 0,
    };

    NEWS_ITEMS.forEach((item) => {
      if (item.status === "draft") counts.draft += 1;
      if (item.status === "scheduled") counts.scheduled += 1;
      if (item.status === "published") counts.published += 1;
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
          { label: "Scheduled", value: "scheduled" },
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
          { label: "Press", value: "press" },
          { label: "Product", value: "product" },
          { label: "Event", value: "event" },
          { label: "Update", value: "update" },
        ],
        value: filters.type,
        onChange: (value) => handleChange({ type: value as string }),
      },
      {
        type: "search",
        label: "Search news",
        placeholder: "Search headlines, owners, or regions",
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
          { label: "Publish date", value: "published_desc" },
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

    return NEWS_ITEMS.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }
      if (filters.type !== "all" && item.type !== filters.type) {
        return false;
      }
      if (term) {
        const haystack = `${item.title} ${item.owner} ${item.slug} ${item.region}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [filters.search, filters.status, filters.type]);

  const sorted = useMemo(() => {
    const next = [...filtered];

    if (filters.sort === "updated_asc") {
      next.sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
    } else if (filters.sort === "title_asc") {
      next.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sort === "published_desc") {
      next.sort((a, b) => {
        const aValue = a.publishAt ? new Date(a.publishAt).getTime() : 0;
        const bValue = b.publishAt ? new Date(b.publishAt).getTime() : 0;
        return bValue - aValue;
      });
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
          <h1 className="text-3xl font-bold">News</h1>
          <p className="text-muted-foreground">
            Coordinate news releases, press updates, and internal announcements.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/news/new">
            <Plus className="h-4 w-4" />
            New news
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total stories</p>
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
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-semibold">{stats.scheduled}</p>
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
                <TableHead>Headline</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">No news found</p>
                      <p className="text-xs text-muted-foreground">
                        Adjust filters or create a new news draft.
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
                          href={`/employee/content/news/${item.id}/edit`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {item.region} - {item.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {typeLabels[item.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusStyles[item.status]}`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell>{formatDate(item.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/news/${item.slug}`}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/news/${item.id}/edit`}
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
        Showing {sorted.length} of {NEWS_ITEMS.length} news entries.
      </div>
    </div>
  );
};

export default EmployeeNewsList;
