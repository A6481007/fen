"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  Download,
  ExternalLink,
  MapPin,
  MoreVertical,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { computeCountdown } from "@/sanity/helpers/countdown";
import { urlFor } from "@/sanity/lib/image";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { useTranslation } from "react-i18next";

type RegistrationEvent = {
  title?: string | null;
  date?: string | null;
  location?: string | null;
  slug?: string | null;
  image?: SanityImageSource | string | null;
};

export type RegistrationCardProps = {
  registration: {
    id: string;
    status?: string | null;
    registrationType?: string | null;
    createdAt?: string | null;
    event: RegistrationEvent;
    teamMembers?: Array<{ name?: string | null; email?: string | null }>;
    teamId?: string | null;
  };
  onCancel?: (id: string) => void;
  onViewTeam?: (teamId: string) => void;
};

type CountdownTone = "normal" | "warning" | "critical";

const formatICSDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

const buildICS = (
  registration: RegistrationCardProps["registration"],
  fallbackTitle: string
) => {
  const event = registration.event;
  const start = event?.date ? new Date(event.date) : new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const dtStamp = formatICSDate(new Date());
  const dtStart = formatICSDate(start);
  const dtEnd = formatICSDate(end);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NCS Events//Dashboard//EN",
    "BEGIN:VEVENT",
    `UID:${event?.slug || event?.title || dtStart}@ncs`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event?.title || fallbackTitle}`,
    event?.location ? `LOCATION:${event.location}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
};

const countdownToneClass: Record<CountdownTone, string> = {
  normal: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
};

const RegistrationCard = ({
  registration,
  onCancel,
  onViewTeam,
}: RegistrationCardProps) => {
  const { t, i18n } = useTranslation();
  const statusStyles = useMemo(
    () => ({
      confirmed: {
        label: t("client.registrations.status.confirmed"),
        className: "bg-emerald-100 text-emerald-800 border-emerald-200",
      },
      waitlisted: {
        label: t("client.registrations.status.waitlisted"),
        className: "bg-amber-100 text-amber-900 border-amber-200",
      },
      cancelled: {
        label: t("client.registrations.status.cancelled"),
        className: "bg-slate-100 text-slate-500 border-slate-200",
        strike: true,
      },
    }),
    [t]
  );

  const registrationTypeLabel = (value?: string | null) => {
    const normalized = (value || "").toLowerCase();
    if (normalized === "team_lead" || normalized === "team lead") {
      return t("client.registrations.type.teamLead");
    }
    if (normalized === "team_member" || normalized === "team member") {
      return t("client.registrations.type.teamMember");
    }
    return t("client.registrations.type.individual");
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return t("client.registrations.dates.tbaLong");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t("client.registrations.dates.tbaLong");
    }
    return parsed.toLocaleString(i18n.language, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (value?: string | null) => {
    if (!value) return t("client.registrations.dates.tbaShort");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t("client.registrations.dates.tbaShort");
    }
    return parsed.toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const resolveStatus = (status?: string | null) => {
    const normalized = (status || "").toLowerCase();
    const match = statusStyles[normalized as keyof typeof statusStyles];
    const resolved =
      match || {
        label: status || t("client.registrations.status.pending"),
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    return { ...resolved, value: normalized };
  };

  const status = resolveStatus(registration.status);
  const isCancelled =
    status.value === "cancelled" || status.value === "archived";
  const normalizedRegistrationType = (registration.registrationType || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();
  const isTeamLead =
    normalizedRegistrationType === "team lead" ||
    normalizedRegistrationType === "teamlead";
  const eventUrl = registration.event.slug
    ? `/news/events/${registration.event.slug}`
    : "/news/events";
  const eventDateLabel = formatDateTime(registration.event.date);
  const registrationDateLabel = formatDate(registration.createdAt);
  const teamCount = registration.teamMembers?.length || 0;

  const eventDate = useMemo(() => {
    if (!registration.event.date) return null;
    const parsed = new Date(registration.event.date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [registration.event.date]);

  const [countdown, setCountdown] = useState<{
    label: string;
    tone: CountdownTone;
  } | null>(null);

  useEffect(() => {
    if (!eventDate) {
      setCountdown(null);
      return;
    }

    const update = () => {
      const next = computeCountdown(eventDate);
      if (next.isExpired) {
        setCountdown(null);
        return;
      }

      const tone: CountdownTone = next.isCritical
        ? "critical"
        : next.isPastWarning
        ? "warning"
        : "normal";

      setCountdown({ label: next.label, tone });
    };

    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [eventDate]);

  const imageUrl = useMemo(() => {
    if (!registration.event.image) return null;
    if (typeof registration.event.image === "string") {
      return registration.event.image;
    }
    return urlFor(registration.event.image as SanityImageSource)
      .width(520)
      .height(320)
      .fit("crop")
      .url();
  }, [registration.event.image]);

  const handleDownloadCalendar = () => {
    try {
      const icsContent = buildICS(
        registration,
        t("client.registrations.ics.eventFallback")
      );
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${registration.event.slug || t("client.registrations.ics.filenameFallback")}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ICS download failed", error);
    }
  };

  const handleCancel = () => {
    if (!onCancel) return;
    const confirmed = window.confirm(
      t("client.registrations.cancel.confirm")
    );
    if (confirmed) {
      onCancel(registration.id);
    }
  };

  const handleViewTeam = () => {
    if (!onViewTeam || !registration.teamId) return;
    onViewTeam(registration.teamId);
  };

  return (
    <Card className="overflow-hidden border border-slate-100 shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 w-full shrink-0 bg-slate-50 sm:h-auto sm:w-48">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={registration.event.title || t("client.registrations.card.imageAlt")}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 12rem"
              priority={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-shop_light_bg to-white text-shop_dark_green">
              <Ticket className="h-6 w-6" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                "border-white/70 bg-white/90 text-xs font-semibold shadow-sm backdrop-blur-sm",
                status.className,
                (status as { strike?: boolean }).strike ? "line-through" : ""
              )}
            >
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={cn(
                    "text-base font-semibold text-slate-900 sm:text-lg",
                    isCancelled ? "line-through text-slate-500" : ""
                  )}
                >
                  {registration.event.title || t("client.registrations.card.titleFallback")}
                </h3>
                <Badge
                  variant="outline"
                  className="border-shop_light_green/50 bg-shop_light_green/20 text-shop_dark_green"
                >
                  {registrationTypeLabel(registration.registrationType)}
                </Badge>
                {isTeamLead && registration.teamId ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                  >
                    <Users className="mr-1 h-3.5 w-3.5" />
                    {t("client.registrations.card.teamLeadBadge")}
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  <time dateTime={registration.event.date || undefined}>
                    {eventDateLabel}
                  </time>
                </span>
                {registration.event.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {registration.event.location}
                  </span>
                ) : null}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-slate-800"
                  aria-label={t("client.registrations.card.actionsLabel")}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={eventUrl} className="cursor-pointer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("client.registrations.card.actions.viewEvent")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleDownloadCalendar();
                  }}
                  className="cursor-pointer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("client.registrations.card.actions.downloadCalendar")}
                </DropdownMenuItem>
                {isTeamLead && registration.teamId ? (
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleViewTeam();
                    }}
                    className="cursor-pointer"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {t("client.registrations.card.actions.manageTeam")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleCancel();
                  }}
                  className="cursor-pointer text-rose-600 focus:text-rose-700"
                  disabled={isCancelled || !onCancel}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("client.registrations.card.actions.cancel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
                className={cn(
                  "border-slate-200 bg-slate-50 text-slate-700",
                  status.className,
                  (status as { strike?: boolean }).strike ? "line-through" : ""
                )}
              >
                {status.label}
              </Badge>
            {countdown ? (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 border text-xs font-semibold",
                  countdownToneClass[countdown.tone]
                )}
              >
                <Clock3 className="h-4 w-4" />
                {countdown.label}
              </Badge>
            ) : null}
            {teamCount > 0 ? (
              <Badge variant="outline" className="gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-800">
                <Users className="h-4 w-4" />
                {t("client.registrations.card.teamCount", { count: teamCount })}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {t("client.registrations.card.registeredOn")}{" "}
              <span className="font-medium text-foreground">
                {registrationDateLabel}
              </span>
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-shop_light_green/60 text-shop_dark_green hover:bg-shop_light_green/30"
            >
              <Link href={eventUrl}>
                {t("client.registrations.card.actions.viewEvent")}
                <ExternalLink className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RegistrationCard;
