"use client";

import "@/app/i18n";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Container from "@/components/Container";
import DealAddToCartButton from "@/components/deals/DealAddToCartButton";
import DealGrid from "@/components/deals/DealGrid";
import ShareButton from "@/components/shared/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { image } from "@/sanity/image";
import type { DEAL_BY_ID_QUERYResult, DEALS_LIST_QUERYResult } from "@/sanity.types";


type Deal = NonNullable<DEAL_BY_ID_QUERYResult>;

type RelatedDeal = NonNullable<DEALS_LIST_QUERYResult[number]>;

type DealDetailPageClientProps = {
  deal: Deal;
  relatedDeals: RelatedDeal[];
  shareUrl?: string | null;
};

const resolveProductSlug = (product: Deal["product"]) => {
  if (typeof (product as { slug?: string | null })?.slug === "string") {
    return (product as { slug?: string | null }).slug;
  }

  const slug = (product as { slug?: { current?: string | null } | null })?.slug;
  if (slug && typeof slug.current === "string") return slug.current;

  return null;
};

const resolveVariantId = (product: Deal["product"]) => {
  if (!product) return undefined;
  if (typeof (product as { variantId?: string | null }).variantId === "string") {
    return (product as { variantId?: string | null }).variantId || undefined;
  }

  const variant = (product as { variant?: any })?.variant;
  if (typeof variant === "string" && variant.trim()) return variant;
  if (variant?._id) return variant._id;
  if (variant?._ref) return variant._ref;
  if (variant?.slug && typeof variant.slug.current === "string") return variant.slug.current;

  return undefined;
};

const resolveProductImageUrl = (deal: Deal) => {
  const direct = (deal.product as { imageUrl?: string | null })?.imageUrl;
  if (typeof direct === "string" && direct) return direct;

  const images = (deal.product as { images?: unknown })?.images;
  if (Array.isArray(images) && images.length > 0) {
    const candidate = images[0];
    try {
      const built = image(candidate as any).width(960).height(720).fit("crop").url();
      if (built) return built;
    } catch {
      // ignore builder errors and fall back to raw URLs
    }

    const fallbackUrl =
      (candidate as any)?.asset?.url ||
      (candidate as any)?.url ||
      (typeof candidate === "string" ? candidate : null);

    if (typeof fallbackUrl === "string") return fallbackUrl;
  }

  return null;
};

const resolveBasePrice = (deal: Deal) => {
  if (typeof deal.originalPrice === "number" && Number.isFinite(deal.originalPrice)) {
    return deal.originalPrice;
  }

  const productPrice = (deal.product as { price?: number | null })?.price;
  if (typeof productPrice === "number" && Number.isFinite(productPrice)) {
    return productPrice;
  }

  return null;
};

const resolveDealPrice = (deal: Deal, fallback?: number | null) => {
  if (typeof deal.dealPrice === "number" && Number.isFinite(deal.dealPrice)) {
    return deal.dealPrice;
  }

  return typeof fallback === "number" ? fallback : null;
};

export default function DealDetailPageClient({
  deal,
  relatedDeals,
  shareUrl,
}: DealDetailPageClientProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.toLowerCase().startsWith("th") ? "th-TH" : "en-US";
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "THB",
      }),
    [locale]
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
      }),
    [locale]
  );

  const productSlug = resolveProductSlug(deal.product);
  const productId = (deal.product as { _id?: string | null })?._id ?? "";
  const variantId = resolveVariantId(deal.product);
  const requiresVariant = Boolean((deal.product as any)?.variant || (deal.product as any)?.variantId);
  const canAutoAdd = Boolean(productId) && (!requiresVariant || Boolean(variantId));
  const imageUrl = resolveProductImageUrl(deal);

  const basePrice = resolveBasePrice(deal);
  const dealPrice = resolveDealPrice(deal, basePrice);
  const savingsAmount =
    typeof basePrice === "number" && typeof dealPrice === "number"
      ? Math.max(0, basePrice - dealPrice)
      : null;
  const percentOff =
    typeof basePrice === "number" && typeof dealPrice === "number" && basePrice > 0
      ? Math.max(0, Math.round(((basePrice - dealPrice) / basePrice) * 100))
      : null;

  const remainingQty =
    typeof deal.remainingQty === "number" && Number.isFinite(deal.remainingQty)
      ? Math.max(0, Math.floor(deal.remainingQty))
      : null;
  const isSoldOut = remainingQty !== null && remainingQty <= 0;

  const startLabel = deal.startDate
    ? t("client.dealDetail.meta.starts", {
        date: dateFormatter.format(new Date(deal.startDate)),
      })
    : null;
  const endLabel = deal.endDate
    ? t("client.dealDetail.meta.ends", {
        date: dateFormatter.format(new Date(deal.endDate)),
      })
    : null;
  const remainingLabel =
    remainingQty !== null
      ? isSoldOut
        ? t("client.dealDetail.meta.soldOut")
        : t("client.dealDetail.meta.remaining", { count: remainingQty })
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="py-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                {t("client.dealDetail.breadcrumb.home")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/deal">
                {t("client.dealDetail.breadcrumb.deals")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{deal.title || deal.product?.name || "Deal"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Container>

      <Container className="pb-12 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/deal">{t("client.dealDetail.back")}</Link>
          </Button>
          <ShareButton
            url={shareUrl}
            title={deal.title || deal.product?.name || "Deal"}
            label={t("client.dealDetail.share")}
            ariaLabel={t("client.dealDetail.share")}
            variant="outline"
            size="sm"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border border-slate-200/70 bg-white">
            <CardContent className="p-0">
              <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-slate-100 to-slate-200">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={deal.title || deal.product?.name || "Deal"}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    {deal.title || deal.product?.name || "Deal"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {deal.badge ? (
                <Badge
                  className="text-white"
                  style={
                    deal.badgeColor
                      ? { backgroundColor: deal.badgeColor, borderColor: deal.badgeColor }
                      : undefined
                  }
                >
                  {deal.badge}
                </Badge>
              ) : null}
              {deal.dealType ? (
                <Badge variant="secondary" className="capitalize">
                  {deal.dealType}
                </Badge>
              ) : null}
              {percentOff !== null ? (
                <Badge variant="secondary">
                  {t("client.deals.discount.percent", { value: percentOff })}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                {t("client.dealDetail.kicker")}
              </p>
              <h1 className="text-3xl font-bold text-ink-strong sm:text-4xl">
                {deal.title || deal.product?.name || "Deal"}
              </h1>
              {deal.product?.name && deal.title !== deal.product?.name ? (
                <p className="text-sm text-ink-muted">
                  {deal.product?.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              {typeof dealPrice === "number" ? (
                <span className="text-3xl font-semibold text-ink-strong">
                  {currencyFormatter.format(dealPrice)}
                </span>
              ) : null}
              {typeof basePrice === "number" && typeof dealPrice === "number" && basePrice > dealPrice ? (
                <span className="text-base text-ink-muted line-through">
                  {currencyFormatter.format(basePrice)}
                </span>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-xs uppercase text-ink-muted">
                  {t("client.dealDetail.price.original")}
                </p>
                <p className="text-base font-semibold text-ink-strong">
                  {typeof basePrice === "number"
                    ? currencyFormatter.format(basePrice)
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-xs uppercase text-ink-muted">
                  {t("client.dealDetail.price.deal")}
                </p>
                <p className="text-base font-semibold text-ink-strong">
                  {typeof dealPrice === "number"
                    ? currencyFormatter.format(dealPrice)
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-xs uppercase text-ink-muted">
                  {t("client.dealDetail.price.save")}
                </p>
                <p className={cn("text-base font-semibold", savingsAmount ? "text-emerald-600" : "text-ink-strong")}>
                  {typeof savingsAmount === "number"
                    ? currencyFormatter.format(savingsAmount)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-ink-muted">
              {startLabel ? <span>{startLabel}</span> : null}
              {endLabel ? <span>{endLabel}</span> : null}
              {remainingLabel ? <span>{remainingLabel}</span> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <DealAddToCartButton
                dealId={deal.dealId || deal._id || ""}
                productId={productId}
                variantId={variantId}
                status={deal.status || undefined}
                startDate={deal.startDate || undefined}
                endDate={deal.endDate || undefined}
                remainingQty={remainingQty ?? undefined}
                disabled={!canAutoAdd}
                className="gap-2"
              />
              {productSlug ? (
                <Button variant="outline" asChild>
                  <Link href={`/products/${productSlug}`}>
                    {t("client.dealDetail.cta.viewProduct")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {relatedDeals.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-ink-strong">
              {t("client.dealDetail.related.title")}
            </h2>
            <DealGrid deals={relatedDeals} columns={4} showAddToCart />
          </section>
        ) : null}
      </Container>
    </div>
  );
}
