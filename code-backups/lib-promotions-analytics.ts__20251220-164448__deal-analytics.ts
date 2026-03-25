import { adminDb, FieldValue, Timestamp } from "@/lib/firebaseAdmin";

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

export interface VariantMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cvr: number;
  revenuePerImpression: number;
}

export interface VariantAnalytics {
  campaignId: string;
  variants: {
    control: VariantMetrics;
    variantA: VariantMetrics;
    variantB: VariantMetrics;
  };
  winner: "control" | "variantA" | "variantB" | "inconclusive";
  confidence: number;
  sampleSize: {
    control: number;
    variantA: number;
    variantB: number;
  };
  startDate: Date;
  endDate: Date;
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

const dailyRollupCollection = (campaignId: string) =>
  analyticsCollection(campaignId).doc("daily").collection("days");

const realTimeDocRef = (campaignId: string) =>
  analyticsCollection(campaignId).doc(REAL_TIME_DOC_ID);

const dailyRollupDocRef = (campaignId: string, date: string) =>
  dailyRollupCollection(campaignId).doc(date);

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

const AB_TESTING_CONFIG = {
  minSampleSizePerVariant: 100,
  minConversionsPerVariant: 5,
  significanceThreshold: 0.95, // 95% confidence
} as const;

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

const normalCdf = (z: number): number => {
  // Abramowitz and Stegun approximation for the standard normal CDF
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absZ);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erfApprox =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absZ * absZ));
  return 0.5 * (1 + sign * erfApprox);
};

const chiSquaredPValue = (chiSquared: number): number => {
  if (chiSquared <= 0) return 1;
  const z = Math.sqrt(chiSquared);
  const upperTail = 1 - normalCdf(z);
  const twoTailed = Math.min(1, Math.max(0, upperTail * 2));
  return twoTailed;
};

const computeChiSquaredConfidence = (
  variant: VariantMetrics,
  baseline: VariantMetrics,
): { confidence: number; pValue: number; chiSquared: number } => {
  if (
    variant.impressions < AB_TESTING_CONFIG.minSampleSizePerVariant ||
    baseline.impressions < AB_TESTING_CONFIG.minSampleSizePerVariant ||
    variant.conversions < AB_TESTING_CONFIG.minConversionsPerVariant ||
    baseline.conversions < AB_TESTING_CONFIG.minConversionsPerVariant
  ) {
    return { confidence: 0, pValue: 1, chiSquared: 0 };
  }

  const successVariant = variant.conversions;
  const successBaseline = baseline.conversions;
  const failureVariant = Math.max(variant.impressions - successVariant, 0);
  const failureBaseline = Math.max(baseline.impressions - successBaseline, 0);

  const total = variant.impressions + baseline.impressions;
  const totalSuccess = successVariant + successBaseline;
  const totalFailure = failureVariant + failureBaseline;

  if (total === 0 || totalSuccess === 0 || totalFailure === 0) {
    return { confidence: 0, pValue: 1, chiSquared: 0 };
  }

  const expectedSuccessVariant = (totalSuccess * variant.impressions) / total;
  const expectedSuccessBaseline = (totalSuccess * baseline.impressions) / total;
  const expectedFailureVariant = (totalFailure * variant.impressions) / total;
  const expectedFailureBaseline =
    (totalFailure * baseline.impressions) / total;

  const safe = (value: number) => (value <= 0 ? 1e-9 : value);

  const chiSquared =
    ((successVariant - expectedSuccessVariant) ** 2) /
      safe(expectedSuccessVariant) +
    ((successBaseline - expectedSuccessBaseline) ** 2) /
      safe(expectedSuccessBaseline) +
    ((failureVariant - expectedFailureVariant) ** 2) /
      safe(expectedFailureVariant) +
    ((failureBaseline - expectedFailureBaseline) ** 2) /
      safe(expectedFailureBaseline);

  const pValue = chiSquaredPValue(chiSquared);
  const confidence = Math.max(0, Math.min(99, (1 - pValue) * 100));

  return { confidence, pValue, chiSquared };
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

export async function getVariantAnalytics(
  campaignId: string,
): Promise<VariantAnalytics | null> {
  try {
    const variantsDoc = await adminDb
      .collection("promotions")
      .doc(campaignId)
      .collection("analytics")
      .doc("variants")
      .get();

    if (!variantsDoc.exists) {
      return null;
    }

    const variantData = variantsDoc.data() as
      | Partial<Record<"control" | "variantA" | "variantB", unknown>>
      | undefined;

    const [controlMetrics, variantAMetrics, variantBMetrics] =
      await Promise.all([
        getVariantMetrics(campaignId, "control"),
        getVariantMetrics(campaignId, "variantA"),
        getVariantMetrics(campaignId, "variantB"),
      ]);

    const variants = {
      control: controlMetrics,
      variantA: variantAMetrics,
      variantB: variantBMetrics,
    };
    type VariantKey = keyof typeof variants;
    const variantEntries: Array<{ key: VariantKey; metrics: VariantMetrics }> =
      [
        { key: "control", metrics: controlMetrics },
        { key: "variantA", metrics: variantAMetrics },
        { key: "variantB", metrics: variantBMetrics },
      ];

    const eligibleEntries = variantEntries.filter(
      ({ metrics }) =>
        metrics.impressions >= AB_TESTING_CONFIG.minSampleSizePerVariant &&
        metrics.conversions >= AB_TESTING_CONFIG.minConversionsPerVariant,
    );

    let winner: VariantKey | "inconclusive" = "inconclusive";
    let confidence = 0;

    const controlEligible = eligibleEntries.find(
      (entry) => entry.key === "control",
    );

    if (controlEligible && eligibleEntries.length >= 2) {
      const sortedByCvr = [...eligibleEntries].sort(
        (a, b) => b.metrics.cvr - a.metrics.cvr,
      );
      const leader = sortedByCvr[0];
      const challenger =
        leader.key === "control"
          ? sortedByCvr.find((entry) => entry.key !== "control")
          : controlEligible;

      if (leader && challenger) {
        const { confidence: computedConfidence } = computeChiSquaredConfidence(
          leader.metrics,
          challenger.metrics,
        );

        confidence = Math.round(computedConfidence);
        if (
          computedConfidence >=
          AB_TESTING_CONFIG.significanceThreshold * 100
        ) {
          winner = leader.key;
        }
      }
    }

    const promoDoc = await adminDb
      .collection("promotions")
      .doc(campaignId)
      .get();
    const promoData = promoDoc.data();

    const startDate =
      promoData?.startDate instanceof Timestamp
        ? promoData.startDate.toDate()
        : promoData?.startDate instanceof Date
          ? promoData.startDate
          : new Date();
    const endDate =
      promoData?.endDate instanceof Timestamp
        ? promoData.endDate.toDate()
        : promoData?.endDate instanceof Date
          ? promoData.endDate
          : new Date();

    return {
      campaignId,
      variants,
      winner,
      confidence: Math.round(confidence),
      sampleSize: {
        control: toNumber(variantData?.control, controlMetrics.impressions),
        variantA: toNumber(variantData?.variantA, variantAMetrics.impressions),
        variantB: toNumber(variantData?.variantB, variantBMetrics.impressions),
      },
      startDate,
      endDate,
    };
  } catch (error) {
    console.error("Error fetching variant analytics:", error);
    return null;
  }
}

export async function getVariantMetrics(
  campaignId: string,
  variant: string,
): Promise<VariantMetrics> {
  const interactionsSnap = await adminDb
    .collection("promotions")
    .doc(campaignId)
    .collection("interactions")
    .where("variant", "==", variant)
    .get();

  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let revenue = 0;

  interactionsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.action === "view") impressions++;
    if (data.action === "click") clicks++;
    if (data.action === "purchase") {
      conversions++;
      revenue += toNumber((data as any).orderValue, 0);
    }
  });

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = impressions > 0 ? (conversions / impressions) * 100 : 0;
  const revenuePerImpression = impressions > 0 ? revenue / impressions : 0;

  return {
    impressions,
    clicks,
    conversions,
    revenue,
    ctr: Math.round(ctr * 100) / 100,
    cvr: Math.round(cvr * 100) / 100,
    revenuePerImpression:
      Math.round(revenuePerImpression * 100) / 100,
  };
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
