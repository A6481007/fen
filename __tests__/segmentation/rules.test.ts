import { describe, it, expect } from "vitest";
import {
  deriveSegment,
  isVIP,
  isCartAbandoner,
  isInactive,
  isReturning,
  isFirstTime,
  getAllQualifyingSegments,
  getFullSegmentResult,
  daysBetween,
  SEGMENT_CONFIG,
  type UserSegmentData,
} from "@/lib/segmentation/rules";

// Helper to create test data
function createTestUser(overrides: Partial<UserSegmentData> = {}): UserSegmentData {
  return {
    ordersCount: 0,
    ltv: 0,
    lastPurchaseAt: null,
    abandonedCarts: 0,
    lastCartAbandonedAt: null,
    lastCartValue: null,
    accountCreatedAt: new Date(),
    emailVerified: true,
    isSubscriber: false,
    ...overrides,
  };
}

describe("Segmentation Rules", () => {
  describe("deriveSegment", () => {
    it("returns firstTime for user with no orders", () => {
      const user = createTestUser({ ordersCount: 0 });
      expect(deriveSegment(user)).toBe("firstTime");
    });

    it("returns returning for user with 1-4 orders", () => {
      const user = createTestUser({
        ordersCount: 2,
        lastPurchaseAt: new Date(), // Recent purchase
      });
      expect(deriveSegment(user)).toBe("returning");
    });

    it("returns vip for user with 5+ orders", () => {
      const user = createTestUser({
        ordersCount: 5,
        lastPurchaseAt: new Date(),
      });
      expect(deriveSegment(user)).toBe("vip");
    });

    it("returns vip for user with high LTV even if low orders", () => {
      const user = createTestUser({
        ordersCount: 2,
        ltv: 600, // Above $500 threshold
        lastPurchaseAt: new Date(),
      });
      expect(deriveSegment(user)).toBe("vip");
    });

    it("returns cartAbandoner when cart abandoned recently", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const user = createTestUser({
        ordersCount: 1,
        lastPurchaseAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        lastCartAbandonedAt: twoDaysAgo,
        abandonedCarts: 1,
      });
      // cartAbandoner takes priority over inactive
      expect(deriveSegment(user)).toBe("cartAbandoner");
    });

    it("returns inactive for user with no recent purchase", () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const user = createTestUser({
        ordersCount: 2,
        lastPurchaseAt: sixtyDaysAgo,
      });
      expect(deriveSegment(user)).toBe("inactive");
    });

    it("vip takes priority over cartAbandoner", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const user = createTestUser({
        ordersCount: 6, // VIP
        ltv: 1000,
        lastPurchaseAt: new Date(),
        lastCartAbandonedAt: twoDaysAgo, // Also cart abandoner
        abandonedCarts: 1,
      });
      expect(deriveSegment(user)).toBe("vip");
    });
  });

  describe("isVIP", () => {
    it("returns true when orders >= threshold", () => {
      const user = createTestUser({ ordersCount: SEGMENT_CONFIG.vip.orderThreshold });
      expect(isVIP(user)).toBe(true);
    });

    it("returns true when LTV >= threshold", () => {
      const user = createTestUser({ ltv: SEGMENT_CONFIG.vip.ltvThreshold });
      expect(isVIP(user)).toBe(true);
    });

    it("returns false when below both thresholds", () => {
      const user = createTestUser({ ordersCount: 2, ltv: 100 });
      expect(isVIP(user)).toBe(false);
    });
  });

  describe("isCartAbandoner", () => {
    it("returns true when cart abandoned within window", () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const user = createTestUser({ lastCartAbandonedAt: oneDayAgo });
      expect(isCartAbandoner(user)).toBe(true);
    });

    it("returns false when cart value is below minimum threshold", () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const user = createTestUser({
        lastCartAbandonedAt: oneDayAgo,
        lastCartValue: SEGMENT_CONFIG.cartAbandoner.minCartValue - 1,
      });
      expect(isCartAbandoner(user)).toBe(false);
    });

    it("returns false when cart abandoned outside window", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const user = createTestUser({ lastCartAbandonedAt: tenDaysAgo });
      expect(isCartAbandoner(user)).toBe(false);
    });

    it("returns false when no abandoned cart", () => {
      const user = createTestUser({ lastCartAbandonedAt: null });
      expect(isCartAbandoner(user)).toBe(false);
    });
  });

  describe("isInactive", () => {
    it("returns true when last purchase was long ago", () => {
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const user = createTestUser({
        ordersCount: 2,
        lastPurchaseAt: fortyFiveDaysAgo,
      });
      expect(isInactive(user)).toBe(true);
    });

    it("returns false for recent purchaser", () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const user = createTestUser({
        ordersCount: 2,
        lastPurchaseAt: fiveDaysAgo,
      });
      expect(isInactive(user)).toBe(false);
    });

    it("returns false for user who never purchased (they are firstTime)", () => {
      const user = createTestUser({ ordersCount: 0 });
      expect(isInactive(user)).toBe(false);
    });
  });

  describe("getAllQualifyingSegments", () => {
    it("returns all segments user qualifies for", () => {
      const user = createTestUser({
        ordersCount: 6, // VIP
        ltv: 600,
        lastPurchaseAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Inactive
      });

      const segments = getAllQualifyingSegments(user);
      expect(segments).toContain("vip");
      expect(segments).toContain("inactive");
      expect(segments).not.toContain("firstTime");
    });

    it("returns only firstTime for new user", () => {
      const user = createTestUser({ ordersCount: 0 });
      const segments = getAllQualifyingSegments(user);
      expect(segments).toEqual(["firstTime"]);
    });
  });

  describe("getFullSegmentResult", () => {
    it("returns complete segment result object", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const user = createTestUser({
        ordersCount: 3,
        ltv: 300,
        lastPurchaseAt: thirtyDaysAgo,
      });

      const result = getFullSegmentResult(user);

      expect(result).toHaveProperty("primary");
      expect(result).toHaveProperty("all");
      expect(result).toHaveProperty("priority");
      expect(result).toHaveProperty("metadata");
      expect(result.metadata.daysSinceLastPurchase).toBeGreaterThanOrEqual(29);
    });
  });

  describe("daysBetween", () => {
    it("calculates days between two dates correctly", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-15");
      expect(daysBetween(date1, date2)).toBe(14);
    });

    it("handles same day", () => {
      const date = new Date();
      expect(daysBetween(date, date)).toBe(0);
    });
  });
});
