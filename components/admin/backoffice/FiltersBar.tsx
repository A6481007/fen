"use client";

import { ChangeEvent, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

type FiltersBarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  status?: string;
  statusOptions?: { value: string; label: string }[];
  onStatusChange?: (value: string | undefined) => void;
  dateRange?: {
    from?: string;
    to?: string;
    onChange?: (range: { from?: string; to?: string }) => void;
  };
  referenceFilters?: ReactNode;
  children?: ReactNode;
  onReset?: () => void;
};

export function FiltersBar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  statusOptions,
  onStatusChange,
  dateRange,
  referenceFilters,
  children,
  onReset,
}: FiltersBarProps) {
  const { t } = useTranslation();
  const ALL_STATUSES_VALUE = "__all";
  const resolvedStatusValue = status && status.length > 0 ? status : ALL_STATUSES_VALUE;
  const resolvedSearchPlaceholder =
    searchPlaceholder || t("admin.filters.searchPlaceholder");

  const handleDateChange = (key: "from" | "to") => (event: ChangeEvent<HTMLInputElement>) => {
    dateRange?.onChange?.({
      ...dateRange,
      [key]: event.target.value || undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">
          {t("admin.filters.search")}
        </label>
        <Input
          value={search ?? ""}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={resolvedSearchPlaceholder}
        />
      </div>

      {statusOptions && (
        <div className="flex min-w-[180px] flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            {t("admin.filters.status")}
          </label>
          <Select
            value={resolvedStatusValue}
            onValueChange={(value) =>
              onStatusChange?.(value === ALL_STATUSES_VALUE ? undefined : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("admin.filters.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES_VALUE}>
                {t("admin.filters.all")}
              </SelectItem>
              {statusOptions
                .filter((option) => option.value !== "")
                .map((option) => (
                <SelectItem
                  key={option.value || option.label}
                  value={option.value === "" ? ALL_STATUSES_VALUE : option.value}
                >
                  {option.label}
                </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {dateRange && (
        <>
          <div className="flex min-w-[180px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              {t("admin.filters.from")}
            </label>
            <Input type="date" value={dateRange.from ?? ""} onChange={handleDateChange("from")} />
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              {t("admin.filters.to")}
            </label>
            <Input type="date" value={dateRange.to ?? ""} onChange={handleDateChange("to")} />
          </div>
        </>
      )}

      {referenceFilters}
      {children}

      <div className="ml-auto flex items-center gap-2">
        {onReset && (
          <>
            <Separator orientation="vertical" className="h-8" />
            <Button variant="ghost" size="sm" onClick={onReset}>
              {t("admin.filters.reset")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
