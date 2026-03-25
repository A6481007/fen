"use client";

import { useMemo } from "react";
import Container from "@/components/Container";
import EventGrid, { type EventListItem } from "@/components/events/EventGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type StatusTab = "all" | "upcoming" | "past";

type EventsPageClientProps = {
  statusTab: StatusTab;
  searchValue: string;
  selectedType: string;
  currentPage: number;
  events: EventListItem[];
  filteredEvents: EventListItem[];
  visibleEvents: EventListItem[];
  canLoadMore: boolean;
  hasEventTypeFilter: boolean;
  eventTypeOptions: { value: string }[];
  statusCounts: { upcoming: number; past: number };
  hasClientFilters: boolean;
  showHeroHeader?: boolean;
};

const buildHref = (params: { status?: string; type?: string; page?: number; search?: string }) => {
  const sp = new URLSearchParams();
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.type) sp.set("type", params.type);
  if (params.page && params.page > 1) sp.set("page", params.page.toString());
  if (params.search) sp.set("search", params.search);
  const qs = sp.toString();
  return qs ? `/news/events?${qs}` : "/news/events";
};

const EventsPageClient = ({
  statusTab,
  searchValue,
  selectedType,
  currentPage,
  events,
  filteredEvents,
  visibleEvents,
  canLoadMore,
  hasEventTypeFilter,
  eventTypeOptions,
  statusCounts,
  hasClientFilters,
  showHeroHeader = true,
}: EventsPageClientProps) => {
  const { t, i18n } = useTranslation();
  const addToCalendarLabel = t("client.eventDetail.actions.addToCalendar");
  const statusPills = useMemo(
    () => [
      { label: t("client.events.tabs.all"), value: "all", count: filteredEvents.length },
      { label: t("client.events.tabs.upcoming"), value: "upcoming", count: statusCounts.upcoming },
      { label: t("client.events.tabs.past"), value: "past", count: statusCounts.past },
    ],
    [filteredEvents.length, statusCounts, t]
  );

  const summaryLine = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      t("client.events.summary.base", {
        loaded: visibleEvents.length,
        total: filteredEvents.length,
      })
    );
    if (statusTab !== "all") {
      parts.push(
        t("client.events.summary.status", {
          status:
            statusTab === "upcoming"
              ? t("client.events.summary.statusUpcoming")
              : t("client.events.summary.statusPast"),
        })
      );
    }
    if (selectedType) {
      parts.push(
        t("client.events.summary.type", {
          type: selectedType.replace(/-/g, " "),
        })
      );
    }
    if (searchValue) {
      parts.push(t("client.events.summary.search", { search: searchValue }));
    }
    return parts.join(" · ");
  }, [filteredEvents.length, searchValue, selectedType, statusTab, t, visibleEvents.length]);

  const emptyLabel = hasClientFilters
    ? t("client.events.empty.noMatch")
    : t("client.events.empty.noneScheduled");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="space-y-8 py-10">
        {showHeroHeader ? (
          <header className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {t("client.events.hero.kicker")}
            </p>
            <h1 className="text-3xl font-bold text-ink-strong sm:text-4xl">
              {t("client.events.hero.title")}
            </h1>
            <p className="text-ink-muted">{t("client.events.hero.subtitle")}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-white/80 p-4 text-left shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  {t("client.events.stats.upcomingLabel")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink-strong">
                  {t("client.events.stats.upcomingCount", { count: statusCounts.upcoming })}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/80 p-4 text-left shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  {t("client.events.stats.pastLabel")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink-strong">
                  {t("client.events.stats.pastCount", { count: statusCounts.past })}
                </p>
              </div>
            </div>
          </header>
        ) : null}

        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-ink-strong">
            {t("client.events.filters.title")}
          </h2>
          <p className="text-sm text-ink-muted">{t("client.events.filters.subtitle")}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusPills.map((pill) => {
              const active = statusTab === pill.value;
              return (
                <a
                  key={pill.value}
                  href={buildHref({ status: pill.value, type: selectedType, search: searchValue })}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition",
                    active ? "border-ink bg-ink text-white" : "border-border bg-surface-0 text-ink hover:border-ink/40"
                  )}
                >
                  <span>{pill.label}</span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-ink">
                    {pill.count}
                  </span>
                </a>
              );
            })}
          </div>

          <form action="/news/events" method="get" className="flex w-full max-w-sm items-center gap-2">
            <Input
              name="search"
              defaultValue={searchValue}
              placeholder={t("client.events.filters.searchPlaceholder")}
              aria-label={t("client.events.filters.searchLabel")}
            />
            {statusTab !== "all" ? <input type="hidden" name="status" value={statusTab} /> : null}
            {selectedType ? <input type="hidden" name="type" value={selectedType} /> : null}
          </form>
        </div>

        {hasEventTypeFilter ? (
          <div className="flex flex-wrap gap-2">
            <a
              href={buildHref({ status: statusTab, search: searchValue })}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                selectedType ? "border-border bg-surface-0 text-ink" : "border-ink bg-ink text-white"
              )}
            >
              {t("client.events.filters.typeAll")}
            </a>
            {eventTypeOptions.map((opt) => {
              const active = selectedType === opt.value;
              return (
                <a
                  key={opt.value}
                  href={buildHref({ status: statusTab, type: opt.value, search: searchValue })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm capitalize",
                    active ? "border-ink bg-ink text-white" : "border-border bg-surface-0 text-ink hover:border-ink/40"
                  )}
                >
                  {opt.value.replace(/-/g, " ")}
                </a>
              );
            })}
          </div>
        ) : null}

        {events.length ? (
          <p className="text-sm text-ink-muted">{summaryLine}</p>
        ) : null}

        {visibleEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-0 p-8 text-center text-ink-muted">
            {emptyLabel}
          </div>
        ) : (
          <EventGrid
            events={visibleEvents}
            language={i18n.language}
            addToCalendarLabel={addToCalendarLabel}
          />
        )}

        {canLoadMore ? (
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <a
                href={buildHref({
                  status: statusTab,
                  type: selectedType,
                  search: searchValue,
                  page: currentPage + 1,
                })}
              >
                {t("client.events.list.loadMore")}
              </a>
            </Button>
          </div>
        ) : null}
      </Container>
    </div>
  );
};

export default EventsPageClient;
