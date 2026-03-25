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
  alternativeDiscounts: AlternativeRecommendation[];
}

export interface PriceSensitivitySignals {
  purchasesWithDiscount: number;
  purchasesWithoutDiscount: number;
  averageDiscountUsed: number;
  cartAbandonment: number;
  wishlistSize: number;
  priceAlertSubscriptions: number;
}

export interface AlternativeRecommendation {
  discount: number;
  expectedConversionLift: number;
  marginImpact: number;
  rationale?: string;
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

const deriveDiscountBounds = (
  cart: CartContext,
  config: OptimizationConfig,
  reasoning: string[],
) => {
  const hasMarginData = Number.isFinite(cart.avgItemMargin) && cart.avgItemMargin > 0;
  const marginHeadroom = hasMarginData
    ? Math.max(0, cart.avgItemMargin - config.marginProtection.minMarginAfterDiscount)
    : null;

  const maxDiscount =
    marginHeadroom !== null && marginHeadroom >= 0
      ? Math.max(0, Math.min(config.maxDiscount, marginHeadroom))
      : config.maxDiscount;
  const minDiscount =
    marginHeadroom === 0
      ? 0
      : Math.min(config.minDiscount, maxDiscount);

  if (!hasMarginData) {
    reasoning.push("Missing margin data - using configured discount caps");
  } else if (marginHeadroom === 0) {
    reasoning.push("No margin available - discount suppressed to protect profitability");
  } else if (marginHeadroom < config.maxDiscount) {
    reasoning.push(`Margin headroom limited to ${marginHeadroom}% after guardrail`);
  }

  return {
    hasMarginData,
    marginHeadroom,
    minDiscount,
    maxDiscount,
  };
};

const computeLtvFactor = (
  ltv: number,
  thresholds: OptimizationConfig["ltvThresholds"],
  reasoning: string[],
) => {
  const normalizedLtv = Math.max(0, toFiniteNumber(ltv, 0));

  if (normalizedLtv >= thresholds.high) {
    reasoning.push("High LTV customer - reduced incentive needed");
    return 0.65;
  }

  if (normalizedLtv >= thresholds.medium) {
    reasoning.push("Medium LTV customer - moderate incentive applied");
    return 0.8;
  }

  if (normalizedLtv === 0) {
    reasoning.push("First-time customer - acquisition incentive applied");
    return 1.15;
  }

  reasoning.push("Standard LTV tier");
  return 1;
};

const computeSensitivityFactor = (
  sensitivityScore: number,
  weight: number,
  reasoning: string[],
) => {
  const normalized = clampNumber(toFiniteNumber(sensitivityScore, 50), 0, 100);
  const centered = (normalized - 50) / 100; // -0.5 to 0.5
  const multiplier = clampNumber(1 + centered * weight * 2, 0.6, 1.4);

  if (normalized >= 75) {
    reasoning.push("High price sensitivity - increased discount to convert");
  } else if (normalized <= 25) {
    reasoning.push("Low price sensitivity - lower discount sufficient");
  } else {
    reasoning.push("Neutral price sensitivity - baseline incentive");
  }

  return multiplier;
};

const computeCartFactor = (cartValue: number, reasoning: string[]) => {
  const normalizedCartValue = toFiniteNumber(cartValue, 0);
  if (normalizedCartValue >= 200) {
    reasoning.push("Large cart - reduced percentage needed");
    return 0.9;
  }

  if (normalizedCartValue <= 50 && normalizedCartValue > 0) {
    reasoning.push("Small cart - increased percentage to incentivize conversion");
    return 1.08;
  }

  return 1;
};

const calculateMarginFactor = (
  rawDiscount: number,
  marginHeadroom: number | null,
  reasoning: string[],
) => {
  if (marginHeadroom === null) return 1;
  if (marginHeadroom === 0) return 0;
  if (rawDiscount <= marginHeadroom) return 1;

  const factor = clampNumber(marginHeadroom / Math.max(rawDiscount, 1), 0, 1);
  reasoning.push(`Margin protection applied - cap at ${marginHeadroom}% to keep minimum margin`);
  return factor;
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

  const bounds = deriveDiscountBounds(cart, config, reasoning);
  const normalizedBaseDiscount = clampNumber(
    Math.max(baseDiscount, bounds.minDiscount, 0),
    bounds.minDiscount,
    bounds.maxDiscount,
  );

  factors.ltvFactor = computeLtvFactor(user.ltv, config.ltvThresholds, reasoning);
  factors.sensitivityFactor = computeSensitivityFactor(
    user.priceSensitivityScore,
    config.priceSensitivityWeight,
    reasoning,
  );
  factors.cartFactor = computeCartFactor(cart.cartValue, reasoning);

  const blendedDiscount =
    normalizedBaseDiscount * factors.ltvFactor * factors.sensitivityFactor * factors.cartFactor;

  factors.marginFactor = calculateMarginFactor(blendedDiscount, bounds.marginHeadroom, reasoning);

  const guardedDiscount = Math.round(blendedDiscount * factors.marginFactor);
  const suggestedDiscount = clampNumber(
    guardedDiscount === 0 && bounds.minDiscount > 0 ? bounds.minDiscount : guardedDiscount,
    bounds.minDiscount,
    bounds.maxDiscount,
  );

  const confidence = calculateConfidence(user, cart);
  const alternatives = generateAlternatives(suggestedDiscount, cart.avgItemMargin, config);

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
export function calculateConfidence(user: UserProfile, cart: CartContext): number {
  const signalCompleteness = [
    Number.isFinite(user.ltv),
    Number.isFinite(user.ordersCount),
    user.daysSinceLastPurchase !== null,
    Number.isFinite(user.priceSensitivityScore),
    Number.isFinite(cart.cartValue),
    Number.isFinite(cart.avgItemMargin) && cart.avgItemMargin > 0,
  ];

  const completenessScore =
    signalCompleteness.reduce((total, flag) => total + (flag ? 1 : 0), 0) /
    signalCompleteness.length;

  let confidence = 35 + Math.round(completenessScore * 25); // 35-60 depending on data completeness

  if (user.ordersCount >= 12) confidence += 15;
  else if (user.ordersCount >= 5) confidence += 10;
  else if (user.ordersCount >= 2) confidence += 5;
  else confidence -= 5;

  if (user.daysSinceLastPurchase !== null) {
    if (user.daysSinceLastPurchase <= 30) confidence += 10;
    else if (user.daysSinceLastPurchase <= 90) confidence += 5;
    else confidence -= 5;
  } else {
    confidence -= 5;
  }

  if (cart.cartValue >= 150 || cart.itemCount >= 3) confidence += 5;
  const hasMarginSignal = Number.isFinite(cart.avgItemMargin) && cart.avgItemMargin > 0;
  if (hasMarginSignal) confidence += 5;
  else confidence -= 5;

  if (user.priceSensitivityScore !== 50) confidence += 5;

  return clampNumber(Math.round(confidence), 0, 95);
}

/**
 * Generate alternative discount options for A/B testing.
 */
export function generateAlternatives(
  suggested: number,
  avgItemMargin: number,
  config: OptimizationConfig,
): AlternativeRecommendation[] {
  const marginHeadroom =
    Number.isFinite(avgItemMargin) && avgItemMargin > 0
      ? Math.max(0, avgItemMargin - config.marginProtection.minMarginAfterDiscount)
      : null;

  const maxAllowed =
    marginHeadroom !== null ? Math.max(0, Math.min(config.maxDiscount, marginHeadroom)) : config.maxDiscount;
  const minAllowed =
    marginHeadroom === 0 ? 0 : Math.min(config.minDiscount, maxAllowed);

  const steps = [-5, 5];
  const alternatives: AlternativeRecommendation[] = [];

  for (const step of steps) {
    const candidate = clampNumber(Math.round(suggested + step), minAllowed, maxAllowed);

    if (candidate === suggested || alternatives.some((alt) => alt.discount === candidate)) {
      continue;
    }

    const delta = candidate - suggested;
    const expectedConversionLift =
      delta > 0 ? Math.min(25, 10 + delta) : Math.max(-25, -10 + delta);

    alternatives.push({
      discount: candidate,
      expectedConversionLift,
      marginImpact: suggested - candidate, // Positive preserves margin, negative costs margin
      rationale: delta > 0 ? "Higher incentive to improve conversion" : "Margin-preserving challenger arm",
    });
  }

  return alternatives;
}

/**
 * Calculate price sensitivity score from user behavior.
 */
export function calculatePriceSensitivity(userData: PriceSensitivitySignals): number {
  let score = 50; // Neutral starting point
  const totalPurchases = userData.purchasesWithDiscount + userData.purchasesWithoutDiscount;

  const discountRatio = totalPurchases > 0
    ? userData.purchasesWithDiscount / totalPurchases
    : 0.5;
  score += (discountRatio - 0.5) * 40;

  if (userData.averageDiscountUsed > 25) score += 12;
  else if (userData.averageDiscountUsed < 5) score -= 12;

  if (userData.cartAbandonment >= 3) score += 8;
  if (userData.priceAlertSubscriptions > 0) score += 12;
  if (userData.wishlistSize > 5) score += 6;

  if (totalPurchases < 3) {
    // Limited data lowers confidence in the score; pull slightly toward neutral
    score = (score + 50) / 2;
  }

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
