import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, type User } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { isUserAdmin } from "@/lib/adminUtils";
import { getPromotionAnalytics } from "@/lib/promotions/analytics";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_OFFSET = 0;
const PUBLIC_CACHE_SECONDS = 60;

const PROMOTION_TAG = "promotions";
const PROMOTION_TYPE_TAG = (type: string) => `promotions:type:${type}`;
const PROMOTION_SEGMENT_TAG = (segment: string) => `promotions:segment:${segment}`;

type StatusFilter = "active" | "scheduled" | "ended" | "all";

interface PromotionCampaignDocument {
  _id: string;
  campaignId?: string | null;
  name?: string | null;
  slug?: string | null;
  type?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  discountType?: string | null;
  discountValue?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  badgeLabel?: string | null;
  shortDescription?: string | null;
  thumbnailUrl?: string | null;
  priority?: number | null;
}

interface CampaignAnalyticsPayload {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  totalDiscountSpent: number;
  totalRevenue: number;
  roi: number;
}

interface CampaignResponseItem {
  campaignId: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  discountType: string;
  discountValue: number;
  discountDisplay: string;
  badgeLabel: string;
  shortDescription: string;
  thumbnailUrl: string;
  priority: number;
  isActive: boolean;
  isExpired: boolean;
  timeRemaining?: number;
  analytics?: CampaignAnalyticsPayload;
}

const PROMOTION_CAMPAIGN_PROJECTION = `
  _id,
  campaignId,
  name,
  type,
  status,
  startDate,
  endDate,
  "slug": slug.current,
  "priority": coalesce(priority, 0),
  discountType,
  "discountValue": coalesce(discountValue, 0),
  "buyQuantity": coalesce(buyQuantity, 0),
  "getQuantity": coalesce(getQuantity, 0),
  badgeLabel,
  shortDescription,
  "thumbnailUrl": coalesce(thumbnailImage.asset->url, heroImage.asset->url)
`;

function normalizeString(value: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseStatusParam(rawStatus: string | null): StatusFilter {
  const normalized = normalizeString(rawStatus).toLowerCase();
  if (normalized === "scheduled") return "scheduled";
  if (normalized === "ended") return "ended";
  if (normalized === "all") return "all";
  return "active";
}

function parseLimit(rawLimit: string | null): number {
  const parsed = Number.parseInt(normalizeString(rawLimit), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function parseOffset(rawOffset: string | null): number {
  const parsed = Number.parseInt(normalizeString(rawOffset), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_OFFSET;
  }
  return parsed;
}

function shouldIncludeAnalytics(rawFlag: string | null): boolean {
  return normalizeString(rawFlag).toLowerCase() === "true";
}

function buildStatusClause(status: StatusFilter): string | null {
  switch (status) {
    case "active":
      return `status == "active" && dateTime(startDate) <= dateTime(now()) && dateTime(endDate) >= dateTime(now())`;
    case "scheduled":
      return `(status == "scheduled" || dateTime(startDate) > dateTime(now()))`;
    case "ended":
      return `(status == "ended" || dateTime(endDate) < dateTime(now()))`;
    default:
      return null;
  }
}

function buildCacheTags(type?: string, segment?: string): string[] {
  const tags = new Set<string>([PROMOTION_TAG]);
  if (type) {
    tags.add(PROMOTION_TYPE_TAG(type));
  }
  if (segment) {
    tags.add(PROMOTION_SEGMENT_TAG(segment));
  }
  return Array.from(tags);
}

function safeDateMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatDiscountDisplay(promotion: PromotionCampaignDocument): string {
  const discountValue = promotion.discountValue ?? 0;
  const buyQty = promotion.buyQuantity ?? 0;
  const getQty = promotion.getQuantity ?? 0;

  switch (promotion.discountType) {
    case "percentage":
      return `${Math.round(discountValue)}% OFF`;
    case "fixed":
      return `Save $${discountValue.toFixed(2)}`;
    case "bxgy":
      return `Buy ${buyQty} Get ${getQty}`;
    case "freeShipping":
      return "Free Shipping";
    case "points":
      return `${discountValue} bonus points`;
    default:
      return "Special Offer";
  }
}

function computeRoi(totalRevenue: number, totalDiscountSpent: number): number {
  if (totalDiscountSpent <= 0) return 0;
  return (totalRevenue - totalDiscountSpent) / totalDiscountSpent;
}

function readMetadataRoles(meta?: Record<string, unknown>): string[] {
  if (!meta) return [];

  const candidate = meta.role ?? meta.roles;
  const values = Array.isArray(candidate) ? candidate : [candidate];

  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
}

function hasAdminRole(user: Pick<User, "publicMetadata" | "privateMetadata">): boolean {
  const roles = [
    ...readMetadataRoles(user?.publicMetadata as Record<string, unknown> | undefined),
    ...readMetadataRoles(user?.privateMetadata as Record<string, unknown> | undefined),
  ];

  return roles.includes("admin");
}

function buildCampaignResponse(
  promotion: PromotionCampaignDocument,
  analytics?: CampaignAnalyticsPayload
): CampaignResponseItem {
  const nowMs = Date.now();
  const startMs = safeDateMs(promotion.startDate);
  const endMs = safeDateMs(promotion.endDate);

  const isActive =
    promotion.status === "active" &&
    (startMs === null || startMs <= nowMs) &&
    (endMs === null || endMs >= nowMs);
  const isExpired = endMs !== null && endMs < nowMs;
  const timeRemaining = endMs !== null ? Math.max(0, Math.floor((endMs - nowMs) / 1000)) : undefined;
  const campaignId = promotion.campaignId || promotion._id;

  return {
    campaignId,
    name: promotion.name ?? campaignId,
    slug: promotion.slug ?? "",
    type: promotion.type ?? "promotion",
    status: promotion.status ?? "unknown",
    startDate: promotion.startDate ?? "",
    endDate: promotion.endDate ?? "",
    discountType: promotion.discountType ?? "percentage",
    discountValue: promotion.discountValue ?? 0,
    discountDisplay: formatDiscountDisplay(promotion),
    badgeLabel: promotion.badgeLabel ?? "",
    shortDescription: promotion.shortDescription ?? "",
    thumbnailUrl: promotion.thumbnailUrl ?? "",
    priority: promotion.priority ?? 0,
    isActive,
    isExpired,
    ...(typeof timeRemaining === "number" ? { timeRemaining } : {}),
    ...(analytics ? { analytics } : {}),
  };
}

async function requireAdminAccess() {
  // Canonical API auth is Clerk (see docs/AUTH_STANDARD.md). Admin guard checks Clerk roles + email allowlist.
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401 as const, message: "Authentication required for analytics" };
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress;

  const hasRoleAdmin = hasAdminRole(user);
  const isAllowlistedAdmin = email ? isUserAdmin(email) : false;

  if (!hasRoleAdmin && !isAllowlistedAdmin) {
    return { ok: false, status: 403 as const, message: "Forbidden: admin access required for analytics" };
  }

  return { ok: true as const, email: email ?? "" };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = parseStatusParam(searchParams.get("status"));
    const typeFilter = normalizeString(searchParams.get("type"));
    const segmentFilter = normalizeString(searchParams.get("segment"));
    const limit = parseLimit(searchParams.get("limit"));
    const offset = parseOffset(searchParams.get("offset"));
    const includeAnalytics = shouldIncludeAnalytics(searchParams.get("includeAnalytics"));

    if (includeAnalytics) {
      const adminCheck = await requireAdminAccess();
      if (!adminCheck.ok) {
        return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status });
      }
    }

    const filterClauses: string[] = ['status != "draft"', 'status != "archived"'];
    const statusClause = buildStatusClause(status);
    if (statusClause) {
      filterClauses.push(statusClause);
    }
    if (typeFilter) {
      filterClauses.push("type == $type");
    }
    if (segmentFilter) {
      filterClauses.push("targetAudience.segmentType == $segment");
    }

    const whereClause = filterClauses.length ? ` && ${filterClauses.join(" && ")}` : "";
    const sliceEnd = offset + limit;

    const params: Record<string, string> = {};
    if (typeFilter) params.type = typeFilter;
    if (segmentFilter) params.segment = segmentFilter;

    const campaignsQuery = `
      *[_type == "promotion"${whereClause}]
      | order(coalesce(priority, 0) desc, dateTime(startDate) asc)
      [${offset}...${sliceEnd}]{
        ${PROMOTION_CAMPAIGN_PROJECTION}
      }
    `;

    const countQuery = `
      count(*[_type == "promotion"${whereClause}])
    `;

    const tags = buildCacheTags(typeFilter, segmentFilter);
    const fetchOptions = includeAnalytics
      ? { cache: "no-store" as const }
      : { next: { revalidate: PUBLIC_CACHE_SECONDS, tags } };

    const [campaigns, total] = await Promise.all([
      client.fetch<PromotionCampaignDocument[]>(campaignsQuery, params, fetchOptions),
      client.fetch<number>(countQuery, params, fetchOptions),
    ]);

    let campaignsWithAnalytics: CampaignResponseItem[] = [];

    if (includeAnalytics) {
      const analyticsResults = await Promise.all(
        (campaigns || []).map(async (campaign) => {
          const analytics = await getPromotionAnalytics(campaign.campaignId || campaign._id);
          const analyticsPayload: CampaignAnalyticsPayload | undefined = analytics
            ? {
                impressions: analytics.impressions,
                clicks: analytics.clicks,
                conversions: analytics.conversions,
                conversionRate: analytics.conversionRate,
                totalDiscountSpent: analytics.totalDiscountSpent,
                totalRevenue: analytics.totalRevenue,
                roi: computeRoi(analytics.totalRevenue, analytics.totalDiscountSpent),
              }
            : {
                impressions: 0,
                clicks: 0,
                conversions: 0,
                conversionRate: 0,
                totalDiscountSpent: 0,
                totalRevenue: 0,
                roi: 0,
              };

          return buildCampaignResponse(campaign, analyticsPayload);
        })
      );

      campaignsWithAnalytics = analyticsResults;
    } else {
      campaignsWithAnalytics = (campaigns || []).map((campaign) => buildCampaignResponse(campaign));
    }

    const itemCount = campaignsWithAnalytics.length;
    const totalCount = Number.isFinite(total) ? total : 0;
    const hasMore = offset + itemCount < totalCount;

    const cacheHeader = includeAnalytics
      ? "no-store"
      : `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS / 2}`;

    return NextResponse.json(
      {
        campaigns: campaignsWithAnalytics,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore,
        },
        filters: {
          status,
          ...(typeFilter ? { type: typeFilter } : {}),
          ...(segmentFilter ? { segment: segmentFilter } : {}),
        },
      },
      {
        headers: {
          "Cache-Control": cacheHeader,
        },
      }
    );
  } catch (error) {
    console.error("[promotions][campaigns] GET failed:", error);
    return NextResponse.json(
      { error: "Unable to fetch promotion campaigns" },
      { status: 500 }
    );
  }
}
