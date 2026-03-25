import StatusBadge from "./StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { urlFor } from "@/sanity/lib/image";
import dayjs from "dayjs";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type EventListItem = {
  _id?: string;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  date?: string | null;
  location?: string | null;
  image?: unknown;
  registrationOpen?: boolean | null;
  maxAttendees?: number | null;
  status?: EventStatus | string | null;
  statusOverride?: EventStatus | string | null;
  computedStatus?: EventStatus;
  attendeeCount?: number | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Date TBA";

  const parsed = dayjs(value);
  if (!parsed.isValid()) return "Date TBA";

  return parsed.format("MMM D, YYYY · h:mm A");
};

const buildEventHref = (slug?: string | null) => (slug ? `/news/events/${slug}` : "/news/events");

const normalizeCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const EventCard = ({ event }: { event: EventListItem }) => {
  const status =
    event.computedStatus ||
    computeEventStatus({
      date: event.date,
      status: event.status as EventStatus,
      statusOverride: event.statusOverride as EventStatus,
    });

  const imageUrl = event.image
    ? urlFor(event.image).width(900).height(520).fit("crop").url()
    : null;
  const dateLabel = formatDateTime(event.date);
  const capacity = normalizeCount(event.maxAttendees);
  const attendeeCount = normalizeCount(event.attendeeCount);
  const remaining =
    capacity !== null && attendeeCount !== null ? Math.max(0, capacity - attendeeCount) : null;
  const isEventEnded = status === "ended";
  const isRegistrationClosed = event.registrationOpen === false;
  const isFull = capacity !== null && attendeeCount !== null ? attendeeCount >= capacity : false;
  const registrationOpen = !isEventEnded && !isRegistrationClosed && !isFull;
  const registrationLabel = isEventEnded
    ? "Event ended"
    : isFull
    ? "At capacity"
    : isRegistrationClosed
    ? "Registration closed"
    : "Registration open";
  const detailHref = buildEventHref(event.slug);
  const primaryHref = registrationOpen ? "#rsvp-form" : detailHref;

  return (
    <Card className="flex h-full flex-col overflow-hidden border border-gray-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-48 w-full overflow-hidden bg-shop_light_bg">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={event.title || "Event"}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover transition duration-300 hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-shop_light_bg to-white text-shop_dark_green">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isFull || isEventEnded || isRegistrationClosed
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {registrationLabel}
          </Badge>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          {dateLabel ? (
            <div className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <time dateTime={event.date ?? undefined}>{dateLabel}</time>
            </div>
          ) : null}
          {event.location ? (
            <div className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{event.location}</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-shop_dark_green">{event.title || "Event"}</h3>
          {event.description ? (
            <p className="line-clamp-2 text-sm text-gray-600">{event.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border px-3 py-1 font-semibold",
              registrationOpen
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-gray-100 text-gray-700"
            )}
          >
            {registrationLabel}
          </Badge>
          {typeof remaining === "number" ? (
            <span className="rounded-full bg-shop_light_bg px-2 py-1 text-[11px] font-semibold text-shop_dark_green">
              {remaining} spot{remaining === 1 ? "" : "s"} left
            </span>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-2 border-t border-gray-100 bg-white/70 p-4">
        {registrationOpen ? (
          <Button
            asChild
            className="flex-1 bg-shop_dark_green text-white hover:bg-shop_light_green"
          >
            <Link href={primaryHref} scroll>
              <span className="inline-flex items-center gap-2">
                <Ticket className="h-4 w-4" aria-hidden="true" />
                Register
              </span>
            </Link>
          </Button>
        ) : (
          <Button disabled className="flex-1 bg-gray-200 text-gray-600">
            {registrationLabel}
          </Button>
        )}

        <Button variant="outline" asChild className="flex-1 border-gray-200">
          <Link href={detailHref}>View details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
