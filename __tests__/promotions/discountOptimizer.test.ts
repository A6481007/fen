import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONFIG,
  calculateConfidence,
  calculateOptimalDiscount,
  calculatePriceSensitivity,
  generateAlternatives,
  type CartContext,
  type OptimizationConfig,
  type UserProfile,
} from "@/lib/promotions/discountOptimizer";

const CONFIG: OptimizationConfig = DEFAULT_CONFIG;

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
    avgItemMargin: 45,
    ...overrides,
  };
}

describe("calculateOptimalDiscount", () => {
  it("reduces discount for high LTV customers", () => {
    const user = createTestUser({ ltv: 700 });
    const cart = createTestCart();

    const result = calculateOptimalDiscount(user, cart, 20, CONFIG);

    expect(result.suggestedDiscount).toBeLessThan(20);
    expect(result.factors.ltvFactor).toBeLessThan(1);
    expect(result.reasoning).toEqual(expect.arrayContaining([expect.stringMatching(/high ltv/i)]));
  });

  it("boosts acquisition offer for first-time users", () => {
    const user = createTestUser({ ltv: 0, ordersCount: 0 });
    const cart = createTestCart();

    const result = calculateOptimalDiscount(user, cart, 15, CONFIG);

    expect(result.suggestedDiscount).toBeGreaterThan(15);
    expect(result.reasoning).toEqual(expect.arrayContaining([expect.stringMatching(/first-time/i)]));
  });

  it("increases discount for highly price-sensitive users", () => {
    const user = createTestUser({ priceSensitivityScore: 90 });
    const cart = createTestCart();

    const result = calculateOptimalDiscount(user, cart, 15, CONFIG);

    expect(result.factors.sensitivityFactor).toBeGreaterThan(1);
  });

  it("decreases discount for low price sensitivity", () => {
    const user = createTestUser({ priceSensitivityScore: 10 });
    const cart = createTestCart();

    const result = calculateOptimalDiscount(user, cart, 15, CONFIG);

    expect(result.factors.sensitivityFactor).toBeLessThan(1);
  });

  it("caps discount to available margin headroom", () => {
    const user = createTestUser();
    const cart = createTestCart({ avgItemMargin: 18 }); // 3% headroom after guardrail

    const result = calculateOptimalDiscount(user, cart, 25, CONFIG);

    expect(result.suggestedDiscount).toBe(3);
    expect(result.reasoning).toEqual(expect.arrayContaining([expect.stringMatching(/margin/i)]));
  });

  it("suppresses discount when margin is below guardrail", () => {
    const user = createTestUser();
    const cart = createTestCart({ avgItemMargin: 10 });

    const result = calculateOptimalDiscount(user, cart, 15, CONFIG);

    expect(result.suggestedDiscount).toBe(0);
  });

  it("reduces percentage for large carts", () => {
    const user = createTestUser();
    const cart = createTestCart({ cartValue: 320 });

    const result = calculateOptimalDiscount(user, cart, 20, CONFIG);

    expect(result.factors.cartFactor).toBeLessThan(1);
    expect(result.reasoning).toEqual(expect.arrayContaining([expect.stringMatching(/large cart/i)]));
  });

  it("increases percentage for small carts", () => {
    const user = createTestUser();
    const cart = createTestCart({ cartValue: 30 });

    const result = calculateOptimalDiscount(user, cart, 15, CONFIG);

    expect(result.factors.cartFactor).toBeGreaterThan(1);
    expect(result.reasoning).toEqual(expect.arrayContaining([expect.stringMatching(/small cart/i)]));
  });

  it("respects minimum configured discount when factors push lower", () => {
    const user = createTestUser({ ltv: 900 });
    const cart = createTestCart({ avgItemMargin: 50 }); // Allows full configured min/max

    const result = calculateOptimalDiscount(user, cart, 1, CONFIG);

    expect(result.suggestedDiscount).toBeGreaterThanOrEqual(CONFIG.minDiscount);
  });

  it("respects maximum configured discount when factors push higher", () => {
    const user = createTestUser({ ltv: 0, priceSensitivityScore: 100 });
    const cart = createTestCart({ cartValue: 20, avgItemMargin: 60 }); // Allows hitting config max

    const result = calculateOptimalDiscount(user, cart, 80, CONFIG);

    expect(result.suggestedDiscount).toBeLessThanOrEqual(CONFIG.maxDiscount);
  });
});

describe("calculateConfidence", () => {
  it("caps at 95 for rich, recent data", () => {
    const user = createTestUser({
      ltv: 1200,
      ordersCount: 15,
      daysSinceLastPurchase: 10,
      priceSensitivityScore: 80,
    });
    const cart = createTestCart({ cartValue: 400, itemCount: 4, avgItemMargin: 60 });

    const confidence = calculateConfidence(user, cart);

    expect(confidence).toBe(95);
  });

  it("drops when data is sparse or stale", () => {
    const user = createTestUser({
      ltv: 0,
      ordersCount: 0,
      daysSinceLastPurchase: null,
      priceSensitivityScore: 50,
    });
    const cart = createTestCart({ cartValue: 20, itemCount: 1, avgItemMargin: 0 });

    const confidence = calculateConfidence(user, cart);

    expect(confidence).toBeLessThan(60);
  });
});

describe("generateAlternatives", () => {
  it("returns +/-5% challenger arms within configured bounds", () => {
    const alternatives = generateAlternatives(20, 45, CONFIG);
    const discounts = alternatives.map((alt) => alt.discount);

    expect(alternatives.length).toBeGreaterThan(0);
    expect(discounts).toEqual(expect.arrayContaining([15, 25]));
    expect(discounts.every((value) => value >= CONFIG.minDiscount && value <= CONFIG.maxDiscount)).toBe(true);
  });

  it("obeys margin headroom when suggesting higher incentives", () => {
    const alternatives = generateAlternatives(6, 21, CONFIG);

    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.every((alt) => alt.discount <= 6)).toBe(true);
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

    expect(score).toBeGreaterThan(80);
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

    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThanOrEqual(60);
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
