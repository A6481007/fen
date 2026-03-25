import type {
  AppliedPromotion,
  Cart,
  CartItem,
  CartItemWithContext,
  CartPromotionGroup,
  CartViewModel,
} from "./types";
import { buildPromotionSummaries } from "./discountBreakdown";

const buildBadgeText = (promotion?: AppliedPromotion): string | undefined => {
  if (!promotion) return undefined;
  if (promotion.discountType === "percentage") {
    return `${Math.max(0, promotion.discountValue)}% OFF`;
  }
  if (promotion.discountAmount > 0) {
    return `Save ${promotion.discountAmount}`;
  }
  return undefined;
};

const buildBadgeColor = (promotion?: AppliedPromotion): string | undefined => {
  if (!promotion) return undefined;
  return promotion.type === "deal" ? "#2563eb" : "#059669";
};

const computeLineSavings = (item: CartItem): number =>
  Math.max(0, item.unitPrice * item.quantity - item.lineTotal);

const deriveAppliedPromotions = (items: CartItem[]): AppliedPromotion[] => {
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
};

const enhanceItemWithContext = (item: CartItem, groupId: string): CartItemWithContext => {
  const lineSavings = computeLineSavings(item);
  return {
    ...item,
    groupId,
    originalPrice: item.unitPrice,
    itemSavings: lineSavings,
    isFreeItem: item.lineTotal <= 0 && item.unitPrice * item.quantity > 0,
  };
};

export const buildCartViewModel = (cart: Cart | null | undefined): CartViewModel => {
  const items = cart?.items ?? [];
  const groups = new Map<string, CartPromotionGroup>();

  items.forEach((item) => {
    const promotion = item.appliedPromotion;
    const groupId = promotion ? `${promotion.type}:${promotion.id}` : "ungrouped";
    const groupType = promotion ? promotion.type : "ungrouped";
    const displayName = promotion?.name ?? "Other items";
    const badge = buildBadgeText(promotion);
    const badgeColor = buildBadgeColor(promotion);
    const lineSavings = computeLineSavings(item);
    const originalTotal = item.unitPrice * item.quantity;
    const lineFinalTotal = item.lineTotal;

    const existing = groups.get(groupId);
    if (!existing) {
      groups.set(groupId, {
        groupId,
        groupType,
        displayName,
        tagline: promotion ? undefined : undefined,
        badge,
        badgeColor,
        imageUrl:
          (item as any).imageUrl ??
          (item as any).thumbnail ??
          (item as any).thumbnailUrl ??
          item.product?.imageUrl ??
          null ??
          undefined,
        items: [enhanceItemWithContext(item, groupId)],
        originalTotal,
        discountAmount: lineSavings,
        finalTotal: lineFinalTotal,
        isCollapsible: groupType !== "ungrouped",
        expiresAt: promotion?.expiresAt,
        isEditable: true,
      });
      return;
    }

    existing.items.push(enhanceItemWithContext(item, groupId));
    existing.originalTotal += originalTotal;
    existing.discountAmount += lineSavings;
    existing.finalTotal += lineFinalTotal;
    if (!existing.imageUrl) {
      existing.imageUrl =
        (item as any).imageUrl ??
        (item as any).thumbnail ??
        (item as any).thumbnailUrl ??
        item.product?.imageUrl ??
        undefined;
    }
    if (!existing.expiresAt && promotion?.expiresAt) {
      existing.expiresAt = promotion.expiresAt;
    }
  });

  // Ensure we always surface an ungrouped bucket when there are no promotions
  if (!groups.size) {
    groups.set("ungrouped", {
      groupId: "ungrouped",
      groupType: "ungrouped",
      displayName: "Items",
      items: [],
      originalTotal: 0,
      discountAmount: 0,
      finalTotal: 0,
      isCollapsible: false,
      isEditable: true,
    });
  }

  const groupList = Array.from(groups.values());
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const promotionCount = groupList.filter((group) => group.groupType !== "ungrouped").length;
  const appliedPromotions =
    cart?.appliedPromotions?.length ? cart.appliedPromotions : deriveAppliedPromotions(items);
  const promotionSummaries = buildPromotionSummaries(items);

  return {
    id: cart?.id ?? "cart",
    groups: groupList,
    summary: {
      subtotal: cart?.subtotal ?? 0,
      totalDiscount: cart?.totalDiscount ?? 0,
      total: cart?.total ?? 0,
      itemCount,
      promotionCount,
      appliedPromotions,
      promotionSummaries,
    },
  };
};
