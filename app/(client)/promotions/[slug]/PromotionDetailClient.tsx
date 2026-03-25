"use client";

import Container from "@/components/Container";
import { PromotionAnalyticsBar } from "@/components/promotions/PromotionAnalyticsBar";
import { PromotionAddToCartButton } from "@/components/promotions/PromotionAddToCartButton";
import PromotionBundleQuantityControl from "@/components/promotions/PromotionBundleQuantityControl";
import { PersonalizedOffers, type PersonalizedOffer } from "@/components/promotions/PersonalizedOffers";
import { PromotionHero } from "@/components/promotions/PromotionHero";
import PromotionProductsTable from "@/components/promotions/PromotionProductsTable";
import PromotionTerms from "@/components/promotions/PromotionTerms";
import PromotionViewTracker from "@/components/promotions/PromotionViewTracker";
import RelatedPromotions from "@/components/promotions/RelatedPromotions";
import { Badge } from "@/components/ui/badge";
import type {
  PROMOTION_BY_CAMPAIGN_ID_QUERYResult,
  PROMOTIONS_LIST_QUERYResult,
} from "@/sanity.types";
import type { CartLineInput } from "@/lib/cart/client";
import { useTranslation } from "react-i18next";

type Promotion = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;
type RelatedPromotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type PromotionState = "active" | "scheduled" | "ended" | "paused";
type PromotionProduct = NonNullable<Promotion["products"]>[number];
type BundleItem = {
  product: PromotionProduct;
  quantity: number;
  isFree: boolean;
};
type PromotionUrgencyTrigger = {
  showCountdown?: boolean;
  urgencyMessage?: string;
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

type DefaultCartItem = CartLineInput;

type PromotionDetailClientProps = {
  promotion: Promotion;
  state: PromotionState;
  resolvedCampaignId: string;
  analytics: PromotionAnalyticsView;
  userOffer: PersonalizedOffer | null;
  relatedPromotions: RelatedPromotion[];
  appliedProducts: PromotionProduct[];
  defaultItems: DefaultCartItem[];
  canAutoAdd: boolean;
  userId?: string | null;
};

const stateBadgeStyles: Record<PromotionState, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  scheduled: "border-amber-200 bg-amber-50 text-amber-800",
  ended: "border-slate-200 bg-slate-100 text-slate-600",
  paused: "border-rose-200 bg-rose-50 text-rose-800",
};

const resolveSlug = (slug?: Promotion["slug"] | null) => {
  if (!slug) return undefined;
  if (typeof slug === "string") return slug;
  const slugObject = slug as { current?: unknown };
  if (slugObject && typeof slugObject.current === "string") {
    return slugObject.current as string;
  }
  return undefined;
};

const resolveImageUrl = (promotion: Promotion) => {
  const hero = promotion.heroImage as { asset?: { url?: string }; url?: string } | undefined;
  const thumb = promotion.thumbnailImage as { asset?: { url?: string }; url?: string } | undefined;
  return hero?.asset?.url || hero?.url || thumb?.asset?.url || thumb?.url || undefined;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Math.max(0, value || 0));

const resolveProductSlug = (product: PromotionProduct) => {
  if (typeof product.slug === "string" && product.slug) return product.slug;
  if (product.slug && typeof product.slug === "object" && "current" in product.slug) {
    const current = (product.slug as { current?: unknown }).current;
    return typeof current === "string" && current ? current : undefined;
  }
  return undefined;
};

const resolveProductImage = (product: PromotionProduct) => {
  if (typeof product.imageUrl === "string" && product.imageUrl) return product.imageUrl;
  const firstImage = Array.isArray(product.images)
    ? product.images.find((item) => item && typeof item === "object")
    : null;
  return (firstImage as { url?: string; asset?: { url?: string } } | null)?.url ||
    (firstImage as { url?: string; asset?: { url?: string } } | null)?.asset?.url ||
    "";
};

const buildHeroPromotion = (
  promotion: Promotion,
  fallbackId: string,
  t: (key: string, defaultValue?: string) => string
) => ({
  campaignId: promotion.campaignId || promotion._id || fallbackId,
  name: promotion.name || t("client.promotions.detail.heroFallbackName", "Promotion"),
  heroMessage: promotion.heroMessage || promotion.shortDescription || "",
  heroImage: resolveImageUrl(promotion)
    ? {
        url: resolveImageUrl(promotion) as string,
        alt: promotion.name || t("client.promotions.detail.heroFallbackName", "Promotion"),
      }
    : undefined,
  discountType: promotion.discountType || "percentage",
  discountValue: promotion.discountValue ?? 0,
  badgeLabel: promotion.badgeLabel || t("client.promotions.detail.heroFallbackBadge", "Promotion"),
  badgeColor: promotion.badgeColor || undefined,
  ctaText: promotion.ctaText || t("client.promotions.detail.heroFallbackCta", "Shop now"),
  ctaLink: promotion.ctaLink || undefined,
  startDate: promotion.startDate || "",
  endDate: promotion.endDate || "",
  urgencyTrigger:
    promotion.urgencyTrigger && typeof promotion.urgencyTrigger === "object"
      ? {
          showCountdown: Boolean(
            (promotion.urgencyTrigger as PromotionUrgencyTrigger).showCountdown
          ),
          urgencyMessage:
            typeof (promotion.urgencyTrigger as PromotionUrgencyTrigger).urgencyMessage ===
            "string"
              ? (promotion.urgencyTrigger as PromotionUrgencyTrigger).urgencyMessage
              : undefined,
        }
      : undefined,
  assignedVariant: (promotion as { assignedVariant?: { copy?: string; cta?: string } }).assignedVariant,
});

export default function PromotionDetailClient({
  promotion,
  state,
  resolvedCampaignId,
  analytics,
  userOffer,
  relatedPromotions,
  appliedProducts,
  defaultItems,
  canAutoAdd,
  userId,
}: PromotionDetailClientProps) {
  const { t } = useTranslation();
  const stateLabels: Record<PromotionState, string> = {
    active: t("client.promotions.detail.state.active", "Live now"),
    scheduled: t("client.promotions.detail.state.scheduled", "Coming soon"),
    ended: t("client.promotions.detail.state.ended", "Ended"),
    paused: t("client.promotions.detail.state.paused", "Paused"),
  };
  const heroPromotion = buildHeroPromotion(promotion, resolvedCampaignId, t);
  const promoSlug = resolveSlug(promotion.slug);
  const isBxgy = promotion.discountType === "bxgy" || promotion.type === "bundle";
  const bundleItems = ((promotion.defaultBundleItems ?? []) as Array<{
    product?: PromotionProduct | null;
    quantity?: number | null;
    isFree?: boolean | null;
  }>)
    .map((item) =>
      item?.product
        ? {
            product: item.product,
            quantity: Math.max(1, item.quantity ?? 1),
            isFree: Boolean(item.isFree),
          }
        : null,
    )
    .filter((item): item is BundleItem => Boolean(item));
  const fallbackBuyItems =
    (((promotion.targetAudience?.products ?? promotion.products ?? []) as PromotionProduct[]) ?? [])
      .map((product) => ({
        product,
        quantity: Math.max(1, promotion.buyQuantity ?? 1),
        isFree: false,
      }))
      .filter((item) => Boolean(item.product?._id));
  const bxgyBuyItems = bundleItems.some((item) => !item.isFree)
    ? bundleItems.filter((item) => !item.isFree)
    : fallbackBuyItems;
  const bxgyGetItems = bundleItems.filter((item) => item.isFree);
  const bxgyBuyProducts = bxgyBuyItems.map((item) => item.product);
  const products = (
    appliedProducts?.length
      ? appliedProducts
      : isBxgy
        ? bxgyBuyProducts.length
          ? bxgyBuyProducts
          : (promotion.targetAudience?.products ?? promotion.products ?? [])
        : promotion.products ?? []
  ).filter(Boolean);
  const offerList = userOffer ? [userOffer] : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <PromotionViewTracker campaignId={resolvedCampaignId} userId={userId} />

      <Container className="space-y-10 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
              {t("client.promotions.detail.kicker", "Promotions")}
            </p>
            <h1 className="text-2xl font-bold text-ink-strong sm:text-3xl">
              {promotion.name || t("client.promotions.detail.titleFallback", "Promotion details")}
            </h1>
            {promotion.shortDescription ? (
              <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                {promotion.shortDescription}
              </p>
            ) : null}
          </div>
          <Badge variant="outline" className={stateBadgeStyles[state]}>
            {stateLabels[state]}
          </Badge>
        </header>

        <PromotionHero
          promotion={heroPromotion}
          analytics={{ impressions: analytics.impressions, conversions: analytics.conversions }}
          personalOffer={
            userOffer
              ? {
                  discountDisplay:
                    userOffer.discountSummary ||
                    t("client.promotions.detail.specialOffer", "Special offer"),
                  eligibilityReason:
                    userOffer.eligibilityReason ||
                    t(
                      "client.promotions.detail.eligibleReason",
                      "Eligible for this promotion"
                    ),
                }
              : undefined
          }
          state={state}
          variant="large"
          showCountdown
        />

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <PromotionAnalyticsBar
              analytics={{
                impressions: analytics.impressions,
                clicks: analytics.clicks,
                conversions: analytics.conversions,
                totalDiscountSpent: analytics.totalDiscountSpent,
                totalRevenue: analytics.totalRevenue,
              }}
              budgetCap={promotion.budgetCap ?? undefined}
              usageLimit={promotion.usageLimit ?? undefined}
              showPublicStats
              showAdminStats={false}
              variant="bar"
            />

            {offerList ? (
              <PersonalizedOffers
                context="promotion-page"
                offers={offerList}
                variant="banner"
                maxOffers={1}
              />
            ) : null}

            {isBxgy && (bxgyBuyItems.length > 0 || bxgyGetItems.length > 0) ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-ink-strong">
                    {t("client.promotions.detail.bundleTitle", "Bundle products")}
                  </h2>
                  <span className="text-sm text-ink-muted">
                    {t("client.promotions.detail.itemsCount", {
                      defaultValue: "{{count}} items",
                      count: bxgyBuyItems.length + bxgyGetItems.length,
                    })}
                  </span>
                </div>

                {[
                  {
                    key: "buy",
                    title: t("client.promotions.detail.bundleBuyTitle", "Products to buy"),
                    items: bxgyBuyItems,
                    accent: "border-slate-200 bg-white",
                  },
                  {
                    key: "get",
                    title: t("client.promotions.detail.bundleGetTitle", "Products you get"),
                    items: bxgyGetItems,
                    accent: "border-emerald-200 bg-emerald-50/40",
                  },
                ]
                  .filter((section) => section.items.length > 0)
                  .map((section) => (
                    <div
                      key={section.key}
                      className={`rounded-xl border p-4 shadow-sm ${section.accent}`}
                    >
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
                        {section.title}
                      </h3>
                      <div className="mt-4 space-y-3">
                        {section.items.map(({ product, quantity, isFree }) => {
                          const slug = resolveProductSlug(product);
                          const href = `/products/${slug || product._id}`;
                          const imageSrc = resolveProductImage(product);
                          const price = typeof product.price === "number" ? product.price : 0;

                          return (
                            <a
                              key={`${section.key}-${product._id}`}
                              href={href}
                              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                                  {imageSrc ? (
                                    <img
                                      src={imageSrc}
                                      alt={product.name || "Product"}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-ink-strong">
                                    {product.name || t("client.promotions.productList.productFallback", "Product")}
                                  </p>
                                  <p className="truncate text-xs text-ink-muted">
                                    {slug || product._id}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-ink-strong">
                                  {t("client.promotions.detail.bundleQty", {
                                    defaultValue: "Qty {{count}}",
                                    count: quantity,
                                  })}
                                </p>
                                <p className={`text-sm ${isFree ? "font-semibold text-emerald-700" : "text-ink-muted"}`}>
                                  {isFree
                                    ? t("client.promotions.detail.bundleFree", "Free")
                                    : formatCurrency(price)}
                                </p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-ink-strong">
                    {t("client.promotions.detail.applyTitle", "Apply this promotion")}
                  </h3>
                  <p className="mt-2 text-sm text-ink-muted">
                    {t(
                      "client.promotions.detail.bundleApplyDescription",
                      "Add this full bundle to your cart to redeem the Buy X Get Y offer."
                    )}
                  </p>
                  <PromotionAddToCartButton
                    promotionId={resolvedCampaignId}
                    items={defaultItems}
                    watchedProductIds={bundleItems.map((item) => item.product?._id).filter(Boolean)}
                    disabled={!canAutoAdd}
                    className="mt-4 w-full"
                    size="lg"
                    label={t("client.promotions.addToCart.cta", "Add to Cart")}
                    cartLabel={t("client.promotions.addToCart.cta", "Add to Cart")}
                  />
                  <PromotionBundleQuantityControl
                    promotionId={resolvedCampaignId}
                    items={defaultItems}
                    disabled={!canAutoAdd}
                    className="mt-3 w-full"
                  />
                  {!canAutoAdd ? (
                    <p className="mt-2 text-xs text-ink-muted">
                      {t(
                        "client.promotions.detail.applyDisabled",
                        "This promotion needs default items configured or is not active yet."
                      )}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : products.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-ink-strong">
                    {t("client.promotions.detail.includedProducts", "Included products")}
                  </h2>
                  <span className="text-sm text-ink-muted">
                    {t("client.promotions.detail.itemsCount", {
                      defaultValue: "{{count}} items",
                      count: products.length,
                    })}
                  </span>
                </div>
                <PromotionProductsTable products={products} promotion={promotion} />
              </section>
            ) : null}

            <PromotionTerms promotion={promotion} />
          </div>

          <aside className="space-y-4">
            {!isBxgy ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-ink-strong">
                  {t("client.promotions.detail.applyTitle", "Apply this promotion")}
                </h3>
                <p className="mt-2 text-sm text-ink-muted">
                  {t(
                    "client.promotions.detail.applyDescription",
                    "Add the pre-configured items to your cart to redeem this offer."
                  )}
                </p>
                <PromotionAddToCartButton
                  promotionId={resolvedCampaignId}
                  items={defaultItems}
                  watchedProductIds={products.map((product) => product?._id).filter(Boolean)}
                  disabled={!canAutoAdd}
                  className="mt-4 w-full"
                  size="lg"
                />
                {!canAutoAdd ? (
                  <p className="mt-2 text-xs text-ink-muted">
                    {t(
                      "client.promotions.detail.applyDisabled",
                      "This promotion needs default items configured or is not active yet."
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}

            <RelatedPromotions
              currentId={promoSlug || resolvedCampaignId}
              type={promotion.type}
              promotions={relatedPromotions}
            />
          </aside>
        </section>
      </Container>
    </div>
  );
}
