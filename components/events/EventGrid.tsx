"use client";

import ContentGrid from "@/components/shared/ContentGrid";
import EventCard, { type EventListItem } from "./EventCard";

export type { EventListItem } from "./EventCard";

type EventGridProps = {
  events: EventListItem[];
  emptyMessage?: string;
  basePath?: string;
  language?: string;
  addToCalendarLabel?: string;
};

const EventGrid = ({
  events,
  emptyMessage = "No events found.",
  basePath = "/news/events",
  language,
  addToCalendarLabel,
}: EventGridProps) => {
  const emptyState = (
    <div className="rounded-xl border border-dashed border-border bg-surface-1 p-8 text-center text-ink-muted">
      {emptyMessage}
    </div>
  );

  return (
    <ContentGrid
      items={events}
      emptyState={emptyState}
      columns={{ md: 2, lg: 3 }}
      gap={6}
      renderItem={(event, index) => (
        <EventCard
          key={
            event?._id ||
            (typeof event.slug === "string" ? event.slug : event.slug?.current) ||
            event.title ||
            `event-${index}`
          }
          event={event}
          basePath={basePath}
          language={language}
          addToCalendarLabel={addToCalendarLabel}
        />
      )}
    />
  );
};

export default EventGrid;
