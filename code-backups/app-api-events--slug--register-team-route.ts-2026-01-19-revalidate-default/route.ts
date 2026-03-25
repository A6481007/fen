import { NextRequest, NextResponse } from "next/server";
import type { ClientError } from "@sanity/client";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { sendMail } from "@/lib/emailService";
import { isUserEventAttendee } from "@/sanity/helpers";
import { computeEventStatus, isEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { writeClient } from "@/sanity/lib/client";

type TeamLeadPayload = {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
};

type TeamMemberPayload = {
  name?: string;
  email?: string;
  jobTitle?: string;
};

type IncomingPayload = {
  teamLead?: TeamLeadPayload;
  teamMembers?: TeamMemberPayload[];
  eventId?: string;
  slug?: string;
  message?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  newsletterOptIn?: boolean;
};

type EventAttendee = {
  _key?: string;
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  companyName?: string;
  jobTitle?: string;
  registrationType?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  notes?: string;
  isTeamLead?: boolean;
  teamId?: string;
  registrationDate?: string;
  clerkUserId?: string;
  userId?: string;
};

type EventForRegistration = {
  _id?: string;
  title?: string;
  slug?: string;
  date?: string;
  registrationDeadline?: string;
  registrationOpen?: boolean;
  teamRegistrationEnabled?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  maxAttendees?: number;
  status?: EventStatus | string | null;
  statusOverride?: EventStatus | string | null;
  attendees?: EventAttendee[];
};

const EVENT_BY_SLUG_FOR_TEAM_REGISTRATION = `
  *[_type == "event" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    date,
    registrationDeadline,
    registrationOpen,
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
      organization,
      companyName,
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
`;

const EXISTING_RSVP_BY_EMAIL_QUERY = `
  *[
    _type == "eventRsvp" &&
    lower(email) in $emails &&
    (
      (defined(event) && event._ref == $eventId) ||
      (defined(eventSlug) && lower(eventSlug) == $eventSlug)
    )
  ]{
    email
  }
`;

const normalizeString = (value?: string | null) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value?: string | null) => normalizeString(value).toLowerCase();
const sanitizeOptionalField = (value?: string | null, maxLength = 500) => {
  const normalized = normalizeString(value);
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
};
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPermissionError = (error: unknown, permissions: Array<"create" | "update"> = ["create", "update"]) => {
  const maybeClientError = error as ClientError | undefined;
  const items =
    (maybeClientError?.response as { body?: { error?: { items?: Array<{ error?: { permission?: string } }> } } } | undefined)
      ?.body?.error?.items;
  if (!Array.isArray(items)) return false;
  return items.some((item) => {
    const permission = item?.error?.permission;
    return permission ? permissions.includes(permission as "create" | "update") : false;
  });
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const hasWriteToken = typeof process.env.SANITY_API_TOKEN === "string" && process.env.SANITY_API_TOKEN.trim().length > 0;
  if (!hasWriteToken) {
    return NextResponse.json(
      {
        error: "Registration is temporarily unavailable. Please try again soon.",
        reason: "Missing SANITY_API_TOKEN with write permissions.",
      },
      { status: 503 }
    );
  }

  let body: IncomingPayload | null = null;
  try {
    body = (await request.json()) as IncomingPayload;
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { slug: slugParam } = await params;
  const slug = normalizeString(slugParam) || normalizeString(body?.slug);
  if (!slug) {
    return NextResponse.json({ error: "Missing event slug." }, { status: 400 });
  }

  const teamLead = body?.teamLead || {};
  const teamLeadName = normalizeString(teamLead?.name);
  const teamLeadEmail = normalizeEmail(teamLead?.email);
  const teamLeadPhone = normalizeString(teamLead?.phone);
  const teamLeadOrganization = normalizeString(teamLead?.organization);
  const teamLeadJobTitle = normalizeString(teamLead?.jobTitle);
  const dietaryRequirements = sanitizeOptionalField(body?.dietaryRequirements);
  const accessibilityNeeds = sanitizeOptionalField(body?.accessibilityNeeds);
  const message = sanitizeOptionalField(body?.message, 1000);
  const newsletterOptIn = Boolean(body?.newsletterOptIn);

  if (!teamLeadName || !teamLeadEmail || !teamLeadPhone || !teamLeadOrganization || !teamLeadJobTitle) {
    return NextResponse.json(
      {
        error: "Team lead name, email, phone, organization, and job title are required.",
      },
      { status: 400 }
    );
  }

  if (!emailRegex.test(teamLeadEmail)) {
    return NextResponse.json(
      { error: "Please provide a valid team lead email address." },
      { status: 400 }
    );
  }

  const rawTeamMembers = Array.isArray(body?.teamMembers) ? body?.teamMembers : [];
  const teamMemberErrors: string[] = [];
  const teamMembers = rawTeamMembers.reduce<TeamMemberPayload[]>((acc, member, index) => {
    const name = normalizeString(member?.name);
    const email = normalizeEmail(member?.email);
    const jobTitle = normalizeString(member?.jobTitle);

    if (!name || !email) {
      teamMemberErrors.push(`Team member ${index + 1} must include a name and email.`);
      return acc;
    }

    if (!emailRegex.test(email)) {
      teamMemberErrors.push(`Team member ${index + 1} has an invalid email address.`);
      return acc;
    }

    acc.push({ name, email, jobTitle });
    return acc;
  }, []);

  if (teamMemberErrors.length > 0) {
    return NextResponse.json({ error: teamMemberErrors[0] }, { status: 400 });
  }

  const teamEmails = [teamLeadEmail, ...teamMembers.map((member) => member.email || "")].filter(Boolean);
  const uniqueEmails = new Set<string>();
  const duplicateEmail = teamEmails.find((email) => {
    const normalized = normalizeEmail(email);
    if (uniqueEmails.has(normalized)) {
      return true;
    }
    uniqueEmails.add(normalized);
    return false;
  });

  if (duplicateEmail) {
    return NextResponse.json(
      { error: "All team member emails must be unique." },
      { status: 400 }
    );
  }

  const requestedEventId = normalizeString(body?.eventId);
  const { userId } = await auth();
  const userIdentifier = normalizeString(userId) || teamLeadEmail;

  try {
    const event = await writeClient.fetch<EventForRegistration | null>(
      EVENT_BY_SLUG_FOR_TEAM_REGISTRATION,
      { slug }
    );

    if (!event?._id) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (requestedEventId && requestedEventId !== event._id) {
      return NextResponse.json(
        { error: "Event identifier mismatch. Please reload and try again." },
        { status: 400 }
      );
    }

    const status = isEventStatus(event.status) ? event.status : undefined;
    const statusOverride = isEventStatus(event.statusOverride) ? event.statusOverride : undefined;
    const computedStatus = computeEventStatus({
      date: event.date,
      status,
      statusOverride,
    });

    const attendees = Array.isArray(event.attendees) ? event.attendees : [];
    const attendeeCount = attendees.length;
    const maxAttendees = typeof event.maxAttendees === "number" ? event.maxAttendees : null;
    const capacityReached = typeof maxAttendees === "number" && attendeeCount >= maxAttendees;
    const seatsAvailable =
      typeof maxAttendees === "number" ? Math.max(0, maxAttendees - attendeeCount) : Number.POSITIVE_INFINITY;

    const registrationDeadlineValue = event.registrationDeadline
      ? new Date(event.registrationDeadline).getTime()
      : Number.NaN;
    const registrationDeadlinePassed =
      Number.isFinite(registrationDeadlineValue) && registrationDeadlineValue < Date.now();

    const minTeamSize =
      typeof event.minTeamSize === "number" && event.minTeamSize > 0 ? event.minTeamSize : 2;
    const configuredMaxTeamSize =
      typeof event.maxTeamSize === "number" && event.maxTeamSize > 0
        ? event.maxTeamSize
        : Math.max(minTeamSize, 20);
    const maxTeamSize = Math.max(configuredMaxTeamSize, minTeamSize);
    const teamSize = 1 + teamMembers.length;

    if (computedStatus !== "upcoming" || event.registrationOpen === false) {
      return NextResponse.json(
        {
          error:
            computedStatus === "ended"
              ? "This event has already ended."
              : "Registration is currently closed.",
        },
        { status: 400 }
      );
    }

    if (event.teamRegistrationEnabled === false) {
      return NextResponse.json(
        { error: "Team registration is not available for this event." },
        { status: 400 }
      );
    }

    if (registrationDeadlinePassed) {
      return NextResponse.json(
        { error: "Registration deadline has passed for this event." },
        { status: 400 }
      );
    }

    if (teamSize < minTeamSize) {
      return NextResponse.json(
        { error: `Teams must include at least ${minTeamSize} people for this event.` },
        { status: 400 }
      );
    }

    if (teamSize > maxTeamSize) {
      return NextResponse.json(
        { error: `Teams can include at most ${maxTeamSize} people for this event.` },
        { status: 400 }
      );
    }

    if (capacityReached) {
      return NextResponse.json(
        { error: "Registration is full for this event." },
        { status: 400 }
      );
    }

    if (seatsAvailable < teamSize) {
      return NextResponse.json(
        {
          error: `Only ${seatsAvailable} spot${seatsAvailable === 1 ? "" : "s"} remain. Please adjust your team size.`,
        },
        { status: 400 }
      );
    }

    const existingAttendeeEmails = new Set(
      attendees
        .map((attendee) => normalizeEmail(attendee?.email))
        .filter((email) => email)
    );
    const conflictEmail = teamEmails.find((email) => existingAttendeeEmails.has(normalizeEmail(email)));

    if (conflictEmail) {
      return NextResponse.json(
        {
          error: `At least one team member is already registered for this event (${conflictEmail}).`,
        },
        { status: 400 }
      );
    }

    if (userIdentifier) {
      const alreadyRegistered = await isUserEventAttendee(userIdentifier, event, {
        attendeesOverride: attendees,
      });

      if (alreadyRegistered) {
        return NextResponse.json(
          { error: "You’re already registered for this event." },
          { status: 400 }
        );
      }
    }

    const eventSlugValue = normalizeString(event.slug) || slug;
    const eventSlugLower = eventSlugValue.toLowerCase();
    const existingRsvps = await writeClient.fetch<{ email?: string }[]>(
      EXISTING_RSVP_BY_EMAIL_QUERY,
      {
        emails: teamEmails.map((email) => normalizeEmail(email)),
        eventId: event._id,
        eventSlug: eventSlugLower,
      }
    );
    const existingRsvpEmails = new Set(
      (existingRsvps || []).map((entry) => normalizeEmail(entry?.email)).filter(Boolean)
    );
    const conflictingRsvpEmail = teamEmails.find((email) => existingRsvpEmails.has(normalizeEmail(email)));

    if (conflictingRsvpEmail) {
      return NextResponse.json(
        {
          error: `At least one team member already submitted a registration (${conflictingRsvpEmail}).`,
        },
        { status: 400 }
      );
    }

    const teamId = crypto.randomUUID();
    const now = new Date().toISOString();
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";
    const userAgent = request.headers.get("user-agent") || "";

    const teamLeadAttendee: EventAttendee = {
      _key: crypto.randomUUID(),
      name: teamLeadName,
      email: teamLeadEmail,
      phone: teamLeadPhone,
      organization: teamLeadOrganization,
      companyName: teamLeadOrganization,
      jobTitle: teamLeadJobTitle,
      registrationType: "team_lead",
      dietaryRequirements,
      accessibilityNeeds,
      notes: message,
      isTeamLead: true,
      teamId,
      registrationDate: now,
      userId: userId || undefined,
      clerkUserId: userId || undefined,
    };

    const memberAttendees: EventAttendee[] = teamMembers.map((member) => ({
      _key: crypto.randomUUID(),
      name: member.name,
      email: member.email ? normalizeEmail(member.email) : undefined,
      jobTitle: member.jobTitle,
      registrationType: "team_member",
      isTeamLead: false,
      teamId,
      registrationDate: now,
    }));

    const leadRsvpDoc = {
      _type: "eventRsvp",
      name: teamLeadName,
      email: teamLeadEmail,
      event: {
        _type: "reference",
        _ref: event._id,
      },
      eventSlug: eventSlugValue,
      organization: teamLeadOrganization,
      jobTitle: teamLeadJobTitle,
      registrationType: "team_lead",
      teamId,
      teamLeadEmail: teamLeadEmail,
      teamMembers: teamMembers.map((member) => ({
        name: member.name,
        email: member.email,
        jobTitle: member.jobTitle,
      })),
      guestsCount: teamSize,
      message: message || undefined,
      dietaryRequirements,
      accessibilityNeeds,
      newsletterOptIn,
      status: "new",
      priority: teamSize > 4 ? "high" : "normal",
      submittedAt: now,
      ipAddress,
      userAgent,
      clerkUserId: userId || undefined,
    };

    const memberRsvpDocs = teamMembers.map((member) => ({
      _type: "eventRsvp",
      name: member.name,
      email: member.email,
      event: {
        _type: "reference",
        _ref: event._id,
      },
      eventSlug: eventSlugValue,
      organization: teamLeadOrganization,
      jobTitle: member.jobTitle,
      registrationType: "team_member",
      teamId,
      teamLeadEmail: teamLeadEmail,
      guestsCount: 1,
      message: message || undefined,
      dietaryRequirements,
      accessibilityNeeds,
      newsletterOptIn,
      status: "new",
      priority: "normal",
      submittedAt: now,
      ipAddress,
      userAgent,
    }));

    const transaction = writeClient.transaction();

    transaction.create(leadRsvpDoc);
    memberRsvpDocs.forEach((doc) => transaction.create(doc));
    transaction.patch(event._id, (patch) =>
      patch.setIfMissing({ attendees: [] }).append("attendees", [teamLeadAttendee, ...memberAttendees])
    );

    await transaction.commit({ autoGenerateArrayKeys: true });

    revalidateTag("events");
    revalidateTag(`event:${eventSlugValue}`);

    const emailSubject = event.title
      ? `Team registration confirmed for ${event.title}`
      : "Your team registration is confirmed";
    const memberList =
      teamMembers.length > 0
        ? teamMembers.map((member) => `- ${member.name} (${member.email})`).join("\n")
        : "None provided";
    const textBody = [
      `Hi ${teamLeadName},`,
      "",
      "Thanks for registering your team. Your spots are confirmed.",
      `Event: ${event.title || slug}`,
      `Team ID: ${teamId}`,
      `Team size: ${teamSize}`,
      message ? `Notes: ${message}` : undefined,
      "",
      "Team members:",
      memberList,
      "",
      "We’ll share updates and reminders as the event approaches.",
      "",
      "Thanks,",
      "The Events Team",
    ]
      .filter(Boolean)
      .join("\n");

    const memberListHtml = teamMembers
      .map((member) => `<li>${member.name} (${member.email}${member.jobTitle ? ` — ${member.jobTitle}` : ""})</li>`)
      .join("");

    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="color:#0f172a;">Thanks for registering your team, ${teamLeadName}!</h2>
        <p>Your team is confirmed for <strong>${event.title || slug}</strong>.</p>
        <ul style="padding-left:18px; margin:16px 0; color:#0f172a;">
          <li><strong>Team ID:</strong> ${teamId}</li>
          <li><strong>Team size:</strong> ${teamSize}</li>
          ${message ? `<li><strong>Notes:</strong> ${message}</li>` : ""}
        </ul>
        <p style="margin:12px 0 4px;"><strong>Team members</strong></p>
        <ul style="padding-left:18px; margin:0 0 12px;">${memberListHtml || "<li>None provided</li>"}</ul>
        <p>We’ll share updates and reminders as the event approaches.</p>
        <p style="margin-top:24px;">Thanks,<br/>The Events Team</p>
      </div>
    `;

    const emailResult = await sendMail({
      email: teamLeadEmail,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
    });

    if (!emailResult.success) {
      console.error("Team registration confirmation email failed:", {
        slug,
        teamLeadEmail,
        error: emailResult.error,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Team registration confirmed. We’ve saved your spots.",
        teamId,
        attendees: [teamLeadAttendee, ...memberAttendees],
      },
      { status: 200 }
    );
  } catch (error) {
    if (isPermissionError(error)) {
      console.error("Team registration permissions error:", {
        slug,
        userId,
        error,
      });
      return NextResponse.json(
        {
          error: "Registration is temporarily unavailable. Please try again soon.",
          reason: "Sanity token lacks create/update permission.",
        },
        { status: 503 }
      );
    }

    console.error("Team registration failed:", {
      slug,
      userId,
      error,
    });
    return NextResponse.json(
      { error: "Unable to register right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
