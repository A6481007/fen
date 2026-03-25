"use client";

import CatalogGrid from "@/components/catalog/CatalogGrid";
import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { CatalogItem } from "@/sanity/queries/catalog";
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

  useEffect(() => {
    setLocalFilters(initialFilters);
  }, [initialFilters]);

  const pageForPagination =
    isPending && localFilters.page ? localFilters.page : currentPage;

  const applyParams = (updates: Partial<FilterState> & { reset?: boolean }) => {
    const defaultSort = sortOptions[0]?.value || "date_desc";
    const normalizedSearch =
      typeof updates.search === "string" ? updates.search.trim() : updates.search;

    const nextState: FilterState = {
      ...localFilters,
      ...updates,
      category: updates.reset ? "" : updates.category ?? localFilters.category ?? "",
      fileType: updates.reset ? "" : updates.fileType ?? localFilters.fileType ?? "",
      tags: updates.reset ? [] : updates.tags ?? localFilters.tags ?? [],
      search: updates.reset ? "" : normalizedSearch ?? localFilters.search ?? "",
      sort: updates.reset
        ? defaultSort
        : updates.sort ?? localFilters.sort ?? defaultSort,
      page: updates.reset
        ? 1
        : updates.page ?? localFilters.page ?? 1,
    };

    setLocalFilters(nextState);

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

  const activeSortLabel = useMemo(() => {
    const fallbackLabel = sortOptions[0]?.label || "Newest";
    const activeSort = localFilters.sort || sortOptions[0]?.value || "date_desc";
    return sortOptions.find((option) => option.value === activeSort)?.label || fallbackLabel;
  }, [localFilters.sort, sortOptions]);

  const filterConfigs: FilterConfig[] = [
    {
      type: "search",
      label: "Search catalog",
      placeholder: "Search titles or descriptions...",
      value: localFilters.search ?? "",
      onChange: (value) =>
        applyParams({
          search: typeof value === "string" ? value : "",
          page: 1,
        }),
      debounceMs: 350,
      disabled: isPending,
    },
    {
      type: "sort",
      label: "Sort by",
      options: sortOptions,
      value: localFilters.sort || sortOptions[0]?.value || "date_desc",
      onChange: (value) => applyParams({ sort: value as string, page: 1 }),
      disabled: isPending,
    },
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-800">{resultLabel}</span>
            <Badge variant="outline" className="border-dashed text-slate-700">
              Sorted by {activeSortLabel}
            </Badge>
            {activeFilters > 0 && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {activeFilters} active
              </Badge>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
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
