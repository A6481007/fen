"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Filter as FilterIcon, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface FilterConfig {
  type: "select" | "multiselect" | "radio" | "checkbox" | "search" | "sort";
  label: string;
  options?: Array<{ value: string; label: string; count?: number }>;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  debounceMs?: number;
}

/**
 * Wrapper for declarative filter definitions; handles debounce for search filters,
 * tracks active counts, supports multiple layouts, and exposes a reset control.
 */
export interface FilterPanelProps {
  filters: FilterConfig[];
  onReset: () => void;
  resultCount?: number;
  resultLabel?: string;
  className?: string;
  layout?: "horizontal" | "vertical" | "sidebar";
  isLoading?: boolean;
}

const DEFAULT_SEARCH_DEBOUNCE = 350;

const buildFilterKey = (filter: FilterConfig, index: number) => `${filter.type}-${index}-${filter.label}`;

const buildSearchDrafts = (searchFilters: FilterConfig[]) => {
  const drafts: Record<string, string> = {};
  searchFilters.forEach((filter, index) => {
    const key = buildFilterKey(filter, index);
    drafts[key] = typeof filter.value === "string" ? filter.value : "";
  });
  return drafts;
};

const FilterPanel = ({
  filters,
  onReset,
  resultCount,
  resultLabel,
  className,
  layout = "horizontal",
  isLoading = false,
}: FilterPanelProps) => {
  const { t } = useTranslation();
  // Track draft search values separately so we can debounce updates per filter instance.
  const searchFilters = useMemo(
    () => filters.filter((filter) => filter.type === "search"),
    [filters]
  );
  const [searchDrafts, setSearchDrafts] = useState<Record<string, string>>(() =>
    buildSearchDrafts(searchFilters)
  );

  useEffect(() => {
    const nextDrafts = buildSearchDrafts(searchFilters);
    setSearchDrafts((prev) => {
      const nextKeys = Object.keys(nextDrafts);
      const prevKeys = Object.keys(prev);
      if (nextKeys.length !== prevKeys.length) return nextDrafts;
      const hasChange = nextKeys.some((key) => prev[key] !== nextDrafts[key]);
      return hasChange ? nextDrafts : prev;
    });
  }, [searchFilters]);

  useEffect(() => {
    const timers = searchFilters.map((filter, index) => {
      const key = buildFilterKey(filter, index);
      const draftValue = searchDrafts[key] ?? "";
      const currentValue = typeof filter.value === "string" ? filter.value : "";
      if (draftValue === currentValue) return undefined;
      const delay = filter.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE;
      const timer = window.setTimeout(() => filter.onChange(draftValue), delay);
      return timer;
    });

    return () => timers.forEach((timer) => (timer ? clearTimeout(timer) : undefined));
  }, [searchDrafts, searchFilters]);

  const activeFilterCount = useMemo(
    () =>
      filters.reduce((count, filter) => {
        if (filter.type === "sort") return count;
        if (Array.isArray(filter.value)) return count + filter.value.length;
        const defaultOption = filter.options?.[0]?.value;
        const stringValue = typeof filter.value === "string" ? filter.value.trim() : "";
        if (!stringValue || stringValue === "all") return count;
        if (defaultOption !== undefined && stringValue === defaultOption) return count;
        return count + 1;
      }, 0),
    [filters]
  );

  const containerClass = cn(
    "rounded-2xl bg-white shadow-sm relative isolate",
    layout === "sidebar"
      ? "sticky top-4 border border-slate-200 p-4 lg:p-6"
      : "border border-gray-100 p-4",
    layout !== "sidebar" ? "flex flex-col gap-4" : "space-y-5",
    className
  );

  const headerBadge = (
    <Badge variant="outline" className="border-shop_dark_green text-shop_dark_green">
      {t("client.filters.title")}
    </Badge>
  );

  const resultBadge = (() => {
    if (resultCount === undefined) return null;
    return (
      <span className="text-sm text-gray-600">
        {resultLabel
          ? t("client.filters.resultsWithLabel", {
              count: resultCount,
              label: resultLabel,
            })
          : t("client.filters.results", { count: resultCount })}
      </span>
    );
  })();

  const renderOptionLabel = (option: { value: string; label: string; count?: number }) => (
    <span className="flex w-full items-center justify-between gap-2">
      <span>{option.label}</span>
      {option.count !== undefined ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
          {option.count}
        </span>
      ) : null}
    </span>
  );

  const renderSelect = (filter: FilterConfig) => {
    const value = (filter.value as string) ?? "";
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">{filter.label}</Label>
        <Select
          value={value}
          onValueChange={(selected) => filter.onChange(selected)}
          disabled={isLoading || filter.disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={filter.placeholder ?? filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {renderOptionLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderRadioGroup = (filter: FilterConfig, index: number) => {
    const value = (filter.value as string) ?? "";
    return (
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">{filter.label}</Label>
        <RadioGroup
          value={value}
          onValueChange={(next) => filter.onChange(next)}
          className={cn("flex flex-wrap gap-2", layout === "sidebar" ? "flex-col" : "")}
        >
          {filter.options?.map((option, optionIndex) => {
            const optionId = `${filter.label}-${option.value}-${index}-${optionIndex}`;
            const isActive = value === option.value;
            return (
              <Label key={optionId} htmlFor={optionId} className="cursor-pointer">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                    isActive
                      ? "border-shop_dark_green bg-shop_dark_green text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:border-shop_dark_green/60"
                  )}
                >
                  <RadioGroupItem
                    id={optionId}
                    value={option.value}
                    className="sr-only"
                    disabled={isLoading || filter.disabled}
                  />
                  {renderOptionLabel(option)}
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </div>
    );
  };

  const renderCheckboxes = (filter: FilterConfig, index: number) => {
    const values = Array.isArray(filter.value) ? filter.value : [];
    const toggleValue = (value: string) => {
      const next = new Set(values);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      filter.onChange(Array.from(next));
    };

    const list = (
      <div className="space-y-2">
        {filter.options?.map((option, optionIndex) => {
          const optionId = `${filter.label}-${option.value}-${index}-${optionIndex}`;
          const checked = values.includes(option.value);
          return (
            <label
              key={optionId}
              htmlFor={optionId}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50"
            >
              <Checkbox
                id={optionId}
                checked={checked}
                onCheckedChange={() => toggleValue(option.value)}
                disabled={isLoading || filter.disabled}
              />
              <span className="text-sm text-slate-700">
                {renderOptionLabel(option)}
              </span>
            </label>
          );
        })}
        {!filter.options?.length ? (
          <p className="text-sm text-slate-500">{t("client.filters.noOptions")}</p>
        ) : null}
      </div>
    );

    if (layout === "sidebar") {
      return (
        <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-500">{filter.label}</Label>
          {filter.options?.length ? (
            <span className="text-xs text-slate-500">
              {t("client.filters.optionsCount", { count: filter.options.length })}
            </span>
          ) : null}
        </div>
        <ScrollArea className="max-h-56 rounded-md border border-slate-100">
          <div className="p-2">{list}</div>
        </ScrollArea>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">{filter.label}</Label>
        {list}
      </div>
    );
  };

  const renderSearch = (filter: FilterConfig, index: number) => {
    const key = buildFilterKey(filter, index);
    const searchValue =
      searchDrafts[key] ?? (typeof filter.value === "string" ? filter.value : "");

    return (
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchValue}
          onChange={(event) =>
            setSearchDrafts((prev) => ({ ...prev, [key]: event.target.value }))
          }
          placeholder={filter.placeholder ?? t("client.filters.searchPlaceholder")}
          className="w-full pl-9"
          aria-label={filter.label}
          disabled={isLoading || filter.disabled}
        />
      </div>
    );
  };

  const renderSort = (filter: FilterConfig) => {
    const value = (filter.value as string) ?? "";
    const activeSortLabel =
      filter.options?.find((option) => option.value === value)?.label || filter.label;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-gray-500" />
        <Select
          value={value}
          onValueChange={(selected) => filter.onChange(selected)}
          disabled={isLoading || filter.disabled}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={filter.placeholder ?? filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {renderOptionLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500">
          {t("client.filters.sortedBy", { label: activeSortLabel })}
        </span>
      </div>
    );
  };

  const renderFilterControl = (filter: FilterConfig, index: number) => {
    if (filter.type === "select") return renderSelect(filter);
    if (filter.type === "radio") return renderRadioGroup(filter, index);
    if (filter.type === "checkbox" || filter.type === "multiselect") {
      return renderCheckboxes(filter, index);
    }
    if (filter.type === "search") return renderSearch(filter, index);
    if (filter.type === "sort") return renderSort(filter);
    return null;
  };

  const fieldFilters = filters.filter(
    (filter) => filter.type !== "search" && filter.type !== "sort"
  );

  const inlineLayout = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      {fieldFilters.length ? (
        <div
          className={cn(
            "grid w-full gap-3",
            (() => {
              if (fieldFilters.length >= 4) return "sm:grid-cols-2 lg:grid-cols-4";
              if (fieldFilters.length === 3) return "sm:grid-cols-2 lg:grid-cols-3";
              if (fieldFilters.length === 2) return "sm:grid-cols-2";
              return "grid-cols-1";
            })()
          )}
        >
          {fieldFilters.map((filter, index) => (
            <div key={`${filter.label}-${index}`} className="w-full">
              {renderFilterControl(filter, index)}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-3 lg:max-w-xl">
        {searchFilters.length
          ? searchFilters.map((filter, index) => (
              <div key={`${filter.label}-${index}`} className="w-full">
                {renderSearch(filter, index)}
              </div>
            ))
          : null}
        {filters.some((filter) => filter.type === "sort") ? (
          <div className="flex flex-wrap items-center gap-3">
            {filters
              .filter((filter) => filter.type === "sort")
              .map((filter, index) => (
                <div key={`${filter.label}-${index}`}>{renderSort(filter)}</div>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  const verticalLayout = (
    <div className="space-y-3">
      {filters.map((filter, index) => (
        <div key={`${filter.label}-${index}`} className="w-full">
          {renderFilterControl(filter, index)}
        </div>
      ))}
    </div>
  );

  const sidebarLayout = (
    <div className="space-y-6">
      {filters.map((filter, index) => (
        <div key={`${filter.label}-${index}`} className="w-full">
          {renderFilterControl(filter, index)}
        </div>
      ))}
    </div>
  );

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {headerBadge}
            {resultBadge}
            {activeFilterCount > 0 ? (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {t("client.filters.active", { count: activeFilterCount })}
              </Badge>
            ) : null}
          </div>
          {layout === "sidebar" && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FilterIcon className="h-4 w-4 text-shop_dark_green" />
              {t("client.filters.refine")}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-sm text-gray-700 hover:text-shop_dark_green"
          onClick={onReset}
          disabled={isLoading}
        >
          <RotateCcw className="h-4 w-4" />
          {t("client.filters.reset")}
        </Button>
      </div>

      {layout === "sidebar" ? sidebarLayout : layout === "vertical" ? verticalLayout : inlineLayout}
    </div>
  );
};

export default FilterPanel;
