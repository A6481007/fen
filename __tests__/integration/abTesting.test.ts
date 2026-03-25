import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/sanity/queries", () => ({
  getActivePromotions: vi.fn().mockResolvedValue([]),
}));
import { PromotionEngine } from "@/lib/promotions/promotionEngine";
import { adminDb } from "@/lib/firebaseAdmin";

type Promotion = Parameters<PromotionEngine["assignVariant"]>[0];

describe("A/B Testing Integration", () => {
  let engine: PromotionEngine;

  beforeEach(() => {
    engine = new PromotionEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
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

    it("returns variantB when variantMode is variantB", () => {
      const promo = createMockPromo({
        variantMode: "variantB",
        variantCopyB: "Variant B Copy",
        variantCtaB: "Variant B CTA",
      });

      const result = engine.assignVariant(promo, "user-123", "session-456");

      expect(result.variant).toBe("variantB");
      expect(result.copy).toBe("Variant B Copy");
      expect(result.cta).toBe("Variant B CTA");
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
    it("returns assigned variant A copy and CTA in eligible promotions", async () => {
      const promo = createMockPromo({
        variantMode: "split",
        splitPercent: 100,
        variantCopyA: "Hero A",
        variantCtaA: "CTA A",
      });

      vi.spyOn(engine, "getActivePromotions").mockResolvedValue([promo as any]);
      vi.spyOn(engine, "checkEligibility").mockReturnValue({
        eligible: true,
        reason: "Eligible",
        requirementsMissing: [],
        matchedCriteria: [],
      });
      vi.spyOn(engine, "checkBudgetAndLimits").mockResolvedValue({
        withinBudget: true,
        withinUsageLimit: true,
        withinPerCustomerLimit: true,
        failureReasons: [],
      });
      const trackSpy = vi.spyOn(engine, "trackVariantAssignment").mockResolvedValue();

      const promotions = await engine.getEligiblePromotions(null, "session-render-a", {
        page: "homepage",
        cartValue: 100,
      });

      const assigned = promotions[0]?.assignedVariant;
      expect(assigned?.variant).toBe("variantA");
      expect(promotions[0]?.displayCopy).toBe("Hero A");
      expect(promotions[0]?.displayCta).toBe("CTA A");
      expect(trackSpy).toHaveBeenCalledWith(promo.campaignId, null, "session-render-a", "variantA");
    });

    it("returns variant B copy and CTA when bucketed to variantB", async () => {
      const promo = createMockPromo({
        variantMode: "split",
        splitPercent: 0,
        variantCopyB: "Hero B",
        variantCtaB: "CTA B",
      });

      vi.spyOn(engine, "getActivePromotions").mockResolvedValue([promo as any]);
      vi.spyOn(engine, "checkEligibility").mockReturnValue({
        eligible: true,
        reason: "Eligible",
        requirementsMissing: [],
        matchedCriteria: [],
      });
      vi.spyOn(engine, "checkBudgetAndLimits").mockResolvedValue({
        withinBudget: true,
        withinUsageLimit: true,
        withinPerCustomerLimit: true,
        failureReasons: [],
      });
      const trackSpy = vi.spyOn(engine, "trackVariantAssignment").mockResolvedValue();

      const promotions = await engine.getEligiblePromotions("user-b", "session-render-b", {
        page: "homepage",
        cartValue: 100,
      });

      const assigned = promotions[0]?.assignedVariant;
      expect(assigned?.variant).toBe("variantB");
      expect(promotions[0]?.displayCopy).toBe("Hero B");
      expect(promotions[0]?.displayCta).toBe("CTA B");
      expect(trackSpy).toHaveBeenCalledWith(promo.campaignId, "user-b", "session-render-b", "variantB");
    });
  });

  describe("Variant Tracking", () => {
    it("tracks variant assignment to Firestore", async () => {
      const assignmentSet = vi.fn();
      const analyticsSet = vi.fn();

      const docSpy = vi.fn((docId: string) => ({
        collection: vi.fn((collectionName: string) => {
          if (collectionName === "variantAssignments") {
            return { doc: vi.fn(() => ({ set: assignmentSet })) };
          }
          if (collectionName === "analytics") {
            return { doc: vi.fn(() => ({ set: analyticsSet })) };
          }
          return { doc: vi.fn(() => ({ set: vi.fn() })) };
        }),
        set: vi.fn(),
      }));

      const collectionSpy = vi
        .spyOn(adminDb, "collection")
        .mockReturnValue({ doc: docSpy } as unknown as ReturnType<typeof adminDb.collection>);

      await engine.trackVariantAssignment("campaign-1", "user-99", "session-88", "variantB");

      expect(collectionSpy).toHaveBeenCalledWith("promotions");
      expect(docSpy).toHaveBeenCalledWith("campaign-1");
      expect(assignmentSet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-99",
          sessionId: "session-88",
          variant: "variantB",
        }),
        { merge: true }
      );
      expect(analyticsSet).toHaveBeenCalledWith(
        expect.objectContaining({
          variantBCount: expect.anything(),
          lastUpdated: expect.anything(),
        }),
        { merge: true }
      );
    });

    it("invokes variant tracking when resolving eligible promotions", async () => {
      const promoA = createMockPromo({
        _id: "promo-2",
        campaignId: "campaign-2",
        variantMode: "variantA",
        variantCopyA: "Copy A",
        variantCtaA: "CTA A",
      });
      const promoB = createMockPromo({
        _id: "promo-3",
        campaignId: "campaign-3",
        variantMode: "variantB",
        variantCopyB: "Copy B",
        variantCtaB: "CTA B",
      });

      vi.spyOn(engine, "getActivePromotions").mockResolvedValue([promoA as any, promoB as any]);
      vi.spyOn(engine, "checkEligibility").mockReturnValue({
        eligible: true,
        reason: "Eligible",
        requirementsMissing: [],
        matchedCriteria: [],
      });
      vi.spyOn(engine, "checkBudgetAndLimits").mockResolvedValue({
        withinBudget: true,
        withinUsageLimit: true,
        withinPerCustomerLimit: true,
        failureReasons: [],
      });
      const trackSpy = vi.spyOn(engine, "trackVariantAssignment").mockResolvedValue();

      const promotions = await engine.getEligiblePromotions("user-track", "session-track", {
        page: "homepage",
        cartValue: 120,
      });

      expect(promotions).toHaveLength(2);
      expect(trackSpy).toHaveBeenCalledTimes(2);
      expect(trackSpy).toHaveBeenCalledWith(promoA.campaignId, "user-track", "session-track", "variantA");
      expect(trackSpy).toHaveBeenCalledWith(promoB.campaignId, "user-track", "session-track", "variantB");
    });
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
