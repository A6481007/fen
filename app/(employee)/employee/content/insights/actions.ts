"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  listPromotions,
  setPromotionStatus,
  upsertPromotion,
  deletePromotion,
  type PromotionRecord,
} from "@/actions/backoffice/promotionsActions";
import { backofficeReadClient, withActionAuth } from "@/actions/backoffice/common";
import type { ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import type { PromotionFormState } from "@/components/admin/backoffice/promotions/types";

export type PromotionListRow = {
  id: string;
  name: string;
  campaignId?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  updatedAt?: string;
};

export type PromotionListParams = {
  search?: string;
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const revalidatePromotionViews = (promotionIdOrSlug?: string) => {
  revalidateTag("promotions");
  revalidateTag("promotions:index");

  revalidatePath("/");
  revalidatePath("/deal");
  revalidatePath("/promotions");
  if (promotionIdOrSlug) {
    revalidatePath(`/promotions/${promotionIdOrSlug}`);
  }
};

const normalizePage = (params: PromotionListParams) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const formatListRow = (promotion: PromotionRecord): PromotionListRow => ({
  id: promotion._id,
  name: promotion.name ?? "Untitled promotion",
  campaignId: promotion.campaignId,
  type: promotion.type,
  status: promotion.status,
  startDate: promotion.startDate,
  endDate: promotion.endDate,
  priority: promotion.priority,
  updatedAt: promotion.updatedAt ?? promotion._updatedAt ?? promotion._createdAt,
});

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

const clampPriority = (value?: number) => {
  if (typeof value !== "number") return undefined;
  const normalized = Math.max(0, Math.min(100, value));
  return normalized;
};

const normalizeQuantity = (value?: number) => {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : 1;
  return Math.max(1, Math.floor(parsed));
};

const normalizeDefaultProducts = (
  items?: PromotionFormState["defaultProducts"],
): Array<{ product: { _type: "reference"; _ref: string }; quantity: number; variantId?: string }> => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const productId = item?.productId?.trim();
      if (!productId) return null;
      const quantity = normalizeQuantity(item?.quantity);
      const variantId = item?.variantId?.trim();

      return {
        product: { _type: "reference", _ref: productId },
        quantity,
        ...(variantId ? { variantId } : {}),
      };
    })
    .filter(
      (item): item is { product: { _type: "reference"; _ref: string }; quantity: number; variantId?: string } =>
        Boolean(item),
    );
};

const normalizeBundleItems = (
  items?: PromotionFormState["defaultBundleItems"],
): Array<{
  product: { _type: "reference"; _ref: string };
  quantity: number;
  isFree?: boolean;
  variantId?: string;
}> => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const productId = item?.productId?.trim();
      if (!productId) return null;
      const quantity = normalizeQuantity(item?.quantity);
      const variantId = item?.variantId?.trim();

      return {
        product: { _type: "reference", _ref: productId },
        quantity,
        ...(variantId ? { variantId } : {}),
        ...(item?.isFree ? { isFree: true } : {}),
      };
    })
    .filter(
      (item): item is {
        product: { _type: "reference"; _ref: string };
        quantity: number;
        isFree?: boolean;
        variantId?: string;
      } => Boolean(item),
    );
};

const normalizeReferences = (
  items?: PromotionFormState["targetProducts"],
): Array<{ _type: "reference"; _ref: string }> => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => item?.id?.trim())
    .filter((id): id is string => Boolean(id))
    .map((id) => ({ _type: "reference" as const, _ref: id }));
};

const sumQuantities = (
  items?: Array<{ quantity?: number }>,
) =>
  (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + normalizeQuantity(item?.quantity),
    0,
  );

export async function fetchPromotionsTable(
  params: PromotionListParams = {},
): Promise<{ items: PromotionListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, offset } = normalizePage(params);
  const result = await listPromotions({
    limit: pageSize,
    offset,
    search: params.search,
    status: params.status && params.status !== "all" ? params.status : undefined,
    type: params.type && params.type !== "all" ? params.type : undefined,
    from: params.from,
    to: params.to,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "Failed to load promotions");
  }

  return {
    items: result.data.items.map(formatListRow),
    total: result.data.total,
    page,
    pageSize,
  };
}

export async function searchPromotionProducts(query: string): Promise<ReferenceOption[]> {
  const term = (query ?? "").trim();
  const searchPattern = term ? `*${term.replace(/\s+/g, " ")}*` : "*";

  const result = await withActionAuth(
    ["marketing.promotions.read", "marketing.promotions.write", "marketing.promotions.publish"],
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
    { actionName: "searchPromotionProducts" },
  );

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "Unable to search products");
  }

  return result.data.map((product) => ({
    id: product._id,
    label: product.name ?? "Product",
    description: product.slug?.current ?? undefined,
    payload: product,
  }));
}

export async function savePromotion(values: PromotionFormState): Promise<{
  success: boolean;
  id?: string;
  status?: string;
  message?: string;
}> {
  const slugValue = values.slug?.trim() || slugify(values.name ?? "");
  if (!slugValue) {
    return { success: false, message: "admin.promotions.form.errors.slugRequired" };
  }

  const campaignIdRaw = values.campaignId?.trim() || slugValue;
  const campaignId = /^[a-z0-9-]+$/.test(campaignIdRaw) ? campaignIdRaw : slugify(campaignIdRaw);
  if (!campaignId) {
    return { success: false, message: "admin.promotions.form.errors.campaignIdInvalid" };
  }

  const startDateIso = toIsoString(values.startDate);
  const endDateIso = toIsoString(values.endDate);

  if (!startDateIso || !endDateIso) {
    return { success: false, message: "admin.promotions.form.errors.dateRequired" };
  }

  if (new Date(endDateIso) <= new Date(startDateIso)) {
    return { success: false, message: "admin.promotions.form.errors.dateOrderInvalid" };
  }

  const shouldIncludeDiscountValue =
    values.discountType !== "freeShipping" && values.discountType !== "bxgy";

  const defaultProducts = normalizeDefaultProducts(values.defaultProducts);
  const normalizedGetItems = normalizeBundleItems(
    values.defaultBundleItems?.filter((item) => item.isFree),
  );
  const targetProducts = normalizeReferences(values.targetProducts);
  const bxgyBuyItems =
    values.discountType === "bxgy"
      ? (values.targetProducts ?? [])
          .map((item) => {
            const productId = item?.id?.trim();
            if (!productId) return null;
            return {
              product: { _type: "reference" as const, _ref: productId },
              quantity: normalizeQuantity(item.quantity),
            };
          })
          .filter(
            (
              item,
            ): item is { product: { _type: "reference"; _ref: string }; quantity: number } =>
              Boolean(item),
          )
      : [];
  const defaultBundleItems =
    values.discountType === "bxgy"
      ? [...bxgyBuyItems, ...normalizedGetItems]
      : normalizeBundleItems(values.defaultBundleItems);
  const targetCategories =
    values.discountType === "bxgy" ? [] : normalizeReferences(values.targetCategories);

  const derivedBuyQuantity = values.discountType === "bxgy" ? sumQuantities(values.targetProducts) : values.buyQuantity;
  const derivedGetQuantity =
    values.discountType === "bxgy"
      ? sumQuantities((values.defaultBundleItems ?? []).filter((item) => item.isFree))
      : values.getQuantity;

  if (values.discountType === "bxgy") {
    const hasBuyProducts = targetProducts.length > 0;
    const hasGetProducts = defaultBundleItems.some((item) => item.isFree);
    if (!hasBuyProducts || !hasGetProducts || derivedBuyQuantity < 1 || derivedGetQuantity < 1) {
      return {
        success: false,
        message: "Buy X Get Y promotions require buy and get products with quantities greater than 0.",
      };
    }
  }

  const targetAudience =
    values.segmentType || targetProducts.length || targetCategories.length
      ? {
          ...(values.segmentType ? { segmentType: values.segmentType } : {}),
          ...(targetProducts.length ? { products: targetProducts } : {}),
          ...(targetCategories.length ? { categories: targetCategories } : {}),
        }
      : undefined;

  const payload = {
    _id: values._id,
    name: values.name?.trim() || "Untitled promotion",
    slug: { current: slugValue },
    campaignId,
    status: values.status || "draft",
    type: values.type || "flashSale",
    priority: clampPriority(values.priority),
    discountType: values.discountType || "percentage",
    ...(typeof derivedBuyQuantity === "number"
      ? { buyQuantity: Math.max(0, Math.floor(derivedBuyQuantity)) }
      : {}),
    ...(typeof derivedGetQuantity === "number"
      ? { getQuantity: Math.max(0, Math.floor(derivedGetQuantity)) }
      : {}),
    ...(shouldIncludeDiscountValue && typeof values.discountValue === "number"
      ? { discountValue: values.discountValue }
      : {}),
    ...(typeof values.minimumOrderValue === "number"
      ? { minimumOrderValue: Math.max(0, values.minimumOrderValue) }
      : {}),
    startDate: startDateIso,
    endDate: endDateIso,
    timezone: values.timezone || "UTC",
    ...(targetAudience ? { targetAudience } : {}),
    ...(values.heroMessage ? { heroMessage: values.heroMessage } : {}),
    ...(values.shortDescription ? { shortDescription: values.shortDescription } : {}),
    ...(values.badgeLabel ? { badgeLabel: values.badgeLabel } : {}),
    ...(values.badgeColor ? { badgeColor: values.badgeColor } : {}),
    ...(values.ctaText ? { ctaText: values.ctaText } : {}),
    ...(values.ctaLink ? { ctaLink: values.ctaLink } : {}),
    publishAsBanner: values.publishAsBanner ?? false,
    bannerSettings: values.bannerSettings
      ? {
          ...values.bannerSettings,
          startDate: toIsoString(values.bannerSettings.startDate),
          endDate: toIsoString(values.bannerSettings.endDate),
        }
      : undefined,
    ...(typeof values.budgetCap === "number" ? { budgetCap: Math.max(0, values.budgetCap) } : {}),
    ...(typeof values.usageLimit === "number"
      ? { usageLimit: Math.max(0, values.usageLimit) }
      : {}),
    ...(typeof values.perCustomerLimit === "number"
      ? { perCustomerLimit: Math.max(0, values.perCustomerLimit) }
      : {}),
    ...(values.utmSource ? { utmSource: values.utmSource } : {}),
    ...(values.utmMedium ? { utmMedium: values.utmMedium } : {}),
    ...(values.utmCampaign ? { utmCampaign: values.utmCampaign } : {}),
    ...(values.trackingPixelId ? { trackingPixelId: values.trackingPixelId } : {}),
    ...(values.internalNotes ? { internalNotes: values.internalNotes } : {}),
    defaultProducts,
    defaultBundleItems,
  };

  const result = await upsertPromotion(payload);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "Failed to save promotion" };
  }

  const promotionId = result.data._id;

  revalidatePath("/admin/marketing/promotions");
  revalidatePath(`/admin/marketing/promotions/${promotionId}`);
  revalidatePromotionViews();

  return { success: true, id: promotionId, status: payload.status as string };
}

export async function setPromotionStatusAction(id: string, status: string): Promise<{
  success: boolean;
  status?: string;
  message?: string;
}> {
  if (!id) return { success: false, message: "Promotion ID is required." };
  if (!status) return { success: false, message: "Status is required." };

  const result = await setPromotionStatus(id, status);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "Failed to update status" };
  }

  revalidatePath("/admin/marketing/promotions");
  revalidatePath(`/admin/marketing/promotions/${id}`);
  revalidatePromotionViews();

  return { success: true, status: result.data.status as string };
}

export async function removePromotion(id: string): Promise<{ success: boolean; message?: string }> {
  if (!id) return { success: false, message: "Promotion ID is required." };

  const result = await deletePromotion(id);
  if (!result.success) {
    return { success: false, message: result.message ?? "Failed to delete promotion" };
  }

  revalidatePath("/admin/marketing/promotions");
  revalidatePath(`/admin/marketing/promotions/${id}`);
  revalidatePath("/admin/promotions");
  revalidatePromotionViews();
  return { success: true };
}
