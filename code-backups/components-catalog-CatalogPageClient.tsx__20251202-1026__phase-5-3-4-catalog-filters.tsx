"use client";

import CatalogGrid from "@/components/catalog/CatalogGrid";
import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogItem } from "@/sanity/queries/catalog";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SortOption = { value: string; label: string };

type FilterState = {
  category: string;
  fileType: string;
  tags: string[];
  search: string;
  sort: string;
  page: number;
};

type CatalogPageClientProps = {
  items: CatalogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  filters: { categories: string[]; fileTypes: string[]; tags: string[] };
  initialFilters: FilterState;
  sortOptions: SortOption[];
  errorMessage?: string | null;
};

const buildPageList = (totalPages: number, currentPage: number) => {
  if (totalPages <= 1) return [1];

  const pages: Array<number | "ellipsis"> = [];

  const addPage = (page: number) => {
    if (!pages.includes(page)) {
      pages.push(page);
    }
  };

  addPage(1);

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    addPage(page);
  }

  if (end < totalPages - 1) {
    pages.push("ellipsis");
  }

  if (totalPages > 1) {
    addPage(totalPages);
  }

  return pages;
};

const CatalogPageClient = ({
  items,
  totalCount,
  totalPages,
  currentPage,
  limit,
  filters,
  initialFilters,
  sortOptions,
  errorMessage,
}: CatalogPageClientProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search || "");

  useEffect(() => {
    setLocalFilters(initialFilters);
    setSearchInput(initialFilters.search || "");
  }, [initialFilters]);

  const pageForPagination =
    isPending && localFilters.page ? localFilters.page : currentPage;

  const applyParams = (updates: Partial<FilterState> & { reset?: boolean }) => {
    const defaultSort = sortOptions[0]?.value || "date_desc";
    const nextState: FilterState = {
      ...localFilters,
      ...updates,
      category: updates.reset ? "" : updates.category ?? localFilters.category ?? "",
      fileType: updates.reset ? "" : updates.fileType ?? localFilters.fileType ?? "",
      tags: updates.reset ? [] : updates.tags ?? localFilters.tags ?? [],
      search: updates.reset ? "" : updates.search ?? localFilters.search ?? "",
      sort: updates.reset
        ? defaultSort
        : updates.sort ?? localFilters.sort ?? defaultSort,
      page: updates.reset
        ? 1
        : updates.page ?? localFilters.page ?? 1,
    };

    setLocalFilters(nextState);
    if (updates.reset) {
      setSearchInput("");
    } else if (typeof updates.search === "string") {
      setSearchInput(updates.search);
    }

    const params = new URLSearchParams(searchParams?.toString() || "");

    if (nextState.category) params.set("category", nextState.category);
    else params.delete("category");

    if (nextState.fileType) params.set("fileType", nextState.fileType);
    else params.delete("fileType");

    if (nextState.tags?.length) params.set("tags", nextState.tags.join(","));
    else params.delete("tags");

    if (nextState.search) params.set("search", nextState.search);
    else params.delete("search");

    if (nextState.sort) params.set("sort", nextState.sort);

    if (nextState.page > 1) params.set("page", String(nextState.page));
    else params.delete("page");

    const queryString = params.toString();
    const href = queryString ? `/catalog?${queryString}` : "/catalog";

    startTransition(() => {
      router.push(href);
    });
  };

  const activeFilters =
    (localFilters.category ? 1 : 0) +
    (localFilters.fileType ? 1 : 0) +
    (localFilters.tags?.length || 0) +
    (localFilters.search ? 1 : 0);

  const sortedTags = useMemo(
    () => [...(filters.tags || [])].sort((a, b) => a.localeCompare(b)),
    [filters.tags]
  );

  const filterConfigs: FilterConfig[] = [
    {
      type: "radio",
      label: "Categories",
      options: [
        { label: "All categories", value: "all" },
        ...filters.categories.map((category) => ({ label: category, value: category })),
      ],
      value: localFilters.category || "all",
      onChange: (value) =>
        applyParams({ category: value === "all" ? "" : (value as string), page: 1 }),
      disabled: isPending,
    },
    {
      type: "radio",
      label: "File types",
      options: [
        { label: "All file types", value: "all" },
        ...filters.fileTypes.map((fileType) => ({ label: fileType, value: fileType })),
      ],
      value: localFilters.fileType || "all",
      onChange: (value) =>
        applyParams({ fileType: value === "all" ? "" : (value as string), page: 1 }),
      disabled: isPending,
    },
    {
      type: "checkbox",
      label: "Tags",
      options: sortedTags.map((tag) => ({ label: tag, value: tag })),
      value: localFilters.tags || [],
      onChange: (value) => applyParams({ tags: (value as string[]) || [], page: 1 }),
      disabled: isPending,
    },
  ];

  const pages = useMemo(
    () => buildPageList(totalPages, pageForPagination || 1),
    [totalPages, pageForPagination]
  );

  const resultLabel = useMemo(() => {
    if (totalCount === 0) return "No results yet";
    const start = (currentPage - 1) * limit + 1;
    const end = Math.min(start + items.length - 1, totalCount);
    return `Showing ${start}-${end} of ${totalCount} assets`;
  }, [currentPage, limit, items.length, totalCount]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <FilterPanel
        filters={filterConfigs}
        onReset={() => applyParams({ reset: true })}
        resultCount={totalCount}
        layout="sidebar"
        isLoading={isPending}
      />

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-shop_dark_green" />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  applyParams({ search: searchInput.trim(), page: 1 });
                }}
                className="flex w-full items-center gap-2"
              >
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search titles or descriptions..."
                  className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="gap-2 bg-shop_dark_green text-white hover:bg-shop_dark_green/90"
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </form>
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <SlidersHorizontal className="h-4 w-4 text-shop_dark_green" />
                <Select
                  value={localFilters.sort || "date_desc"}
                  onValueChange={(value) => applyParams({ sort: value, page: 1 })}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-48 border-none bg-transparent shadow-none focus:ring-0">
                    <SelectValue placeholder="Sort results" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeFilters > 0 && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  {activeFilters} filters
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-800">{resultLabel}</span>
            {localFilters.category && (
              <Badge variant="outline" className="border-dashed text-slate-700">
                Category: {localFilters.category}
              </Badge>
            )}
            {localFilters.fileType && (
              <Badge variant="outline" className="border-dashed text-slate-700">
                File: {localFilters.fileType}
              </Badge>
            )}
            {localFilters.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="border-dashed text-slate-700">
                Tag: {tag}
              </Badge>
            ))}
            {localFilters.search && (
              <Badge variant="outline" className="border-dashed text-slate-700">
                Search: {localFilters.search}
              </Badge>
            )}
          </div>
        </div>

        <CatalogGrid
          items={items}
          isLoading={isPending}
          errorMessage={errorMessage || null}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-sm text-slate-600">
              Page {pageForPagination} of {totalPages}
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (pageForPagination > 1) {
                        applyParams({ page: pageForPagination - 1 });
                      }
                    }}
                    aria-disabled={pageForPagination <= 1}
                    tabIndex={pageForPagination <= 1 ? -1 : 0}
                    className={pageForPagination <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {pages.map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === pageForPagination}
                        onClick={(event) => {
                          event.preventDefault();
                          applyParams({ page });
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (pageForPagination < totalPages) {
                        applyParams({ page: pageForPagination + 1 });
                      }
                    }}
                    aria-disabled={pageForPagination >= totalPages}
                    tabIndex={pageForPagination >= totalPages ? -1 : 0}
                    className={pageForPagination >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPageClient;
