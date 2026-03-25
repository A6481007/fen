import type { AppliedPromotion, PromotionSummary } from "./types";

export type DiscountBreakdownLineItem = {
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
  product?: { price?: number | null } | null;
  appliedPromotion?: AppliedPromotion;
};

export type DiscountBreakdownEntry = {
  key: string;
  promotion: AppliedPromotion;
  savings: number;
};

export const buildPromotionSummaries = (
  items: DiscountBreakdownLineItem[]
): PromotionSummary[] =>
  buildDiscountBreakdown(items).map((entry) => ({
    id: entry.promotion.id,
    type: entry.promotion.type,
    name: entry.promotion.name?.trim() || entry.promotion.id,
    discountAmount: entry.savings,
  }));

export const buildDiscountBreakdown = (
  items: DiscountBreakdownLineItem[]
): DiscountBreakdownEntry[] => {
  const grouped = new Map<string, { promotion: AppliedPromotion; savings: number }>();

  for (const item of items) {
    const promotion = item.appliedPromotion;
    if (!promotion) continue;

    const unitPrice = item.unitPrice ?? item.product?.price ?? 0;
    const baseLineTotal = unitPrice * item.quantity;
    const discountedLineTotal =
      typeof item.lineTotal === "number" ? item.lineTotal : baseLineTotal;
    const savings = Math.max(0, baseLineTotal - discountedLineTotal);
    if (savings <= 0) continue;

    const key = `${promotion.type}:${promotion.id}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.savings += savings;
    } else {
      grouped.set(key, { promotion, savings });
    }
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.savings - a.savings);
};
