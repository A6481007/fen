"use server";

import {
  ActionResult,
  PaginatedResult,
  PaginationParams,
  backofficeReadClient,
  normalizePagination,
  nowIso,
  withActionAuth,
  withFirestore,
  normalizeDocumentIds,
  resolveLocaleReference,
} from "./common";
import { backendClient } from "@/sanity/lib/backendClient";

export type PromotionStatus = "draft" | "scheduled" | "active" | "paused" | "ended" | string;

type PromotionFilters = PaginationParams & {
  status?: PromotionStatus;
  type?: string;
  from?: string;
  to?: string;
  search?: string;
};

export type PromotionInput = {
  _id?: string;
  status?: PromotionStatus;
  name?: string;
  slug?: { current: string };
  campaignId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  locale?: { _type: "reference"; _ref: string } | string;
  [key: string]: unknown;
};

export type PromotionRecord = {
  _id: string;
  _type: string;
  name?: string;
  slug?: { current?: string };
  campaignId?: string;
  type?: string;
  status?: PromotionStatus;
  locale?: { _id?: string; code?: string; title?: string };
  discountType?: string;
  discountValue?: number;
  buyQuantity?: number;
  getQuantity?: number;
  minimumOrderValue?: number;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  priority?: number;
  budgetCap?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  heroMessage?: string;
  shortDescription?: string;
  badgeLabel?: string;
  badgeColor?: string;
  ctaText?: string;
  ctaLink?: string;
  publishAsBanner?: boolean;
  bannerSettings?: {
    bannerPlacement?: string;
    heroVariant?: string;
    startDate?: string;
    endDate?: string;
    titleOverride?: string;
    descriptionOverride?: string;
    ctaLabel?: string;
    ctaUrlOverride?: string;
  };
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  trackingPixelId?: string;
  internalNotes?: string;
  publishedAt?: string;
  updatedAt?: string;
  _updatedAt?: string;
  _createdAt?: string;
  targetAudience?: {
    segmentType?: string;
    categories?: { _id?: string; title?: string; slug?: { current?: string } }[];
    products?: { _id?: string; name?: string; slug?: { current?: string } }[];
    excludedProducts?: { _id?: string; name?: string; slug?: { current?: string } }[];
  };
  defaultProducts?: Array<{
    product?: { _id?: string; name?: string; slug?: { current?: string } };
    quantity?: number;
    variantId?: string;
  }>;
  defaultBundleItems?: Array<{
    product?: { _id?: string; name?: string; slug?: { current?: string } };
    quantity?: number;
    variantId?: string;
    isFree?: boolean;
  }>;
};

type PromotionAnalyticsFilters = {
  campaignId: string;
  from?: string;
  to?: string;
};

const PROMOTION_PROJECTION = `{
  _id,
  _type,
  name,
  slug,
  campaignId,
  type,
  status,
  startDate,
  endDate,
  discountType,
  discountValue,
  buyQuantity,
  getQuantity,
  minimumOrderValue,
  timezone,
  priority,
  budgetCap,
  usageLimit,
  perCustomerLimit,
  heroMessage,
  shortDescription,
  badgeLabel,
  badgeColor,
  ctaText,
  ctaLink,
  publishAsBanner,
  bannerSettings,
  utmSource,
  utmMedium,
  utmCampaign,
  trackingPixelId,
  internalNotes,
  locale->{_id, code, title},
  publishedAt,
  updatedAt,
  _updatedAt,
  _createdAt,
  targetAudience{
    segmentType,
    categories[]->{_id, title, slug},
    products[]->{_id, name, slug},
    excludedProducts[]->{_id, name, slug}
  },
  defaultBundleItems[]{
    quantity,
    variantId,
    isFree,
    product->{_id, name, slug}
  },
  defaultProducts[]{
    quantity,
    variantId,
    product->{_id, name, slug}
  }
}`;

const buildPromotionFilter = (filters: PromotionFilters) => {
  const clauses = ['(_type == "promotion" || _id in path("drafts.promotion.**"))'];
  const params: Record<string, unknown> = {};

  if (filters.status) {
    clauses.push("status == $status");
    params.status = filters.status;
  }

  if (filters.type) {
    clauses.push("type == $type");
    params.type = filters.type;
  }

  if (filters.from) {
    clauses.push("startDate >= $from");
    params.from = filters.from;
  }

  if (filters.to) {
    clauses.push("endDate <= $to");
    params.to = filters.to;
  }

  const searchTerm = typeof filters.search === "string" ? filters.search.trim() : "";
  if (searchTerm) {
    clauses.push("(name match $search || campaignId match $search)");
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  return { filter: clauses.join(" && "), params };
};

export const listPromotions = async (
  filters: PromotionFilters = {},
): Promise<ActionResult<PaginatedResult<PromotionRecord>>> => {
  return withActionAuth("marketing.promotions.read", async () => {
    const { filter, params } = buildPromotionFilter(filters);
    const { limit, offset, end } = normalizePagination(filters);
    const queryParams = { ...params, offset, end };

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<PromotionRecord[]>(
        `*[${filter}] | order(coalesce(updatedAt, _updatedAt) desc, startDate desc) [$offset...$end] ${PROMOTION_PROJECTION}`,
        queryParams,
      ),
      backofficeReadClient.fetch<number>(`count(*[${filter}])`, params),
    ]);

    return { items, total, limit, offset };
  }, { actionName: "listPromotions" });
};

export const getPromotionById = async (
  id: string,
): Promise<ActionResult<PromotionRecord | null>> => {
  const normalized = normalizeDocumentIds(id, "Promotion");
  if (!normalized) {
    return { success: false, message: "Promotion ID is required" };
  }

  return withActionAuth("marketing.promotions.read", async () => {
    const { id: normalizedId, draftId } = normalized;

    const promotion = await backofficeReadClient.fetch<PromotionRecord | null>(
      `*[_type == "promotion" && (_id == $id || _id == $draftId)][0] ${PROMOTION_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return promotion;
  }, { actionName: "getPromotionById" });
};

export const upsertPromotion = async (
  input: PromotionInput,
): Promise<ActionResult<{ _id: string }>> => {
  return withActionAuth("marketing.promotions.write", async () => {
    const { _id, ...payload } = input;
    const localeRef = await resolveLocaleReference(payload.locale);
    if (!localeRef) {
      throw new Error("Locale is required.");
    }
    const now = nowIso();
    const baseData = {
      ...payload,
      locale: localeRef,
      updatedAt: now,
      _type: "promotion",
    };

    const shouldPublish = payload.status === "active" || payload.status === "scheduled";
    if (shouldPublish && !payload.publishedAt) {
      Object.assign(baseData, { publishedAt: now });
    }

    if (_id) {
      const updated = await backendClient.patch(_id).set(baseData).commit<{ _id: string }>();
      return { _id: updated._id };
    }

    const created = await backendClient.create<{ _id?: string; _type: string; status?: string; createdAt?: string }>(
      {
        ...baseData,
        status: payload.status ?? "draft",
        createdAt: now,
      } as { _id?: string; _type: string; status?: string; createdAt?: string }
    );

    return { _id: created._id };
  }, { actionName: "upsertPromotion" });
};

export const publishPromotion = async (
  id: string,
  status: "active" | "scheduled",
): Promise<ActionResult<{ _id: string; status: string; publishedAt?: string }>> => {
  return withActionAuth("marketing.promotions.publish", async () => {
    const now = nowIso();
    const updated = await backendClient
      .patch(id)
      .set({
        status,
        publishedAt: now,
        updatedAt: now,
      })
      .commit<{ _id: string; status: string; publishedAt?: string }>();

    return updated;
  }, { actionName: "publishPromotion" });
};

export const setPromotionStatus = async (
  id: string,
  status: PromotionStatus,
): Promise<ActionResult<{ _id: string; status: PromotionStatus; updatedAt?: string; publishedAt?: string }>> => {
  return withActionAuth("marketing.promotions.publish", async () => {
    if (!status) {
      throw new Error("Status is required");
    }

    const now = nowIso();
    const isPublishing = status === "active" || status === "scheduled";

    const updated = await backendClient
      .patch(id)
      .set({
        status,
        updatedAt: now,
        ...(isPublishing ? { publishedAt: now } : {}),
      })
      .commit<{ _id: string; status: PromotionStatus; updatedAt?: string; publishedAt?: string }>();

    return updated;
  }, { actionName: "setPromotionStatus" });
};

export const getPromotionAnalytics = async (
  filters: PromotionAnalyticsFilters,
): Promise<ActionResult<{ events: unknown[]; interactions: unknown[] }>> => {
  return withActionAuth(
    ["analytics.promotions.read", "marketing.promotions.read"],
    async () => {
      const { campaignId, from, to } = filters;
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      const analyticsResult = await withFirestore(
        async (db) => {
          let analyticsQuery = db.collection("analytics").where("campaignId", "==", campaignId);
          let interactionsQuery = db.collection("interactions").where("campaignId", "==", campaignId);

          if (fromDate) {
            analyticsQuery = analyticsQuery.where("timestamp", ">=", fromDate);
            interactionsQuery = interactionsQuery.where("timestamp", ">=", fromDate);
          }

          if (toDate) {
            analyticsQuery = analyticsQuery.where("timestamp", "<=", toDate);
            interactionsQuery = interactionsQuery.where("timestamp", "<=", toDate);
          }

          const [analyticsSnap, interactionsSnap] = await Promise.all([
            analyticsQuery.limit(500).get(),
            interactionsQuery.limit(500).get(),
          ]);

          const events = analyticsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          const interactions = interactionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

          return { events, interactions };
        },
        "Failed to load promotion analytics",
      );

      if (!analyticsResult.success) {
        throw new Error(analyticsResult.message);
      }

      return analyticsResult.data;
    },
    { actionName: "getPromotionAnalytics" },
  );
};

export const deletePromotion = async (
  id: string,
): Promise<ActionResult<{ deletedId: string }>> => {
  const normalized = normalizeDocumentIds(id, "Promotion");
  if (!normalized) {
    return { success: false, message: "Promotion ID is required" };
  }

  return withActionAuth("marketing.promotions.publish", async () => {
    const { id: normalizedId, draftId } = normalized;
    await Promise.allSettled([backendClient.delete(normalizedId), backendClient.delete(draftId)]);
    return { deletedId: normalizedId };
  }, { actionName: "deletePromotion" });
};
