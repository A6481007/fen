export type SegmentType = "firstTime" | "returning" | "vip" | "cartAbandoner" | "inactive";

export interface UserSegmentData {
  ordersCount: number;
  ltv: number;
  lastPurchaseAt: Date | null;
  abandonedCarts: number;
  lastCartAbandonedAt: Date | null;
  lastCartValue: number | null;
  accountCreatedAt: Date;
  emailVerified: boolean;
  isSubscriber: boolean;
}

export const SEGMENT_CONFIG = {
  vip: {
    orderThreshold: 5,
    ltvThreshold: 500,
  },
  inactive: {
    daysSinceLastPurchase: 30,
  },
  cartAbandoner: {
    windowDays: 7,
    minCartValue: 10,
  },
  returning: {
    minOrders: 1,
    maxOrders: 4,
  },
} as const;

export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function isVIP(data: UserSegmentData): boolean {
  return (
    data.ordersCount >= SEGMENT_CONFIG.vip.orderThreshold ||
    data.ltv >= SEGMENT_CONFIG.vip.ltvThreshold
  );
}

export function isCartAbandoner(data: UserSegmentData): boolean {
  if (!data.lastCartAbandonedAt) return false;
  if (
    data.lastCartValue &&
    data.lastCartValue < SEGMENT_CONFIG.cartAbandoner.minCartValue
  ) {
    return false;
  }
  const daysSinceAbandonment = daysBetween(data.lastCartAbandonedAt, new Date());
  return daysSinceAbandonment <= SEGMENT_CONFIG.cartAbandoner.windowDays;
}

export function isInactive(data: UserSegmentData): boolean {
  if (data.ordersCount === 0) return false;
  if (!data.lastPurchaseAt) return false;
  const daysSinceLastPurchase = daysBetween(data.lastPurchaseAt, new Date());
  return daysSinceLastPurchase >= SEGMENT_CONFIG.inactive.daysSinceLastPurchase;
}

export function isReturning(data: UserSegmentData): boolean {
  return (
    data.ordersCount >= SEGMENT_CONFIG.returning.minOrders &&
    data.ordersCount <= SEGMENT_CONFIG.returning.maxOrders
  );
}

export function isFirstTime(data: UserSegmentData): boolean {
  return data.ordersCount === 0;
}

export function deriveSegment(data: UserSegmentData): SegmentType {
  if (isVIP(data)) return "vip";
  if (isCartAbandoner(data)) return "cartAbandoner";
  if (isInactive(data)) return "inactive";
  if (isReturning(data)) return "returning";
  return "firstTime";
}

export function getSegmentPriority(segment: SegmentType): number {
  const priorities: Record<SegmentType, number> = {
    vip: 100,
    cartAbandoner: 80,
    inactive: 60,
    returning: 40,
    firstTime: 20,
  };
  return priorities[segment] ?? 0;
}

export function matchesTargetSegment(
  userSegment: SegmentType,
  targetSegment: SegmentType | "allCustomers",
): boolean {
  if (targetSegment === "allCustomers") return true;
  return userSegment === targetSegment;
}

export function getAllQualifyingSegments(data: UserSegmentData): SegmentType[] {
  const segments: SegmentType[] = [];

  if (isVIP(data)) segments.push("vip");
  if (isCartAbandoner(data)) segments.push("cartAbandoner");
  if (isInactive(data)) segments.push("inactive");
  if (isReturning(data)) segments.push("returning");
  if (isFirstTime(data)) segments.push("firstTime");

  return segments;
}

export interface SegmentResult {
  primary: SegmentType;
  all: SegmentType[];
  priority: number;
  metadata: {
    ordersCount: number;
    ltv: number;
    daysSinceLastPurchase: number | null;
    daysSinceLastAbandonment: number | null;
  };
}

export function getFullSegmentResult(data: UserSegmentData): SegmentResult {
  const primary = deriveSegment(data);
  return {
    primary,
    all: getAllQualifyingSegments(data),
    priority: getSegmentPriority(primary),
    metadata: {
      ordersCount: data.ordersCount,
      ltv: data.ltv,
      daysSinceLastPurchase: data.lastPurchaseAt
        ? daysBetween(data.lastPurchaseAt, new Date())
        : null,
      daysSinceLastAbandonment: data.lastCartAbandonedAt
        ? daysBetween(data.lastCartAbandonedAt, new Date())
        : null,
    },
  };
}
