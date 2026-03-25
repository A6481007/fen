import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/sanity/queries", () => ({
  getActivePromotions: vi.fn().mockResolvedValue([]),
}));
import { PromotionEngine } from "@/lib/promotions/promotionEngine";

type Promotion = Parameters<PromotionEngine["assignVariant"]>[0];

describe("A/B Testing Integration", () => {
  let engine: PromotionEngine;

  beforeEach(() => {
    engine = new PromotionEngine();
  });

  describe("Variant Assignment", () => {
    it("returns control variant when variantMode is control", () => {
      const promo = createMockPromo({ variantMode: "control" });
      const result = engine.assignVariant(promo, "user-123", "session-456");

      expect(result.variant).toBe("control");
      expect(result.copy).toBe(promo.heroMessage);
      expect(result.cta).toBe(promo.ctaText);
    });

    it("returns variantA when variantMode is variantA", () => {
      const promo = createMockPromo({
        variantMode: "variantA",
        variantCopyA: "Variant A Copy",
        variantCtaA: "Variant A CTA",
      });
      const result = engine.assignVariant(promo, "user-123", "session-456");

      expect(result.variant).toBe("variantA");
      expect(result.copy).toBe("Variant A Copy");
      expect(result.cta).toBe("Variant A CTA");
    });

    it("deterministically assigns variant in split mode", () => {
      const promo = createMockPromo({
        variantMode: "split",
        splitPercent: 50,
      });

      const result1 = engine.assignVariant(promo, "user-123", "session-1");
      const result2 = engine.assignVariant(promo, "user-123", "session-2");

      expect(result1.variant).toBe(result2.variant);
    });

    it("distributes users roughly according to splitPercent", () => {
      const promo = createMockPromo({
        variantMode: "split",
        splitPercent: 30,
      });

      let variantACount = 0;
      let variantBCount = 0;

      for (let i = 0; i < 1000; i++) {
        const result = engine.assignVariant(promo, `user-${i}`, "session");
        if (result.variant === "variantA") variantACount += 1;
        if (result.variant === "variantB") variantBCount += 1;
      }

      const variantAPercent = (variantACount / 1000) * 100;
      expect(variantAPercent).toBeGreaterThan(25);
      expect(variantAPercent).toBeLessThan(35);
      expect(variantACount + variantBCount).toBe(1000);
    });

    it("uses sessionId when userId is null", () => {
      const promo = createMockPromo({ variantMode: "split", splitPercent: 50 });

      const result1 = engine.assignVariant(promo, null, "session-abc");
      const result2 = engine.assignVariant(promo, null, "session-abc");

      expect(result1.variant).toBe(result2.variant);
      expect(["variantA", "variantB"]).toContain(result1.variant);
    });

    it("spreads hash buckets without heavy skew for split bucketing", () => {
      const promo = createMockPromo({ variantMode: "split", splitPercent: 50 });
      const hashToBucket = (
        engine as unknown as { hashToBucket: (id: string, campaignId: string) => number }
      ).hashToBucket.bind(engine);
      const buckets = Array.from({ length: 100 }, () => 0);
      const totalUsers = 10_000;

      for (let i = 0; i < totalUsers; i += 1) {
        const bucket = hashToBucket(`user-${i}`, promo.campaignId || "default");
        buckets[bucket] += 1;
      }

      const avg = totalUsers / buckets.length;
      const min = Math.min(...buckets);
      const max = Math.max(...buckets);

      expect(buckets.every((count) => count > 0)).toBe(true);
      expect(min).toBeGreaterThanOrEqual(avg * 0.6);
      expect(max).toBeLessThanOrEqual(avg * 1.4);
    });
  });

  describe("Variant Rendering", () => {
    it.todo("displays correct copy for assigned variant");
    it.todo("displays correct CTA for assigned variant");
  });

  describe("Variant Tracking", () => {
    it.todo("tracks variant assignment to Firestore");
    it.todo("includes variant in click tracking");
  });
});

function createMockPromo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    _id: "promo-1",
    campaignId: "test-campaign",
    name: "Test Promotion",
    heroMessage: "Default Hero Message",
    ctaText: "Default CTA",
    variantMode: "control",
    variantCopyA: "",
    variantCopyB: "",
    variantCtaA: "",
    variantCtaB: "",
    splitPercent: 50,
    targetAudience: {
      segmentType: "allCustomers",
      categories: [],
      products: [],
      excludedProducts: [],
    },
    status: "active",
    startDate: new Date(Date.now() - 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    type: "seasonal",
    discountType: "percentage",
    discountValue: 0,
    ...overrides,
  } as Promotion;
}
