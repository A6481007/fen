"use server";

import { revalidatePath } from "next/cache";
import {
  listDeals,
  setDealStatus,
  upsertDeal,
  deleteDeal,
  type DealRecord,
  type DealInput,
} from "@/actions/backoffice/dealsActions";
import { backofficeReadClient, withActionAuth } from "@/actions/backoffice/common";
import type { ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import type { DealFormState } from "@/components/admin/backoffice/deals/types";

export type DealListRow = {
  id: string;
  title: string;
  dealId?: string;
  dealType?: string;
  status?: string;
  productName?: string;
  dealPrice?: number;
  originalPrice?: number;
  startDate?: string;
  endDate?: string;
  quantityLimit?: number;
  soldCount?: number;
  remainingQty?: number;
  updatedAt?: string;
};

export type DealListParams = {
  search?: string;
  status?: string;
  dealType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const DEAL_ERROR_KEYS = {
  loadDeals: "admin.marketing.deals.errors.loadDeals",
  titleRequired: "admin.marketing.deals.form.errors.titleRequired",
  dealIdRequired: "admin.marketing.deals.form.errors.dealIdRequired",
  productRequired: "admin.marketing.deals.form.errors.productRequired",
  dealPriceInvalid: "admin.marketing.deals.form.errors.dealPriceInvalid",
  endDateAfterStartDate: "admin.marketing.deals.form.errors.endDateAfterStartDate",
  saveFailed: "admin.marketing.deals.form.errors.saveFailed",
  dealIdMissing: "admin.marketing.deals.errors.dealIdRequired",
  statusRequired: "admin.marketing.deals.errors.statusRequired",
  updateStatusFailed: "admin.marketing.deals.errors.updateStatusFailed",
  deleteFailed: "admin.marketing.deals.errors.deleteFailed",
  searchProductsFailed: "admin.marketing.deals.errors.searchProductsFailed",
} as const;

const normalizePage = (params: DealListParams) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const normalizeInt = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.floor(value));
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

const toIsoString = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const formatListRow = (deal: DealRecord): DealListRow => {
  const quantityLimit = normalizeInt(deal.quantityLimit);
  const sold = normalizeInt(deal.soldCount) ?? 0;
  const remaining = typeof quantityLimit === "number" ? Math.max(quantityLimit - sold, 0) : undefined;

  return {
    id: deal._id,
    title: deal.title ?? "",
    dealId: deal.dealId,
    dealType: deal.dealType,
    status: deal.status,
    productName: deal.product?.name,
    dealPrice: deal.dealPrice,
    originalPrice: deal.originalPrice,
    startDate: deal.startDate,
    endDate: deal.endDate,
    quantityLimit,
    soldCount: sold,
    remainingQty: remaining,
    updatedAt: deal.updatedAt ?? deal._updatedAt ?? deal._createdAt,
  };
};

export type DealTableResult = {
  items: DealListRow[];
  total: number;
  page: number;
  pageSize: number;
  success: boolean;
  message?: string;
};

export async function fetchDealsTable(
  params: DealListParams = {},
): Promise<DealTableResult> {
  const { page, pageSize, offset } = normalizePage(params);
  try {
    const result = await listDeals({
      limit: pageSize,
      offset,
      search: params.search,
      status: params.status && params.status !== "all" ? params.status : undefined,
      dealType: params.dealType && params.dealType !== "all" ? params.dealType : undefined,
      from: params.from,
      to: params.to,
    });

    if (!result.success || !result.data) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        success: false,
        message: result.message ?? DEAL_ERROR_KEYS.loadDeals,
      };
    }

    return {
      items: result.data.items.map(formatListRow),
      total: result.data.total,
      page,
      pageSize,
      success: true,
    };
  } catch (error) {
    console.error("fetchDealsTable failed", error);
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      success: false,
      message: DEAL_ERROR_KEYS.loadDeals,
    };
  }
}

export async function saveDeal(values: DealFormState): Promise<{
  success: boolean;
  id?: string;
  status?: string;
  message?: string;
}> {
  const dealId = slugify(values.dealId || values.title);
  if (!values.title?.trim()) {
    return { success: false, message: DEAL_ERROR_KEYS.titleRequired };
  }

  if (!dealId) {
    return { success: false, message: DEAL_ERROR_KEYS.dealIdRequired };
  }

  if (!values.productId) {
    return { success: false, message: DEAL_ERROR_KEYS.productRequired };
  }

  if (typeof values.dealPrice !== "number" || values.dealPrice <= 0) {
    return { success: false, message: DEAL_ERROR_KEYS.dealPriceInvalid };
  }

  const startDateIso = toIsoString(values.startDate);
  const endDateIso = toIsoString(values.endDate);

  if (startDateIso && endDateIso && new Date(endDateIso) <= new Date(startDateIso)) {
    return { success: false, message: DEAL_ERROR_KEYS.endDateAfterStartDate };
  }

  const payload: DealInput = {
    _id: values._id,
    dealId,
    title: values.title.trim(),
    status: values.status ?? "draft",
    dealType: values.dealType || "featured",
    product: { _type: "reference", _ref: values.productId },
    originalPrice: typeof values.originalPrice === "number" ? Math.max(0, values.originalPrice) : undefined,
    dealPrice: values.dealPrice,
    badge: values.badge?.trim() || undefined,
    badgeColor: values.badgeColor?.trim() || undefined,
    showOnHomepage: Boolean(values.showOnHomepage),
    priority: typeof values.priority === "number" ? Math.max(0, Math.min(100, Math.floor(values.priority))) : undefined,
    startDate: startDateIso,
    endDate: endDateIso,
    quantityLimit:
      typeof values.quantityLimit === "number" && values.quantityLimit > 0
        ? Math.floor(values.quantityLimit)
        : undefined,
    perCustomerLimit:
      typeof values.perCustomerLimit === "number" && values.perCustomerLimit > 0
        ? Math.floor(values.perCustomerLimit)
        : undefined,
    allowSoldCountOverride: values.allowSoldCountOverride,
    ...(values.allowSoldCountOverride && typeof values.soldCount === "number"
      ? { soldCount: Math.max(0, Math.floor(values.soldCount)) }
      : {}),
  };

  const result = await upsertDeal(payload);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? DEAL_ERROR_KEYS.saveFailed };
  }

  const dealIdResult = result.data._id;

  revalidatePath("/admin/marketing/deals");
  revalidatePath(`/admin/marketing/deals/${dealIdResult}`);

  return { success: true, id: dealIdResult, status: payload.status };
}

export async function setDealStatusAction(id: string, status: string): Promise<{
  success: boolean;
  status?: string;
  message?: string;
}> {
  if (!id) return { success: false, message: DEAL_ERROR_KEYS.dealIdMissing };
  if (!status) return { success: false, message: DEAL_ERROR_KEYS.statusRequired };

  const result = await setDealStatus(id, status);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? DEAL_ERROR_KEYS.updateStatusFailed };
  }

  revalidatePath("/admin/marketing/deals");
  revalidatePath(`/admin/marketing/deals/${id}`);

  return { success: true, status: result.data.status as string };
}

export async function removeDeal(id: string): Promise<{ success: boolean; message?: string }> {
  if (!id) return { success: false, message: DEAL_ERROR_KEYS.dealIdMissing };

  const result = await deleteDeal(id);
  if (!result.success) {
    return { success: false, message: result.message ?? DEAL_ERROR_KEYS.deleteFailed };
  }

  revalidatePath("/admin/marketing/deals");
  revalidatePath(`/admin/marketing/deals/${id}`);
  return { success: true };
}

export async function searchDealProducts(query: string): Promise<ReferenceOption[]> {
  const term = (query ?? "").trim();
  const searchPattern = term ? `*${term.replace(/\s+/g, " ")}*` : "*";
  try {
    const result = await withActionAuth(
      "marketing.deals.read",
      async () => {
        const products = await backofficeReadClient.fetch<
          { _id: string; name?: string; slug?: { current?: string }; price?: number }[]
        >(
          `*[_type == "product" && (name match $search || slug.current match $search)] | order(_updatedAt desc) [0...8] {
            _id,
            name,
            slug,
            price
          }`,
          { search: searchPattern },
        );

        return products;
      },
      { actionName: "searchDealProducts" },
    );

    if (!result.success || !result.data) {
      return [];
    }

    return result.data.map((product) => ({
      id: product._id,
      label: product.name ?? product.slug?.current ?? product._id,
      description: product.slug?.current ?? undefined,
      payload: product,
    }));
  } catch (error) {
    console.error("searchDealProducts failed", error);
    return [];
  }
}
