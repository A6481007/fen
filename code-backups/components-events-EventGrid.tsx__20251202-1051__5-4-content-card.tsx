import EventCard, { type EventListItem } from "./EventCard";

type EventGridProps = {
  events: EventListItem[];
  emptyMessage?: string;
};

const EventGrid = ({ events, emptyMessage = "No events found." }: EventGridProps) => {
  if (!events?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white/70 p-8 text-center text-gray-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((event, index) => (
        <EventCard
          key={event?._id || event.slug || event.title || `event-${index}`}
          event={event}
        />
      ))}
    </div>
  );
};

export default EventGrid;
