"use server";

import dayjs from "dayjs";
import { revalidatePath } from "next/cache";
import {
  exportEventRsvpsCsv,
  deleteEvent,
  listEventRsvps,
  listEvents,
  updateRsvpStatus,
  upsertEvent,
  type EventRecord,
  type EventRsvpRecord,
} from "@/actions/backoffice/eventsActions";
import type { EventFormState } from "@/components/admin/backoffice/events/types";
import {
  DEFAULT_EVENT_TIMEZONE,
  generateKey,
  normalizeTargetAudience,
  parseLocalDateTimeToIso,
  slugifyEventSlug,
} from "@/lib/events/utils";

export type EventListRow = {
  id: string;
  title: string;
  slug?: string;
  date?: string;
  location?: string;
  status?: string;
  computedStatus?: string;
  publishStatus?: string;
  eventType?: string;
  attendeeCount?: number;
  registrationOpen?: boolean;
};

export type EventListParams = {
  search?: string;
  status?: string;
  publishStatus?: string;
  eventType?: string;
  page?: number;
  pageSize?: number;
};

export type EventRsvpListParams = {
  status?: string;
  registrationType?: string;
  priority?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const normalizePage = (params: { page?: number; pageSize?: number }) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const formatListRow = (event: EventRecord): EventListRow => ({
  id: event._id,
  title: event.title ?? "",
  slug: event.slug?.current,
  date: event.date,
  location: event.location,
  status: event.status,
  computedStatus: event.computedStatus,
  publishStatus: event.publishStatus ?? "published",
  eventType: event.eventType,
  attendeeCount: event.attendeeCount,
  registrationOpen: event.registrationOpen,
});

export async function fetchEventsTable(
  params: EventListParams = {},
): Promise<{ items: EventListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, offset } = normalizePage(params);
  const result = await listEvents({
    limit: pageSize,
    offset,
    search: params.search,
    status: params.status && params.status !== "all" ? params.status : undefined,
    publishStatus:
      params.publishStatus && params.publishStatus !== "all" ? params.publishStatus : undefined,
    eventType: params.eventType && params.eventType !== "all" ? params.eventType : undefined,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "admin.content.events.actions.errors.loadFailed");
  }

  const items = result.data.items.map(formatListRow);

  return { items, total: result.data.total, page, pageSize };
}

export async function saveEvent(values: EventFormState): Promise<{
  success: boolean;
  id?: string;
  status?: string;
  message?: string;
}> {
  const slugValue = values.slug?.trim() || slugifyEventSlug(values.title ?? "");
  if (!slugValue) {
    return { success: false, message: "admin.events.form.errors.slugInvalid" };
  }

  const dateIso = parseLocalDateTimeToIso(values.date, DEFAULT_EVENT_TIMEZONE);
  if (!dateIso) {
    return { success: false, message: "admin.events.form.errors.invalidDate" };
  }

  if (typeof values.registrationFee === "number") {
    if (!Number.isFinite(values.registrationFee) || values.registrationFee < 0) {
      return { success: false, message: "admin.events.form.errors.registrationFeeInvalid" };
    }
  }

  if (typeof values.maxAttendees !== "undefined") {
    if (!Number.isInteger(values.maxAttendees) || values.maxAttendees <= 0) {
      return { success: false, message: "admin.events.form.errors.maxAttendeesInvalid" };
    }
  }

  const teamEnabled = values.teamRegistrationEnabled !== false;
  if (teamEnabled) {
    if (typeof values.minTeamSize !== "undefined") {
      if (!Number.isInteger(values.minTeamSize) || values.minTeamSize <= 0) {
        return { success: false, message: "admin.events.form.errors.minTeamSizeInvalid" };
      }
    }
    if (typeof values.maxTeamSize !== "undefined") {
      if (!Number.isInteger(values.maxTeamSize) || values.maxTeamSize <= 0) {
        return { success: false, message: "admin.events.form.errors.maxTeamSizeInvalid" };
      }
    }
    if (
      typeof values.minTeamSize === "number" &&
      typeof values.maxTeamSize === "number" &&
      values.minTeamSize > values.maxTeamSize
    ) {
      return { success: false, message: "admin.events.form.errors.teamSizeRangeInvalid" };
    }
  }

  const registrationDeadlineIso = parseLocalDateTimeToIso(values.registrationDeadline, DEFAULT_EVENT_TIMEZONE);
  const earlyBirdDeadlineIso = parseLocalDateTimeToIso(values.earlyBirdDeadline, DEFAULT_EVENT_TIMEZONE);

  const eventDate = dayjs(dateIso);
  if (registrationDeadlineIso && eventDate.isValid()) {
    if (dayjs(registrationDeadlineIso).isAfter(eventDate)) {
      return { success: false, message: "admin.events.form.errors.registrationDeadlineInvalid" };
    }
  }

  if (earlyBirdDeadlineIso && registrationDeadlineIso) {
    if (dayjs(earlyBirdDeadlineIso).isAfter(dayjs(registrationDeadlineIso))) {
      return { success: false, message: "admin.events.form.errors.earlyBirdDeadlineInvalid" };
    }
  }

  const toIso = (value?: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  const payload = {
    _id: values._id,
    title: values.title?.trim() || slugValue,
    slug: { current: slugValue },
    description: values.description?.trim() || undefined,
    date: dateIso,
    location: values.location?.trim() || undefined,
    registrationOpen: values.registrationOpen ?? true,
    maxAttendees: typeof values.maxAttendees === "number" ? values.maxAttendees : undefined,
    registrationDeadline: registrationDeadlineIso,
    earlyBirdDeadline: earlyBirdDeadlineIso,
    teamRegistrationEnabled: values.teamRegistrationEnabled ?? true,
    minTeamSize:
      typeof values.minTeamSize === "number" && values.teamRegistrationEnabled
        ? values.minTeamSize
        : undefined,
    maxTeamSize:
      typeof values.maxTeamSize === "number" && values.teamRegistrationEnabled
        ? values.maxTeamSize
        : undefined,
    eventType: values.eventType || undefined,
    targetAudience: normalizeTargetAudience(values.targetAudience),
    registrationFee:
      typeof values.registrationFee === "number" ? values.registrationFee : undefined,
    currency: values.currency || "THB",
    status: values.status ?? "upcoming",
    statusOverride: values.statusOverride || undefined,
    publishStatus: values.publishStatus,
    agenda: (values.agenda ?? [])
      .filter(
        (item) =>
          (item?.title ?? item?.time ?? item?.description ?? item?.speaker ?? "").toString().trim() !==
          "",
      )
      .map((item) => ({ ...item, _key: item?._key ?? generateKey() })),
    speakers: (values.speakers ?? [])
      .filter(
        (speaker) =>
          (speaker?.name ?? speaker?.title ?? speaker?.company ?? speaker?.bio ?? "")
            .toString()
            .trim() !== "",
      )
      .map((speaker) => ({ ...speaker, _key: speaker?._key ?? generateKey() })),
    resources: values.resources ?? [],
    publishAsBanner: values.publishAsBanner ?? false,
    bannerSettings: values.bannerSettings
      ? {
          ...values.bannerSettings,
          startDate: toIso(values.bannerSettings.startDate),
          endDate: toIso(values.bannerSettings.endDate),
        }
      : undefined,
  };

  const result = await upsertEvent(payload);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "admin.events.form.errors.saveFailed" };
  }

  const eventId = result.data._id;

  revalidatePath("/admin/content/events");
  revalidatePath(`/admin/content/events/${eventId}`);
  revalidatePath(`/admin/content/events/${eventId}/rsvps`);
  revalidatePath("/employee/content/events");
  revalidatePath(`/employee/content/events/${eventId}`);
  revalidatePath(`/employee/content/events/${eventId}/rsvps`);
  revalidatePath("/news/events");
  revalidatePath(`/news/events/${slugValue}`);

  return { success: true, id: eventId, status: payload.status as string };
}

export async function deleteEventById(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "admin.content.events.errors.missingEventId" };
  }

  const result = await deleteEvent(normalizedId);
  if (!result.success) {
    return { success: false, message: result.message ?? "admin.content.events.list.errors.deleteFailed" };
  }

  revalidatePath("/admin/content/events");
  revalidatePath(`/admin/content/events/${normalizedId}`);
  revalidatePath(`/admin/content/events/${normalizedId}/rsvps`);
  revalidatePath("/employee/content/events");
  revalidatePath(`/employee/content/events/${normalizedId}`);
  revalidatePath(`/employee/content/events/${normalizedId}/rsvps`);
  revalidatePath("/news/events");

  return { success: true };
}

export async function fetchEventRsvps(
  eventId: string,
  params: EventRsvpListParams = {},
): Promise<{ items: EventRsvpRecord[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, offset } = normalizePage(params);
  const result = await listEventRsvps(eventId, {
    limit: pageSize,
    offset,
    status: params.status && params.status !== "all" ? params.status : undefined,
    registrationType:
      params.registrationType && params.registrationType !== "all" ? params.registrationType : undefined,
    priority: params.priority && params.priority !== "all" ? params.priority : undefined,
    search: params.search,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "admin.content.events.actions.errors.loadRsvpsFailed");
  }

  return {
    items: result.data.items,
    total: result.data.total,
    page,
    pageSize,
  };
}

export async function updateRsvpStatusAction(
  eventId: string,
  rsvpId: string,
  status: string,
): Promise<{ success: boolean; message?: string }> {
  const result = await updateRsvpStatus(rsvpId, status);

  if (!result.success) {
    return { success: false, message: result.message ?? "admin.content.events.rsvps.errors.updateFailed" };
  }

  revalidatePath(`/admin/content/events/${eventId}/rsvps`);
  revalidatePath(`/employee/content/events/${eventId}/rsvps`);
  return { success: true };
}

export async function exportRsvpsCsv(
  eventId: string,
): Promise<{ success: boolean; filename?: string; content?: string; message?: string }> {
  const result = await exportEventRsvpsCsv(eventId);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "admin.content.events.rsvps.errors.exportFailed" };
  }

  return {
    success: true,
    filename: result.data.filename,
    content: result.data.content,
  };
}

