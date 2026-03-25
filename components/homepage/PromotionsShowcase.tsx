// Promotions showcase section for homepage
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/Container";
import { urlFor } from "@/sanity/lib/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DealCountdown } from "@/components/DealCountdown";
import ShareButton from "@/components/shared/ShareButton";
import { ArrowRight, Tag, Clock, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HOMEPAGE_DEALS_QUERYResult, PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import { buildPromotionHref, resolvePromotionSlug } from "@/lib/promotions/paths";
import { useTranslation } from "react-i18next";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type Deal = NonNullable<HOMEPAGE_DEALS_QUERYResult[number]>;
type PromotionWithHref = Promotion & { href: string; slugValue?: string | null };
type DealWithProductSlug = Deal & {
  product: NonNullable<Deal["product"]> & { slug: string };
};

interface PromotionsShowcaseProps {
  promotions: PROMOTIONS_LIST_QUERYResult;
  deals: HOMEPAGE_DEALS_QUERYResult;
}

export function PromotionsShowcase({ promotions, deals }: PromotionsShowcaseProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const featuredCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Featured promotion (first one with hero image)
  const validPromotions: PromotionWithHref[] = (promotions ?? [])
    .filter(Boolean)
    .map((promo) => {
      const href = buildPromotionHref(promo, { fallback: "" });
      return {
        ...(promo as Promotion),
        href,
        slugValue: resolvePromotionSlug(promo),
      };
    })
    .filter((promo) => Boolean(promo.href));

  const featuredPromotion = validPromotions.find((p) => p.heroImage);
  const otherPromotions = validPromotions
    .filter((p) => p._id !== featuredPromotion?._id)
    .slice(0, 3);

  const validDeals: DealWithProductSlug[] = (deals ?? []).filter(
    (deal): deal is DealWithProductSlug =>
      Boolean(deal?.product && typeof deal.product.slug === "string")
  );
  const topDeals = validDeals.slice(0, 6);

  useEffect(() => {
    const node = featuredCardRef.current;
    if (!node) return;

    const syncHeroHeight = () => {
      const height = Math.round(node.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty("--hero-banner-fixed-height", `${height}px`);
      }
    };

    syncHeroHeight();

    const resizeObserver = new ResizeObserver(syncHeroHeight);
    resizeObserver.observe(node);
    window.addEventListener("resize", syncHeroHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncHeroHeight);
    };
  }, [featuredPromotion?._id]);

  return (
    <section className="border-y border-border py-12">
      <Container className="space-y-10 md:space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-semibold text-ink-strong">
            {t("client.home.promotions.title")}
          </h2>
          <p className="text-ink-muted max-w-2xl mx-auto">
            {t("client.home.promotions.subtitle")}
          </p>
        </div>

        {featuredPromotion && (
          <Link href={featuredPromotion.href} className="block group">
            <div
              ref={featuredCardRef}
              className="grid gap-6 rounded-2xl border border-border bg-surface-0 p-6 md:grid-cols-2 md:p-8"
            >
              <div className="space-y-4 self-center">
                <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                  {t("client.home.promotions.featuredLabel")}
                </p>
                <h3 className="text-2xl md:text-3xl font-semibold text-ink-strong">
                  {featuredPromotion.name || t("client.home.promotions.featuredFallbackTitle")}
                </h3>
                {featuredPromotion.heroMessage ? (
                  <p className="text-base text-ink-muted">{featuredPromotion.heroMessage}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                  <DiscountBadge promotion={featuredPromotion} size="lg" />
                  {mounted &&
                    featuredPromotion.urgencyTrigger?.showCountdown &&
                    featuredPromotion.endDate && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink">
                        <Clock className="h-4 w-4" />
                        <DealCountdown targetDate={featuredPromotion.endDate} />
                      </span>
                    )}
                </div>
                <Button asChild size="lg" variant="accent" className="w-fit">
                  <Link href={featuredPromotion.href || "/promotions"}>
                    {featuredPromotion.ctaText || t("client.home.promotions.featuredFallbackCta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {featuredPromotion.heroImage ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-1">
                  <Image
                    src={urlFor(featuredPromotion.heroImage).width(600).height(400).url()}
                    alt={featuredPromotion.name || "Promotion"}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Link>
        )}

        {otherPromotions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {otherPromotions.map((promo) => (
              <PromotionCard key={promo._id} promotion={promo} />
            ))}
          </div>
        )}

        {topDeals.length > 0 && (
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-ink-strong">
                {t("client.home.promotions.deals.title")}
              </h3>
              <Link href="/deal" className="text-sm font-semibold text-ink hover:underline">
                {t("client.home.promotions.deals.cta")}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {topDeals.map((deal) => (
                <DealCard key={deal._id} deal={deal} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

function PromotionCard({ promotion }: { promotion: PromotionWithHref }) {
  const { t } = useTranslation();
  const title = promotion.name || t("client.home.promotions.otherFallbackTitle");
  const href = promotion.href || "/promotions";
  const imageSource = promotion.thumbnailImage || promotion.heroImage;

  return (
    <div className="relative">
      <Link href={href} className="block">
        <Card className="group h-full overflow-hidden border border-border bg-surface-0 transition hover:border-ink">
          <div className="relative aspect-video">
            {imageSource ? (
              <Image
                src={urlFor(imageSource as any).width(400).height(225).url()}
                alt={title}
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-1 text-ink-muted">
                <Gift className="h-10 w-10" />
              </div>
            )}

            {promotion.badgeLabel && (
              <span className="absolute top-3 left-3 rounded-full border border-border bg-surface-0 px-3 py-1 text-xs font-semibold text-ink">
                {promotion.badgeLabel}
              </span>
            )}
          </div>

          <CardContent className="p-4">
            <h4 className="mb-1 line-clamp-1 font-semibold text-ink-strong group-hover:underline">
              {title}
            </h4>

            {promotion.shortDescription && (
              <p className="mb-3 line-clamp-2 text-sm text-ink-muted">
                {promotion.shortDescription}
              </p>
            )}

            <DiscountBadge promotion={promotion} />
          </CardContent>
        </Card>
      </Link>
      <ShareButton
        url={href}
        title={title}
        ariaLabel={t("client.home.promotions.share", { title })}
        iconOnly
        size="icon"
        variant="ghost"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 text-gray-700 shadow-sm hover:text-gray-900"
      />
    </div>
  );
}

function DealCard({ deal }: { deal: DealWithProductSlug }) {
  const { t } = useTranslation();
  const dealPrice = typeof deal.dealPrice === "number" ? deal.dealPrice : 0;
  const originalPrice = typeof deal.product.price === "number" ? deal.product.price : null;
  const title = deal.title || deal.product.name || t("client.promotions.type.deal");
  const href = `/products/${deal.product.slug}`;

  return (
    <div className="relative">
      <Link href={href} className="block">
        <Card className="group h-full border border-border bg-surface-0 transition hover:border-ink">
          <div className="relative aspect-square">
            {deal.product.imageUrl ? (
              <Image src={deal.product.imageUrl} alt={title} fill className="object-cover rounded-t-lg" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-1 text-ink-muted">
                <Tag className="h-8 w-8" />
              </div>
            )}

            {typeof deal.discountPercent === "number" && deal.discountPercent > 0 && (
              <span className="absolute right-2 top-2 rounded-full border border-border bg-surface-0 px-2 py-1 text-xs font-semibold text-ink">
                {t("client.home.promotions.discount.percentage", {
                  value: deal.discountPercent,
                })}
              </span>
            )}
          </div>

          <CardContent className="p-3">
            <h5 className="mb-2 line-clamp-2 text-sm font-semibold text-ink-strong group-hover:underline">
              {title}
            </h5>

            <div className="flex items-center gap-2">
              <span className="font-bold text-ink">${dealPrice}</span>
              {originalPrice !== null && originalPrice > dealPrice && (
                <span className="text-xs text-ink-muted line-through">${originalPrice}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
      <ShareButton
        url={href}
        title={title}
        ariaLabel={t("client.home.promotions.share", { title })}
        iconOnly
        size="icon"
        variant="ghost"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 text-gray-700 shadow-sm hover:text-gray-900"
      />
    </div>
  );
}

function DiscountBadge({ promotion, size = "default" }: { promotion: Promotion; size?: "default" | "lg" }) {
  const { t } = useTranslation();
  const sizeClasses = size === "lg" ? "text-lg py-1.5 px-3" : "text-sm py-1 px-2";

  if (promotion.discountType === "percentage") {
    return (
      <span className={cn("rounded-full border border-border bg-surface-1 text-ink px-3 py-1 text-xs font-semibold", sizeClasses)}>
        {t("client.home.promotions.discount.percentage", {
          value: promotion.discountValue,
        })}
      </span>
    );
  }

  if (promotion.discountType === "fixed") {
    return (
      <span className={cn("rounded-full border border-border bg-surface-1 text-ink px-3 py-1 text-xs font-semibold", sizeClasses)}>
        {t("client.home.promotions.discount.fixed", {
          value: promotion.discountValue,
        })}
      </span>
    );
  }

  if (promotion.discountType === "bxgy") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 text-ink px-3 py-1 text-xs font-semibold", sizeClasses)}>
        <Gift className="h-3 w-3" />
        {t("client.home.promotions.discount.bxgy", {
          buy: promotion.buyQuantity,
          get: promotion.getQuantity,
        })}
      </span>
    );
  }

  if (promotion.discountType === "freeShipping") {
    return (
      <span className={cn("rounded-full border border-border bg-surface-1 text-ink px-3 py-1 text-xs font-semibold", sizeClasses)}>
        {t("client.home.promotions.discount.freeShipping")}
      </span>
    );
  }

  return null;
}
