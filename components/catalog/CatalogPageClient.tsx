"use client";

import CatalogGrid from "@/components/catalog/CatalogGrid";
import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import { Badge } from "@/components/ui/badge";
import LoadingState from "@/components/shared/LoadingState";
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
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

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

const SKELETON_DELAY_MS = 220;

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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() || "";
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);
  const [isNavigating, setIsNavigating] = useState(false);
  const [shouldShowSkeletons, setShouldShowSkeletons] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isBusy = isNavigating || isPending;

  const localizedSortOptions = useMemo(
    () =>
      sortOptions.map((option) => ({
        ...option,
        label: t(option.label, { defaultValue: option.label }),
      })),
    [i18n.language, sortOptions, t]
  );

  useEffect(() => {
    setLocalFilters(initialFilters);
    setIsNavigating(false);
    setShouldShowSkeletons(false);
  }, [initialFilters]);

  useEffect(() => {
    let timer: number | undefined;

    if (isNavigating) {
      // Avoid flashing skeletons for fast updates; fall back to spinner instead.
      timer = window.setTimeout(() => setShouldShowSkeletons(true), SKELETON_DELAY_MS);
    } else {
      setShouldShowSkeletons(false);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isNavigating]);

  const pageForPagination = isBusy && localFilters.page ? localFilters.page : currentPage;
  const shouldShowGridLoading = isBusy && shouldShowSkeletons;

  useEffect(() => {
    // When the URL/search params update (navigation finished), drop loading states.
    setIsNavigating(false);
    setShouldShowSkeletons(false);
  }, [searchKey]);

  const areFiltersEqual = useCallback((a: FilterState, b: FilterState) => {
    if (a === b) return true;
    return (
      a.category === b.category &&
      a.fileType === b.fileType &&
      a.search === b.search &&
      a.sort === b.sort &&
      a.page === b.page &&
      (a.tags?.join("|") || "") === (b.tags?.join("|") || "")
    );
  }, []);

  const applyParams = useCallback(
    (updates: Partial<FilterState> & { reset?: boolean }) => {
      const defaultSort = sortOptions[0]?.value || "date_desc";
      const normalizedSearch =
        typeof updates.search === "string" ? updates.search.trim() : updates.search;

      setLocalFilters((previous) => {
        const nextState: FilterState = {
          ...previous,
          ...updates,
          category: updates.reset ? "" : updates.category ?? previous.category ?? "",
          fileType: updates.reset ? "" : updates.fileType ?? previous.fileType ?? "",
          tags: updates.reset ? [] : updates.tags ?? previous.tags ?? [],
          search: updates.reset ? "" : normalizedSearch ?? previous.search ?? "",
          sort: updates.reset ? defaultSort : updates.sort ?? previous.sort ?? defaultSort,
          page: updates.reset ? 1 : updates.page ?? previous.page ?? 1,
        };

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

        const currentQuery = searchParams?.toString() || "";
        const currentHref = currentQuery ? `/catalog?${currentQuery}` : "/catalog";

        if (href === currentHref && areFiltersEqual(previous, nextState)) {
          setIsNavigating(false);
          return previous;
        }

        setIsNavigating(true);
        startTransition(() => router.push(href, { scroll: false }));
        return nextState;
      });
    },
    [areFiltersEqual, router, searchParams, sortOptions, startTransition]
  );

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
    const fallbackLabel = localizedSortOptions[0]?.label || t("client.catalog.sort.date_desc");
    const activeSort = localFilters.sort || sortOptions[0]?.value || "date_desc";
    return (
      localizedSortOptions.find((option) => option.value === activeSort)?.label ||
      fallbackLabel
    );
  }, [localizedSortOptions, localFilters.sort, sortOptions, t]);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "search",
        label: t("client.catalog.filters.search.label"),
        placeholder: t("client.catalog.filters.search.placeholder"),
        value: localFilters.search ?? "",
        onChange: (value) =>
          applyParams({
            search: typeof value === "string" ? value : "",
            page: 1,
          }),
        debounceMs: 350,
        disabled: isBusy,
      },
      {
        type: "sort",
        label: t("client.catalog.filters.sort.label"),
        options: localizedSortOptions,
        value: localFilters.sort || sortOptions[0]?.value || "date_desc",
        onChange: (value) => applyParams({ sort: value as string, page: 1 }),
        disabled: isBusy,
      },
      {
        type: "radio",
        label: t("client.catalog.filters.categories.label"),
        options: [
          { label: t("client.catalog.filters.categories.all"), value: "all" },
          ...filters.categories.map((category) => ({ label: category, value: category })),
        ],
        value: localFilters.category || "all",
        onChange: (value) =>
          applyParams({ category: value === "all" ? "" : (value as string), page: 1 }),
        disabled: isBusy,
      },
      {
        type: "radio",
        label: t("client.catalog.filters.fileTypes.label"),
        options: [
          { label: t("client.catalog.filters.fileTypes.all"), value: "all" },
          ...filters.fileTypes.map((fileType) => ({ label: fileType, value: fileType })),
        ],
        value: localFilters.fileType || "all",
        onChange: (value) =>
          applyParams({ fileType: value === "all" ? "" : (value as string), page: 1 }),
        disabled: isBusy,
      },
      {
        type: "checkbox",
        label: t("client.catalog.filters.tags.label"),
        options: sortedTags.map((tag) => ({ label: tag, value: tag })),
        value: localFilters.tags || [],
        onChange: (value) => applyParams({ tags: (value as string[]) || [], page: 1 }),
        disabled: isBusy,
      },
    ],
    [
      applyParams,
      filters.categories,
      filters.fileTypes,
      isBusy,
      localFilters.category,
      localFilters.fileType,
      localFilters.search,
      localFilters.sort,
      localFilters.tags,
      localizedSortOptions,
      sortOptions,
      sortedTags,
      t,
    ]
  );

  const pages = useMemo(
    () => buildPageList(totalPages, pageForPagination || 1),
    [totalPages, pageForPagination]
  );

  const resultLabel = useMemo(() => {
    if (totalCount === 0) return t("client.catalog.results.none");
    const start = (currentPage - 1) * limit + 1;
    const end = Math.min(start + items.length - 1, totalCount);
    return t("client.catalog.results.showing", {
      start,
      end,
      total: totalCount,
    });
  }, [currentPage, i18n.language, items.length, limit, t, totalCount]);

  return (
    <div className="space-y-4">
      <FilterPanel
        filters={filterConfigs}
        onReset={() => applyParams({ reset: true })}
        resultCount={totalCount}
        layout="horizontal"
        isLoading={isBusy}
        className="static z-auto w-full"
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-800">{resultLabel}</span>
          <Badge variant="outline" className="border-dashed text-slate-700">
            {t("client.catalog.sortedBy", { label: activeSortLabel })}
          </Badge>
          {activeFilters > 0 && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {t("client.catalog.filters.active", { count: activeFilters })}
            </Badge>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {localFilters.category && (
            <Badge variant="outline" className="border-dashed text-slate-700">
              {t("client.catalog.badges.category")}: {localFilters.category}
            </Badge>
          )}
          {localFilters.fileType && (
            <Badge variant="outline" className="border-dashed text-slate-700">
              {t("client.catalog.badges.file")}: {localFilters.fileType}
            </Badge>
          )}
          {localFilters.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="border-dashed text-slate-700">
              {t("client.catalog.badges.tag")}: {tag}
            </Badge>
          ))}
          {localFilters.search && (
            <Badge variant="outline" className="border-dashed text-slate-700">
              {t("client.catalog.badges.search")}: {localFilters.search}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3" aria-live="polite" aria-busy={isBusy}>
        {isBusy ? (
          <LoadingState
            inline
            message={`${t("client.catalog.updating")} · ${t("client.catalog.loading.helper")}`}
            className="text-xs sm:text-sm"
          />
        ) : null}
        <CatalogGrid
          items={items}
          isLoading={shouldShowGridLoading}
          errorMessage={errorMessage || null}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm text-slate-600">
            {t("client.catalog.pagination.pageOf", {
              current: pageForPagination,
              total: totalPages,
            })}
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
  );
};

export default CatalogPageClient;
