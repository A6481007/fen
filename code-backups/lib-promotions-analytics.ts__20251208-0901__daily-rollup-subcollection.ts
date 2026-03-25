import { adminDb, FieldValue, Timestamp } from "../firebaseAdmin";

export type MetricType =
  | "impressions"
  | "clicks"
  | "addToCarts"
  | "conversions";
export type UserAction = "view" | "click" | "addToCart" | "purchase";

export interface PromotionAnalytics {
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  totalDiscountSpent: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  lastUpdated: Timestamp;
}

export interface UserPromoHistory {
  campaignId: string;
  firstSeenAt: Timestamp;
  lastInteractionAt: Timestamp;
  purchased: boolean;
  interactions: InteractionEntry[];
  viewCount: number;
  clickCount: number;
  addToCartCount: number;
  purchaseCount: number;
  totalSpent: number;
  totalDiscount: number;
}

type PromotionSnapshot = Omit<
  PromotionAnalytics,
  "averageOrderValue" | "conversionRate"
>;

type InteractionEntry =
  | {
      action: UserAction;
      at: Timestamp;
    }
  | {
      action: UserAction;
      at: Timestamp;
      metadata: object;
    };

const REAL_TIME_DOC_ID = "real-time";

const createDefaultAnalyticsSnapshot = (): PromotionSnapshot => ({
  impressions: 0,
  clicks: 0,
  addToCarts: 0,
  conversions: 0,
  totalDiscountSpent: 0,
  totalRevenue: 0,
  lastUpdated: Timestamp.now(),
});

const actionCountField: Record<UserAction, keyof UserPromoHistory> = {
  view: "viewCount",
  click: "clickCount",
  addToCart: "addToCartCount",
  purchase: "purchaseCount",
};

const promotionCollection = (campaignId: string) =>
  adminDb.collection("promotions").doc(campaignId);

const analyticsCollection = (campaignId: string) =>
  promotionCollection(campaignId).collection("analytics");

const realTimeDocRef = (campaignId: string) =>
  analyticsCollection(campaignId).doc(REAL_TIME_DOC_ID);

const dailyRollupDocRef = (campaignId: string, date: string) =>
  analyticsCollection(campaignId).doc(`daily-${date}`);

const userPromotionDocRef = (userId: string, campaignId: string) =>
  adminDb
    .collection("users")
    .doc(userId)
    .collection("promotions")
    .doc(campaignId);

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTimestamp = (value: unknown, fallback: Timestamp) => {
  return value instanceof Timestamp ? value : fallback;
};

const buildInteractionEntry = (
  action: UserAction,
  now: Timestamp,
  metadata?: object,
): InteractionEntry => {
  if (metadata && typeof metadata === "object") {
    return { action, at: now, metadata };
  }

  return { action, at: now };
};

export async function initializePromotionAnalytics(campaignId: string) {
  const realTimeRef = realTimeDocRef(campaignId);

  try {
    const snapshot = await realTimeRef.get();
    if (snapshot.exists) {
      return;
    }

    await realTimeRef.set(createDefaultAnalyticsSnapshot());
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Failed to initialize analytics document`,
      error,
    );
  }
}

export async function incrementPromotionMetric(
  campaignId: string,
  metric: MetricType,
  value = 1,
): Promise<boolean> {
  const realTimeRef = realTimeDocRef(campaignId);
  const incrementBy = toNumber(value, 1);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(realTimeRef);
      const now = Timestamp.now();

      if (!snapshot.exists) {
        tx.set(realTimeRef, {
          ...createDefaultAnalyticsSnapshot(),
          [metric]: incrementBy,
          lastUpdated: now,
        });
        return;
      }

      tx.update(realTimeRef, {
        [metric]: FieldValue.increment(incrementBy),
        lastUpdated: now,
      });
    });

    return true;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Failed to increment metric "${metric}"`,
      error,
    );
    return false;
  }
}

export async function recordPromotionSpend(
  campaignId: string,
  discountAmount: number,
  orderValue: number,
): Promise<boolean> {
  const realTimeRef = realTimeDocRef(campaignId);
  const discount = toNumber(discountAmount, 0);
  const revenue = toNumber(orderValue, 0);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(realTimeRef);
      const now = Timestamp.now();

      if (!snapshot.exists) {
        tx.set(realTimeRef, {
          ...createDefaultAnalyticsSnapshot(),
          conversions: 1,
          totalDiscountSpent: discount,
          totalRevenue: revenue,
          lastUpdated: now,
        });
        return;
      }

      tx.update(realTimeRef, {
        conversions: FieldValue.increment(1),
        totalDiscountSpent: FieldValue.increment(discount),
        totalRevenue: FieldValue.increment(revenue),
        lastUpdated: now,
      });
    });

    return true;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Failed to record promotion spend`,
      error,
    );
    return false;
  }
}

export async function getPromotionAnalytics(
  campaignId: string,
): Promise<PromotionAnalytics | null> {
  const realTimeRef = realTimeDocRef(campaignId);

  try {
    const snapshot = await realTimeRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as Partial<PromotionSnapshot> | undefined;
    const impressions = toNumber(data?.impressions);
    const clicks = toNumber(data?.clicks);
    const addToCarts = toNumber(data?.addToCarts);
    const conversions = toNumber(data?.conversions);
    const totalDiscountSpent = toNumber(data?.totalDiscountSpent);
    const totalRevenue = toNumber(data?.totalRevenue);
    const lastUpdated = toTimestamp(
      data?.lastUpdated,
      Timestamp.fromMillis(0),
    );

    const averageOrderValue =
      conversions > 0 ? totalRevenue / conversions : 0;
    const conversionRate =
      impressions > 0 ? conversions / impressions : 0;

    return {
      impressions,
      clicks,
      addToCarts,
      conversions,
      totalDiscountSpent,
      totalRevenue,
      averageOrderValue,
      conversionRate,
      lastUpdated,
    };
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Failed to fetch promotion analytics`,
      error,
    );
    return null;
  }
}

export async function checkBudgetAvailable(
  campaignId: string,
  budgetCap: number,
): Promise<boolean> {
  if (budgetCap <= 0) {
    return false;
  }

  const bufferThreshold = budgetCap * 0.95;

  try {
    const totalDiscountSpent = await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(realTimeDocRef(campaignId));
      const data = snapshot.data() as Partial<PromotionSnapshot> | undefined;
      return toNumber(data?.totalDiscountSpent, 0);
    });

    return totalDiscountSpent < bufferThreshold;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Budget availability check failed`,
      error,
    );
    return false;
  }
}

export async function checkUsageLimitAvailable(
  campaignId: string,
  usageLimit: number,
): Promise<boolean> {
  if (usageLimit <= 0) {
    return false;
  }

  try {
    const analytics = await getPromotionAnalytics(campaignId);
    if (!analytics) {
      return true;
    }

    return analytics.conversions < usageLimit;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Usage limit check failed`,
      error,
    );
    return false;
  }
}

export async function trackUserPromoInteraction(
  userId: string,
  campaignId: string,
  action: UserAction,
  metadata?: object,
): Promise<boolean> {
  const docRef = userPromotionDocRef(userId, campaignId);
  const interactionAt = Timestamp.now();
  const interactionEntry = buildInteractionEntry(
    action,
    interactionAt,
    metadata,
  );

  const purchaseValue =
    action === "purchase" ? toNumber((metadata as any)?.orderValue, 0) : 0;
  const purchaseDiscount =
    action === "purchase" ? toNumber((metadata as any)?.discountAmount, 0) : 0;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);

      if (!snapshot.exists) {
        tx.set(docRef, {
          campaignId,
          firstSeenAt: interactionAt,
          lastInteractionAt: interactionAt,
          interactions: [interactionEntry],
          purchased: action === "purchase",
          totalSpent: purchaseValue,
          totalDiscount: purchaseDiscount,
          viewCount: action === "view" ? 1 : 0,
          clickCount: action === "click" ? 1 : 0,
          addToCartCount: action === "addToCart" ? 1 : 0,
          purchaseCount: action === "purchase" ? 1 : 0,
        });
        return;
      }

      const updates: Record<string, unknown> = {
        lastInteractionAt: interactionAt,
        interactions: FieldValue.arrayUnion(interactionEntry),
      };

      const countField = actionCountField[action];
      updates[countField] = FieldValue.increment(1);

      if (action === "purchase") {
        updates.purchased = true;
        updates.totalSpent = FieldValue.increment(purchaseValue);
        updates.totalDiscount = FieldValue.increment(purchaseDiscount);
      }

      tx.update(docRef, updates);
    });

    return true;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}][user:${userId}] Failed to track interaction "${action}"`,
      error,
    );
    return false;
  }
}

export async function getUserPromotionHistory(
  userId: string,
  campaignId: string,
): Promise<UserPromoHistory | null> {
  const docRef = userPromotionDocRef(userId, campaignId);

  try {
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as Partial<UserPromoHistory> | undefined;
    const purchaseCount = toNumber(data?.purchaseCount);
    const firstSeenAt = toTimestamp(
      data?.firstSeenAt,
      Timestamp.fromMillis(0),
    );
    const lastInteractionAt = toTimestamp(
      data?.lastInteractionAt,
      firstSeenAt,
    );
    const purchased = data?.purchased === true || purchaseCount > 0;
    const interactions: InteractionEntry[] = Array.isArray(data?.interactions)
      ? (data.interactions as unknown[])
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }

            const action = (entry as any).action;
            if (
              action !== "view" &&
              action !== "click" &&
              action !== "addToCart" &&
              action !== "purchase"
            ) {
              return null;
            }

            const at = toTimestamp((entry as any).at, firstSeenAt);
            const metadata = (entry as any).metadata;

            if (metadata && typeof metadata === "object") {
              return { action, at, metadata } as InteractionEntry;
            }

            return { action, at } as InteractionEntry;
          })
          .filter(
            (entry): entry is InteractionEntry =>
              entry !== null && entry.at instanceof Timestamp,
          )
      : [];

    return {
      campaignId,
      firstSeenAt,
      lastInteractionAt,
      purchased,
      interactions,
      viewCount: toNumber(data?.viewCount),
      clickCount: toNumber(data?.clickCount),
      addToCartCount: toNumber(data?.addToCartCount),
      purchaseCount,
      totalSpent: toNumber(data?.totalSpent),
      totalDiscount: toNumber(data?.totalDiscount),
    };
  } catch (error) {
    console.error(
      `[promotions][${campaignId}][user:${userId}] Failed to fetch user promotion history`,
      error,
    );
    return null;
  }
}

export async function checkPerCustomerLimit(
  userId: string,
  campaignId: string,
  limit: number,
): Promise<boolean> {
  if (limit <= 0) {
    return false;
  }

  try {
    const history = await getUserPromotionHistory(userId, campaignId);
    const purchaseCount = history?.purchaseCount ?? 0;

    return purchaseCount < limit;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}][user:${userId}] Failed per-customer limit check`,
      error,
    );
    return false;
  }
}

export async function recordDailyRollup(
  campaignId: string,
  date: string,
): Promise<boolean> {
  const realTimeRef = realTimeDocRef(campaignId);
  const dailyRef = dailyRollupDocRef(campaignId, date);

  try {
    const wrote = await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(realTimeRef);
      const now = Timestamp.now();

      if (!snapshot.exists) {
        console.warn(
          `[promotions][${campaignId}] Skipping daily rollup for ${date}: real-time analytics not initialized`,
        );
        return false;
      }

      const data = snapshot.data() as Partial<PromotionSnapshot> | undefined;

      const impressions = toNumber(data?.impressions);
      const clicks = toNumber(data?.clicks);
      const addToCarts = toNumber(data?.addToCarts);
      const conversions = toNumber(data?.conversions);
      const totalDiscountSpent = toNumber(data?.totalDiscountSpent);
      const totalRevenue = toNumber(data?.totalRevenue);

      const averageOrderValue =
        conversions > 0 ? totalRevenue / conversions : 0;
      const conversionRate =
        impressions > 0 ? conversions / impressions : 0;

      tx.set(dailyRef, {
        impressions,
        clicks,
        addToCarts,
        conversions,
        totalDiscountSpent,
        totalRevenue,
        averageOrderValue,
        conversionRate,
        lastUpdated: now,
        date,
      });

      return true;
    });

    return wrote === true;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Failed to record daily rollup for ${date}`,
      error,
    );
    return false;
  }
}
