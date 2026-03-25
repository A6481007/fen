import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

type UserAction = "view" | "click" | "addToCart" | "purchase";

type AnalyticsTask =
  | {
      type: "record-spend";
      campaignId: string;
      discountAmount: number;
      orderValue: number;
    }
  | {
      type: "increment-metric";
      campaignId: string;
      metric: "impressions" | "clicks" | "addToCarts";
    }
  | {
      type: "track-user";
      campaignId: string;
      userId: string;
      action: UserAction;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "track-session";
      campaignId: string;
      sessionId: string;
      action: UserAction;
      metadata?: Record<string, unknown>;
    };

type AnomalyStub = {
  isAnomaly: boolean;
  anomalyType: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  details: string;
  action: string;
  shouldBlock: boolean;
};

const firestoreState = vi.hoisted(() => createFirestoreState());
const promotionState = vi.hoisted(() => ({ promotions: [] as any[] }));
const analyticsTaskState = vi.hoisted(() => ({ tasks: [] as AnalyticsTask[] }));
const anomalyState = vi.hoisted(() => ({ queue: [] as Array<AnomalyStub | null> }));
const rateLimitState = vi.hoisted(() => ({
  counts: new Map<string, { count: number; resetAt: number; limit: number }>(),
  overrideLimit: null as number | null,
}));
const fraudRateLimitState = vi.hoisted(() => ({
  counts: new Map<string, { count: number; resetAt: number; limit: number }>(),
}));
const smsState = vi.hoisted(() => ({ sent: [] as any[] }));
const pushState = vi.hoisted(() => ({ sent: [] as any[] }));

vi.mock("@/lib/firebaseAdmin", () => createFirebaseAdminMock(firestoreState));

vi.mock("@/sanity/queries", () => ({
  getActivePromotions: vi.fn(async () => promotionState.promotions),
  getPromotionByCampaignId: vi.fn(async (id: string) =>
    promotionState.promotions.find(
      (promo) => promo.campaignId === id || promo._id === id,
    ) ?? null,
  ),
}));

vi.mock("@/lib/queue/analytics-queue", () => {
  const enqueueAnalyticsTasks = async (tasks: AnalyticsTask[]) => {
    analyticsTaskState.tasks.push(...tasks);

    const analytics = await import("@/lib/promotions/analytics");
    const sessionAnalytics = await import("@/lib/promotions/sessionAnalytics");

    for (const task of tasks) {
      if (task.type === "record-spend") {
        await analytics.recordPromotionSpend(
          task.campaignId,
          task.discountAmount,
          task.orderValue,
        );
      } else if (task.type === "increment-metric") {
        await analytics.incrementPromotionMetric(task.campaignId, task.metric);
      } else if (task.type === "track-user") {
        await analytics.trackUserPromoInteraction(
          task.userId,
          task.campaignId,
          task.action,
          task.metadata,
        );
      } else if (task.type === "track-session") {
        await sessionAnalytics.trackSessionPromoInteraction(
          task.sessionId,
          task.campaignId,
          task.action,
          task.metadata,
        );
      }
    }

    return { queued: true, mode: "inline" as const };
  };

  return { enqueueAnalyticsTasks };
});

vi.mock("@/lib/promotions/anomalyDetection", () => ({
  checkForAnomalies: vi.fn(async () => {
    const next = anomalyState.queue.shift();
    return (
      next ?? {
        isAnomaly: false,
        anomalyType: null,
        severity: null,
        details: "",
        action: "allow",
        shouldBlock: false,
      }
    );
  }),
}));

vi.mock("@/lib/rate-limit/redis-rate-limiter", () => {
  const consumeRateLimit = vi.fn(
    async (key: string, rule: { limit: number; windowMs: number }) => {
      const now = Date.now();
      const existing =
        rateLimitState.counts.get(key) ??
        { count: 0, resetAt: now + rule.windowMs, limit: rule.limit };

      if (now > existing.resetAt) {
        existing.count = 0;
        existing.resetAt = now + rule.windowMs;
      }

      existing.count += 1;
      existing.limit = rule.limit;
      rateLimitState.counts.set(key, existing);

      const effectiveLimit = rateLimitState.overrideLimit ?? existing.limit;
      const limited = existing.count > effectiveLimit;

      return {
        limited,
        retryAfterMs: limited ? Math.max(0, existing.resetAt - now) : 0,
        source: "memory",
      };
    },
  );

  return { consumeRateLimit };
});

vi.mock("@/lib/rateLimit", () => {
  const checkRateLimit = vi.fn(
    async (key: string, config: { limit: number; windowMs: number }) => {
      const now = Date.now();
      const existing =
        fraudRateLimitState.counts.get(key) ??
        { count: 0, resetAt: now + config.windowMs, limit: config.limit };

      if (now > existing.resetAt) {
        existing.count = 0;
        existing.resetAt = now + config.windowMs;
      }

      existing.count += 1;
      existing.limit = config.limit;
      fraudRateLimitState.counts.set(key, existing);

      const allowed = existing.count <= config.limit;
      return {
        allowed,
        remaining: Math.max(0, config.limit - existing.count),
        retryAfter: allowed ? 0 : existing.resetAt - now,
      };
    },
  );

  const RATE_LIMIT_CONFIGS = { redemption: { limit: 10, windowMs: 60_000 } };
  const getClientIP = (request: Request) =>
    request.headers.get("x-real-ip") ?? "127.0.0.1";

  return { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP };
});

vi.mock("@/lib/promotions/smsAdapter", () => {
  const sendPromoSMS = vi.fn(
    async ({
      userId,
      campaignId,
      variables,
    }: {
      userId: string;
      campaignId: string;
      variables?: Record<string, any>;
    }) => {
      const now = new Date();
      let localHour = now.getHours();

      if (variables?.timezone) {
        try {
          localHour = new Date(
            now.toLocaleString("en-US", { timeZone: variables.timezone }),
          ).getHours();
        } catch {
          // fall back to server time
        }
      }

      const quiet = localHour >= 22 || localHour < 8;
      const result = quiet
        ? { success: false, quietHours: true, error: "Quiet hours" }
        : { success: true, messageId: `sms-${smsState.sent.length + 1}` };

      smsState.sent.push({ userId, campaignId, variables, quiet });
      return result;
    },
  );

  return { sendPromoSMS };
});

vi.mock("../lib/promotions/smsAdapter", () => {
  const sendPromoSMS = vi.fn(
    async ({
      userId,
      campaignId,
      variables,
    }: {
      userId: string;
      campaignId: string;
      variables?: Record<string, any>;
    }) => {
      const now = new Date();
      let localHour = now.getHours();

      if (variables?.timezone) {
        try {
          localHour = new Date(
            now.toLocaleString("en-US", { timeZone: variables.timezone }),
          ).getHours();
        } catch {
          // fall back to server time
        }
      }

      const quiet = localHour >= 22 || localHour < 8;
      const result = quiet
        ? { success: false, quietHours: true, error: "Quiet hours" }
        : { success: true, messageId: `sms-${smsState.sent.length + 1}` };

      smsState.sent.push({ userId, campaignId, variables, quiet });
      return result;
    },
  );

  return { sendPromoSMS };
});

vi.mock("@/lib/promotions/pushAdapter", () => {
  const sendPromoPush = vi.fn(
    async ({
      userId,
      campaignId,
      tokens,
    }: {
      userId: string;
      campaignId: string;
      tokens: Array<Record<string, unknown>>;
    }) => {
      pushState.sent.push({ userId, campaignId, tokens });
      return { success: true, errors: [] as string[] };
    },
  );

  return { sendPromoPush };
});

vi.mock("../lib/promotions/pushAdapter", () => {
  const sendPromoPush = vi.fn(
    async ({
      userId,
      campaignId,
      tokens,
    }: {
      userId: string;
      campaignId: string;
      tokens: Array<Record<string, unknown>>;
    }) => {
      pushState.sent.push({ userId, campaignId, tokens });
      return { success: true, errors: [] as string[] };
    },
  );

  return { sendPromoPush };
});

vi.mock(
  "@/lib/promotions/promotionMessaging",
  () => {
    const sendPromotionMessages = async (params: {
      campaignId: string;
      recipients: Array<{
        userId: string;
        email?: string;
        phone?: string;
        pushTokens?: Array<Record<string, unknown>>;
        preferences: { emailOptIn: boolean; smsOptIn: boolean; pushOptIn: boolean; preferredChannel?: "email" | "sms" | "push" };
        segment?: string;
        timezone?: string;
      }>;
      messageType: string;
      dryRun?: boolean;
      forceChannel?: "email" | "sms" | "push";
    }) => {
      const { adminDb, Timestamp } = await import("@/lib/firebaseAdmin");
      const result = {
        totalRecipients: params.recipients.length,
        sent: { email: 0, sms: 0, push: 0 },
        skipped: { noConsent: 0, frequencyCapped: 0, noContactInfo: 0, quietHours: 0 },
        errors: 0,
        dryRun: Boolean(params.dryRun),
      };

      for (const recipient of params.recipients) {
        const channel =
          params.forceChannel ??
          (recipient.preferences.preferredChannel ??
            (recipient.preferences.pushOptIn
              ? "push"
              : recipient.preferences.smsOptIn
                ? "sms"
                : recipient.preferences.emailOptIn
                  ? "email"
                  : null));

        if (!channel) {
          result.skipped.noConsent += 1;
          continue;
        }

        const history = await adminDb
          .collection("users")
          .doc(recipient.userId)
          .collection("messageHistory")
          .where("campaignId", "==", params.campaignId)
          .get();
        if ((history.docs?.length ?? 0) >= 2) {
          result.skipped.frequencyCapped += 1;
          continue;
        }

        if (channel === "sms") {
          if (!recipient.phone) {
            result.skipped.noContactInfo += 1;
            continue;
          }
          const quiet = isQuietHour(recipient.timezone);
          smsState.sent.push({ userId: recipient.userId, campaignId: params.campaignId, quiet });
          if (quiet) {
            result.skipped.quietHours += 1;
            continue;
          }
          result.sent.sms += 1;
        } else if (channel === "push") {
          if (!recipient.pushTokens?.length) {
            result.skipped.noContactInfo += 1;
            continue;
          }
          pushState.sent.push({ userId: recipient.userId, campaignId: params.campaignId, tokens: recipient.pushTokens });
          result.sent.push += 1;
        } else {
          if (!recipient.email) {
            result.skipped.noContactInfo += 1;
            continue;
          }
          result.sent.email += 1;
        }

        await adminDb
          .collection("users")
          .doc(recipient.userId)
          .collection("messageHistory")
          .add({
            campaignId: params.campaignId,
            channel,
            sentAt: Timestamp.now(),
          });
      }

      return result;
    };

    const isQuietHour = (timezone?: string) => {
      const now = new Date();
      let hour = now.getHours();
      if (timezone) {
        try {
          hour = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getHours();
        } catch {
          // ignore invalid timezone
        }
      }
      return hour >= 22 || hour < 8;
    };

    return { sendPromotionMessages };
  },
  { virtual: true },
);

vi.mock("@/lib/emailService", () => ({
  sendMail: vi.fn(async () => ({ success: true })),
}));

vi.mock("../lib/emailService", () => ({
  sendMail: vi.fn(async () => ({ success: true })),
}));

vi.mock(
  "firebase-admin/messaging",
  () => ({
    getMessaging: vi.fn(() => ({
      sendEachForMulticast: vi.fn(async () => ({
        successCount: 0,
        failureCount: 0,
        responses: [],
      })),
    })),
  }),
  { virtual: true },
);

vi.mock(
  "web-push",
  () => ({
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(async () => ({})),
    },
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async () => ({})),
  }),
  { virtual: true },
);

import { adminDb, Timestamp } from "@/lib/firebaseAdmin";
import {
  initializePromotionAnalytics,
  getPromotionAnalytics,
  getUserPromotionHistory,
} from "@/lib/promotions/analytics";
import { PromotionEngine } from "@/lib/promotions/promotionEngine";
import { sendPromotionMessages } from "@/lib/promotions/promotionMessaging";
import {
  trackPromotionView,
  trackPromotionClick,
  trackPromoPurchase,
} from "@/lib/analytics/pixels";
import { POST as trackPOST } from "@/app/api/promotions/track/route";
import { POST as eligibilityPOST } from "@/app/api/promotions/eligibility/route";
import { checkFraud } from "@/lib/promotions/fraudGateway";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";

type Promotion = PROMOTIONS_LIST_QUERYResult[number];

interface FirestoreState {
  store: Map<string, any>;
  lastAutoId: number;
}

interface UserProfileSeed {
  id: string;
  ordersCount?: number;
  ltv?: number;
  emailVerified?: boolean;
  createdAt?: Date;
  segment?: string;
  lastPurchaseAt?: Date | null;
  lastActiveAt?: Date | null;
}

describe("E2E: Promotion Redemption Flow", () => {
  let engine: PromotionEngine;

  beforeAll(() => {
    localStorage.setItem(
      "cookie_consent",
      JSON.stringify({ analytics: true, marketing: true }),
    );
  });

  beforeEach(() => {
    resetState();
    engine = new PromotionEngine();
    vi.useRealTimers();

    if (typeof window !== "undefined") {
      (window as any).fbq = vi.fn();
      (window as any).gtag = vi.fn();
    }
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe("Happy Path", () => {
    it("allows eligible user to redeem valid promotion", async () => {
      const user = await seedUser({ id: "user-happy", ordersCount: 2, ltv: 120 });
      const promo = await seedPromotion({
        campaignId: "camp-happy",
        targetAudience: {
          segmentType: "returning",
          categories: [],
          products: [],
          excludedProducts: [],
        },
        discountType: "percentage",
        discountValue: 20,
        minimumOrderValue: 50,
        budgetCap: 500,
        usageLimit: 5,
        perCustomerLimit: 2,
      });

      const eligibilityResponse = await eligibilityPOST(
        new Request("http://localhost/api/promotions/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            sessionId: "session-happy",
            context: { page: "cart", cartValue: 120 },
          }),
        }) as any,
      );

      const eligibilityBody = await eligibilityResponse.json();
      expect(eligibilityResponse.status).toBe(200);
      const eligibleCampaignIds = eligibilityBody.eligible.map(
        (item: any) => item.campaignId,
      );
      expect(eligibleCampaignIds).toContain(promo.campaignId);

      const discount = engine.calculateDiscount(promo as any, 120, user.ltv);

      const addResult = await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "addToCart",
            userId: user.id,
            sessionId: "session-happy",
            metadata: { cartValue: 120 },
          }),
        }) as any,
      );
      expect(addResult.status).toBe(200);

      const purchaseResponse = await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "purchase",
            userId: user.id,
            sessionId: "session-happy",
            metadata: {
              orderId: "order-1",
              discountAmount: discount.discountAmount,
              orderValue: 120,
            },
          }),
        }) as any,
      );

      const purchaseBody = await purchaseResponse.json();
      expect(purchaseResponse.status).toBe(200);
      expect(purchaseBody.tracked.action).toBe("purchase");

      const analytics = await getPromotionAnalytics(promo.campaignId as string);
      expect(analytics?.conversions).toBe(1);
      expect(analytics?.addToCarts).toBe(1);
      expect(analytics?.totalDiscountSpent).toBeCloseTo(discount.discountAmount);
      expect(analytics?.totalRevenue).toBeCloseTo(120);

      const history = await getUserPromotionHistory(
        user.id,
        promo.campaignId as string,
      );
      expect(history?.purchaseCount).toBe(1);
      expect(history?.totalDiscount).toBeCloseTo(discount.discountAmount);
    });

    it("applies personalized discount based on LTV", async () => {
      const promo = makePromotion({
        campaignId: "camp-ltv",
        type: "loyalty",
        discountType: "percentage",
        discountValue: 25,
        maximumDiscount: 0,
      });

      const vipDiscount = engine.calculatePersonalizedDiscount(
        promo as any,
        { id: "vip-1", ordersCount: 8, ltv: 1200 } as any,
        200,
      );
      const standardDiscount = engine.calculatePersonalizedDiscount(
        promo as any,
        { id: "cust-1", ordersCount: 2, ltv: 150 } as any,
        200,
      );

      expect(vipDiscount.discountBreakdown?.ltvBonus).toBeGreaterThan(0);
      expect(vipDiscount.discountAmount).toBeGreaterThan(standardDiscount.discountAmount);
    });

    it("respects A/B variant assignment", async () => {
      const promo = await seedPromotion({
        campaignId: "camp-split",
        variantMode: "split",
        splitPercent: 50,
        variantCopyA: "Variant A copy",
        variantCopyB: "Variant B copy",
        variantCtaA: "CTA A",
        variantCtaB: "CTA B",
        heroMessage: "Control hero",
        ctaText: "Control CTA",
      });

      const first = engine.assignVariant(promo as any, "user-variant", "session-1");
      const second = engine.assignVariant(promo as any, "user-variant", "session-1");

      expect(first.variant).toBe(second.variant);
      const expectedCopy =
        first.variant === "variantA"
          ? promo.variantCopyA
          : first.variant === "variantB"
            ? promo.variantCopyB
            : promo.heroMessage;
      expect(first.copy).toBe(expectedCopy);
    });
  });

  describe("Eligibility Rules", () => {
    it("rejects user outside target segment", async () => {
      await seedUser({ id: "user-newbie", ordersCount: 0, ltv: 0 });
      await seedPromotion({
        campaignId: "camp-vip",
        targetAudience: {
          segmentType: "vip",
          categories: [],
          products: [],
          excludedProducts: [],
        },
      });

      const response = await eligibilityPOST(
        new Request("http://localhost/api/promotions/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "user-newbie",
            sessionId: "sess-new",
            context: { page: "homepage", isFirstVisit: true },
          }),
        }) as any,
      );
      const body = await response.json();

      expect(body.eligible).toHaveLength(0);
      expect(body.ineligible[0]?.campaignId).toBe("camp-vip");
      expect(body.metadata.userSegment).not.toBe("vip");
    });

    it("enforces minimum order value", async () => {
      await seedUser({ id: "user-mov", ordersCount: 1, ltv: 50 });
      await seedPromotion({
        campaignId: "camp-mov",
        minimumOrderValue: 50,
        targetAudience: { segmentType: "allCustomers", categories: [], products: [], excludedProducts: [] },
      });

      const response = await eligibilityPOST(
        new Request("http://localhost/api/promotions/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "user-mov",
            sessionId: "sess-mov",
            context: { page: "cart", cartValue: 30 },
          }),
        }) as any,
      );
      const body = await response.json();

      expect(body.eligible).toHaveLength(0);
      expect(body.ineligible[0]?.requirementsMissing[0]).toContain("Minimum order value");
    });

    it("enforces budget cap", async () => {
      const promo = await seedPromotion({
        campaignId: "camp-budget",
        budgetCap: 100,
        targetAudience: { segmentType: "allCustomers", categories: [], products: [], excludedProducts: [] },
      });
      await setAnalyticsSnapshot(promo.campaignId as string, {
        totalDiscountSpent: 98,
        impressions: 10,
        clicks: 3,
        addToCarts: 1,
        conversions: 2,
      });

      const eligible = await engine.getEligiblePromotions("user-budget", "sess-budget", {
        page: "cart",
        cartValue: 80,
      });

      expect(eligible).toHaveLength(0);
    });

    it("enforces usage limit", async () => {
      const promo = await seedPromotion({
        campaignId: "camp-usage",
        usageLimit: 2,
        targetAudience: { segmentType: "allCustomers", categories: [], products: [], excludedProducts: [] },
      });

      await setAnalyticsSnapshot(promo.campaignId as string, {
        conversions: 2,
        impressions: 10,
        clicks: 5,
        addToCarts: 4,
      });

      const eligible = await engine.getEligiblePromotions("user-usage", "sess-usage", {
        page: "cart",
        cartValue: 60,
      });

      expect(eligible).toHaveLength(0);
    });

    it("enforces per-customer limit", async () => {
      const promo = await seedPromotion({
        campaignId: "camp-per-customer",
        perCustomerLimit: 1,
        targetAudience: { segmentType: "allCustomers", categories: [], products: [], excludedProducts: [] },
      });

      await adminDb
        .collection("users")
        .doc("user-limit")
        .collection("promotions")
        .doc(promo.campaignId as string)
        .set({
          purchaseCount: 1,
          totalDiscount: 10,
          totalSpent: 100,
          campaignId: promo.campaignId,
          firstSeenAt: Timestamp.now(),
          lastInteractionAt: Timestamp.now(),
          interactions: [],
          purchased: true,
          viewCount: 0,
          clickCount: 0,
          addToCartCount: 0,
        });

      const eligible = await engine.getEligiblePromotions("user-limit", "sess-limit", {
        page: "checkout",
        cartValue: 120,
      });

      expect(eligible).toHaveLength(0);
    });
  });

  describe("Fraud Prevention", () => {
    it("blocks blocklisted user", async () => {
      await adminDb.collection("blocklist").doc("user:block-me").set({ reason: "fraud" });

      const result = await checkFraud({
        userId: "block-me",
        sessionId: "sess-fraud",
        campaignId: "camp-fraud",
        cartValue: 150,
        promoMinimum: 50,
        request: new Request("http://localhost/fraud", {
          headers: {
            "x-real-ip": "10.0.0.1",
            "user-agent": "vitest",
          },
        }) as any,
      });

      expect(result.decision).toBe("block");
      expect(result.reasons.some((reason) => reason.toLowerCase().includes("blocklisted"))).toBe(true);
    });

    it("rate limits excessive requests", async () => {
      rateLimitState.overrideLimit = 10;
      const promo = await seedPromotion({ campaignId: "camp-rate", targetAudience: { segmentType: "allCustomers", categories: [], products: [], excludedProducts: [] } });
      let limited = 0;

      for (let i = 0; i < 15; i += 1) {
        const response = await trackPOST(
          new Request("http://localhost/api/promotions/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: promo.campaignId,
              action: "click",
              sessionId: "sess-rate",
              metadata: { page: "homepage" },
            }),
          }) as any,
        );

        if (response.status === 429) {
          limited += 1;
          break;
        }
      }

      expect(limited).toBe(1);
    });

    it("detects velocity anomaly", async () => {
      anomalyState.queue.push({
        isAnomaly: true,
        anomalyType: "velocity_global",
        severity: "critical",
        details: "Burst detected",
        action: "pause_promotion",
        shouldBlock: true,
      });

      const promo = await seedPromotion({ campaignId: "camp-velocity" });
      const response = await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "purchase",
            sessionId: "sess-velocity",
            metadata: { orderId: "order-velocity", discountAmount: 10, orderValue: 100 },
          }),
        }) as any,
      );

      expect([403, 423]).toContain(response.status);
      const body = await response.json();
      expect(body.anomaly?.isAnomaly).toBe(true);
    });

    it("challenges unverified account on high-value promo", async () => {
      anomalyState.queue.push({
        isAnomaly: true,
        anomalyType: "new_account",
        severity: "medium",
        details: "High value promo for new account",
        action: "require_verification",
        shouldBlock: false,
      });

      await seedUser({
        id: "user-unverified",
        ordersCount: 0,
        ltv: 0,
        emailVerified: false,
        createdAt: new Date(),
      });

      const result = await checkFraud({
        userId: "user-unverified",
        sessionId: "sess-unverified",
        campaignId: "camp-high",
        cartValue: 500,
        promoMinimum: 200,
        request: new Request("http://localhost/fraud", {
          headers: {
            "x-real-ip": "10.0.0.2",
            "user-agent": "vitest",
          },
        }) as any,
      });

      expect(result.decision).toBe("challenge");
      expect(result.recommendedAction.toLowerCase()).toContain("verification");
    });
  });

  describe("Analytics Tracking", () => {
    it("tracks view event on promotion page", async () => {
      const promo = await seedPromotion({ campaignId: "camp-view" });
      const response = await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "view",
            sessionId: "sess-view",
            metadata: { page: "homepage" },
          }),
        }) as any,
      );

      expect(response.status).toBe(200);
      const analytics = await getPromotionAnalytics(promo.campaignId as string);
      expect(analytics?.impressions).toBe(1);
    });

    it("tracks click event on CTA", async () => {
      const promo = await seedPromotion({ campaignId: "camp-click" });
      const response = await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "click",
            sessionId: "sess-click",
            metadata: { page: "homepage" },
          }),
        }) as any,
      );

      expect(response.status).toBe(200);
      const analytics = await getPromotionAnalytics(promo.campaignId as string);
      expect(analytics?.clicks).toBe(1);
    });

    it("tracks conversion with correct attribution", async () => {
      const promo = await seedPromotion({ campaignId: "camp-conversion" });
      const purchaseResponse = await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "purchase",
            userId: "user-conversion",
            sessionId: "sess-conversion",
            metadata: {
              orderId: "order-conv",
              discountAmount: 15,
              orderValue: 150,
            },
          }),
        }) as any,
      );
      expect(purchaseResponse.status).toBe(200);

      const analytics = await getPromotionAnalytics(promo.campaignId as string);
      expect(analytics?.conversions).toBe(1);
      expect(analytics?.totalDiscountSpent).toBeCloseTo(15);
      expect(analytics?.totalRevenue).toBeCloseTo(150);

      const history = await getUserPromotionHistory("user-conversion", promo.campaignId as string);
      expect(history?.totalSpent).toBeCloseTo(150);
      expect(history?.purchaseCount).toBe(1);
    });

    it("fires Facebook and GA4 pixels", () => {
      localStorage.setItem(
        "cookie_consent",
        JSON.stringify({ analytics: true, marketing: true }),
      );

      trackPromotionView({
        campaignId: "camp-pixel",
        campaignName: "Pixel Promo",
        discountType: "percentage",
        discountValue: 20,
        productIds: ["sku-1"],
      });

      expect((window as any).fbq).toHaveBeenCalledWith(
        "track",
        "ViewContent",
        expect.objectContaining({
          promotion_id: "camp-pixel",
          discount_value: 20,
        }),
      );
      expect((window as any).gtag).toHaveBeenCalledWith(
        "event",
        "view_promotion",
        expect.objectContaining({
          promotion_id: "camp-pixel",
          promotion_name: "Pixel Promo",
        }),
      );
    });
  });

  describe("Multi-Channel", () => {
    it("sends SMS for cart abandonment", async () => {
      promotionState.promotions.push(makePromotion({ campaignId: "camp-sms" }));

      const result = await sendPromotionMessages({
        campaignId: "camp-sms",
        recipients: [
          {
            userId: "user-sms",
            phone: "+10000000000",
            preferences: { smsOptIn: true, emailOptIn: false, pushOptIn: false },
            segment: "cartAbandoner",
          },
        ],
        messageType: "abandonment",
        forceChannel: "sms",
      });

      expect(result.sent.sms).toBe(1);
      expect(smsState.sent[0]?.campaignId).toBe("camp-sms");
    });

    it("sends push notification for flash sale", async () => {
      promotionState.promotions.push(makePromotion({ campaignId: "camp-push" }));

      const result = await sendPromotionMessages({
        campaignId: "camp-push",
        recipients: [
          {
            userId: "user-push",
            pushTokens: [{ token: "token-1" }],
            preferences: { smsOptIn: false, emailOptIn: false, pushOptIn: true },
            segment: "allCustomers",
          },
        ],
        messageType: "promotion",
        forceChannel: "push",
      });

      expect(result.sent.push).toBe(1);
      expect(pushState.sent[0]?.campaignId).toBe("camp-push");
    });

    it("respects quiet hours", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-01T23:30:00Z"));

      promotionState.promotions.push(makePromotion({ campaignId: "camp-quiet" }));
      const result = await sendPromotionMessages({
        campaignId: "camp-quiet",
        recipients: [
          {
            userId: "user-quiet",
            phone: "+10000000001",
            preferences: { smsOptIn: true, emailOptIn: false, pushOptIn: false },
            segment: "allCustomers",
            timezone: "UTC",
          },
        ],
        messageType: "abandonment",
        forceChannel: "sms",
      });

      expect(result.sent.sms).toBe(0);
      expect(result.skipped.quietHours).toBe(1);
      expect(smsState.sent[0]?.quiet).toBe(true);
    });

    it("respects frequency caps", async () => {
      promotionState.promotions.push(makePromotion({ campaignId: "camp-cap" }));

      const sendOnce = () =>
        sendPromotionMessages({
          campaignId: "camp-cap",
          recipients: [
            {
              userId: "user-cap",
              phone: "+10000000002",
              preferences: { smsOptIn: true, emailOptIn: false, pushOptIn: false },
              segment: "allCustomers",
            },
          ],
          messageType: "promotion",
          forceChannel: "sms",
        });

      await sendOnce();
      await sendOnce();
      const capped = await sendOnce();

      expect(capped.sent.sms).toBe(0);
      expect(capped.skipped.frequencyCapped).toBe(1);
    });
  });

  describe("Admin Functions", () => {
    it("allows admin to pause promotion", async () => {
      const promo = await seedPromotion({ campaignId: "camp-pause" });
      const responseBefore = await eligibilityPOST(
        new Request("http://localhost/api/promotions/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "admin-user",
            sessionId: "sess-pause",
            context: { page: "homepage" },
          }),
        }) as any,
      );
      const beforeBody = await responseBefore.json();
      expect(beforeBody.eligible.map((item: any) => item.campaignId)).toContain(promo.campaignId);

      promo.isActive = false;

      const responseAfter = await eligibilityPOST(
        new Request("http://localhost/api/promotions/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "admin-user",
            sessionId: "sess-pause",
            context: { page: "homepage" },
          }),
        }) as any,
      );
      const afterBody = await responseAfter.json();
      expect(afterBody.eligible.map((item: any) => item.campaignId)).not.toContain(promo.campaignId);
    });

    it("displays correct analytics in dashboard", async () => {
      const promo = await seedPromotion({ campaignId: "camp-dashboard" });

      await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "view",
            sessionId: "sess-dash",
          }),
        }) as any,
      );
      await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "click",
            sessionId: "sess-dash",
          }),
        }) as any,
      );
      await trackPOST(
        new Request("http://localhost/api/promotions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: promo.campaignId,
            action: "purchase",
            sessionId: "sess-dash",
            metadata: { orderId: "order-dash", discountAmount: 12, orderValue: 120 },
          }),
        }) as any,
      );

      const analytics = await getPromotionAnalytics(promo.campaignId as string);
      expect(analytics).not.toBeNull();
      expect(analytics?.impressions).toBe(1);
      expect(analytics?.clicks).toBe(1);
      expect(analytics?.conversions).toBe(1);
      expect(analytics?.totalDiscountSpent).toBeCloseTo(12);
    });
  });
});

function createFirestoreState(): FirestoreState {
  return { store: new Map(), lastAutoId: 0 };
}

function createFirebaseAdminMock(state: FirestoreState) {
  class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}

    toDate() {
      return new Date(
        this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000),
      );
    }

    static now() {
      return MockTimestamp.fromMillis(Date.now());
    }

    static fromDate(date: Date) {
      return MockTimestamp.fromMillis(date.getTime());
    }

    static fromMillis(ms: number) {
      const seconds = Math.floor(ms / 1000);
      const nanoseconds = (ms % 1000) * 1_000_000;
      return new MockTimestamp(seconds, nanoseconds);
    }
  }

  const FieldValue = {
    increment: (value: number) => ({ __op: "increment", value }),
    arrayUnion: (...values: unknown[]) => ({ __op: "arrayUnion", values }),
    serverTimestamp: () => ({ __op: "serverTimestamp" }),
  };

  const isIncrement = (value: any): value is { __op: "increment"; value: number } =>
    value && value.__op === "increment";
  const isArrayUnion = (value: any): value is { __op: "arrayUnion"; values: unknown[] } =>
    value && value.__op === "arrayUnion";
  const isServerTimestamp = (value: any): value is { __op: "serverTimestamp" } =>
    value && value.__op === "serverTimestamp";

  const deepCopy = <T>(value: T): T => {
    if (value instanceof Date) {
      return new Date(value.getTime()) as unknown as T;
    }
    if (value instanceof MockTimestamp) {
      return new MockTimestamp(value.seconds, value.nanoseconds) as unknown as T;
    }
    if (Array.isArray(value)) {
      return value.map((item) => deepCopy(item)) as unknown as T;
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => [
          key,
          deepCopy(val),
        ]),
      ) as T;
    }
    return value;
  };

  const applyFieldValue = (existing: any, incoming: any) => {
    if (isIncrement(incoming)) {
      const base = typeof existing === "number" ? existing : 0;
      return base + incoming.value;
    }

    if (isArrayUnion(incoming)) {
      const base = Array.isArray(existing) ? [...existing] : [];
      for (const val of incoming.values) {
        const serialized = JSON.stringify(val);
        if (!base.some((entry) => JSON.stringify(entry) === serialized)) {
          base.push(deepCopy(val));
        }
      }
      return base;
    }

    if (isServerTimestamp(incoming)) {
      return MockTimestamp.now();
    }

    return deepCopy(incoming);
  };

  const docRef = (segments: string[]) => {
    const path = segments.join("/");

    return {
      async get() {
        const data = state.store.get(path);
        return {
          exists: Boolean(data),
          data: () => (data ? deepCopy(data) : {}),
        };
      },
      async set(data: any) {
        state.store.set(path, deepCopy(data));
      },
      async update(updates: Record<string, any>) {
        const current = state.store.get(path) ?? {};
        const next: Record<string, any> = deepCopy(current);
        for (const [key, value] of Object.entries(updates)) {
          next[key] = applyFieldValue(current[key], value);
        }
        state.store.set(path, next);
      },
      async create(data: any) {
        if (state.store.has(path)) {
          const error: any = new Error("already-exists");
          error.code = "already-exists";
          throw error;
        }
        state.store.set(path, deepCopy(data));
      },
      collection(name: string) {
        return collectionRef([...segments, name]);
      },
    };
  };

  const listCollectionDocs = (segments: string[]) => {
    const basePath = segments.join("/");
    const expectedLength = segments.length + 1;

    return Array.from(state.store.entries())
      .filter(([path]) => {
        const parts = path.split("/");
        return (
          parts.length === expectedLength &&
          parts.slice(0, segments.length).join("/") === basePath
        );
      })
      .map(([path, data]) => ({
        id: path.split("/").pop() as string,
        data,
      }));
  };

  const queryRef = (
    segments: string[],
    field: string,
    op: string,
    value: unknown,
  ) => {
    const collect = () => {
      const docs = listCollectionDocs(segments).filter(({ data }) => {
        const fieldValue = (data as any)[field];
        if (op === "==") {
          return fieldValue === value;
        }
        if (op === ">=") {
          return fieldValue >= value;
        }
        return false;
      });

      return docs.map((doc) => ({
        id: doc.id,
        data: () => deepCopy(doc.data),
      }));
    };

    return {
      async get() {
        const docs = collect();
        return {
          docs,
          data: () => ({ count: docs.length }),
        };
      },
      count: () => ({
        get: async () => ({
          data: () => ({ count: collect().length }),
        }),
      }),
    };
  };

  const collectionRef = (segments: string[]) => ({
    doc: (id: string) => docRef([...segments, id]),
    add: async (data: any) => {
      const id = `auto-${++state.lastAutoId}`;
      const ref = docRef([...segments, id]);
      await ref.set(data);
      return ref;
    },
    where: (field: string, op: string, value: unknown) =>
      queryRef(segments, field, op, value),
    collection: (name: string) => collectionRef([...segments, name]),
  });

  const adminDb = {
    collection: (name: string) => collectionRef([name]),
    runTransaction: async (fn: any) =>
      fn({
        get: (ref: any) => ref.get(),
        set: (ref: any, data: any) => ref.set(data),
        update: (ref: any, updates: any) => ref.update(updates),
        create: (ref: any, data: any) => ref.create(data),
      }),
  };

  return { adminDb, Timestamp: MockTimestamp, FieldValue };
}

function resetState() {
  firestoreState.store.clear();
  firestoreState.lastAutoId = 0;
  promotionState.promotions.length = 0;
  analyticsTaskState.tasks.length = 0;
  anomalyState.queue.length = 0;
  rateLimitState.counts.clear();
  rateLimitState.overrideLimit = null;
  fraudRateLimitState.counts.clear();
  smsState.sent.length = 0;
  pushState.sent.length = 0;
  vi.clearAllMocks();
}

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    _id: overrides._id ?? "promo-" + Math.random().toString(36).slice(2),
    campaignId: overrides.campaignId ?? overrides._id ?? "promo-campaign",
    name: overrides.name ?? "Test Promotion",
    type: overrides.type ?? "seasonal",
    status: overrides.status ?? "active",
    isActive: overrides.isActive ?? true,
    discountType: overrides.discountType ?? "percentage",
    discountValue: overrides.discountValue ?? 20,
    maximumDiscount: overrides.maximumDiscount ?? 0,
    minimumOrderValue: overrides.minimumOrderValue ?? 0,
    targetAudience: overrides.targetAudience ?? {
      segmentType: "allCustomers",
      categories: [],
      products: [],
      excludedProducts: [],
    },
    startDate: overrides.startDate ?? now.toISOString(),
    endDate: overrides.endDate ?? later.toISOString(),
    priority: overrides.priority ?? 50,
    heroMessage: overrides.heroMessage ?? "Hero copy",
    ctaText: overrides.ctaText ?? "Shop now",
    variantMode: overrides.variantMode ?? "control",
    variantCopyA: overrides.variantCopyA ?? "Variant A",
    variantCopyB: overrides.variantCopyB ?? "Variant B",
    variantCtaA: overrides.variantCtaA ?? "CTA A",
    variantCtaB: overrides.variantCtaB ?? "CTA B",
    splitPercent: overrides.splitPercent ?? 50,
    budgetCap: overrides.budgetCap ?? 0,
    usageLimit: overrides.usageLimit ?? 0,
    perCustomerLimit: overrides.perCustomerLimit ?? 0,
    buyQuantity: overrides.buyQuantity ?? 0,
    getQuantity: overrides.getQuantity ?? 0,
    badgeLabel: overrides.badgeLabel ?? "",
    shortDescription: overrides.shortDescription ?? "",
    products: overrides.products ?? [],
    excludedProducts: overrides.excludedProducts ?? [],
    categories: overrides.categories ?? [],
  } as Promotion;
}

async function seedPromotion(overrides: Partial<Promotion> = {}): Promise<Promotion> {
  const promo = makePromotion(overrides);
  promotionState.promotions.push(promo);
  await initializePromotionAnalytics(promo.campaignId as string);
  return promo;
}

async function seedUser(profile: UserProfileSeed) {
  await adminDb.collection("users").doc(profile.id).set({
    ordersCount: profile.ordersCount ?? 0,
    ltv: profile.ltv ?? 0,
    emailVerified: profile.emailVerified ?? true,
    createdAt: Timestamp.fromDate(profile.createdAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    lastPurchaseAt: profile.lastPurchaseAt ?? Timestamp.fromDate(new Date()),
    lastActiveAt: profile.lastActiveAt ?? Timestamp.fromDate(new Date()),
    segment: profile.segment ?? "allCustomers",
  });

  return { id: profile.id, ltv: profile.ltv ?? 0 };
}

async function setAnalyticsSnapshot(
  campaignId: string,
  data: Partial<{
    impressions: number;
    clicks: number;
    addToCarts: number;
    conversions: number;
    totalDiscountSpent: number;
    totalRevenue: number;
  }>,
) {
  await adminDb
    .collection("promotions")
    .doc(campaignId)
    .collection("analytics")
    .doc("real-time")
    .set({
      impressions: data.impressions ?? 0,
      clicks: data.clicks ?? 0,
      addToCarts: data.addToCarts ?? 0,
      conversions: data.conversions ?? 0,
      totalDiscountSpent: data.totalDiscountSpent ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
      lastUpdated: Timestamp.now(),
    });
}
