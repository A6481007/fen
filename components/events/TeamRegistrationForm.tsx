"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TeamConfirmation, { type TeamRegistrationResult } from "./TeamConfirmation";

type TeamRegistrationFormProps = {
  eventId: string;
  eventSlug: string;
  eventTitle?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  eventDescription?: string | null;
  minTeamSize?: number;
  maxTeamSize?: number;
  maxAttendees?: number;
  currentAttendeeCount?: number;
  onRegistered?: (team: TeamRegistrationResult) => void;
};

type TeamLead = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
};

type TeamMember = {
  name: string;
  email: string;
  jobTitle: string;
};

type StatusMessage = {
  type: "error";
  text: string;
} | null;

const createMember = (): TeamMember => ({ name: "", email: "", jobTitle: "" });
const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
const normalizeString = (value?: string | null) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value?: string | null) => normalizeString(value).toLowerCase();
const sanitizeOptionalField = (value?: string | null) => {
  const normalized = normalizeString(value);
  return normalized || "";
};

const TeamRegistrationForm = ({
  eventId,
  eventSlug,
  eventTitle,
  eventDate,
  eventLocation,
  eventDescription,
  minTeamSize,
  maxTeamSize,
  maxAttendees,
  currentAttendeeCount,
  onRegistered,
}: TeamRegistrationFormProps) => {
  const router = useRouter();
  const normalizedSlug = typeof eventSlug === "string" ? eventSlug.trim() : "";
  const normalizedMinTeamSize = useMemo(() => Math.max(2, minTeamSize ?? 2), [minTeamSize]);
  const normalizedMaxTeamSize = useMemo(
    () => Math.max(normalizedMinTeamSize, maxTeamSize ?? 20),
    [normalizedMinTeamSize, maxTeamSize]
  );
  const minimumMembers = Math.max(0, normalizedMinTeamSize - 1);
  const memberLimit = Math.max(1, normalizedMaxTeamSize - 1);

  const [teamLead, setTeamLead] = useState<TeamLead>({
    name: "",
    email: "",
    phone: "",
    organization: "",
    jobTitle: "",
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() =>
    Array.from({ length: Math.max(minimumMembers, 1) }, createMember)
  );
  const [dietaryRequirements, setDietaryRequirements] = useState("");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");
  const [notes, setNotes] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [teamResult, setTeamResult] = useState<TeamRegistrationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedMembers = useMemo(
    () =>
      teamMembers
        .map((member) => ({
          name: member.name.trim(),
          email: normalizeEmail(member.email),
          jobTitle: member.jobTitle.trim(),
        }))
        .filter((member) => member.name || member.email || member.jobTitle),
    [teamMembers]
  );

  const teamSize = 1 + trimmedMembers.length;
  const remainingCapacity = useMemo(() => {
    if (
      typeof maxAttendees === "number" &&
      Number.isFinite(maxAttendees) &&
      typeof currentAttendeeCount === "number" &&
      Number.isFinite(currentAttendeeCount)
    ) {
      return Math.max(0, maxAttendees - currentAttendeeCount);
    }
    return null;
  }, [currentAttendeeCount, maxAttendees]);
  const confirmationEvent = {
    title: eventTitle,
    date: eventDate,
    location: eventLocation,
    slug: normalizedSlug,
    description: eventDescription,
  };
  const effectiveMaxTeamSize =
    remainingCapacity !== null
      ? Math.min(normalizedMaxTeamSize, remainingCapacity)
      : normalizedMaxTeamSize;
  const capacityShortage =
    remainingCapacity !== null && remainingCapacity < normalizedMinTeamSize;
  const maxMembersByCapacity = Math.max(
    0,
    remainingCapacity !== null ? Math.min(memberLimit, remainingCapacity - 1) : memberLimit
  );
  const canAddMember = teamMembers.length < Math.max(1, maxMembersByCapacity);
  const canRemoveMember = teamMembers.length > Math.max(1, minimumMembers);
  const memberProgressCap =
    remainingCapacity !== null
      ? Math.max(1, Math.min(memberLimit, Math.max(0, remainingCapacity - 1)))
      : memberLimit;
  const memberProgressLabel = `${Math.min(trimmedMembers.length, memberProgressCap)} of ${memberProgressCap} members added`;

  const clearStatus = () => {
    if (status) setStatus(null);
  };

  const handleLeadChange = (field: keyof TeamLead, value: string) => {
    setTeamLead((prev) => ({ ...prev, [field]: value }));
    clearStatus();
  };

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    setTeamMembers((prev) =>
      prev.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      )
    );
    clearStatus();
  };

  const handleAddMember = () => {
    if (!canAddMember) return;
    setTeamMembers((prev) => [...prev, createMember()]);
    clearStatus();
  };

  const handleRemoveMember = (index: number) => {
    if (!canRemoveMember) return;
    setTeamMembers((prev) => prev.filter((_, memberIndex) => memberIndex !== index));
    clearStatus();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const leadName = normalizeString(teamLead.name);
    const leadEmail = normalizeEmail(teamLead.email);
    const leadPhone = normalizeString(teamLead.phone);
    const organization = normalizeString(teamLead.organization);
    const jobTitle = normalizeString(teamLead.jobTitle);
    const cleanedMembers = teamMembers
      .map((member) => ({
        name: normalizeString(member.name),
        email: normalizeEmail(member.email),
        jobTitle: normalizeString(member.jobTitle),
      }))
      .filter((member) => member.name || member.email || member.jobTitle);
    const slugForApi = normalizedSlug;

    if (!slugForApi) {
      setStatus({
        type: "error",
        text: "Event details are missing. Please refresh the page and try again.",
      });
      return;
    }

    if (!leadName || !leadEmail || !leadPhone || !organization || !jobTitle) {
      setStatus({
        type: "error",
        text: "Team lead name, email, phone, organization, and job title are required.",
      });
      return;
    }

    if (!isValidEmail(leadEmail)) {
      setStatus({
        type: "error",
        text: "Enter a valid email for the team lead.",
      });
      return;
    }

    if (capacityShortage) {
      setStatus({
        type: "error",
        text: `Only ${remainingCapacity} spot${remainingCapacity === 1 ? "" : "s"} remain. The minimum team size is ${normalizedMinTeamSize}.`,
      });
      return;
    }

    if (cleanedMembers.length < minimumMembers) {
      setStatus({
        type: "error",
        text: `Add ${minimumMembers - cleanedMembers.length} more teammate${minimumMembers - cleanedMembers.length === 1 ? "" : "s"} to meet the minimum team size of ${normalizedMinTeamSize}.`,
      });
      return;
    }

    if (teamSize < normalizedMinTeamSize) {
      setStatus({
        type: "error",
        text: `Please include at least ${normalizedMinTeamSize} people.`,
      });
      return;
    }

    const maximumTeamSizeAllowed =
      remainingCapacity !== null ? Math.min(normalizedMaxTeamSize, remainingCapacity) : normalizedMaxTeamSize;
    if (teamSize > maximumTeamSizeAllowed) {
      setStatus({
        type: "error",
        text: `Teams can include at most ${maximumTeamSizeAllowed} people for this event.`,
      });
      return;
    }

    const hasIncompleteMember = cleanedMembers.some((member) => !member.name || !member.email);
    if (hasIncompleteMember) {
      setStatus({
        type: "error",
        text: "Each team member needs a name and email address.",
      });
      return;
    }

    const hasInvalidMemberEmail = cleanedMembers.some((member) => !isValidEmail(member.email));
    if (hasInvalidMemberEmail) {
      setStatus({
        type: "error",
        text: "Enter valid emails for every team member.",
      });
      return;
    }

    const emails = [leadEmail, ...cleanedMembers.map((member) => member.email)];
    const seen = new Set<string>();
    const duplicateEmail = emails.find((entry) => {
      const normalized = entry.toLowerCase();
      if (seen.has(normalized)) return true;
      seen.add(normalized);
      return false;
    });

    if (duplicateEmail) {
      setStatus({
        type: "error",
        text: "Each team member needs a unique email address.",
      });
      return;
    }

    if (remainingCapacity !== null && teamSize > remainingCapacity) {
      setStatus({
        type: "error",
        text: `Only ${remainingCapacity} spot${remainingCapacity === 1 ? "" : "s"} remain. Adjust your team size.`,
      });
      return;
    }

    const dietary = sanitizeOptionalField(dietaryRequirements);
    const accessibility = sanitizeOptionalField(accessibilityNeeds);
    const additionalNotes = sanitizeOptionalField(notes);

    setSubmitting(true);

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slugForApi)}/register-team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          slug: slugForApi,
          teamLead: {
            name: leadName,
            email: leadEmail,
            phone: leadPhone,
            organization,
            jobTitle,
          },
          teamMembers: cleanedMembers,
          dietaryRequirements: dietary || undefined,
          accessibilityNeeds: accessibility || undefined,
          message: additionalNotes || undefined,
          newsletterOptIn,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to register your team right now.");
      }

      const leadFromResponse =
        Array.isArray(data?.attendees) && data.attendees.length
          ? data.attendees.find((entry: { isTeamLead?: boolean }) => entry?.isTeamLead)
          : null;
      const memberAttendees =
        Array.isArray(data?.attendees) && data.attendees.length
          ? data.attendees.filter((entry: { isTeamLead?: boolean }) => !entry?.isTeamLead)
          : [];
      const registrationDate =
        leadFromResponse?.registrationDate ||
        data?.attendees?.[0]?.registrationDate ||
        new Date().toISOString();

      const result: TeamRegistrationResult = {
        teamId: data?.teamId,
        teamLead: {
          name: leadFromResponse?.name || leadName,
          email: leadFromResponse?.email || leadEmail,
          phone: leadFromResponse?.phone || leadPhone,
          organization: leadFromResponse?.organization || organization,
          jobTitle: leadFromResponse?.jobTitle || jobTitle,
        },
        teamMembers: memberAttendees.length
          ? memberAttendees.map((member: TeamMember) => ({
              name: member.name,
              email: member.email,
              jobTitle: member.jobTitle,
            }))
          : cleanedMembers,
        teamSize,
        registrationDate,
        dietaryRequirements: dietary || undefined,
        accessibilityNeeds: accessibility || undefined,
        notes: additionalNotes || undefined,
        event: {
          title: eventTitle,
          date: eventDate,
          location: eventLocation,
          slug: slugForApi,
          description: eventDescription,
        },
      };

      setTeamResult(result);
      onRegistered?.(result);
      setTeamLead({
        name: "",
        email: "",
        phone: "",
        organization: "",
        jobTitle: "",
      });
      setTeamMembers(Array.from({ length: Math.max(minimumMembers, 1) }, createMember));
      setDietaryRequirements("");
      setAccessibilityNeeds("");
      setNotes("");
      setNewsletterOptIn(false);
      router.refresh();
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while saving your team registration.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (teamResult) {
    return (
      <TeamConfirmation
        teamLead={teamResult.teamLead}
        teamMembers={teamResult.teamMembers}
        event={teamResult.event || confirmationEvent}
        teamId={teamResult.teamId}
        registrationDate={teamResult.registrationDate}
        manageRegistrationUrl={`/dashboard/registrations${teamResult.teamId ? `?teamId=${teamResult.teamId}` : ""}`}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <span>{status.text}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-shop_light_bg/70 p-3 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-shop_dark_green" aria-hidden="true" />
          <span>Provide team details so we can reserve seats together.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-shop_dark_green">
            Team size: {teamSize} (min {normalizedMinTeamSize}, max {effectiveMaxTeamSize})
          </span>
          {remainingCapacity !== null ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-shop_dark_green">
              {remainingCapacity} spot{remainingCapacity === 1 ? "" : "s"} left
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
        <p className="text-sm font-semibold text-shop_dark_green">Team lead (required)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="teamLeadName">Full name</Label>
            <Input
              id="teamLeadName"
              name="teamLeadName"
              placeholder="Jordan Smith"
              value={teamLead.name}
              onChange={(event) => handleLeadChange("name", event.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamLeadEmail">Work email</Label>
            <Input
              id="teamLeadEmail"
              name="teamLeadEmail"
              type="email"
              placeholder="jordan@example.com"
              value={teamLead.email}
              onChange={(event) => handleLeadChange("email", event.target.value)}
              required
              disabled={submitting}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="teamLeadPhone">Phone</Label>
            <Input
              id="teamLeadPhone"
              name="teamLeadPhone"
              type="tel"
              placeholder="+1 (555) 987-6543"
              value={teamLead.phone}
              onChange={(event) => handleLeadChange("phone", event.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamLeadOrganization">Organization</Label>
            <Input
              id="teamLeadOrganization"
              name="teamLeadOrganization"
              placeholder="Acme Distribution"
              value={teamLead.organization}
              onChange={(event) => handleLeadChange("organization", event.target.value)}
              required
              disabled={submitting}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamLeadJobTitle">Job title</Label>
          <Input
            id="teamLeadJobTitle"
            name="teamLeadJobTitle"
            placeholder="Sales Manager"
            value={teamLead.jobTitle}
            onChange={(event) => handleLeadChange("jobTitle", event.target.value)}
            required
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-shop_dark_green">Team members</p>
            <p className="text-xs text-gray-600">{memberProgressLabel}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddMember}
            disabled={!canAddMember || submitting}
            className="bg-shop_light_bg text-shop_dark_green hover:bg-shop_light_green hover:text-white"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add member
          </Button>
        </div>

        {teamMembers.map((member, index) => (
          <div key={`team-member-${index}`} className="rounded-lg border border-gray-200 bg-white/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-shop_dark_green">Team member {index + 1}</p>
              {canRemoveMember ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(index)}
                  disabled={submitting}
                  className="text-gray-600 hover:text-red-700"
                >
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`member-name-${index}`}>Full name</Label>
                <Input
                  id={`member-name-${index}`}
                  name={`member-name-${index}`}
                  placeholder="Taylor Brooks"
                  value={member.name}
                  onChange={(event) => handleMemberChange(index, "name", event.target.value)}
                  disabled={submitting}
                  required={index < minimumMembers}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`member-email-${index}`}>Work email</Label>
                <Input
                  id={`member-email-${index}`}
                  name={`member-email-${index}`}
                  type="email"
                  placeholder="taylor@example.com"
                  value={member.email}
                  onChange={(event) => handleMemberChange(index, "email", event.target.value)}
                  disabled={submitting}
                  required={index < minimumMembers}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`member-role-${index}`}>Job title</Label>
                <Input
                  id={`member-role-${index}`}
                  name={`member-role-${index}`}
                  placeholder="Account Executive"
                  value={member.jobTitle}
                  onChange={(event) => handleMemberChange(index, "jobTitle", event.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        ))}

        {!canAddMember ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Max team size reached
          </p>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
        <p className="text-sm font-semibold text-shop_dark_green">Optional details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dietaryRequirements">Dietary requirements</Label>
            <Input
              id="dietaryRequirements"
              name="dietaryRequirements"
              placeholder="Vegetarian, halal, allergies"
              value={dietaryRequirements}
              onChange={(event) => {
                setDietaryRequirements(event.target.value);
                clearStatus();
              }}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessibilityNeeds">Accessibility needs</Label>
            <Input
              id="accessibilityNeeds"
              name="accessibilityNeeds"
              placeholder="Wheelchair access, assistive tech, seating"
              value={accessibilityNeeds}
              onChange={(event) => {
                setAccessibilityNeeds(event.target.value);
                clearStatus();
              }}
              disabled={submitting}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamNotes">Additional notes</Label>
          <Textarea
            id="teamNotes"
            name="teamNotes"
            placeholder="Share seating requests, presentation topics, or other notes for our team."
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              clearStatus();
            }}
            rows={4}
            disabled={submitting}
          />
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
          <Checkbox
            id="teamNewsletterOptIn"
            checked={newsletterOptIn}
            onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
            disabled={submitting}
          />
          <div className="space-y-1">
            <Label htmlFor="teamNewsletterOptIn" className="text-base font-medium text-shop_dark_green">
              Keep our team updated with News Hub announcements
            </Label>
            <p className="text-sm text-gray-500">
              Receive reminders, schedule updates, and quarterly recaps for your organization.
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-shop_dark_green text-white hover:bg-shop_light_green"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting team registration...
          </>
        ) : (
          "Register my team"
        )}
      </Button>
    </form>
  );
};

export default TeamRegistrationForm;
