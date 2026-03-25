import { NextRequest, NextResponse } from "next/server";
import type { ClientError } from "@sanity/client";
import { auth } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { isUserEventAttendee } from "@/sanity/helpers";
import { computeEventStatus, isEventStatus, type EventStatus } from "@/sanity/helpers/eventStatus";
import { writeClient } from "@/sanity/lib/client";

type IncomingPayload = {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  organization?: string;
  jobTitle?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
  registrationType?: string;
  eventId?: string;
  slug?: string;
};

type EventForRegistration = {
  _id?: string;
  title?: string;
  slug?: string;
  date?: string;
  location?: string;
  description?: string;
  registrationOpen?: boolean;
  maxAttendees?: number;
  status?: EventStatus | string | null;
  statusOverride?: EventStatus | string | null;
  registrationDeadline?: string;
  waitlistEnabled?: boolean;
  attendees?: {
    _key?: string;
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    organization?: string;
    jobTitle?: string;
    registrationType?: string;
    dietaryRequirements?: string;
    accessibilityNeeds?: string;
    registrationDate?: string;
    clerkUserId?: string;
    userId?: string;
  }[];
};

const EVENT_BY_SLUG_FOR_REGISTRATION = `
  *[_type == "event" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    date,
    location,
    description,
    registrationOpen,
    maxAttendees,
    status,
    statusOverride,
    registrationDeadline,
    waitlistEnabled,
    attendees[]{
      _key,
      name,
      email,
      phone,
      companyName,
      organization,
      jobTitle,
      registrationType,
      dietaryRequirements,
      accessibilityNeeds,
      registrationDate,
      clerkUserId,
      userId
    }
  }
`;

const normalizeString = (value?: string | null) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value?: string | null) => normalizeString(value).toLowerCase();
const sanitizeOptionalField = (value?: string | null, maxLength = 500) => {
  const normalized = normalizeString(value);
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
};

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

  const name = normalizeString(body?.name);
  const email = normalizeEmail(body?.email);
  const phone = normalizeString(body?.phone);
  const companyName = sanitizeOptionalField(body?.companyName, 200);
  const organization = sanitizeOptionalField(body?.organization, 200) || companyName;
  const jobTitle = sanitizeOptionalField(body?.jobTitle, 200);
  const dietaryRequirements = sanitizeOptionalField(body?.dietaryRequirements);
  const accessibilityNeeds = sanitizeOptionalField(body?.accessibilityNeeds);
  const requestedEventId = normalizeString(body?.eventId);

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required for event registration." },
      { status: 400 }
    );
  }

  if (!organization) {
    return NextResponse.json(
      { error: "Organization is required for event registration." },
      { status: 400 }
    );
  }

  const { userId } = await auth();
  const userIdentifier = normalizeString(userId) || email;

  try {
    const event = await writeClient.fetch<EventForRegistration | null>(
      EVENT_BY_SLUG_FOR_REGISTRATION,
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
    const maxAttendees = typeof event.maxAttendees === "number" ? event.maxAttendees : null;
    const capacityReached = maxAttendees !== null && attendees.length >= maxAttendees;
    const waitlistEnabled = event.waitlistEnabled !== false;
    const registrationDeadlineValue = event.registrationDeadline
      ? new Date(event.registrationDeadline).getTime()
      : Number.NaN;
    const registrationDeadlinePassed =
      Number.isFinite(registrationDeadlineValue) && registrationDeadlineValue < Date.now();

    if (computedStatus === "ended") {
      return NextResponse.json(
        { error: "This event has already ended." },
        { status: 400 }
      );
    }

    if (computedStatus !== "upcoming" || event.registrationOpen === false) {
      return NextResponse.json(
        { error: "Registration is currently closed." },
        { status: 400 }
      );
    }

    if (registrationDeadlinePassed) {
      return NextResponse.json(
        { error: "Registration deadline has passed for this event." },
        { status: 400 }
      );
    }

    if (capacityReached && !waitlistEnabled) {
      return NextResponse.json(
        { error: "Registration is full for this event." },
        { status: 400 }
      );
    }

    const isWaitlist = capacityReached && waitlistEnabled;

    const alreadyRegistered = await isUserEventAttendee(userIdentifier, event, {
      attendeesOverride: attendees,
    });

    if (alreadyRegistered) {
      const existingAttendee =
        attendees.find((attendee) => {
          const attendeeEmail = normalizeEmail(attendee?.email);
          const attendeeUserId = normalizeString(attendee?.userId);
          const attendeeClerkId = normalizeString(attendee?.clerkUserId);
          return (
            (email && attendeeEmail === email) ||
            (userId &&
              (attendeeUserId === userId || attendeeClerkId === userId || attendeeEmail === userId))
          );
        }) || null;

      return NextResponse.json(
        {
          success: true,
          message: "You’re already registered for this event.",
          attendee: existingAttendee,
        },
        { status: 200 }
      );
    }

    const now = new Date().toISOString();
    const eventSlugValue = normalizeString(event.slug) || slug;
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";
    const userAgent = request.headers.get("user-agent") || "";

    const newAttendee = {
      _key: crypto.randomUUID(),
      name,
      email,
      phone,
      companyName: companyName || organization,
      organization,
      jobTitle,
      registrationType: "individual",
      dietaryRequirements,
      accessibilityNeeds,
      registrationDate: now,
      userId: userId || undefined,
      clerkUserId: userId || undefined,
    };

    const registrationRsvp = {
      _type: "eventRsvp",
      name,
      email,
      event: {
        _type: "reference",
        _ref: event._id,
      },
      eventSlug: eventSlugValue,
      organization,
      jobTitle,
      registrationType: "individual",
      guestsCount: 1,
      dietaryRequirements,
      accessibilityNeeds,
      status: isWaitlist ? "waitlisted" : "new",
      submittedAt: now,
      ipAddress,
      userAgent,
      clerkUserId: userId || undefined,
    };

    const transaction = writeClient.transaction();

    transaction.create(registrationRsvp);

    if (!isWaitlist) {
      transaction.patch(event._id, (patch) =>
        patch.setIfMissing({ attendees: [] }).append("attendees", [newAttendee])
      );
    }

    await transaction.commit({ autoGenerateArrayKeys: true });

    if (!isWaitlist) {
      revalidateTag("events");
      revalidateTag(`event:${eventSlugValue}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: isWaitlist
          ? "This event is at capacity. We’ve added you to the waitlist."
          : "Registration confirmed. We’ve saved your spot.",
        status: isWaitlist ? "waitlisted" : "registered",
        attendee: newAttendee,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isPermissionError(error)) {
      console.error("Event registration permissions error:", {
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

    console.error("Event registration failed:", {
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
