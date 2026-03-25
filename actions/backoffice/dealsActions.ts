"use server";

import {
  ActionResult,
  PaginatedResult,
  PaginationParams,
  backofficeReadClient,
  normalizePagination,
  nowIso,
  withActionAuth,
  normalizeDocumentIds,
  resolveLocaleReference,
} from "./common";
import { backendClient } from "@/sanity/lib/backendClient";

export type DealStatus = "draft" | "active" | "ended" | string;

export type DealFilters = PaginationParams & {
  status?: DealStatus;
  dealType?: string;
  from?: string;
  to?: string;
  search?: string;
};

export type DealInput = {
  _id?: string;
  status?: DealStatus;
  dealId?: string;
  title?: string;
  dealType?: string;
  product?: { _type: "reference"; _ref: string } | null;
  locale?: { _type: "reference"; _ref: string } | string;
  originalPrice?: number;
  dealPrice?: number;
  badge?: string;
  badgeColor?: string;
  showOnHomepage?: boolean;
  priority?: number;
  startDate?: string;
  endDate?: string;
  quantityLimit?: number;
  perCustomerLimit?: number;
  soldCount?: number;
  seoMetadata?: unknown;
  allowSoldCountOverride?: boolean;
  [key: string]: unknown;
};

export type DealRecord = {
  _id: string;
  _type: string;
  dealId?: string;
  title?: string;
  dealType?: string;
  status?: DealStatus;
  locale?: { _id?: string; code?: string; title?: string };
  badge?: string;
  badgeColor?: string;
  showOnHomepage?: boolean;
  priority?: number;
  startDate?: string;
  endDate?: string;
  originalPrice?: number;
  dealPrice?: number;
  quantityLimit?: number;
  perCustomerLimit?: number;
  soldCount?: number;
  product?: { _id?: string; name?: string; slug?: { current?: string } };
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
  publishedAt?: string;
  updatedAt?: string;
  _updatedAt?: string;
  _createdAt?: string;
};

const DEAL_PROJECTION = `{
  _id,
  _type,
  dealId,
  title,
  dealType,
  status,
  badge,
  badgeColor,
  showOnHomepage,
  priority,
  startDate,
  endDate,
  originalPrice,
  dealPrice,
  quantityLimit,
  perCustomerLimit,
  soldCount,
  product->{_id, name, slug},
  locale->{_id, code, title},
  publishAsBanner,
  bannerSettings,
  publishedAt,
  updatedAt,
  _updatedAt,
  _createdAt
}`;

const buildDealFilter = (filters: DealFilters) => {
  const clauses = ['(_type == "deal" || _id in path("drafts.deal.**"))'];
  const params: Record<string, unknown> = {};

  if (filters.status) {
    clauses.push("status == $status");
    params.status = filters.status;
  }

  if (filters.dealType) {
    clauses.push("dealType == $dealType");
    params.dealType = filters.dealType;
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
    clauses.push("(title match $search || dealId match $search)");
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  return { filter: clauses.join(" && "), params };
};

export const listDeals = async (
  filters: DealFilters = {},
): Promise<ActionResult<PaginatedResult<DealRecord>>> => {
  return withActionAuth("marketing.deals.read", async () => {
    const { filter, params } = buildDealFilter(filters);
    const { limit, offset, end } = normalizePagination(filters);
    const queryParams = { ...params, offset, end };

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<DealRecord[]>(
        `*[${filter}] | order(coalesce(updatedAt, _updatedAt) desc, startDate desc) [$offset...$end] ${DEAL_PROJECTION}`,
        queryParams,
      ),
      backofficeReadClient.fetch<number>(`count(*[${filter}])`, params),
    ]);

    return { items, total, limit, offset };
  }, { actionName: "listDeals" });
};

export const getDealById = async (id: string): Promise<ActionResult<DealRecord | null>> => {
  const normalized = normalizeDocumentIds(id, "Deal");
  if (!normalized) {
    return { success: false, message: "Deal ID is required" };
  }

  return withActionAuth("marketing.deals.read", async () => {
    const { id: normalizedId, draftId } = normalized;

    const deal = await backofficeReadClient.fetch<DealRecord | null>(
      `*[_type == "deal" && (_id == $id || _id == $draftId)][0] ${DEAL_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return deal;
  }, { actionName: "getDealById" });
};

export const upsertDeal = async (
  input: DealInput,
): Promise<ActionResult<{ _id: string }>> => {
  return withActionAuth("marketing.deals.write", async () => {
    const { _id, allowSoldCountOverride, ...payload } = input;
    const localeRef = await resolveLocaleReference(payload.locale);
    if (!localeRef) {
      throw new Error("Locale is required.");
    }
    const now = nowIso();
    const baseData: Record<string, unknown> = {
      ...payload,
      locale: localeRef,
      updatedAt: now,
      _type: "deal",
    };

    const normalizedSoldCount =
      allowSoldCountOverride && typeof payload.soldCount === "number"
        ? Math.max(0, Math.floor(payload.soldCount))
        : undefined;

    if (normalizedSoldCount !== undefined) {
      baseData.soldCount = normalizedSoldCount;
    } else {
      delete baseData.soldCount;
    }

    const shouldPublish = payload.status === "active";
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
        ...(normalizedSoldCount === undefined ? { soldCount: 0 } : {}),
      } as { _id?: string; _type: string; status?: string; createdAt?: string }
    );

    return { _id: created._id };
  }, { actionName: "upsertDeal" });
};

export const setDealStatus = async (
  id: string,
  status: DealStatus,
): Promise<ActionResult<{ _id: string; status: DealStatus; updatedAt?: string; publishedAt?: string }>> => {
  return withActionAuth("marketing.deals.publish", async () => {
    if (!status) {
      throw new Error("Status is required");
    }

    const now = nowIso();
    const isPublishing = status === "active";

    const updated = await backendClient
      .patch(id)
      .set({
        status,
        updatedAt: now,
        ...(isPublishing ? { publishedAt: now } : {}),
      })
      .commit<{ _id: string; status: DealStatus; updatedAt?: string; publishedAt?: string }>();

    return updated;
  }, { actionName: "setDealStatus" });
};

export const deleteDeal = async (
  id: string,
): Promise<ActionResult<{ deletedId: string }>> => {
  const normalized = normalizeDocumentIds(id, "Deal");
  if (!normalized) {
    return { success: false, message: "Deal ID is required" };
  }

  return withActionAuth("marketing.deals.publish", async () => {
    const { id: normalizedId, draftId } = normalized;
    await Promise.allSettled([backendClient.delete(normalizedId), backendClient.delete(draftId)]);
    return { deletedId: normalizedId };
  }, { actionName: "deleteDeal" });
};
