// NEW: components/cart/CartItemRow.tsx

"use client";

import "@/app/i18n";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Gift, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PriceFormatter from "@/components/PriceFormatter";
import type { CartItem } from "@/lib/cart/types";
import { cn } from "@/lib/utils";
import { AppliedPromotionBadge } from "@/components/cart/AppliedPromotionBadge";
import { useTranslation } from "react-i18next";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  showPromoBadge?: boolean;
  compact?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  showMessages?: boolean;
}

const InlineQuantityButtons = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max,
  size = "default",
}: {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: "default" | "sm";
}) => {
  const disableDecrease = quantity <= (min ?? 0);
  const disableIncrease = typeof max === "number" ? quantity >= max : false;
  const buttonSize = size === "sm" ? "icon" : "default";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size={buttonSize}
        className={size === "sm" ? "h-8 w-8" : "h-9 w-9"}
        onClick={onDecrease}
        disabled={disableDecrease}
      >
        -
      </Button>
      <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
      <Button
        variant="outline"
        size={buttonSize}
        className={size === "sm" ? "h-8 w-8" : "h-9 w-9"}
        onClick={onIncrease}
        disabled={disableIncrease}
      >
        +
      </Button>
    </div>
  );
};

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  showPromoBadge = true,
  compact = false,
  minQuantity = 1,
  maxQuantity,
  showMessages = true,
}: CartItemRowProps) {
  const { t } = useTranslation();
  const resolveText = (value: unknown, fallback: string): string => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const asAny = value as Record<string, unknown>;
      if (typeof asAny.title === "string") return asAny.title;
      if (typeof asAny.name === "string") return asAny.name;
      if (typeof asAny.current === "string") return asAny.current;
    }
    return fallback;
  };

  const resolveSlug = (value: unknown, fallback: string): string => {
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object") {
      const asAny = value as Record<string, unknown>;
      if (typeof asAny.current === "string") return asAny.current;
      if (typeof asAny.slug === "string") return asAny.slug;
    }
    return fallback;
  };

  const displayName = resolveText(item.productName, item.product?.name ?? item.productId);
  const variantLabel = item.variantLabel
    ? resolveText(item.variantLabel, "")
    : undefined;
  const priceOptionLabel = item.priceOptionLabel
    ? resolveText(item.priceOptionLabel, "")
    : undefined;
  const productSlug = resolveSlug(item.productSlug, item.productId);
  const isFree = item.lineTotal === 0 && item.unitPrice > 0;
  const hasDiscount = item.appliedPromotion && !isFree;
  const originalLineTotal = item.unitPrice * item.quantity;
  const savings = originalLineTotal - item.lineTotal;
  const imageUrl =
    item.imageUrl ??
    (item.product as { imageUrl?: string | null } | undefined)?.imageUrl ??
    (item.product as { images?: Array<{ asset?: { url?: string } }> } | undefined)
      ?.images?.[0]?.asset?.url ??
    null;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-3 py-2",
          compact ? "text-sm" : ""
        )}
      >
        {/* Product Image */}
        <Link
          href={`/products/${productSlug}`}
          className={cn(
            "flex-shrink-0 rounded-md overflow-hidden bg-muted",
            compact ? "w-10 h-10" : "w-16 h-16"
          )}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.productName}
              width={compact ? 40 : 64}
              height={compact ? 40 : 64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {t("client.cart.item.noImage")}
            </div>
          )}
        </Link>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/products/${productSlug}`}
            className="font-medium hover:underline line-clamp-1"
          >
            {displayName}
          </Link>

          {variantLabel && (
            <p className="text-xs text-muted-foreground">{variantLabel}</p>
          )}
          {priceOptionLabel && (
            <p className="text-xs text-muted-foreground">Price: {priceOptionLabel}</p>
          )}

          <div className="flex items-center gap-2 mt-1">
            {isFree ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Gift className="w-3 h-3 mr-1" />
                {t("client.cart.item.free")}
              </Badge>
            ) : showPromoBadge && item.appliedPromotion ? (
              <AppliedPromotionBadge
                promotion={item.appliedPromotion}
                className={cn(compact ? "text-[10px]" : "text-xs")}
              />
            ) : null}
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          {onUpdateQuantity ? (
            <InlineQuantityButtons
              quantity={item.quantity}
              onIncrease={() => onUpdateQuantity(item.quantity + 1)}
              onDecrease={() =>
                onUpdateQuantity(Math.max(minQuantity, item.quantity - 1))
              }
              min={minQuantity}
              max={maxQuantity ?? item.availableStock ?? undefined}
              size={compact ? "sm" : "default"}
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("client.cart.item.quantityLabel", { quantity: item.quantity })}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="text-right min-w-[80px]">
          {isFree ? (
            <>
              <div className="text-xs text-muted-foreground line-through">
                <PriceFormatter amount={originalLineTotal} />
              </div>
              <div className="font-semibold text-green-600">
                {t("client.cart.item.free")}
              </div>
            </>
          ) : hasDiscount ? (
            <>
              <div className="text-xs text-muted-foreground line-through">
                <PriceFormatter amount={originalLineTotal} />
              </div>
              <div className="font-semibold">
                <PriceFormatter amount={item.lineTotal} />
              </div>
              {savings > 0 && (
                <div className="text-xs text-green-600">
                  {t("client.cart.item.youSave")}{" "}
                  <PriceFormatter amount={savings} />
                </div>
              )}
            </>
          ) : (
            <div className="font-semibold">
              <PriceFormatter amount={item.lineTotal} />
            </div>
          )}
        </div>

        {/* Remove Button */}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className={cn(compact ? "w-4 h-4" : "w-5 h-5")} />
          </Button>
        )}
      </div>

      {showMessages && item.messages?.length ? (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {item.messages.map((message, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {resolveText(
                  message,
                  t("client.cart.item.messageFallback")
                )}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
