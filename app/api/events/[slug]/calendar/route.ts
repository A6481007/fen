import { NextResponse } from "next/server";

import { sanityFetch } from "@/sanity/lib/live";
import { getEventBySlug } from "@/sanity/queries";

const formatICSDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

const escapeICSValue = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const normalizeString = (value?: string | null) => (typeof value === "string" ? value.trim() : "");

const resolveEventUrl = (slug: string) => {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "").replace(/\/$/, "");
  if (!baseUrl) return "";
  return `${baseUrl}/news/events/${encodeURIComponent(slug)}`;
};

const buildCalendarPayload = (event: {
  _id?: string;
  title?: string | null;
  slug?: string | { current?: string | null } | null;
  date?: string | null;
  endDate?: string | null;
  location?: string | null;
  onlineUrl?: string | null;
  description?: string | null;
  venue?: { name?: string | null; address?: string | null } | null;
}) => {
  const dateValue = normalizeString(event.date || "");
  if (!dateValue) return null;

  const start = new Date(dateValue);
  if (Number.isNaN(start.getTime())) return null;

  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
  const endDate = Number.isNaN(end.getTime()) ? new Date(start.getTime() + 60 * 60 * 1000) : end;

  const slugValue = normalizeString(
    typeof event.slug === "string" ? event.slug : event.slug?.current || ""
  );
  const eventTitle = normalizeString(event.title) || "Event";

  const locationLabel =
    normalizeString(event.location) ||
    normalizeString(event.venue?.name) ||
    normalizeString(event.venue?.address) ||
    (normalizeString(event.onlineUrl) ? "Online" : "");

  const eventUrl = slugValue ? resolveEventUrl(slugValue) : "";
  const descriptionParts = [normalizeString(event.description), normalizeString(event.onlineUrl), eventUrl]
    .filter(Boolean)
    .map((part) => escapeICSValue(part));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NCS Events//Event//EN",
    "BEGIN:VEVENT",
    `UID:${escapeICSValue(slugValue || event._id || formatICSDate(start))}@ncsecom`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSValue(eventTitle)}`,
    descriptionParts.length ? `DESCRIPTION:${descriptionParts.join("\\n\\n")}` : null,
    locationLabel ? `LOCATION:${escapeICSValue(locationLabel)}` : null,
    eventUrl ? `URL:${escapeICSValue(eventUrl)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return {
    calendar: lines.join("\r\n"),
    filename: `${slugValue || event._id || "event"}.ics`,
  };
};

const EVENT_BY_SLUG_OR_ID_QUERY = `*[_type == "event" && (!defined(publishStatus) || publishStatus == "published") && (slug.current == $slug || lower(slug.current) == $slugLower || _id == $slug)][0]{
  _id,
  title,
  slug,
  date,
  endDate,
  location,
  onlineUrl,
  description,
  venue{ name, address }
}`;

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = typeof slug === "string" ? decodeURIComponent(slug).trim() : "";

  if (!normalizedSlug) {
    return NextResponse.json({ error: "Missing event slug." }, { status: 400 });
  }

  let resolvedEvent = await getEventBySlug(normalizedSlug, null);

  if (!resolvedEvent || !resolvedEvent.date) {
    try {
      const { data } = await sanityFetch({
        query: EVENT_BY_SLUG_OR_ID_QUERY,
        params: { slug: normalizedSlug, slugLower: normalizedSlug.toLowerCase() },
      });
      resolvedEvent = (data as typeof resolvedEvent) || null;
    } catch (error) {
      console.error("Calendar event fetch failed:", error);
    }
  }

  if (!resolvedEvent) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const payload = buildCalendarPayload(resolvedEvent);

  if (!payload) {
    return NextResponse.json({ error: "Event date is missing or invalid." }, { status: 400 });
  }

  return new Response(payload.calendar, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${payload.filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}
