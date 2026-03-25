import { unstable_cache } from "next/cache";
import { defineQuery } from "next-sanity";
import { checkResourceAccess, computeEventStatus, isEventStatus, isUserEventAttendee } from "../helpers";
import type { EventStatus, ResourceAccessResult } from "../helpers";
import { sanityFetch } from "../lib/live";
import { writeClient } from "../lib/client";

type EventAttendee = {
  name?: string;
  _key?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  organization?: string;
  jobTitle?: string;
  registrationType?: string;
  isTeamLead?: boolean;
  teamId?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  notes?: string;
  registrationDate?: string;
  clerkUserId?: string;
  userId?: string;
};

type EventAgendaItem = {
  _key?: string;
  time?: string;
  title?: string;
  description?: string;
  speaker?: string;
};

type EventSpeaker = {
  _key?: string;
  name?: string;
  title?: string;
  company?: string;
  bio?: string;
  image?: {
    asset?: {
      _id?: string;
      url?: string;
      originalFilename?: string;
    };
  };
};

type EventRecordingStatus = "unavailable" | "processing" | "published";
type EventPublishStatus = "draft" | "review" | "published" | "archived";

type EventRecordingChapter = {
  _key?: string;
  title?: string;
  startsAt?: string;
  speaker?: string;
  summary?: string;
};

type EventRecording = {
  status?: EventRecordingStatus | null;
  title?: string | null;
  videoUrl?: string | null;
  platform?: string | null;
  duration?: string | null;
  publishedAt?: string | null;
  downloadUrl?: string | null;
  captionFile?: {
    asset?: {
      _id?: string;
      url?: string;
      originalFilename?: string;
      mimeType?: string | null;
      extension?: string | null;
    };
  } | null;
  chapters?: EventRecordingChapter[];
  transcript?: unknown;
};

type EventResourceStatus = "public" | "event_locked";

type EventVenue = {
  name?: string;
  address?: string;
  mapUrl?: string;
  geo?: { lat?: number; lng?: number } | null;
};

type EventResource = {
  _key?: string;
  title?: string;
  description?: string;
  fileType?: string;
  kind?: string;
  status?: EventResourceStatus;
  linkUrl?: string;
  offlineInstructions?: string;
  requiresRegistration?: boolean;
  availableFrom?: string;
  availableTo?: string;
  url?: string;
  downloadUrl?: string;
  file?: {
    asset?: {
      _id?: string;
      url?: string;
      originalFilename?: string;
      size?: number | null;
      mimeType?: string | null;
      extension?: string | null;
      metadata?: { lqip?: string | null; dimensions?: { aspectRatio?: number | null } | null } | null;
    };
  };
  isLink?: boolean;
  isOffline?: boolean;
  access?: ResourceAccessResult;
};

type EventDocument = {
  _id?: string;
  title?: string;
  titleTh?: string;
  slug?: string;
  description?: string;
  descriptionTh?: string;
  publishStatus?: EventPublishStatus;
  contentType?: string | null;
  format?: string | null;
  availabilityStatus?: string | null;
  industries?: string[] | null;
  useCases?: string[] | null;
  date?: string;
  endDate?: string;
  timezone?: string;
  mode?: string;
  location?: string;
  venue?: EventVenue | null;
  onlineUrl?: string;
  registrationUrl?: string | null;
  image?:
    | {
        alt?: string | null;
        caption?: string | null;
        credit?: string | null;
        asset?: { _id?: string; url?: string; metadata?: { lqip?: string | null; dimensions?: { aspectRatio?: number | null } | null } | null } | null;
      }
    | unknown;
  registrationOpen?: boolean;
  maxAttendees?: number;
  registrationDeadline?: string;
  earlyBirdDeadline?: string;
  teamRegistrationEnabled?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  eventType?: string;
  targetAudience?: string[];
  topics?: string[];
  experienceLevel?: string;
  registrationFee?: number;
  currency?: string;
  status?: EventStatus;
  statusOverride?: EventStatus;
  seoMetadata?: unknown;
  recording?: EventRecording | null;
  hasRecording?: boolean;
  attendees?: EventAttendee[];
  resources?: EventResource[];
  agenda?: EventAgendaItem[];
  speakers?: EventSpeaker[];
  attendeeCount?: number;
  computedStatus?: EventStatus;
  registrationStatus?: string;
  isUserAttendee?: boolean;
  durationBucket?: string;
  durationMinutes?: number | null;
  priceCategory?: string;
};

type EventRegistrationTeamMember = {
  name?: string;
  email?: string;
  jobTitle?: string;
};

type EventRegistrationDocument = {
  _id?: string;
  name?: string;
  email?: string;
  clerkUserId?: string;
  organization?: string;
  jobTitle?: string;
  registrationType?: string;
  teamId?: string;
  teamLeadEmail?: string;
  teamMembers?: EventRegistrationTeamMember[];
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
  reminder24hSentAt?: string;
  reminder7dSentAt?: string;
  reminder1hSentAt?: string;
  submittedAt?: string;
  eventSlug?: string;
  event?: EventDocument | null;
};

type UserRegistrationWithEvent = EventRegistrationDocument & {
  eventStatus: EventStatus;
  registrationStatus: string;
  isRegistrationClosed: boolean;
  isTeamLead: boolean;
  eventId?: string;
  eventSlug?: string;
};

type GetEventsOptions = {
  status?: EventStatus | string | null;
  sort?: "asc" | "desc";
  search?: string | null;
  eventType?: string | null;
  topics?: string[] | null;
  level?: string | null;
  mode?: string | string[] | null;
  industries?: string[] | null;
  useCases?: string[] | null;
  format?: string | null;
  availabilityStatus?: string | null;
  price?: "free" | "paid" | null;
  duration?: "short" | "half_day" | "full_day" | "multi_day" | null;
  limit?: number | null;
  offset?: number | null;
};

const priceCategorySelector = `
  select(
    !defined(registrationFee) || registrationFee <= 0 => "free",
    registrationFee > 0 => "paid",
    "free"
  )
`;

const durationMinutesSelector = `
  select(
    defined(date) && defined(endDate) => (dateTime(endDate) - dateTime(date)) / 60000,
    defined(date) => 90,
    null
  )
`;

const durationBucketSelector = `
  select(
    !defined(date) => "unknown",
    !defined(endDate) => "short",
    (dateTime(endDate) - dateTime(date)) <= 7200000 => "short",
    (dateTime(endDate) - dateTime(date)) <= 21600000 => "half_day",
    (dateTime(endDate) - dateTime(date)) <= 32400000 => "full_day",
    "multi_day"
  )
`;

export const EVENT_BASE_FIELDS = `
  _id,
  title,
  titleTh,
  "slug": slug.current,
  description,
  descriptionTh,
  publishStatus,
  contentType,
  format,
  availabilityStatus,
  industries,
  useCases,
  date,
  endDate,
  timezone,
  mode,
  location,
  venue{
    name,
    address,
    mapUrl,
    geo
  },
  onlineUrl,
  registrationUrl,
  image{
    ...,
    "alt": coalesce(alt, asset->altText),
    "caption": caption,
    "credit": credit,
    asset->{
      metadata{
        lqip,
        dimensions{
          aspectRatio
        }
      }
    }
  },
  registrationOpen,
  maxAttendees,
  registrationDeadline,
  earlyBirdDeadline,
  teamRegistrationEnabled,
  minTeamSize,
  maxTeamSize,
  eventType,
  targetAudience,
  registrationFee,
  currency,
  status,
  statusOverride,
  recording{
    status,
    videoUrl,
    platform,
    duration,
    publishedAt,
    downloadUrl,
    captionFile{
      asset->{
        _id,
        url,
        originalFilename,
        mimeType,
        extension
      }
    }
  },
  "hasRecording": defined(recording.videoUrl) || defined(recording.downloadUrl) || defined(recording.captionFile),
  topics,
  experienceLevel,
  "priceCategory": ${priceCategorySelector},
  "durationMinutes": ${durationMinutesSelector},
  "durationBucket": ${durationBucketSelector}
`;

export const EVENT_ATTENDEE_FIELDS = `
  name,
  _key,
  email,
  phone,
  companyName,
  organization,
  jobTitle,
  registrationType,
  isTeamLead,
  teamId,
  dietaryRequirements,
  accessibilityNeeds,
  notes,
  registrationDate,
  clerkUserId,
  userId
`;

export const EVENT_PROGRAM_FIELDS = `
  ${EVENT_BASE_FIELDS},
  agenda[]{
    _key,
    time,
    title,
    description,
    speaker
  },
  speakers[]{
    _key,
    name,
    title,
    company,
    bio,
    image{
      ...,
      "alt": coalesce(alt, asset->altText),
      asset->{
        _id,
        url,
        originalFilename,
        metadata{
          lqip,
          dimensions{
            aspectRatio
          }
        }
      }
    }
  },
  recording{
    status,
    title,
    videoUrl,
    platform,
    duration,
    publishedAt,
    downloadUrl,
    captionFile{
      asset->{
        _id,
        url,
        originalFilename,
        mimeType,
        extension
      }
    },
    chapters[]{
      _key,
      title,
      startsAt,
      speaker,
      summary
    },
    transcript
  }
`;

const normalizedResourceFileType = `
  select(
    lower(fileType) in ["pdf","image","document","link","offline"] => lower(fileType),
    fileType == "PDF" => "pdf",
    fileType == "doc" => "document",
    "document"
  )
`;

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

export const EVENT_DETAIL_FIELDS = `
  ${EVENT_PROGRAM_FIELDS},
  seoMetadata,
  "computedStatus": ${computedStatusSelector},
  "registrationStatus": select(
    registrationOpen == false => "closed",
    defined(registrationDeadline) && dateTime(registrationDeadline) < now() => "closed",
    defined(maxAttendees) && maxAttendees > 0 && count(attendees) >= maxAttendees => "full",
    "open"
  ),
  "attendeeCount": count(attendees),
  attendees[]{
    ${EVENT_ATTENDEE_FIELDS}
  },
  resources[]{
    _key,
    title,
    description,
    fileType,
    "kind": ${normalizedResourceFileType},
    status,
    linkUrl,
    url,
    offlineInstructions,
    requiresRegistration,
    availableFrom,
    availableTo,
    file{
      asset->{
        _id,
        url,
        originalFilename,
        size,
        mimeType,
        extension,
        metadata{
          lqip,
          dimensions{
            aspectRatio
          }
        }
      }
    },
    "downloadUrl": coalesce(file.asset->url, linkUrl, url),
    "isOffline": ${normalizedResourceFileType} == "offline",
    "isLink": ${normalizedResourceFileType} == "link",
    "accessInfo": {
      "isLocked": status == "event_locked",
      "requiresRegistration": coalesce(requiresRegistration, status == "event_locked"),
      "availableFrom": availableFrom,
      "availableTo": availableTo
    }
  }
`;

export const EVENT_RSVP_FIELDS = `
  _id,
  name,
  email,
  clerkUserId,
  organization,
  jobTitle,
  registrationType,
  teamId,
  teamLeadEmail,
  teamMembers[]{
    name,
    email,
    jobTitle
  },
  guestsCount,
  message,
  dietaryRequirements,
  accessibilityNeeds,
  newsletterOptIn,
  status,
  priority,
  confirmedAt,
  checkedInAt,
  cancelledAt,
  cancellationReason,
  submittedAt,
  eventSlug
`;

const EVENT_ORDER = {
  asc: "coalesce(date, endDate, _createdAt) asc, _createdAt asc",
  desc: "coalesce(date, endDate, _createdAt) desc, _createdAt desc",
} as const;

const buildEventsListQuery = (orderClause: string = EVENT_ORDER.asc) =>
  defineQuery(`
    {
      "items": *[
        _type == "event"
        && !(_id in path("drafts.**"))
        && (!defined(publishStatus) || publishStatus == "published")
        && (
          !defined($status)
          || $status == ""
          || ($status == "upcoming" && ${computedStatusSelector} in ["upcoming","ongoing"])
          || ($status != "upcoming" && ${computedStatusSelector} == $status)
        )
        && (
          !defined($eventType) || $eventType == "" || lower(eventType) == $eventType
        )
        && (
          !defined($topics) || count($topics) == 0 || count((coalesce(topics, [eventType]))[lower(@) in $topics]) > 0
        )
        && (
          !defined($industries) || count($industries) == 0 || count(coalesce(industries, [])[@ in $industries]) > 0
        )
        && (
          !defined($useCases) || count($useCases) == 0 || count(coalesce(useCases, [])[@ in $useCases]) > 0
        )
        && (
          !defined($format) || $format == "" || lower(coalesce(format, "")) == $format
        )
        && (
          !defined($availabilityStatus) || $availabilityStatus == "" || lower(coalesce(availabilityStatus, "")) == $availabilityStatus
        )
        && (
          !defined($level) || $level == "" || $level == "all" || lower(coalesce(experienceLevel, "")) == $level
        )
        && (
          !defined($modes) || count($modes) == 0 || lower(coalesce(mode, "")) in $modes
        )
        && (
          !defined($price) || $price == "" || ${priceCategorySelector} == $price
        )
        && (
          !defined($duration) || $duration == "" || ${durationBucketSelector} == $duration
        )
        && (
          !defined($search)
          || $search == ""
          || lower(title) match $search
          || lower(coalesce(description, "")) match $search
          || lower(coalesce(location, "")) match $search
        )
      ]
      | order(${orderClause})
      [$offset...$rangeEnd]{
        ${EVENT_BASE_FIELDS},
        "attendeeCount": count(attendees),
        "computedStatus": ${computedStatusSelector},
        "registrationStatus": select(
          registrationOpen == false => "closed",
          defined(registrationDeadline) && dateTime(registrationDeadline) < now() => "closed",
          defined(maxAttendees) && maxAttendees > 0 && count(attendees) >= maxAttendees => "full",
          "open"
        )
      },
      "totalCount": count(*[
        _type == "event"
        && !(_id in path("drafts.**"))
        && (!defined(publishStatus) || publishStatus == "published")
        && (
          !defined($status)
          || $status == ""
          || ($status == "upcoming" && ${computedStatusSelector} in ["upcoming","ongoing"])
          || ($status != "upcoming" && ${computedStatusSelector} == $status)
        )
        && (
          !defined($eventType) || $eventType == "" || lower(eventType) == $eventType
        )
        && (
          !defined($topics) || count($topics) == 0 || count((coalesce(topics, [eventType]))[lower(@) in $topics]) > 0
        )
        && (
          !defined($industries) || count($industries) == 0 || count(coalesce(industries, [])[@ in $industries]) > 0
        )
        && (
          !defined($useCases) || count($useCases) == 0 || count(coalesce(useCases, [])[@ in $useCases]) > 0
        )
        && (
          !defined($format) || $format == "" || lower(coalesce(format, "")) == $format
        )
        && (
          !defined($availabilityStatus) || $availabilityStatus == "" || lower(coalesce(availabilityStatus, "")) == $availabilityStatus
        )
        && (
          !defined($level) || $level == "" || $level == "all" || lower(coalesce(experienceLevel, "")) == $level
        )
        && (
          !defined($modes) || count($modes) == 0 || lower(coalesce(mode, "")) in $modes
        )
        && (
          !defined($price) || $price == "" || ${priceCategorySelector} == $price
        )
        && (
          !defined($duration) || $duration == "" || ${durationBucketSelector} == $duration
        )
        && (
          !defined($search)
          || $search == ""
          || lower(title) match $search
          || lower(coalesce(description, "")) match $search
          || lower(coalesce(location, "")) match $search
        )
      ])
    }
  `);

const EVENTS_LIST_QUERY_ASC = buildEventsListQuery(EVENT_ORDER.asc);
const EVENTS_LIST_QUERY_DESC = buildEventsListQuery(EVENT_ORDER.desc);

const EVENT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "event" && !(_id in path("drafts.**")) && (!defined(publishStatus) || publishStatus == "published") && (
    slug.current == $slug ||
    lower(slug.current) == $slugLower ||
    _id == $slug
  )][0]{
    ${EVENT_DETAIL_FIELDS}
  }
`);

const USER_EVENT_REGISTRATIONS_QUERY = defineQuery(`
  *[_type == "event" && !(_id in path("drafts.**"))]{
    ${EVENT_BASE_FIELDS},
    attendees[]{
      ${EVENT_ATTENDEE_FIELDS}
    }
  }
`);

const USER_REGISTRATIONS_WITH_EVENTS_QUERY = defineQuery(`
  *[
    _type == "eventRsvp" &&
    (
      (defined($email) && $email != "" && lower(email) == $email) ||
      (defined($clerkUserId) && $clerkUserId != "" && clerkUserId == $clerkUserId)
    )
  ] | order(coalesce(event->date, submittedAt) asc){
    ${EVENT_RSVP_FIELDS},
    event->{
      ${EVENT_PROGRAM_FIELDS}
    }
  }
`);

const normalizeUserId = (value?: string | null) => (typeof value === "string" ? value.trim() : "");
const normalizeSort = (value?: string | null) => (value === "desc" ? "desc" : "asc");
const normalizeEventStatus = (value?: string | null): EventStatus | undefined =>
  isEventStatus(value) ? value : undefined;
const normalizeResourceStatus = (value?: string | null): EventResourceStatus | undefined =>
  value === "public" || value === "event_locked" ? value : undefined;
const normalizeResourceFileType = (value?: string | null) => {
  if (typeof value !== "string") {
    return "document";
  }
  const normalized = value.trim().toLowerCase();
  if (["pdf", "image", "document", "link", "offline"].includes(normalized)) {
    return normalized;
  }
  if (value === "PDF") {
    return "pdf";
  }
  if (value === "doc") {
    return "document";
  }
  return normalized || "document";
};
const normalizeRegistrationType = (value?: string | null) => {
  if (typeof value !== "string") {
    return "individual";
  }
  const normalized = value.trim().toLowerCase();
  return normalized || "individual";
};
const normalizeRegistrationStatus = (value?: string | null) => {
  if (typeof value !== "string") {
    return "new";
  }
  const normalized = value.trim().toLowerCase();
  return normalized || "new";
};
const EVENTS_DEFAULT_LIMIT = 12;
const EVENTS_MAX_LIMIT = 48;
const normalizeEventsLimit = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return EVENTS_DEFAULT_LIMIT;
  }
  const integer = Math.max(1, Math.floor(value));
  return Math.min(integer, EVENTS_MAX_LIMIT);
};
const normalizeEventsOffset = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
};
const normalizeEventTypeFilter = (value?: string | null) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const normalizeEventSearch = (value?: string | null) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return "";
  return `*${normalized.replace(/\s+/g, " ")}*`;
};
const normalizeTopicsFilter = (value?: string[] | null) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((topic) => (typeof topic === "string" ? topic.trim().toLowerCase() : ""))
        .filter(Boolean)
    )
  );
};
const normalizeLevelFilter = (value?: string | null) => {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  if (["beginner", "intermediate", "advanced", "all"].includes(normalized)) {
    return normalized;
  }
  return "";
};
const normalizeModeFilter = (value?: string | string[] | null) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(",")
    : [];
  const normalized = list.map((entry) => {
    const trimmed = (entry || "").trim().toLowerCase();
    if (trimmed === "in-person" || trimmed === "in_person" || trimmed === "onsite") {
      return "offline";
    }
    return trimmed;
  });
  return Array.from(
    new Set(normalized.filter((entry) => ["online", "offline", "hybrid"].includes(entry)))
  );
};
const normalizeIndustriesFilter = (value?: string[] | null) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
            .filter(Boolean)
        )
      )
    : [];

const normalizeUseCasesFilter = (value?: string[] | null) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
            .filter(Boolean)
        )
      )
    : [];

const normalizeFormatFilter = (value?: string | null) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized || "";
};

const normalizeAvailabilityStatusFilter = (value?: string | null) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized || "";
};
const normalizePriceFilter = (value?: string | null) => {
  if (value === "free" || value === "paid") return value;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "free" || normalized === "paid" ? normalized : "";
};
const normalizeDurationFilter = (value?: string | null) => {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  if (["short", "half_day", "full_day", "multi_day"].includes(normalized)) {
    return normalized;
  }
  return "";
};

const isRegistrationClosed = (event?: EventDocument | null, now: Date = new Date()) => {
  if (!event) {
    return false;
  }

  const deadlineValue = event.registrationDeadline;
  const deadlineMs = deadlineValue ? new Date(deadlineValue).getTime() : Number.NaN;
  const afterDeadline = !Number.isNaN(deadlineMs) && deadlineMs < now.getTime();
  const eventStatus = computeEventStatus(event, now);
  const isClosedToggle = event.registrationOpen === false;

  return eventStatus === "ended" || isClosedToggle || afterDeadline;
};

const computeRegistrationStatus = (
  registration: EventRegistrationDocument,
  event: EventDocument | null,
  eventStatus: EventStatus,
  now: Date = new Date()
) => {
  const normalized = normalizeRegistrationStatus(registration?.status);
  const registrationClosed = isRegistrationClosed(event, now);

  if (normalized === "cancelled" || normalized === "archived") {
    return normalized;
  }

  if (eventStatus === "ended") {
    if (normalized === "checked_in") {
      return "attended";
    }
    if (normalized === "confirmed") {
      return "completed";
    }
    return "ended";
  }

  if (normalized === "checked_in" || normalized === "confirmed" || normalized === "waitlisted") {
    return normalized;
  }

  if (registrationClosed) {
    return "closed";
  }

  return "pending";
};

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const sortRegistrationsByEventDate = (registrations: UserRegistrationWithEvent[]) =>
  [...registrations].sort((a, b) => {
    const aDate = toTimestamp(a?.event?.date) ?? toTimestamp(a?.submittedAt);
    const bDate = toTimestamp(b?.event?.date) ?? toTimestamp(b?.submittedAt);

    if (aDate === bDate) {
      return (a?.event?.title || a?.name || "").localeCompare(b?.event?.title || b?.name || "");
    }

    if (aDate === null) {
      return 1;
    }

    if (bDate === null) {
      return -1;
    }

    return aDate - bDate;
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
      name: typeof attendee?.name === "string" ? attendee.name.trim() : undefined,
      email:
        typeof attendee?.email === "string" ? attendee.email.trim() : undefined,
      phone: typeof attendee?.phone === "string" ? attendee.phone.trim() : undefined,
      companyName:
        typeof attendee?.companyName === "string" ? attendee.companyName.trim() : undefined,
      organization:
        typeof attendee?.organization === "string" ? attendee.organization.trim() : undefined,
      jobTitle:
        typeof attendee?.jobTitle === "string" ? attendee.jobTitle.trim() : undefined,
      registrationType:
        typeof attendee?.registrationType === "string"
          ? attendee.registrationType.trim().toLowerCase()
          : undefined,
      isTeamLead: attendee?.isTeamLead === true,
      teamId: typeof attendee?.teamId === "string" ? attendee.teamId.trim() : undefined,
      dietaryRequirements:
        typeof attendee?.dietaryRequirements === "string"
          ? attendee.dietaryRequirements.trim()
          : undefined,
      accessibilityNeeds:
        typeof attendee?.accessibilityNeeds === "string"
          ? attendee.accessibilityNeeds.trim()
          : undefined,
      notes: typeof attendee?.notes === "string" ? attendee.notes.trim() : undefined,
      registrationDate:
        typeof attendee?.registrationDate === "string"
          ? attendee.registrationDate
          : undefined,
      clerkUserId:
        typeof attendee?.clerkUserId === "string" ? attendee.clerkUserId.trim() : undefined,
      userId: typeof attendee?.userId === "string" ? attendee.userId.trim() : undefined,
    }));
};

export const getEvents = async (
  statusOrOptions?: EventStatus | string | null | GetEventsOptions,
  sortArg?: "asc" | "desc"
) => {
  const options: GetEventsOptions =
    typeof statusOrOptions === "object" && statusOrOptions !== null && !Array.isArray(statusOrOptions)
      ? statusOrOptions
      : {
          status: statusOrOptions as EventStatus | string | null,
          sort: sortArg,
        };

  const normalizedStatus = isEventStatus(options.status) ? options.status : null;
  const normalizedSort = normalizeSort(options.sort);
  const searchPattern = normalizeEventSearch(options.search);
  const normalizedEventType = normalizeEventTypeFilter(options.eventType);
  const normalizedTopics = normalizeTopicsFilter(options.topics);
  const normalizedLevel = normalizeLevelFilter(options.level);
  const normalizedModes = normalizeModeFilter(options.mode);
  const normalizedIndustries = normalizeIndustriesFilter(options.industries);
  const normalizedUseCases = normalizeUseCasesFilter(options.useCases);
  const normalizedFormat = normalizeFormatFilter(options.format);
  const normalizedAvailability = normalizeAvailabilityStatusFilter(options.availabilityStatus);
  const normalizedPrice = normalizePriceFilter(options.price);
  const normalizedDuration = normalizeDurationFilter(options.duration);
  const limit = normalizeEventsLimit(options.limit);
  const offset = normalizeEventsOffset(options.offset);
  const rangeEnd = offset + limit;
  const query = normalizedSort === "desc" ? EVENTS_LIST_QUERY_DESC : EVENTS_LIST_QUERY_ASC;

  const fetchEvents = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query,
          params: {
            status: normalizedStatus ?? "",
            eventType: normalizedEventType,
            search: searchPattern,
            topics: normalizedTopics,
            level: normalizedLevel,
            modes: normalizedModes,
            industries: normalizedIndustries,
            useCases: normalizedUseCases,
            format: normalizedFormat,
            availabilityStatus: normalizedAvailability,
            price: normalizedPrice,
            duration: normalizedDuration,
            offset,
            rangeEnd,
          },
        });

        const itemsRaw = Array.isArray((data as { items?: unknown[] } | null)?.items)
          ? ((data as { items: unknown[] }).items ?? [])
          : [];
        const totalCount =
          typeof (data as { totalCount?: number } | null)?.totalCount === "number"
            ? (data as { totalCount: number }).totalCount
            : 0;

        const items = itemsRaw.map((event) => {
          const status = normalizeEventStatus((event as EventDocument)?.status);
          const statusOverride = normalizeEventStatus((event as EventDocument)?.statusOverride);
          const computed =
            normalizeEventStatus((event as EventDocument)?.computedStatus) ??
            computeEventStatus(
              {
                date: (event as EventDocument)?.date,
                status,
                statusOverride,
              },
              new Date()
            );

          const attendeeCount = (() => {
            if (typeof (event as EventDocument)?.attendeeCount === "number") {
              return (event as EventDocument).attendeeCount;
            }
            if (Array.isArray((event as EventDocument)?.attendees)) {
              return (event as EventDocument).attendees?.length ?? 0;
            }
            return 0;
          })();

          return {
            ...(event as EventDocument),
            status,
            statusOverride,
            computedStatus: computed,
            registrationOpen: Boolean((event as EventDocument)?.registrationOpen),
            attendeeCount,
          };
        });

        const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;
        const currentPage = totalPages > 0 ? Math.floor(offset / limit) + 1 : 1;

        return {
          items,
          totalCount,
          limit,
          offset,
          sort: normalizedSort,
          totalPages,
          currentPage,
          hasNextPage: offset + items.length < totalCount,
          hasPrevPage: offset > 0 && totalCount > 0,
        };
      } catch (error) {
        console.error("Error fetching events:", {
          status: normalizedStatus,
          sort: normalizedSort,
          search: options.search,
          eventType: normalizedEventType,
          error,
        });
        return {
          items: [],
          totalCount: 0,
          limit,
          offset,
          sort: normalizedSort,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }
    },
    [
      "events-list",
      normalizedStatus ?? "all",
      normalizedEventType || "all-types",
      searchPattern || "all",
      normalizedTopics.join(",") || "all-topics",
      normalizedLevel || "all-levels",
      normalizedModes.join(",") || "all-modes",
      normalizedPrice || "all-prices",
      normalizedDuration || "all-durations",
      `limit:${limit}`,
      `offset:${offset}`,
      normalizedSort,
    ],
    { revalidate: 60, tags: ["events"] }
  );

  return fetchEvents();
};

export const getEventBySlug = async (slug: string, userId?: string | null) => {
  const normalizedSlug = typeof slug === "string" ? decodeURIComponent(slug).trim() : "";
  const normalizedSlugLower = normalizedSlug.toLowerCase();
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedSlug) {
    return null;
  }

  const fetchRawEvent = unstable_cache(
    async (): Promise<EventDocument | null> => {
      try {
        return await writeClient.fetch<EventDocument | null>(EVENT_BY_SLUG_QUERY, {
          slug: normalizedSlug,
          slugLower: normalizedSlugLower,
        });
      } catch (writeError) {
        console.error("Write client event fetch failed, trying read client:", {
          slug: normalizedSlug,
          error: writeError,
        });
      }

      try {
        const { data } = await sanityFetch({
          query: EVENT_BY_SLUG_QUERY,
          params: { slug: normalizedSlug, slugLower: normalizedSlugLower },
        });

        if (data) {
          return data as EventDocument;
        }
      } catch (fetchError) {
        console.error("Read client event fetch failed:", {
          slug: normalizedSlug,
          error: fetchError,
        });
      }

      return null;
    },
    ["event-detail", normalizedSlug],
    { revalidate: 60, tags: ["events", `event:${normalizedSlug}`] }
  );

  try {
    const rawEvent = await fetchRawEvent();

    if (!rawEvent) {
      return null;
    }

    const attendees = Array.isArray(rawEvent.attendees) ? rawEvent.attendees : [];
    const status = normalizeEventStatus(rawEvent.status);
    const statusOverride = normalizeEventStatus(rawEvent.statusOverride);
    const eventForAccess: EventDocument = {
      ...rawEvent,
      status,
      statusOverride,
      attendees,
    };
    const attendeeCount =
      typeof rawEvent.attendeeCount === "number" ? rawEvent.attendeeCount : attendees.length;
    const isUserAttendee = await isUserEventAttendee(normalizedUserId, eventForAccess, {
      attendeesOverride: attendees,
    });

    const resources = Array.isArray(rawEvent.resources) ? rawEvent.resources : [];
    const resourcesWithAccess = await Promise.all(
      resources.map(async (resource) => {
        const normalizedFileType = normalizeResourceFileType(resource?.fileType);
        const normalizedResource: EventResource = {
          ...resource,
          status: normalizeResourceStatus(resource?.status),
          fileType: normalizedFileType,
          kind: normalizeResourceFileType((resource as { kind?: string } | undefined)?.kind),
          linkUrl: (resource as { linkUrl?: string; url?: string } | undefined)?.linkUrl ?? resource?.url,
          downloadUrl:
            (resource as { downloadUrl?: string } | undefined)?.downloadUrl ||
            (resource as { file?: { asset?: { url?: string } } } | undefined)?.file?.asset?.url ||
            (resource as { linkUrl?: string; url?: string } | undefined)?.linkUrl ||
            resource?.url,
          isLink: normalizedFileType === "link",
          isOffline: normalizedFileType === "offline",
        };

        const access = await checkResourceAccess(normalizedResource, eventForAccess, normalizedUserId, {
          attendanceOverride: isUserAttendee,
          attendeesOverride: attendees,
        });

        const sanitizedFile = access?.isVisible ? normalizedResource.file : undefined;
        const sanitizedUrl = access?.isVisible ? normalizedResource.downloadUrl ?? normalizedResource.linkUrl ?? normalizedResource.url : undefined;

        return { ...normalizedResource, file: sanitizedFile, url: sanitizedUrl, access };
      })
    );

    const computedStatus =
      normalizeEventStatus(rawEvent.computedStatus) ||
      computeEventStatus({
        ...rawEvent,
        status,
        statusOverride,
      });
    const sanitizedAttendees =
      isUserAttendee && normalizedUserId
        ? filterAttendeesForUser(attendees, normalizedUserId)
        : [];
    const recording = (rawEvent as EventDocument)?.recording ?? null;
    const hasRecording =
      typeof (rawEvent as EventDocument)?.hasRecording === "boolean"
        ? (rawEvent as EventDocument).hasRecording
        : Boolean(
            (recording as EventRecording | null)?.videoUrl ||
              (recording as EventRecording | null)?.downloadUrl ||
              (recording as EventRecording | null)?.captionFile
          );
    const normalizedRecording = recording
      ? {
          ...recording,
          chapters: Array.isArray(recording.chapters) ? recording.chapters : [],
        }
      : null;

    return {
      ...rawEvent,
      status,
      statusOverride,
      attendees: sanitizedAttendees,
      resources: resourcesWithAccess as EventResource[],
      attendeeCount,
      computedStatus,
      isUserAttendee,
      registrationOpen: Boolean(rawEvent.registrationOpen),
      recording: normalizedRecording,
      hasRecording,
      registrationUrl: rawEvent.registrationUrl,
    };
  } catch (error) {
    console.error("Error fetching event by slug:", {
      slug: normalizedSlug,
      userId: normalizedUserId,
      error,
    });
    return null;
  }
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

export const getUserRegistrationsWithEvents = async (userId?: string | null) => {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedEmail = normalizedUserId.includes("@") ? normalizedUserId.toLowerCase() : "";
  const normalizedClerkId = normalizedEmail ? "" : normalizedUserId;

  if (!normalizedUserId) {
    return [];
  }

  const fetchRegistrations = unstable_cache(
    async () => {
      try {
        const { data } = await sanityFetch({
          query: USER_REGISTRATIONS_WITH_EVENTS_QUERY,
          params: {
            email: normalizedEmail,
            clerkUserId: normalizedClerkId,
          },
        });

        const registrations: EventRegistrationDocument[] = Array.isArray(data) ? data : [];
        const now = new Date();

        const normalizedRegistrations: UserRegistrationWithEvent[] = registrations.map((registration) => {
          const event = registration?.event ?? null;
          const eventStatus = computeEventStatus(event, now);
          const registrationStatus = computeRegistrationStatus(registration, event, eventStatus, now);
          const registrationType = normalizeRegistrationType(registration?.registrationType);
          const isTeamLead = registrationType === "team_lead";
          const teamMembers =
            isTeamLead && Array.isArray(registration.teamMembers)
              ? registration.teamMembers.map((member) => ({
                  name: typeof member?.name === "string" ? member.name.trim() : undefined,
                  email: typeof member?.email === "string" ? member.email.trim() : undefined,
                  jobTitle:
                    typeof member?.jobTitle === "string" ? member.jobTitle.trim() : undefined,
                }))
              : [];

          return {
            ...registration,
            event,
            eventId: event?._id,
            eventSlug: event?.slug || registration?.eventSlug,
            eventStatus,
            registrationStatus,
            isRegistrationClosed: isRegistrationClosed(event, now),
            isTeamLead,
            teamMembers,
            registrationType,
            guestsCount: Math.max(1, registration?.guestsCount || 1),
          };
        });

        return sortRegistrationsByEventDate(normalizedRegistrations);
      } catch (error) {
        console.error("Error fetching user registrations with events:", {
          userId: normalizedUserId,
          error,
        });
        return [];
      }
    },
    ["user-registrations-with-events", normalizedUserId],
    { revalidate: 180, tags: ["events", "user-events", normalizedUserId] }
  );

  return fetchRegistrations();
};
