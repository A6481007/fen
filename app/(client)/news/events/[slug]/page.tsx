import { computeEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { getRegistrationStatus } from "@/sanity/helpers/countdown";
import { getEventBySlug, getNewsArticles } from "@/sanity/queries";
import { urlFor } from "@/sanity/lib/image";
import { auth } from "@clerk/nextjs/server";
import dayjs from "dayjs";
import { notFound } from "next/navigation";

import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import EventDetailPageClient from "./EventDetailPageClient";

export const dynamic = "force-dynamic";

const resolveSlug = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { current?: string }).current === "string") {
    return (value as { current?: string }).current as string;
  }
  return "";
};

const formatDateTime = (value?: string | null, fallback: string = "Date TBA") => {
  if (!value) return fallback;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return fallback;
  return parsed.format("dddd, MMMM D, YYYY h:mm A");
};

const normalizeCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const formatCurrency = (value?: number | null, currency?: string | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
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

const EventDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const normalizedSlug = typeof slug === "string" ? slug : "";
  const { userId } = await auth();
  const event = await getEventBySlug(normalizedSlug, userId ?? null);

  if (!event) return notFound();

  const resolvedSlug =
    resolveSlug(event.slug) || normalizedSlug || (typeof event._id === "string" ? event._id : "");

  const computedStatus =
    event.computedStatus ||
    computeEventStatus({
      date: event.date,
      status: event.status as EventStatus,
      statusOverride: event.statusOverride as EventStatus,
    });

  const now = dayjs();
  const eventMoment = event.date ? dayjs(event.date) : null;
  const hasValidEventDate = Boolean(eventMoment?.isValid());
  const hasPassed = hasValidEventDate ? eventMoment!.isBefore(now, "minute") : false;
  const isSameDay = hasValidEventDate ? eventMoment!.isSame(now, "day") : false;
  const derivedStatus =
    hasValidEventDate && hasPassed ? (isSameDay ? "ongoing" : "ended") : computedStatus;

  const registrationStatus = getRegistrationStatus(event, now.toDate());
  const isAttendee = Boolean(event.isUserAttendee);
  const isUpcoming = derivedStatus === "upcoming";
  const isOngoing = derivedStatus === "ongoing";
  const isEnded = derivedStatus === "ended";
  const capacity = normalizeCount(event.maxAttendees);
  const minTeamSize = normalizeCount(event.minTeamSize);
  const maxTeamSize = normalizeCount(event.maxTeamSize);
  const attendeeCount = normalizeCount(event.attendeeCount);
  const spotsRemaining =
    capacity !== null && attendeeCount !== null ? Math.max(0, capacity - attendeeCount) : null;
  const isFull = capacity !== null && attendeeCount !== null ? attendeeCount >= capacity : false;
  const registrationIsOpen =
    registrationStatus === "open" ||
    registrationStatus === "closing_soon" ||
    registrationStatus === "early_bird";
  const canRegister = !isAttendee && registrationIsOpen && !isFull && !isEnded;
  const canAccessResources = isAttendee && (isOngoing || isEnded);
  const earlyBirdMoment = event.earlyBirdDeadline ? dayjs(event.earlyBirdDeadline) : null;
  const isEarlyBird = Boolean(earlyBirdMoment?.isValid() && earlyBirdMoment.isAfter(now));
  const heroImage = event.image
    ? urlFor(event.image).width(1400).height(720).fit("crop").url()
    : null;
  const formattedDate = formatDateTime(event.date);
  const attendeeProfile =
    Array.isArray(event.attendees) && event.attendees.length ? event.attendees[0] : null;
  const eventResources = Array.isArray(event.resources) ? event.resources : [];
  const agendaItems = Array.isArray(event.agenda) ? event.agenda : [];
  const speakers = Array.isArray(event.speakers) ? event.speakers : [];
  const registrationFeeLabel = formatCurrency(event.registrationFee, event.currency);
  const registrationDeadlineLabel = event.registrationDeadline
    ? formatDateTime(event.registrationDeadline, "Registration deadline not set")
    : null;
  const earlyBirdLabel =
    isEarlyBird && earlyBirdMoment?.isValid()
      ? formatDateTime(event.earlyBirdDeadline, "Early bird deadline")
      : null;
  const earlyBirdBadgeLabel =
    isEarlyBird && earlyBirdMoment?.isValid()
      ? earlyBirdMoment.format("MMM D, YYYY h:mm A")
      : null;
  const isB2B = Array.isArray(event.targetAudience) && event.targetAudience.length > 0;

  const relatedArticles = event._id
    ? await getNewsArticles({
        linkedEvent: event._id,
        limit: 3,
        offset: 0,
        sort: "newest",
      })
    : null;

  const relatedItems: NewsArticleListItem[] = Array.isArray(relatedArticles?.items)
    ? (relatedArticles.items as NewsArticleListItem[])
    : [];

  const registrationStatusKey = (() => {
    if (isEnded || registrationStatus === "ended") return "client.eventDetail.registrationStatus.ended";
    if (isFull || registrationStatus === "waitlist") return "client.eventDetail.registrationStatus.waitlist";
    if (registrationStatus === "closing_soon") return "client.eventDetail.registrationStatus.closingSoon";
    if (registrationStatus === "early_bird") return "client.eventDetail.registrationStatus.earlyBird";
    if (registrationStatus === "closed" || event.registrationOpen === false)
      return "client.eventDetail.registrationStatus.closed";
    if (isOngoing) return "client.eventDetail.registrationStatus.liveNow";
    if (registrationIsOpen) return "client.eventDetail.registrationStatus.open";
    return "client.eventDetail.registrationStatus.closed";
  })();

  const timeUntil: { unit: "days" | "hours"; count: number } | null =
    isUpcoming && eventMoment
      ? eventMoment.diff(now, "minute") > 0
        ? eventMoment.diff(now, "hour") >= 24
          ? { unit: "days", count: eventMoment.diff(now, "day") }
          : { unit: "hours", count: Math.max(1, eventMoment.diff(now, "hour")) }
        : null
      : null;

  return (
    <EventDetailPageClient
      event={event}
      relatedItems={relatedItems}
      heroImage={heroImage}
      formattedDate={formattedDate}
      derivedStatus={derivedStatus}
      registrationStatus={registrationStatus}
      registrationStatusKey={registrationStatusKey}
      registrationIsOpen={registrationIsOpen}
      canRegister={canRegister}
      isAttendee={isAttendee}
      isEnded={isEnded}
      isFull={isFull}
      isOngoing={isOngoing}
      isUpcoming={isUpcoming}
      canAccessResources={canAccessResources}
      isB2B={isB2B}
      resolvedSlug={resolvedSlug}
      attendeeProfile={attendeeProfile}
      eventResources={eventResources}
      agendaItems={agendaItems}
      speakers={speakers}
      capacity={capacity}
      minTeamSize={minTeamSize}
      maxTeamSize={maxTeamSize}
      attendeeCount={attendeeCount}
      spotsRemaining={spotsRemaining}
      registrationFeeLabel={registrationFeeLabel}
      registrationDeadlineLabel={registrationDeadlineLabel}
      earlyBirdLabel={earlyBirdLabel}
      earlyBirdBadgeLabel={earlyBirdBadgeLabel}
      timeUntil={timeUntil}
    />
  );
};

export default EventDetailPage;
