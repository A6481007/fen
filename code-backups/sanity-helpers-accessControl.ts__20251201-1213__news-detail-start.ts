import { defineQuery } from "next-sanity";
import { sanityFetch } from "../lib/live";
import { computeEventStatus, type EventStatus } from "./eventStatus";

type EventAttendee = {
  email?: string;
  clerkUserId?: string;
  userId?: string;
  _key?: string;
};

type EventForAccess = {
  _id?: string;
  slug?: string;
  eventSlug?: string;
  date?: string;
  status?: EventStatus;
  statusOverride?: EventStatus;
  attendees?: EventAttendee[];
};

type ResourceWithStatus = {
  status?: "public" | "event_locked";
};

export type ResourceAccessResult = {
  isVisible: boolean;
  lockReason: string | null;
  unlockDate: string | null;
};

const normalizeSlug = (value?: string | null) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const evaluateAttendees = (
  attendees: EventAttendee[] | null | undefined,
  normalizedId: string,
  normalizedEmail: string
): { matched: boolean; hasEntries: boolean } => {
  if (!Array.isArray(attendees) || attendees.length === 0) {
    return { matched: false, hasEntries: false };
  }

  const matched = attendees.some((attendee) => {
    const attendeeEmail = typeof attendee?.email === "string" ? attendee.email.trim().toLowerCase() : "";
    const attendeeUserId = typeof attendee?.userId === "string" ? attendee.userId.trim() : "";
    const attendeeClerkId = typeof attendee?.clerkUserId === "string" ? attendee.clerkUserId.trim() : "";

    if (normalizedEmail && attendeeEmail) {
      return attendeeEmail === normalizedEmail;
    }

    if (normalizedId) {
      return normalizedId === attendeeUserId || normalizedId === attendeeClerkId;
    }

    return false;
  });

  return { matched, hasEntries: true };
};

const formatFriendlyDate = (dateValue?: string | null) => {
  if (!dateValue) {
    return "the event date";
  }

  try {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return "the event date";
    }

    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("formatFriendlyDate error", { dateValue, error });
    return "the event date";
  }
};

const EVENT_ATTENDEES_QUERY = defineQuery(`
  *[_type == "event" && _id == $eventId][0]{
    _id,
    "slug": slug.current,
    date,
    status,
    statusOverride,
    attendees[]{
      email,
      clerkUserId,
      userId,
      _key
    }
  }
`);

const EVENT_RSVP_LOOKUP_QUERY = defineQuery(`
  count(
    *[
      _type == "eventRsvp" &&
      defined($email) && $email != "" &&
      lower(email) == $email &&
      (
        (defined($eventId) && $eventId != "" && eventId == $eventId) ||
        (defined($eventSlug) && $eventSlug != "" && lower(eventSlug) == $eventSlug)
      )
    ]
  ) > 0
`);

export const isUserEventAttendee = async (
  userId?: string | null,
  eventOrEventId?: EventForAccess | string | null,
  options?: { attendeesOverride?: EventAttendee[] | null }
): Promise<boolean> => {
  if (!eventOrEventId) {
    return false;
  }

  const normalizedId = typeof userId === "string" ? userId.trim() : "";
  const normalizedEmail = normalizedId.includes("@") ? normalizedId.toLowerCase() : "";

  const eventId = typeof eventOrEventId === "string" ? eventOrEventId : eventOrEventId?._id;
  const normalizedEventId = typeof eventId === "string" ? eventId.trim() : "";
  const providedEventSlug =
    typeof eventOrEventId === "object" && eventOrEventId
      ? normalizeSlug(eventOrEventId.slug || eventOrEventId.eventSlug)
      : "";
  const attendeesOverride =
    options?.attendeesOverride ??
    (typeof eventOrEventId === "object" && eventOrEventId ? eventOrEventId.attendees : undefined);

  const { matched: overrideMatch, hasEntries: overrideHasEntries } = evaluateAttendees(
    attendeesOverride,
    normalizedId,
    normalizedEmail
  );
  if (overrideMatch) {
    return true;
  }

  if (overrideHasEntries) {
    return false;
  }

  if (!overrideHasEntries && !normalizedEventId && !providedEventSlug) {
    return false;
  }

  try {
    let event: EventForAccess | null = null;

    if (normalizedEventId) {
      const result = await sanityFetch({
        query: EVENT_ATTENDEES_QUERY,
        params: { eventId: normalizedEventId },
      });

      event = (result as { data?: EventForAccess | null } | null)?.data ?? null;
    } else if (typeof eventOrEventId === "object" && eventOrEventId) {
      event = eventOrEventId;
    }

    if (!event) {
      if (!normalizedEmail || (!normalizedEventId && !providedEventSlug)) {
        return false;
      }

      const rsvpFallback = await sanityFetch({
        query: EVENT_RSVP_LOOKUP_QUERY,
        params: {
          email: normalizedEmail,
          eventId: normalizedEventId,
          eventSlug: providedEventSlug,
        },
      });

      const hasRsvp = Boolean((rsvpFallback as { data?: boolean | number | null } | null)?.data);
      return hasRsvp;
    }

    const eventSlug = normalizeSlug(event.slug || event.eventSlug) || providedEventSlug;
    const attendees = Array.isArray(event.attendees) ? event.attendees : [];
    const { matched: eventMatch, hasEntries: hasEventAttendees } = evaluateAttendees(
      attendees,
      normalizedId,
      normalizedEmail
    );

    if (eventMatch) {
      return true;
    }

    if (!hasEventAttendees) {
      if (!normalizedEmail) {
        // RSVP docs are keyed by email only; Clerk IDs without an email cannot be matched.
        return false;
      }

      const rsvpFallback = await sanityFetch({
        query: EVENT_RSVP_LOOKUP_QUERY,
        params: {
          email: normalizedEmail,
          eventId: normalizedEventId || event._id || "",
          eventSlug: eventSlug,
        },
      });

      const hasRsvp = Boolean((rsvpFallback as { data?: boolean | number | null } | null)?.data);
      return hasRsvp;
    }

    return false;
  } catch (error) {
    console.error("isUserEventAttendee error", {
      eventId: normalizedEventId,
      eventSlug: providedEventSlug,
      userId: normalizedId,
      error,
    });
    return false;
  }
};

export const checkResourceAccess = async (
  resource?: ResourceWithStatus | null,
  event?: EventForAccess | null,
  userId?: string | null,
  options?: { attendanceOverride?: boolean; attendeesOverride?: EventAttendee[] | null }
): Promise<ResourceAccessResult> => {
  if (!resource || resource.status !== "event_locked") {
    return { isVisible: true, lockReason: null, unlockDate: null };
  }

  if (!event) {
    return {
      isVisible: false,
      lockReason: "Available after event details are published.",
      unlockDate: null,
    };
  }

  const unlockDate = event.date || null;
  const friendlyDate = formatFriendlyDate(event.date);
  const attendeeOverride = options?.attendanceOverride;
  const attendeesOverride = options?.attendeesOverride ?? event.attendees;

  try {
    const eventStatus = computeEventStatus(event);

    if (eventStatus === "ended") {
      return { isVisible: true, lockReason: null, unlockDate };
    }

    if (eventStatus === "upcoming") {
      return {
        isVisible: false,
        lockReason: `Available after ${friendlyDate}`,
        unlockDate,
      };
    }

    const attendee =
      typeof attendeeOverride === "boolean"
        ? attendeeOverride
        : await isUserEventAttendee(userId, event, { attendeesOverride });
    if (attendee) {
      return { isVisible: true, lockReason: null, unlockDate };
    }

    return {
      isVisible: false,
      lockReason: `Available after ${friendlyDate}`,
      unlockDate,
    };
  } catch (error) {
    console.error("checkResourceAccess error", {
      eventId: event?._id,
      resourceStatus: resource?.status,
      error,
    });

    return {
      isVisible: false,
      lockReason: `Available after ${friendlyDate}`,
      unlockDate,
    };
  }
};
