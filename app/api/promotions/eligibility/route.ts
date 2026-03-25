import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActivePromotions } from "@/sanity/queries/promotions";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
} from "@/lib/promotions/analytics";
import { promotionEngine } from "@/lib/promotions/promotionEngine";
import { adminDb, Timestamp } from "@/lib/firebaseAdmin";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import { withRateLimit } from "@/lib/rateLimit";
import type { CartItem } from "@/lib/cart/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const DEFAULT_VIP_LTV_THRESHOLD = 500;
const DEFAULT_INACTIVITY_DAYS = 45;

type PromotionRecord = PROMOTIONS_LIST_QUERYResult[number];
type EnginePromotion = Parameters<(typeof promotionEngine)["checkEligibility"]>[0];
type EngineUser = Parameters<(typeof promotionEngine)["checkEligibility"]>[1];
type EngineContext = Parameters<(typeof promotionEngine)["checkEligibility"]>[2];
type UserSegment =
  | "firstTime"
  | "returning"
  | "vip"
  | "cartAbandoner"
  | "inactive"
  | "allCustomers";
type EligibilityCartItem = Pick<CartItem, "productId" | "quantity" | "unitPrice"> & {
  categoryId?: string;
};

const cartItemSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
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
type EligibilityContext = Omit<EligibilityRequest["context"], "cartItems"> & {
  cartItems?: EligibilityCartItem[];
};

interface UserProfile {
  id: string;
  lifetimeValue: number;
  totalOrders: number;
  lastPurchaseAt: Date | null;
  lastActiveAt: Date | null;
  lastAbandonedCartValue: number | null;
  lastAbandonedCartAt: Date | null;
  createdAt: Date | null;
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
  if (!adminDb) {
    console.warn(
      `[promotions][eligibility] Firestore unavailable; skipping user profile fetch for ${userId}`
    );
    return null;
  }

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
      lastPurchaseAt: parseTimestamp(
        (data as { lastPurchaseAt?: unknown }).lastPurchaseAt ??
          (data as { lastOrderAt?: unknown }).lastOrderAt
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
      const lineTotal =
        toSafeNumber(item.unitPrice) * toSafeNumber(item.quantity, 1);
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

const buildEngineUser = (
  profile: UserProfile | null,
  userId?: string | null
): EngineUser => {
  if (!profile || !userId) {
    return null;
  }

  return {
    id: userId,
    ordersCount: profile.totalOrders,
    ltv: profile.lifetimeValue,
    lastPurchaseAt: profile.lastPurchaseAt,
    lastActiveAt: profile.lastActiveAt,
    lastAbandonedCartAt: profile.lastAbandonedCartAt,
    lastAbandonedCartValue: profile.lastAbandonedCartValue,
  };
};

const buildEngineContext = (context: EligibilityContext): EngineContext => ({
  page: context.page,
  productId: context.productId,
  categoryId: context.categoryId,
  cartValue: context.cartValue,
  cartItems: context.cartItems,
});

const resolveDealRemainingQty = (promotion: PromotionRecord): number | null => {
  const candidate = (promotion as { remainingQty?: number | null }).remainingQty;
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return Math.max(0, Math.floor(candidate));
  }

  const quantityLimit = (promotion as { quantityLimit?: number | null }).quantityLimit;
  if (typeof quantityLimit !== "number" || !Number.isFinite(quantityLimit)) {
    return null;
  }

  const soldCount = (promotion as { soldCount?: number | null }).soldCount;
  const sold = typeof soldCount === "number" && Number.isFinite(soldCount) ? soldCount : 0;
  return Math.max(0, Math.floor(quantityLimit - sold));
};

const collectLimitFailures = async (
  promotion: PromotionRecord,
  request: EligibilityRequest
): Promise<string[]> => {
  const campaignId = promotion.campaignId || promotion._id;
  const failures: string[] = [];

  if (!campaignId) {
    failures.push("Promotion is unavailable");
    return failures;
  }

  if ((promotion.type as string) === "deal") {
    const remainingQty = resolveDealRemainingQty(promotion);
    const requestedQty =
      request.context.cartItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

    if (remainingQty !== null && remainingQty <= 0) {
      failures.push("Deal is sold out");
    } else if (remainingQty !== null && requestedQty > remainingQty) {
      failures.push("Requested quantity exceeds remaining deal inventory");
    }

    return failures;
  }

  if (promotion.budgetCap && promotion.budgetCap > 0) {
    const hasBudget = await checkBudgetAvailable(campaignId, promotion.budgetCap);
    if (!hasBudget) {
      failures.push("Budget cap reached");
    }
  }

  if (promotion.usageLimit && promotion.usageLimit > 0) {
    const hasUsage = await checkUsageLimitAvailable(campaignId, promotion.usageLimit);
    if (!hasUsage) {
      failures.push("Usage limit reached");
    }
  }

  if (promotion.perCustomerLimit && promotion.perCustomerLimit > 0) {
    if (!request.userId) {
      failures.push("Sign in required to redeem this promotion");
    } else {
      const perCustomerOk = await checkPerCustomerLimit(
        request.userId,
        campaignId,
        promotion.perCustomerLimit
      );
      if (!perCustomerOk) {
        failures.push("Per-customer redemption limit reached");
      }
    }
  }

  return failures;
};

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
    case "fixed_amount":
    case "fixedAmount":
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
  engineUser: EngineUser,
  inferredSegment: UserSegment,
  nowMs: number
): Promise<{
  eligiblePayload?: EligiblePromotionResponse;
  ineligiblePayload?: IneligiblePromotionResponse;
  matchedSegment?: UserSegment;
}> {
  const campaignId = promotion.campaignId || promotion._id;
  const engineContext = buildEngineContext(request.context);
  const eligibility = promotionEngine.checkEligibility(
    promotion as EnginePromotion,
    engineUser,
    engineContext
  );
  const limitFailures = await collectLimitFailures(promotion, request);
  const requirementsMissing = [
    ...(eligibility.requirementsMissing ?? []),
    ...limitFailures,
  ];
  const eligible = requirementsMissing.length === 0 && eligibility.eligible;
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
      eligibility.matchedCriteria?.join("; ") ||
      eligibility.reason ||
      "Eligible based on promotion rules";

    return {
      matchedSegment: inferredSegment,
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
    matchedSegment: inferredSegment,
    ineligiblePayload: {
      campaignId,
      name: promotion.name ?? campaignId,
      reason: requirementsMissing[0] ?? eligibility.reason ?? "Not eligible",
      requirementsMissing,
    },
  };
}

/**
 * Handle POST requests to determine promotion eligibility.
 */
async function handleEligibility(request: NextRequest) {
  try {
    const parsed = await parseRequestPayload(request);
    const nowMs = Date.now();
    const userProfile = parsed.userId ? await fetchUserProfile(parsed.userId) : null;
    const inferredSegment = deriveUserSegment(userProfile, parsed.context);
    const engineUser = buildEngineUser(userProfile, parsed.userId ?? null);
    const promotions = await getActivePromotions({
      includeDeals: true,
      revalidate: false,
    });

    const evaluations = await Promise.all(
      promotions.map((promotion) =>
        evaluatePromotionEligibility(promotion, parsed, engineUser, inferredSegment, nowMs)
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

export const POST = withRateLimit(handleEligibility, "eligibility");
