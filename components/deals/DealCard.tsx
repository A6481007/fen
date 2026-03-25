"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, BadgePercent, Clock3, Flame, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactElement } from "react";

import DealAddToCartButton from "./DealAddToCartButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ShareButton from "@/components/shared/ShareButton";
import { cn } from "@/lib/utils";
import { image } from "@/sanity/image";
import type { DEALS_LIST_QUERYResult } from "@/sanity.types";
import "@/app/i18n";

type Deal = NonNullable<DEALS_LIST_QUERYResult[number]>;

export interface DealCardProps {
  deal: Deal;
  showAddToCart?: boolean;
  onClick?: () => void;
  className?: string;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "THB",
});

const formatCurrency = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? currencyFormatter.format(value) : null;

const getProductSlug = (product: DealCardProps["deal"]["product"]) => {
  if (typeof product?.slug === "string") {
    return product.slug;
  }

  if (product?.slug && typeof (product.slug as { current?: string }).current === "string") {
    return (product.slug as { current?: string }).current;
  }

  return null;
};

const resolveVariantId = (product: Deal["product"]) => {
  if (!product) return undefined;
  if (typeof (product as any).variantId === "string" && (product as any).variantId.trim()) {
    return (product as any).variantId;
  }

  const variant = (product as any).variant;
  if (typeof variant === "string" && variant.trim()) return variant;
  if (variant?._id) return variant._id;
  if (variant?._ref) return variant._ref;
  if (variant?.slug && typeof variant.slug.current === "string") return variant.slug.current;

  return undefined;
};

const getProductImageUrl = (deal: DealCardProps["deal"]) => {
  const direct = (deal?.product as any)?.imageUrl;
  if (typeof direct === "string" && direct) {
    return direct;
  }

  const images = (deal?.product as { images?: unknown })?.images;
  if (Array.isArray(images) && images.length > 0) {
    const candidate = images[0];

    try {
      const built = image(candidate as any).width(640).height(480).fit("crop").url();
      if (built) {
        return built;
      }
    } catch {
      // ignore builder errors and fall back to raw URLs
    }

    const fallbackUrl =
      (candidate as any)?.asset?.url ||
      (candidate as any)?.url ||
      (typeof candidate === "string" ? candidate : null);

    if (typeof fallbackUrl === "string") {
      return fallbackUrl;
    }
  }

  return null;
};

export function DealCard({ deal, showAddToCart = true, onClick, className }: DealCardProps) {
  const { t } = useTranslation();
  const productSlug = getProductSlug(deal.product);
  const href = productSlug
    ? `/products/${productSlug}`
    : deal.dealId
      ? `/deal/${deal.dealId}`
      : "#";

  const productImage = getProductImageUrl(deal);
  const basePrice = typeof deal.originalPrice === "number" && !Number.isNaN(deal.originalPrice)
    ? deal.originalPrice
    : null;
  const dealPrice =
    typeof deal.dealPrice === "number" && !Number.isNaN(deal.dealPrice) ? deal.dealPrice : null;

  const percentOff =
    typeof deal.discountPercent === "number" && Number.isFinite(deal.discountPercent)
      ? Math.max(0, Math.round(deal.discountPercent))
      : basePrice && dealPrice
        ? Math.max(0, Math.round(((basePrice - dealPrice) / basePrice) * 100))
        : null;

  const savingsAmount =
    basePrice !== null && dealPrice !== null ? Math.max(0, basePrice - dealPrice) : null;

  const savingsLabel =
    percentOff !== null
      ? t("client.deals.card.savePercent", { value: percentOff })
      : savingsAmount !== null
        ? t("client.deals.card.saveAmount", { amount: currencyFormatter.format(savingsAmount) })
        : null;

  const remainingQty =
    typeof deal.remainingQty === "number" && Number.isFinite(deal.remainingQty)
      ? Math.max(0, Math.floor(deal.remainingQty))
      : null;
  const showRemaining = remainingQty !== null && remainingQty < 20;
  const isSoldOut = remainingQty !== null && remainingQty <= 0;

  const fallbackTypeLabel = deal.dealType || t("client.cart.promo.type.deal");
  const dealTypeMap: Record<string, { label: string; icon: ReactElement }> = {
    featured: {
      label: t("client.deals.card.type.featured"),
      icon: <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />,
    },
    priceDrop: {
      label: t("client.deals.card.type.priceDrop"),
      icon: <ArrowDown className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
    },
    limitedQty: {
      label: t("client.deals.card.type.limitedQty"),
      icon: <Flame className="h-4 w-4 text-red-500" aria-hidden="true" />,
    },
    daily: {
      label: t("client.deals.card.type.daily"),
      icon: <Clock3 className="h-4 w-4 text-blue-600" aria-hidden="true" />,
    },
    clearance: {
      label: t("client.deals.card.type.clearance"),
      icon: <Tag className="h-4 w-4 text-slate-700" aria-hidden="true" />,
    },
  };
  const dealTypeMeta = dealTypeMap[deal.dealType ?? ""] ?? {
    label: fallbackTypeLabel,
    icon: <Tag className="h-4 w-4 text-slate-700" aria-hidden="true" />,
  };

  const productId = (deal.product as { _id?: string | null })?._id ?? "";
  const variantId = resolveVariantId(deal.product);
  const requiresVariant = Boolean((deal.product as any)?.variant || (deal.product as any)?.variantId);
  const canAutoAdd = Boolean(productId) && (!requiresVariant || Boolean(variantId));
  const cardTitle = deal.title || t("client.cart.promo.type.deal");
  const productName = deal.product?.name || t("client.deals.card.viewProduct");

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border border-slate-100 bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      <Link href={href} onClick={onClick} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
          {productImage ? (
            <Image
              src={productImage}
              alt={deal.title || deal.product?.name || t("client.deals.card.imageAlt")}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 320px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <Tag className="h-8 w-8" aria-hidden="true" />
            </div>
          )}

          {deal.badge ? (
            <Badge
              className="absolute left-3 top-3 bg-white/90 text-gray-900 shadow"
              style={
                deal.badgeColor
                  ? { backgroundColor: deal.badgeColor, color: "#fff", borderColor: deal.badgeColor }
                  : undefined
              }
            >
              {deal.badge}
            </Badge>
          ) : null}

          {percentOff !== null ? (
            <Badge variant="destructive" className="absolute right-3 top-3 flex items-center gap-1 shadow">
              <BadgePercent className="h-4 w-4" />
              -{percentOff}%
            </Badge>
          ) : savingsAmount !== null ? (
            <Badge variant="destructive" className="absolute right-3 top-3 shadow">
              {t("client.deals.card.saveAmount", { amount: currencyFormatter.format(savingsAmount) })}
            </Badge>
          ) : null}
        </div>
      </Link>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold">
            {dealTypeMeta.icon}
            <span className="capitalize">{dealTypeMeta.label}</span>
          </span>
          {deal.status ? (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
              {deal.status}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-2">
          <Link href={href} onClick={onClick} className="flex-1 space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
              {cardTitle}
            </h3>
            <p className="line-clamp-1 text-sm text-gray-600">
              {productName}
            </p>
          </Link>
          <ShareButton
            url={href}
            title={deal.title || deal.product?.name || t("client.cart.promo.type.deal")}
            ariaLabel={t("client.promotions.card.shareLabel", { title: cardTitle })}
            iconOnly
            size="icon"
            variant="ghost"
            className="text-slate-600 hover:text-slate-900"
          />
        </div>

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {dealPrice !== null ? formatCurrency(dealPrice) : "-"}
              </span>
              {basePrice !== null && (dealPrice === null || basePrice > dealPrice) ? (
                <span className="text-sm text-gray-500 line-through">{formatCurrency(basePrice)}</span>
              ) : null}
            </div>
            {savingsLabel ? (
              <span className="text-sm font-medium text-emerald-700">{savingsLabel}</span>
            ) : null}
          </div>

          {showRemaining ? (
            <Badge variant={isSoldOut ? "destructive" : "secondary"} className="shrink-0">
              {isSoldOut
                ? t("client.deals.addToCart.soldOut")
                : t("client.deals.addToCart.leftBadge", { count: remainingQty })}
            </Badge>
          ) : null}
        </div>

        {showAddToCart ? (
          <DealAddToCartButton
            dealId={deal.dealId ?? ""}
            productId={productId}
            variantId={variantId}
            remainingQty={remainingQty ?? undefined}
            status={deal.status}
            startDate={deal.startDate ?? undefined}
            endDate={deal.endDate ?? undefined}
            disabled={!canAutoAdd}
            className="w-full justify-center"
          />
        ) : null}

        {!canAutoAdd ? (
          <p className="text-xs text-amber-700">
            {requiresVariant
              ? t("client.cart.add.selectOptions")
              : t("client.deals.card.quickAddUnavailable")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default DealCard;
