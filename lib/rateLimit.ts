import "server-only";

import IORedis, { type Redis } from "ioredis";
import { NextRequest, NextResponse } from "next/server";

type RateLimitStrategy = "fixed-window" | "sliding-window" | "token-bucket";
type RateLimitScope = "ip" | "user" | "endpoint" | "global";
type RateLimitAction = "block" | "delay" | "degrade" | "queue";
type RateLimitStore = "auto" | "redis" | "memory";

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

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
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
  store?: RateLimitStore;
  name?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter: number;
  limit: number;
  strategy: RateLimitStrategy;
  scopeKey: string;
  actionTaken?: RateLimitAction;
  queued?: boolean;
  delayedMs?: number;
  windowMs: number;
  store: "redis" | "memory";
}

interface FixedWindowStore {
  count: number;
  resetAt: number;
}

interface SlidingWindowStore {
  hits: number[];
}

interface TokenBucketStore {
  tokens: number;
  lastRefillAt: number;
}

const redisState: {
  client: Redis | null | undefined;
  warned: boolean;
} = {
  client: undefined,
  warned: false,
};

const fixedWindowMemory = new Map<string, FixedWindowStore>();
const slidingWindowMemory = new Map<string, number[]>();
const tokenBucketMemory = new Map<string, TokenBucketStore>();

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9:._-]/g, "");
const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));

function getRequestPath(req: NextRequest): string {
  const nextPath = (req as { nextUrl?: { pathname?: string } }).nextUrl?.pathname;
  if (nextPath) return nextPath;
  try {
    return new URL(req.url).pathname;
  } catch {
    return "/";
  }
}

function getRedisClient(): Redis | null {
  if (redisState.client !== undefined) {
    return redisState.client;
  }

  const url = process.env.CACHE_REDIS_URL;
  if (!url) {
    redisState.client = null;
    return null;
  }

  try {
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    client.on("error", (error) => {
      if (!redisState.warned) {
        console.warn("[rate-limit] Redis error, switching to memory fallback", error);
        redisState.warned = true;
      }
      redisState.client = null;
    });

    client.on("end", () => {
      redisState.client = null;
    });

    redisState.client = client;
    return client;
  } catch (error) {
    if (!redisState.warned) {
      console.warn("[rate-limit] Failed to initialize Redis client, using memory fallback", error);
      redisState.warned = true;
    }
    redisState.client = null;
    return null;
  }
}

function normalizeTtl(rawTtl: number | undefined | null, fallbackMs: number): number {
  if (rawTtl === undefined || rawTtl === null || rawTtl < 0) {
    return fallbackMs;
  }
  return rawTtl;
}

function buildPolicy(limit: number, windowMs: number, strategy: RateLimitStrategy) {
  return `${limit};w=${Math.ceil(windowMs / 1000)};strategy=${strategy}`;
}

export const RATE_LIMIT_CONFIGS = {
  redemption: {
    name: "redemption",
    strategy: "sliding-window",
    windowMs: 60_000,
    maxRequests: 10,
    scope: ["ip", "user", "endpoint"] as RateLimitScope[],
    action: "block" as RateLimitAction,
    keyGenerator: (req: NextRequest) => {
      const ip = getClientIP(req);
      const userId = req.headers.get("x-user-id") || "anonymous";
      return `redemption:${ip}:${userId}:${getRequestPath(req)}`;
    },
  },
  eligibility: {
    name: "promotions-eligibility",
    strategy: "sliding-window",
    windowMs: 60_000,
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
      const userId =
        req.headers.get("x-user-id") ??
        req.headers.get("x-session-id") ??
        "anonymous";
      return `eligibility:${ip}:${userId}`;
    },
  },
  track: {
    name: "promotions-track",
    strategy: "sliding-window",
    windowMs: 60_000,
    maxRequests: 100,
    scope: ["ip", "endpoint"] as RateLimitScope[],
    action: "block" as RateLimitAction,
    keyGenerator: (req: NextRequest) => {
      const ip = getClientIP(req);
      return `track:${ip}:${getRequestPath(req)}`;
    },
  },
  campaigns: {
    name: "promotions-campaigns",
    strategy: "fixed-window",
    windowMs: 60_000,
    maxRequests: 60,
    scope: ["ip", "endpoint"] as RateLimitScope[],
    action: "block" as RateLimitAction,
    keyGenerator: (req: NextRequest) => `campaigns:${getClientIP(req)}:${getRequestPath(req)}`,
  },
  cartAbandonment: {
    name: "cart-abandonment",
    strategy: "token-bucket",
    windowMs: 60_000,
    maxRequests: 20,
    bucket: {
      capacity: 20,
      refillRatePerSecond: 20 / 60,
      tokensPerRequest: 1,
    },
    scope: ["user"] as RateLimitScope[],
    action: "block" as RateLimitAction,
    keyGenerator: (req: NextRequest) => {
      const userId =
        req.headers.get("x-user-id") ??
        req.headers.get("x-session-id") ??
        "anonymous";
      return `cart-abandonment:${userId}`;
    },
  },
  checkout: {
    name: "checkout",
    strategy: "sliding-window",
    windowMs: 60_000,
    maxRequests: 5,
    scope: ["ip", "user", "endpoint"] as RateLimitScope[],
    action: "block" as RateLimitAction,
    keyGenerator: (req: NextRequest) => {
      const ip = getClientIP(req);
      const user =
        req.headers.get("x-user-id") ??
        req.headers.get("x-session-id") ??
        "anonymous";
      return `checkout:${ip}:${user}:${getRequestPath(req)}`;
    },
  },
} satisfies Record<string, RateLimitConfig>;

function buildScopedKey(req: NextRequest, config: RateLimitConfig): string {
  const scopes = config.scope ?? ["ip"];
  const parts = [config.name ?? "rl"];

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
        parts.push(`ep:${req.method}:${getRequestPath(req)}`);
        break;
      case "global":
        parts.push("global");
        break;
    }
  }

  return parts.join(":");
}

async function checkFixedWindowRedis(
  key: string,
  config: RateLimitConfig,
  redis: Redis,
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `rl:fw:${key}`;
  const pipeline = redis.multi();

  pipeline.incr(redisKey);
  pipeline.pexpire(redisKey, config.windowMs, "NX");
  pipeline.pttl(redisKey);

  const [incrResult, , ttlResult] = await pipeline.exec();
  const count = Number(incrResult?.[1] ?? 0);
  const ttl = normalizeTtl(Number(ttlResult?.[1]), config.windowMs);
  const resetAt = new Date(now + ttl);

  if (count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil(ttl / 1000),
      limit: config.maxRequests,
      strategy: "fixed-window",
      scopeKey: key,
      windowMs: config.windowMs,
      store: "redis",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(config.maxRequests - count, 0),
    resetAt,
    retryAfter: 0,
    limit: config.maxRequests,
    strategy: "fixed-window",
    scopeKey: key,
    windowMs: config.windowMs,
    store: "redis",
  };
}

function checkFixedWindowMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const store = fixedWindowMemory.get(key);

  if (!store || store.resetAt <= now) {
    const resetAt = now + config.windowMs;
    fixedWindowMemory.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
      retryAfter: 0,
      limit: config.maxRequests,
      strategy: "fixed-window",
      scopeKey: key,
      windowMs: config.windowMs,
      store: "memory",
    };
  }

  if (store.count >= config.maxRequests) {
    const retryAfter = Math.ceil((store.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(store.resetAt),
      retryAfter,
      limit: config.maxRequests,
      strategy: "fixed-window",
      scopeKey: key,
      windowMs: config.windowMs,
      store: "memory",
    };
  }

  store.count += 1;
  fixedWindowMemory.set(key, store);

  return {
    allowed: true,
    remaining: config.maxRequests - store.count,
    resetAt: new Date(store.resetAt),
    retryAfter: 0,
    limit: config.maxRequests,
    strategy: "fixed-window",
    scopeKey: key,
    windowMs: config.windowMs,
    store: "memory",
  };
}

async function checkSlidingWindowRedis(
  key: string,
  config: RateLimitConfig,
  redis: Redis,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const redisKey = `rl:sw:${key}`;
  const member = `${now}-${Math.random().toString(16).slice(2)}`;
  const pipeline = redis.multi();

  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, now, member);
  pipeline.zcard(redisKey);
  pipeline.zrange(redisKey, 0, 0);
  pipeline.pttl(redisKey);
  pipeline.pexpire(redisKey, config.windowMs, "NX");

  const [, , cardResult, oldestResult, ttlResult] = await pipeline.exec();
  const count = Number(cardResult?.[1] ?? 0);
  const oldest = Number((oldestResult?.[1] as string[] | undefined)?.[0] ?? now);
  const ttl = normalizeTtl(Number(ttlResult?.[1]), config.windowMs);
  const resetMs = Math.max(ttl, config.windowMs - (now - oldest));
  const resetAt = new Date(now + resetMs);

  if (count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil(resetMs / 1000),
      limit: config.maxRequests,
      strategy: "sliding-window",
      scopeKey: key,
      windowMs: config.windowMs,
      store: "redis",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(config.maxRequests - count, 0),
    resetAt,
    retryAfter: 0,
    limit: config.maxRequests,
    strategy: "sliding-window",
    scopeKey: key,
    windowMs: config.windowMs,
    store: "redis",
  };
}

function checkSlidingWindowMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const hits = slidingWindowMemory.get(key) ?? [];
  const recent = hits.filter((hit) => hit > windowStart);

  if (recent.length >= config.maxRequests) {
    const oldest = Math.min(...recent);
    const resetAt = oldest + config.windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(resetAt),
      retryAfter: Math.ceil((resetAt - now) / 1000),
      limit: config.maxRequests,
      strategy: "sliding-window",
      scopeKey: key,
      windowMs: config.windowMs,
      store: "memory",
    };
  }

  recent.push(now);
  slidingWindowMemory.set(key, recent);

  const resetAt = Math.min(...recent) + config.windowMs;
  return {
    allowed: true,
    remaining: config.maxRequests - recent.length,
    resetAt: new Date(resetAt),
    retryAfter: 0,
    limit: config.maxRequests,
    strategy: "sliding-window",
    scopeKey: key,
    windowMs: config.windowMs,
    store: "memory",
  };
}

async function checkTokenBucketRedis(
  key: string,
  config: RateLimitConfig,
  redis: Redis,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = config.bucket ?? {};
  const capacity = bucket.capacity ?? config.maxRequests;
  const refillRatePerSecond =
    bucket.refillRatePerSecond ?? capacity / (config.windowMs / 1000);
  const tokensPerRequest = bucket.tokensPerRequest ?? 1;
  const tokensPerMs = Math.max(refillRatePerSecond / 1000, Number.EPSILON);
  const redisKey = `rl:tb:${key}`;

  const [rawTokens, rawLastRefill] = await redis.hmget(redisKey, "tokens", "lastRefillAt");

  const lastRefillAt =
    typeof rawLastRefill === "string" && rawLastRefill.length > 0
      ? Number(rawLastRefill)
      : now;
  const storedTokens =
    typeof rawTokens === "string" && rawTokens.length > 0 ? Number(rawTokens) : capacity;

  const clampedTokens = Math.min(capacity, Math.max(0, storedTokens));
  const elapsed = Math.max(now - lastRefillAt, 0);
  const refilled = Math.min(capacity, clampedTokens + elapsed * tokensPerMs);
  const updatedTokens = refilled - tokensPerRequest;

  if (updatedTokens < 0) {
    const deficit = Math.abs(updatedTokens);
    const retryAfterMs = Math.ceil(deficit / tokensPerMs);
    const resetAt = now + retryAfterMs;

    await redis.hmset(redisKey, { tokens: Math.max(refilled, 0), lastRefillAt: now });
    await redis.pexpire(redisKey, config.windowMs);

    return {
      allowed: false,
      remaining: Math.max(0, Math.floor(refilled)),
      resetAt: new Date(resetAt),
      retryAfter: Math.ceil(retryAfterMs / 1000),
      limit: capacity,
      strategy: "token-bucket",
      scopeKey: key,
      windowMs: config.windowMs,
      store: "redis",
    };
  }

  await redis.hmset(redisKey, {
    tokens: Math.max(0, updatedTokens),
    lastRefillAt: now,
  });
  await redis.pexpire(redisKey, config.windowMs);

  const timeToFullMs = (capacity - updatedTokens) / tokensPerMs;

  return {
    allowed: true,
    remaining: Math.max(0, Math.floor(updatedTokens)),
    resetAt: new Date(now + timeToFullMs),
    retryAfter: 0,
    limit: capacity,
    strategy: "token-bucket",
    scopeKey: key,
    windowMs: config.windowMs,
    store: "redis",
  };
}

function checkTokenBucketMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const bucket = config.bucket ?? {};
  const capacity = bucket.capacity ?? config.maxRequests;
  const refillRatePerSecond =
    bucket.refillRatePerSecond ?? capacity / (config.windowMs / 1000);
  const tokensPerRequest = bucket.tokensPerRequest ?? 1;
  const tokensPerMs = Math.max(refillRatePerSecond / 1000, Number.EPSILON);

  const store = tokenBucketMemory.get(key);
  const lastRefillAt = store?.lastRefillAt ?? now;
  const storedTokens = store?.tokens ?? capacity;
  const clampedTokens = Math.min(capacity, Math.max(0, storedTokens));
  const elapsed = Math.max(now - lastRefillAt, 0);
  const refilled = Math.min(capacity, clampedTokens + elapsed * tokensPerMs);
  const updatedTokens = refilled - tokensPerRequest;

  if (updatedTokens < 0) {
    const deficit = Math.abs(updatedTokens);
    const retryAfterMs = Math.ceil(deficit / tokensPerMs);
    const resetAt = now + retryAfterMs;

    tokenBucketMemory.set(key, {
      tokens: Math.max(refilled, 0),
      lastRefillAt: now,
    });

    return {
      allowed: false,
      remaining: Math.max(0, Math.floor(refilled)),
      resetAt: new Date(resetAt),
      retryAfter: Math.ceil(retryAfterMs / 1000),
      limit: capacity,
      strategy: "token-bucket",
      scopeKey: key,
      windowMs: config.windowMs,
      store: "memory",
    };
  }

  tokenBucketMemory.set(key, {
    tokens: Math.max(0, updatedTokens),
    lastRefillAt: now,
  });

  const timeToFullMs = (capacity - updatedTokens) / tokensPerMs;

  return {
    allowed: true,
    remaining: Math.max(0, Math.floor(updatedTokens)),
    resetAt: new Date(now + timeToFullMs),
    retryAfter: 0,
    limit: capacity,
    strategy: "token-bucket",
    scopeKey: key,
    windowMs: config.windowMs,
    store: "memory",
  };
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const safeKey = sanitizeKey(key);
  try {
    const preference = config.store ?? "auto";
    const redisClient =
      preference === "memory" ? null : getRedisClient();
    const useRedis = preference !== "memory" && redisClient;

    try {
      if (useRedis) {
        switch (config.strategy) {
          case "sliding-window":
            return await checkSlidingWindowRedis(safeKey, config, redisClient!);
          case "token-bucket":
            return await checkTokenBucketRedis(safeKey, config, redisClient!);
          case "fixed-window":
          default:
            return await checkFixedWindowRedis(safeKey, config, redisClient!);
        }
      }
    } catch (error) {
      if (!redisState.warned) {
        console.warn("[rate-limit] Redis evaluation failed, falling back to memory", error);
        redisState.warned = true;
      }
      redisState.client = null;
    }

    switch (config.strategy) {
      case "sliding-window":
        return checkSlidingWindowMemory(safeKey, config);
      case "token-bucket":
        return checkTokenBucketMemory(safeKey, config);
      case "fixed-window":
      default:
        return checkFixedWindowMemory(safeKey, config);
    }
  } catch (error) {
    console.error("[rate-limit] Failed to evaluate limit", error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
      retryAfter: 0,
      limit: config.maxRequests,
      strategy: config.strategy,
      scopeKey: safeKey,
      windowMs: config.windowMs,
      store: "memory",
    };
  }
}

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

export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    req: NextRequest,
  ): Promise<{ allowed: boolean; response?: Response; result: RateLimitResult }> {
    if (config.skip && (await config.skip(req))) {
      const resetAt = new Date(Date.now() + config.windowMs);
      return {
        allowed: true,
        result: {
          allowed: true,
          remaining: config.maxRequests,
          resetAt,
          retryAfter: 0,
          limit: config.maxRequests,
          strategy: config.strategy,
          scopeKey: "skipped",
          windowMs: config.windowMs,
          store: "memory",
        },
      };
    }

    const key = config.keyGenerator?.(req) ?? buildScopedKey(req, config);
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

    return {
      allowed: false,
      response,
      result: { ...result, actionTaken: "block" },
    };
  };
}

function defaultRateLimitResponse(result: RateLimitResult): Response {
  return addRateLimitHeaders(
    NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: result.retryAfter,
        limit: result.limit,
        action: result.actionTaken ?? "block",
      },
      { status: 429 },
    ),
    result,
  );
}

function defaultDegradedResponse(result: RateLimitResult): Response {
  const response = NextResponse.json(
    {
      degraded: true,
      reason: "rate_limited",
      retryAfter: result.retryAfter,
    },
    { status: 200 },
  );
  if (result.retryAfter > 0) {
    response.headers.set("Retry-After", String(result.retryAfter));
  }
  return addRateLimitHeaders(response, result);
}

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

  const vercelIp = req.headers.get("x-vercel-ip");
  if (vercelIp) {
    return vercelIp;
  }

  return "unknown";
}

export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
): NextResponse {
  const nextResponse =
    response instanceof NextResponse
      ? response
      : new NextResponse(response.body, {
          status: response.status,
          headers: response.headers,
        });

  nextResponse.headers.set("X-RateLimit-Limit", String(result.limit));
  nextResponse.headers.set("X-RateLimit-Remaining", String(result.remaining));
  nextResponse.headers.set("X-RateLimit-Reset", result.resetAt.toISOString());
  nextResponse.headers.set(
    "X-RateLimit-Policy",
    buildPolicy(result.limit, result.windowMs, result.strategy),
  );
  nextResponse.headers.set("X-RateLimit-Strategy", result.strategy);
  nextResponse.headers.set("X-RateLimit-Key", result.scopeKey);
  nextResponse.headers.set("X-RateLimit-Store", result.store);

  if (result.retryAfter > 0) {
    nextResponse.headers.set("Retry-After", String(result.retryAfter));
  }

  return nextResponse;
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response> | Response,
  configName: keyof typeof RATE_LIMIT_CONFIGS,
) {
  const config = RATE_LIMIT_CONFIGS[configName] as RateLimitConfig;
  const limiter = createRateLimiter(config);

  return async function rateLimitedHandler(req: NextRequest): Promise<Response> {
    const { allowed, response, result } = await limiter(req);

    if (!allowed && response) {
      return addRateLimitHeaders(response, result);
    }

    const handlerResponse = await handler(req);
    return addRateLimitHeaders(handlerResponse, result);
  };
}

const dynamicLimiters = new Map<string, ReturnType<typeof createRateLimiter>>();

export async function rateLimit(
  req: NextRequest,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<Response | null> {
  const limiterKey = `${key}:${maxRequests}:${windowSeconds}`;
  let limiter = dynamicLimiters.get(limiterKey);

  if (!limiter) {
    limiter = createRateLimiter({
      name: key,
      strategy: "fixed-window",
      windowMs: windowSeconds * 1000,
      maxRequests,
      scope: ["ip"],
      action: "block",
      keyGenerator: (request) => `${key}:${getClientIP(request)}`,
    });
    dynamicLimiters.set(limiterKey, limiter);
  }

  const { allowed, response, result } = await limiter(req);
  if (!allowed && response) {
    return addRateLimitHeaders(response, result);
  }

  return null;
}

export const __testUtils = {
  clearMemoryStores: () => {
    fixedWindowMemory.clear();
    slidingWindowMemory.clear();
    tokenBucketMemory.clear();
  },
  resetRedisClient: () => {
    redisState.client = undefined;
    redisState.warned = false;
  },
};

export type { RateLimitStrategy, RateLimitScope, RateLimitAction };
