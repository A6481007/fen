"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck2, Download, Mail, MapPin, Phone } from "lucide-react";

type AttendeeDetails = {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  organization?: string;
  jobTitle?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  registrationDate?: string;
};

type EventInfo = {
  title?: string | null;
  date?: string | null;
  location?: string | null;
  slug?: string | null;
  description?: string | null;
};

type AttendeeConfirmationProps = {
  attendee?: AttendeeDetails | null;
  event: EventInfo;
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatICSDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

const buildICS = (event: EventInfo, attendee?: AttendeeDetails | null) => {
  const start = event.date ? new Date(event.date) : new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const dtStamp = formatICSDate(new Date());
  const dtStart = formatICSDate(start);
  const dtEnd = formatICSDate(end);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NCS News Hub//Event//EN",
    "BEGIN:VEVENT",
    `UID:${event.slug || event.title || dtStart}@ncsecom`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title || "Event"}`,
    event.description ? `DESCRIPTION:${event.description}` : null,
    event.location ? `LOCATION:${event.location}` : null,
    attendee?.email ? `ATTENDEE;CN=${attendee.name || attendee.email}:MAILTO:${attendee.email}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
};

const AttendeeConfirmation = ({ attendee, event }: AttendeeConfirmationProps) => {
  const formattedDate = formatDisplayDate(event.date);
  const organizationLabel = attendee?.organization || attendee?.companyName;

  const downloadIcs = () => {
    const icsContent = buildICS(event, attendee);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.slug || "event"}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const registrationDateLabel = useMemo(() => {
    if (!attendee?.registrationDate) return null;
    const parsed = new Date(attendee.registrationDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString();
  }, [attendee?.registrationDate]);

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-white p-2 text-emerald-600 shadow">
          <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-emerald-800">You&apos;re registered!</h3>
          <p className="text-sm text-emerald-800">
            We reserved your seat for <span className="font-semibold">{event.title}</span>.
            Add it to your calendar and keep an eye on your inbox for reminders.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800">
            <Badge className="bg-white text-emerald-700 hover:bg-white">
              {formattedDate}
            </Badge>
            {registrationDateLabel ? (
              <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                Registered: {registrationDateLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-emerald-100 bg-white/80 p-3 text-sm text-emerald-900 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Attendee</p>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>{attendee?.email || "Registered email pending"}</span>
          </div>
          {attendee?.name ? <p className="font-semibold">{attendee.name}</p> : null}
          {organizationLabel ? (
            <p className="text-xs text-emerald-700">
              {organizationLabel}
              {attendee?.jobTitle ? ` • ${attendee.jobTitle}` : ""}
            </p>
          ) : attendee?.jobTitle ? (
            <p className="text-xs text-emerald-700">{attendee.jobTitle}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Details</p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>{event.location || "Location TBA"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span>{attendee?.phone || "Phone not provided"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={downloadIcs}
          className="bg-shop_dark_green text-white hover:bg-shop_light_green"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Add to calendar (.ics)
        </Button>
        {event.location ? (
          <Button
            asChild
            variant="outline"
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          >
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open directions
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default AttendeeConfirmation;
