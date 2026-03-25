import "server-only";

// Types
export interface UserProfile {
  userId: string;
  ltv: number;
  ordersCount: number;
  avgOrderValue: number;
  daysSinceLastPurchase: number | null;
  priceSensitivityScore: number; // 0-100 (higher = more price sensitive)
  segment: string;
}

export interface CartContext {
  cartValue: number;
  itemCount: number;
  hasHighMarginItems: boolean;
  avgItemMargin: number; // Percentage (0-100)
}

export interface OptimizationConfig {
  minDiscount: number; // Minimum discount to offer (%)
  maxDiscount: number; // Maximum discount cap (%)
  ltvThresholds: {
    high: number; // LTV above this = high value
    medium: number; // LTV above this = medium value
  };
  marginProtection: {
    minMarginAfterDiscount: number; // Don't go below this margin
  };
  priceSensitivityWeight: number; // How much price sensitivity affects discount
}

export interface OptimizedDiscount {
  suggestedDiscount: number; // Percentage
  confidence: number; // 0-100
  reasoning: string[];
  factors: {
    ltvFactor: number;
    sensitivityFactor: number;
    marginFactor: number;
    cartFactor: number;
  };
  alternativeDiscounts: Array<{
    discount: number;
    expectedConversionLift: number;
    marginImpact: number;
  }>;
}

export interface PriceSensitivitySignals {
  purchasesWithDiscount: number;
  purchasesWithoutDiscount: number;
  averageDiscountUsed: number;
  cartAbandonment: number;
  wishlistSize: number;
  priceAlertSubscriptions: number;
}

// Default configuration
export const DEFAULT_CONFIG: OptimizationConfig = {
  minDiscount: 5,
  maxDiscount: 30,
  ltvThresholds: {
    high: 500,
    medium: 200,
  },
  marginProtection: {
    minMarginAfterDiscount: 15,
  },
  priceSensitivityWeight: 0.3,
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const daysSinceDate = (value: unknown): number | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  return null;
};

/**
 * Calculate optimal discount for a user.
 */
export function calculateOptimalDiscount(
  user: UserProfile,
  cart: CartContext,
  baseDiscount: number,
  config: OptimizationConfig = DEFAULT_CONFIG,
): OptimizedDiscount {
  const reasoning: string[] = [];
  const factors = {
    ltvFactor: 1,
    sensitivityFactor: 1,
    marginFactor: 1,
    cartFactor: 1,
  };

  const normalizedBaseDiscount = Math.max(baseDiscount, config.minDiscount, 0);
  const hasMarginData = Number.isFinite(cart.avgItemMargin) && cart.avgItemMargin > 0;
  const marginHeadroom = hasMarginData
    ? Math.max(0, cart.avgItemMargin - config.marginProtection.minMarginAfterDiscount)
    : null;
  const bounds = {
    min: config.minDiscount,
    max: config.maxDiscount,
  };

  if (marginHeadroom !== null) {
    bounds.max = Math.min(bounds.max, marginHeadroom);
    bounds.min = marginHeadroom === 0 ? 0 : Math.min(bounds.min, bounds.max);
  }

  // 1. LTV Factor - High LTV users need less discount to convert
  if (user.ltv >= config.ltvThresholds.high) {
    factors.ltvFactor = 0.7; // Reduce discount by 30%
    reasoning.push("High LTV customer - reduced discount needed");
  } else if (user.ltv >= config.ltvThresholds.medium) {
    factors.ltvFactor = 0.85;
    reasoning.push("Medium LTV customer - moderate discount");
  } else if (user.ltv === 0) {
    factors.ltvFactor = 1.1; // First-time customers get slightly more
    reasoning.push("First-time customer - acquisition discount applied");
  } else {
    factors.ltvFactor = 1;
    reasoning.push("Standard LTV tier");
  }

  // 2. Price Sensitivity Factor
  // Higher sensitivity = more responsive to discounts
  const sensitivityMultiplier =
    1 + ((user.priceSensitivityScore - 50) / 100) * config.priceSensitivityWeight;
  factors.sensitivityFactor = clampNumber(sensitivityMultiplier, 0.7, 1.3);

  if (user.priceSensitivityScore > 70) {
    reasoning.push("High price sensitivity - discount likely to convert");
  } else if (user.priceSensitivityScore < 30) {
    reasoning.push("Low price sensitivity - reduced discount sufficient");
  }

  // 3. Margin Protection Factor
  if (marginHeadroom !== null) {
    if (marginHeadroom === 0) {
      factors.marginFactor = 0;
      reasoning.push("Insufficient margin to offer a discount without breaching guardrails");
    } else if (normalizedBaseDiscount > marginHeadroom) {
      factors.marginFactor = clampNumber(
        marginHeadroom / Math.max(normalizedBaseDiscount, 1),
        0,
        1,
      );
      reasoning.push(`Margin protection applied - capped at ${marginHeadroom}%`);
    } else {
      reasoning.push("Margin allows standard discount range");
    }
  }

  // 4. Cart Value Factor - Larger carts may need less percentage discount
  if (cart.cartValue > 200) {
    factors.cartFactor = 0.9;
    reasoning.push("Large cart - reduced percentage needed");
  } else if (cart.cartValue < 50) {
    factors.cartFactor = 1.1;
    reasoning.push("Small cart - increased percentage to incentivize");
  }

  // Calculate final discount
  const rawSuggestedDiscount =
    normalizedBaseDiscount *
    factors.ltvFactor *
    factors.sensitivityFactor *
    factors.marginFactor *
    factors.cartFactor;

  const suggestedDiscount = clampNumber(
    Math.round(rawSuggestedDiscount),
    bounds.min,
    bounds.max,
  );

  // Calculate confidence (simplified)
  const confidence = calculateConfidence(user, cart, hasMarginData);

  // Generate alternative discounts
  const alternatives = generateAlternatives(
    suggestedDiscount,
    cart.avgItemMargin,
    bounds,
    config,
  );

  return {
    suggestedDiscount,
    confidence,
    reasoning,
    factors,
    alternativeDiscounts: alternatives,
  };
}

/**
 * Calculate confidence in the recommendation.
 */
function calculateConfidence(
  user: UserProfile,
  cart: CartContext,
  hasMarginData: boolean,
): number {
  let confidence = 50; // Base confidence

  // More data = higher confidence
  if (user.ordersCount >= 5) confidence += 20;
  else if (user.ordersCount >= 2) confidence += 10;

  // Known price sensitivity = higher confidence
  if (user.priceSensitivityScore !== 50) confidence += 10;

  // Has margin data = higher confidence
  if (hasMarginData && cart.avgItemMargin > 0) confidence += 10;

  // Recent purchase data = higher confidence
  if (user.daysSinceLastPurchase !== null && user.daysSinceLastPurchase < 90) {
    confidence += 10;
  }

  return Math.min(95, confidence);
}

/**
 * Generate alternative discount options for A/B testing.
 */
function generateAlternatives(
  suggested: number,
  avgItemMargin: number,
  bounds: { min: number; max: number },
  config: OptimizationConfig,
): Array<{ discount: number; expectedConversionLift: number; marginImpact: number }> {
  const alternatives = [];

  // Lower discount option
  if (suggested > bounds.min + 5) {
    const lowerDiscount = suggested - 5;
    alternatives.push({
      discount: lowerDiscount,
      expectedConversionLift: -15, // Expected reduction in conversions
      marginImpact: 5, // Margin preserved
    });
  }

  const marginHeadroom =
    Number.isFinite(avgItemMargin) && avgItemMargin > 0
      ? Math.max(0, avgItemMargin - config.marginProtection.minMarginAfterDiscount)
      : null;
  const maxAllowed = marginHeadroom !== null ? Math.min(config.maxDiscount, marginHeadroom) : config.maxDiscount;

  // Higher discount option
  if (suggested < maxAllowed - 5 && suggested < bounds.max) {
    const higherDiscount = suggested + 5;
    alternatives.push({
      discount: higherDiscount,
      expectedConversionLift: 20, // Expected increase in conversions
      marginImpact: -5, // Additional margin cost
    });
  }

  return alternatives;
}

/**
 * Calculate price sensitivity score from user behavior.
 */
export function calculatePriceSensitivity(userData: PriceSensitivitySignals): number {
  let score = 50; // Neutral starting point

  // Discount usage
  const discountRatio =
    userData.purchasesWithDiscount + userData.purchasesWithoutDiscount > 0
      ? userData.purchasesWithDiscount /
        (userData.purchasesWithDiscount + userData.purchasesWithoutDiscount)
      : 0.5;
  score += (discountRatio - 0.5) * 30;

  // Average discount depth suggests sensitivity
  if (userData.averageDiscountUsed > 20) score += 10;
  else if (userData.averageDiscountUsed < 10) score -= 10;

  // Cart abandonment suggests price comparison shopping
  if (userData.cartAbandonment > 3) score += 10;

  // Price alerts/wishlist watching
  if (userData.priceAlertSubscriptions > 0) score += 15;
  if (userData.wishlistSize > 5) score += 5;

  return clampNumber(Math.round(score), 0, 100);
}

/**
 * Apply personalized discount to promotion.
 */
export async function applyPersonalizedDiscount(
  userId: string,
  campaignId: string,
  baseDiscount: number,
  cart: CartContext,
  config: OptimizationConfig = DEFAULT_CONFIG,
): Promise<{
  originalDiscount: number;
  personalizedDiscount: number;
  wasAdjusted: boolean;
  optimization: OptimizedDiscount;
}> {
  // Fetch user profile
  const user = await fetchUserProfile(userId);

  // Calculate optimal discount
  const optimization = calculateOptimalDiscount(user, cart, baseDiscount, config);
  optimization.reasoning.push(`Campaign ${campaignId} context ready for A/B testing`);

  return {
    originalDiscount: baseDiscount,
    personalizedDiscount: optimization.suggestedDiscount,
    wasAdjusted: optimization.suggestedDiscount !== baseDiscount,
    optimization,
  };
}

/**
 * Fetch user profile from Firestore.
 */
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  // Import inside function to avoid circular deps
  const { adminDb } = await import("@/lib/firebaseAdmin");

  const userDoc = await adminDb.collection("users").doc(userId).get();
  const userData = userDoc.data();

  if (!userData) {
    return {
      userId,
      ltv: 0,
      ordersCount: 0,
      avgOrderValue: 0,
      daysSinceLastPurchase: null,
      priceSensitivityScore: 50,
      segment: "firstTime",
    };
  }

  const ltv = toFiniteNumber((userData as Record<string, unknown>).ltv, 0);
  const ordersCount = toFiniteNumber((userData as Record<string, unknown>).ordersCount, 0);
  const lastPurchaseValue = (userData as Record<string, unknown>).lastPurchaseAt;
  const daysSinceLastPurchase = daysSinceDate(
    typeof lastPurchaseValue === "object" &&
      lastPurchaseValue !== null &&
      "toDate" in lastPurchaseValue &&
      typeof (lastPurchaseValue as { toDate?: unknown }).toDate === "function"
      ? (lastPurchaseValue as { toDate: () => Date }).toDate()
      : lastPurchaseValue,
  );

  const priceSensitivityScore = clampNumber(
    toFiniteNumber((userData as Record<string, unknown>).priceSensitivityScore, 50),
    0,
    100,
  );

  return {
    userId,
    ltv,
    ordersCount,
    avgOrderValue: ordersCount > 0 ? ltv / ordersCount : 0,
    daysSinceLastPurchase,
    priceSensitivityScore,
    segment: (userData as Record<string, unknown>).segment
      ? String((userData as Record<string, unknown>).segment)
      : "firstTime",
  };
}

// Export types
export type { UserProfile as DiscountUserProfile, CartContext as DiscountCartContext };
