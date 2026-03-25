"use client";

import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type CategoryOption = {
  label: string;
  value: string;
};

type NewsFiltersProps = {
  categories: CategoryOption[];
  activeCategory?: string | null;
  activeSort?: string | null;
  searchQuery?: string | null;
  totalCount?: number;
};

const NewsFilters = ({
  categories,
  activeCategory,
  activeSort = "newest",
  searchQuery = "",
  totalCount,
}: NewsFiltersProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const normalizedActiveCategory = activeCategory || "all";
  const normalizedSort = activeSort || "newest";
  const normalizedSearch = searchQuery || "";

  const updateParams = useCallback(
    (next: {
      category?: string | null;
      sort?: string | null;
      search?: string | null;
      resetPage?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams?.toString());

      if (next.category !== undefined) {
        params.delete("type");
        if (!next.category || next.category === "all") {
          params.delete("category");
        } else {
          params.set("category", next.category);
        }
      }

      if (next.sort !== undefined && next.sort) {
        params.set("sort", next.sort);
      }

      if (next.search !== undefined) {
        const trimmed = (next.search || "").trim();
        if (trimmed) {
          params.set("search", trimmed);
        } else {
          params.delete("search");
        }
      }

      if (next.resetPage !== false) {
        params.set("page", "1");
      }

      const queryString = params.toString();
      const target = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const handleReset = useCallback(
    () =>
      updateParams({
        category: null,
        sort: "newest",
        search: null,
        resetPage: true,
      }),
    [updateParams]
  );

  const sortOptions = useMemo(
    () => [
      { label: t("client.news.filters.sort.newest"), value: "newest" },
      { label: t("client.news.filters.sort.oldest"), value: "oldest" },
      { label: t("client.news.filters.sort.mostViewed"), value: "most-viewed" },
    ],
    [t]
  );

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "radio",
        label: t("client.news.filters.categoryLabel"),
        options: categories,
        value: normalizedActiveCategory,
        onChange: (value) =>
          updateParams({
            category: value === "all" ? null : (value as string),
          }),
        disabled: isPending,
      },
      {
        type: "search",
        label: t("client.news.filters.searchLabel"),
        placeholder: t("client.news.filters.searchPlaceholder"),
        value: normalizedSearch,
        onChange: (value) => updateParams({ search: (value as string) || null }),
        debounceMs: 400,
        disabled: isPending,
      },
      {
        type: "sort",
        label: t("client.news.filters.sort.label"),
        options: sortOptions,
        value: normalizedSort,
        onChange: (value) => updateParams({ sort: value as string, resetPage: true }),
        disabled: isPending,
      },
    ],
    [
      categories,
      normalizedActiveCategory,
      normalizedSearch,
      normalizedSort,
      updateParams,
      isPending,
      sortOptions,
      t,
    ]
  );

  return (
    <FilterPanel
      filters={filterConfigs}
      onReset={handleReset}
      resultCount={totalCount}
      isLoading={isPending}
    />
  );
};

export default NewsFilters;
