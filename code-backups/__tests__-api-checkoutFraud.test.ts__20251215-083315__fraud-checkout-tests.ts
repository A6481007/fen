import { describe, it, expect, beforeEach, vi } from "vitest";

import type { FraudCheckResult } from "@/lib/promotions/fraudGateway";

const buildFraud = (decision: FraudCheckResult["decision"]): FraudCheckResult => ({
  decision,
  riskScore: decision === "allow" ? 0 : 75,
  thresholds: { allow: 30, challenge: 60 },
  checks: {
    rateLimit: { weight: 0, score: 0, passed: true, reason: "" },
    blocklist: { weight: 0, score: 0, passed: true, reason: "" },
    accountAge: { weight: 0, score: 0, passed: true, reason: "" },
    velocity: { weight: 0, score: 0, passed: true, reason: "" },
    geographic: { weight: 0, score: 0, passed: true, reason: "" },
    cartGaming: { weight: 0, score: 0, passed: true, reason: "" },
  },
  reasons: decision === "allow" ? [] : ["flagged"],
  recommendedAction: "",
  metadata: {
    userId: "user-1",
    sessionId: "sess-1",
    campaignId: "checkout",
    ipAddress: "127.0.0.1",
    country: "US",
    userAgent: "test",
    deviceFingerprint: "",
  },
  findings: [],
  challenge: decision === "challenge" ? { type: "captcha", reason: "verify" } : undefined,
});

const checkFraud = vi.fn(async () => buildFraud("allow"));

vi.mock("stripe", () => {
  class Stripe {
    checkout = {
      sessions: {
        create: vi.fn(async () => ({ id: "sess_stripe_123", url: "http://stripe.test" })),
      },
    };
    constructor(_key: string) {}
  }

  return { default: Stripe };
});

vi.mock("@/lib/promotions/fraudGateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/promotions/fraudGateway")>();

  const withFraudCheck = (
    handler: (req: Request, fraud: FraudCheckResult) => Promise<Response> | Response,
    options: { deriveInput: (req: Request) => Promise<any> | any },
  ) => {
    return async (req: Request): Promise<Response> => {
      const derived = await options.deriveInput(req);
      const fraud = await checkFraud({ ...derived, request: req } as any);

      if (fraud.decision === "deny") {
        return new Response(JSON.stringify({ error: "fraud_denied", fraud }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (fraud.decision === "challenge") {
        return new Response(JSON.stringify({ error: "fraud_challenge", fraud }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const res = await handler(req, fraud);
      return res instanceof Response ? res : new Response(res);
    };
  };

  return { ...actual, checkFraud, withFraudCheck };
});

vi.mock("@/lib/rateLimit", () => ({
  withRateLimit: (handler: any) => handler,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(async () => ({
        emailAddresses: [{ emailAddress: "clerk@example.com" }],
      })),
    },
  })),
}));

let checkoutStripePost: typeof import("@/app/api/checkout/stripe/route").POST;
let checkoutClerkPost: typeof import("@/app/api/checkout/clerk/route").POST;

describe("Checkout fraud middleware", () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SANITY_DATASET ??= "test";
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= "test";
    process.env.NEXT_PUBLIC_BASE_URL ??= "http://localhost";
    process.env.STRIPE_SECRET_KEY ??= "sk_test_123";
    process.env.CLERK_SECRET_KEY ??= "sk_test_clerk";

    ({ POST: checkoutStripePost } = await import("@/app/api/checkout/stripe/route"));
    ({ POST: checkoutClerkPost } = await import("@/app/api/checkout/clerk/route"));
  });

  beforeEach(() => {
    checkFraud.mockReset();
  });

  it("returns challenge response for Stripe checkout when fraud challenges", async () => {
    checkFraud.mockResolvedValueOnce(buildFraud("challenge"));

    const response = await checkoutStripePost(
      new Request("http://localhost/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": "sess-abc" },
        body: JSON.stringify({
          orderId: "order-1",
          orderNumber: "1001",
          items: [{ product: { _id: "p1", price: 10 }, quantity: 1 }],
          email: "test@example.com",
          orderAmount: 10,
        }),
      }) as any,
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("fraud_challenge");
    expect(body.fraud?.decision).toBe("challenge");
  });

  it("returns deny response for Stripe checkout when fraud denies", async () => {
    checkFraud.mockResolvedValueOnce(buildFraud("deny"));

    const response = await checkoutStripePost(
      new Request("http://localhost/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "order-2",
          orderNumber: "1002",
          items: [{ product: { _id: "p1", price: 20 }, quantity: 2 }],
          email: "deny@example.com",
          orderAmount: 40,
        }),
      }) as any,
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("fraud_denied");
  });

  it("passes Clerk checkout through on allow and derives user/session ids", async () => {
    checkFraud.mockResolvedValueOnce(buildFraud("allow"));

    const response = await checkoutClerkPost(
      new Request("http://localhost/api/checkout/clerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "order-3",
          orderNumber: "1003",
          items: [{ product: { _id: "p1", price: 15 }, quantity: 1 }],
          email: "allow@example.com",
          orderAmount: 15,
          clerkUserId: "clerk-user-1",
        }),
      }) as any,
    );

    expect(response.status).toBe(200);
    const fraudCall = checkFraud.mock.calls[0]?.[0] as { userId?: string; sessionId?: string };
    expect(fraudCall?.userId).toBe("clerk-user-1");
    expect(fraudCall?.sessionId).toBe("order-3");
  });
});
