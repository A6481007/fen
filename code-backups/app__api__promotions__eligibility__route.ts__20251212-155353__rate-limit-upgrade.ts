import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActivePromotions } from "@/sanity/queries";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
} from "@/lib/promotions/analytics";
import { adminDb, Timestamp } from "@/lib/firebaseAdmin";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const DEFAULT_VIP_LTV_THRESHOLD = 500;
const DEFAULT_INACTIVITY_DAYS = 45;
const DEFAULT_CART_ABANDON_THRESHOLD = 1;

type PromotionRecord = PROMOTIONS_LIST_QUERYResult[number];
type UserSegment =
  | "firstTime"
  | "returning"
  | "vip"
  | "cartAbandoner"
  | "inactive"
  | "allCustomers";

const cartItemSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  categoryId: z.string().optional(),
});

const eligibilityRequestSchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    sessionId: z.string().trim().min(1).optional(),
    context: z.object({
      page: z.enum(["homepage", "product", "category", "cart", "checkout"]),
      productId: z.string().trim().optional(),
      categoryId: z.string().trim().optional(),
      cartValue: z.number().nonnegative().optional(),
      cartItems: z.array(cartItemSchema).optional(),
      isFirstVisit: z.boolean().optional(),
      referrer: z.string().optional(),
    }),
  })
  .superRefine((value, ctx) => {
    if (!value.userId && !value.sessionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either userId or sessionId must be provided",
        path: ["sessionId"],
      });
    }
  });

type EligibilityRequest = z.infer<typeof eligibilityRequestSchema>;
type EligibilityContext = EligibilityRequest["context"];

interface UserProfile {
  id: string;
  lifetimeValue: number;
  totalOrders: number;
  lastActiveAt: Date | null;
  lastAbandonedCartValue: number | null;
  lastAbandonedCartAt: Date | null;
  createdAt: Date | null;
}

interface SegmentCheckResult {
  ok: boolean;
  reason?: string;
  matchedSegment?: UserSegment;
  detail?: string;
}

interface ScopeCheckResult {
  ok: boolean;
  reasons: string[];
}

interface EligiblePromotionResponse {
  campaignId: string;
  name: string;
  type: string;
  discountType: string;
  discountValue: number;
  discountDisplay: string;
  badgeLabel: string;
  shortDescription: string;
  heroMessage: string;
  ctaText: string;
  ctaLink: string;
  priority: number;
  endsAt: string;
  timeRemaining: number;
  urgencyMessage?: string;
  thumbnailUrl?: string;
  eligibilityReason: string;
  assignedVariant?: "control" | "variantA" | "variantB";
}

interface IneligiblePromotionResponse {
  campaignId: string;
  name: string;
  reason: string;
  requirementsMissing: string[];
}

interface EligibilityResponse {
  eligible: EligiblePromotionResponse[];
  ineligible: IneligiblePromotionResponse[];
  metadata: {
    checkedAt: string;
    totalActive: number;
    userSegment?: UserSegment;
  };
}

/**
 * Parse and validate the incoming request payload with Zod.
 */
async function parseRequestPayload(request: NextRequest): Promise<EligibilityRequest> {
  const raw = await request.json();
  return eligibilityRequestSchema.parseAsync(raw);
}

/**
 * Convert unknown numeric input into a finite number with a fallback.
 */
function toSafeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Convert Firestore timestamps, ISO strings, or epoch-like objects to Date.
 */
function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const seconds = toSafeNumber((value as { seconds: number }).seconds);
    const nanos = toSafeNumber((value as { nanoseconds?: number }).nanoseconds);
    return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Fetch user profile details from Firestore for segmentation checks.
 */
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snapshot = await adminDb.collection("users").doc(userId).get();
    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() ?? {};

    return {
      id: userId,
      lifetimeValue: toSafeNumber(
        (data as { lifetimeValue?: unknown }).lifetimeValue ??
          (data as { ltv?: unknown }).ltv ??
          (data as { totalSpent?: unknown }).totalSpent,
        0
      ),
      totalOrders: toSafeNumber(
        (data as { totalOrders?: unknown }).totalOrders ??
          (data as { ordersCount?: unknown }).ordersCount ??
          (data as { orderCount?: unknown }).orderCount,
        0
      ),
      lastActiveAt: parseTimestamp(
        (data as { lastActiveAt?: unknown }).lastActiveAt ??
          (data as { lastSeenAt?: unknown }).lastSeenAt ??
          (data as { updatedAt?: unknown }).updatedAt
      ),
      lastAbandonedCartValue:
        typeof (data as { lastAbandonedCartValue?: unknown }).lastAbandonedCartValue === "number"
          ? ((data as { lastAbandonedCartValue: number }).lastAbandonedCartValue as number)
          : typeof (data as { abandonedCartValue?: unknown }).abandonedCartValue === "number"
            ? ((data as { abandonedCartValue: number }).abandonedCartValue as number)
            : null,
      lastAbandonedCartAt: parseTimestamp(
        (data as { lastAbandonedCartAt?: unknown }).lastAbandonedCartAt ??
          (data as { abandonedCartAt?: unknown }).abandonedCartAt
      ),
      createdAt: parseTimestamp((data as { createdAt?: unknown }).createdAt),
    };
  } catch (error) {
    console.error(
      `[promotions][eligibility] Failed to fetch user profile for ${userId}`,
      error
    );
    return null;
  }
}

/**
 * Compute the current cart total from request context.
 */
function resolveCartTotal(context: EligibilityContext): number {
  if (typeof context.cartValue === "number" && Number.isFinite(context.cartValue)) {
    return Math.max(0, context.cartValue);
  }

  if (Array.isArray(context.cartItems)) {
    return context.cartItems.reduce((sum, item) => {
      const lineTotal = toSafeNumber(item.price) * toSafeNumber(item.quantity, 1);
      return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);
  }

  return 0;
}

/**
 * Derive a coarse user segment for metadata and default fallbacks.
 */
function deriveUserSegment(
  profile: UserProfile | null,
  context: EligibilityContext
): UserSegment {
  if (!profile) {
    if (context.page === "cart" && resolveCartTotal(context) > 0) {
      return "cartAbandoner";
    }
    if (context.isFirstVisit === false) {
      return "returning";
    }
    return "firstTime";
  }

  if (profile.totalOrders <= 0) {
    return "firstTime";
  }

  const daysInactive =
    profile.lastActiveAt !== null ? daysBetween(Date.now(), profile.lastActiveAt) : null;
  if (daysInactive !== null && daysInactive >= DEFAULT_INACTIVITY_DAYS) {
    return "inactive";
  }

  if (profile.lifetimeValue >= DEFAULT_VIP_LTV_THRESHOLD) {
    return "vip";
  }

  if (profile.lastAbandonedCartValue && profile.lastAbandonedCartValue > 0) {
    return "cartAbandoner";
  }

  return "returning";
}

/**
 * Calculate the number of days between now and a historical Date.
 */
function daysBetween(nowMs: number, date: Date): number {
  const diffMs = nowMs - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine whether the promotion's target segment matches the request context.
 */
function evaluateSegmentMatch(
  promotion: PromotionRecord,
  context: EligibilityContext,
  profile: UserProfile | null,
  inferredSegment: UserSegment,
  nowMs: number
): SegmentCheckResult {
  const target = promotion.targetAudience?.segmentType ?? "allCustomers";

  if (!target || target === "allCustomers") {
    return {
      ok: true,
      matchedSegment: inferredSegment ?? "allCustomers",
      detail: "Promotion applies to all customers",
    };
  }

  const totalOrders = profile?.totalOrders ?? 0;
  const ltv = profile?.lifetimeValue ?? 0;
  const daysInactive =
    profile?.lastActiveAt !== null && profile?.lastActiveAt !== undefined
      ? daysBetween(nowMs, profile.lastActiveAt)
      : null;
  const inactivityThreshold =
    promotion.targetAudience?.inactivityDays ?? DEFAULT_INACTIVITY_DAYS;
  const ltvMin =
    promotion.targetAudience?.minLTVThreshold ??
    (target === "vip" ? DEFAULT_VIP_LTV_THRESHOLD : undefined);
  const ltvMax = promotion.targetAudience?.maxLTVThreshold ?? undefined;
  const cartAbandonThreshold =
    promotion.targetAudience?.cartAbandonmentThreshold ?? DEFAULT_CART_ABANDON_THRESHOLD;
  const abandonValue = deriveCartAbandonmentValue(context, profile);

  if (target === "firstTime") {
    const isFirstTime = totalOrders <= 0 && context.isFirstVisit !== false;
    return isFirstTime
      ? { ok: true, matchedSegment: "firstTime", detail: "No prior orders detected" }
      : {
          ok: false,
          reason: "User has previous orders or session is not marked as first visit",
        };
  }

  if (target === "returning") {
    const isReturning = totalOrders > 0 || context.isFirstVisit === false;
    return isReturning
      ? { ok: true, matchedSegment: "returning", detail: "User has prior order history" }
      : { ok: false, reason: "User appears to be a first-time visitor" };
  }

  if (target === "vip") {
    const meetsMin = ltvMin === undefined || ltv >= ltvMin;
    const withinMax = ltvMax === undefined || ltv <= ltvMax;
    if (meetsMin && withinMax) {
      return {
        ok: true,
        matchedSegment: "vip",
        detail: `Lifetime value ${ltv.toFixed(2)} within VIP range`,
      };
    }
    return {
      ok: false,
      reason: `Lifetime value ${ltv.toFixed(2)} outside required range`,
    };
  }

  if (target === "cartAbandoner") {
    if (abandonValue >= cartAbandonThreshold) {
      return {
        ok: true,
        matchedSegment: "cartAbandoner",
        detail: `Abandoned cart value ${abandonValue.toFixed(2)} meets threshold`,
      };
    }
    return {
      ok: false,
      reason: `Abandoned cart value below threshold (${abandonValue.toFixed(2)} < ${cartAbandonThreshold})`,
    };
  }

  if (target === "inactive") {
    if (daysInactive !== null && daysInactive >= inactivityThreshold) {
      return {
        ok: true,
        matchedSegment: "inactive",
        detail: `Inactive for ${daysInactive} days`,
      };
    }
    return {
      ok: false,
      reason: "User has been active within the inactivity threshold",
    };
  }

  return { ok: false, reason: "Segment did not match any rule" };
}

/**
 * Pull a cart value usable for abandonment checks.
 */
function deriveCartAbandonmentValue(
  context: EligibilityContext,
  profile: UserProfile | null
): number {
  if (typeof context.cartValue === "number" && context.cartValue > 0) {
    return context.cartValue;
  }

  if (profile?.lastAbandonedCartValue && profile.lastAbandonedCartValue > 0) {
    return profile.lastAbandonedCartValue;
  }

  return 0;
}

/**
 * Validate whether the current page, product, or category matches the promotion scope.
 */
function evaluateScopeMatch(
  promotion: PromotionRecord,
  context: EligibilityContext
): ScopeCheckResult {
  const reasons: string[] = [];

  const scopedProducts = new Set(
    (promotion.products ?? []).map((product) => product._id).filter(Boolean)
  );
  const excludedProducts = new Set(
    (promotion.excludedProducts ?? []).map((product) => product._id).filter(Boolean)
  );
  const scopedCategories = new Set(
    (promotion.categories ?? []).map((category) => category._id).filter(Boolean)
  );

  const contextProducts = new Set<string>();
  const contextCategories = new Set<string>();

  if (context.productId) {
    contextProducts.add(context.productId);
  }
  if (context.categoryId) {
    contextCategories.add(context.categoryId);
  }

  for (const item of context.cartItems ?? []) {
    if (item.productId) {
      contextProducts.add(item.productId);
    }
    if (item.categoryId) {
      contextCategories.add(item.categoryId);
    }
  }

  // Exclusion checks.
  const hasExcludedProduct =
    Array.from(contextProducts).some((idOrSlug) => excludedProducts.has(idOrSlug));

  if (hasExcludedProduct) {
    reasons.push("Current product is excluded from this promotion");
  }

  // Inclusive product scope.
  if (scopedProducts.size > 0) {
    const productMatches =
      Array.from(contextProducts).some((idOrSlug) => scopedProducts.has(idOrSlug));

    if (!productMatches) {
      reasons.push("Product not in promotion scope");
    }
  }

  // Inclusive category scope.
  if (scopedCategories.size > 0) {
    const categoryMatches =
      Array.from(contextCategories).some((idOrSlug) => scopedCategories.has(idOrSlug));

    if (!categoryMatches) {
      reasons.push("Category not in promotion scope");
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Create a deterministic variant assignment for split tests.
 */
function assignVariantForPromotion(
  promotion: PromotionRecord,
  userId?: string,
  sessionId?: string
): "control" | "variantA" | "variantB" | undefined {
  const mode = promotion.variantMode ?? "control";

  if (mode !== "split") {
    if (mode === "control" || mode === "variantA" || mode === "variantB") {
      return mode;
    }
    return undefined;
  }

  const key = userId || sessionId || promotion.campaignId || promotion._id;
  const hash = createDeterministicHash(key);
  const splitPercent =
    typeof promotion.splitPercent === "number" && !Number.isNaN(promotion.splitPercent)
      ? Math.min(100, Math.max(0, promotion.splitPercent))
      : 50;

  return hash % 100 < splitPercent ? "variantA" : "variantB";
}

/**
 * Lightweight string hash for deterministic bucketing.
 */
function createDeterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Format a discount label for UI display.
 */
function formatDiscountDisplay(promotion: PromotionRecord): string {
  const discountValue = toSafeNumber(promotion.discountValue, 0);

  switch (promotion.discountType) {
    case "percentage":
      return `${Math.round(discountValue)}% OFF`;
    case "fixed":
      return `Save $${discountValue.toFixed(2)}`;
    case "bxgy":
      return `Buy ${promotion.buyQuantity ?? 0} Get ${promotion.getQuantity ?? 0}`;
    case "freeShipping":
      return "Free Shipping";
    case "points":
      return `${discountValue} bonus points`;
    default:
      return "Special Offer";
  }
}

/**
 * Calculate seconds remaining until the promotion end date.
 */
function calculateTimeRemainingSeconds(endDate?: string | null): number {
  if (!endDate) {
    return 0;
  }

  const diffMs = new Date(endDate).getTime() - Date.now();
  return diffMs > 0 ? Math.floor(diffMs / 1000) : 0;
}

/**
 * Evaluate a promotion against the request context and quotas.
 */
async function evaluatePromotionEligibility(
  promotion: PromotionRecord,
  request: EligibilityRequest,
  profile: UserProfile | null,
  inferredSegment: UserSegment,
  nowMs: number
): Promise<{
  eligiblePayload?: EligiblePromotionResponse;
  ineligiblePayload?: IneligiblePromotionResponse;
  matchedSegment?: UserSegment;
}> {
  const requirementsMissing: string[] = [];
  const eligibilityNotes: string[] = [];
  const cartTotal = resolveCartTotal(request.context);
  const campaignId = promotion.campaignId || promotion._id;

  if (!promotion.isActive) {
    requirementsMissing.push("Promotion is not active");
  }

  const segmentResult = evaluateSegmentMatch(
    promotion,
    request.context,
    profile,
    inferredSegment,
    nowMs
  );

  if (!segmentResult.ok && segmentResult.reason) {
    requirementsMissing.push(segmentResult.reason);
  } else if (segmentResult.detail) {
    eligibilityNotes.push(segmentResult.detail);
  }

  const scopeResult = evaluateScopeMatch(promotion, request.context);
  if (!scopeResult.ok) {
    requirementsMissing.push(...scopeResult.reasons);
  } else if (scopeResult.reasons.length === 0) {
    eligibilityNotes.push("Context matches promotion scope");
  }

  if (promotion.minimumOrderValue && cartTotal < promotion.minimumOrderValue) {
    requirementsMissing.push(
      `Minimum order value ${promotion.minimumOrderValue} not met (cart: ${cartTotal.toFixed(2)})`
    );
  } else if (promotion.minimumOrderValue && cartTotal >= promotion.minimumOrderValue) {
    eligibilityNotes.push("Cart total meets minimum order value");
  }

  if (promotion.budgetCap && promotion.budgetCap > 0) {
    const hasBudget = await checkBudgetAvailable(campaignId, promotion.budgetCap);
    if (!hasBudget) {
      requirementsMissing.push("Budget cap reached");
    } else {
      eligibilityNotes.push("Budget available");
    }
  }

  if (promotion.usageLimit && promotion.usageLimit > 0) {
    const hasUsage = await checkUsageLimitAvailable(campaignId, promotion.usageLimit);
    if (!hasUsage) {
      requirementsMissing.push("Usage limit reached");
    } else {
      eligibilityNotes.push("Usage limit available");
    }
  }

  if (promotion.perCustomerLimit && promotion.perCustomerLimit > 0 && request.userId) {
    const perCustomerOk = await checkPerCustomerLimit(
      request.userId,
      campaignId,
      promotion.perCustomerLimit
    );
    if (!perCustomerOk) {
      requirementsMissing.push("Per-customer redemption limit reached");
    } else {
      eligibilityNotes.push("Per-customer limit available");
    }
  }

  const eligible = requirementsMissing.length === 0;
  const assignedVariant = assignVariantForPromotion(
    promotion,
    request.userId,
    request.sessionId
  );
  const parsedEndDate = promotion.endDate ? new Date(promotion.endDate) : null;
  const safeEndsAt =
    parsedEndDate && !Number.isNaN(parsedEndDate.getTime())
      ? parsedEndDate
      : new Date(nowMs);
  const endsAt = safeEndsAt.toISOString();
  const timeRemaining = calculateTimeRemainingSeconds(promotion.endDate);

  if (eligible) {
    const eligibilityReason =
      eligibilityNotes.join("; ") || "Eligible based on audience and scope rules";

    return {
      matchedSegment: segmentResult.matchedSegment ?? inferredSegment,
      eligiblePayload: {
        campaignId,
        name: promotion.name ?? campaignId,
        type: promotion.type ?? "promotion",
        discountType: promotion.discountType ?? "percentage",
        discountValue: promotion.discountValue ?? 0,
        discountDisplay: formatDiscountDisplay(promotion),
        badgeLabel: promotion.badgeLabel ?? "",
        shortDescription: promotion.shortDescription ?? "",
        heroMessage: promotion.heroMessage ?? "",
        ctaText: promotion.ctaText ?? "",
        ctaLink: promotion.ctaLink ?? "",
        priority: promotion.priority ?? 0,
        endsAt,
        timeRemaining,
        urgencyMessage: promotion.urgencyTrigger?.urgencyMessage ?? undefined,
        thumbnailUrl: undefined,
        eligibilityReason,
        assignedVariant,
      },
    };
  }

  return {
    matchedSegment: segmentResult.matchedSegment ?? inferredSegment,
    ineligiblePayload: {
      campaignId,
      name: promotion.name ?? campaignId,
      reason: requirementsMissing[0] ?? "Not eligible",
      requirementsMissing,
    },
  };
}

/**
 * Handle POST requests to determine promotion eligibility.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestPayload(request);
    const nowMs = Date.now();
    const userProfile = parsed.userId ? await fetchUserProfile(parsed.userId) : null;
    const inferredSegment = deriveUserSegment(userProfile, parsed.context);
    const promotions = await getActivePromotions({ revalidate: false });

    const evaluations = await Promise.all(
      promotions.map((promotion) =>
        evaluatePromotionEligibility(promotion, parsed, userProfile, inferredSegment, nowMs)
      )
    );

    const eligible: EligiblePromotionResponse[] = [];
    const ineligible: IneligiblePromotionResponse[] = [];

    for (const result of evaluations) {
      if (result.eligiblePayload) {
        eligible.push(result.eligiblePayload);
      } else if (result.ineligiblePayload) {
        ineligible.push(result.ineligiblePayload);
      }
    }

    eligible.sort((a, b) => b.priority - a.priority);

    const responseBody: EligibilityResponse = {
      eligible,
      ineligible,
      metadata: {
        checkedAt: new Date(nowMs).toISOString(),
        totalActive: promotions.length,
        userSegment: inferredSegment,
      },
    };

    return NextResponse.json(responseBody, { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: error.issues },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    console.error("[promotions][eligibility] Unexpected error", error);
    return NextResponse.json(
      { error: "Unable to check promotion eligibility" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
