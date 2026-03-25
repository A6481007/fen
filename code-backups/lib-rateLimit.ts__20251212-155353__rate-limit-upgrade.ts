import "server-only";

import { adminDb, FieldValue } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

type RateLimitStrategy = "fixed-window" | "sliding-window" | "token-bucket";
type RateLimitScope = "ip" | "user" | "endpoint" | "global";
type RateLimitAction = "block" | "delay" | "degrade" | "queue";

interface TokenBucketOptions {
  capacity?: number;
  refillRatePerSecond?: number;
  tokensPerRequest?: number;
}

interface QueueOptions {
  enabled?: boolean;
  maxWaitMs?: number;
  retryIntervalMs?: number;
}

// Types
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  strategy: RateLimitStrategy;
  scope?: RateLimitScope[];
  keyGenerator?: (req: NextRequest) => string;
  handler?: (
    req: NextRequest,
    result: RateLimitResult,
  ) => Response | Promise<Response>;
  degradedResponse?: (
    req: NextRequest,
    result: RateLimitResult,
  ) => Response | Promise<Response>;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  skip?: (req: NextRequest) => boolean | Promise<boolean>;
  action?: RateLimitAction;
  delayMs?: number;
  queue?: QueueOptions;
  bucket?: TokenBucketOptions;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter: number; // Seconds until reset
  limit: number;
  strategy: RateLimitStrategy;
  scopeKey: string;
  actionTaken?: RateLimitAction;
  queued?: boolean;
  delayedMs?: number;
}

interface FixedWindowStore {
  count: number;
  resetAt: number; // Timestamp
}

interface SlidingWindowStore {
  hits: number[];
}

interface TokenBucketStore {
  tokens: number;
  lastRefillAt: number;
}

const rateLimitCollection = adminDb.collection("rateLimits");

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  redemption: {
    strategy: "sliding-window",
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    scope: ["ip", "user", "endpoint"] as RateLimitScope[],
    action: "block" as RateLimitAction,
    keyGenerator: (req: NextRequest) => {
      const ip = getClientIP(req);
      const userId = req.headers.get("x-user-id") || "anonymous";
      return `redemption:${ip}:${userId}:${req.nextUrl.pathname}`;
    },
  },

  api: {
    strategy: "fixed-window",
    windowMs: 60 * 1000,
    maxRequests: 100,
    scope: ["ip"] as RateLimitScope[],
    action: "delay" as RateLimitAction,
    delayMs: 250,
    keyGenerator: (req: NextRequest) => {
      const ip = getClientIP(req);
      return `api:${ip}`;
    },
  },

  eligibility: {
    strategy: "sliding-window",
    windowMs: 60 * 1000,
    maxRequests: 30,
    scope: ["ip", "user"] as RateLimitScope[],
    action: "degrade" as RateLimitAction,
    degradedResponse: (_req: NextRequest, result: RateLimitResult) =>
      NextResponse.json(
        {
          eligible: false,
          reason: "rate_limited",
          retryAfter: result.retryAfter,
        },
        {
          status: 200,
          headers: {
            "Retry-After": String(result.retryAfter),
          },
        },
      ),
    keyGenerator: (req: NextRequest) => {
      const ip = getClientIP(req);
      const userId = req.headers.get("x-user-id") || "anonymous";
      return `eligibility:${ip}:${userId}`;
    },
  },

  checkout: {
    strategy: "token-bucket",
    windowMs: 60 * 1000,
    maxRequests: 5,
    bucket: {
      capacity: 5,
      refillRatePerSecond: 1,
    },
    scope: ["ip", "user", "endpoint"] as RateLimitScope[],
    action: "queue" as RateLimitAction,
    queue: {
      enabled: true,
      maxWaitMs: 800,
      retryIntervalMs: 100,
    },
    keyGenerator: (req: NextRequest) => {
      const ip = getClientIP(req);
      const userId = req.headers.get("x-user-id") || "anonymous";
      return `checkout:${ip}:${userId}:${req.nextUrl.pathname}`;
    },
  },

  global: {
    strategy: "fixed-window",
    windowMs: 60 * 1000,
    maxRequests: 1000,
    scope: ["global"] as RateLimitScope[],
    action: "block" as RateLimitAction,
    keyGenerator: () => "global",
  },
};

/**
 * Build a scoped key when no custom generator is provided.
 */
function buildScopedKey(req: NextRequest, config: RateLimitConfig): string {
  const scopes = config.scope ?? ["ip"];
  const parts = ["rl"];

  for (const scope of scopes) {
    switch (scope) {
      case "ip":
        parts.push(`ip:${getClientIP(req)}`);
        break;
      case "user": {
        const userId =
          req.headers.get("x-user-id") ||
          req.headers.get("x-session-id") ||
          "anonymous";
        parts.push(`user:${userId}`);
        break;
      }
      case "endpoint":
        parts.push(`ep:${req.method}:${req.nextUrl.pathname}`);
        break;
      case "global":
        parts.push("global");
        break;
    }
  }

  return parts.join(":");
}

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9:._-]/g, "");

/**
 * Check rate limit using the configured strategy.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const safeKey = sanitizeKey(key);

  try {
    switch (config.strategy) {
      case "sliding-window":
        return await checkSlidingWindow(safeKey, config);
      case "token-bucket":
        return await checkTokenBucket(safeKey, config);
      case "fixed-window":
      default:
        return await checkFixedWindow(safeKey, config);
    }
  } catch (error) {
    console.error("[rate-limit] Failed to evaluate limit", error);
    // Fail open to avoid blocking traffic if the store is unavailable
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
      retryAfter: 0,
      limit: config.maxRequests,
      strategy: config.strategy,
      scopeKey: safeKey,
    };
  }
}

async function checkFixedWindow(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const ref = rateLimitCollection.doc(`fw:${key}`);

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as FixedWindowStore | undefined;

    if (!data || data.resetAt <= now) {
      const resetAt = now + config.windowMs;
      transaction.set(ref, { count: 1, resetAt });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(resetAt),
        retryAfter: 0,
        limit: config.maxRequests,
        strategy: "fixed-window",
        scopeKey: key,
      };
    }

    if (data.count >= config.maxRequests) {
      const retryAfter = Math.ceil((data.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(data.resetAt),
        retryAfter,
        limit: config.maxRequests,
        strategy: "fixed-window",
        scopeKey: key,
      };
    }

    transaction.update(ref, { count: FieldValue.increment(1) });

    return {
      allowed: true,
      remaining: config.maxRequests - data.count - 1,
      resetAt: new Date(data.resetAt),
      retryAfter: 0,
      limit: config.maxRequests,
      strategy: "fixed-window",
      scopeKey: key,
    };
  });

  return result;
}

async function checkSlidingWindow(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const ref = rateLimitCollection.doc(`sw:${key}`);

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as SlidingWindowStore | undefined;

    const hits = Array.isArray(data?.hits)
      ? data!.hits.map((value) => Number(value) || 0)
      : [];
    const recentHits = hits.filter((ts) => ts > windowStart);

    if (recentHits.length >= config.maxRequests) {
      const oldest = Math.min(...recentHits);
      const resetAt = oldest + config.windowMs;
      const retryAfter = Math.ceil((resetAt - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(resetAt),
        retryAfter,
        limit: config.maxRequests,
        strategy: "sliding-window",
        scopeKey: key,
      };
    }

    recentHits.push(now);
    transaction.set(ref, { hits: recentHits }, { merge: true });

    const earliest = Math.min(...recentHits);
    const resetAt = earliest + config.windowMs;

    return {
      allowed: true,
      remaining: config.maxRequests - recentHits.length,
      resetAt: new Date(resetAt),
      retryAfter: 0,
      limit: config.maxRequests,
      strategy: "sliding-window",
      scopeKey: key,
    };
  });

  return result;
}

async function checkTokenBucket(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = config.bucket ?? {};
  const capacity = bucket.capacity ?? config.maxRequests;
  const refillRatePerSecond =
    bucket.refillRatePerSecond ?? capacity / (config.windowMs / 1000);
  const tokensPerRequest = bucket.tokensPerRequest ?? 1;
  const tokensPerMs = Math.max(refillRatePerSecond / 1000, Number.EPSILON);

  const ref = rateLimitCollection.doc(`tb:${key}`);

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as TokenBucketStore | undefined;

    const lastRefillAt =
      typeof data?.lastRefillAt === "number" ? data.lastRefillAt : now;
    const storedTokens =
      typeof data?.tokens === "number" ? data.tokens : capacity;
    const clampedTokens = Math.min(capacity, Math.max(0, storedTokens));
    const elapsed = Math.max(now - lastRefillAt, 0);
    const refilled = Math.min(capacity, clampedTokens + elapsed * tokensPerMs);
    const updatedTokens = refilled - tokensPerRequest;

    if (updatedTokens < 0) {
      const deficit = Math.abs(updatedTokens);
      const retryAfterSeconds = Math.ceil(deficit / tokensPerMs / 1000);
      const resetAt = now + retryAfterSeconds * 1000;

      transaction.set(
        ref,
        {
          tokens: Math.max(refilled, 0),
          lastRefillAt: now,
        },
        { merge: true },
      );

      return {
        allowed: false,
        remaining: Math.max(0, Math.floor(refilled)),
        resetAt: new Date(resetAt),
        retryAfter: retryAfterSeconds,
        limit: capacity,
        strategy: "token-bucket",
        scopeKey: key,
      };
    }

    transaction.set(
      ref,
      {
        tokens: Math.max(0, updatedTokens),
        lastRefillAt: now,
      },
      { merge: true },
    );

    const timeToFullMs = (capacity - updatedTokens) / tokensPerMs;

    return {
      allowed: true,
      remaining: Math.max(0, Math.floor(updatedTokens)),
      resetAt: new Date(now + timeToFullMs),
      retryAfter: 0,
      limit: capacity,
      strategy: "token-bucket",
      scopeKey: key,
    };
  });

  return result;
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));

async function attemptQueue(
  key: string,
  config: RateLimitConfig,
  initial: RateLimitResult,
): Promise<RateLimitResult> {
  const maxWaitMs = config.queue?.maxWaitMs ?? Math.min(config.windowMs, 800);
  const intervalMs = config.queue?.retryIntervalMs ?? 100;
  const start = Date.now();
  let last = initial;

  while (Date.now() - start < maxWaitMs) {
    await sleep(intervalMs);
    last = await checkRateLimit(key, config);
    if (last.allowed) {
      return {
        ...last,
        queued: true,
        actionTaken: "queue",
      };
    }
  }

  return { ...last, queued: true, actionTaken: "queue" };
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    req: NextRequest,
  ): Promise<{ allowed: boolean; response?: Response; result: RateLimitResult }> {
    if (config.skip && (await config.skip(req))) {
      return {
        allowed: true,
        result: {
          allowed: true,
          remaining: config.maxRequests,
          resetAt: new Date(Date.now() + config.windowMs),
          retryAfter: 0,
          limit: config.maxRequests,
          strategy: config.strategy,
          scopeKey: "skipped",
        },
      };
    }

    const key =
      config.keyGenerator?.(req) ?? buildScopedKey(req, config);
    const result = await checkRateLimit(key, config);

    if (result.allowed) {
      return { allowed: true, result };
    }

    const action = config.action ?? "block";

    if (action === "delay") {
      const delayMs =
        config.delayMs ?? Math.min(config.windowMs, result.retryAfter * 1000);
      if (delayMs > 0) {
        await sleep(delayMs);
      }
      const delayedResult: RateLimitResult = {
        ...result,
        actionTaken: "delay",
        delayedMs: delayMs,
      };
      const response =
        (await config.handler?.(req, delayedResult)) ??
        defaultRateLimitResponse(delayedResult);
      return { allowed: false, response, result: delayedResult };
    }

    if (action === "queue" && config.queue?.enabled !== false) {
      const queuedResult = await attemptQueue(key, config, result);
      if (queuedResult.allowed) {
        return { allowed: true, result: queuedResult };
      }

      const response =
        (await config.handler?.(req, queuedResult)) ??
        defaultRateLimitResponse(queuedResult);
      return { allowed: false, response, result: queuedResult };
    }

    if (action === "degrade") {
      const degradedResult: RateLimitResult = {
        ...result,
        actionTaken: "degrade",
      };
      const response =
        (await config.degradedResponse?.(req, degradedResult)) ??
        defaultDegradedResponse(degradedResult);
      return { allowed: false, response, result: degradedResult };
    }

    const response =
      (await config.handler?.(req, { ...result, actionTaken: "block" })) ??
      defaultRateLimitResponse({ ...result, actionTaken: "block" });

    return { allowed: false, response, result: { ...result, actionTaken: "block" } };
  };
}

/**
 * Default rate limit exceeded response
 */
function defaultRateLimitResponse(result: RateLimitResult): Response {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfter: result.retryAfter,
      limit: result.limit,
      action: result.actionTaken ?? "block",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    },
  );
}

function defaultDegradedResponse(result: RateLimitResult): Response {
  return NextResponse.json(
    {
      degraded: true,
      reason: "rate_limited",
      retryAfter: result.retryAfter,
    },
    {
      status: 200,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    },
  );
}

/**
 * Get client IP from request
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnecting = req.headers.get("cf-connecting-ip");
  if (cfConnecting) {
    return cfConnecting;
  }

  return "unknown";
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", result.resetAt.toISOString());
  return response;
}

/**
 * Decorator for rate-limited API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  configName: keyof typeof RATE_LIMIT_CONFIGS,
) {
  const config = RATE_LIMIT_CONFIGS[configName] as RateLimitConfig;
  const limiter = createRateLimiter(config);

  return async function rateLimitedHandler(req: NextRequest): Promise<Response> {
    const { allowed, response, result } = await limiter(req);

    if (!allowed && response) {
      return response;
    }

    const handlerResponse = await handler(req);

    const nextResponse = new NextResponse(handlerResponse.body, {
      status: handlerResponse.status,
      headers: handlerResponse.headers,
    });

    return addRateLimitHeaders(nextResponse, result);
  };
}

// Export types
export type { RateLimitStrategy, RateLimitScope, RateLimitAction };
