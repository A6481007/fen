import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("ioredis", () => {
  class MockPipeline {
    incr = vi.fn(() => this);
    pexpire = vi.fn(() => this);
    pttl = vi.fn(() => this);
    zremrangebyscore = vi.fn(() => this);
    zadd = vi.fn(() => this);
    zcard = vi.fn(() => this);
    zrange = vi.fn(() => this);
    exec = vi.fn().mockRejectedValue(new Error("redis down"));
  }

  class MockRedis {
    multi() {
      return new MockPipeline();
    }

    hmget = vi.fn().mockRejectedValue(new Error("redis down"));
    hmset = vi.fn();
    pexpire = vi.fn();
    on() {}
  }

  return { default: MockRedis, __esModule: true };
});

import {
  __testUtils,
  checkRateLimit,
  createRateLimiter,
  withRateLimit,
} from "@/lib/rateLimit";

const originalCacheRedisUrl = process.env.CACHE_REDIS_URL;

beforeEach(() => {
  process.env.CACHE_REDIS_URL = "";
  __testUtils.clearMemoryStores();
  __testUtils.resetRedisClient();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  process.env.CACHE_REDIS_URL = originalCacheRedisUrl;
});

describe("rateLimit strategies", () => {
  it("blocks after exceeding fixed window limit (memory fallback)", async () => {
    const config = {
      windowMs: 1_000,
      maxRequests: 2,
      strategy: "fixed-window" as const,
      scope: ["ip"] as const,
      store: "memory" as const,
    };

    const result1 = await checkRateLimit("fixed:test", config);
    const result2 = await checkRateLimit("fixed:test", config);
    const result3 = await checkRateLimit("fixed:test", config);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(false);
    expect(result3.retryAfter).toBeGreaterThan(0);
    expect(result3.store).toBe("memory");
  });

  it("respects sliding window resets", async () => {
    const config = {
      windowMs: 60_000,
      maxRequests: 2,
      strategy: "sliding-window" as const,
      scope: ["ip"] as const,
      store: "memory" as const,
    };

    await checkRateLimit("sliding:test", config);
    vi.advanceTimersByTime(10_000);
    await checkRateLimit("sliding:test", config);
    const blocked = await checkRateLimit("sliding:test", config);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThanOrEqual(49);

    vi.advanceTimersByTime(61_000);
    const afterReset = await checkRateLimit("sliding:test", config);
    expect(afterReset.allowed).toBe(true);
  });

  it("throttles bursts with token bucket and refills over time", async () => {
    const config = {
      windowMs: 10_000,
      maxRequests: 2,
      strategy: "token-bucket" as const,
      scope: ["ip"] as const,
      store: "memory" as const,
      bucket: { capacity: 2, refillRatePerSecond: 1, tokensPerRequest: 1 },
    };

    const first = await checkRateLimit("bucket:test", config);
    const second = await checkRateLimit("bucket:test", config);
    const third = await checkRateLimit("bucket:test", config);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBeGreaterThanOrEqual(1);

    vi.advanceTimersByTime(1_200);
    const afterRefill = await checkRateLimit("bucket:test", config);
    expect(afterRefill.allowed).toBe(true);
  });
});

describe("rateLimit middleware integration", () => {
  it("adds rate limit headers for allowed responses", async () => {
    const handler = withRateLimit(
      async () => NextResponse.json({ ok: true }),
      "eligibility",
    );

    const request = new Request("https://example.com/api/promotions/eligibility", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "user-123",
      },
      body: JSON.stringify({
        sessionId: "sess-1",
        context: { page: "cart" },
      }),
    });

    const response = await handler(request as any);

    expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy();
    expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(response.headers.get("Retry-After")).toBeNull();
  });

  it("returns Retry-After when blocked and falls back on Redis failure", async () => {
    process.env.CACHE_REDIS_URL = "redis://example.com";
    __testUtils.resetRedisClient();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const limiter = createRateLimiter({
      name: "test-block",
      windowMs: 5_000,
      maxRequests: 1,
      strategy: "fixed-window",
      scope: ["ip"],
    });

    const request = new Request("https://example.com/api/test", { method: "GET" });

    const first = await limiter(request as any);
    const blocked = await limiter(request as any);

    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.response?.headers.get("Retry-After")).toBeTruthy();
    expect(blocked.response?.headers.get("X-RateLimit-Limit")).toBe("1");

    warnSpy.mockRestore();
  });
});
