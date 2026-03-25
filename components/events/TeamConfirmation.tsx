"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  Link as LinkIcon,
  Mail,
  MailCheck,
  MapPin,
  Phone,
  Share2,
  Users,
} from "lucide-react";

export type TeamLeadDetails = {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
};

export type TeamMemberDetails = {
  name?: string;
  email?: string;
  jobTitle?: string;
};

export type EventSummary = {
  title?: string | null;
  date?: string | null;
  location?: string | null;
  slug?: string | null;
  description?: string | null;
};

export type TeamRegistrationResult = {
  teamId?: string;
  teamSize: number;
  registrationDate?: string;
  teamLead: TeamLeadDetails;
  teamMembers: TeamMemberDetails[];
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  notes?: string;
  event?: EventSummary;
};

type TeamConfirmationProps = {
  teamLead: TeamLeadDetails;
  teamMembers: TeamMemberDetails[];
  event: EventSummary;
  teamId?: string;
  registrationDate?: string;
  manageRegistrationUrl?: string;
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

const sanitizeText = (value?: string | null) => {
  if (!value) return "";
  return String(value).replace(/[\n\r]+/g, " ").trim();
};

const buildICS = (event: EventSummary, attendees: Array<TeamLeadDetails | TeamMemberDetails>) => {
  const start = event.date ? new Date(event.date) : new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const dtStamp = formatICSDate(new Date());
  const dtStart = formatICSDate(start);
  const dtEnd = formatICSDate(end);
  const attendeeLines = attendees
    .filter((member) => member?.email)
    .map((member) => {
      const name = sanitizeText(member.name || member.email);
      return `ATTENDEE;CN=${name}:MAILTO:${member.email}`;
    });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NCS News Hub//Team Event//EN",
    "BEGIN:VEVENT",
    `UID:${event.slug || event.title || dtStart}@ncsecom`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${sanitizeText(event.title) || "Event"}`,
    event.description ? `DESCRIPTION:${sanitizeText(event.description)}` : null,
    event.location ? `LOCATION:${sanitizeText(event.location)}` : null,
    ...attendeeLines,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
};

const TeamConfirmation = ({
  teamLead,
  teamMembers,
  event,
  teamId,
  registrationDate,
  manageRegistrationUrl,
}: TeamConfirmationProps) => {
  const [copied, setCopied] = useState(false);
  const totalMembers = 1 + (Array.isArray(teamMembers) ? teamMembers.length : 0);
  const formattedDate = formatDisplayDate(event.date);
  const eventPath = event.slug ? `/news/events/${event.slug}` : "";

  const registrationDateLabel = useMemo(() => {
    if (!registrationDate) return null;
    const parsed = new Date(registrationDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString();
  }, [registrationDate]);

  const registrationLink = useMemo(() => {
    if (!eventPath) return "";
    const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
    if (typeof window === "undefined") return `${eventPath}${query}`;
    return `${window.location.origin}${eventPath}${query}`;
  }, [eventPath, teamId]);

  const copyLink = async () => {
    if (!registrationLink) return;
    try {
      await navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadAll = () => {
    const icsContent = buildICS(event, [teamLead, ...(teamMembers || [])]);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.slug || "event"}-team.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent(`Join our team for ${event.title || "this event"}`);
    const bodyLines = [
      `We're registered for ${event.title || "this event"}.`,
      formattedDate ? `When: ${formattedDate}` : null,
      event.location ? `Where: ${event.location}` : null,
      teamId ? `Team ID: ${teamId}` : null,
      registrationLink ? `Registration link: ${registrationLink}` : null,
    ].filter(Boolean);
    const body = encodeURIComponent(bodyLines.join("\n"));
    return `mailto:?subject=${subject}&body=${body}`;
  }, [event.title, event.location, formattedDate, registrationLink, teamId]);

  return (
    <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-white p-2 text-emerald-600 shadow">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800">
            <Badge className="bg-white text-emerald-700 hover:bg-white">Team confirmed</Badge>
            {teamId ? (
              <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                Team ID: {teamId}
              </Badge>
            ) : null}
            <Badge variant="outline" className="border-emerald-200 text-emerald-800">
              Members: {totalMembers}
            </Badge>
            {registrationDateLabel ? (
              <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                Registered: {registrationDateLabel}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-emerald-800">Team registration confirmed</h3>
            <p className="text-sm text-emerald-800">
              We reserved your seats for {event.title || "the event"}. A confirmation email and calendar
              invites are ready for your teammates.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-emerald-100 bg-white/80 p-4 sm:grid-cols-[1.1fr,1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Team lead</p>
            <Badge variant="outline" className="border-emerald-200 text-emerald-800">
              Lead
            </Badge>
          </div>
          <div className="space-y-1 text-emerald-900">
            <p className="text-base font-semibold">{teamLead.name || "Team lead"}</p>
            {teamLead.organization ? (
              <p className="text-sm text-emerald-700">{teamLead.organization}</p>
            ) : null}
            {teamLead.jobTitle ? (
              <p className="text-xs text-emerald-700">{teamLead.jobTitle}</p>
            ) : null}
          </div>
          <div className="space-y-2 text-sm text-emerald-900">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>{teamLead.email || "Email not provided"}</span>
            </div>
            {teamLead.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>{teamLead.phone}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              Team members ({teamMembers.length || 0})
            </p>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              {totalMembers} seats held
            </Badge>
          </div>
          <div className="divide-y divide-emerald-100 rounded-lg border border-emerald-100 bg-emerald-50/60">
            {teamMembers.length ? (
              teamMembers.map((member, index) => (
                <div
                  key={`${member.email || member.name || "member"}-${index}`}
                  className="flex items-start justify-between gap-2 px-3 py-2 text-sm text-emerald-900"
                >
                  <div>
                    <p className="font-semibold">{member.name || "Pending name"}</p>
                    {member.jobTitle ? (
                      <p className="text-xs text-emerald-700">{member.jobTitle}</p>
                    ) : null}
                    {member.email ? (
                      <p className="text-xs text-emerald-700">{member.email}</p>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-emerald-700">Team lead only</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-emerald-100 bg-white/80 p-4 text-sm text-emerald-900 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Event</p>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-semibold text-emerald-900">{event.title || "Event"}</p>
              <p className="text-xs text-emerald-700">{formattedDate}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Location</p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span>{event.location || "Location TBA"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleDownloadAll}
          className="bg-shop_dark_green text-white hover:bg-shop_light_green"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Download all calendar invites
        </Button>
        {eventPath ? (
          <Button
            asChild
            variant="outline"
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          >
            <a href={eventPath}>View event details</a>
          </Button>
        ) : null}
        <Button
          asChild
          variant="outline"
          className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
        >
          <a href={manageRegistrationUrl || "/dashboard/registrations"}>Manage registration</a>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100 bg-white/80 p-3 text-sm text-emerald-900">
        <MailCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        <span className="font-semibold text-emerald-800">Confirmation emails sent to all team members.</span>
        <span className="text-emerald-700">Share the calendar invites so everyone saves the date.</span>
      </div>

      <div className="grid gap-3 rounded-xl border border-emerald-100 bg-white/80 p-4 sm:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Share with your team</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
              onClick={copyLink}
              disabled={!registrationLink}
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              {copied ? "Link copied" : "Copy registration link"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            >
              <a href={mailtoHref}>
                <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Share via email
              </a>
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800">
            <LinkIcon className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span className="break-all">{registrationLink || "Registration link available once the event page loads."}</span>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-emerald-900">
          <div className="flex items-center gap-2 text-emerald-800">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span className="font-semibold">Team quick facts</span>
          </div>
          <p className="text-sm text-emerald-800">Team ID: {teamId || "Pending assignment"}</p>
          <p className="text-sm text-emerald-800">Seats held: {totalMembers}</p>
          <p className="text-sm text-emerald-800">Event: {event.title || "Event"}</p>
        </div>
      </div>
    </div>
  );
};

export default TeamConfirmation;
