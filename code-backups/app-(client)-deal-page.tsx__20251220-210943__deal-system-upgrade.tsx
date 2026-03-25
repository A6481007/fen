import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import Title from "@/components/Title";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import PromotionHero from "@/components/promotions/PromotionHero";
import { PromotionGrid } from "@/components/promotions/PromotionGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActivePromotions, getDealProducts } from "@/sanity/queries";
import type { DEAL_PRODUCTSResult, Product, PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import { Clock3, Flame, Percent, Tag, Zap } from "lucide-react";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type PromotionState = "active" | "scheduled" | "ended" | "paused";

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

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatDiscount = (promotion: Promotion) => {
  if (promotion.discountType === "percentage" && typeof promotion.discountValue === "number") {
    return `${Math.round(promotion.discountValue)}% off`;
  }

  if (promotion.discountType === "fixed" && typeof promotion.discountValue === "number") {
    return `$${promotion.discountValue.toFixed(2)} off`;
  }

  if (promotion.discountType === "freeShipping") {
    return "Free shipping";
  }

  return null;
};

const getPromotionImage = (promotion: Promotion) => {
  const hero = promotion.heroImage as { asset?: { url?: string }; url?: string } | undefined;
  const thumb = promotion.thumbnailImage as { asset?: { url?: string }; url?: string } | undefined;
  return hero?.asset?.url || hero?.url || thumb?.asset?.url || thumb?.url || "";
};

const PromotionSummaryCard = ({ promotion }: { promotion: Promotion }) => {
  const discount = formatDiscount(promotion);
  const endDate = formatDate(promotion.endDate);
  const href = promotion.campaignId ? `/promotions/${promotion.campaignId}` : undefined;
  const imageUrl = getPromotionImage(promotion);
  const state = deriveState(promotion);

  return (
    <Card className="group h-full overflow-hidden border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-36 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={promotion.name || "Promotion"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-white/80">
            Creative coming soon
          </div>
        )}
        {promotion.badgeLabel ? (
          <Badge className="absolute left-3 top-3 bg-white/90 text-gray-900 shadow">
            {promotion.badgeLabel}
          </Badge>
        ) : null}
      </div>

      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {promotion.type || "Promotion"}
          </Badge>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            {state === "active" ? "Live" : state === "scheduled" ? "Scheduled" : "Paused"}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
            {promotion.name || "Untitled promotion"}
          </h3>
          {promotion.shortDescription || promotion.heroMessage ? (
            <p className="text-sm text-gray-600 line-clamp-2">
              {promotion.shortDescription || promotion.heroMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-gray-700">
          {discount ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
              <Percent className="h-4 w-4" />
              {discount}
            </span>
          ) : null}

          {endDate ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">
              <Clock3 className="h-4 w-4" />
              Ends {endDate}
            </span>
          ) : null}

          {promotion.badgeColor || promotion.badgeLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
              <Tag className="h-4 w-4" />
              {promotion.badgeLabel || "Featured"}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {promotion.campaignId ? `Campaign ${promotion.campaignId}` : "Active promotion"}
          </div>
          {href ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={href}>View offer</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export const metadata: Metadata = {
  title: "Deals & Promotions | ShopCart",
  description: "Live flash sales, seasonal campaigns, and legacy hot deals.",
  openGraph: {
    title: "Deals & Promotions | ShopCart",
    description: "Discover live promotions, flash sales, and hot deal products.",
  },
  alternates: {
    canonical: "/deal",
  },
};

const DealPage = async () => {
  const [promotionData, hotDeals] = await Promise.all([getActivePromotions(), getDealProducts()]);

  const promotions = (promotionData || []).filter(Boolean) as Promotion[];
  const sortedPromotions = [...promotions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const flashSales = sortedPromotions.filter((promotion) => promotion?.type === "flashSale");
  const otherPromos = sortedPromotions.filter((promotion) => promotion?.type !== "flashSale");
  const featuredPromotion = flashSales[0] ?? sortedPromotions[0];
  const hasPromotions = sortedPromotions.length > 0;
  const hasHotDeals = (hotDeals?.length ?? 0) > 0;
  const showHotDeals = !hasPromotions || hasHotDeals;

  const featuredState = featuredPromotion ? deriveState(featuredPromotion) : null;
  const featuredCampaignId = featuredPromotion?.campaignId;
  const featuredId = featuredPromotion?._id;

  const leftoverFlashSales = flashSales.filter(
    (promotion) => promotion.campaignId !== featuredCampaignId && promotion._id !== featuredId
  );
  const remainingPromos = otherPromos.filter(
    (promotion) => promotion.campaignId !== featuredCampaignId && promotion._id !== featuredId
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="pt-6">
        <DynamicBreadcrumb />
      </Container>

      <Container className="space-y-8 py-10">
        <header className="text-center space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Today&apos;s deals
          </p>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Promotions & hot deals</h1>
          <p className="text-gray-600">
            Live campaigns are prioritized first. Legacy hot deals remain available as a fallback.
          </p>
        </header>

        {featuredPromotion ? (
          <section className="space-y-6">
            <PromotionHero
              promotion={featuredPromotion}
              state={featuredState || "active"}
            />
            {featuredState === "active" && featuredPromotion.products?.length ? (
              <PromotionGrid
                products={featuredPromotion.products}
                campaignId={featuredPromotion.campaignId || featuredPromotion._id || "campaign"}
                discountType={featuredPromotion.discountType}
                discountValue={featuredPromotion.discountValue}
              />
            ) : null}
          </section>
        ) : null}

        {leftoverFlashSales.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl font-bold text-gray-900">Flash sales</h2>
              </div>
              <Badge className="bg-amber-100 text-amber-800">Limited time</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leftoverFlashSales.map((promotion) => (
                <PromotionSummaryCard
                  key={promotion.campaignId || promotion._id}
                  promotion={promotion}
                />
              ))}
            </div>
          </section>
        ) : null}

        {remainingPromos.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900">Current promotions</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/promotions">View all</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {remainingPromos.map((promotion) => (
                <PromotionSummaryCard
                  key={promotion.campaignId || promotion._id}
                  promotion={promotion}
                />
              ))}
            </div>
          </section>
        ) : null}

        {showHotDeals ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-red-500" />
                <Title className="mb-0 text-2xl font-bold text-gray-900">Hot deal products</Title>
              </div>
              {hasHotDeals ? (
                <Badge variant="destructive" className="text-xs">
                  Legacy deals
                </Badge>
              ) : null}
            </div>

            {hasHotDeals ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {hotDeals?.map((product: DEAL_PRODUCTSResult[number]) => (
                  <div key={product?._id} className="transition hover:-translate-y-1">
                    <ProductCard product={product as unknown as Product} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Flame className="h-8 w-8 text-red-400" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900">No hot deals right now</h3>
                    <p className="text-sm text-gray-600">
                      Promotions will appear here as soon as they are active.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/products">Browse all products</Link>
                  </Button>
                </div>
              </Card>
            )}
          </section>
        ) : null}

        {!hasPromotions && !hasHotDeals ? (
          <Card className="border-dashed border-gray-200 bg-gray-50">
            <CardContent className="space-y-3 p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900">No deals available</h2>
              <p className="text-sm text-gray-600">
                Check back soon for flash sales, seasonal offers, and house deals.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild variant="default">
                  <Link href="/promotions">See upcoming promotions</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/products">Shop all products</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </Container>
    </div>
  );
};

export default DealPage;
