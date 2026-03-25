import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { KNOWLEDGE_TYPES, SOLUTION_TYPES, type InsightTypeKey } from "@/constants/insightTypes";
import { sanityPreviewClient } from "@/lib/sanity/previewClient";

const normalizeSlug = (value: string | null) => {
  if (!value) return "";
  return value.trim().replace(/^\/+|\/+$/g, "");
};

const resolveInsightRedirect = async (slug: string) => {
  try {
    const doc = await sanityPreviewClient.fetch<{
      slug?: { current?: string | null } | null;
      insightType?: string | null;
    }>(
      `*[_type == "insight" && slug.current == $slug][0]{slug, insightType}`,
      { slug }
    );

    const resolvedSlug = normalizeSlug(doc?.slug?.current || slug);
    const insightType = (doc?.insightType || "") as
      | InsightTypeKey
      | "";

    if (SOLUTION_TYPES.has(insightType as InsightTypeKey)) {
      return `/insight/solutions/${resolvedSlug}`;
    }

    if (KNOWLEDGE_TYPES.has(insightType as InsightTypeKey)) {
      return `/insight/knowledge/${resolvedSlug}`;
    }

    return `/insight/knowledge/${resolvedSlug}`;
  } catch (error) {
    console.error("[preview] Failed to resolve insight redirect", { slug, error });
    const resolvedSlug = normalizeSlug(slug);
    return `/insight/knowledge/${resolvedSlug}`;
  }
};

const resolveRedirectPath = async (type: string, slug: string) => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return "/";

  if (type === "insight") {
    return resolveInsightRedirect(normalizedSlug);
  }

  if (type === "blog") {
    return `/blog/${normalizedSlug}`;
  }

  if (type === "news") {
    return `/news/${normalizedSlug}`;
  }

  return `/${normalizedSlug}`;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");
  const type = searchParams.get("type") || "insight";
  const envSecret =
    process.env.SANITY_PREVIEW_SECRET || process.env.NEXT_PUBLIC_SANITY_PREVIEW_SECRET;

  if (!secret || !envSecret || secret !== envSecret) {
    return new NextResponse("Invalid preview secret", { status: 401 });
  }

  if (!slug) {
    return new NextResponse("Missing slug", { status: 400 });
  }

  (await draftMode()).enable();

  const redirectPath = await resolveRedirectPath(type, slug);
  const redirectUrl = new URL(redirectPath, request.url);

  return NextResponse.redirect(redirectUrl);
}
