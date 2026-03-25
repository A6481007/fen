import { defineQuery } from "next-sanity";
import { client } from "@/sanity/lib/client";
import { DEALS_LIST_QUERY } from "@/sanity/queries/deals";
import type {
  DEALS_LIST_QUERYResult,
  PROMOTIONS_LIST_QUERYResult,
} from "@/sanity.types";

const DEFAULT_PROMOTION_REVALIDATE_SECONDS = 60;
const PROMOTION_TAGS = {
  promotions: "promotions",
  index: "promotions:index",
};

const ACTIVE_WINDOW_FILTER = `
  (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
  && (!defined(endDate) || dateTime(endDate) >= dateTime(now()))
`;

const UPCOMING_WINDOW_FILTER = `
  defined(startDate)
  && dateTime(startDate) > dateTime(now())
  && (!defined(endDate) || dateTime(endDate) >= dateTime(startDate))
`;

const PRODUCT_PROJECTION = `
  _id,
  _type,
  _createdAt,
  _updatedAt,
  name,
  "slug": slug.current,
  price,
  stock,
  "imageUrl": coalesce(thumbnailImage.asset->url, images[0].asset->url, images[0].url),
  "images": images[]{
    ...,
    "url": coalesce(asset->url, url)
  },
  "variantId": coalesce(variant->_ref, variant->_id),
  "variant": variant->{
    _id,
    title,
    "slug": slug.current
  },
  "categories": categories[]->{
    _id,
    title,
    "slug": slug.current
  }
`;

const CATEGORY_PROJECTION = `
  _id,
  _type,
  _createdAt,
  _updatedAt,
  title,
  "slug": slug.current
`;

const PROMOTION_PROJECTION = `
  _id,
  _type,
  _createdAt,
  _updatedAt,
  campaignId,
  "slug": slug.current,
  name,
  type,
  status,
  "priority": coalesce(priority, 0),
  startDate,
  endDate,
  timezone,
  discountType,
  "discountValue": coalesce(discountValue, 0),
  "minimumOrderValue": coalesce(minimumOrderValue, 0),
  "maximumDiscount": coalesce(maximumDiscount, 0),
  "buyQuantity": coalesce(buyQuantity, 0),
  "getQuantity": coalesce(getQuantity, 0),
  "budgetCap": coalesce(budgetCap, 0),
  "usageLimit": coalesce(usageLimit, 0),
  "perCustomerLimit": coalesce(perCustomerLimit, 0),
  badgeLabel,
  badgeColor,
  heroMessage,
  shortDescription,
  heroImage,
  thumbnailImage,
  "thumbnailUrl": coalesce(
    thumbnailImage.asset->url,
    heroImage.asset->url
  ),
  "heroImageUrl": heroImage.asset->url,
  ctaText,
  ctaLink,
  urgencyTrigger{
    showCountdown,
    showStockAlert,
    stockAlertThreshold,
    urgencyMessage
  },
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
  trackingPixelId,
  variantMode,
  splitPercent,
  variantCopyA,
  variantCopyB,
  variantCtaA,
  variantCtaB,
  variantDesign,
  internalNotes,
  createdBy,
  lastModifiedBy,
  targetAudience{
    segmentType,
    cartAbandonmentThreshold,
    inactivityDays,
    minLTVThreshold,
    maxLTVThreshold,
    "categories": categories[]->{
      ${CATEGORY_PROJECTION}
    },
    "products": products[]->{
      ${PRODUCT_PROJECTION}
    },
    "excludedProducts": excludedProducts[]->{
      ${PRODUCT_PROJECTION}
    }
  },
  "products": targetAudience.products[]->{
    ${PRODUCT_PROJECTION}
  },
  "excludedProducts": targetAudience.excludedProducts[]->{
    ${PRODUCT_PROJECTION}
  },
  "categories": targetAudience.categories[]->{
    ${CATEGORY_PROJECTION}
  },
  "defaultBundleItems": defaultBundleItems[]{
    quantity,
    isFree,
    variantId,
    "product": product->{
      ${PRODUCT_PROJECTION}
    }
  },
  "defaultProducts": defaultProducts[]{
    quantity,
    variantId,
    "product": product->{
      ${PRODUCT_PROJECTION}
    }
  },
  "isActive": status == "active"
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now())),
  "isExpired": status == "ended" || (defined(endDate) && dateTime(endDate) < dateTime(now())),
  "isUpcoming": (status == "scheduled"
    || (defined(startDate) && dateTime(startDate) > dateTime(now())))
    && status != "ended",
  "timeRemaining": select(
    defined(endDate) && dateTime(endDate) > dateTime(now()) => dateTime(endDate) - dateTime(now()),
    0
  ),
  "percentComplete": select(
    !defined(startDate) || !defined(endDate) => 0,
    dateTime(endDate) <= dateTime(startDate) => 0,
    dateTime(now()) <= dateTime(startDate) => 0,
    dateTime(now()) >= dateTime(endDate) => 100,
    ((dateTime(now()) - dateTime(startDate)) / (dateTime(endDate) - dateTime(startDate))) * 100
  )
`;

export const PROMOTIONS_LIST_QUERY = defineQuery(`
  *[
    _type == "promotion" && (
      (status == "active" && ${ACTIVE_WINDOW_FILTER})
      ||
      (status == "scheduled" && ${UPCOMING_WINDOW_FILTER})
    )
  ]
  | order(status asc, coalesce(priority, 0) desc, dateTime(startDate) asc){
    ${PROMOTION_PROJECTION}
  }
`);

export const PROMOTION_BY_CAMPAIGN_ID_QUERY = defineQuery(`
  *[_type == "promotion" && campaignId == $campaignId][0]{
    ${PROMOTION_PROJECTION}
  }
`);

export const PROMOTION_BY_SLUG_QUERY = defineQuery(`
  *[_type == "promotion" && slug.current == $slug][0]{
    ${PROMOTION_PROJECTION}
  }
`);

export const PROMOTIONS_BY_TYPE_QUERY = defineQuery(`
  *[
    _type == "promotion"
    && type == $type
    && status == "active"
    && ${ACTIVE_WINDOW_FILTER}
  ] | order(coalesce(priority, 0) desc, dateTime(startDate) asc){
    ${PROMOTION_PROJECTION}
  }
`);

export const PROMOTIONS_BY_SEGMENT_QUERY = defineQuery(`
  *[
    _type == "promotion"
    && status == "active"
    && ${ACTIVE_WINDOW_FILTER}
    && (targetAudience.segmentType == $segment || targetAudience.segmentType == "allCustomers")
  ] | order(coalesce(priority, 0) desc, dateTime(startDate) asc){
    ${PROMOTION_PROJECTION}
  }
`);

export const PROMOTIONS_FOR_PRODUCT_QUERY = defineQuery(`
  *[
    _type == "promotion"
    && status == "active"
    && ${ACTIVE_WINDOW_FILTER}
    && (
      $productId in targetAudience.products[]._ref
      || (
        (!defined(targetAudience.products) || count(targetAudience.products) == 0)
        && (
          !defined(targetAudience.categories) || count(targetAudience.categories) == 0
          || count(
            (targetAudience.categories[]._ref)[
              @ in coalesce(*[_type == "product" && _id == $productId][0].categories[]._ref, [])
            ]
          ) > 0
        )
      )
    )
  ] | order(coalesce(priority, 0) desc, dateTime(startDate) asc){
    ${PROMOTION_PROJECTION}
  }
`);

export const PROMOTIONS_FOR_CATEGORY_QUERY = defineQuery(`
  *[
    _type == "promotion"
    && status == "active"
    && ${ACTIVE_WINDOW_FILTER}
    && (
      !defined(targetAudience.categories) || count(targetAudience.categories) == 0
      || $categoryId in targetAudience.categories[]._ref
    )
  ] | order(coalesce(priority, 0) desc, dateTime(startDate) asc){
    ${PROMOTION_PROJECTION}
  }
`);

export const ACTIVE_FLASH_SALES_QUERY = defineQuery(`
  *[
    _type == "promotion"
    && type == "flashSale"
    && status == "active"
    && ${ACTIVE_WINDOW_FILTER}
  ]
  | order(dateTime(endDate) asc){
    ${PROMOTION_PROJECTION}
  }
`);

const PROMOTION_AUDIENCE_PRODUCTS_QUERY = defineQuery(`
  *[
    _type == "product"
    && !(_id in $excludedProductIds)
    && (
      _id in $productIds
      || count((categories[]._ref)[@ in $categoryIds]) > 0
    )
  ] | order(name asc)[0...$limit]{
    ${PRODUCT_PROJECTION}
  }
`);

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveSlug = (value?: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof (value as { current?: string }).current === "string") {
    return (value as { current?: string }).current || undefined;
  }
  return undefined;
};

const parseDateMs = (value?: string | null): number => {
  if (!value) return NaN;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? NaN : parsed.getTime();
};

const buildDealPromotion = (
  deal: NonNullable<DEALS_LIST_QUERYResult[number]>
): PROMOTIONS_LIST_QUERYResult[number] => {
  const nowMs = Date.now();
  const startMs = parseDateMs(deal.startDate);
  const endMs = parseDateMs(deal.endDate);
  const isExpired = Number.isFinite(endMs) && endMs < nowMs;
  const isUpcoming = Number.isFinite(startMs) && startMs > nowMs;
  const isActive =
    deal.status === "active" &&
    (!Number.isFinite(startMs) || startMs <= nowMs) &&
    (!Number.isFinite(endMs) || endMs >= nowMs);
  const timeRemaining =
    Number.isFinite(endMs) && endMs > nowMs ? endMs - nowMs : 0;
  const percentComplete = (() => {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return 0;
    }
    if (nowMs <= startMs) return 0;
    if (nowMs >= endMs) return 100;
    return ((nowMs - startMs) / (endMs - startMs)) * 100;
  })();

  const product = deal.product ?? undefined;
  const basePrice = toNumber(deal.originalPrice ?? product?.price, 0);
  const dealPrice = toNumber(deal.dealPrice, basePrice);
  const discountPercent = Math.max(
    0,
    basePrice > 0 ? ((basePrice - dealPrice) / basePrice) * 100 : 0
  );
  const resolvedSlug = resolveSlug(product?.slug);
  const normalizedProduct = product
    ? { ...product, price: basePrice }
    : undefined;
  const categories = normalizedProduct?.categories ?? [];
  const remainingQty =
    typeof deal.remainingQty === "number" && Number.isFinite(deal.remainingQty)
      ? Math.max(0, Math.floor(deal.remainingQty))
      : null;

  const heroImage =
    normalizedProduct?.imageUrl ? { url: normalizedProduct.imageUrl } : null;
  const targetProducts = normalizedProduct ? [normalizedProduct] : [];

  return {
    _id: deal._id ?? deal.dealId ?? "",
    _type: "deal",
    _createdAt: deal.startDate ?? new Date().toISOString(),
    _updatedAt: deal.endDate ?? deal.startDate ?? new Date().toISOString(),
    campaignId: deal.dealId ?? deal._id ?? "",
    slug: deal.dealId ?? "",
    name: deal.title ?? normalizedProduct?.name ?? "Deal",
    type: "deal",
    status: deal.status ?? "active",
    priority: deal.priority ?? 0,
    startDate: deal.startDate ?? null,
    endDate: deal.endDate ?? null,
    timezone: null,
    discountType: "percentage",
    discountValue: discountPercent,
    minimumOrderValue: 0,
    maximumDiscount: 0,
    buyQuantity: 0,
    getQuantity: 0,
    budgetCap: 0,
    usageLimit: 0,
    perCustomerLimit: deal.perCustomerLimit ?? 0,
    badgeLabel: deal.badge ?? "Deal",
    badgeColor: deal.badgeColor ?? null,
    heroMessage: deal.title ?? normalizedProduct?.name ?? "",
    shortDescription: deal.title ?? normalizedProduct?.name ?? "",
    heroImage,
    heroImageUrl: normalizedProduct?.imageUrl ?? null,
    thumbnailImage: heroImage,
    thumbnailUrl: normalizedProduct?.imageUrl ?? null,
    ctaText: "Shop deal",
    ctaLink: resolvedSlug ? `/products/${resolvedSlug}` : "/deal",
    urgencyTrigger: remainingQty !== null || deal.endDate
      ? {
          showCountdown: Boolean(deal.endDate),
          showStockAlert: remainingQty !== null && remainingQty > 0 && remainingQty < 20,
          stockAlertThreshold: remainingQty ?? undefined,
          urgencyMessage:
            remainingQty !== null && remainingQty > 0 && remainingQty < 20
              ? `Only ${remainingQty} left`
              : undefined,
        }
      : null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    trackingPixelId: null,
    variantMode: "control",
    splitPercent: null,
    variantCopyA: null,
    variantCopyB: null,
    variantCtaA: null,
    variantCtaB: null,
    variantDesign: null,
    internalNotes: null,
    createdBy: null,
    lastModifiedBy: null,
    targetAudience: {
      segmentType: "allCustomers",
      cartAbandonmentThreshold: null,
      inactivityDays: null,
      minLTVThreshold: null,
      maxLTVThreshold: null,
      categories,
      products: targetProducts,
      excludedProducts: [],
    },
    products: targetProducts,
    excludedProducts: [],
    categories,
    defaultBundleItems: [],
    defaultProducts: normalizedProduct ? [{ quantity: 1, product: normalizedProduct }] : [],
    isActive,
    isExpired,
    isUpcoming,
    timeRemaining,
    percentComplete,
    dealId: deal.dealId ?? null,
    dealType: deal.dealType ?? null,
    dealPrice,
    originalPrice: basePrice,
    quantityLimit: deal.quantityLimit ?? null,
    soldCount: deal.soldCount ?? null,
    remainingQty: remainingQty ?? null,
  } as PROMOTIONS_LIST_QUERYResult[number];
};

type GetActivePromotionsOptions = {
  includeDeals?: boolean;
  revalidate?: number | false;
};

type PromotionAudienceProductParams = {
  productIds?: string[];
  categoryIds?: string[];
  excludedProductIds?: string[];
  limit?: number;
};

type PromotionProduct = NonNullable<PROMOTIONS_LIST_QUERYResult[number]["products"]>[number];

const buildFetchOptions = (revalidate: number | false | undefined, tags: string[]) => {
  const nextTags = Array.from(new Set(tags.filter(Boolean)));
  if (revalidate === false) {
    return nextTags.length ? { cache: "no-store" as const, next: { tags: nextTags } } : { cache: "no-store" as const };
  }
  if (typeof revalidate === "number") {
    return { next: { revalidate, tags: nextTags } };
  }
  return { next: { revalidate: DEFAULT_PROMOTION_REVALIDATE_SECONDS, tags: nextTags } };
};

export const getActivePromotions = async (
  options: GetActivePromotionsOptions = {}
) => {
  const { includeDeals = false, revalidate } = options;
  const fetchOptions = buildFetchOptions(revalidate, [PROMOTION_TAGS.promotions, PROMOTION_TAGS.index]);
  const [promotions, deals] = await Promise.all([
    client.fetch<PROMOTIONS_LIST_QUERYResult>(
      PROMOTIONS_LIST_QUERY,
      {},
      fetchOptions
    ),
    includeDeals
      ? client.fetch<DEALS_LIST_QUERYResult>(
          DEALS_LIST_QUERY,
          {},
          fetchOptions
        )
      : Promise.resolve([] as DEALS_LIST_QUERYResult),
  ]);

  const normalizedDeals = includeDeals
    ? (deals || []).map((deal) => buildDealPromotion(deal))
    : [];

  const combined = [...(promotions || []), ...normalizedDeals].filter(Boolean);

  const stateWeight = (promo: NonNullable<PROMOTIONS_LIST_QUERYResult[number]>): number => {
    if ((promo as { isActive?: boolean }).isActive) return 3;
    if ((promo as { status?: string }).status === "paused") return 1;
    if ((promo as { isUpcoming?: boolean }).isUpcoming) return 2;
    return (promo as { isExpired?: boolean }).isExpired ? 0 : 1;
  };

  return combined.sort((a, b) => {
    const stateDiff = stateWeight(b as NonNullable<PROMOTIONS_LIST_QUERYResult[number]>) -
      stateWeight(a as NonNullable<PROMOTIONS_LIST_QUERYResult[number]>);
    if (stateDiff !== 0) return stateDiff;

    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    const startA = parseDateMs(a.startDate);
    const startB = parseDateMs(b.startDate);
    if (!Number.isNaN(startA) && !Number.isNaN(startB) && startA !== startB) {
      return startA - startB;
    }
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
};

export const getProductsForPromotionAudience = async (
  params: PromotionAudienceProductParams,
  options?: { revalidate?: number | false }
): Promise<PromotionProduct[]> => {
  const uniq = (items?: string[]) =>
    Array.from(
      new Set((items ?? []).map((item) => item?.trim()).filter((item): item is string => Boolean(item)))
    );

  const productIds = uniq(params.productIds);
  const categoryIds = uniq(params.categoryIds);
  const excludedProductIds = uniq(params.excludedProductIds);
  const limit = typeof params.limit === "number" && Number.isFinite(params.limit)
    ? Math.max(1, Math.floor(params.limit))
    : 24;

  if (!productIds.length && !categoryIds.length) {
    return [];
  }

  try {
    const fetchOptions = buildFetchOptions(options?.revalidate, [PROMOTION_TAGS.promotions, PROMOTION_TAGS.index]);
    const products = await client.fetch<PromotionProduct[]>(
      PROMOTION_AUDIENCE_PRODUCTS_QUERY,
      { productIds, categoryIds, excludedProductIds, limit },
      fetchOptions
    );
    return Array.isArray(products) ? products : [];
  } catch (error) {
    console.error("Error fetching audience products for promotion:", { params, error });
    return [];
  }
};
