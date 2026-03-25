export type ActiveDealSummary = {
  _id?: string | null;
  dealId?: string | null;
  dealType?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  originalPrice?: number | null;
  dealPrice?: number | null;
  badge?: string | null;
  badgeColor?: string | null;
  discountPercent?: number | null;
  remainingQty?: number | null;
  quantityLimit?: number | null;
  soldCount?: number | null;
};

export type ProductWithActiveDeal<T> = T & {
  activeDeal?: ActiveDealSummary | null;
};

export const resolveActiveDeal = (
  product?: { activeDeal?: unknown } | null
): ActiveDealSummary | null => {
  if (!product || typeof product !== "object") return null;
  const deal = (product as { activeDeal?: unknown }).activeDeal;
  if (!deal || typeof deal !== "object") return null;
  return deal as ActiveDealSummary;
};

export const resolveDealId = (deal?: ActiveDealSummary | null): string | null => {
  const dealId =
    typeof deal?.dealId === "string" && deal.dealId.trim()
      ? deal.dealId.trim()
      : "";
  if (dealId) return dealId;
  const fallback = typeof deal?._id === "string" ? deal._id : "";
  return fallback || null;
};

export const resolveDealPrice = (
  deal?: ActiveDealSummary | null,
  fallback?: number | null
): number | null => {
  if (typeof deal?.dealPrice === "number" && Number.isFinite(deal.dealPrice)) {
    return deal.dealPrice;
  }
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return fallback;
  }
  return null;
};

export const resolveDealOriginalPrice = (
  deal?: ActiveDealSummary | null,
  fallback?: number | null
): number | null => {
  if (typeof deal?.originalPrice === "number" && Number.isFinite(deal.originalPrice)) {
    return deal.originalPrice;
  }
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return fallback;
  }
  return null;
};

export const resolveDealPercent = (
  deal?: ActiveDealSummary | null,
  basePrice?: number | null,
  dealPrice?: number | null
): number | null => {
  if (typeof deal?.discountPercent === "number" && Number.isFinite(deal.discountPercent)) {
    return Math.max(0, Math.round(deal.discountPercent));
  }
  if (
    typeof basePrice === "number" &&
    Number.isFinite(basePrice) &&
    typeof dealPrice === "number" &&
    Number.isFinite(dealPrice) &&
    basePrice > 0
  ) {
    return Math.max(0, Math.round(((basePrice - dealPrice) / basePrice) * 100));
  }
  return null;
};

export const resolveDealRemainingQty = (
  deal?: ActiveDealSummary | null
): number | null => {
  if (typeof deal?.remainingQty === "number" && Number.isFinite(deal.remainingQty)) {
    return Math.max(0, Math.floor(deal.remainingQty));
  }
  if (typeof deal?.quantityLimit === "number" && Number.isFinite(deal.quantityLimit)) {
    const sold = typeof deal?.soldCount === "number" && Number.isFinite(deal.soldCount)
      ? deal.soldCount
      : 0;
    return Math.max(0, Math.floor(deal.quantityLimit - sold));
  }
  return null;
};

export const isDealActive = (deal?: ActiveDealSummary | null): boolean => {
  if (!deal) return false;
  if (deal.status && deal.status !== "active") return false;
  const now = Date.now();
  const startsAt = deal.startDate ? new Date(deal.startDate).getTime() : NaN;
  const endsAt = deal.endDate ? new Date(deal.endDate).getTime() : NaN;
  if (!Number.isNaN(startsAt) && startsAt > now) return false;
  if (!Number.isNaN(endsAt) && endsAt < now) return false;
  return true;
};
