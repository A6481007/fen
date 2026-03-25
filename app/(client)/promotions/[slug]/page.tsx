import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { type PersonalizedOffer } from "@/components/promotions/PersonalizedOffers";
import { getPromotionAnalytics, type PromotionAnalytics } from "@/lib/promotions/analytics";
import { promotionEngine } from "@/lib/promotions/promotionEngine";
import { getActivePromotions, getProductsForPromotionAudience } from "@/sanity/queries/promotions";
import {
  getPromotionByCampaignId,
  getPromotionBySlug,
  getPromotionsByType,
} from "@/sanity/queries";
import type {
  PROMOTION_BY_CAMPAIGN_ID_QUERYResult,
  PROMOTIONS_LIST_QUERYResult,
} from "@/sanity.types";
import { Timestamp } from "@/lib/firebaseAdmin";
import PromotionDetailClient from "./PromotionDetailClient";

type Promotion = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;
type PromotionState = "active" | "scheduled" | "ended" | "paused";
type DefaultCartItem = {
  productId: string;
  quantity: number;
  variantId?: string;
  productName?: string;
  productSlug?: string;
  unitPrice?: number;
};
type ExtendedPromotion = Promotion & {
  defaultBundleItems?: Array<{ product?: any; quantity?: number }>;
  defaultProducts?: Array<{ product?: any; quantity?: number }>;
};

type PromotionAudienceIds = {
  productIds: string[];
  categoryIds: string[];
  excludedProductIds: string[];
};

type PromotionAnalyticsView = {
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  totalDiscountSpent: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  lastUpdated: string | null;
};

type TimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
};

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const resolveSlug = (slug?: unknown) => {
  if (typeof slug === "string" && slug.trim()) return slug.trim();
  if (slug && typeof (slug as { current?: string }).current === "string") {
    return (slug as { current?: string }).current || undefined;
  }
  return undefined;
};

const resolveVariantId = (product: any) => {
  if (!product) return undefined;
  if (typeof product.variantId === "string" && product.variantId.trim()) return product.variantId;

  const variant = product.variant || {};
  if (typeof variant === "string" && variant.trim()) return variant;
  if (typeof variant?._id === "string") return variant._id;
  if (typeof variant?._ref === "string") return variant._ref;
  if (variant?.slug && typeof variant.slug.current === "string") return variant.slug.current;

  return undefined;
};

const mapDefaultItem = (
  entry?: { product?: any; quantity?: number | null }
): DefaultCartItem | null => {
  const product = entry?.product ?? entry;
  const productId = product?._id || product?.id || product?._ref;
  if (!productId) return null;

  const variantId = resolveVariantId(product);
  const requiresVariant = Boolean(product?.variant || product?.variantId);
  if (requiresVariant && !variantId) return null;

  return {
    productId,
    variantId,
    quantity: Math.max(1, entry?.quantity ?? 1),
    productName: product.name,
    productSlug: resolveSlug(product.slug),
    unitPrice: typeof product.price === "number" ? product.price : undefined,
  };
};

const buildDefaultItems = (promotion: ExtendedPromotion): DefaultCartItem[] => {
  const isBxgy = promotion.discountType === "bxgy" || promotion.type === "bundle";
  const sourceItems = isBxgy ? promotion.defaultBundleItems : promotion.defaultProducts;
  const bundleItems =
    (isBxgy ? sourceItems : promotion.defaultBundleItems)
      ?.map((item) => mapDefaultItem(item))
      .filter((item): item is DefaultCartItem => Boolean(item)) ?? [];
  const defaultProducts =
    (!isBxgy ? sourceItems : promotion.defaultProducts)
      ?.map((item) => mapDefaultItem(item))
      .filter((item): item is DefaultCartItem => Boolean(item)) ?? [];

  if (isBxgy) {
    const configuredBundleItems = (promotion.defaultBundleItems ?? [])
      .map((item: any) => mapDefaultItem(item))
      .filter((item: DefaultCartItem | null): item is DefaultCartItem => Boolean(item));

    const hasConfiguredBuyItems = (promotion.defaultBundleItems ?? []).some(
      (item: any) => !item?.isFree,
    );
    const configuredGetItems = (promotion.defaultBundleItems ?? [])
      .filter((item: any) => Boolean(item?.isFree))
      .map((item: any) => mapDefaultItem(item))
      .filter((item: DefaultCartItem | null): item is DefaultCartItem => Boolean(item));

    if (configuredBundleItems.length && hasConfiguredBuyItems) {
      return configuredBundleItems;
    }

    const fallbackBuyItems =
      (promotion.targetAudience?.products ?? promotion.products ?? [])
        .map((product: any) =>
          mapDefaultItem({
            product,
            quantity: Math.max(1, Math.floor(toSafeNumber(promotion.buyQuantity, 1))),
          }),
        )
        .filter((item: DefaultCartItem | null): item is DefaultCartItem => Boolean(item));

    if (fallbackBuyItems.length && configuredGetItems.length) {
      return [...fallbackBuyItems, ...configuredGetItems];
    }

    return [];
  }

  return defaultProducts.length ? defaultProducts : [];
};

const buildPromotionAudienceIds = (promotion: ExtendedPromotion): PromotionAudienceIds => {
  const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));
  const isBxgy = promotion.discountType === "bxgy" || promotion.type === "bundle";

  const directProducts =
    (promotion.products ?? [])
      .map((product: any) => product?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  const defaultProducts =
    (promotion.defaultProducts ?? [])
      .map((item: any) => item?.product?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  const defaultBundleProducts =
    (promotion.defaultBundleItems ?? [])
      .map((item: any) => item?.product?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  const bxgyGetProducts =
    (promotion.defaultBundleItems ?? [])
      .filter((item: any) => Boolean(item?.isFree))
      .map((item: any) => item?.product?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  const bxgyBuyProducts =
    (promotion.targetAudience?.products ?? promotion.products ?? [])
      .map((item: any) => item?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  const bxgyBundleBuyProducts =
    (promotion.defaultBundleItems ?? [])
      .filter((item: any) => !item?.isFree)
      .map((item: any) => item?.product?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  const categoryIds =
    (promotion.categories ?? [])
      .map((category: any) => category?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  const excludedProductIds =
    (promotion.excludedProducts ?? [])
      .map((product: any) => product?._id)
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);

  if (isBxgy) {
    return {
      productIds: unique(
        bxgyBuyProducts.length
          ? bxgyBuyProducts
          : bxgyBundleBuyProducts.length
            ? bxgyBundleBuyProducts
            : defaultBundleProducts.length
              ? defaultBundleProducts
              : bxgyGetProducts
      ),
      categoryIds: [],
      excludedProductIds: unique(excludedProductIds),
    };
  }

  return {
    productIds: unique([...directProducts, ...defaultProducts, ...defaultBundleProducts]),
    categoryIds: unique(categoryIds),
    excludedProductIds: unique(excludedProductIds),
  };
};

const isActiveWindow = (promotion: Promotion) => {
  const now = Date.now();
  const startMs = promotion.startDate ? new Date(promotion.startDate).getTime() : NaN;
  const endMs = promotion.endDate ? new Date(promotion.endDate).getTime() : NaN;
  return (Number.isNaN(startMs) || startMs <= now) && (Number.isNaN(endMs) || now <= endMs);
};

const getImageUrl = (promotion: Promotion) => {
  const hero = promotion.heroImage as { asset?: { url?: string }; url?: string } | undefined;
  const thumb = promotion.thumbnailImage as { asset?: { url?: string }; url?: string } | undefined;
  return hero?.asset?.url || hero?.url || thumb?.asset?.url || thumb?.url || undefined;
};

const EMPTY_ANALYTICS: PromotionAnalyticsView = {
  impressions: 0,
  clicks: 0,
  addToCarts: 0,
  conversions: 0,
  totalDiscountSpent: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
  conversionRate: 0,
  lastUpdated: null,
};

const normalizeLastUpdated = (value: unknown): string | null => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      const dateValue = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
    } catch {
      // ignore and continue to other parsing paths
    }
  }

  if (value && typeof value === "object") {
    const seconds = (value as TimestampLike)._seconds ?? (value as TimestampLike).seconds;
    const nanos =
      (value as TimestampLike)._nanoseconds ?? (value as TimestampLike).nanoseconds ?? 0;

    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      const millis = seconds * 1000 + Math.floor(Number.isFinite(nanos) ? nanos / 1_000_000 : 0);
      return new Date(millis).toISOString();
    }
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return value;
  }

  return null;
};

const normalizeAnalytics = (analytics?: PromotionAnalytics | null): PromotionAnalyticsView => {
  if (!analytics) {
    return { ...EMPTY_ANALYTICS };
  }

  return {
    impressions: toSafeNumber(analytics.impressions),
    clicks: toSafeNumber(analytics.clicks),
    addToCarts: toSafeNumber(analytics.addToCarts),
    conversions: toSafeNumber(analytics.conversions),
    totalDiscountSpent: toSafeNumber(analytics.totalDiscountSpent),
    totalRevenue: toSafeNumber(analytics.totalRevenue),
    averageOrderValue: toSafeNumber(analytics.averageOrderValue),
    conversionRate: toSafeNumber(analytics.conversionRate),
    lastUpdated: normalizeLastUpdated((analytics as { lastUpdated?: unknown }).lastUpdated),
  };
};

const loadPromotion = async (identifier: string): Promise<Promotion | null> => {
  const lookupValue = typeof identifier === "string" ? identifier.trim() : "";
  if (!lookupValue) return null;

  const bySlug = await getPromotionBySlug(lookupValue);
  if (bySlug) return bySlug as Promotion;

  const byCampaignId = await getPromotionByCampaignId(lookupValue);
  return byCampaignId ?? null;
};

const deriveState = (promotion: Promotion): PromotionState => {
  const now = Date.now();
  const startMs = promotion.startDate ? new Date(promotion.startDate).getTime() : NaN;
  const endMs = promotion.endDate ? new Date(promotion.endDate).getTime() : NaN;
  const hasEnded =
    promotion.status === "ended" ||
    promotion.isExpired === true ||
    (Number.isFinite(endMs) && endMs < now);
  const isPaused = promotion.status === "paused";
  const isScheduled =
    promotion.status === "scheduled" ||
    promotion.isUpcoming === true ||
    (!hasEnded && Number.isFinite(startMs) && startMs > now);

  if (hasEnded) return "ended";
  if (isPaused) return "paused";
  if (isScheduled) return "scheduled";
  return "active";
};

const buildPersonalOffer = (eligibleOffer: unknown): PersonalizedOffer | null => {
  if (!eligibleOffer || typeof eligibleOffer !== "object") return null;

  const offer = eligibleOffer as {
    campaignId?: string;
    name?: string;
    shortDescription?: string | null;
    heroMessage?: string | null;
    ctaText?: string | null;
    ctaLink?: string | null;
    discountType?: string | null;
    discountValue?: number | null;
    displayCta?: string;
    eligibility?: { reason?: string; matchedCriteria?: string[] };
    assignedVariant?: { variant?: string | null };
    eligibilityReason?: string;
  };

  if (!offer.campaignId) return null;

  const discountSummary =
    offer.discountType === "percentage"
      ? `${Math.round(offer.discountValue ?? 0)}% OFF`
      : offer.discountType === "fixed" ||
          offer.discountType === "fixed_amount" ||
          offer.discountType === "fixedAmount"
        ? `$${(offer.discountValue ?? 0).toFixed(2)} OFF`
        : offer.discountType === "freeShipping"
          ? "Free shipping"
          : null;

  return {
    campaignId: offer.campaignId,
    name: offer.name || "Personalized promotion",
    description: offer.shortDescription || offer.heroMessage,
    ctaText: offer.displayCta || offer.ctaText || undefined,
    ctaLink: offer.ctaLink || undefined,
    discountSummary: discountSummary ?? undefined,
    eligibilityReason:
      offer.eligibilityReason ||
      offer.eligibility?.reason ||
      (offer.eligibility?.matchedCriteria?.length
        ? `Matched: ${offer.eligibility.matchedCriteria.join(", ")}`
        : undefined),
    variant: offer.assignedVariant?.variant || null,
  };
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const promotion = await loadPromotion(slug);

  if (!promotion || promotion.status === "draft") {
    return { title: "Promotion Not Found" };
  }

  const state = deriveState(promotion);
  const siteName = "ShopCart";
  const description =
    promotion.shortDescription ||
    promotion.heroMessage ||
    "Explore limited-time offers and exclusive deals.";
  const imageUrl = getImageUrl(promotion);
  const canonical = promotion.slug
    ? `/promotions/${promotion.slug}`
    : `/promotions/${promotion.campaignId || slug}`;

  return {
    title: `${promotion.name} | ${siteName}`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: promotion.name || `${siteName} Promotion`,
      description: promotion.heroMessage || description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: state === "ended" || state === "paused" ? "noindex" : "index",
  };
}

export async function generateStaticParams() {
  const promotions = await getActivePromotions({ includeDeals: false });
  return promotions
    .map((promotion) => resolveSlug(promotion?.slug) || promotion?.campaignId)
    .filter((value): value is string => Boolean(value))
    .map((slug) => ({ slug }));
}

const PromotionPage = async ({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const requestedSlug = typeof slug === "string" ? slug.trim() : "";
  const promotion = await loadPromotion(requestedSlug);
  const resolvedCampaignId = promotion?.campaignId || requestedSlug;
  const canonicalSlug = resolveSlug(promotion?.slug);

  if (promotion && canonicalSlug && canonicalSlug !== requestedSlug) {
    redirect(`/promotions/${canonicalSlug}`);
  }

  if (!promotion || promotion.status === "draft" || promotion.status === "archived") {
    return notFound();
  }

  const state = deriveState(promotion);
  const { userId, sessionId } = await auth();
  const defaultItems = buildDefaultItems(promotion as ExtendedPromotion);
  const canAutoAdd =
    defaultItems.length > 0 && isActiveWindow(promotion) && (state === "active" || state === "scheduled");
  const audienceIds = buildPromotionAudienceIds(promotion as ExtendedPromotion);

  const [analyticsRaw, relatedByType, appliedProducts] = await Promise.all([
    getPromotionAnalytics(resolvedCampaignId),
    promotion.type ? getPromotionsByType(promotion.type) : Promise.resolve([] as PROMOTIONS_LIST_QUERYResult),
    getProductsForPromotionAudience(audienceIds),
  ]);

  const analytics = normalizeAnalytics(analyticsRaw);
  const relatedPromotions =
    (relatedByType || []).filter((promo) => promo?.campaignId && promo.campaignId !== resolvedCampaignId) ?? [];

  let userOffer: PersonalizedOffer | null = null;
  if (userId) {
    try {
      const eligibleOffers = await promotionEngine.getEligiblePromotions(userId, sessionId ?? "", {
        page: "homepage",
      });
      const matchingOffer = eligibleOffers.find(
        (offer) => offer?.campaignId === resolvedCampaignId
      );
      userOffer = buildPersonalOffer(matchingOffer);
    } catch (error) {
      console.error("[promotions] Failed to resolve personalized eligibility", error);
    }
  }

  return (
    <PromotionDetailClient
      promotion={promotion}
      state={state}
      resolvedCampaignId={resolvedCampaignId}
      analytics={analytics}
      userOffer={userOffer}
      relatedPromotions={relatedPromotions}
      appliedProducts={appliedProducts}
      defaultItems={defaultItems}
      canAutoAdd={canAutoAdd}
      userId={userId}
    />
  );
};

export default PromotionPage;
