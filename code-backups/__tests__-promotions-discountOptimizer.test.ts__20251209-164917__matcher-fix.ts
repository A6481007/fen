import { describe, it, expect } from "vitest";
import {
  calculateOptimalDiscount,
  calculatePriceSensitivity,
  type UserProfile,
  type CartContext,
  type OptimizationConfig,
} from "@/lib/promotions/discountOptimizer";

// Test helpers
function createTestUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: "test-user",
    ltv: 100,
    ordersCount: 2,
    avgOrderValue: 50,
    daysSinceLastPurchase: 30,
    priceSensitivityScore: 50,
    segment: "returning",
    ...overrides,
  };
}

function createTestCart(overrides: Partial<CartContext> = {}): CartContext {
  return {
    cartValue: 100,
    itemCount: 2,
    hasHighMarginItems: false,
    avgItemMargin: 40,
    ...overrides,
  };
}

describe("Discount Optimizer", () => {
  describe("calculateOptimalDiscount", () => {
    describe("LTV-based adjustments", () => {
      it("reduces discount for high LTV customers", () => {
        const user = createTestUser({ ltv: 600 }); // Above high threshold
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 20);

        expect(result.suggestedDiscount).toBeLessThan(20);
        expect(result.factors.ltvFactor).toBeLessThan(1);
        expect(result.reasoning).toContain(expect.stringMatching(/high ltv/i));
      });

      it("gives acquisition discount to first-time users", () => {
        const user = createTestUser({ ltv: 0, ordersCount: 0 });
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 15);

        expect(result.factors.ltvFactor).toBeGreaterThan(1);
        expect(result.reasoning).toContain(expect.stringMatching(/first-time/i));
      });

      it("applies medium tier for mid-range LTV", () => {
        const user = createTestUser({ ltv: 300 }); // Medium tier
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 20);

        expect(result.factors.ltvFactor).toBe(0.85);
      });
    });

    describe("Price sensitivity adjustments", () => {
      it("increases discount for highly price-sensitive users", () => {
        const user = createTestUser({ priceSensitivityScore: 85 });
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 15);

        expect(result.factors.sensitivityFactor).toBeGreaterThan(1);
      });

      it("decreases discount for low price-sensitivity users", () => {
        const user = createTestUser({ priceSensitivityScore: 20 });
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 15);

        expect(result.factors.sensitivityFactor).toBeLessThan(1);
      });

      it("keeps neutral factor for average sensitivity", () => {
        const user = createTestUser({ priceSensitivityScore: 50 });
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 15);

        expect(result.factors.sensitivityFactor).toBeCloseTo(1, 1);
      });
    });

    describe("Margin protection", () => {
      it("caps discount to protect minimum margin", () => {
        const user = createTestUser();
        const cart = createTestCart({ avgItemMargin: 20 }); // Low margin

        // With 20% margin and 15% min protection, max discount is 5%
        const result = calculateOptimalDiscount(user, cart, 25);

        expect(result.suggestedDiscount).toBeLessThanOrEqual(10);
        expect(result.reasoning).toContain(expect.stringMatching(/margin protection/i));
      });

      it("allows full discount when margin is high", () => {
        const user = createTestUser();
        const cart = createTestCart({ avgItemMargin: 60 }); // High margin

        const result = calculateOptimalDiscount(user, cart, 20);

        expect(result.factors.marginFactor).toBe(1);
      });
    });

    describe("Cart value adjustments", () => {
      it("reduces percentage for large carts", () => {
        const user = createTestUser();
        const cart = createTestCart({ cartValue: 300 });

        const result = calculateOptimalDiscount(user, cart, 20);

        expect(result.factors.cartFactor).toBeLessThan(1);
        expect(result.reasoning).toContain(expect.stringMatching(/large cart/i));
      });

      it("increases percentage for small carts", () => {
        const user = createTestUser();
        const cart = createTestCart({ cartValue: 30 });

        const result = calculateOptimalDiscount(user, cart, 15);

        expect(result.factors.cartFactor).toBeGreaterThan(1);
        expect(result.reasoning).toContain(expect.stringMatching(/small cart/i));
      });
    });

    describe("Bounds enforcement", () => {
      it("does not go below minimum discount", () => {
        const user = createTestUser({ ltv: 1000 }); // Very high LTV
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 10);

        expect(result.suggestedDiscount).toBeGreaterThanOrEqual(5); // Default min
      });

      it("does not exceed maximum discount", () => {
        const user = createTestUser({ ltv: 0, priceSensitivityScore: 100 });
        const cart = createTestCart({ cartValue: 20 });

        const result = calculateOptimalDiscount(user, cart, 50);

        expect(result.suggestedDiscount).toBeLessThanOrEqual(30); // Default max
      });
    });

    describe("Confidence calculation", () => {
      it("has higher confidence with more user data", () => {
        const newUser = createTestUser({ ordersCount: 0 });
        const veteranUser = createTestUser({ ordersCount: 10 });
        const cart = createTestCart();

        const newResult = calculateOptimalDiscount(newUser, cart, 15);
        const veteranResult = calculateOptimalDiscount(veteranUser, cart, 15);

        expect(veteranResult.confidence).toBeGreaterThan(newResult.confidence);
      });
    });

    describe("Alternative discounts", () => {
      it("generates lower and higher alternatives", () => {
        const user = createTestUser();
        const cart = createTestCart();

        const result = calculateOptimalDiscount(user, cart, 20);

        expect(result.alternativeDiscounts.length).toBeGreaterThan(0);

        const discounts = result.alternativeDiscounts.map((alternative) => alternative.discount);
        expect(discounts.some((discount) => discount < result.suggestedDiscount)).toBe(true);
      });
    });
  });

  describe("calculatePriceSensitivity", () => {
    it("returns high score for frequent discount users", () => {
      const score = calculatePriceSensitivity({
        purchasesWithDiscount: 8,
        purchasesWithoutDiscount: 2,
        averageDiscountUsed: 25,
        cartAbandonment: 5,
        wishlistSize: 10,
        priceAlertSubscriptions: 3,
      });

      expect(score).toBeGreaterThan(70);
    });

    it("returns low score for full-price buyers", () => {
      const score = calculatePriceSensitivity({
        purchasesWithDiscount: 1,
        purchasesWithoutDiscount: 9,
        averageDiscountUsed: 5,
        cartAbandonment: 0,
        wishlistSize: 0,
        priceAlertSubscriptions: 0,
      });

      expect(score).toBeLessThan(40);
    });

    it("returns neutral score for mixed behavior", () => {
      const score = calculatePriceSensitivity({
        purchasesWithDiscount: 5,
        purchasesWithoutDiscount: 5,
        averageDiscountUsed: 15,
        cartAbandonment: 1,
        wishlistSize: 2,
        priceAlertSubscriptions: 0,
      });

      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(60);
    });

    it("clamps score between 0 and 100", () => {
      const extremeHigh = calculatePriceSensitivity({
        purchasesWithDiscount: 100,
        purchasesWithoutDiscount: 0,
        averageDiscountUsed: 50,
        cartAbandonment: 20,
        wishlistSize: 100,
        priceAlertSubscriptions: 10,
      });

      const extremeLow = calculatePriceSensitivity({
        purchasesWithDiscount: 0,
        purchasesWithoutDiscount: 100,
        averageDiscountUsed: 0,
        cartAbandonment: 0,
        wishlistSize: 0,
        priceAlertSubscriptions: 0,
      });

      expect(extremeHigh).toBeLessThanOrEqual(100);
      expect(extremeLow).toBeGreaterThanOrEqual(0);
    });
  });
});
