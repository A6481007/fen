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
  const attendeesOverride =
    options?.attendeesOverride ??
    (typeof eventOrEventId === "object" && eventOrEventId ? eventOrEventId.attendees : undefined);

  if (Array.isArray(attendeesOverride)) {
    if (attendeesOverride.length === 0) {
      return false;
    }

    return attendeesOverride.some((attendee) => {
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
    });
  }

  if (!eventId) {
    return false;
  }

  try {
    const result = await sanityFetch({
      query: EVENT_ATTENDEES_QUERY,
      params: { eventId },
    });

    const event = (result as { data?: EventForAccess | null } | null)?.data;
    if (!event) {
      return false;
    }

    const attendees = Array.isArray(event.attendees) ? event.attendees : [];

    if (attendees.length === 0) {
      // TODO: Map eventRsvp docs into event.attendees for attendance checks.
      return false;
    }

    return attendees.some((attendee) => {
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
    });
  } catch (error) {
    console.error("isUserEventAttendee error", { eventId, userId: normalizedId, error });
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
