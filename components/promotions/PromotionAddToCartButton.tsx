"use client";

import Link from "next/link";
import { Loader2, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { trackEvent } from "@/lib/analytics";
import type { Cart } from "@/lib/cart/types";
import type { CartLineInput } from "@/lib/cart/client";
import { useTranslation } from "react-i18next";

export interface PromotionAddToCartButtonProps {
  promotionId: string;
  items: CartLineInput[];
  watchedProductIds?: string[];
  promoCode?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
  label?: string;
  cartLabel?: string;
  onSuccess?: (result: { cart: Cart; delta: number }) => void;
}

export function PromotionAddToCartButton({
  promotionId,
  items,
  watchedProductIds,
  promoCode,
  disabled,
  className,
  size = "default",
  variant = "default",
  label,
  cartLabel,
  onSuccess,
}: PromotionAddToCartButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { cart, addItems, isMutating } = useCart();
  const shouldShowCartLink =
    (cart?.items ?? []).some(
      (line) =>
        Boolean(watchedProductIds?.includes(line.productId)) ||
        (line.appliedPromotion?.type === "promotion" && line.appliedPromotion.id === promotionId),
    );

  const collectWarnings = (nextCart: Cart, addedItems: CartLineInput[]) => {
    const buildKey = (productId?: string, variantId?: string) =>
      `${productId || ""}:${variantId || ""}`;
    const targetKeys = new Set(addedItems.map((item) => buildKey(item.productId, item.variantId)));
    const warnings = new Set<string>();

    (nextCart.warnings || []).forEach((warning) => warnings.add(warning));

    nextCart.items.forEach((line) => {
      const key = buildKey(line.productId, line.variantId);
      if (!targetKeys.has(key)) return;
      (line.messages || []).forEach((message) => warnings.add(message));
    });

    return Array.from(warnings);
  };

  const handleClick = () => {
    if (!items.length) {
      toast.error(t("client.promotions.addToCart.noItems"));
      return;
    }

    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const previousTotal = cart?.total ?? 0;

    trackEvent("promo_add_click", {
      promotionId,
      totalQuantity,
    });

    void (async () => {
      try {
        const result = await addItems({
          promotionId,
          promoCode,
          items,
        });

        trackEvent("promo_add_success", {
          promotionId,
          totalQuantity,
          delta: result.delta,
          cartTotal: result.cart.total,
          previousTotal,
        });

        const warnings = collectWarnings(result.cart, items);
        if (warnings.length) {
          toast(t("client.promotions.addToCart.addedWithWarnings"), {
            description: warnings.join(" • "),
            duration: 6000,
          });
        }

        onSuccess?.(result);

        toast.success(t("client.promotions.addToCart.addedTitle"), {
          description: t("client.promotions.addToCart.addedDesc"),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("client.promotions.addToCart.error");
        toast.error(message);
      }
    })();
  };

  if (shouldShowCartLink) {
    return (
      <Button
        asChild
        type="button"
        className={className}
        size={size}
        variant={variant}
      >
        <Link
          href="/cart"
          className="bg-brand-black-strong text-white hover:bg-brand-black-strong/90"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{cartLabel || label || t("client.promotions.addToCart.goToCart", "Go to Cart")}</span>
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || isMutating || items.length === 0}
      className={className}
      size={size}
      variant={variant}
    >
      {isMutating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      <span>{label || t("client.promotions.addToCart.cta")}</span>
    </Button>
  );
}

export default PromotionAddToCartButton;
