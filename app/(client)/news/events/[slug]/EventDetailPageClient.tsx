"use client";

import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import ArticleGrid from "@/components/news/ArticleGrid";
import AgendaTimeline from "@/components/events/AgendaTimeline";
import GatedResources, { type EventResourceItem } from "@/components/events/GatedResources";
import RegistrationPanel from "@/components/events/RegistrationPanel";
import SpeakersGrid, { type EventSpeaker } from "@/components/events/SpeakersGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import { CalendarDays, CalendarPlus, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { pickLocalized } from "@/lib/news/localize";

type EventDetailPageClientProps = {
  event: any;
  relatedItems: NewsArticleListItem[];
  heroImage?: string | null;
  formattedDate: string;
  derivedStatus: "upcoming" | "ongoing" | "ended";
  registrationStatus: string;
  registrationStatusKey: string;
  registrationIsOpen: boolean;
  canRegister: boolean;
  isAttendee: boolean;
  isEnded: boolean;
  isFull: boolean;
  isOngoing: boolean;
  isUpcoming: boolean;
  canAccessResources: boolean;
  isB2B: boolean;
  resolvedSlug: string;
  attendeeProfile?: any;
  eventResources: EventResourceItem[];
  agendaItems: Array<{ time?: string; title?: string; description?: string; speaker?: string }>;
  speakers: EventSpeaker[];
  capacity?: number | null;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  attendeeCount?: number | null;
  spotsRemaining?: number | null;
  registrationFeeLabel?: string | null;
  registrationDeadlineLabel?: string | null;
  earlyBirdLabel?: string | null;
  earlyBirdBadgeLabel?: string | null;
  timeUntil?: { unit: "days" | "hours"; count: number } | null;
};

const EventDetailPageClient = ({
  event,
  relatedItems,
  heroImage,
  formattedDate,
  derivedStatus,
  registrationStatusKey,
  canRegister,
  isAttendee,
  isEnded,
  isFull,
  canAccessResources,
  isB2B,
  resolvedSlug,
  attendeeProfile,
  eventResources,
  agendaItems,
  speakers,
  capacity,
  minTeamSize,
  maxTeamSize,
  attendeeCount,
  spotsRemaining,
  registrationFeeLabel,
  registrationDeadlineLabel,
  earlyBirdLabel,
  earlyBirdBadgeLabel,
  timeUntil,
}: EventDetailPageClientProps) => {
  const { t, i18n } = useTranslation();
  const statusLabel = t(`client.eventDetail.status.${derivedStatus}`);
  const registrationStatusLabel = t(registrationStatusKey);
  const localizedTitle =
    pickLocalized(i18n.language, event?.title, event?.titleTh) ||
    t("client.eventDetail.breadcrumb.event");
  const localizedDescription = pickLocalized(
    i18n.language,
    event?.description,
    event?.descriptionTh
  );
  const calendarHref =
    resolvedSlug && event?.date
      ? `/api/events/${encodeURIComponent(resolvedSlug)}/calendar`
      : "";

  const capacityLabel = useMemo(() => {
    if (capacity === null || capacity === undefined || attendeeCount === null || attendeeCount === undefined) {
      return null;
    }
    if (spotsRemaining !== null && spotsRemaining !== undefined) {
      return t("client.eventDetail.capacity.withRemaining", {
        booked: attendeeCount,
        capacity,
        remaining: spotsRemaining,
      });
    }
    return t("client.eventDetail.capacity.withoutRemaining", {
      booked: attendeeCount,
      capacity,
    });
  }, [attendeeCount, capacity, spotsRemaining, t]);

  const timeUntilLabel = useMemo(() => {
    if (!timeUntil) return null;
    if (timeUntil.unit === "days") {
      return t("client.eventDetail.timeUntil.days", { count: timeUntil.count });
    }
    return t("client.eventDetail.timeUntil.hours", { count: timeUntil.count });
  }, [t, timeUntil]);

  const breadcrumbs = useMemo(
    () => [
      { label: t("client.eventDetail.breadcrumb.news"), href: "/news" },
      { label: t("client.eventDetail.breadcrumb.events"), href: "/news/events" },
      { label: localizedTitle },
    ],
    [localizedTitle, t]
  );

  return (
    <div className="min-h-screen bg-surface-0 text-ink">
      <Container className="py-8 sm:py-10">
        <DynamicBreadcrumb customItems={breadcrumbs} />

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-10">
            <section className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-border bg-surface-1 text-ink">
                  {statusLabel}
                </Badge>
                <Badge variant="outline" className="border-border bg-surface-1 text-ink">
                  {registrationStatusLabel}
                </Badge>
                {earlyBirdBadgeLabel ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                    {t("client.eventDetail.badges.earlyBirdUntil", { date: earlyBirdBadgeLabel })}
                  </Badge>
                ) : null}
                {timeUntilLabel ? (
                  <Badge variant="outline" className="border-border bg-surface-1 text-ink">
                    {timeUntilLabel}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold text-ink-strong sm:text-4xl">
                  {localizedTitle}
                </h1>
                <p className="text-ink-muted">
                  {localizedDescription ||
                    t("client.eventDetail.hero.descriptionFallback")}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    <span>{formattedDate}</span>
                  </div>
                  {event?.location ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      <span>{event.location}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {heroImage ? (
                <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-0">
                  <Image
                    src={heroImage}
                    alt={localizedTitle || "Event"}
                    width={1400}
                    height={720}
                    className="h-auto w-full object-cover"
                    priority
                  />
                </div>
              ) : null}
            </section>

            <Card className="border border-border bg-surface-0">
              <CardHeader>
                <CardTitle className="text-lg text-ink-strong">
                  {t("client.eventDetail.overview.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-muted">
                <p>
                  {localizedDescription ||
                    t("client.eventDetail.overview.descriptionFallback")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {t("client.eventDetail.overview.scheduleLabel")}
                    </p>
                    <p className="text-sm text-ink">{formattedDate}</p>
                    <p className="text-xs text-ink-muted">
                      {t("client.eventDetail.overview.scheduleNote")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {t("client.eventDetail.overview.locationLabel")}
                    </p>
                    <p className="text-sm text-ink">
                      {event?.location || t("client.eventDetail.overview.locationFallback")}
                    </p>
                    {event?.location ? (
                      <Link
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          event.location
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-ink underline decoration-border-strong underline-offset-4"
                      >
                        {t("client.eventDetail.overview.openMaps")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-ink-strong">
                  {t("client.eventDetail.agenda.title")}
                </h2>
                {agendaItems.length > 3 ? (
                  <span className="text-sm text-ink-muted">
                    {t("client.eventDetail.agenda.moreItems", { count: agendaItems.length - 3 })}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-ink-muted">{t("client.eventDetail.agenda.timingNote")}</p>
              <AgendaTimeline agenda={agendaItems as any} />
            </section>

            {speakers.length ? (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-ink-strong">
                  {t("client.eventDetail.speakers.title")}
                </h2>
                <SpeakersGrid speakers={speakers} columns={3} />
              </section>
            ) : null}

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink-strong">
                {t("client.eventDetail.resources.title")}
              </h2>
              <GatedResources
                resources={eventResources}
                isAttendee={isAttendee}
                canAccess={canAccessResources}
                status={derivedStatus}
              />
            </section>

            {relatedItems.length ? (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-ink-strong">
                  {t("client.newsArticle.related.title")}
                </h2>
                <ArticleGrid articles={relatedItems} highlightFirst={false} />
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section id="registration">
              <RegistrationPanel
                eventId={event?._id || resolvedSlug}
                eventSlug={resolvedSlug}
                eventTitle={localizedTitle}
                eventDate={event?.date}
                eventLocation={event?.location}
                eventDescription={localizedDescription || event?.description}
                attendeeProfile={attendeeProfile}
                registrationStatusLabel={registrationStatusLabel}
                canRegister={canRegister}
                isAttendee={isAttendee}
                isEnded={isEnded}
                isFull={isFull}
                maxAttendees={capacity ?? undefined}
                attendeeCount={attendeeCount ?? undefined}
                registrationDeadline={event?.registrationDeadline}
                earlyBirdDeadline={event?.earlyBirdDeadline}
                teamRegistrationEnabled={event?.teamRegistrationEnabled}
                minTeamSize={minTeamSize ?? undefined}
                maxTeamSize={maxTeamSize ?? undefined}
                registrationFee={event?.registrationFee}
                currency={event?.currency}
              />
            </section>
            {calendarHref ? (
              <Button asChild variant="outline" className="w-full border-border">
                <a href={calendarHref} className="flex items-center justify-center gap-2" download>
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  {t("client.eventDetail.actions.addToCalendar")}
                </a>
              </Button>
            ) : null}

            <Card className="border border-border bg-surface-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-ink-strong">
                  <Ticket className="h-5 w-5" aria-hidden="true" />
                  {t("client.eventDetail.card.eventStatusLabel")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-ink-muted">
                <div className="flex items-center justify-between">
                  <span>{t("client.eventDetail.labels.registration")}</span>
                  <span className="font-semibold text-ink">{registrationStatusLabel}</span>
                </div>
                {registrationDeadlineLabel ? (
                  <div className="flex items-center justify-between">
                    <span>{t("client.eventDetail.labels.registrationDeadline")}</span>
                    <span className="font-semibold text-ink">{registrationDeadlineLabel}</span>
                  </div>
                ) : null}
                {earlyBirdLabel ? (
                  <div className="flex items-center justify-between">
                    <span>{t("client.eventDetail.labels.earlyBirdUntil")}</span>
                    <span className="font-semibold text-ink">{earlyBirdLabel}</span>
                  </div>
                ) : null}
                {registrationFeeLabel ? (
                  <div className="flex items-center justify-between">
                    <span>{t("client.eventDetail.labels.registrationFee")}</span>
                    <span className="font-semibold text-ink">{registrationFeeLabel}</span>
                  </div>
                ) : null}
                {capacityLabel ? (
                  <div className="flex items-center justify-between">
                    <span>{t("client.eventDetail.labels.capacity")}</span>
                    <span className="font-semibold text-ink">{capacityLabel}</span>
                  </div>
                ) : null}
                {spotsRemaining !== null && spotsRemaining !== undefined ? (
                  <div className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs font-semibold text-ink">
                    {t("client.eventDetail.spotsLeft", { count: spotsRemaining })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {isB2B ? (
              <Card className="border border-border bg-surface-0">
                <CardHeader>
                  <CardTitle className="text-lg text-ink-strong">
                    {t("client.eventDetail.team.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-ink-muted">
                  <p>{t("client.eventDetail.team.subtitle")}</p>
                  {minTeamSize && maxTeamSize ? (
                    <p>
                      {t("client.eventDetail.team.sizeRange", {
                        min: minTeamSize,
                        max: maxTeamSize,
                      })}
                    </p>
                  ) : minTeamSize ? (
                    <p>{t("client.eventDetail.team.minOnly", { min: minTeamSize })}</p>
                  ) : maxTeamSize ? (
                    <p>{t("client.eventDetail.team.maxOnly", { max: maxTeamSize })}</p>
                  ) : (
                    <p>{t("client.eventDetail.team.generic")}</p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card className="border border-border bg-surface-0">
              <CardHeader>
                <CardTitle className="text-lg text-ink-strong">
                  {t("client.eventDetail.directions.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-ink-muted">
                <p>
                  {event?.location
                    ? t("client.eventDetail.directions.withLocation")
                    : t("client.eventDetail.directions.withoutLocation")}
                </p>
                {event?.location ? (
                  <Button asChild variant="outline" className="w-full">
                    <Link
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        event.location
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("client.eventDetail.directions.openMaps")}
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
};

export default EventDetailPageClient;
