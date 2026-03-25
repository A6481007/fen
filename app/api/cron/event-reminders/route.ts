import { NextResponse } from "next/server";

import { sendMail } from "@/lib/emailService";
import { writeClient } from "@/sanity/lib/client";

export const dynamic = "force-dynamic";

type EventReminderRecord = {
  _id: string;
  name?: string;
  email?: string;
  status?: string;
  event?: {
    _id?: string;
    title?: string | null;
    slug?: { current?: string | null } | string | null;
    date?: string | null;
    endDate?: string | null;
    timezone?: string | null;
    location?: string | null;
    onlineUrl?: string | null;
    description?: string | null;
    venue?: { name?: string | null; address?: string | null } | null;
  } | null;
};

type ReminderWindow = {
  key: "7d" | "24h" | "1h";
  hours: number;
  field: "reminder7dSentAt" | "reminder24hSentAt" | "reminder1hSentAt";
  subjectSuffix: string;
};

const REMINDERS: ReminderWindow[] = [
  { key: "7d", hours: 24 * 7, field: "reminder7dSentAt", subjectSuffix: "starts in 7 days" },
  { key: "24h", hours: 24, field: "reminder24hSentAt", subjectSuffix: "starts in 24 hours" },
  { key: "1h", hours: 1, field: "reminder1hSentAt", subjectSuffix: "starts in 1 hour" },
];

const REMINDER_QUERY_24H = `*[_type == "eventRsvp" && status not in ["cancelled","archived"] && defined(email) && defined(event->date)
  && event->date >= $start && event->date <= $end && !defined(reminder24hSentAt)
]{
  _id,
  name,
  email,
  status,
  event->{
    _id,
    title,
    slug,
    date,
    endDate,
    timezone,
    location,
    onlineUrl,
    description,
    venue{ name, address }
  }
}`;

const REMINDER_QUERY_7D = `*[_type == "eventRsvp" && status not in ["cancelled","archived"] && defined(email) && defined(event->date)
  && event->date >= $start && event->date <= $end && !defined(reminder7dSentAt)
]{
  _id,
  name,
  email,
  status,
  event->{
    _id,
    title,
    slug,
    date,
    endDate,
    timezone,
    location,
    onlineUrl,
    description,
    venue{ name, address }
  }
}`;

const REMINDER_QUERY_1H = `*[_type == "eventRsvp" && status not in ["cancelled","archived"] && defined(email) && defined(event->date)
  && event->date >= $start && event->date <= $end && !defined(reminder1hSentAt)
]{
  _id,
  name,
  email,
  status,
  event->{
    _id,
    title,
    slug,
    date,
    endDate,
    timezone,
    location,
    onlineUrl,
    description,
    venue{ name, address }
  }
}`;

const normalizeEmail = (value?: string | null) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const normalizeString = (value?: string | null) => (typeof value === "string" ? value.trim() : "");

const getBaseUrl = () => {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return (raw || "http://localhost:3000").replace(/\/$/, "");
};

const resolveEventSlug = (slug?: { current?: string | null } | string | null) => {
  if (typeof slug === "string") return slug.trim();
  if (slug && typeof slug === "object" && typeof slug.current === "string") return slug.current.trim();
  return "";
};

const formatEventDate = (value?: string | null, timezone?: string | null) => {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone || undefined,
    }).format(date);
  } catch {
    return date.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  }
};

const buildReminderEmail = (record: EventReminderRecord, reminder: ReminderWindow) => {
  const event = record.event;
  const eventTitle = normalizeString(event?.title) || "Your upcoming event";
  const eventSlug = resolveEventSlug(event?.slug);
  const baseUrl = getBaseUrl();
  const eventUrl = eventSlug ? `${baseUrl}/news/events/${encodeURIComponent(eventSlug)}` : `${baseUrl}/news/events`;
  const calendarUrl = eventSlug ? `${baseUrl}/api/events/${encodeURIComponent(eventSlug)}/calendar` : "";
  const eventDateLabel = formatEventDate(event?.date, event?.timezone || null);
  const locationLabel =
    normalizeString(event?.location) ||
    normalizeString(event?.venue?.name) ||
    normalizeString(event?.venue?.address) ||
    (normalizeString(event?.onlineUrl) ? "Online" : "Location TBA");
  const attendeeName = normalizeString(record.name) || "there";
  const joinLink = normalizeString(event?.onlineUrl);

  const subject = `Reminder: ${eventTitle} ${reminder.subjectSuffix}`;
  const textLines = [
    `Hi ${attendeeName},`,
    "",
    `This is a quick reminder that ${eventTitle} ${reminder.subjectSuffix}.`,
    `Date & time: ${eventDateLabel}`,
    `Location: ${locationLabel}`,
    joinLink ? `Join link: ${joinLink}` : null,
    `Event page: ${eventUrl}`,
    calendarUrl ? `Add to calendar: ${calendarUrl}` : null,
    "",
    "See you soon,",
    "The News Hub Team",
  ].filter(Boolean);

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="color:#0f172a;">Hi ${attendeeName},</h2>
      <p>This is a quick reminder that <strong>${eventTitle}</strong> ${reminder.subjectSuffix}.</p>
      <div style="margin:20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <p style="margin:0;"><strong>Date &amp; time:</strong> ${eventDateLabel}</p>
        <p style="margin:6px 0 0;"><strong>Location:</strong> ${locationLabel}</p>
        ${joinLink ? `<p style="margin:6px 0 0;"><strong>Join link:</strong> <a href="${joinLink}">${joinLink}</a></p>` : ""}
      </div>
      <p><a href="${eventUrl}" style="color:#0f172a;font-weight:600;">View event details</a></p>
      ${
        calendarUrl
          ? `<p><a href="${calendarUrl}" style="color:#0f172a;font-weight:600;">Add to calendar (.ics)</a></p>`
          : ""
      }
      <p style="margin-top:24px;">See you soon,<br/>The News Hub Team</p>
    </div>
  `;

  return { subject, text: textLines.join("\n"), html };
};

const computeWindow = (hours: number, bufferMinutes: number) => {
  const now = new Date();
  const targetMs = hours * 60 * 60 * 1000;
  const bufferMs = bufferMinutes * 60 * 1000;
  return {
    start: new Date(now.getTime() + targetMs - bufferMs).toISOString(),
    end: new Date(now.getTime() + targetMs + bufferMs).toISOString(),
    nowIso: now.toISOString(),
  };
};

const sendReminderBatch = async (reminder: ReminderWindow, bufferMinutes: number) => {
  const window = computeWindow(reminder.hours, bufferMinutes);
  const query =
    reminder.key === "7d"
      ? REMINDER_QUERY_7D
      : reminder.key === "24h"
      ? REMINDER_QUERY_24H
      : REMINDER_QUERY_1H;
  const records = await writeClient.fetch<EventReminderRecord[]>(query, {
    start: window.start,
    end: window.end,
  });

  if (!Array.isArray(records) || records.length === 0) {
    return { total: 0, sent: 0, failed: 0 };
  }

  const sentKeys = new Set<string>();
  let sent = 0;
  let failed = 0;

  for (const record of records) {
    const email = normalizeEmail(record.email);
    const eventId = normalizeString(record.event?._id) || resolveEventSlug(record.event?.slug);
    if (!email || !eventId || !record.event?.date) {
      continue;
    }

    const dedupeKey = `${email}|${eventId}|${reminder.key}`;
    if (sentKeys.has(dedupeKey)) {
      await writeClient.patch(record._id).set({ [reminder.field]: window.nowIso }).commit();
      continue;
    }

    const { subject, text, html } = buildReminderEmail(record, reminder);
    const result = await sendMail({ email, subject, text, html });

    if (result.success) {
      sentKeys.add(dedupeKey);
      sent += 1;
      await writeClient.patch(record._id).set({ [reminder.field]: window.nowIso }).commit();
    } else {
      failed += 1;
      console.error("Failed to send event reminder:", {
        reminder: reminder.key,
        registrationId: record._id,
        email,
        error: result.error,
      });
    }
  }

  return { total: records.length, sent, failed };
};

export async function GET() {
  try {
    const bufferMinutes = Number(process.env.EVENT_REMINDER_WINDOW_MINUTES || "60");
    const summary = [] as Array<{ key: string; total: number; sent: number; failed: number }>;

    for (const reminder of REMINDERS) {
      const result = await sendReminderBatch(reminder, bufferMinutes);
      summary.push({ key: reminder.key, ...result });
    }

    return NextResponse.json({ status: "ok", summary });
  } catch (error) {
    console.error("[events] Reminder cron failed", error);
    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
