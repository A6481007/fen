"use client";

import ContentCard, { type ContentCardBadge, type ContentCardMetadata } from "@/components/shared/ContentCard";
import { pickLocalized } from "@/lib/news/localize";
import { buildEventPath } from "@/lib/paths";
import { computeEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { getRegistrationStatus } from "@/sanity/helpers/countdown";
import { urlFor } from "@/sanity/lib/image";
import { CalendarDays, CalendarPlus, Clock3, MapPin, Play, Ticket, Users, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export type EventListItem = {
  _id?: string;
  title?: string | null;
  titleTh?: string | null;
  slug?: string | { current?: string | null } | null;
  description?: string | null;
  descriptionTh?: string | null;
  contentType?: string | null;
  format?: string | null;
  availabilityStatus?: string | null;
  industries?: string[] | null;
  useCases?: string[] | null;
  date?: string | null;
  endDate?: string | null;
  timezone?: string | null;
  location?: string | null;
  mode?: string | null;
  image?: unknown;
  registrationOpen?: boolean | null;
  maxAttendees?: number | null;
  registrationDeadline?: string | null;
  teamRegistrationEnabled?: boolean | null;
  registrationFee?: number | null;
  currency?: string | null;
  status?: EventStatus | string | null;
  statusOverride?: EventStatus | string | null;
  computedStatus?: EventStatus;
  attendeeCount?: number | null;
  eventType?: string | null;
  registrationUrl?: string | null;
  hasRecording?: boolean;
};

const formatDateTime = (
  value?: string | null,
  timezone?: string | null,
  fallbackLabel: string = "Date TBA"
) => {
  if (!value) return fallbackLabel;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallbackLabel;

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || undefined,
      timeZoneName: timezone ? "short" : undefined,
    }).format(date);
  } catch {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
};

const formatDateTimeOrNull = (value?: string | null, timezone?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || undefined,
      timeZoneName: timezone ? "short" : undefined,
    }).format(date);
  } catch {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
};

const buildEventHref = (event: EventListItem, basePath: string = "/news/events") =>
  buildEventPath({
    slug: event.slug ?? undefined,
    date: event.date,
    basePath,
    includeDateSegments: basePath === "/events",
  });

const resolveEventSlug = (value?: EventListItem["slug"], fallback?: string | null) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.current === "string") {
    return value.current.trim();
  }
  return typeof fallback === "string" ? fallback.trim() : "";
};

const normalizeCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const formatEventType = (value?: string | null) => {
  if (!value || typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  return normalized
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatCurrency = (
  value?: number | null,
  currency?: string | null,
  freeLabel: string = "Free"
) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;

  if (value <= 0) return freeLabel;

  const normalizedCurrency = typeof currency === "string" && currency.trim() ? currency.trim() : "THB";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${normalizedCurrency} ${value.toFixed(2)}`;
  }
};

const STATUS_STYLES: Record<EventStatus, string> = {
  upcoming: "border-ink/15 bg-surface-1 text-ink",
  ongoing: "border-accent-red bg-accent-red-muted text-accent-red",
  ended: "border-border bg-surface-2 text-ink-muted",
};

const EventCard = ({
  event,
  basePath = "/events",
  language,
  addToCalendarLabel,
}: {
  event: EventListItem;
  basePath?: string;
  language?: string;
  addToCalendarLabel?: string;
}) => {
  const { t, i18n } = useTranslation();
  const resolvedLanguage = language || i18n.language;
  const status =
    event.computedStatus ||
    computeEventStatus({
      date: event.date,
      status: event.status as EventStatus,
      statusOverride: event.statusOverride as EventStatus,
    });

  const registrationStatus = getRegistrationStatus({
    date: event.date,
    status: event.status as EventStatus,
    statusOverride: event.statusOverride as EventStatus,
    registrationOpen: event.registrationOpen,
    registrationDeadline: event.registrationDeadline,
    maxAttendees: event.maxAttendees,
    attendeeCount: event.attendeeCount,
  });

  const imageUrl = event.image ? urlFor(event.image).width(900).height(520).fit("crop").url() : null;
  const dateLabel = formatDateTime(event.date, event.timezone, t("client.eventCard.date.tba"));
  const registrationDeadlineLabel = formatDateTimeOrNull(event.registrationDeadline, event.timezone);
  const eventTypeLabel = formatEventType(event.eventType);
  const modeLabel = formatEventType(event.mode);
  const freeLabel = t("client.eventCard.price.free");
  const priceLabel = formatCurrency(event.registrationFee, event.currency, freeLabel);
  const capacity = normalizeCount(event.maxAttendees);
  const attendeeCount = normalizeCount(event.attendeeCount);
  const remaining =
    capacity !== null && attendeeCount !== null ? Math.max(0, capacity - attendeeCount) : null;
  const remainingPercentage =
    capacity !== null && capacity > 0 && remaining !== null ? remaining / capacity : null;
  const isEventEnded = status === "ended";
  const isFull = capacity !== null && attendeeCount !== null ? attendeeCount >= capacity : false;
  const registrationOpen =
    registrationStatus === "open" ||
    registrationStatus === "closing_soon" ||
    registrationStatus === "early_bird";
  const registrationLabel = (() => {
    if (registrationStatus === "ended" || isEventEnded) return t("client.eventCard.registration.ended");
    if (registrationStatus === "waitlist" || isFull) return t("client.eventCard.registration.atCapacity");
    if (registrationStatus === "closed") return t("client.eventCard.registration.closed");
    if (registrationStatus === "closing_soon") return t("client.eventCard.registration.closingSoon");
    if (registrationStatus === "early_bird") return t("client.eventCard.registration.earlyBird");
    return t("client.eventCard.registration.open");
  })();
  const registrationBadgeClass =
    registrationStatus === "closed" || registrationStatus === "waitlist"
      ? "border-border bg-surface-2 text-ink-muted"
      : registrationStatus === "closing_soon"
      ? "border-accent-red bg-accent-red-muted text-accent-red"
      : registrationStatus === "ended" || isEventEnded
      ? STATUS_STYLES.ended
      : "border-ink/15 bg-surface-1 text-ink";
  const detailHref = buildEventHref(event, basePath);
  const eventSlug = resolveEventSlug(event.slug, event._id || null);
  const calendarHref = eventSlug ? `/api/events/${encodeURIComponent(eventSlug)}/calendar` : "";
  const registrationAnchor = `${detailHref}#registration`;
  const isViewRecording = Boolean(event.hasRecording && isEventEnded);
  const primaryLabel = registrationOpen
    ? t("client.eventCard.actions.rsvp")
    : isViewRecording
    ? t("client.eventCard.actions.viewRecording")
    : t("client.eventCard.actions.viewDetails");
  const primaryHref = registrationOpen
    ? event.registrationUrl || registrationAnchor
    : isViewRecording
    ? `${detailHref}#recording`
    : detailHref;
  const primaryIcon = isViewRecording ? <Play className="h-4 w-4" /> : <Ticket className="h-4 w-4" />;

  const badges: ContentCardBadge[] = [];

  if (eventTypeLabel) {
    badges.push({
      label: eventTypeLabel,
      variant: "outline",
      colorClassName: "border-blue-200 bg-blue-50 text-blue-800",
    });
  }

  badges.push({
    label: t(`client.eventCard.status.${status}`),
    variant: "outline",
    colorClassName: STATUS_STYLES[status],
  });

  badges.push({
    label: registrationLabel,
    variant: "outline",
    colorClassName: registrationBadgeClass,
  });

  const deadlineState: "open" | "closing_soon" | "closed" = (() => {
    if (!registrationDeadlineLabel) return registrationOpen ? "open" : "closed";
    if (registrationStatus === "closing_soon") return "closing_soon";
    if (registrationStatus === "closed" || registrationStatus === "waitlist" || registrationStatus === "ended") {
      return "closed";
    }
    return registrationOpen ? "open" : "closed";
  })();

  if (registrationDeadlineLabel) {
    badges.push({
      label: t("client.eventCard.registration.deadline", { date: registrationDeadlineLabel }),
      variant: "outline",
      colorClassName:
        deadlineState === "closed"
          ? "border-border-strong bg-surface-2 text-ink-muted"
          : deadlineState === "closing_soon"
          ? "border-accent-red bg-accent-red-muted text-accent-red"
          : "border-ink/15 bg-surface-1 text-ink",
      icon: <Clock3 className="h-3.5 w-3.5" />,
    });
  }

  const showLowSpotsBadge =
    registrationOpen && typeof remaining === "number" && typeof remainingPercentage === "number" && remaining > 0
      ? remainingPercentage < 0.2
      : false;

  if (showLowSpotsBadge && typeof remaining === "number") {
    badges.push({
      label: t("client.eventCard.spotsLeft", { count: remaining }),
      variant: "outline",
      colorClassName:
        remaining === 0
          ? "border-border-strong bg-surface-2 text-ink-muted"
          : "border-accent-red bg-accent-red-muted text-accent-red",
      icon: <Users className="h-3.5 w-3.5" />,
    });
  }

  if (event.teamRegistrationEnabled) {
    badges.push({
      label: t("client.eventCard.teamRegistration"),
      variant: "outline",
      colorClassName: "border-indigo-200 bg-indigo-50 text-indigo-800",
    });
  }

  if (priceLabel) {
    badges.push({
      label: priceLabel,
      variant: "outline",
      colorClassName: "border-ink/15 bg-surface-1 text-ink",
    });
  }

  if (event.hasRecording && isEventEnded) {
    badges.push({
      label: t("client.eventCard.recording"),
      variant: "outline",
      colorClassName: "border-ink bg-surface-0 text-ink-strong",
      icon: <Clock3 className="h-3.5 w-3.5" />,
    });
  }

  const metadata: ContentCardMetadata[] = [];

  if (dateLabel) {
    metadata.push({
      icon: <CalendarDays className="h-4 w-4" />,
      label: t("client.eventCard.meta.date"),
      value: <time dateTime={event.date ?? undefined}>{dateLabel}</time>,
    });
  }

  if (registrationDeadlineLabel) {
    metadata.push({
      icon: <Clock3 className="h-4 w-4" />,
      label: t("client.eventCard.meta.registerBy"),
      value: <time dateTime={event.registrationDeadline ?? undefined}>{registrationDeadlineLabel}</time>,
    });
  }

  if (event.location) {
    metadata.push({
      icon: <MapPin className="h-4 w-4" />,
      label:
        event.mode === "online"
          ? t("client.eventCard.meta.online")
          : t("client.eventCard.meta.location"),
      value: event.location,
    });
  }

  if (modeLabel) {
    metadata.push({
      icon: <Clock3 className="h-4 w-4" />,
      label: t("client.eventCard.meta.mode"),
      value: modeLabel,
    });
  }

  if (typeof remaining === "number") {
    metadata.push({
      icon: <Users className="h-4 w-4" />,
      label: t("client.eventCard.meta.spotsLeft"),
      value:
        remaining === 0
          ? t("client.eventCard.meta.full")
          : t("client.eventCard.meta.spotsLeftValue", { count: remaining }),
    });
  } else if (typeof capacity === "number") {
    metadata.push({
      icon: <Users className="h-4 w-4" />,
      label: t("client.eventCard.meta.capacity"),
      value: capacity,
    });
  }

  const industries = Array.isArray(event.industries) ? event.industries.filter(Boolean) : [];
  if (industries.length) {
    const label = industries.slice(0, 2).join(", ");
    metadata.push({
      icon: <Tag className="h-4 w-4" />,
      label: t("client.eventCard.meta.industry"),
      value: industries.length > 2 ? `${label} +${industries.length - 2}` : label,
    });
  }

  const useCases = Array.isArray(event.useCases) ? event.useCases.filter(Boolean) : [];
  if (useCases.length) {
    const label = useCases.slice(0, 2).join(", ");
    metadata.push({
      icon: <Tag className="h-4 w-4" />,
      label: t("client.eventCard.meta.useCase"),
      value: useCases.length > 2 ? `${label} +${useCases.length - 2}` : label,
    });
  }

  if (event.availabilityStatus) {
    metadata.push({
      icon: <Ticket className="h-4 w-4" />,
      label: t("client.eventCard.meta.audience"),
      value: event.availabilityStatus,
    });
  }

  const titleFallback = t("client.eventCard.titleFallback");
  const title = pickLocalized(resolvedLanguage, event.title, event.titleTh) || titleFallback;
  const description =
    pickLocalized(resolvedLanguage, event.description, event.descriptionTh) || "";
  const resolvedTitle = title || titleFallback;
  const calendarLabel = addToCalendarLabel || t("client.eventCard.actions.addToCalendar");

  const secondaryAction =
    calendarHref && status !== "ended" && Boolean(event.date)
      ? {
          label: calendarLabel,
          href: calendarHref,
          ariaLabel: t("client.eventCard.actions.ariaCalendar", {
            title: resolvedTitle,
          }),
          icon: <CalendarPlus className="h-4 w-4" />,
          target: "_blank",
          rel: "noreferrer",
        }
      : {
          label: t("client.eventCard.actions.secondary"),
          href: detailHref,
          ariaLabel: t("client.eventCard.actions.ariaSecondary", {
            title: resolvedTitle,
          }),
        };

  return (
    <ContentCard
      title={title}
      description={description}
      image={{ url: imageUrl ?? undefined, alt: resolvedTitle || t("client.eventCard.imageAlt") }}
      badges={badges}
      metadata={metadata}
      layout="grid"
      size="default"
      mediaHref={detailHref}
      primaryAction={{
        label: primaryLabel,
        href: primaryHref,
        ariaLabel: t("client.eventCard.actions.ariaPrimary", {
          label: primaryLabel,
          title: resolvedTitle,
        }),
        icon: primaryIcon,
      }}
      secondaryAction={secondaryAction}
    />
  );
};

export default EventCard;
