import { NextRequest, NextResponse } from "next/server";

import { sanityClient } from "@/lib/sanity/client";
import { searchInsightsGroq } from "@/lib/sanity/queries";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "insights:search", 60, 60);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const langParam = searchParams.get("lang");
  const lang = langParam === "th" ? "th" : "en";
  const rawKind = searchParams.get("kind");
  const kind = rawKind === "solutions" || rawKind === "knowledge" ? rawKind : undefined;

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const term = `${q}*`;
  const data = await sanityClient.fetch(searchInsightsGroq, { q: term, lang, kind });
  const origin = new URL(req.url).origin;
  void fetch(`${origin}/api/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: "search_query",
      eventParams: {
        query: q,
        kind,
        locale: lang,
        resultCount: Array.isArray(data) ? data.length : 0,
      },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
  return NextResponse.json({ items: data });
}
