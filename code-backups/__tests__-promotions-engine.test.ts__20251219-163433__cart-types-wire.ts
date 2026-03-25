import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PromotionEngine } from "@/lib/promotions/promotionEngine";
import { mockPromotion, mockUser, mockContext } from "@/__mocks__/promotionsMock";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
} from "@/lib/promotions/analytics";

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/lib/promotions/analytics", () => ({
  checkBudgetAvailable: vi.fn().mockResolvedValue(true),
  checkUsageLimitAvailable: vi.fn().mockResolvedValue(true),
  checkPerCustomerLimit: vi.fn().mockResolvedValue(true),
  incrementPromotionMetric: vi.fn(),
  recordPromotionSpend: vi.fn(),
  trackUserPromoInteraction: vi.fn(),
}));

vi.mock("@/sanity/queries", () => ({
  getActivePromotions: vi.fn().mockResolvedValue([]),
}));

describe("PromotionEngine", () => {
  let engine: PromotionEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    engine = new PromotionEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkEligibility", () => {
    it("marks cart as eligible when cart value meets minimum order value", () => {
      const promo = mockPromotion({ minimumOrderValue: 50 });
      const result = engine.checkEligibility(promo as any, mockUser(), mockContext({ cartValue: 75 }));

      expect(result.eligible).toBe(true);
      expect(result.matchedCriteria).toContain("Minimum order value satisfied");
    });

    it("marks cart as ineligible when minimum order value is not met", () => {
      const promo = mockPromotion({ minimumOrderValue: 150 });
      const result = engine.checkEligibility(promo as any, mockUser(), mockContext({ cartValue: 80 }));

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Minimum order value not met");
    });

    it("allows eligibility when no minimum order value is set", () => {
      const promo = mockPromotion({ minimumOrderValue: undefined });
      const result = engine.checkEligibility(promo as any, mockUser(), mockContext({ cartValue: 0 }));

      expect(result.eligible).toBe(true);
    });
  });

  describe("matchesSegment", () => {
    it("first-time visitor matches 'firstTime' segment", () => {
      const promo = mockPromotion({ targetAudience: { segmentType: "firstTime" } });
      const user = mockUser({ ordersCount: 0, ltv: 0, lastPurchaseAt: null });
      const context = mockContext({ isFirstVisit: true });
      const matchesSegment = (engine as any).matchesSegment.bind(engine);

      expect(matchesSegment(promo, user, context)).toBe(true);
    });

    it("first-time visitor matches 'allCustomers' segment", () => {
      const promo = mockPromotion({ targetAudience: { segmentType: "allCustomers" } });
      const user = mockUser({ ordersCount: 0, lastPurchaseAt: null });
      const matchesSegment = (engine as any).matchesSegment.bind(engine);

      expect(matchesSegment(promo, user, mockContext({ isFirstVisit: true }))).toBe(true);
    });

    it("returning customer (3 orders) matches 'returning' segment", () => {
      const promo = mockPromotion({ targetAudience: { segmentType: "returning" } });
      const user = mockUser({ ordersCount: 3, lastPurchaseAt: new Date(Date.now() - 86400000 * 10) });
      const matchesSegment = (engine as any).matchesSegment.bind(engine);

      expect(matchesSegment(promo, user, mockContext())).toBe(true);
    });

    it("VIP customer (10 orders, $600 LTV) matches 'vip' segment", () => {
      const promo = mockPromotion({
        targetAudience: { segmentType: "vip", minLTVThreshold: 500 },
      });
      const user = mockUser({
        ordersCount: 10,
        ltv: 600,
        lastPurchaseAt: new Date(Date.now() - 86400000 * 5),
      });
      const matchesSegment = (engine as any).matchesSegment.bind(engine);

      expect(matchesSegment(promo, user, mockContext())).toBe(true);
    });

    it("User with abandoned cart matches 'cartAbandoner' when threshold met", () => {
      const promo = mockPromotion({
        targetAudience: { segmentType: "cartAbandoner", cartAbandonmentThreshold: 1 },
      });
      const user = mockUser({
        ordersCount: 2,
        lastPurchaseAt: new Date(Date.now() - 86400000 * 2),
        lastAbandonedCartAt: new Date(Date.now() - 86400000 * 2),
        lastAbandonedCartValue: 180,
      });
      const context = mockContext({
        sessionData: { lastAbandonedCartAt: new Date(Date.now() - 86400000 * 2) },
      });
      const matchesSegment = (engine as any).matchesSegment.bind(engine);

      expect(matchesSegment(promo, user, context)).toBe(true);
    });

    it("Inactive user (60 days since purchase) matches 'inactive' segment", () => {
      const promo = mockPromotion({
        targetAudience: { segmentType: "inactive", inactivityDays: 45 },
      });
      const user = mockUser({
        ordersCount: 2,
        lastPurchaseAt: new Date(Date.now() - 86400000 * 60),
      });
      const matchesSegment = (engine as any).matchesSegment.bind(engine);

      expect(matchesSegment(promo, user, mockContext())).toBe(true);
    });

    it("User does NOT match segment they don't qualify for", () => {
      const promo = mockPromotion({ targetAudience: { segmentType: "vip" } });
      const user = mockUser({ ordersCount: 1, ltv: 100, lastPurchaseAt: new Date(Date.now() - 86400000) });
      const matchesSegment = (engine as any).matchesSegment.bind(engine);

      expect(matchesSegment(promo, user, mockContext())).toBe(false);
    });
  });

  describe("matchesProductScope", () => {
    it("treats empty categories/products as matching all products", () => {
      const targetAudience = { segmentType: "allCustomers", categories: [], products: [], excludedProducts: [] };
      const context = mockContext({
        productId: "prod-123",
        cartItems: [{ productId: "prod-123", quantity: 1, price: 25 }],
      });
      const matchesProductScope = (engine as any).matchesProductScope.bind(engine);

      expect(matchesProductScope(context, targetAudience)).toBe(true);
    });

    it("matches only specific products when targetAudience.products is set", () => {
      const targetAudience = {
        segmentType: "allCustomers",
        products: [{ _id: "prod-allowed" }],
        categories: [],
      };
      const matchesProductScope = (engine as any).matchesProductScope.bind(engine);

      expect(matchesProductScope(mockContext({ productId: "prod-allowed" }), targetAudience)).toBe(true);
      expect(matchesProductScope(mockContext({ productId: "prod-other" }), targetAudience)).toBe(false);
    });

    it("matches products belonging to a targeted category", () => {
      const targetAudience = {
        segmentType: "allCustomers",
        categories: [{ _id: "cat-9" }],
      };
      const context = mockContext({
        cartItems: [{ productId: "prod-1", quantity: 1, price: 20, categoryId: "cat-9" }],
      });
      const matchesProductScope = (engine as any).matchesProductScope.bind(engine);

      expect(matchesProductScope(context, targetAudience)).toBe(true);
    });

    it("fails when product is present in excludedProducts", () => {
      const targetAudience = {
        segmentType: "allCustomers",
        excludedProducts: [{ _id: "prod-blocked" }],
      };
      const matchesProductScope = (engine as any).matchesProductScope.bind(engine);

      expect(matchesProductScope(mockContext({ productId: "prod-blocked" }), targetAudience)).toBe(false);
    });
  });

  describe("checkBudgetAndLimits", () => {
    it("returns eligible flags when budget is available", async () => {
      const promo = mockPromotion({ budgetCap: 1000 });
      const result = await (engine as any).checkBudgetAndLimits(promo, "user-1");

      expect(result.withinBudget).toBe(true);
      expect(result.failureReasons).toHaveLength(0);
    });

    it("reports ineligible when budget cap is exceeded", async () => {
      vi.mocked(checkBudgetAvailable).mockResolvedValueOnce(false);
      const promo = mockPromotion({ budgetCap: 1000 });
      const result = await (engine as any).checkBudgetAndLimits(promo, "user-1");

      expect(result.withinBudget).toBe(false);
      expect(result.failureReasons).toContain("Budget cap reached");
    });

    it("stays eligible when usage limit has room left", async () => {
      const promo = mockPromotion({ usageLimit: 5 });
      const result = await (engine as any).checkBudgetAndLimits(promo, null);

      expect(result.withinUsageLimit).toBe(true);
      expect(result.failureReasons).not.toContain("Usage limit reached");
    });

    it("reports usage limit exhaustion when limit is reached", async () => {
      vi.mocked(checkUsageLimitAvailable).mockResolvedValueOnce(false);
      const promo = mockPromotion({ usageLimit: 1 });
      const result = await (engine as any).checkBudgetAndLimits(promo, null);

      expect(result.withinUsageLimit).toBe(false);
      expect(result.failureReasons).toContain("Usage limit reached");
    });

    it("stays eligible when per-customer limit has not been met", async () => {
      const promo = mockPromotion({ perCustomerLimit: 2 });
      const result = await (engine as any).checkBudgetAndLimits(promo, "user-123");

      expect(result.withinPerCustomerLimit).toBe(true);
    });

    it("reports per-customer limit exhaustion when reached", async () => {
      vi.mocked(checkPerCustomerLimit).mockResolvedValueOnce(false);
      const promo = mockPromotion({ perCustomerLimit: 1 });
      const result = await (engine as any).checkBudgetAndLimits(promo, "user-123");

      expect(result.withinPerCustomerLimit).toBe(false);
      expect(result.failureReasons).toContain("Per-customer limit reached");
    });
  });

  describe("calculateDiscount", () => {
    it("calculates percentage discount correctly", () => {
      const promo = mockPromotion({ discountType: "percentage", discountValue: 20, maximumDiscount: 0 });
      const discount = engine.calculateDiscount(promo as any, 100);

      expect(discount.discountAmount).toBeCloseTo(20);
      expect(discount.discountedPrice).toBeCloseTo(80);
    });

    it("caps percentage discounts at maximumDiscount", () => {
      const promo = mockPromotion({
        discountType: "percentage",
        discountValue: 20,
        maximumDiscount: 50,
      });
      const discount = engine.calculateDiscount(promo as any, 500);

      expect(discount.discountAmount).toBeCloseTo(50);
    });

    it("applies fixed discount values", () => {
      const promo = mockPromotion({ discountType: "fixed", discountValue: 15, maximumDiscount: 100 });
      const discount = engine.calculateDiscount(promo as any, 80);

      expect(discount.discountAmount).toBeCloseTo(15);
      expect(discount.discountedPrice).toBeCloseTo(65);
    });

    it("computes Buy X Get Y discounts based on cart quantities", () => {
      (engine as any).lastCartItems = [{ productId: "prod-1", quantity: 3, price: 30 }];
      const promo = mockPromotion({
        discountType: "bxgy",
        buyQuantity: 2,
        getQuantity: 1,
        maximumDiscount: 0,
      });
      const discount = engine.calculateDiscount(promo as any, 90);

      expect(discount.discountAmount).toBeCloseTo(30);
    });
  });

  describe("calculatePersonalizedDiscount", () => {
    it("adds LTV bonus for VIP users on loyalty promotions", () => {
      const user = mockUser({ ordersCount: 10, ltv: 600 });
      const promo = mockPromotion({
        type: "loyalty",
        discountType: "percentage",
        discountValue: 20,
        maximumDiscount: 0,
      });
      const discount = engine.calculatePersonalizedDiscount(promo as any, user as any, 200);

      expect(discount.discountAmount).toBeCloseTo(44);
      expect(discount.discountBreakdown?.ltvBonus).toBeCloseTo(4);
    });
  });

  describe("rankPromotions", () => {
    const baseEligibility = {
      eligible: true,
      reason: "Eligible",
      requirementsMissing: [],
      matchedCriteria: [],
    };
    const baseLimits = {
      withinBudget: true,
      withinUsageLimit: true,
      withinPerCustomerLimit: true,
      failureReasons: [],
    };

    const buildEligible = (
      promoOverrides: Record<string, unknown>,
      discountAmount: number
    ) => ({
      ...mockPromotion(promoOverrides),
      assignedVariant: null,
      eligibilityReason: "Eligible",
      eligibility: { ...baseEligibility },
      limits: { ...baseLimits },
      discount: {
        discountAmount,
        discountedPrice: 0,
        originalPrice: 0,
        savingsDisplay: "",
        appliedPromotion: (promoOverrides.campaignId as string) ?? "test",
      },
    });

    it("orders higher priority promotions first", () => {
      const highPriority = buildEligible({ campaignId: "high", priority: 90 }, 10);
      const lowPriority = buildEligible({ campaignId: "low", priority: 50 }, 50);

      const ranked = engine.rankPromotions([lowPriority as any, highPriority as any], mockContext({ page: "homepage" }));
      expect(ranked[0].campaignId).toBe("high");
    });

    it("orders by higher discount when priorities match", () => {
      const biggerDiscount = buildEligible({ campaignId: "bigger", priority: 50 }, 30);
      const smallerDiscount = buildEligible({ campaignId: "smaller", priority: 50 }, 10);

      const ranked = engine.rankPromotions([smallerDiscount as any, biggerDiscount as any], mockContext({ page: "homepage" }));
      expect(ranked[0].campaignId).toBe("bigger");
    });

    it("orders by end date when priority and discount tie", () => {
      const soon = buildEligible(
        { campaignId: "soon", priority: 50, endDate: new Date(Date.now() + 86400000).toISOString() },
        20
      );
      const later = buildEligible(
        { campaignId: "later", priority: 50, endDate: new Date(Date.now() + 86400000 * 3).toISOString() },
        20
      );

      const ranked = engine.rankPromotions([later as any, soon as any], mockContext({ page: "homepage" }));
      expect(ranked[0].campaignId).toBe("soon");
    });

    it("boosts relevance for promos scoped to the active product page", () => {
      const targeted = buildEligible(
        { campaignId: "product-specific", priority: 10, endDate: mockPromotion().endDate, targetAudience: { products: [{ _id: "prod-match" }] } },
        20
      );
      const generic = buildEligible(
        { campaignId: "generic", priority: 10, endDate: mockPromotion().endDate },
        20
      );

      const ranked = engine.rankPromotions(
        [generic as any, targeted as any],
        mockContext({ page: "product", productId: "prod-match" })
      );
      expect(ranked[0].campaignId).toBe("product-specific");
    });
  });

  describe("assignVariant", () => {
    it("returns control variant when variantMode is 'control'", () => {
      const promo = mockPromotion({ variantMode: "control", heroMessage: "Control copy", ctaText: "Shop now" });

      const variant = engine.assignVariant(promo as any, "user-123", "session-123");
      expect(variant.variant).toBe("control");
      expect(variant.copy).toBe("Control copy");
    });

    it("returns variantA when variantMode is explicitly 'variantA'", () => {
      const promo = mockPromotion({
        variantMode: "variantA",
        variantCopyA: "Variant A copy",
        variantCtaA: "CTA A",
      });

      const variant = engine.assignVariant(promo as any, "user-123", "session-123");
      expect(variant.variant).toBe("variantA");
      expect(variant.copy).toBe("Variant A copy");
    });

    it("uses split percent to deterministically bucket users", () => {
      const promo = mockPromotion({
        variantMode: "split",
        splitPercent: 50,
        variantCopyA: "A copy",
        variantCopyB: "B copy",
      });
      const bucket = (engine as any).hashToBucket("user-split", promo.campaignId);
      const variant = engine.assignVariant(promo as any, "user-split", "session-split");
      const expected = bucket < 50 ? "variantA" : "variantB";

      expect(["variantA", "variantB"]).toContain(variant.variant);
      expect(variant.variant).toBe(expected);
    });

    it("keeps variant consistent for the same user and campaign", () => {
      const promo = mockPromotion({ variantMode: "split", splitPercent: 50 });

      const first = engine.assignVariant(promo as any, "user-repeat", "session-repeat");
      const second = engine.assignVariant(promo as any, "user-repeat", "session-repeat");

      expect(second.variant).toBe(first.variant);
    });

    it("assigns different variants for different users over time", () => {
      const promo = mockPromotion({ variantMode: "split", splitPercent: 50 });
      const baseVariant = engine.assignVariant(promo as any, "user-0", "session-0").variant;

      let different: string | null = null;
      for (let i = 1; i < 50; i += 1) {
        const next = engine.assignVariant(promo as any, `user-${i}`, `session-${i}`).variant;
        if (next !== baseVariant) {
          different = next;
          break;
        }
      }

      expect(different).not.toBeNull();
      expect(different).not.toBe(baseVariant);
    });
  });
});
