import { describe, it, expect, beforeEach, vi } from "vitest";

import type { AnomalyFinding } from "@/lib/promotions/anomalyDetection";
import { checkFraud, withFraudCheck, DEFAULT_CONFIG, type FraudCheckResult } from "@/lib/promotions/fraudGateway";

type AggregateResult = {
  isAnomaly: boolean;
  findings: AnomalyFinding[];
  mostSevere: AnomalyFinding | null;
  shouldBlock: boolean;
  shouldPause: boolean;
  action: string;
};

const rateLimitState = {
  allow: true,
};

const blocklist = new Set<string>();
const users = new Map<
  string,
  { createdAt?: Date; ordersCount?: number; emailVerified?: boolean }
>();
const fraudLogs: Array<Record<string, unknown>> = [];
const anomalyQueue: AggregateResult[] = [];
const autopauseCalls: Array<{ campaignId: string; reason: string }> = [];

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === "blocklist") {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: blocklist.has(id),
              data: () => (blocklist.has(id) ? { id } : {}),
            }),
            set: async () => {
              blocklist.add(id);
            },
            delete: async () => {
              blocklist.delete(id);
            },
          }),
        };
      }

      if (name === "users") {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: true,
              data: () => users.get(id) ?? {},
            }),
            set: async (payload: Record<string, unknown>) => {
              users.set(id, payload);
            },
          }),
        };
      }

      if (name === "fraudLogs") {
        return {
          add: async (payload: Record<string, unknown>) => {
            fraudLogs.push(payload);
            return { id: `log-${fraudLogs.length}` };
          },
        };
      }

      return {
        doc: () => ({
          get: async () => ({ exists: false, data: () => ({}) }),
        }),
      };
    },
  },
  FieldValue: {
    serverTimestamp: () => new Date(),
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  RATE_LIMIT_CONFIGS: {
    redemption: { maxRequests: 10, windowMs: 60_000 },
  },
  getClientIP: (req: Request) => req.headers.get("x-real-ip") ?? "127.0.0.1",
  checkRateLimit: vi.fn(async () => {
    if (!rateLimitState.allow) {
      return { allowed: false, remaining: 0, retryAfter: 15 };
    }
    return { allowed: true, remaining: 9, retryAfter: 0 };
  }),
}));

vi.mock("@/lib/promotions/anomalyDetection", async () => {
  const actual = await vi.importActual<typeof import("@/lib/promotions/anomalyDetection")>(
    "@/lib/promotions/anomalyDetection",
  );

  return {
    ...actual,
    DEFAULT_CONFIG: {
      ...actual.DEFAULT_CONFIG,
      accountAge: { ...actual.DEFAULT_CONFIG.accountAge, newAccountHours: 24 },
    },
    evaluateAllChecks: vi.fn(async () => anomalyQueue.shift() ?? baseAggregate()),
    autoPausePromotion: vi.fn(async (campaignId: string, reason: string) => {
      autopauseCalls.push({ campaignId, reason });
    }),
  };
});

const baseAggregate = (): AggregateResult => ({
  isAnomaly: false,
  findings: [],
  mostSevere: null,
  shouldBlock: false,
  shouldPause: false,
  action: "allow",
});

const makeFinding = (overrides: Partial<AnomalyFinding>): AnomalyFinding => ({
  type: "velocity_campaign",
  severity: "medium",
  reason: "default",
  evidence: {},
  action: "flag_for_review",
  shouldBlock: false,
  shouldPause: false,
  ...overrides,
});

beforeEach(() => {
  rateLimitState.allow = true;
  blocklist.clear();
  fraudLogs.length = 0;
  anomalyQueue.length = 0;
  autopauseCalls.length = 0;
  users.clear();
});

describe("checkFraud", () => {
  it("allows clean traffic", async () => {
    users.set("clean-user", {
      createdAt: new Date(Date.now() - 72 * 60 * 60_000),
      ordersCount: 3,
      emailVerified: true,
    });

    const result = await checkFraud({
      userId: "clean-user",
      sessionId: "sess-clean",
      campaignId: "camp-clean",
      cartValue: 120,
      promoMinimum: 50,
      request: new Request("http://localhost/test", {
        headers: {
          "user-agent": "vitest",
          "x-real-ip": "1.1.1.1",
        },
      }) as any,
    });

    expect(result.decision).toBe("allow");
    expect(result.riskScore).toBe(0);
    expect(result.recommendedAction.toLowerCase()).toContain("process");
    expect(result.checks.blocklist.passed).toBe(true);
  });

  it("denies blocklisted user and logs evidence", async () => {
    blocklist.add("user:block-me");
    users.set("block-me", {
      createdAt: new Date(Date.now() - 48 * 60 * 60_000),
      emailVerified: true,
    });

    const result = await checkFraud({
      userId: "block-me",
      sessionId: "sess-block",
      campaignId: "camp-block",
      cartValue: 200,
      promoMinimum: 50,
      request: new Request("http://localhost/fraud", {
        headers: { "user-agent": "vitest" },
      }) as any,
    });

    expect(result.decision).toBe("deny");
    expect(result.riskScore).toBeGreaterThanOrEqual(DEFAULT_CONFIG.weights.blocklist);
    expect(result.reasons.join(" ").toLowerCase()).toContain("blocklist");
    expect(fraudLogs).toHaveLength(1);
    expect((fraudLogs[0] as { checks: FraudCheckResult["checks"] }).checks.blocklist.passed).toBe(
      false,
    );
  });

  it("challenges velocity anomaly on a new account", async () => {
    users.set("new-user", {
      createdAt: new Date(),
      emailVerified: false,
    });

    anomalyQueue.push({
      ...baseAggregate(),
      isAnomaly: true,
      findings: [
        makeFinding({
          type: "velocity_user",
          severity: "medium",
          reason: "High redemption velocity",
          action: "require_verification",
        }),
      ],
      mostSevere: makeFinding({
        type: "velocity_user",
        severity: "medium",
        reason: "High redemption velocity",
        action: "require_verification",
      }),
    });

    const result = await checkFraud({
      userId: "new-user",
      sessionId: "sess-velocity",
      campaignId: "camp-velocity",
      cartValue: 180,
      promoMinimum: 100,
      request: new Request("http://localhost/fraud", {
        headers: { "user-agent": "vitest", "x-real-ip": "10.0.0.2" },
      }) as any,
    });

    expect(result.decision).toBe("challenge");
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
    expect(result.challenge?.type).toBe("email_verification");
    expect(result.recommendedAction.toLowerCase()).toContain("verification");
  });

  it("denies when cumulative score exceeds threshold", async () => {
    rateLimitState.allow = false;
    users.set("scored-user", {
      createdAt: new Date(Date.now() - 2 * 60 * 60_000),
      emailVerified: true,
    });

    anomalyQueue.push({
      ...baseAggregate(),
      isAnomaly: true,
      findings: [
        makeFinding({
          type: "geographic_jump",
          severity: "high",
          reason: "Multiple country switches",
          action: "block_transaction",
          shouldBlock: true,
        }),
        makeFinding({
          type: "cart_gaming",
          severity: "medium",
          reason: "Cart gaming detected",
          action: "flag_for_review",
        }),
      ],
      mostSevere: makeFinding({
        type: "geographic_jump",
        severity: "high",
        reason: "Multiple country switches",
        action: "block_transaction",
        shouldBlock: true,
      }),
      shouldBlock: true,
    });

    const result = await checkFraud({
      userId: "scored-user",
      sessionId: "sess-score",
      campaignId: "camp-score",
      cartValue: 90,
      promoMinimum: 50,
      request: new Request("http://localhost/fraud", {
        headers: { "user-agent": "vitest" },
      }) as any,
    });

    expect(result.decision).toBe("deny");
    expect(result.riskScore).toBeGreaterThanOrEqual(60);
    expect(result.recommendedAction.toLowerCase()).toContain("block");
    expect(autopauseCalls.length).toBeGreaterThanOrEqual(0);
  });
});

describe("withFraudCheck middleware", () => {
  it("returns challenge response without executing handler", async () => {
    rateLimitState.allow = false;
    anomalyQueue.push({
      ...baseAggregate(),
      isAnomaly: true,
      findings: [
        makeFinding({
          type: "cart_gaming",
          severity: "medium",
          reason: "Cart gaming near threshold",
          action: "require_verification",
        }),
      ],
      mostSevere: makeFinding({
        type: "cart_gaming",
        severity: "medium",
        reason: "Cart gaming near threshold",
        action: "require_verification",
      }),
    });

    users.set("middleware-user", {
      createdAt: new Date(),
      emailVerified: true,
    });

    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withFraudCheck(handler, {
      deriveInput: () => ({
        userId: "middleware-user",
        sessionId: "sess-mw",
        campaignId: "camp-mw",
        cartValue: 120,
        promoMinimum: 80,
      }),
    });

    const response = await wrapped(
      new Request("http://localhost/api", { headers: { "user-agent": "vitest" } }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("fraud_challenge");
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes through on allow and sets headers", async () => {
    users.set("middleware-allow", {
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60_000),
      emailVerified: true,
    });

    const wrapped = withFraudCheck(
      async () => new Response("ok", { status: 200 }),
      {
        deriveInput: () => ({
          userId: "middleware-allow",
          sessionId: "sess-allow",
          campaignId: "camp-allow",
          cartValue: 50,
          promoMinimum: 10,
        }),
      },
    );

    const response = await wrapped(
      new Request("http://localhost/api", { headers: { "user-agent": "vitest" } }) as any,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Fraud-Score")).toBeDefined();
    expect(response.headers.get("X-Fraud-Decision")).toBe("allow");
  });
});
