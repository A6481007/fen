import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

const ACTIVE_DEAL_PROJECTION = `
  "activeDeal": *[
    _type == "deal"
    && status == "active"
    && references(^._id)
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now()))
  ] | order(coalesce(priority, 0) desc)[0]{
    _id,
    dealId,
    dealType,
    title,
    status,
    priority,
    startDate,
    endDate,
    originalPrice,
    dealPrice,
    badge,
    badgeColor,
    quantityLimit,
    perCustomerLimit,
    soldCount,
    "discountPercent": select(
      coalesce(originalPrice, ^.price) > 0 => round(
        (coalesce(originalPrice, ^.price) - coalesce(dealPrice, originalPrice, ^.price))
        / coalesce(originalPrice, ^.price) * 100
      ),
      0
    ),
    "remainingQty": coalesce(quantityLimit, 999999) - coalesce(soldCount, 0)
  }
`;

const PRODUCT_PROJECTION = `
  _id,
  name,
  sku,
  slug,
  price,
  discount,
  stock,
  status,
  isFeatured,
  images,
  brand->{_id,title,slug},
  categories[]->{_id,title,slug,isParentCategory},
  ${ACTIVE_DEAL_PROJECTION}
`;

const FEATURED_QUERY = `*[_type == "product" && isActive != false && isFeatured == true] | order(name asc)[0...$limit]{${PRODUCT_PROJECTION}}`;

const SEARCH_QUERY = `
  *[
    _type == "product" &&
    isActive != false &&
    (
      name match $term ||
      sku match $term ||
      description match $term ||
      brand->title match $term ||
      brand->slug.current match $term ||
      categories[]->title match $term ||
      categories[]->slug.current match $term
    )
  ]
  | score(
      (name match $term) ||
      (sku match $term) ||
      (brand->title match $term) ||
      (categories[]->title match $term) ||
      (description match $term)
    )
  | order(_score desc, _updatedAt desc)[0...$limit]{${PRODUCT_PROJECTION}, _score}
`;

const SIMPLE_SEARCH_QUERY = `
  *[
    _type == "product" &&
    isActive != false &&
    (
      name match $term ||
      sku match $term ||
      description match $term ||
      brand->title match $term ||
      categories[]->title match $term
    )
  ] | order(_updatedAt desc)[0...$limit]{${PRODUCT_PROJECTION}}
`;

const dedupeById = (items: any[] | null | undefined) => {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, any>();
  items.forEach((item) => {
    const id = item?._id;
    if (id && !map.has(id)) {
      map.set(id, item);
    }
  });
  return Array.from(map.values());
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") || "").trim();
  const featuredOnly = searchParams.get("featured") === "1";
  const limit = Math.max(1, Math.min(24, Number(searchParams.get("limit") || "12")));
  const token = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN || "";
  const searchClient = token ? client.withConfig({ token, useCdn: false }) : client;

  try {
    // Basic logging to help surface malformed requests in logs
    console.log("[search] params", {
      featuredOnly,
      limit,
      term,
      hasToken: Boolean(token),
    });

    if (featuredOnly) {
      const items = await searchClient.fetch(FEATURED_QUERY, { limit });
      return NextResponse.json({ items: dedupeById(items).slice(0, limit) });
    }

    if (!term) {
      return NextResponse.json({ items: [], error: "Missing search term" }, { status: 400 });
    }

    const termWithWildcard = `${term}*`;

    // Primary search (scored)
    try {
      const items = await searchClient.fetch(SEARCH_QUERY, { term: termWithWildcard, limit });
      const deduped = dedupeById(items).slice(0, limit);
      return NextResponse.json({ items: deduped, source: "scored" });
    } catch (primaryError) {
      console.error("[search] primary query failed, trying fallback", primaryError);
    }

    // Fallback search (simpler query)
    try {
      const items = await searchClient.fetch(SIMPLE_SEARCH_QUERY, { term: termWithWildcard, limit });
      const deduped = dedupeById(items).slice(0, limit);
      return NextResponse.json({ items: deduped, source: "fallback" });
    } catch (fallbackError) {
      console.error("[search] fallback query failed", fallbackError);
      throw fallbackError;
    }

  } catch (error: any) {
    const status =
      typeof error?.statusCode === "number"
        ? error.statusCode
        : typeof error?.status === "number"
        ? error.status
        : 500;
    const detail = !token ? "Missing SANITY_API_READ_TOKEN; set it if your dataset is private." : undefined;
    console.error("Search API error", error);
    return NextResponse.json({ items: [], error: "search_failed", detail }, { status });
  }
}
