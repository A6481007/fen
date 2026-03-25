"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

export type ResourceFilters = {
  source: "all" | "news" | "event";
  fileType: "all" | "PDF" | "image" | "document" | "link";
  eventStatus: "all" | "upcoming" | "ongoing" | "ended";
  sort: "date_desc" | "date_asc" | "name_asc" | "type_asc" | "size_desc";
  search: string;
  view: "grid" | "list";
};

type FilterPanelProps = {
  filters: ResourceFilters;
  totalCount: number;
  onChange: (updates: Partial<ResourceFilters>) => void;
  onReset: () => void;
};

const SOURCE_OPTIONS: { label: string; value: ResourceFilters["source"] }[] = [
  { label: "All sources", value: "all" },
  { label: "News", value: "news" },
  { label: "Events", value: "event" },
];

const FILE_TYPE_OPTIONS: { label: string; value: ResourceFilters["fileType"] }[] = [
  { label: "All files", value: "all" },
  { label: "PDF", value: "PDF" },
  { label: "Image", value: "image" },
  { label: "Document", value: "document" },
  { label: "Link", value: "link" },
];

const EVENT_STATUS_OPTIONS: { label: string; value: ResourceFilters["eventStatus"] }[] = [
  { label: "All event statuses", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Ended", value: "ended" },
];

const SORT_OPTIONS: { label: string; value: ResourceFilters["sort"] }[] = [
  { label: "Date (newest)", value: "date_desc" },
  { label: "Date (oldest)", value: "date_asc" },
  { label: "Name (A-Z)", value: "name_asc" },
  { label: "File type", value: "type_asc" },
  { label: "File size", value: "size_desc" },
];

const FilterPanel = ({ filters, totalCount, onChange, onReset }: FilterPanelProps) => {
  const [searchValue, setSearchValue] = useState(filters.search);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchValue.trim() === filters.search.trim()) return;
      onChange({ search: searchValue });
    }, 300);

    return () => clearTimeout(handle);
  }, [filters.search, onChange, searchValue]);

  const activeSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? "Date (newest)",
    [filters.sort]
  );

  const isEventStatusDisabled = filters.source === "news";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-shop_dark_green text-shop_dark_green">
            Filters
          </Badge>
          <span className="text-sm text-gray-600">
            {totalCount ? `Showing ${totalCount} resource${totalCount === 1 ? "" : "s"}` : "Resources"}
          </span>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Source</Label>
            <Select
              value={filters.source}
              onValueChange={(value) => onChange({ source: value as ResourceFilters["source"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-500">File type</Label>
            <Select
              value={filters.fileType}
              onValueChange={(value) => onChange({ fileType: value as ResourceFilters["fileType"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="File type" />
              </SelectTrigger>
              <SelectContent>
                {FILE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Event status</Label>
            <Select
              value={filters.eventStatus}
              onValueChange={(value) => onChange({ eventStatus: value as ResourceFilters["eventStatus"] })}
              disabled={isEventStatusDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Event status" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search titles or descriptions"
            className="pl-9"
            aria-label="Search resources"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <Select
            value={filters.sort}
            onValueChange={(value) => onChange({ sort: value as ResourceFilters["sort"] })}
          >
            <SelectTrigger className="w-[200px]">
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
          <span className="text-xs text-gray-500">Sorted by {activeSortLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={filters.view === "grid" ? "default" : "outline"}
            size="icon"
            className={cn(
              "inline-flex",
              filters.view === "grid" ? "bg-shop_dark_green hover:bg-shop_light_green" : ""
            )}
            onClick={() => onChange({ view: "grid" })}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={filters.view === "list" ? "default" : "outline"}
            size="icon"
            className={cn(
              "inline-flex",
              filters.view === "list" ? "bg-shop_dark_green hover:bg-shop_light_green" : ""
            )}
            onClick={() => onChange({ view: "list" })}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-sm text-gray-600" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
