import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPromotionAnalytics, type UserAction } from "@/lib/promotions/analytics";
import { adminDb, Timestamp } from "@/lib/firebaseAdmin";
import { checkForAnomalies } from "@/lib/promotions/anomalyDetection";
import { enqueueAnalyticsTasks, type AnalyticsTask } from "@/lib/queue/analytics-queue";
import { consumeRateLimit } from "@/lib/rate-limit/redis-rate-limiter";
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
type Promotion = NonNullable<Awaited<ReturnType<typeof getPromotionByCampaignId>>>;

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const ANALYTICS_TIMEOUT_MS = 120;
const ANALYTICS_RESPONSE_BUDGET_MS = 35;

const ACTION_RATE_LIMITS: Record<UserAction, RateLimitConfig> = {
  view: { limit: 120, windowMs: 60_000 },
  click: { limit: 60, windowMs: 60_000 },
  addToCart: { limit: 30, windowMs: 300_000 },
  purchase: { limit: 5, windowMs: 900_000 },
};

const ACTION_TO_METRIC: Record<UserAction, "impressions" | "clicks" | "addToCarts" | null> = {
  view: "impressions",
  click: "clicks",
  addToCart: "addToCarts",
  purchase: null,
};

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

const resolveIpAddress = (request: NextRequest, payload: TrackRequestPayload) =>
  parseForwardedFor(request.headers.get("x-forwarded-for")) ||
  request.headers.get("x-real-ip")?.trim() ||
  request.headers.get("cf-connecting-ip")?.trim() ||
  (payload.sessionId ? `session:${payload.sessionId}` : "unknown");

const resolveCountry = (request: NextRequest) =>
  request.headers.get("x-vercel-ip-country")?.trim() ||
  request.headers.get("cf-ipcountry")?.trim() ||
  "unknown";

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

const buildAnalyticsTasks = (
  payload: TrackRequestPayload,
  cleanedMetadata: Record<string, unknown> | undefined,
  discountAmount: number,
  orderValue: number
): AnalyticsTask[] => {
  const tasks: AnalyticsTask[] = [];
  const isPurchase = payload.action === "purchase";
  const metric = ACTION_TO_METRIC[payload.action];

  if (isPurchase) {
    tasks.push({
      type: "record-spend",
      campaignId: payload.campaignId,
      discountAmount,
      orderValue,
    });
  } else if (metric) {
    tasks.push({
      type: "increment-metric",
      campaignId: payload.campaignId,
      metric,
    });
  }

  if (payload.userId) {
    tasks.push({
      type: "track-user",
      campaignId: payload.campaignId,
      userId: payload.userId,
      action: payload.action,
      metadata: cleanedMetadata,
    });
  } else if (payload.sessionId) {
    tasks.push({
      type: "track-session",
      campaignId: payload.campaignId,
      sessionId: payload.sessionId,
      action: payload.action,
      metadata: cleanedMetadata,
    });
  }

  return tasks;
};

class DuplicatePurchaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicatePurchaseError";
  }
}

const getPurchaseDocRef = (campaignId: string, orderId: string) =>
  adminDb.collection("promotions").doc(campaignId).collection("purchases").doc(orderId);

const ensurePurchaseRecorded = async (
  campaignId: string,
  orderId: string,
  payload: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  const docRef = getPurchaseDocRef(campaignId, orderId);
  const trackedAt = Timestamp.now();

  const existing = await docRef.get();
  if (existing.exists) {
    throw new DuplicatePurchaseError("Purchase already tracked for this orderId");
  }

  try {
    await docRef.create({
      campaignId,
      orderId,
      trackedAt,
      userId: payload.userId ?? null,
      sessionId: payload.sessionId ?? null,
      metadata: payload.metadata ?? {},
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "already-exists") {
      throw new DuplicatePurchaseError("Purchase already tracked for this orderId");
    }

    throw error;
  }
};

type TimeoutResult<T> = {
  result: T | null;
  timedOut: boolean;
  error: unknown | null;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<TimeoutResult<T>> => {
  let timeoutId: NodeJS.Timeout | null = null;
  let timedOut = false;

  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, timeoutMs);
      }),
    ]);

    return { result: result as T | null, timedOut, error: null };
  } catch (error) {
    return { result: null, timedOut, error };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const readAnalyticsWithGuard = async (campaignId: string, timeoutMs: number) => {
  const { result, timedOut, error } = await withTimeout(
    getPromotionAnalytics(campaignId),
    timeoutMs
  );

  if (timedOut) {
    console.warn(`[promotions][${campaignId}] analytics read timed out after ${timeoutMs}ms`);
  } else if (error) {
    console.warn(`[promotions][${campaignId}] analytics read failed`, error);
  }

  return result;
};

const buildPromotionStatus = (
  promotion: Promotion,
  analytics: Awaited<ReturnType<typeof getPromotionAnalytics>> | null,
  discountAmount: number,
  isPurchase: boolean,
  analyticsPending: boolean
) => {
  const status: {
    isStillActive: boolean;
    remainingBudget?: number;
    remainingUses?: number;
    analyticsPending?: boolean;
  } = {
    isStillActive: promotion.isActive === true,
    analyticsPending: analyticsPending && isPurchase,
  };

  if (!isPurchase) {
    return status;
  }

  if (analyticsPending || !analytics) {
    status.analyticsPending = true;
    return status;
  }

  const budgetCap = toNumber(promotion.budgetCap, 0);
  if (budgetCap > 0) {
    const spent = toNumber(analytics?.totalDiscountSpent, 0);
    const remaining = budgetCap - (spent + discountAmount);
    status.remainingBudget = Math.max(0, remaining);

    if (status.remainingBudget <= 0) {
      status.isStillActive = false;
    }
  }

  const usageLimit = toNumber(promotion.usageLimit, 0);
  if (usageLimit > 0) {
    const conversions = toNumber(analytics?.conversions, 0);
    const remainingUses = usageLimit - (conversions + 1);
    status.remainingUses = Math.max(0, remainingUses);

    if (status.remainingUses <= 0) {
      status.isStillActive = false;
    }
  }

  return status;
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = await trackRequestSchema.parseAsync(raw);
    const cleanedMetadata = cleanMetadata(parsed.metadata);
    const isPurchase = parsed.action === "purchase";
    const discountAmount = toNumber(parsed.metadata?.discountAmount, 0);
    const orderValue = toNumber(parsed.metadata?.orderValue, 0);
    const rateLimitKey = `${parsed.action}:${resolveRateLimitIdentifier(parsed, request)}`;
    const rateLimitRule = ACTION_RATE_LIMITS[parsed.action];
    const sessionId = parsed.sessionId ?? parsed.userId ?? "anon";
    const ipAddress = resolveIpAddress(request, parsed);
    const country = resolveCountry(request);
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const accountDocPromise = parsed.userId
      ? adminDb.collection("users").doc(parsed.userId).get()
      : Promise.resolve(null);

    const rateLimit = await consumeRateLimit(rateLimitKey, rateLimitRule, {
      prefix: "promo:rl",
    });

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

    const promotionPromise = getPromotionByCampaignId(parsed.campaignId, { revalidate: false });
    const analyticsPromise = isPurchase
      ? readAnalyticsWithGuard(parsed.campaignId, ANALYTICS_TIMEOUT_MS)
      : null;

    const promotion = await promotionPromise;

    if (!promotion || promotion.isActive !== true) {
      return NextResponse.json(
        { error: "Promotion not found or inactive" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    try {
      await adminDb.collection("sessionRequests").add({
        sessionId,
        campaignId: parsed.campaignId,
        action: parsed.action,
        country,
        ipAddress,
        userAgent,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.warn("[promotions][track] Failed to persist session request", { error });
    }

    let anomaly: Awaited<ReturnType<typeof checkForAnomalies>> | null = null;

    if (isPurchase) {
      const accountDoc = await accountDocPromise;
      const accountData = accountDoc?.data?.() ?? {};
      const createdAtRaw = (accountData as { createdAt?: unknown }).createdAt;
      const accountCreatedAt =
        createdAtRaw instanceof Date
          ? createdAtRaw
          : typeof (createdAtRaw as { toDate?: () => Date })?.toDate === "function"
            ? (createdAtRaw as { toDate: () => Date }).toDate()
            : new Date();
      const ordersCount = toNumber((accountData as { ordersCount?: unknown }).ordersCount, 0);
      const promoMinimum = toNumber((promotion as { minimumOrderValue?: unknown }).minimumOrderValue, 0);
      const cartValue = orderValue || toNumber(parsed.metadata?.cartValue, 0);

      try {
        anomaly = await checkForAnomalies({
          userId: parsed.userId ?? "anonymous",
          campaignId: parsed.campaignId,
          cartValue,
          promoMinimum,
          ipAddress,
          country,
          userAgent,
          accountCreatedAt,
          ordersCount,
          sessionId,
        });
      } catch (error) {
        console.warn("[promotions][track] Anomaly detection failed, allowing purchase", {
          campaignId: parsed.campaignId,
          error,
        });
      }

      if (anomaly?.isAnomaly && anomaly.shouldBlock) {
        return NextResponse.json(
          {
            error: "Promotion usage blocked due to anomaly",
            anomaly,
          },
          {
            status: anomaly.action === "pause_promotion" ? 423 : 403,
            headers: JSON_HEADERS,
          }
        );
      }
    }

    if (isPurchase) {
      const orderId = parsed.metadata?.orderId as string;

      try {
        await ensurePurchaseRecorded(parsed.campaignId, orderId, {
          userId: parsed.userId,
          sessionId: parsed.sessionId,
          metadata: cleanedMetadata,
        });
      } catch (error) {
        if (error instanceof DuplicatePurchaseError) {
          return NextResponse.json(
            { error: "Purchase already tracked for this orderId" },
            { status: 409, headers: JSON_HEADERS }
          );
        }

        throw error;
      }
    }

    const analyticsTasks = buildAnalyticsTasks(parsed, cleanedMetadata, discountAmount, orderValue);
    const requestId = `${parsed.campaignId}:${parsed.action}:${Date.now()}`;

    await enqueueAnalyticsTasks(analyticsTasks, { requestId });

    const serverTimestamp = new Date().toISOString();
    const analyticsResult =
      analyticsPromise && isPurchase
        ? await withTimeout(analyticsPromise, ANALYTICS_RESPONSE_BUDGET_MS)
        : { result: null, timedOut: false, error: null };

    if (analyticsResult.error) {
      console.warn("[promotions][track] Non-blocking analytics read failed", analyticsResult.error);
    }

    const promotionStatus = buildPromotionStatus(
      promotion,
      analyticsResult.result,
      discountAmount,
      isPurchase,
      Boolean(analyticsResult.timedOut && isPurchase)
    );

    return NextResponse.json(
      {
        success: true,
        tracked: {
          campaignId: parsed.campaignId,
          action: parsed.action,
          timestamp: serverTimestamp,
        },
        anomaly: anomaly?.isAnomaly ? anomaly : null,
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
