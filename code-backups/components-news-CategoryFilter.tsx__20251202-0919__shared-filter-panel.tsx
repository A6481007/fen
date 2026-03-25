"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryOption = {
  label: string;
  value: string;
};

type CategoryFilterProps = {
  categories: CategoryOption[];
  activeCategory?: string | null;
  activeSort?: string | null;
  searchQuery?: string | null;
  totalCount?: number;
};

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Most viewed", value: "most-viewed" },
];

const CategoryFilter = ({
  categories,
  activeCategory,
  activeSort = "newest",
  searchQuery = "",
  totalCount,
}: CategoryFilterProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  const normalizedActiveCategory = activeCategory || "all";
  const normalizedSort = activeSort || "newest";

  const updateParams = (next: {
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
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = searchValue.trim();
      const current = (searchQuery || "").trim();
      if (trimmed === current) return;
      updateParams({ search: trimmed || null });
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery, searchValue]);

  const activeSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === normalizedSort)?.label ?? "Newest",
    [normalizedSort]
  );

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-shop_dark_green text-shop_dark_green">
            News filters
          </Badge>
          <span className="text-sm text-gray-600">
            {totalCount ? `${totalCount} articles` : "Latest newsroom activity"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = normalizedActiveCategory === category.value;
            return (
              <Button
                key={category.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full",
                  isActive
                    ? "bg-shop_dark_green hover:bg-shop_light_green"
                    : "bg-white hover:bg-gray-50"
                )}
                aria-pressed={isActive}
                onClick={() =>
                  updateParams({
                    category: category.value === "all" ? null : category.value,
                  })
                }
                disabled={isPending}
              >
                {category.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search articles, releases, or resources"
            className="pl-9"
            aria-label="Search news articles"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <Select
            value={normalizedSort}
            onValueChange={(value) => updateParams({ sort: value, resetPage: true })}
            disabled={isPending}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-gray-500">Sorted by {activeSortLabel}</span>
      </div>
    </div>
  );
};

export default CategoryFilter;
