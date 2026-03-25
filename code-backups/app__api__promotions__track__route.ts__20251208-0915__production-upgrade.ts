import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getPromotionAnalytics,
  incrementPromotionMetric,
  recordPromotionSpend,
  trackUserPromoInteraction,
  type UserAction,
} from "@/lib/promotions/analytics";
import { adminDb, FieldValue, Timestamp } from "@/lib/firebaseAdmin";
import { getPromotionByCampaignId } from "@/sanity/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const metadataSchema = z.object({
  productId: z.string().trim().optional(),
  productName: z.string().trim().optional(),
  quantity: z.number().int().positive().optional(),
  cartValue: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  orderValue: z.number().nonnegative().optional(),
  orderId: z.string().trim().optional(),
  page: z.string().trim().optional(),
  variant: z.string().trim().optional(),
  referrer: z.string().trim().optional(),
  deviceType: z.enum(["mobile", "desktop", "tablet"]).optional(),
  timestamp: z.string().trim().optional(),
});

const trackRequestSchema = z
  .object({
    campaignId: z.string().trim().min(1, "campaignId is required"),
    action: z.enum(["view", "click", "addToCart", "purchase"]),
    userId: z.string().trim().optional(),
    sessionId: z.string().trim().optional(),
    metadata: metadataSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.userId && !value.sessionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either userId or sessionId must be provided",
        path: ["sessionId"],
      });
    }

    if (value.action === "purchase") {
      if (!value.metadata) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "metadata is required for purchase events",
          path: ["metadata"],
        });
        return;
      }

      if (
        value.metadata.discountAmount === undefined ||
        value.metadata.orderValue === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "discountAmount and orderValue are required for purchase events",
          path: ["metadata"],
        });
      }

      if (!value.metadata.orderId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "orderId is required for purchase idempotency",
          path: ["metadata", "orderId"],
        });
      }
    }
  });

type TrackMetadata = z.infer<typeof metadataSchema>;
type TrackRequestPayload = z.infer<typeof trackRequestSchema>;

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const ACTION_RATE_LIMITS: Record<UserAction, RateLimitConfig> = {
  view: { limit: 120, windowMs: 60_000 },
  click: { limit: 60, windowMs: 60_000 },
  addToCart: { limit: 30, windowMs: 300_000 },
  purchase: { limit: 5, windowMs: 900_000 },
};

const rateLimitState = new Map<string, { count: number; resetAt: number }>();

const parseForwardedFor = (headerValue?: string | null) => headerValue?.split(",")[0]?.trim();

const resolveRateLimitIdentifier = (payload: TrackRequestPayload, request: NextRequest) => {
  if (payload.userId) {
    return `user:${payload.userId}`;
  }

  if (payload.sessionId) {
    return `session:${payload.sessionId}`;
  }

  const forwardedFor = parseForwardedFor(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return `ip:${forwardedFor}`;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp.trim()}`;
  }

  return "anon";
};

const consumeRateLimit = (action: UserAction, identifier: string) => {
  const config = ACTION_RATE_LIMITS[action];

  if (!config) {
    return { limited: false, retryAfterMs: 0 };
  }

  const now = Date.now();
  const key = `${action}:${identifier}`;
  const existing = rateLimitState.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitState.set(key, { count: 1, resetAt: now + config.windowMs });
    return { limited: false, retryAfterMs: config.windowMs };
  }

  if (existing.count >= config.limit) {
    return { limited: true, retryAfterMs: Math.max(existing.resetAt - now, 0) };
  }

  rateLimitState.set(key, { count: existing.count + 1, resetAt: existing.resetAt });
  return { limited: false, retryAfterMs: Math.max(existing.resetAt - now, 0) };
};

const ACTION_TO_METRIC: Record<UserAction, "impressions" | "clicks" | "addToCarts" | null> = {
  view: "impressions",
  click: "clicks",
  addToCart: "addToCarts",
  purchase: null, // conversions are handled inside recordPromotionSpend to avoid double counting
};

const ACTION_COUNT_FIELD: Record<UserAction, string> = {
  view: "viewCount",
  click: "clickCount",
  addToCart: "addToCartCount",
  purchase: "purchaseCount",
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanMetadata = (metadata?: TrackMetadata): Record<string, unknown> | undefined => {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const cleanedEntries = Object.entries(metadata).filter(
    ([, value]) => value !== undefined && value !== null
  );

  if (cleanedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(cleanedEntries);
};

const buildInteractionEntry = (
  action: UserAction,
  now: Timestamp,
  metadata?: Record<string, unknown>
) => {
  if (metadata && Object.keys(metadata).length > 0) {
    return { action, at: now, metadata };
  }

  return { action, at: now };
};

async function trackSessionPromoInteraction(
  sessionId: string,
  campaignId: string,
  action: UserAction,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const docRef = adminDb.collection("promotions").doc(campaignId).collection("sessions").doc(sessionId);
  const interactionAt = Timestamp.now();
  const interactionEntry = buildInteractionEntry(action, interactionAt, metadata);
  const purchaseValue = action === "purchase" ? toNumber(metadata?.orderValue, 0) : 0;
  const purchaseDiscount = action === "purchase" ? toNumber(metadata?.discountAmount, 0) : 0;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);

      if (!snapshot.exists) {
        tx.set(docRef, {
          sessionId,
          campaignId,
          firstSeenAt: interactionAt,
          lastInteractionAt: interactionAt,
          interactions: [interactionEntry],
          purchased: action === "purchase",
          totalSpent: purchaseValue,
          totalDiscount: purchaseDiscount,
          viewCount: action === "view" ? 1 : 0,
          clickCount: action === "click" ? 1 : 0,
          addToCartCount: action === "addToCart" ? 1 : 0,
          purchaseCount: action === "purchase" ? 1 : 0,
        });
        return;
      }

      const updates: Record<string, unknown> = {
        lastInteractionAt: interactionAt,
        interactions: FieldValue.arrayUnion(interactionEntry),
      };

      const countField = ACTION_COUNT_FIELD[action];
      updates[countField] = FieldValue.increment(1);

      if (action === "purchase") {
        updates.purchased = true;
        updates.totalSpent = FieldValue.increment(purchaseValue);
        updates.totalDiscount = FieldValue.increment(purchaseDiscount);
      }

      tx.update(docRef, updates);
    });

    return true;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}][session:${sessionId}] Failed to track interaction "${action}"`,
      error
    );
    return false;
  }
}

async function recordPurchaseOnce(
  campaignId: string,
  orderId: string,
  payload: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const docRef = adminDb.collection("promotions").doc(campaignId).collection("purchases").doc(orderId);
  const trackedAt = Timestamp.now();

  await docRef.create({
    campaignId,
    orderId,
    trackedAt,
    userId: payload.userId ?? null,
    sessionId: payload.sessionId ?? null,
    metadata: payload.metadata ?? {},
  });
}

type AsyncWriteTask = () => Promise<unknown>;

function queueAsyncWrites(tasks: AsyncWriteTask[], label: string) {
  if (tasks.length === 0) {
    return;
  }

  setTimeout(() => {
    void Promise.allSettled(tasks.map((task) => task())).then((results) => {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`[promotions][${label}] background write failed`, {
            index,
            reason: result.reason,
          });
        }
      });
    });
  }, 0);
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = await trackRequestSchema.parseAsync(raw);
    const cleanedMetadata = cleanMetadata(parsed.metadata);
    const isPurchase = parsed.action === "purchase";
    const discountAmount = toNumber(parsed.metadata?.discountAmount, 0);
    const orderValue = toNumber(parsed.metadata?.orderValue, 0);
    const rateLimitKey = resolveRateLimitIdentifier(parsed, request);
    const rateLimit = consumeRateLimit(parsed.action, rateLimitKey);

    if (rateLimit.limited) {
      const retryAfterSeconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
      return NextResponse.json(
        { error: "Too many requests for this action", retryAfterMs: rateLimit.retryAfterMs },
        {
          status: 429,
          headers: { ...JSON_HEADERS, "Retry-After": `${retryAfterSeconds}` },
        }
      );
    }

    const promotion = await getPromotionByCampaignId(parsed.campaignId, { revalidate: false });

    if (!promotion || promotion.isActive !== true) {
      return NextResponse.json(
        { error: "Promotion not found or inactive" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    if (isPurchase) {
      const orderId = parsed.metadata?.orderId as string;

      try {
        await recordPurchaseOnce(parsed.campaignId, orderId, {
          userId: parsed.userId,
          sessionId: parsed.sessionId,
          metadata: cleanedMetadata,
        });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "already-exists") {
          return NextResponse.json(
            { error: "Purchase already tracked for this orderId" },
            { status: 409, headers: JSON_HEADERS }
          );
        }

        throw error;
      }
    }

    const writeTasks: AsyncWriteTask[] = [];
    const metric = ACTION_TO_METRIC[parsed.action];
    const serverTimestamp = new Date().toISOString();

    if (isPurchase) {
      writeTasks.push(() => recordPromotionSpend(parsed.campaignId, discountAmount, orderValue));
    } else if (metric) {
      writeTasks.push(() => incrementPromotionMetric(parsed.campaignId, metric));
    }

    if (parsed.userId) {
      writeTasks.push(() =>
        trackUserPromoInteraction(parsed.userId, parsed.campaignId, parsed.action, cleanedMetadata)
      );
    } else if (parsed.sessionId) {
      writeTasks.push(() =>
        trackSessionPromoInteraction(parsed.sessionId, parsed.campaignId, parsed.action, cleanedMetadata)
      );
    }

    queueAsyncWrites(writeTasks, `${parsed.campaignId}:${parsed.action}`);

    const promotionStatus: {
      isStillActive: boolean;
      remainingBudget?: number;
      remainingUses?: number;
    } = {
      isStillActive: promotion.isActive === true,
    };

    if (isPurchase) {
      const analytics = await getPromotionAnalytics(parsed.campaignId);
      const existingDiscount = analytics?.totalDiscountSpent ?? 0;
      const existingConversions = analytics?.conversions ?? 0;
      const budgetCap = promotion.budgetCap ?? 0;
      const usageLimit = promotion.usageLimit ?? 0;

      if (budgetCap > 0) {
        const remaining = budgetCap - (existingDiscount + discountAmount);
        promotionStatus.remainingBudget = Math.max(0, remaining);
      }

      if (usageLimit > 0) {
        const remaining = usageLimit - (existingConversions + 1);
        promotionStatus.remainingUses = Math.max(0, remaining);
      }

      if (
        (promotionStatus.remainingBudget !== undefined && promotionStatus.remainingBudget <= 0) ||
        (promotionStatus.remainingUses !== undefined && promotionStatus.remainingUses <= 0)
      ) {
        promotionStatus.isStillActive = false;
      }
    }

    return NextResponse.json(
      {
        success: true,
        tracked: {
          campaignId: parsed.campaignId,
          action: parsed.action,
          timestamp: serverTimestamp,
        },
        promotionStatus,
      },
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: error.issues },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    console.error("[promotions][track] Unexpected error", error);
    return NextResponse.json(
      { error: "Unable to track promotion interaction" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
