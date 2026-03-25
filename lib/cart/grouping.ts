import type {
  AppliedPromotion,
  Cart,
  CartItem,
  CartPromotionGroup,
  CartViewModel,
} from "./types";
import { buildPromotionSummaries } from "./discountBreakdown";

/**
 * Groups cart items by their associated promotion/deal for collapsible display.
 */
export function groupCartItemsByPromotion(cart: Cart): CartPromotionGroup[] {
  const groups = new Map<string, CartPromotionGroup>();

  for (const item of cart.items) {
    const promo = item.appliedPromotion;
    const groupId = promo ? `${promo.type}:${promo.id}` : "ungrouped";

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        groupId,
        groupType: promo?.type ?? "ungrouped",
        displayName: promo?.name ?? "Other Items",
        tagline: promo ? getPromoTagline(promo) : undefined,
        badge: promo ? formatDiscountBadge(promo) : undefined,
        badgeColor: undefined, // Will be fetched from promotion data
        imageUrl: undefined,
        items: [],
        originalTotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        isCollapsible: !!promo,
        expiresAt: promo?.expiresAt,
        isEditable: !promo || promo.type === "deal", // Bundles may have restrictions
        editRestrictions: getEditRestrictions(promo),
      });
    }

    const group = groups.get(groupId)!;
    group.items.push(item);
    group.originalTotal += item.unitPrice * item.quantity;
    group.finalTotal += item.lineTotal;
    group.discountAmount += item.unitPrice * item.quantity - item.lineTotal;
  }

  // Sort: promotions first, then deals, then ungrouped
  const sortOrder = { promotion: 0, deal: 1, ungrouped: 2 } as const;
  return Array.from(groups.values()).sort(
    (a, b) => sortOrder[a.groupType] - sortOrder[b.groupType]
  );
}

/**
 * Build the complete cart view model for rendering
 */
export function buildCartViewModel(cart: Cart): CartViewModel {
  const groups = groupCartItemsByPromotion(cart);
  const appliedPromotions =
    cart.appliedPromotions.length > 0
      ? cart.appliedPromotions
      : deriveAppliedPromotions(cart.items);
  const promotionSummaries = buildPromotionSummaries(cart.items);

  return {
    id: cart.id,
    groups,
    summary: {
      subtotal: cart.subtotal,
      totalDiscount: cart.totalDiscount,
      total: cart.total,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      promotionCount: groups.filter((g) => g.groupType !== "ungrouped").length,
      appliedPromotions,
      promotionSummaries,
    },
  };
}

function getPromoTagline(promo: NonNullable<CartItem["appliedPromotion"]>): string {
  if (promo.discountType === "percentage") {
    return `${promo.discountValue}% off your purchase`;
  }
  return `Save $${promo.discountAmount.toFixed(2)}`;
}

function formatDiscountBadge(promo: NonNullable<CartItem["appliedPromotion"]>): string {
  if (promo.discountType === "percentage") {
    return `${Math.round(promo.discountValue)}% OFF`;
  }
  return `SAVE $${promo.discountAmount.toFixed(2)}`;
}

function getEditRestrictions(promo: CartItem["appliedPromotion"]) {
  if (!promo) return undefined;

  // Bundle promotions typically have restrictions
  if (promo.type === "promotion") {
    return {
      minQuantity: 1,
      fixedProducts: false, // Allow swapping in bundles
    };
  }

  return undefined;
}

function deriveAppliedPromotions(items: CartItem[]): AppliedPromotion[] {
  const grouped = new Map<string, AppliedPromotion>();

  items.forEach((item) => {
    const promotion = item.appliedPromotion;
    if (!promotion) return;

    const key = `${promotion.type}:${promotion.id}`;
    const discountAmount = Math.max(0, promotion.discountAmount ?? 0);
    const existing = grouped.get(key);
    if (existing) {
      grouped.set(key, {
        ...existing,
        discountAmount: existing.discountAmount + discountAmount,
      });
    } else {
      grouped.set(key, { ...promotion, discountAmount });
    }
  });

  return Array.from(grouped.values()).sort(
    (a, b) => b.discountAmount - a.discountAmount
  );
}
