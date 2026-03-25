"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles, Ticket, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RegistrationForm from "./RegistrationForm";
import CountdownTimer from "./CountdownTimer";
import AttendeeConfirmation from "./AttendeeConfirmation";
import TeamConfirmation, { type TeamRegistrationResult } from "./TeamConfirmation";
import TeamRegistrationForm from "./TeamRegistrationForm";

type AttendeeSnapshot = {
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

type RegistrationPanelProps = {
  eventId: string;
  eventSlug: string;
  eventTitle?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  eventDescription?: string | null;
  attendeeProfile?: AttendeeSnapshot | null;
  registrationStatusLabel: string;
  canRegister: boolean;
  isAttendee: boolean;
  isEnded: boolean;
  isFull: boolean;
  maxAttendees?: number | null;
  attendeeCount?: number | null;
  registrationDeadline?: string | null;
  earlyBirdDeadline?: string | null;
  teamRegistrationEnabled?: boolean | null;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  registrationFee?: number | null;
  currency?: string | null;
};

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

const formatDateLabel = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const storageKey = (slug: string) => `event_rsvp_${slug}`;

const readLocalAttendee = (slug: string): AttendeeSnapshot | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as AttendeeSnapshot) : null;
  } catch {
    return null;
  }
};

const writeLocalAttendee = (slug: string, attendee: AttendeeSnapshot) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(attendee));
  } catch {
    // Best-effort only.
  }
};

const RegistrationPanel = ({
  eventId,
  eventSlug,
  eventTitle,
  eventDate,
  eventLocation,
  eventDescription,
  attendeeProfile,
  registrationStatusLabel,
  canRegister,
  isAttendee,
  isEnded,
  isFull,
  maxAttendees,
  attendeeCount,
  registrationDeadline,
  earlyBirdDeadline,
  teamRegistrationEnabled,
  minTeamSize,
  maxTeamSize,
  registrationFee,
  currency,
}: RegistrationPanelProps) => {
  const normalizedSlug = typeof eventSlug === "string" ? eventSlug.trim() : "";
  const hasSlug = normalizedSlug.length > 0;
  const [localAttendee, setLocalAttendee] = useState<AttendeeSnapshot | null>(null);
  const [teamRegistration, setTeamRegistration] = useState<TeamRegistrationResult | null>(null);

  useEffect(() => {
    if (normalizedSlug) {
      setLocalAttendee(readLocalAttendee(normalizedSlug));
    }
  }, [normalizedSlug]);

  const resolvedAttendee = useMemo<AttendeeSnapshot | null>(
    () => attendeeProfile || localAttendee || null,
    [attendeeProfile, localAttendee]
  );

  const registrationDeadlineDate = useMemo(
    () => parseDate(registrationDeadline),
    [registrationDeadline]
  );
  const earlyBirdDeadlineDate = useMemo(
    () => parseDate(earlyBirdDeadline),
    [earlyBirdDeadline]
  );

  const isRegistered = isAttendee || Boolean(resolvedAttendee);
  const registrationFeeLabel = useMemo(
    () => formatCurrency(registrationFee, currency),
    [registrationFee, currency]
  );
  const registrationDeadlineLabel = useMemo(
    () => formatDateLabel(registrationDeadline),
    [registrationDeadline]
  );
  const isEarlyBirdWindow = useMemo(
    () =>
      Boolean(earlyBirdDeadlineDate) && earlyBirdDeadlineDate!.getTime() > Date.now(),
    [earlyBirdDeadlineDate]
  );
  const earlyBirdLabel = useMemo(
    () => (isEarlyBirdWindow ? formatDateLabel(earlyBirdDeadline) : null),
    [isEarlyBirdWindow, earlyBirdDeadline]
  );
  const isTeamRegistrationEnabled = teamRegistrationEnabled !== false;
  const teamSizeCopy = useMemo(() => {
    if (minTeamSize && maxTeamSize) {
      return `${minTeamSize}-${maxTeamSize} people`;
    }
    if (minTeamSize) {
      return `${minTeamSize}+ people`;
    }
    if (maxTeamSize) {
      return `Up to ${maxTeamSize} people`;
    }
    return null;
  }, [minTeamSize, maxTeamSize]);
  const normalizedCapacity =
    typeof maxAttendees === "number" && Number.isFinite(maxAttendees) ? maxAttendees : null;
  const normalizedAttendeeCount =
    typeof attendeeCount === "number" && Number.isFinite(attendeeCount) ? attendeeCount : null;
  const spotsRemaining =
    normalizedCapacity !== null && normalizedAttendeeCount !== null
      ? Math.max(0, normalizedCapacity - normalizedAttendeeCount)
      : null;
  const [activeTab, setActiveTab] = useState<"individual" | "team">("individual");
  const [deadlineExpired, setDeadlineExpired] = useState(false);

  useEffect(() => {
    if (!isTeamRegistrationEnabled && activeTab === "team") {
      setActiveTab("individual");
    }
  }, [isTeamRegistrationEnabled, activeTab]);

  useEffect(() => {
    if (registrationDeadlineDate && registrationDeadlineDate.getTime() < Date.now()) {
      setDeadlineExpired(true);
    } else {
      setDeadlineExpired(false);
    }
  }, [registrationDeadlineDate]);

  const handleRegistered = (attendee: AttendeeSnapshot | TeamRegistrationResult) => {
    if ("teamLead" in attendee) {
      const organization = attendee.teamLead?.organization;
      const leadSnapshot = {
        name: attendee.teamLead?.name,
        email: attendee.teamLead?.email,
        phone: attendee.teamLead?.phone,
        companyName: organization,
        organization,
        jobTitle: attendee.teamLead?.jobTitle,
        dietaryRequirements: attendee.dietaryRequirements,
        accessibilityNeeds: attendee.accessibilityNeeds,
        registrationDate: attendee.registrationDate || new Date().toISOString(),
      };
      setTeamRegistration(attendee);
      setLocalAttendee(leadSnapshot);
      if (hasSlug) {
        writeLocalAttendee(normalizedSlug, leadSnapshot);
      }
      return;
    }

    const organization = attendee.organization || attendee.companyName;
    const snapshot = {
      ...attendee,
      organization,
      companyName: attendee.companyName || organization,
      registrationDate: attendee.registrationDate || new Date().toISOString(),
    };
    setLocalAttendee(snapshot);
    if (hasSlug) {
      writeLocalAttendee(normalizedSlug, snapshot);
    }
  };

  if (!hasSlug) {
    return (
      <Card className="border border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800">Registration unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800">
          We couldn&apos;t load this event&apos;s registration link. Please refresh the page and try again.
        </CardContent>
      </Card>
    );
  }

  if (teamRegistration) {
    return (
      <TeamConfirmation
        teamLead={teamRegistration.teamLead}
        teamMembers={teamRegistration.teamMembers}
        event={{
          title: eventTitle,
          date: eventDate,
          location: eventLocation,
          slug: normalizedSlug,
          description: eventDescription,
        }}
        teamId={teamRegistration.teamId}
        registrationDate={teamRegistration.registrationDate}
        manageRegistrationUrl="/dashboard/registrations"
      />
    );
  }

  if (isRegistered) {
    return (
      <AttendeeConfirmation
        attendee={resolvedAttendee}
        event={{
          title: eventTitle,
          date: eventDate,
          location: eventLocation,
          slug: normalizedSlug,
          description: eventDescription,
        }}
      />
    );
  }

  const isRegistrationClosed = deadlineExpired || !canRegister;
  const effectiveStatusLabel = deadlineExpired ? "Registration closed" : registrationStatusLabel;
  const statusBadgeTone =
    canRegister && !isRegistrationClosed
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : isFull || isRegistrationClosed
      ? "border-gray-200 bg-gray-100 text-gray-700"
      : "border-amber-200 bg-amber-50 text-amber-800";
  const hasTeamTab = isTeamRegistrationEnabled;
  const normalizedMinTeamSize = Math.max(2, minTeamSize ?? 2);
  const normalizedMaxTeamSize = Math.max(normalizedMinTeamSize, maxTeamSize ?? normalizedMinTeamSize + 8);
  const hasFee =
    typeof registrationFee === "number" && Number.isFinite(registrationFee) && registrationFee > 0;
  const isFreeEvent = !hasFee;
  const closedCopy = (() => {
    if (deadlineExpired) {
      return "The registration deadline has passed for this event.";
    }
    if (isEnded) {
      return "This event has concluded. Check the resources section for recordings or follow-up materials.";
    }
    if (isFull) {
      return "We reached capacity for this event. Join the waitlist by contacting the team.";
    }
    return "Registration is closed. You can still explore related news and resources.";
  })();

  return (
    <Card className="border border-gray-100 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-xl text-shop_dark_green">
          <Ticket className="h-5 w-5 text-shop_light_green" aria-hidden="true" />
          Reserve your seat
        </CardTitle>
        <p className="text-sm text-gray-600">
          Quick registration for yourself or your team. We only ask for essentials.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {registrationDeadline ? (
          <CountdownTimer
            targetDate={registrationDeadline}
            variant="compact"
            showSeconds={false}
            onExpire={() => setDeadlineExpired(true)}
            className="border border-gray-100"
            label="Registration closes in"
          />
        ) : null}

        <div className="rounded-xl border border-gray-100 bg-shop_light_bg/60 p-4 text-sm text-gray-700">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-shop_dark_green">Registration details</p>
            <Badge
              variant="outline"
              className={statusBadgeTone}
            >
              {effectiveStatusLabel}
            </Badge>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">Registration fee</p>
              <div className="flex items-center gap-2">
                {isFreeEvent ? (
                  <Badge className="bg-emerald-600 text-white">Free</Badge>
                ) : (
                  <p className="font-semibold text-shop_dark_green">{registrationFeeLabel ?? "Paid event"}</p>
                )}
                {isEarlyBirdWindow ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                    <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Early bird
                  </Badge>
                ) : null}
              </div>
              {earlyBirdLabel ? (
                <p className="mt-1 text-xs text-emerald-700">Early bird ends {earlyBirdLabel}</p>
              ) : null}
            </div>
            {registrationDeadlineLabel ? (
              <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Registration deadline</p>
                <p className="font-semibold text-shop_dark_green">{registrationDeadlineLabel}</p>
              </div>
            ) : null}
            {spotsRemaining !== null ? (
              <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Spots remaining</p>
                <p
                  className={`font-semibold ${
                    spotsRemaining <= 5 ? "text-amber-700" : "text-shop_dark_green"
                  }`}
                >
                  {spotsRemaining} left
                  {normalizedCapacity !== null ? ` of ${normalizedCapacity}` : ""}
                </p>
              </div>
            ) : null}
            {hasTeamTab ? (
              <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Team registration</p>
                <p className="font-semibold text-shop_dark_green">
                  {teamSizeCopy ? `Teams of ${teamSizeCopy}` : "Invite your crew together"}
                </p>
                <p className="text-xs text-gray-600">
                  Min {normalizedMinTeamSize} people · Max {normalizedMaxTeamSize} people
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-shop_dark_green">Choose registration type</p>
            <p className="text-xs text-gray-600">
              Switch between an individual seat or a B2B team submission.
            </p>
          </div>
          <div className="inline-flex rounded-full bg-shop_light_bg p-1 text-sm font-semibold text-shop_dark_green shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("individual")}
              className={`rounded-full px-4 py-2 transition ${
                activeTab === "individual"
                  ? "bg-white shadow"
                  : "text-gray-600 hover:text-shop_dark_green"
              }`}
            >
              Individual
            </button>
            {hasTeamTab ? (
              <button
                type="button"
                onClick={() => setActiveTab("team")}
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === "team"
                    ? "bg-white shadow"
                    : "text-gray-600 hover:text-shop_dark_green"
                }`}
              >
                Team Registration
              </button>
            ) : null}
          </div>
        </div>

        {isRegistrationClosed ? (
          <div className="space-y-3 rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-amber-800">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>Registration Closed</span>
            </div>
            <p className="text-sm">{closedCopy}</p>
          </div>
        ) : activeTab === "team" && hasTeamTab ? (
          <TeamRegistrationForm
            eventId={eventId}
            eventSlug={normalizedSlug}
            eventTitle={eventTitle}
            eventDate={eventDate}
            eventLocation={eventLocation}
            eventDescription={eventDescription}
            minTeamSize={minTeamSize ?? undefined}
            maxTeamSize={maxTeamSize ?? undefined}
            maxAttendees={maxAttendees ?? undefined}
            currentAttendeeCount={attendeeCount ?? undefined}
            onRegistered={handleRegistered}
          />
        ) : (
          <RegistrationForm
            eventId={eventId}
            eventSlug={normalizedSlug}
            maxAttendees={maxAttendees}
            attendeeCount={attendeeCount ?? undefined}
            onRegistered={handleRegistered}
          />
        )}

        {hasTeamTab ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-shop_light_green bg-shop_light_bg/60 p-4 text-sm text-gray-700">
            <span className="mt-1 rounded-full bg-white p-2 text-shop_dark_green shadow">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-shop_dark_green">
                B2B teams welcome
              </p>
              <p className="text-xs text-gray-600">
                {teamSizeCopy
                  ? `Ideal for distributor and dealer teams of ${teamSizeCopy}.`
                  : "Register your crew together so we can prepare seating and materials."}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default RegistrationPanel;
