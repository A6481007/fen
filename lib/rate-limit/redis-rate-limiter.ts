import IORedis, { type Redis } from "ioredis";

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  limited: boolean;
  retryAfterMs: number;
  source: "redis" | "memory";
};

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();
const MEMORY_CLEANUP_INTERVAL_MS = 5_000;
const MEMORY_CLEANUP_THRESHOLD = 10_000;
let lastMemoryCleanup = 0;

const globalRateLimiterState = globalThis as typeof globalThis & {
  __promoRateLimitRedis?: Redis | null;
  __promoRateLimitErrored?: boolean;
  __promoRateLimitFallbackWarned?: boolean;
};

const createRedisClient = (): Redis | null => {
  if (globalRateLimiterState.__promoRateLimitRedis !== undefined) {
    return globalRateLimiterState.__promoRateLimitRedis;
  }

  const url = process.env.CACHE_REDIS_URL;
  if (!url) {
    globalRateLimiterState.__promoRateLimitRedis = null;
    return null;
  }

  const redis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redis.on("error", (error) => {
    if (globalRateLimiterState.__promoRateLimitErrored) {
      return;
    }

    globalRateLimiterState.__promoRateLimitErrored = true;
    console.warn("[promotions][rate-limit] Redis error, using in-memory fallback", error);
  });

  redis.on("ready", () => {
    globalRateLimiterState.__promoRateLimitErrored = false;
  });

  globalRateLimiterState.__promoRateLimitRedis = redis;
  return redis;
};

const normalizeTtl = (ttl?: number): number => {
  if (ttl === undefined || ttl === null) {
    return -1;
  }

  if (ttl < 0) {
    return -1;
  }

  return ttl;
};

const consumeFromRedis = async (
  key: string,
  rule: RateLimitRule
): Promise<RateLimitResult | null> => {
  const redis = createRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const [incrResult, , ttlResult] = await redis
      .multi()
      .incr(key)
      .pexpire(key, rule.windowMs, "NX")
      .pttl(key)
      .exec();

    const count = Number(incrResult?.[1] ?? 0);
    const ttl = normalizeTtl(Number(ttlResult?.[1]));
    const retryAfterMs = ttl > 0 ? ttl : rule.windowMs;

    return {
      limited: count > rule.limit,
      retryAfterMs,
      source: "redis",
    };
  } catch (error) {
    if (!globalRateLimiterState.__promoRateLimitErrored) {
      console.warn("[promotions][rate-limit] Redis command failed, switching to in-memory", error);
      globalRateLimiterState.__promoRateLimitErrored = true;
    }
    return null;
  }
};

const cleanupMemoryBuckets = (now: number) => {
  const shouldCleanup =
    now - lastMemoryCleanup >= MEMORY_CLEANUP_INTERVAL_MS ||
    inMemoryBuckets.size >= MEMORY_CLEANUP_THRESHOLD;

  if (!shouldCleanup) {
    return;
  }

  lastMemoryCleanup = now;

  for (const [bucketKey, entry] of inMemoryBuckets) {
    if (entry.resetAt <= now) {
      inMemoryBuckets.delete(bucketKey);
    }
  }
};

const consumeFromMemory = (key: string, rule: RateLimitRule): RateLimitResult => {
  const now = Date.now();
  const existing = inMemoryBuckets.get(key);

  cleanupMemoryBuckets(now);

  if (!existing || existing.resetAt <= now) {
    if (existing && existing.resetAt <= now) {
      inMemoryBuckets.delete(key);
    }
    inMemoryBuckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { limited: false, retryAfterMs: rule.windowMs, source: "memory" };
  }

  if (existing.count >= rule.limit) {
    return { limited: true, retryAfterMs: Math.max(existing.resetAt - now, 0), source: "memory" };
  }

  const updated = { count: existing.count + 1, resetAt: existing.resetAt };
  inMemoryBuckets.set(key, updated);

  return { limited: false, retryAfterMs: Math.max(updated.resetAt - now, 0), source: "memory" };
};

export const consumeRateLimit = async (
  key: string,
  rule: RateLimitRule,
  options?: { prefix?: string }
): Promise<RateLimitResult> => {
  const namespacedKey = `${options?.prefix ?? "promo:rl"}:${key}`;
  const redisResult = await consumeFromRedis(namespacedKey, rule);

  if (redisResult) {
    return redisResult;
  }

  if (!globalRateLimiterState.__promoRateLimitFallbackWarned) {
    console.warn("[promotions][rate-limit] Redis unavailable, using in-memory limits");
    globalRateLimiterState.__promoRateLimitFallbackWarned = true;
  }

  return consumeFromMemory(namespacedKey, rule);
};
