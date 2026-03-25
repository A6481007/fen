import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/emailService";
import { computeEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { writeClient } from "@/sanity/lib/client";
import { getUserRegistrationsWithEvents } from "@/sanity/queries";

type EventAttendee = {
  _key?: string;
  name?: string;
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

type RegistrationEvent = {
  _id?: string;
  title?: string;
  slug?: string;
  date?: string;
  location?: string;
  registrationOpen?: boolean | null;
  registrationDeadline?: string | null;
  teamRegistrationEnabled?: boolean | null;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  maxAttendees?: number | null;
  status?: EventStatus | string | null;
  statusOverride?: EventStatus | string | null;
  attendees?: EventAttendee[];
};

type RegistrationDocument = {
  _id?: string;
  name?: string;
  email?: string;
  clerkUserId?: string;
  registrationType?: string;
  organization?: string;
  jobTitle?: string;
  teamId?: string;
  teamLeadEmail?: string;
  teamMembers?: {
    name?: string;
    email?: string;
    jobTitle?: string;
  }[];
  guestsCount?: number;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  status?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  submittedAt?: string;
  message?: string;
  newsletterOptIn?: boolean;
  eventSlug?: string;
  event?: RegistrationEvent | null;
};

type UserRegistration = RegistrationDocument & {
  eventStatus?: EventStatus;
  registrationStatus?: string;
  submittedAt?: string;
};

type TeamMemberUpdate = {
  email: string;
  name?: string;
  jobTitle?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  action?: "add" | "remove" | "update";
};

const REGISTRATION_WITH_EVENT_QUERY = `
  *[_type == "eventRsvp" && _id == $registrationId][0]{
    _id,
    name,
    email,
    clerkUserId,
    registrationType,
    organization,
    jobTitle,
    teamId,
    teamLeadEmail,
    teamMembers[]{
      name,
      email,
      jobTitle
    },
    guestsCount,
    dietaryRequirements,
    accessibilityNeeds,
    status,
    cancellationReason,
    cancelledAt,
    submittedAt,
    message,
    newsletterOptIn,
    eventSlug,
    event->{
      _id,
      title,
      "slug": slug.current,
      date,
      location,
      registrationOpen,
      registrationDeadline,
      teamRegistrationEnabled,
      minTeamSize,
      maxTeamSize,
      maxAttendees,
      status,
      statusOverride,
      attendees[]{
        _key,
        name,
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
      }
    }
  }
`;

const TEAM_REGISTRATIONS_QUERY = `
  *[_type == "eventRsvp" && teamId == $teamId]{
    _id,
    name,
    email,
    clerkUserId,
    registrationType,
    teamId,
    teamLeadEmail,
    dietaryRequirements,
    accessibilityNeeds,
    jobTitle,
    status
  }
`;

const normalizeString = (value?: string | null) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value?: string | null) => normalizeString(value).toLowerCase();
const sanitizeOptionalField = (value: unknown, maxLength = 500) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return "";
  return normalized.slice(0, maxLength);
};
const normalizeAction = (value?: string | null): TeamMemberUpdate["action"] => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "add" || normalized === "remove" || normalized === "update") {
    return normalized;
  }
  return undefined;
};
const toTimestamp = (value?: string | null) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const getUserEmail = (user: Awaited<ReturnType<typeof currentUser>>) => {
  const primary = user?.primaryEmailAddress?.emailAddress;
  const fallback = user?.emailAddresses?.[0]?.emailAddress;
  return normalizeEmail(primary || fallback);
};

const isUpcomingRegistration = (registration: UserRegistration, nowMs: number) => {
  const eventStatus = registration.eventStatus;
  const eventTime = toTimestamp(registration.event?.date ?? registration.submittedAt);
  if (eventStatus === "upcoming" || eventStatus === "ongoing") {
    if (eventTime === null) return true;
    return eventTime >= nowMs;
  }

  if (!eventStatus && eventTime !== null) {
    return eventTime >= nowMs;
  }

  return false;
};

const sortByUpcomingDate = (registrations: UserRegistration[]) => {
  const now = Date.now();
  return [...registrations].sort((a, b) => {
    const aUpcoming = isUpcomingRegistration(a, now);
    const bUpcoming = isUpcomingRegistration(b, now);
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;

    const aTime = toTimestamp(a.event?.date ?? a.submittedAt);
    const bTime = toTimestamp(b.event?.date ?? b.submittedAt);

    if (aTime === bTime) {
      return (a.event?.title || a.name || "").localeCompare(b.event?.title || b.name || "");
    }

    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
  });
};

const userOwnsRegistration = (registration: RegistrationDocument | null, userId?: string | null, email?: string | null) => {
  if (!registration) return false;
  const normalizedUserId = normalizeString(userId);
  const normalizedEmail = normalizeEmail(email);
  const registrationEmail = normalizeEmail(registration.email);
  const registrationClerkId = normalizeString(registration.clerkUserId);
  const teamLeadEmail = normalizeEmail(registration.teamLeadEmail);

  return (
    (normalizedUserId && registrationClerkId && normalizedUserId === registrationClerkId) ||
    (normalizedEmail && registrationEmail && normalizedEmail === registrationEmail) ||
    (normalizedEmail && teamLeadEmail && normalizedEmail === teamLeadEmail)
  );
};

const parseTeamMemberUpdates = (rawMembers: unknown): TeamMemberUpdate[] => {
  if (!Array.isArray(rawMembers)) return [];
  return rawMembers
    .map((member) => {
      const email = normalizeEmail((member as TeamMemberUpdate)?.email);
      if (!email) return null;

      return {
        email,
        name: normalizeString((member as TeamMemberUpdate)?.name) || undefined,
        jobTitle: normalizeString((member as TeamMemberUpdate)?.jobTitle) || undefined,
        dietaryRequirements: sanitizeOptionalField((member as TeamMemberUpdate)?.dietaryRequirements),
        accessibilityNeeds: sanitizeOptionalField((member as TeamMemberUpdate)?.accessibilityNeeds),
        action: normalizeAction((member as TeamMemberUpdate)?.action),
      };
    })
    .filter(Boolean) as TeamMemberUpdate[];
};

const hasWriteToken = () =>
  typeof process.env.SANITY_API_TOKEN === "string" && process.env.SANITY_API_TOKEN.trim().length > 0;

const matchAttendeeToRegistration = (attendee: EventAttendee, registration: RegistrationDocument) => {
  const attendeeEmail = normalizeEmail(attendee?.email);
  const attendeeClerkId = normalizeString(attendee?.clerkUserId);
  const attendeeUserId = normalizeString(attendee?.userId);
  const registrationEmail = normalizeEmail(registration.email);
  const registrationClerkId = normalizeString(registration.clerkUserId);
  const registrationTeamId = normalizeString(registration.teamId);

  if (registrationEmail && attendeeEmail === registrationEmail) return true;
  if (registrationClerkId && (attendeeClerkId === registrationClerkId || attendeeUserId === registrationClerkId))
    return true;
  if (registrationTeamId && attendee.teamId && attendee.teamId === registrationTeamId && attendee.isTeamLead) return true;

  return false;
};

const revalidateEventCaches = (eventSlug?: string | null, userTag?: string | null) => {
  const revalidate = revalidateTag as unknown as (tag: string) => void;
  revalidate("events");
  revalidate("user-events");
  if (eventSlug) {
    revalidate(`event:${eventSlug}`);
  }
  if (userTag) {
    revalidate(userTag);
  }
};

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = getUserEmail(user);
    const identifier = email || normalizeString(userId);

    if (!identifier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = normalizeString(searchParams.get("status"))?.toLowerCase();
    const upcomingOnly = ["1", "true", "yes"].includes((searchParams.get("upcoming_only") || "").toLowerCase());

    const registrations = await getUserRegistrationsWithEvents(identifier);
    const nowMs = Date.now();

    const filtered = registrations.filter((registration) => {
      const normalizedStatus = registration.registrationStatus?.toLowerCase();
      const matchesStatus = statusFilter ? normalizedStatus === statusFilter : true;
      const matchesUpcoming = upcomingOnly ? isUpcomingRegistration(registration, nowMs) : true;
      return matchesStatus && matchesUpcoming;
    });

    const sorted = sortByUpcomingDate(filtered);

    return NextResponse.json({ success: true, registrations: sorted }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user registrations:", { error });
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasWriteToken()) {
    return NextResponse.json(
      { error: "Registration updates are temporarily unavailable.", reason: "Missing Sanity write token." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const registrationId = normalizeString(body?.registrationId as string);
  const dietaryRequirements = sanitizeOptionalField(body?.dietaryRequirements);
  const accessibilityNeeds = sanitizeOptionalField(body?.accessibilityNeeds);
  const teamMemberUpdates = parseTeamMemberUpdates(body?.teamMembers);

  if (!registrationId) {
    return NextResponse.json({ error: "Registration ID is required." }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = getUserEmail(user);
  const userIdentifier = userEmail || normalizeString(userId);

  try {
    const registration = await writeClient.fetch<RegistrationDocument | null>(REGISTRATION_WITH_EVENT_QUERY, {
      registrationId,
    });

    if (!registration?._id) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    if (!userOwnsRegistration(registration, userId, userEmail)) {
      return NextResponse.json({ error: "You do not have permission to update this registration." }, { status: 403 });
    }

    const isTeamLead = registration.registrationType === "team_lead";
    if (!isTeamLead && teamMemberUpdates.length > 0) {
      return NextResponse.json(
        { error: "Only team leads can update team member details." },
        { status: 403 }
      );
    }

    const setData: Record<string, unknown> = {};
    if (dietaryRequirements !== undefined) setData.dietaryRequirements = dietaryRequirements;
    if (accessibilityNeeds !== undefined) setData.accessibilityNeeds = accessibilityNeeds;

    const existingTeamMembers = Array.isArray(registration.teamMembers) ? registration.teamMembers : [];
    const existingEmails = new Set(existingTeamMembers.map((member) => normalizeEmail(member?.email)));
    const leadEmail = normalizeEmail(registration.teamLeadEmail || registration.email);

    const additions: TeamMemberUpdate[] = [];
    const removals: TeamMemberUpdate[] = [];
    const memberUpdates: TeamMemberUpdate[] = [];

    teamMemberUpdates.forEach((member) => {
      const normalizedEmail = normalizeEmail(member.email);
      if (!normalizedEmail) return;
      const action = member.action || (existingEmails.has(normalizedEmail) ? "update" : "add");
      if (action === "remove") {
        removals.push({ ...member, email: normalizedEmail });
      } else if (action === "add") {
        additions.push({ ...member, email: normalizedEmail });
      } else {
        memberUpdates.push({ ...member, email: normalizedEmail });
      }
    });

    if (isTeamLead && teamMemberUpdates.length > 0 && !registration.teamId) {
      return NextResponse.json(
        { error: "Team registration is missing a team ID. Please contact support." },
        { status: 400 }
      );
    }

    if (removals.some((member) => normalizeEmail(member.email) === leadEmail)) {
      return NextResponse.json({ error: "Team leads cannot remove themselves." }, { status: 400 });
    }

    if (removals.length > 0) {
      const missingRemoval = removals.find((entry) => !existingEmails.has(normalizeEmail(entry.email)));
      if (missingRemoval) {
        return NextResponse.json(
          { error: `Team member ${missingRemoval.email} was not found on this registration.` },
          { status: 400 }
        );
      }
    }

    const event = registration.event;
    const minTeamSize =
      event?.minTeamSize && event.minTeamSize > 0 ? event.minTeamSize : 2;
    const maxTeamSize =
      event?.maxTeamSize && event.maxTeamSize > 0 ? event.maxTeamSize : Math.max(minTeamSize, 20);
    const currentTeamSize = 1 + existingTeamMembers.length;
    const finalTeamSize = currentTeamSize - removals.length + additions.length;

    if (isTeamLead && teamMemberUpdates.length > 0) {
      if (finalTeamSize < minTeamSize) {
        return NextResponse.json(
          { error: `Teams must include at least ${minTeamSize} people for this event.` },
          { status: 400 }
        );
      }
      if (finalTeamSize > maxTeamSize) {
        return NextResponse.json(
          { error: `Teams can include at most ${maxTeamSize} people for this event.` },
          { status: 400 }
        );
      }
    }

    if (additions.length > 0) {
      const uniqueIncomingEmails = new Set<string>();
      for (const addition of additions) {
        if (!addition.email) {
          return NextResponse.json(
            { error: "Team member email is required for additions." },
            { status: 400 }
          );
        }
        if (leadEmail && addition.email === leadEmail) {
          return NextResponse.json(
            { error: "Team lead email cannot be reused for another member." },
            { status: 400 }
          );
        }
        if (existingEmails.has(addition.email)) {
          return NextResponse.json(
            { error: "One or more team members are already on your team." },
            { status: 400 }
          );
        }
        if (uniqueIncomingEmails.has(addition.email)) {
          return NextResponse.json(
            { error: "Team member emails must be unique." },
            { status: 400 }
          );
        }
        uniqueIncomingEmails.add(addition.email);
      }

      if (event?.teamRegistrationEnabled === false) {
        return NextResponse.json(
          { error: "Team updates are disabled for this event." },
          { status: 400 }
        );
      }

      const eventStatus = computeEventStatus({
        date: event?.date,
        status: event?.status as EventStatus,
        statusOverride: event?.statusOverride as EventStatus,
      });
      if (eventStatus === "ended") {
        return NextResponse.json(
          { error: "This event has already ended. New members cannot be added." },
          { status: 400 }
        );
      }

      const deadlineMs = event?.registrationDeadline ? new Date(event.registrationDeadline).getTime() : Number.NaN;
      if (Number.isFinite(deadlineMs) && deadlineMs < Date.now()) {
        return NextResponse.json(
          { error: "Registration deadline has passed for this event." },
          { status: 400 }
        );
      }

      if (event?.registrationOpen === false) {
        return NextResponse.json(
          { error: "Registration is closed for this event." },
          { status: 400 }
        );
      }

      const maxAttendees =
        typeof event?.maxAttendees === "number" && Number.isFinite(event.maxAttendees)
          ? event.maxAttendees
          : null;
      const attendeeCount = Array.isArray(event?.attendees) ? event.attendees.length : 0;

      if (maxAttendees !== null) {
        const adjustedCount = attendeeCount - removals.length + additions.length;
        if (adjustedCount > maxAttendees) {
          const remaining = Math.max(0, maxAttendees - attendeeCount + removals.length);
          return NextResponse.json(
            {
              error:
                remaining === 0
                  ? "No remaining capacity to add team members."
                  : `Only ${remaining} spot${remaining === 1 ? "" : "s"} remain for this event.`,
            },
            { status: 400 }
          );
        }
      }

      if (!event?._id) {
        return NextResponse.json(
          { error: "Event details are missing for this registration." },
          { status: 400 }
        );
      }
    }

    const updatesByEmail = new Map(memberUpdates.map((member) => [member.email, member]));
    let updatedTeamMembers = existingTeamMembers
      .filter((member) => !removals.some((remove) => normalizeEmail(remove.email) === normalizeEmail(member.email)))
      .map((member) => {
        const normalizedEmail = normalizeEmail(member?.email);
        const update = normalizedEmail ? updatesByEmail.get(normalizedEmail) : undefined;
        if (!update) return member;

        return {
          ...member,
          name: update.name ?? member.name,
          jobTitle: update.jobTitle ?? member.jobTitle,
          email: member.email,
        };
      });

    additions.forEach((addition) => {
      updatedTeamMembers.push({
        name: addition.name,
        email: addition.email,
        jobTitle: addition.jobTitle,
      });
    });

    if (isTeamLead && (memberUpdates.length > 0 || additions.length > 0 || removals.length > 0)) {
      setData.teamMembers = updatedTeamMembers as RegistrationDocument["teamMembers"];
      setData.guestsCount = 1 + updatedTeamMembers.length;
    }

    const hasTeamChanges = memberUpdates.length > 0 || additions.length > 0 || removals.length > 0;
    if (Object.keys(setData).length === 0 && !hasTeamChanges) {
      return NextResponse.json({ error: "No updates provided." }, { status: 400 });
    }

    const transaction = writeClient.transaction();
    transaction.patch(registration._id, (patch) => patch.set(setData));

    const eventId = registration.event?._id;
    const attendees = Array.isArray(registration.event?.attendees) ? registration.event?.attendees : [];
    const removalEmails = new Set(removals.map((entry) => normalizeEmail(entry.email)));
    const nowIso = new Date().toISOString();
    let attendeesChanged = false;
    let updatedAttendees: EventAttendee[] = attendees;

    if (eventId) {
      updatedAttendees = attendees.reduce<EventAttendee[]>((acc, attendee) => {
        const attendeeEmail = normalizeEmail(attendee.email);
        if (
          registration.teamId &&
          attendee.teamId === registration.teamId &&
          removalEmails.has(attendeeEmail) &&
          !attendee.isTeamLead
        ) {
          attendeesChanged = true;
          return acc;
        }

        let updated = { ...attendee };
        if (matchAttendeeToRegistration(attendee, registration)) {
          if (dietaryRequirements !== undefined) updated.dietaryRequirements = dietaryRequirements;
          if (accessibilityNeeds !== undefined) updated.accessibilityNeeds = accessibilityNeeds;
        }

        const update = updatesByEmail.get(attendeeEmail);
        if (isTeamLead && update && registration.teamId && attendee.teamId === registration.teamId) {
          if (update.name !== undefined) updated.name = update.name;
          if (update.jobTitle !== undefined) updated.jobTitle = update.jobTitle;
          if (update.dietaryRequirements !== undefined) updated.dietaryRequirements = update.dietaryRequirements;
          if (update.accessibilityNeeds !== undefined) updated.accessibilityNeeds = update.accessibilityNeeds;
        }

        if (JSON.stringify(updated) !== JSON.stringify(attendee)) {
          attendeesChanged = true;
        }

        acc.push(updated);
        return acc;
      }, []);

      if (additions.length > 0 && registration.teamId) {
        const newAttendees: EventAttendee[] = additions.map((addition) => ({
          _key: crypto.randomUUID(),
          name: addition.name,
          email: addition.email,
          jobTitle: addition.jobTitle,
          registrationType: "team_member",
          isTeamLead: false,
          teamId: registration.teamId,
          registrationDate: nowIso,
        }));
        attendeesChanged = true;
        updatedAttendees.push(...newAttendees);
      }

      if (attendeesChanged) {
        transaction.patch(eventId, (patch) => patch.set({ attendees: updatedAttendees }));
      }
    }

    if (isTeamLead && registration.teamId && hasTeamChanges) {
      const teamRegistrations = await writeClient.fetch<RegistrationDocument[]>(TEAM_REGISTRATIONS_QUERY, {
        teamId: registration.teamId,
      });

      if (additions.length > 0) {
        const teamEmails = new Set(
          teamRegistrations.map((entry) => normalizeEmail(entry?.email))
        );
        const duplicateAddition = additions.find((entry) => teamEmails.has(entry.email));
        if (duplicateAddition) {
          return NextResponse.json(
            { error: `Team member ${duplicateAddition.email} is already registered for this event.` },
            { status: 400 }
          );
        }
      }

      teamRegistrations.forEach((memberDoc) => {
        const normalizedEmail = normalizeEmail(memberDoc?.email);
        const update = updatesByEmail.get(normalizedEmail);
        if (update && memberDoc?._id) {
          const memberSet: Record<string, string> = {};
          if (update.name !== undefined) memberSet.name = update.name;
          if (update.jobTitle !== undefined) memberSet.jobTitle = update.jobTitle;
          if (update.dietaryRequirements !== undefined) memberSet.dietaryRequirements = update.dietaryRequirements;
          if (update.accessibilityNeeds !== undefined) memberSet.accessibilityNeeds = update.accessibilityNeeds;

          if (Object.keys(memberSet).length > 0) {
            transaction.patch(memberDoc._id, (patch) => patch.set(memberSet));
          }
        }
      });

      if (removals.length > 0) {
        teamRegistrations.forEach((memberDoc) => {
          const normalizedEmail = normalizeEmail(memberDoc?.email);
          if (
            removalEmails.has(normalizedEmail) &&
            memberDoc?._id &&
            memberDoc.registrationType !== "team_lead"
          ) {
            transaction.patch(memberDoc._id, (patch) =>
              patch.set({
                status: "cancelled",
                cancellationReason: "Removed by team lead",
                cancelledAt: nowIso,
              })
            );
          }
        });
      }

      if (additions.length > 0 && eventId) {
        const eventSlug = registration.event?.slug || registration.eventSlug;
        additions.forEach((addition) => {
          transaction.create({
            _type: "eventRsvp",
            name: addition.name,
            email: addition.email,
            event: {
              _type: "reference",
              _ref: eventId,
            },
            eventSlug,
            organization: registration.organization,
            jobTitle: addition.jobTitle,
            registrationType: "team_member",
            teamId: registration.teamId,
            teamLeadEmail: registration.teamLeadEmail || registration.email,
            guestsCount: 1,
            message: registration.message || undefined,
            dietaryRequirements: addition.dietaryRequirements,
            accessibilityNeeds: addition.accessibilityNeeds,
            newsletterOptIn: registration.newsletterOptIn,
            status: "new",
            priority: "normal",
            submittedAt: nowIso,
          });
        });
      }
    }

    await transaction.commit({ autoGenerateArrayKeys: true });

    revalidateEventCaches(registration.event?.slug || registration.eventSlug, userIdentifier);

    const refreshed = await getUserRegistrationsWithEvents(userIdentifier);
    const updated = refreshed.find((entry) => entry._id === registration._id);

    return NextResponse.json(
      {
        success: true,
        message: "Registration updated.",
        registration: updated || registration,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating registration:", { registrationId, userId, error });
    return NextResponse.json({ error: "Failed to update registration." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasWriteToken()) {
    return NextResponse.json(
      { error: "Registration cancellation is temporarily unavailable.", reason: "Missing Sanity write token." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const registrationId = normalizeString(body?.registrationId as string);
  const cancellationReason = sanitizeOptionalField(body?.cancellationReason, 1000);
  const cancelTeamMembers = Boolean(body?.cancelTeamMembers);
  const transferToMemberEmail = normalizeEmail(body?.transferToMemberEmail as string);

  if (!registrationId) {
    return NextResponse.json({ error: "Registration ID is required." }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = getUserEmail(user);
  const userIdentifier = userEmail || normalizeString(userId);

  try {
    const registration = await writeClient.fetch<RegistrationDocument | null>(REGISTRATION_WITH_EVENT_QUERY, {
      registrationId,
    });

    if (!registration?._id) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    if (!userOwnsRegistration(registration, userId, userEmail)) {
      return NextResponse.json({ error: "You do not have permission to cancel this registration." }, { status: 403 });
    }

    const isTeamLead = registration.registrationType === "team_lead";
    const nowIso = new Date().toISOString();
    const transaction = writeClient.transaction();
    const eventId = registration.event?._id;
    const eventSlug = registration.event?.slug || registration.eventSlug;
    const attendees = Array.isArray(registration.event?.attendees) ? registration.event?.attendees : [];

    if (!isTeamLead || !registration.teamId) {
      transaction.patch(registration._id, (patch) =>
        patch.set({
          status: "cancelled",
          cancellationReason: cancellationReason ?? registration.cancellationReason ?? "",
          cancelledAt: nowIso,
        })
      );

      if (eventId && attendees.length > 0) {
        const remainingAttendees = attendees.filter((attendee) => !matchAttendeeToRegistration(attendee, registration));
        transaction.patch(eventId, (patch) => patch.set({ attendees: remainingAttendees }));
      }
    } else {
      const teamRegistrations = await writeClient.fetch<RegistrationDocument[]>(TEAM_REGISTRATIONS_QUERY, {
        teamId: registration.teamId,
      });

      if (cancelTeamMembers) {
        teamRegistrations.forEach((teamReg) => {
          if (!teamReg?._id) return;
          transaction.patch(teamReg._id, (patch) =>
            patch.set({
              status: "cancelled",
              cancellationReason: cancellationReason ?? teamReg.cancellationReason ?? "",
              cancelledAt: nowIso,
            })
          );
        });

        if (eventId && attendees.length > 0) {
          const remainingAttendees = attendees.filter((attendee) => attendee.teamId !== registration.teamId);
          transaction.patch(eventId, (patch) => patch.set({ attendees: remainingAttendees }));
        }
      } else if (transferToMemberEmail) {
        const targetRegistration = teamRegistrations.find(
          (entry) => normalizeEmail(entry?.email) === transferToMemberEmail && entry.registrationType !== "team_lead"
        );

        if (!targetRegistration?._id) {
          return NextResponse.json(
            { error: "Cannot transfer team lead role. Target member was not found." },
            { status: 400 }
          );
        }

        transaction.patch(registration._id, (patch) =>
          patch.set({
            status: "cancelled",
            cancellationReason: cancellationReason ?? registration.cancellationReason ?? "",
            cancelledAt: nowIso,
          })
        );

        transaction.patch(targetRegistration._id, (patch) =>
          patch.set({
            registrationType: "team_lead",
            teamLeadEmail: targetRegistration.email,
          })
        );

        teamRegistrations.forEach((teamReg) => {
          if (!teamReg?._id || teamReg._id === targetRegistration._id) return;
          transaction.patch(teamReg._id, (patch) => patch.set({ teamLeadEmail: targetRegistration.email }));
        });

        if (eventId && attendees.length > 0) {
          const updatedAttendees: EventAttendee[] = [];

          attendees.forEach((attendee) => {
            if (matchAttendeeToRegistration(attendee, registration)) {
              return;
            }

            if (
              registration.teamId &&
              attendee.teamId === registration.teamId &&
              normalizeEmail(attendee.email) === transferToMemberEmail
            ) {
              updatedAttendees.push({
                ...attendee,
                isTeamLead: true,
                registrationType: "team_lead",
              });
              return;
            }

            if (registration.teamId && attendee.teamId === registration.teamId) {
              updatedAttendees.push({
                ...attendee,
                isTeamLead: false,
              });
              return;
            }

            updatedAttendees.push(attendee);
          });

          transaction.patch(eventId, (patch) => patch.set({ attendees: updatedAttendees }));
        }
      } else {
        transaction.patch(registration._id, (patch) =>
          patch.set({
            status: "cancelled",
            cancellationReason: cancellationReason ?? registration.cancellationReason ?? "",
            cancelledAt: nowIso,
          })
        );

        if (eventId && attendees.length > 0) {
          const remainingAttendees = attendees.filter((attendee) => !matchAttendeeToRegistration(attendee, registration));
          transaction.patch(eventId, (patch) => patch.set({ attendees: remainingAttendees }));
        }
      }
    }

    await transaction.commit({ autoGenerateArrayKeys: true });
    revalidateEventCaches(eventSlug, userIdentifier);

    if (registration.email) {
      const eventTitle = registration.event?.title || registration.eventSlug || "your event";
      const eventDate = registration.event?.date
        ? new Date(registration.event.date).toLocaleString()
        : "the scheduled date";

      const text = [
        `Hi ${registration.name || "there"},`,
        "",
        `Your registration for ${eventTitle} (${eventDate}) has been cancelled.`,
        cancellationReason ? `Reason: ${cancellationReason}` : undefined,
        "",
        "If this was a mistake, please submit a new registration.",
        "",
        "Thanks,",
        "The Events Team",
      ]
        .filter(Boolean)
        .join("\n");

      const subject = `Registration cancelled for ${eventTitle}`;
      await sendMail({
        email: registration.email,
        subject,
        text,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: cancelTeamMembers
          ? "Team registration cancelled."
          : transferToMemberEmail
          ? "Team lead transferred and registration cancelled."
          : "Registration cancelled.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cancelling registration:", { registrationId, userId, error });
    return NextResponse.json({ error: "Failed to cancel registration." }, { status: 500 });
  }
}
