"use client";

import LockBadge from "@/components/shared/LockBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import dayjs from "dayjs";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

type EventCTACardProps = {
  event: {
    title?: string | null;
    slug?: string | null;
    date?: string | null;
    location?: string | null;
    status?: EventStatus | string | null;
    statusOverride?: EventStatus | string | null;
    registrationOpen?: boolean | null;
  };
  hasLockedAttachments?: boolean;
};

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "client.newsArticle.event.status.upcoming",
  ongoing: "client.newsArticle.event.status.ongoing",
  ended: "client.newsArticle.event.status.ended",
};

const EventCTACard = ({ event, hasLockedAttachments = false }: EventCTACardProps) => {
  const { t } = useTranslation();
  const eventStatus = computeEventStatus({
    date: event?.date,
    status: event?.status as EventStatus,
    statusOverride: event?.statusOverride as EventStatus,
  });

  const statusLabel = t(STATUS_LABELS[eventStatus]);
  const isClosed = eventStatus === "ended" || event.registrationOpen === false;
  const eventHref = event?.slug ? `/news/events/${event.slug}` : "/news/events";
  const formattedDate = event?.date ? dayjs(event.date).format("MMMM D, YYYY h:mm A") : null;
  const unlockMessage =
    hasLockedAttachments && eventStatus !== "ended"
      ? t("client.newsArticle.event.unlockMessage", {
          date: formattedDate || t("client.newsArticle.event.unlockDateFallback"),
        })
      : null;

  return (
    <Card className="border border-gray-100 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
          <Ticket className="h-5 w-5" aria-hidden="true" />
          {t("client.newsArticle.event.title")}
        </CardTitle>
        <p className="text-sm text-gray-600">
          {t("client.newsArticle.event.subtitle")}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-shop_dark_green">
            <span className="rounded-full bg-shop_light_bg px-3 py-1 text-xs text-shop_dark_green">
              {statusLabel}
            </span>
            {event.registrationOpen === false ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                {t("client.newsArticle.event.registrationClosed")}
              </span>
            ) : null}
          </div>
          <p className="text-lg font-bold text-gray-900">{event?.title || t("client.newsArticle.event.fallbackTitle")}</p>
          {formattedDate ? (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <time dateTime={event?.date || undefined}>{formattedDate}</time>
            </div>
          ) : null}
          {event?.location ? (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{event.location}</span>
            </div>
          ) : null}
        </div>

        {unlockMessage ? <LockBadge reason={unlockMessage} /> : null}

        {isClosed ? (
          <Button disabled className="w-full bg-gray-200 text-gray-600">
            {eventStatus === "ended"
              ? t("client.newsArticle.event.status.ended")
              : t("client.newsArticle.event.registrationClosed")}
          </Button>
        ) : (
          <Button
            asChild
            className="w-full bg-shop_dark_green hover:bg-shop_light_green"
          >
            <Link href={eventHref}>{t("client.newsArticle.event.register")}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCTACard;
