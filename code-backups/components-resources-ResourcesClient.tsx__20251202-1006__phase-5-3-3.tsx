"use client";

import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import ResourceGrid from "@/components/resources/ResourceGrid";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { computeEventStatus } from "@/sanity/helpers/eventStatus";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { useCallback, useMemo, useState } from "react";

type ResourceFilters = {
  source: "all" | "news" | "event";
  fileType: "all" | "PDF" | "image" | "document" | "link";
  eventStatus: "all" | "upcoming" | "ongoing" | "ended";
  sort: "date_desc" | "date_asc" | "name_asc" | "type_asc" | "size_desc";
  search: string;
  view: "grid" | "list";
};

const DEFAULT_FILTERS: ResourceFilters = {
  source: "all",
  fileType: "all",
  eventStatus: "all",
  sort: "date_desc",
  search: "",
  view: "grid",
};

const normalize = (value?: string | null) => (value || "").toLowerCase();

const getEventStatus = (resource: AggregatedResource) =>
  computeEventStatus({ date: resource.parentDate ?? undefined });

const sortResources = (items: AggregatedResource[], sort: ResourceFilters["sort"]) => {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sort === "name_asc") {
      return normalize(a.title).localeCompare(normalize(b.title));
    }

    if (sort === "type_asc") {
      return normalize(a.fileType || a.file?.asset?.extension).localeCompare(
        normalize(b.fileType || b.file?.asset?.extension)
      );
    }

    if (sort === "size_desc") {
      const sizeA = a.file?.asset?.size ?? a.file?.asset?.metadata?.size ?? -1;
      const sizeB = b.file?.asset?.size ?? b.file?.asset?.metadata?.size ?? -1;
      return sizeB - sizeA;
    }

    const dateAValue = a.parentDate ? new Date(a.parentDate).getTime() : 0;
    const dateBValue = b.parentDate ? new Date(b.parentDate).getTime() : 0;
    const dateA = Number.isFinite(dateAValue) ? dateAValue : 0;
    const dateB = Number.isFinite(dateBValue) ? dateBValue : 0;
    if (sort === "date_asc") {
      return dateA - dateB;
    }

    return dateB - dateA;
  });

  return sorted;
};

const ResourcesClient = ({ resources }: { resources: AggregatedResource[] }) => {
  const [filters, setFilters] = useState<ResourceFilters>(DEFAULT_FILTERS);

  const handleChange = useCallback((updates: Partial<ResourceFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };

      if (updates.source === "news" && prev.eventStatus !== "all") {
        next.eventStatus = "all";
      }

      return next;
    });
  }, []);

  const handleReset = () => setFilters(DEFAULT_FILTERS);

  const filterConfigs: FilterConfig[] = useMemo(() => {
    const isEventStatusDisabled = filters.source === "news";

    return [
      {
        type: "select",
        label: "Source",
        options: [
          { label: "All sources", value: "all" },
          { label: "News", value: "news" },
          { label: "Events", value: "event" },
        ],
        value: filters.source,
        onChange: (value) => handleChange({ source: value as ResourceFilters["source"] }),
      },
      {
        type: "select",
        label: "File type",
        options: [
          { label: "All files", value: "all" },
          { label: "PDF", value: "PDF" },
          { label: "Image", value: "image" },
          { label: "Document", value: "document" },
          { label: "Link", value: "link" },
        ],
        value: filters.fileType,
        onChange: (value) => handleChange({ fileType: value as ResourceFilters["fileType"] }),
      },
      {
        type: "select",
        label: "Event status",
        options: [
          { label: "All event statuses", value: "all" },
          { label: "Upcoming", value: "upcoming" },
          { label: "Ongoing", value: "ongoing" },
          { label: "Ended", value: "ended" },
        ],
        value: filters.eventStatus,
        onChange: (value) =>
          handleChange({ eventStatus: value as ResourceFilters["eventStatus"] }),
        disabled: isEventStatusDisabled,
      },
      {
        type: "search",
        label: "Search resources",
        placeholder: "Search titles or descriptions",
        value: filters.search,
        onChange: (value) => handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 300,
      },
      {
        type: "sort",
        label: "Sort by",
        options: [
          { label: "Date (newest)", value: "date_desc" },
          { label: "Date (oldest)", value: "date_asc" },
          { label: "Name (A-Z)", value: "name_asc" },
          { label: "File type", value: "type_asc" },
          { label: "File size", value: "size_desc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as ResourceFilters["sort"] }),
      },
      {
        type: "radio",
        label: "View",
        options: [
          { label: "Grid view", value: "grid" },
          { label: "List view", value: "list" },
        ],
        value: filters.view,
        onChange: (value) => handleChange({ view: value as ResourceFilters["view"] }),
      },
    ];
  }, [filters, handleChange]);

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    const visible = resources.filter((resource) => {
      if (filters.source !== "all" && resource.source !== filters.source) {
        return false;
      }

      if (filters.fileType !== "all") {
        const matchType = normalize(resource.fileType) || normalize(resource.file?.asset?.extension);
        if (matchType !== normalize(filters.fileType)) {
          return false;
        }
      }

      if (filters.eventStatus !== "all") {
        if (resource.source !== "event") return false;
        const status = getEventStatus(resource);
        if (status !== filters.eventStatus) return false;
      }

      if (term) {
        const haystack = [resource.title, resource.description, resource.parentTitle]
          .filter(Boolean)
          .map((value) => value.toLowerCase());
        const matches = haystack.some((value) => value.includes(term));
        if (!matches) {
          return false;
        }
      }

      return true;
    });

    return sortResources(visible, filters.sort);
  }, [filters.eventStatus, filters.fileType, filters.search, filters.sort, filters.source, resources]);

  const groupedBySource = useMemo(() => {
    const newsResources = filtered.filter((item) => item.source === "news");
    const eventResources = filtered.filter((item) => item.source === "event");
    return { newsResources, eventResources };
  }, [filtered]);

  const shouldGroup = filters.source === "all";
  const totalCount = filtered.length;

  if (!resources.length) {
    return (
      <div className="space-y-6">
        <FilterPanel
          filters={filterConfigs}
          resultCount={0}
          onReset={handleReset}
        />
        <Card className="border border-dashed border-gray-200 bg-white/80 text-center">
          <CardContent className="py-10">
            <p className="text-gray-600">
              We&apos;re drafting our first knowledge pack. Come back soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!totalCount) {
    return (
      <div className="space-y-6">
        <FilterPanel
          filters={filterConfigs}
          resultCount={0}
          onReset={handleReset}
        />
        <ResourceGrid resources={[]} view={filters.view} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterPanel filters={filterConfigs} resultCount={totalCount} onReset={handleReset} />

      {shouldGroup ? (
        <div className="space-y-10">
          {groupedBySource.newsResources.length ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">News resources</p>
                  <h2 className="text-xl font-semibold text-shop_dark_green">Attachments from articles</h2>
                </div>
                <span className="text-sm text-gray-500">{groupedBySource.newsResources.length} items</span>
              </div>
              <ResourceGrid resources={groupedBySource.newsResources} view={filters.view} />
            </section>
          ) : null}

          {groupedBySource.newsResources.length && groupedBySource.eventResources.length ? <Separator /> : null}

          {groupedBySource.eventResources.length ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Event resources</p>
                  <h2 className="text-xl font-semibold text-shop_dark_green">Slides, certificates, and recordings</h2>
                </div>
                <span className="text-sm text-gray-500">{groupedBySource.eventResources.length} items</span>
              </div>
              <ResourceGrid resources={groupedBySource.eventResources} view={filters.view} />
            </section>
          ) : null}
        </div>
      ) : (
        <ResourceGrid resources={filtered} view={filters.view} />
      )}
    </div>
  );
};

export default ResourcesClient;
