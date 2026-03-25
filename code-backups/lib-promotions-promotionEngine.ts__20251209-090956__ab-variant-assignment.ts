import "server-only";

import { adminDb, Timestamp } from "../firebaseAdmin";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
  incrementPromotionMetric,
  recordPromotionSpend,
  trackUserPromoInteraction,
} from "./analytics";
import { getActivePromotions as fetchActivePromotions } from "@/sanity/queries";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";

type Promotion = PROMOTIONS_LIST_QUERYResult[number];
type TargetAudience = NonNullable<Promotion["targetAudience"]>;
type PromotionType = NonNullable<Promotion["type"]>;
type SegmentType = NonNullable<TargetAudience["segmentType"]>;
type DiscountType = NonNullable<Promotion["discountType"]>;

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  categoryId?: string;
}

interface SessionData {
  shippingCost?: number;
  lastAbandonedCartAt?: string | Date;
  lastPurchaseAt?: string | Date;
}

interface UserData {
  id: string;
  ordersCount: number;
  ltv: number;
  lastPurchaseAt?: Date | null;
  lastActiveAt?: Date | null;
  lastAbandonedCartAt?: Date | null;
  lastAbandonedCartValue?: number | null;
  segment?: SegmentType;
}

interface EligiblePromotion {
  promotion: Promotion;
  assignedVariant: AssignedVariant | null;
  eligibility: EligibilityResult;
  limits: LimitCheckResult;
  discount: DiscountResult | null;
}

interface GetPromotionsOptions {
  type?: PromotionType;
  segment?: SegmentType;
  productId?: string;
  categoryId?: string;
  includeScheduled?: boolean;
}

interface EligibilityContext {
  page: "homepage" | "product" | "category" | "cart" | "checkout";
  productId?: string;
  categoryId?: string;
  cartValue?: number;
  cartItems?: CartItem[];
  isFirstVisit?: boolean;
  sessionData?: SessionData;
}

interface EligibilityResult {
  eligible: boolean;
  reason: string;
  requirementsMissing: string[];
  matchedCriteria: string[];
}

interface DiscountResult {
  discountAmount: number;
  discountedPrice: number;
  originalPrice: number;
  savingsDisplay: string;
  appliedPromotion: string;
  discountBreakdown?: {
    baseDiscount: number;
    ltvBonus: number;
    total: number;
  };
}

interface LimitCheckResult {
  withinBudget: boolean;
  withinUsageLimit: boolean;
  withinPerCustomerLimit: boolean;
  failureReasons: string[];
}

interface AssignedVariant {
  variant: "control" | "variantA" | "variantB";
  copy: string;
  cta: string;
  design: string;
}

type TrackingAction = "view" | "click" | "addToCart" | "purchase";

const PROMOTION_CACHE_TTL_MS = 60_000;
const VIP_LTV_THRESHOLD = 500;
const INACTIVITY_DAYS_DEFAULT = 45;
const CART_ABANDON_THRESHOLD_DAYS = 1;
const POINT_VALUE_IN_DOLLARS = 0.01;

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const seconds = toNumber((value as { seconds: number }).seconds);
    const nanos = toNumber((value as { nanoseconds?: number }).nanoseconds);
    return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const cartTotal = (context: EligibilityContext): number => {
  if (typeof context.cartValue === "number" && Number.isFinite(context.cartValue)) {
    return Math.max(0, context.cartValue);
  }

  if (Array.isArray(context.cartItems)) {
    return context.cartItems.reduce((sum, item) => {
      const lineTotal = toNumber(item.price) * toNumber(item.quantity, 1);
      return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);
  }

  return 0;
};

export class PromotionEngine {
  private cache = new Map<string, { expiresAt: number; data: Promotion[] }>();
  private lastCartItems?: CartItem[];
  private lastSessionData?: SessionData;

  async getActivePromotions(options?: GetPromotionsOptions): Promise<Promotion[]> {
    const cacheKey = JSON.stringify(options ?? {});
    const now = Date.now();
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const promotions = await fetchActivePromotions({ revalidate: false });
    const filtered = promotions.filter((promo) => {
      const withinSchedule = this.isPromotionActive(promo, options?.includeScheduled);
      if (!withinSchedule) {
        return false;
      }

      if (options?.type && promo.type !== options.type) {
        return false;
      }

      const targetSegment = promo.targetAudience?.segmentType ?? "allCustomers";
      if (
        options?.segment &&
        targetSegment !== "allCustomers" &&
        targetSegment !== options.segment
      ) {
        return false;
      }

      if (options?.productId || options?.categoryId) {
        const scoped = promo.targetAudience ?? {};
        const matchesProduct =
          !options?.productId ||
          Boolean(
            scoped.products?.some((product) => product._id === options.productId) ||
              promo.products?.some((product) => product._id === options.productId)
          );
        const matchesCategory =
          !options?.categoryId ||
          Boolean(
            scoped.categories?.some((category) => category._id === options.categoryId) ||
              promo.categories?.some((category) => category._id === options.categoryId)
          );

        if (!matchesProduct || !matchesCategory) {
          return false;
        }
      }

      return true;
    });

    this.cache.set(cacheKey, { data: filtered, expiresAt: now + PROMOTION_CACHE_TTL_MS });

    return filtered;
  }

  async getEligiblePromotions(
    userId: string | null,
    context: EligibilityContext
  ): Promise<EligiblePromotion[]> {
    const promotions = await this.getActivePromotions();
    const userData = userId ? await this.fetchUserData(userId) : null;
    const eligible: EligiblePromotion[] = [];

    for (const promo of promotions) {
      const eligibility = this.checkEligibility(promo, userData, context);
      if (!eligibility.eligible) {
        continue;
      }

      const limits = await this.checkBudgetAndLimits(promo, userId);
      if (
        !limits.withinBudget ||
        !limits.withinUsageLimit ||
        !limits.withinPerCustomerLimit
      ) {
        continue;
      }

      this.lastCartItems = context.cartItems;
      this.lastSessionData = context.sessionData;
      const discount = this.calculateDiscount(
        promo,
        context.cartValue ?? cartTotal(context),
        userData?.ltv
      );
      this.lastCartItems = undefined;
      this.lastSessionData = undefined;

      eligible.push({
        promotion: promo,
        assignedVariant: userId ? this.assignVariant(promo, userId) : null,
        eligibility,
        limits,
        discount,
      });
    }

    return this.rankPromotions(eligible, context);
  }

  checkEligibility(
    promo: Promotion,
    user: UserData | null,
    context: EligibilityContext
  ): EligibilityResult {
    const requirementsMissing: string[] = [];
    const matchedCriteria: string[] = [];

    if (!this.isPromotionActive(promo)) {
      requirementsMissing.push("Promotion is not active or outside schedule");
    } else {
      matchedCriteria.push("Active within schedule");
    }

    const segmentMatch = this.matchesSegment(promo, user, context);
    if (segmentMatch) {
      matchedCriteria.push("Segment matched");
    } else {
      requirementsMissing.push("User segment not eligible");
    }

    const scopeMatch = this.matchesProductScope(context, promo.targetAudience ?? {});
    if (scopeMatch) {
      matchedCriteria.push("Product/category scope matched");
    } else {
      requirementsMissing.push("Product or category not in scope");
    }

    const minimumOrderValue = promo.minimumOrderValue ?? 0;
    const currentCartValue = context.cartValue ?? cartTotal(context);
    if (minimumOrderValue > 0 && currentCartValue < minimumOrderValue) {
      requirementsMissing.push(
        `Minimum order value not met (${currentCartValue.toFixed(2)} < ${minimumOrderValue.toFixed(2)})`
      );
    } else if (minimumOrderValue > 0) {
      matchedCriteria.push("Minimum order value satisfied");
    }

    const eligible = requirementsMissing.length === 0;

    return {
      eligible,
      reason: eligible ? "Eligible for promotion" : requirementsMissing[0] ?? "Not eligible",
      requirementsMissing,
      matchedCriteria,
    };
  }

  private matchesSegment(
    promo: Promotion,
    user: UserData | null,
    context: EligibilityContext
  ): boolean {
    const targetAudience = promo.targetAudience;
    const targetSegment = targetAudience?.segmentType ?? "allCustomers";
    if (targetSegment === "allCustomers") {
      return true;
    }

    const userSegment = this.deriveSegment(user, targetAudience, context);
    return userSegment === targetSegment;
  }

  private matchesProductScope(
    context: EligibilityContext,
    targetAudience: TargetAudience
  ): boolean {
    const allowedProducts = new Set(
      (targetAudience.products ?? []).map((product) => product?._id).filter(Boolean)
    );
    const excludedProducts = new Set(
      (targetAudience.excludedProducts ?? [])
        .map((product) => product?._id)
        .filter(Boolean)
    );
    const allowedCategories = new Set(
      (targetAudience.categories ?? []).map((category) => category?._id).filter(Boolean)
    );

    const contextProducts = new Set<string>();
    const contextCategories = new Set<string>();

    if (context.productId) {
      contextProducts.add(context.productId);
    }
    if (context.categoryId) {
      contextCategories.add(context.categoryId);
    }

    for (const item of context.cartItems ?? []) {
      if (item.productId) {
        contextProducts.add(item.productId);
      }
      if (item.categoryId) {
        contextCategories.add(item.categoryId);
      }
    }

    if (
      Array.from(contextProducts).some((productId) =>
        excludedProducts.has(productId)
      )
    ) {
      return false;
    }

    if (
      allowedProducts.size > 0 &&
      !Array.from(contextProducts).some((productId) => allowedProducts.has(productId))
    ) {
      return false;
    }

    if (
      allowedCategories.size > 0 &&
      !Array.from(contextCategories).some((categoryId) =>
        allowedCategories.has(categoryId)
      )
    ) {
      return false;
    }

    return true;
  }

  private async checkBudgetAndLimits(
    promo: Promotion,
    userId: string | null
  ): Promise<LimitCheckResult> {
    const campaignId = promo.campaignId || promo._id;
    const failureReasons: string[] = [];

    let withinBudget = true;
    if (promo.budgetCap && promo.budgetCap > 0) {
      withinBudget = await checkBudgetAvailable(campaignId, promo.budgetCap);
      if (!withinBudget) {
        failureReasons.push("Budget cap reached");
      }
    }

    let withinUsageLimit = true;
    if (promo.usageLimit && promo.usageLimit > 0) {
      withinUsageLimit = await checkUsageLimitAvailable(campaignId, promo.usageLimit);
      if (!withinUsageLimit) {
        failureReasons.push("Usage limit reached");
      }
    }

    let withinPerCustomerLimit = true;
    if (promo.perCustomerLimit && promo.perCustomerLimit > 0 && userId) {
      withinPerCustomerLimit = await checkPerCustomerLimit(
        userId,
        campaignId,
        promo.perCustomerLimit
      );
      if (!withinPerCustomerLimit) {
        failureReasons.push("Per-customer limit reached");
      }
    }

    return {
      withinBudget,
      withinUsageLimit,
      withinPerCustomerLimit,
      failureReasons,
    };
  }

  calculateDiscount(
    promo: Promotion,
    orderValue: number,
    userLTV?: number
  ): DiscountResult {
    const discountType = promo.discountType as DiscountType | null;
    const maximumDiscount = promo.maximumDiscount ?? 0;
    const campaignId = promo.campaignId || promo._id;
    const totalQuantity = (this.lastCartItems ?? []).reduce(
      (sum, item) => sum + toNumber(item.quantity, 0),
      0
    );
    let discountAmount = 0;

    switch (discountType) {
      case "percentage": {
        const percent = Math.max(0, promo.discountValue ?? 0);
        discountAmount = (orderValue * percent) / 100;
        break;
      }
      case "fixed": {
        discountAmount = Math.max(0, promo.discountValue ?? 0);
        break;
      }
      case "bxgy": {
        const buyQty = Math.max(0, promo.buyQuantity ?? 0);
        const getQty = Math.max(0, promo.getQuantity ?? 0);
        if (buyQty > 0 && getQty > 0 && totalQuantity > 0) {
          const bundleSize = buyQty + getQty;
          const bundleCount = Math.floor(totalQuantity / bundleSize);
          const averagePrice =
            totalQuantity > 0 ? orderValue / totalQuantity : 0;
          discountAmount = bundleCount * getQty * averagePrice;
        } else {
          discountAmount = Math.max(0, promo.discountValue ?? 0);
        }
        break;
      }
      case "freeShipping": {
        const shippingCost =
          this.lastSessionData?.shippingCost ??
          Math.max(0, promo.discountValue ?? 0);
        discountAmount = shippingCost;
        break;
      }
      case "points": {
        const points = Math.max(0, promo.discountValue ?? 0);
        discountAmount = points * POINT_VALUE_IN_DOLLARS;
        break;
      }
      default:
        discountAmount = 0;
    }

    if (maximumDiscount > 0) {
      discountAmount = Math.min(discountAmount, maximumDiscount);
    }

    discountAmount = Math.min(discountAmount, orderValue);
    const discountedPrice = Math.max(0, orderValue - discountAmount);

    const savingsDisplay =
      discountType === "percentage"
        ? `${Math.round(discountAmount === 0 ? 0 : ((discountAmount / orderValue) * 100))}% OFF`
        : `Save $${discountAmount.toFixed(2)}`;

    return {
      discountAmount,
      discountedPrice,
      originalPrice: orderValue,
      savingsDisplay,
      appliedPromotion: campaignId,
    };
  }

  calculatePersonalizedDiscount(
    promo: Promotion,
    user: UserData,
    orderValue: number
  ): DiscountResult {
    const base = this.calculateDiscount(promo, orderValue, user.ltv);
    const isVip = user.ltv > VIP_LTV_THRESHOLD;
    const isNewCustomer = user.ordersCount <= 0;
    const isFirstTimePromo = promo.targetAudience?.segmentType === "firstTime";
    const isLoyaltyPromo = promo.type === "loyalty";
    const maximumDiscount = promo.maximumDiscount ?? 0;

    let ltvBonus = 0;
    if (isVip && isLoyaltyPromo) {
      ltvBonus = base.discountAmount * 0.1;
    }

    if (isNewCustomer && isFirstTimePromo) {
      const advertisedDiscount = (() => {
        const value = Math.max(0, promo.discountValue ?? 0);
        switch (promo.discountType as DiscountType | null) {
          case "percentage":
            return (orderValue * value) / 100;
          case "fixed":
            return value;
          case "points":
            return value * POINT_VALUE_IN_DOLLARS;
          default:
            // For bxgy/freeShipping, defer to the base calculation which already considered scope/session data.
            return base.discountAmount;
        }
      })();

      const cappedFullDiscount =
        maximumDiscount > 0
          ? Math.min(advertisedDiscount, maximumDiscount, orderValue)
          : Math.min(advertisedDiscount, orderValue);
      const discountedPrice = Math.max(0, orderValue - cappedFullDiscount);

      return {
        discountAmount: cappedFullDiscount,
        discountedPrice,
        originalPrice: orderValue,
        savingsDisplay:
          promo.discountType === "percentage"
            ? `${Math.round(
                cappedFullDiscount === 0 ? 0 : ((cappedFullDiscount / orderValue) * 100)
              )}% OFF`
            : `Save $${cappedFullDiscount.toFixed(2)}`,
        appliedPromotion: promo.campaignId || promo._id,
        discountBreakdown: {
          baseDiscount: base.discountAmount,
          ltvBonus: 0,
          total: cappedFullDiscount,
        },
      };
    }

    let personalizedDiscount = base.discountAmount + ltvBonus;

    if (maximumDiscount > 0) {
      personalizedDiscount = Math.min(personalizedDiscount, maximumDiscount);
    }

    personalizedDiscount = Math.min(personalizedDiscount, orderValue);
    const discountedPrice = Math.max(0, orderValue - personalizedDiscount);

    return {
      discountAmount: personalizedDiscount,
      discountedPrice,
      originalPrice: orderValue,
      savingsDisplay:
        promo.discountType === "percentage"
          ? `${Math.round(
              personalizedDiscount === 0 ? 0 : ((personalizedDiscount / orderValue) * 100)
            )}% OFF`
          : `Save $${personalizedDiscount.toFixed(2)}`,
      appliedPromotion: promo.campaignId || promo._id,
      discountBreakdown: {
        baseDiscount: base.discountAmount,
        ltvBonus,
        total: personalizedDiscount,
      },
    };
  }

  rankPromotions(
    promotions: EligiblePromotion[],
    context: EligibilityContext
  ): EligiblePromotion[] {
    const relevanceScore = (promo: Promotion) => {
      const target = promo.targetAudience ?? {};
      let score = 0;

      if (context.page === "product" && context.productId) {
        const matchesProduct =
          target.products?.some((product) => product._id === context.productId) ??
          promo.products?.some((product) => product._id === context.productId) ??
          false;
        if (matchesProduct) {
          score += 2;
        }
      }

      if (context.page === "category" && context.categoryId) {
        const matchesCategory =
          target.categories?.some((category) => category._id === context.categoryId) ??
          promo.categories?.some((category) => category._id === context.categoryId) ??
          false;
        if (matchesCategory) {
          score += 1;
        }
      }

      if (context.page === "homepage" && promo.priority) {
        score += promo.priority;
      }

      return score;
    };

    return [...promotions].sort((a, b) => {
      const priorityDiff = (b.promotion.priority ?? 0) - (a.promotion.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      const discountDiff =
        (b.discount?.discountAmount ?? 0) - (a.discount?.discountAmount ?? 0);
      if (discountDiff !== 0) return discountDiff;

      const endA = this.parseDateMs(a.promotion.endDate);
      const endB = this.parseDateMs(b.promotion.endDate);
      if (endA !== endB) return endA - endB;

      const relevanceDiff = relevanceScore(b.promotion) - relevanceScore(a.promotion);
      if (relevanceDiff !== 0) return relevanceDiff;

      return (b.promotion.priority ?? 0) - (a.promotion.priority ?? 0);
    });
  }

  selectBestPromotion(promotions: EligiblePromotion[]): EligiblePromotion | null {
    if (!Array.isArray(promotions) || promotions.length === 0) {
      return null;
    }

    return this.rankPromotions(promotions, { page: "homepage" })[0] ?? null;
  }

  assignVariant(promo: Promotion, userId: string): AssignedVariant {
    const variantMode = promo.variantMode ?? "control";
    const campaignId = promo.campaignId || promo._id;

    if (variantMode === "control") {
      return {
        variant: "control",
        copy: promo.heroMessage ?? promo.shortDescription ?? "",
        cta: promo.ctaText ?? "",
        design: promo.variantDesign ?? "default",
      };
    }

    if (variantMode === "variantA" || variantMode === "variantB") {
      return {
        variant: variantMode,
        copy: variantMode === "variantA" ? promo.variantCopyA ?? "" : promo.variantCopyB ?? "",
        cta: variantMode === "variantA" ? promo.variantCtaA ?? "" : promo.variantCtaB ?? "",
        design: promo.variantDesign ?? "default",
      };
    }

    const bucket = this.hashUserToBucket(userId, campaignId);
    const splitPercent = Math.min(
      100,
      Math.max(0, typeof promo.splitPercent === "number" ? promo.splitPercent : 50)
    );
    const variant = bucket < splitPercent ? "variantA" : "variantB";

    return {
      variant,
      copy: variant === "variantA" ? promo.variantCopyA ?? "" : promo.variantCopyB ?? "",
      cta: variant === "variantA" ? promo.variantCtaA ?? "" : promo.variantCtaB ?? "",
      design: promo.variantDesign ?? "default",
    };
  }

  private hashUserToBucket(userId: string, campaignId: string): number {
    const seed = `${userId}:${campaignId}`;
    let h1 = 0xdeadbeef ^ seed.length;
    let h2 = 0x41c6ce57 ^ seed.length;

    for (let i = 0, ch; i < seed.length; i += 1) {
      ch = seed.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return Math.abs(hash) % 100;
  }

  async trackInteraction(
    userId: string | null,
    campaignId: string,
    action: TrackingAction,
    metadata?: object
  ): Promise<void> {
    const metricPromise =
      action === "purchase"
        ? Promise.resolve(true)
        : incrementPromotionMetric(
            campaignId,
            action === "view"
              ? "impressions"
              : action === "click"
                ? "clicks"
                : "addToCarts",
            1
          );

    const userTrackPromise =
      userId && action !== "purchase"
        ? trackUserPromoInteraction(userId, campaignId, action, metadata)
        : Promise.resolve(true);

    if (action === "purchase") {
      await recordPromotionSpend(
        campaignId,
        toNumber((metadata as { discountAmount?: unknown })?.discountAmount, 0),
        toNumber((metadata as { orderValue?: unknown })?.orderValue, 0)
      );
      if (userId) {
        await trackUserPromoInteraction(userId, campaignId, action, metadata);
      }
      await metricPromise;
      return;
    }

    void metricPromise;
    void userTrackPromise;
  }

  private isPromotionActive(
    promo: Promotion,
    includeScheduled?: boolean
  ): boolean {
    const status = promo.status ?? "draft";
    const start = this.parseDateMs(promo.startDate);
    const end = this.parseDateMs(promo.endDate);
    const now = Date.now();

    const isWithinDates = (start === 0 || start <= now) && (end === 0 || now <= end);
    if (!isWithinDates) {
      return Boolean(includeScheduled && status === "scheduled" && start > now);
    }

    if (status === "active") {
      return true;
    }

    if (includeScheduled && status === "scheduled") {
      return true;
    }

    return false;
  }

  private deriveSegment(
    user: UserData | null,
    targetAudience: TargetAudience | null | undefined,
    context: EligibilityContext
  ): SegmentType {
    const ordersCount = user?.ordersCount ?? 0;
    const ltv = user?.ltv ?? 0;
    const inactivityThreshold =
      targetAudience?.inactivityDays ?? INACTIVITY_DAYS_DEFAULT;
    const vipThreshold = targetAudience?.minLTVThreshold ?? VIP_LTV_THRESHOLD;
    const abandonmentThreshold =
      targetAudience?.cartAbandonmentThreshold ?? CART_ABANDON_THRESHOLD_DAYS;
    const now = Date.now();

    const lastPurchaseAt = user?.lastPurchaseAt ?? toDate(context.sessionData?.lastPurchaseAt);
    const daysSincePurchase =
      lastPurchaseAt !== null ? this.daysBetween(now, lastPurchaseAt) : null;

    const lastAbandonedAt =
      user?.lastAbandonedCartAt ?? toDate(context.sessionData?.lastAbandonedCartAt);
    const abandonmentAge =
      lastAbandonedAt !== null ? this.daysBetween(now, lastAbandonedAt) : null;
    const hasAbandonedCart =
      (user?.lastAbandonedCartValue ?? 0) > 0 ||
      (abandonmentAge !== null && abandonmentAge >= abandonmentThreshold);

    if (ordersCount <= 0) {
      return "firstTime";
    }

    if (daysSincePurchase !== null && daysSincePurchase > inactivityThreshold) {
      return "inactive";
    }

    if (ordersCount >= 5 || ltv >= vipThreshold) {
      return "vip";
    }

    if (hasAbandonedCart && abandonmentAge !== null && abandonmentAge >= abandonmentThreshold) {
      return "cartAbandoner";
    }

    if (ordersCount > 0 && ordersCount < 5) {
      return "returning";
    }

    return "allCustomers";
  }

  private daysBetween(nowMs: number, date: Date): number {
    const diffMs = nowMs - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private parseDateMs(value: string | null): number {
    if (!value) {
      return 0;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private async fetchUserData(userId: string): Promise<UserData | null> {
    try {
      const snapshot = await adminDb.collection("users").doc(userId).get();
      if (!snapshot.exists) {
        return null;
      }

      const data = snapshot.data() ?? {};
      const ltv =
        toNumber((data as { lifetimeValue?: unknown }).lifetimeValue) ||
        toNumber((data as { ltv?: unknown }).ltv) ||
        toNumber((data as { totalSpent?: unknown }).totalSpent, 0);

      const ordersCount =
        toNumber((data as { totalOrders?: unknown }).totalOrders) ||
        toNumber((data as { ordersCount?: unknown }).ordersCount) ||
        toNumber((data as { orderCount?: unknown }).orderCount, 0);

      return {
        id: userId,
        ordersCount,
        ltv,
        lastPurchaseAt: toDate((data as { lastPurchaseAt?: unknown }).lastPurchaseAt),
        lastActiveAt: toDate((data as { lastActiveAt?: unknown }).lastActiveAt),
        lastAbandonedCartAt: toDate(
          (data as { lastAbandonedCartAt?: unknown }).lastAbandonedCartAt ??
            (data as { abandonedCartAt?: unknown }).abandonedCartAt
        ),
        lastAbandonedCartValue: toNumber(
          (data as { lastAbandonedCartValue?: unknown }).lastAbandonedCartValue ??
            (data as { abandonedCartValue?: unknown }).abandonedCartValue,
          0
        ),
      };
    } catch (error) {
      console.error(
        `[promotions] Failed to fetch user data for ${userId}`,
        error
      );
      return null;
    }
  }
}

export const promotionEngine = new PromotionEngine();
export default PromotionEngine;
