"use client";

import { useCallback } from "react";
import { PromotionCard } from "@/components/promotions/PromotionCard";
import { Badge } from "@/components/ui/badge";
import { trackPromoAddToCart } from "@/lib/analytics/pixels";
import { usePromotionTracking } from "@/hooks/usePromotionTracking";
import { useCart } from "@/hooks/useCart";
import { ShoppingCart } from "lucide-react";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;

interface PromotionsGridClientProps {
  promotions: Promotion[];
}

const getFirstProductId = (promotion: Promotion): string | undefined => {
  const extended = promotion as Promotion & {
    defaultProducts?: Array<{ product?: { _id?: string; id?: string } }>;
    defaultBundleItems?: Array<{ product?: { _id?: string; id?: string } }>;
  };

  const defaultProduct =
    extended.defaultProducts?.[0]?.product?._id ??
    extended.defaultProducts?.[0]?.product?.id ??
    extended.defaultBundleItems?.[0]?.product?._id ??
    extended.defaultBundleItems?.[0]?.product?.id;

  if (defaultProduct) return defaultProduct;

  const products = Array.isArray(promotion.products) ? promotion.products : [];
  const firstProduct = products[0] as { _id?: string; id?: string } | string | undefined;

  if (!firstProduct) return undefined;
  if (typeof firstProduct === "string") return firstProduct;

  return firstProduct._id || firstProduct.id || undefined;
};

export function PromotionsGridClient({ promotions }: PromotionsGridClientProps) {
  const { trackAddToCart } = usePromotionTracking();

  const handleAddToCart = useCallback(
    (promotion: Promotion) => {
      const productId = getFirstProductId(promotion);
      if (!promotion?.campaignId || !productId) {
        return;
      }

      void trackAddToCart(promotion.campaignId, productId, {
        page: "promotions",
        variant: promotion.type || undefined,
        quantity: 1,
      });

      try {
        trackPromoAddToCart({
          campaignId: promotion.campaignId,
          campaignName: promotion.name ?? promotion.campaignId,
          discountType: promotion.discountType ?? undefined,
          discountValue: promotion.discountValue ?? undefined,
          productId,
          quantity: 1,
          value: promotion.discountValue ?? undefined,
        });
      } catch (error) {
        console.error("[promotions] add-to-cart tracking failed", error);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("promotion:add-to-cart", {
            detail: { count: 1 },
          })
        );
      }
    },
    [trackAddToCart]
  );

  if (!promotions.length) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {promotions.map((promotion) => (
        <PromotionCard
          key={promotion._id || promotion.campaignId}
          promotion={promotion}
          showAddToCart
          onAddToCart={() => handleAddToCart(promotion)}
          className="h-full"
        />
      ))}
    </div>
  );
}

export function CartCountIndicator() {
  const { t } = useTranslation();
  const { cart } = useCart();
  const count = cart?.items.reduce((total, item) => total + (item.quantity ?? 1), 0) ?? 0;

  return (
    <Link href="/cart" className="inline-flex">
      <Badge
        variant="outline"
        className="flex min-h-[44px] items-center gap-2 border-white/60 bg-white/90 px-3 text-emerald-900 shadow-sm"
      >
        <ShoppingCart className="h-4 w-4" />
        <span className="font-semibold">{t("client.promotions.cart.label")}</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
          {count}
        </span>
      </Badge>
    </Link>
  );
}

export default PromotionsGridClient;
