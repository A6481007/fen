"use client";

import "@/app/i18n";
import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import ResourceGrid from "@/components/resources/ResourceGrid";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { computeEventStatus } from "@/sanity/helpers/eventStatus";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
        label: t("client.resources.filters.source.label"),
        options: [
          { label: t("client.resources.filters.source.all"), value: "all" },
          { label: t("client.resources.filters.source.news"), value: "news" },
          { label: t("client.resources.filters.source.events"), value: "event" },
        ],
        value: filters.source,
        onChange: (value) => handleChange({ source: value as ResourceFilters["source"] }),
      },
      {
        type: "select",
        label: t("client.resources.filters.fileType.label"),
        options: [
          { label: t("client.resources.filters.fileType.all"), value: "all" },
          { label: t("client.resources.filters.fileType.pdf"), value: "PDF" },
          { label: t("client.resources.filters.fileType.image"), value: "image" },
          { label: t("client.resources.filters.fileType.document"), value: "document" },
          { label: t("client.resources.filters.fileType.link"), value: "link" },
        ],
        value: filters.fileType,
        onChange: (value) => handleChange({ fileType: value as ResourceFilters["fileType"] }),
      },
      {
        type: "select",
        label: t("client.resources.filters.eventStatus.label"),
        options: [
          { label: t("client.resources.filters.eventStatus.all"), value: "all" },
          { label: t("client.resources.filters.eventStatus.upcoming"), value: "upcoming" },
          { label: t("client.resources.filters.eventStatus.ongoing"), value: "ongoing" },
          { label: t("client.resources.filters.eventStatus.ended"), value: "ended" },
        ],
        value: filters.eventStatus,
        onChange: (value) =>
          handleChange({ eventStatus: value as ResourceFilters["eventStatus"] }),
        disabled: isEventStatusDisabled,
      },
      {
        type: "search",
        label: t("client.resources.filters.search.label"),
        placeholder: t("client.resources.filters.search.placeholder"),
        value: filters.search,
        onChange: (value) => handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 300,
      },
      {
        type: "sort",
        label: t("client.resources.filters.sort.label"),
        options: [
          { label: t("client.resources.filters.sort.dateDesc"), value: "date_desc" },
          { label: t("client.resources.filters.sort.dateAsc"), value: "date_asc" },
          { label: t("client.resources.filters.sort.nameAsc"), value: "name_asc" },
          { label: t("client.resources.filters.sort.typeAsc"), value: "type_asc" },
          { label: t("client.resources.filters.sort.sizeDesc"), value: "size_desc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as ResourceFilters["sort"] }),
      },
      {
        type: "radio",
        label: t("client.resources.filters.view.label"),
        options: [
          { label: t("client.resources.filters.view.grid"), value: "grid" },
          { label: t("client.resources.filters.view.list"), value: "list" },
        ],
        value: filters.view,
        onChange: (value) => handleChange({ view: value as ResourceFilters["view"] }),
      },
    ];
  }, [filters, handleChange, t]);

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
              {t("client.resources.empty.noResources")}
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
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                    {t("client.resources.groups.news.label")}
                  </p>
                  <h2 className="text-xl font-semibold text-shop_dark_green">
                    {t("client.resources.groups.news.title")}
                  </h2>
                </div>
                <span className="text-sm text-gray-500">
                  {t("client.resources.groups.count", { count: groupedBySource.newsResources.length })}
                </span>
              </div>
              <ResourceGrid resources={groupedBySource.newsResources} view={filters.view} />
            </section>
          ) : null}

          {groupedBySource.newsResources.length && groupedBySource.eventResources.length ? <Separator /> : null}

          {groupedBySource.eventResources.length ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                    {t("client.resources.groups.events.label")}
                  </p>
                  <h2 className="text-xl font-semibold text-shop_dark_green">
                    {t("client.resources.groups.events.title")}
                  </h2>
                </div>
                <span className="text-sm text-gray-500">
                  {t("client.resources.groups.count", { count: groupedBySource.eventResources.length })}
                </span>
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
