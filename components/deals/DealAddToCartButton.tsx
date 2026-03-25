"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { trackEvent } from "@/lib/analytics";
import type { Cart } from "@/lib/cart/types";
import "@/app/i18n";

export interface DealAddToCartButtonProps {
  dealId: string;
  productId: string;
  quantity?: number;
  variantId?: string;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  disabled?: boolean;
  remainingQty?: number;
  className?: string;
}

export function DealAddToCartButton({
  dealId,
  productId,
  quantity = 1,
  variantId,
  status,
  startDate,
  endDate,
  disabled,
  remainingQty,
  className,
}: DealAddToCartButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { cart, addItems, isMutating } = useCart();

  const collectWarnings = (nextCart: Cart, productId: string, variantId?: string) => {
    const buildKey = (pid?: string, vid?: string) => `${pid || ""}:${vid || ""}`;
    const targetKey = buildKey(productId, variantId);
    const warnings = new Set<string>();

    (nextCart.warnings || []).forEach((warning) => warnings.add(warning));
    nextCart.items.forEach((line) => {
      const key = buildKey(line.productId, line.variantId);
      if (key !== targetKey) return;
      (line.messages || []).forEach((message) => warnings.add(message));
    });

    return Array.from(warnings);
  };

  const remainingCount =
    typeof remainingQty === "number" && Number.isFinite(remainingQty)
      ? Math.max(0, Math.floor(remainingQty))
      : null;
  const isSoldOut = remainingCount !== null && remainingCount <= 0;
  const isLowStock = remainingCount !== null && remainingCount > 0 && remainingCount < 10;
  const now = Date.now();
  const startsAt = startDate ? new Date(startDate).getTime() : NaN;
  const endsAt = endDate ? new Date(endDate).getTime() : NaN;
  const withinWindow =
    (Number.isNaN(startsAt) || startsAt <= now) && (Number.isNaN(endsAt) || endsAt >= now);
  const isActive = (status ?? "active") === "active" && withinWindow;

  const label = isSoldOut
    ? t("client.deals.addToCart.soldOut")
    : isLowStock
      ? t("client.deals.addToCart.onlyLeft", { count: remainingCount })
      : t("client.deals.addToCart.cta");
  const isDisabled = disabled || isSoldOut || isMutating || !isActive || !productId;

  const handleClick = async () => {
    if (isSoldOut || !isActive || !productId) return;

    const previousTotal = cart?.total ?? 0;
    trackEvent("deal_add_click", {
      dealId,
      productId,
      quantity,
      remainingQty,
    });

    try {
      const result = await addItems({
        dealId,
        items: [{ productId, quantity, variantId }],
      });

      trackEvent("deal_add_success", {
        dealId,
        productId,
        quantity,
        delta: result.delta,
        cartTotal: result.cart.total,
        previousTotal,
      });

      const warnings = collectWarnings(result.cart, productId, variantId);
      if (warnings.length) {
        toast(t("client.deals.addToCart.addedWithWarnings"), {
          description: warnings.join(" • "),
          duration: 6000,
        });
      }

      toast.success(t("client.deals.addToCart.addedTitle"), {
        description: t("client.deals.addToCart.addedDesc"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("client.deals.addToCart.error");
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {remainingCount !== null && remainingCount < 10 && (
        <Badge
          variant={isSoldOut ? "destructive" : "secondary"}
          className="w-fit whitespace-nowrap"
        >
          {isSoldOut
            ? t("client.deals.addToCart.soldOut")
            : t("client.deals.addToCart.leftBadge", { count: remainingCount })}
        </Badge>
      )}
      <Button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={className}
      >
        {isMutating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
        <span>{label}</span>
      </Button>
    </div>
  );
}

export default DealAddToCartButton;
