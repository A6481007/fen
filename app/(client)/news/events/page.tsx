import { computeEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { getHeroBannerByPlacement, getEvents } from "@/sanity/queries";
import HeroBanner from "@/components/HeroBanner";
import type { Metadata } from "next";
import type { EventListItem } from "@/components/events/EventGrid";
import EventsPageClient from "./EventsPageClient";

type EventsSearchParams = {
  status?: string | string[];
  type?: string | string[];
  search?: string | string[];
  page?: string | string[];
};

type EventsPageProps = {
  searchParams?: EventsSearchParams | Promise<EventsSearchParams>;
};

type StatusTab = "all" | "upcoming" | "past";

type EventListItemWithType = EventListItem & { eventType?: string | null };

export const metadata: Metadata = {
  title: "Events & Seminars | Newsroom",
  description:
    "Browse upcoming seminars, workshops, and community events. Filter by status or topic and reserve your seat.",
};

export const revalidate = 60;

const EVENTS_PER_PAGE = 12;

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? "" : value || "");
const parseStatusTab = (value: string): StatusTab => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "upcoming") return "upcoming";
  if (normalized === "past" || normalized === "ended") return "past";
  return "all";
};
const parsePage = (value: string) => {
  const pageNumber = Number.parseInt(value, 10);
  return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
};
const normalizeEventType = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const deriveStatus = (event: EventListItem) =>
  event.computedStatus ||
  computeEventStatus({
    date: event.date,
    status: event.status as EventStatus,
    statusOverride: event.statusOverride as EventStatus,
  });

const EventsPage = async ({ searchParams }: EventsPageProps) => {
  const heroBanner = await getHeroBannerByPlacement("eventspagehero", "sitewidepagehero");
  const resolvedSearchParams = await searchParams;

  const statusTab = parseStatusTab(parseParam(resolvedSearchParams?.status));
  const statusFilter: EventStatus | undefined =
    statusTab === "upcoming" ? "upcoming" : statusTab === "past" ? "ended" : undefined;
  const searchValue = parseParam(resolvedSearchParams?.search).trim();
  const searchQuery = searchValue.toLowerCase();
  const requestedType = normalizeEventType(parseParam(resolvedSearchParams?.type));
  const currentPage = parsePage(parseParam(resolvedSearchParams?.page));

  const eventsResult = await getEvents(statusFilter, "asc");
  const events = Array.isArray(eventsResult?.items)
    ? (eventsResult.items as EventListItemWithType[])
    : [];

  const eventTypeValues = Array.from(
    new Set(
      events
        .map((event) => normalizeEventType(event.eventType || ""))
        .filter(Boolean)
    )
  );
  const eventTypeOptions = eventTypeValues.map((value) => ({
    value,
  }));
  const hasEventTypeFilter = eventTypeOptions.length > 1;
  const selectedType =
    hasEventTypeFilter && requestedType && eventTypeValues.includes(requestedType) ? requestedType : "";

  const filteredEvents = events.filter((event) => {
    if (selectedType) {
      const eventType = normalizeEventType(event.eventType || "");
      if (eventType !== selectedType) return false;
    }

    if (searchQuery) {
      const title = (event.title || "").toLowerCase();
      const titleTh = ((event as { titleTh?: string | null }).titleTh || "").toLowerCase();
      if (!title.includes(searchQuery) && !titleTh.includes(searchQuery)) return false;
    }

    return true;
  });

  const visibleEvents = filteredEvents.slice(0, currentPage * EVENTS_PER_PAGE);
  const canLoadMore = filteredEvents.length > visibleEvents.length;

  const hasClientFilters = statusTab !== "all" || Boolean(searchQuery) || Boolean(selectedType);

  const statusCounts = events.reduce(
    (acc, event) => {
      const status = deriveStatus(event);
      if (status === "upcoming" || status === "ongoing") {
        acc.upcoming += 1;
      }
      if (status === "ended") {
        acc.past += 1;
      }
      return acc;
    },
    { upcoming: 0, past: 0 }
  );

  return (
    <>
      {heroBanner ? <HeroBanner placement="eventspagehero" banner={heroBanner} /> : null}
      <EventsPageClient
        statusTab={statusTab}
        searchValue={searchValue}
        selectedType={selectedType}
        currentPage={currentPage}
        events={events}
        filteredEvents={filteredEvents}
        visibleEvents={visibleEvents}
        canLoadMore={canLoadMore}
        hasEventTypeFilter={hasEventTypeFilter}
        eventTypeOptions={eventTypeOptions}
        statusCounts={statusCounts}
        hasClientFilters={hasClientFilters}
        showHeroHeader={!heroBanner}
      />
    </>
  );
};

export default EventsPage;
