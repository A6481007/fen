"use server";

import {
  ActionResult,
  PaginatedResult,
  PaginationParams,
  backofficeReadClient,
  normalizePagination,
  nowIso,
  withActionAuth,
  normalizeDocumentIds,
  resolveLocaleReference,
} from "./common";
import { hasPermission } from "@/lib/authz";
import { backendClient } from "@/sanity/lib/backendClient";
import { computeEventStatus, isEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { EVENT_PROGRAM_FIELDS, EVENT_RSVP_FIELDS } from "@/sanity/queries/events";
import type {
  EventAgendaItemInput,
  EventPublishStatus,
  EventResourceInput,
  EventSpeakerInput,
} from "@/lib/events/types";

const EVENT_PUBLISH_STATUSES = ["draft", "review", "published", "archived"] as const;
const isEventPublishStatus = (value?: string | null): value is EventPublishStatus =>
  typeof value === "string" && EVENT_PUBLISH_STATUSES.includes(value as EventPublishStatus);

export type EventFilters = PaginationParams & {
  status?: EventStatus | "all" | string;
  publishStatus?: EventPublishStatus | "all" | string;
  eventType?: string;
  search?: string;
  from?: string;
  to?: string;
};

export type EventInput = {
  _id?: string;
  title?: string;
  slug?: { current: string };
  locale?: { _type: "reference"; _ref: string } | string;
  description?: string;
  date?: string;
  location?: string;
  image?: { _type?: "image"; asset?: { _ref: string } };
  registrationOpen?: boolean;
  maxAttendees?: number;
  registrationDeadline?: string;
  earlyBirdDeadline?: string;
  teamRegistrationEnabled?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  eventType?: string;
  targetAudience?: string[];
  registrationFee?: number;
  currency?: string;
  status?: EventStatus | string;
  statusOverride?: EventStatus | string;
  publishStatus?: EventPublishStatus | string;
  agenda?: EventAgendaItemInput[];
  speakers?: EventSpeakerInput[];
  resources?: EventResourceInput[];
  [key: string]: unknown;
};

export type EventRecord = {
  _id: string;
  _type: string;
  title?: string;
  slug?: { current?: string };
  locale?: { _id?: string; code?: string; title?: string };
  description?: string;
  date?: string;
  location?: string;
  image?: { asset?: { _ref?: string } };
  registrationOpen?: boolean;
  maxAttendees?: number;
  registrationDeadline?: string;
  earlyBirdDeadline?: string;
  teamRegistrationEnabled?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  eventType?: string;
  targetAudience?: string[];
  registrationFee?: number;
  currency?: string;
  status?: EventStatus | string;
  statusOverride?: EventStatus | string;
  publishStatus?: EventPublishStatus | string;
  agenda?: EventAgendaItemInput[];
  speakers?: EventSpeakerInput[];
  resources?: Array<
    EventResourceInput & {
      file?: { asset?: { _id?: string; url?: string; originalFilename?: string; _ref?: string } };
    }
  >;
  publishAsBanner?: boolean;
  bannerSettings?: {
    bannerPlacement?: string;
    heroVariant?: string;
    startDate?: string;
    endDate?: string;
    titleOverride?: string;
    descriptionOverride?: string;
    ctaLabel?: string;
    ctaUrlOverride?: string;
  };
  attendeeCount?: number;
  updatedAt?: string;
  _updatedAt?: string;
  _createdAt?: string;
  computedStatus?: EventStatus;
};

export type EventRsvpRecord = {
  _id: string;
  name?: string;
  email?: string;
  clerkUserId?: string;
  organization?: string;
  jobTitle?: string;
  registrationType?: string;
  teamId?: string;
  teamLeadEmail?: string;
  teamMembers?: { name?: string; email?: string; jobTitle?: string }[];
  guestsCount?: number;
  message?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  newsletterOptIn?: boolean;
  status?: string;
  priority?: string;
  confirmedAt?: string;
  checkedInAt?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  submittedAt?: string;
  eventSlug?: string;
  event?: {
    _id?: string;
    title?: string;
    slug?: { current?: string };
    date?: string;
    location?: string;
  };
};

export type EventRsvpFilters = PaginationParams & {
  status?: string;
  registrationType?: string;
  priority?: string;
  search?: string;
};

type EventRecordWithSlug = Omit<EventRecord, "slug"> & {
  slug?: EventRecord["slug"] | string | null;
};

type EventRsvpEvent = NonNullable<EventRsvpRecord["event"]>;

type EventRsvpRecordWithSlug = Omit<EventRsvpRecord, "event"> & {
  event?: (EventRsvpEvent & { slug?: EventRsvpEvent["slug"] | string }) | null;
};

const EVENT_PROJECTION = `{
  _type,
  ${EVENT_PROGRAM_FIELDS},
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
        originalFilename,
        _ref
      }
    }
  },
  publishAsBanner,
  bannerSettings,
  locale->{_id, code, title},
  "attendeeCount": count(attendees),
  publishStatus,
  updatedAt,
  _updatedAt,
  _createdAt
}`;

const EVENT_RSVP_PROJECTION = `{
  ${EVENT_RSVP_FIELDS},
  event->{_id, title, "slug": slug.current, date, location}
}`;

const computedStatusSelector = `
  select(
    statusOverride in ["upcoming","ongoing","ended"] => statusOverride,
    status in ["upcoming","ongoing","ended"] => status,
    !defined(date) || !dateTime(date) => "upcoming",
    defined(endDate) && dateTime(endDate) < now() => "ended",
    defined(endDate) && dateTime(date) <= now() && dateTime(endDate) >= now() => "ongoing",
    dateTime(date) > now() => "upcoming",
    dateTime(date)[0...10] == now()[0...10] => "ongoing",
    "ended"
  )
`;

const normalizeSlugField = (slug?: EventRecord["slug"] | string | null) =>
  typeof slug === "string" ? { current: slug } : slug ?? undefined;

const normalizeEventRecord = (event: EventRecordWithSlug): EventRecord => ({
  ...event,
  slug: normalizeSlugField(event.slug),
});

const normalizeRsvpRecord = (rsvp: EventRsvpRecordWithSlug): EventRsvpRecord => ({
  ...rsvp,
  event: rsvp.event
    ? {
        ...rsvp.event,
        slug: normalizeSlugField(rsvp.event.slug),
      }
    : undefined,
});

const buildEventFilter = (filters: EventFilters) => {
  const clauses = ['(_type == "event" || _id in path("drafts.event.**"))'];
  const params: Record<string, unknown> = {};

  if (filters.eventType) {
    clauses.push("eventType == $eventType");
    params.eventType = filters.eventType;
  }

  if (filters.from) {
    clauses.push("date >= $from");
    params.from = filters.from;
  }

  if (filters.to) {
    clauses.push("date <= $to");
    params.to = filters.to;
  }

  const searchTerm = typeof filters.search === "string" ? filters.search.trim() : "";
  if (searchTerm) {
    clauses.push("(title match $search || description match $search)");
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  const normalizedStatus = isEventStatus(filters.status) ? (filters.status as EventStatus) : null;
  if (normalizedStatus) {
    clauses.push(`${computedStatusSelector} == $computedStatus`);
    params.computedStatus = normalizedStatus;
  }

  const normalizedPublishStatus = isEventPublishStatus(filters.publishStatus ?? null)
    ? (filters.publishStatus as EventPublishStatus)
    : null;
  if (normalizedPublishStatus) {
    if (normalizedPublishStatus === "published") {
      clauses.push("(!defined(publishStatus) || publishStatus == $publishStatus)");
    } else {
      clauses.push("publishStatus == $publishStatus");
    }
    params.publishStatus = normalizedPublishStatus;
  }

  return { filter: clauses.join(" && "), params };
};

const buildRsvpFilter = (eventId: string, filters: EventRsvpFilters = {}) => {
  const clauses = [
    '_type == "eventRsvp"',
    "(event._ref == $eventId || eventId == $eventId)",
  ];
  const params: Record<string, unknown> = { eventId };

  if (filters.status) {
    clauses.push("status == $status");
    params.status = filters.status;
  }

  if (filters.registrationType) {
    clauses.push("registrationType == $registrationType");
    params.registrationType = filters.registrationType;
  }

  if (filters.priority) {
    clauses.push("priority == $priority");
    params.priority = filters.priority;
  }

  const searchTerm = typeof filters.search === "string" ? filters.search.trim() : "";
  if (searchTerm) {
    clauses.push("(name match $search || email match $search || organization match $search)");
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  return { filter: clauses.join(" && "), params };
};

const sanitizeStatus = (value?: EventStatus | string | null) =>
  isEventStatus(value ?? "") ? (value as EventStatus) : undefined;
const sanitizePublishStatus = (value?: EventPublishStatus | string | null) =>
  isEventPublishStatus(value ?? "") ? (value as EventPublishStatus) : undefined;

export const listEvents = async (
  filters: EventFilters = {},
): Promise<ActionResult<PaginatedResult<EventRecord>>> => {
  return withActionAuth(
    "content.events.read",
    async () => {
      const { filter, params } = buildEventFilter(filters);
      const { limit, offset, end } = normalizePagination(filters);
      const projectionWithStatus = `${EVENT_PROJECTION.slice(0, -1)}, "computedStatus": ${computedStatusSelector}}`;

      const [items, total] = await Promise.all([
        backofficeReadClient.fetch<EventRecordWithSlug[]>(
          `*[${filter}] | order(coalesce(date, _createdAt) desc) [$offset...$end] ${projectionWithStatus}`,
          { ...params, offset, end },
        ),
        backofficeReadClient.fetch<number>(`count(*[${filter}])`, params),
      ]);

      const normalizedEvents = items.map(normalizeEventRecord);

      return { items: normalizedEvents, total, limit, offset };
    },
    { actionName: "listEvents" },
  );
};

export const getEventById = async (id: string): Promise<ActionResult<EventRecord | null>> => {
  const normalizedIds = normalizeDocumentIds(id, "Event");
  if (!normalizedIds) {
    return { success: false, message: "Event ID is required" };
  }

  return withActionAuth(
    "content.events.read",
    async () => {
      const { id: normalizedId, draftId } = normalizedIds;

      const event = await backofficeReadClient.fetch<EventRecordWithSlug | null>(
        `coalesce(
          *[_type == "event" && _id == $draftId][0],
          *[_type == "event" && _id == $id][0]
        ) ${EVENT_PROJECTION}`,
        { id: normalizedId, draftId },
      );

      if (!event) {
        return null;
      }

      const normalized = normalizeEventRecord(event);
      const computedStatus = computeEventStatus({
        date: normalized.date,
        status: sanitizeStatus(normalized.status),
        statusOverride: sanitizeStatus(normalized.statusOverride),
      });

      return { ...normalized, computedStatus };
    },
    { actionName: "getEventById" },
  );
};

export const upsertEvent = async (
  input: EventInput,
): Promise<ActionResult<{ _id: string }>> => {
  return withActionAuth(
    "content.events.write",
    async (ctx) => {
      const { _id, attendees: _omitAttendees, ...payload } = input ?? {};
      const localeRef = await resolveLocaleReference(payload?.locale);
      if (!localeRef) {
        throw new Error("Locale is required.");
      }
      const now = nowIso();
      const publishStatus = sanitizePublishStatus(payload?.publishStatus) ?? (_id ? "published" : "draft");
      const requiresPublishPermission = publishStatus === "published" || publishStatus === "archived";

      if (requiresPublishPermission && !hasPermission(ctx, "content.events.publish")) {
        throw new Error("You do not have permission to publish events.");
      }

      const baseData = {
        ...payload,
        locale: localeRef,
        updatedAt: now,
        publishStatus,
        _type: "event",
      };

      if (_id) {
        const updated = await backendClient.patch(_id).set(baseData).commit<{ _id: string }>();
        return { _id: updated._id };
      }

      const created = await backendClient.create<{ _id?: string; _type: string; status?: string; createdAt?: string }>(
        {
          ...baseData,
          status: payload?.status ?? "upcoming",
          publishStatus,
          createdAt: now,
        } as { _id?: string; _type: string; status?: string; createdAt?: string }
      );

      return { _id: created._id };
    },
    { actionName: "upsertEvent" },
  );
};

export const listEventRsvps = async (
  eventId: string,
  filters: EventRsvpFilters = {},
): Promise<ActionResult<PaginatedResult<EventRsvpRecord>>> => {
  return withActionAuth(
    "content.events.rsvps.manage",
    async () => {
      const { limit, offset, end } = normalizePagination(filters);
      const { filter, params } = buildRsvpFilter(eventId, filters);

      const [items, total] = await Promise.all([
        backofficeReadClient.fetch<EventRsvpRecordWithSlug[]>(
          `*[${filter}] | order(submittedAt desc, _createdAt desc) [$offset...$end] ${EVENT_RSVP_PROJECTION}`,
          { ...params, offset, end },
        ),
        backofficeReadClient.fetch<number>(`count(*[${filter}])`, params),
      ]);

      const normalized = items.map(normalizeRsvpRecord);

      return { items: normalized, total, limit, offset };
    },
    { actionName: "listEventRsvps" },
  );
};

export const updateRsvpStatus = async (
  rsvpId: string,
  status: string,
): Promise<ActionResult<{ _id: string }>> => {
  return withActionAuth(
    "content.events.rsvps.manage",
    async () => {
      if (!status) {
        throw new Error("Status is required");
      }

      const now = nowIso();
      const payload: Record<string, unknown> = { status, updatedAt: now };
      const unsetFields: string[] = [];

      switch (status) {
        case "confirmed":
          payload.confirmedAt = now;
          unsetFields.push("cancelledAt");
          break;
        case "checked_in":
          payload.checkedInAt = now;
          unsetFields.push("cancelledAt");
          break;
        case "cancelled":
          payload.cancelledAt = now;
          break;
        default:
          unsetFields.push("cancelledAt", "confirmedAt", "checkedInAt");
          break;
      }

      let patch = backendClient.patch(rsvpId).set(payload);
      if (unsetFields.length) {
        patch = patch.unset(unsetFields);
      }

      const updated = await patch.commit<{ _id: string }>();

      return { _id: updated._id };
    },
    { actionName: "updateRsvpStatus" },
  );
};

const escapeCsv = (value: unknown) => {
  const str = value === undefined || value === null ? "" : String(value);
  const needsPrefix = /^[=+\-@]/.test(str);
  const safe = needsPrefix ? `'${str}` : str;
  if (safe.includes('"') || safe.includes(",") || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

export const exportEventRsvpsCsv = async (
  eventId: string,
): Promise<
  ActionResult<{
    filename: string;
    content: string;
    rowCount: number;
  }>
> => {
  return withActionAuth(
    "content.events.rsvps.manage",
    async () => {
      const event = await backofficeReadClient.fetch<{ title?: string; slug?: { current?: string } } | null>(
        '*[_type == "event" && _id == $eventId][0]{title, slug}',
        { eventId },
      );

      const rsvpsRaw = await backofficeReadClient.fetch<EventRsvpRecordWithSlug[]>(
        `*[_type == "eventRsvp" && (event._ref == $eventId || eventId == $eventId)] | order(submittedAt asc) ${EVENT_RSVP_PROJECTION}`,
        { eventId },
      );
      const rsvps = rsvpsRaw.map(normalizeRsvpRecord);

      const headers = [
        "Name",
        "Email",
        "Organization",
        "Job Title",
        "Registration Type",
        "Team ID",
        "Team Lead Email",
        "Guests",
        "Status",
        "Priority",
        "Submitted At",
        "Confirmed At",
        "Checked In At",
        "Cancelled At",
        "Dietary Requirements",
        "Accessibility Needs",
        "Message",
      ];

      const rows = rsvps.map((rsvp) => [
        rsvp.name ?? "",
        rsvp.email ?? "",
        rsvp.organization ?? "",
        rsvp.jobTitle ?? "",
        rsvp.registrationType ?? "",
        rsvp.teamId ?? "",
        rsvp.teamLeadEmail ?? "",
        rsvp.guestsCount ?? "",
        rsvp.status ?? "",
        rsvp.priority ?? "",
        rsvp.submittedAt ?? "",
        rsvp.confirmedAt ?? "",
        rsvp.checkedInAt ?? "",
        rsvp.cancelledAt ?? "",
        rsvp.dietaryRequirements ?? "",
        rsvp.accessibilityNeeds ?? "",
        rsvp.message?.replace(/\s+/g, " ") ?? "",
      ]);

      const content = [
        headers.join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\n");

      const slug = event?.slug?.current || "event";
      const titlePart = (event?.title || "").trim().replace(/\s+/g, "-").toLowerCase();
      const filenameBase = (titlePart || slug).replace(/[^a-z0-9-_]/g, "");
      const filename = `${filenameBase || "event"}-rsvps.csv`;

      return {
        filename,
        content,
        rowCount: rsvps.length,
      };
    },
    { actionName: "exportEventRsvpsCsv" },
  );
};

export const deleteEvent = async (id: string): Promise<ActionResult<{ deletedId: string }>> => {
  const normalized = normalizeDocumentIds(id, "Event");
  if (!normalized) {
    return { success: false, message: "Event ID is required" };
  }

  return withActionAuth("content.events.publish", async () => {
    const { id: normalizedId, draftId } = normalized;

    await Promise.allSettled([backendClient.delete(normalizedId), backendClient.delete(draftId)]);

    return { deletedId: normalizedId };
  }, { actionName: "deleteEvent" });
};
