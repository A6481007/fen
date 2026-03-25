import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import EventGrid, { type EventListItem } from "@/components/events/EventGrid";
import NewsletterForm from "@/components/NewsletterForm";
import EventsRsvpForm from "@/components/news/EventsRsvpForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { computeEventStatus, isEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { getEvents } from "@/sanity/queries";
import { Calendar, Filter, Search, Sparkles, Ticket } from "lucide-react";
import Link from "next/link";

type EventsSearchParams = {
  status?: string | string[];
  search?: string | string[];
  sort?: string | string[];
};

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  ended: "Ended",
};

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? "" : value || "");
const normalizeStatus = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return isEventStatus(normalized) ? normalized : undefined;
};
const normalizeSort = (value: string) => (value.trim().toLowerCase() === "desc" ? "desc" : "asc");
const deriveStatus = (event: EventListItem): EventStatus =>
  event.computedStatus ||
  computeEventStatus({
    date: event.date,
    status: event.status as EventStatus,
    statusOverride: event.statusOverride as EventStatus,
  });

const EventsPage = async ({ searchParams }: { searchParams?: EventsSearchParams }) => {
  const statusParam = normalizeStatus(parseParam(searchParams?.status));
  const sortParam = normalizeSort(parseParam(searchParams?.sort));
  const searchValue = parseParam(searchParams?.search).trim();
  const searchQuery = searchValue.toLowerCase();

  const events = ((await getEvents(statusParam, sortParam)) ?? []) as EventListItem[];
  const filteredEvents = searchQuery
    ? events.filter((event) => (event?.title || "").toLowerCase().includes(searchQuery))
    : events;

  const statusCounts = events.reduce<Record<EventStatus, number>>(
    (acc, event) => {
      const status = deriveStatus(event);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { upcoming: 0, ongoing: 0, ended: 0 }
  );

  const emptyStateMessage = searchQuery
    ? "No events match that name. Try a different search or reset the filters."
    : "No events are scheduled right now. Check back soon or RSVP below.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      <Container className="pt-6">
        <DynamicBreadcrumb
          customItems={[
            { label: "News", href: "/news" },
            { label: "Events" },
          ]}
        />
      </Container>

      <Container className="py-8 space-y-8 sm:space-y-10">
        <section className="rounded-2xl border border-shop_light_green/30 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-shop_dark_green/10 text-shop_dark_green" variant="outline">
              Events & Experiences
            </Badge>
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Status-aware listing
            </span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.7fr,1fr] lg:items-center">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-shop_dark_green leading-tight">
                Track upcoming launches, workshops, and newsroom briefings
              </h1>
              <p className="text-gray-600 text-lg">
                Filter by status, search by event name, and pick the sessions that fit your team.
                Registration closes automatically when capacity is reached.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-shop_dark_green hover:bg-shop_light_green text-white"
                >
                  <a href="#rsvp-form" className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Reserve my spot
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="cursor-not-allowed border-dashed"
                >
                  <Calendar className="h-4 w-4" />
                  Calendar view (coming soon)
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-200 bg-shop_light_bg/60 p-4 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-shop_dark_green">Upcoming</span>
                <Badge className="bg-white text-shop_dark_green">
                  {statusCounts.upcoming} open
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-semibold text-shop_dark_green">Ongoing</span>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                  {statusCounts.ongoing} live
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-semibold text-shop_dark_green">Ended</span>
                <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-700">
                  {statusCounts.ended} wrapped
                </Badge>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <Card className="shadow-md border border-gray-100">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-shop_dark_green">
                  <Filter className="h-5 w-5" />
                  Event lineup
                </CardTitle>
                <CardDescription>
                  Search by name, filter by status, and sort chronologically (default).
                </CardDescription>
              </div>
              <Button
                variant="outline"
                type="button"
                disabled
                className="cursor-not-allowed"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Calendar toggle (placeholder)
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              <form
                className="grid gap-4 lg:grid-cols-[1.4fr,1fr,1fr,auto]"
                method="GET"
              >
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-shop_dark_green" htmlFor="search">
                    Search by event name
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="search"
                      name="search"
                      placeholder="Product launch, workshop, newsroom briefing..."
                      defaultValue={searchValue}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-shop_dark_green" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={statusParam || ""}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">All statuses</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-shop_dark_green" htmlFor="sort">
                    Sort by date
                  </label>
                  <select
                    id="sort"
                    name="sort"
                    defaultValue={sortParam}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="asc">Chronological (soonest first)</option>
                    <option value="desc">Date: newest first</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    type="submit"
                    className="bg-shop_dark_green text-white hover:bg-shop_light_green"
                  >
                    Apply
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/news/events">Reset</Link>
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <span>
                  Showing{" "}
                  <strong className="text-shop_dark_green">{filteredEvents.length}</strong>{" "}
                  event{filteredEvents.length === 1 ? "" : "s"}{" "}
                  {statusParam ? `tagged as ${STATUS_LABELS[statusParam]}` : "across all statuses"}
                  {searchQuery ? ` matching “${searchValue}”` : ""}.
                </span>
                <div className="inline-flex items-center gap-2 rounded-full bg-shop_light_bg px-3 py-1 text-xs font-semibold text-shop_dark_green">
                  <Sparkles className="h-4 w-4" />
                  Status-aware registration
                </div>
              </div>

              <EventGrid events={filteredEvents} emptyMessage={emptyStateMessage} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card
              id="rsvp-form"
              className="shadow-xl border-shop_light_green/30 border bg-white"
            >
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl text-shop_dark_green flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-shop_light_green" />
                  News Hub RSVP
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Share a few details below. Once submitted, we&apos;ll confirm your seat,
                  email the agenda, and keep you updated if anything changes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <EventsRsvpForm />
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-shop_light_pink to-light-orange/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center gap-3 text-shop_dark_green">
                  <Sparkles className="h-6 w-6" />
                  <p className="text-sm uppercase tracking-wide font-semibold">
                    Stay Updated on News & Events
                  </p>
                </div>
                <h3 className="text-2xl font-semibold text-center text-shop_dark_green">
                  Get invites, recaps, and newsroom stories in your inbox.
                </h3>
                <p className="text-center text-gray-700 text-sm">
                  Opt in once and we&apos;ll keep you looped in with product launches, community
                  moments, and highlight reels.
                </p>
                <div className="bg-white/80 rounded-xl p-4 shadow-sm">
                  <NewsletterForm />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default EventsPage;
