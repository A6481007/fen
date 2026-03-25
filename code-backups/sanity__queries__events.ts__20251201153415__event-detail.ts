import { unstable_cache } from "next/cache";
import { defineQuery } from "next-sanity";
import { checkResourceAccess, computeEventStatus, isEventStatus, isUserEventAttendee } from "../helpers";
import type { EventStatus, ResourceAccessResult } from "../helpers";
import { sanityFetch } from "../lib/live";

type EventAttendee = {
  _key?: string;
  email?: string;
  clerkUserId?: string;
  userId?: string;
};

type EventResourceStatus = "public" | "event_locked";

type EventResource = {
  _key?: string;
  title?: string;
  description?: string;
  fileType?: string;
  status?: EventResourceStatus;
  file?: {
    asset?: {
      _id?: string;
      url?: string;
      originalFilename?: string;
    };
  };
  access?: ResourceAccessResult;
};

type EventDocument = {
  _id?: string;
  title?: string;
  slug?: string;
  description?: string;
  date?: string;
  location?: string;
  image?: unknown;
  registrationOpen?: boolean;
  maxAttendees?: number;
  status?: EventStatus;
  statusOverride?: EventStatus;
  attendees?: EventAttendee[];
  resources?: EventResource[];
};

const EVENTS_QUERY = defineQuery(`
  *[_type == "event"]{
    _id,
    title,
    "slug": slug.current,
    description,
    date,
    location,
    image,
    registrationOpen,
    maxAttendees,
    status,
    statusOverride
  }
`);

const EVENT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "event" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    description,
    date,
    location,
    image,
    registrationOpen,
    maxAttendees,
    status,
    statusOverride,
    attendees[]{
      _key,
      email,
      clerkUserId,
      userId
    },
    resources[]{
      _key,
      title,
      description,
      fileType,
      status,
      file{
        asset->{
          _id,
          url,
          originalFilename
        }
      }
    }
  }
`);

const USER_EVENT_REGISTRATIONS_QUERY = defineQuery(`
  *[_type == "event"]{
    _id,
    title,
    "slug": slug.current,
    date,
    registrationOpen,
    status,
    statusOverride,
    attendees[]{
      email,
      clerkUserId,
      userId
    }
  }
`);

const normalizeUserId = (value?: string | null) => (typeof value === "string" ? value.trim() : "");
const normalizeSort = (value?: string | null) => (value === "desc" ? "desc" : "asc");
const normalizeEventStatus = (value?: string | null): EventStatus | undefined =>
  isEventStatus(value) ? value : undefined;
const normalizeResourceStatus = (value?: string | null): EventResourceStatus | undefined =>
  value === "public" || value === "event_locked" ? value : undefined;

const sortEventsByDate = (events: (EventDocument & { computedStatus: EventStatus })[], sort: "asc" | "desc") =>
  [...events].sort((a, b) => {
    const aDate = a?.date ? new Date(a.date).getTime() : 0;
    const bDate = b?.date ? new Date(b.date).getTime() : 0;

    if (Number.isNaN(aDate) && Number.isNaN(bDate)) {
      return 0;
    }

    if (aDate === bDate) {
      return (a?.title || "").localeCompare(b?.title || "");
    }

    if (Number.isNaN(aDate)) {
      return sort === "desc" ? 1 : -1;
    }

    if (Number.isNaN(bDate)) {
      return sort === "desc" ? -1 : 1;
    }

    return sort === "desc" ? bDate - aDate : aDate - bDate;
  });

const filterAttendeesForUser = (attendees: EventAttendee[], userId: string): EventAttendee[] => {
  const normalizedId = normalizeUserId(userId);
  const normalizedEmail = normalizedId.includes("@") ? normalizedId.toLowerCase() : "";

  if (!normalizedId && !normalizedEmail) {
    return [];
  }

  return attendees
    .filter((attendee) => {
      const attendeeEmail =
        typeof attendee?.email === "string" ? attendee.email.trim().toLowerCase() : "";
      const attendeeUserId =
        typeof attendee?.userId === "string" ? attendee.userId.trim() : "";
      const attendeeClerkId =
        typeof attendee?.clerkUserId === "string" ? attendee.clerkUserId.trim() : "";

      if (normalizedEmail && attendeeEmail) {
        return attendeeEmail === normalizedEmail;
      }

      if (normalizedId) {
        return normalizedId === attendeeUserId || normalizedId === attendeeClerkId;
      }

      return false;
    })
    .map((attendee) => ({
      _key: attendee?._key,
      email:
        typeof attendee?.email === "string" ? attendee.email.trim() : undefined,
      clerkUserId:
        typeof attendee?.clerkUserId === "string" ? attendee.clerkUserId.trim() : undefined,
      userId: typeof attendee?.userId === "string" ? attendee.userId.trim() : undefined,
    }));
};

export const getEvents = async (status?: EventStatus | string | null, sort?: "asc" | "desc") => {
  const normalizedStatus = isEventStatus(status) ? status : null;
  const normalizedSort = normalizeSort(sort);

  const fetchEvents = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: EVENTS_QUERY,
        });

        const events: EventDocument[] = Array.isArray(data) ? data : [];

        const withStatus = events.map((event) => {
          const status = normalizeEventStatus(event.status);
          const statusOverride = normalizeEventStatus(event.statusOverride);

          return {
            ...event,
            status,
            statusOverride,
            registrationOpen: Boolean(event.registrationOpen),
            computedStatus: computeEventStatus({ ...event, status, statusOverride }),
          };
        });

        const filtered = normalizedStatus
          ? withStatus.filter((event) => event.computedStatus === normalizedStatus)
          : withStatus;

        return sortEventsByDate(filtered, normalizedSort);
      } catch (error) {
        console.error("Error fetching events:", {
          status: normalizedStatus,
          sort: normalizedSort,
          error,
        });
        return [];
      }
    },
    ["events-list", normalizedStatus ?? "all", normalizedSort],
    { revalidate: 360, tags: ["events"] }
  );

  return fetchEvents();
};

export const getEventBySlug = async (slug: string, userId?: string | null) => {
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedSlug) {
    return null;
  }

  const fetchEvent = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: EVENT_BY_SLUG_QUERY,
          params: { slug: normalizedSlug },
        });

        if (!data) {
          return null;
        }

        const event = data as EventDocument;
        const attendees = Array.isArray(event.attendees) ? event.attendees : [];
        const status = normalizeEventStatus(event.status);
        const statusOverride = normalizeEventStatus(event.statusOverride);
        const eventForAccess: EventDocument = {
          ...event,
          status,
          statusOverride,
          attendees,
        };
        const attendeeCount = attendees.length;
        const isUserAttendee = await isUserEventAttendee(normalizedUserId, eventForAccess, {
          attendeesOverride: attendees,
        });

        const resources = Array.isArray(event.resources) ? event.resources : [];
        const resourcesWithAccess = await Promise.all(
          resources.map(async (resource) => {
            const normalizedResource: EventResource = {
              ...resource,
              status: normalizeResourceStatus(resource?.status),
            };

            const access = await checkResourceAccess(
              normalizedResource,
              eventForAccess,
              normalizedUserId,
              {
                attendanceOverride: isUserAttendee,
                attendeesOverride: attendees,
              }
            );

            if (!access.isVisible) {
              return null;
            }

            return { ...normalizedResource, access };
          })
        );

        const computedStatus = computeEventStatus({
          ...event,
          status,
          statusOverride,
        });
        const sanitizedAttendees =
          isUserAttendee && normalizedUserId
            ? filterAttendeesForUser(attendees, normalizedUserId)
            : [];

        return {
          ...event,
          status,
          statusOverride,
          attendees: sanitizedAttendees,
          resources: resourcesWithAccess.filter(Boolean) as EventResource[],
          attendeeCount,
          computedStatus,
          isUserAttendee,
          registrationOpen: Boolean(event.registrationOpen),
        };
      } catch (error) {
        console.error("Error fetching event by slug:", {
          slug: normalizedSlug,
          userId: normalizedUserId,
          error,
        });
        return null;
      }
    },
    ["event-by-slug", normalizedSlug, normalizedUserId],
    { revalidate: 360, tags: ["events", `event:${normalizedSlug}`] }
  );

  return fetchEvent();
};

export const getUserEventRegistrations = async (userId?: string | null) => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return [];
  }

  const fetchRegistrations = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: USER_EVENT_REGISTRATIONS_QUERY,
        });

        const events: EventDocument[] = Array.isArray(data) ? data : [];

        const registrations: Array<
          EventDocument & {
            attendeeCount: number;
            computedStatus: EventStatus;
            isUserAttendee: boolean;
          }
        > = [];

        for (const event of events) {
          const attendees = Array.isArray(event.attendees) ? event.attendees : [];
          const status = normalizeEventStatus(event.status);
          const statusOverride = normalizeEventStatus(event.statusOverride);
          const eventForAccess: EventDocument = {
            ...event,
            status,
            statusOverride,
            attendees,
          };
          const isAttendee = await isUserEventAttendee(normalizedUserId, eventForAccess, {
            attendeesOverride: attendees,
          });

          if (!isAttendee) {
            continue;
          }

          registrations.push({
            ...event,
            status,
            statusOverride,
            attendees: [],
            attendeeCount: attendees.length,
            computedStatus: computeEventStatus({
              ...event,
              status,
              statusOverride,
            }),
            isUserAttendee: true,
            registrationOpen: Boolean(event.registrationOpen),
          });
        }

        return registrations;
      } catch (error) {
        console.error("Error fetching user event registrations:", {
          userId: normalizedUserId,
          error,
        });
        return [];
      }
    },
    ["user-event-registrations", normalizedUserId],
    { revalidate: 360, tags: ["events", "user-events", normalizedUserId] }
  );

  return fetchRegistrations();
};
