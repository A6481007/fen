"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";

import PriceFormatter from "@/components/PriceFormatter";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart/types";
import { AppliedPromotionBadge } from "@/components/cart/AppliedPromotionBadge";

type CartLineItemProps = {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  disabled?: boolean;
};

const resolveImageUrl = (item: CartItem): string | null => {
  const candidate = item as unknown as Record<string, unknown>;
  const product = candidate.product as
    | {
        thumbnailImage?: { asset?: { url?: string } };
        mainImage?: { asset?: { url?: string } };
        images?: Array<{ asset?: { url?: string }; url?: string } | null>;
      }
    | null
    | undefined;
  const getString = (value: unknown) =>
    typeof value === "string" ? value : null;

  return (
    getString(candidate.imageUrl) ??
    getString(candidate.image) ??
    getString(candidate.thumbnail) ??
    getString(candidate.thumbnailUrl) ??
    product?.thumbnailImage?.asset?.url ??
    product?.mainImage?.asset?.url ??
    product?.images?.[0]?.asset?.url ??
    product?.images?.[0]?.url ??
    null
  );
};

const resolveVariantLabel = (item: CartItem): string | null => {
  const candidate = item as unknown as Record<string, unknown>;
  const getString = (value: unknown) =>
    typeof value === "string" ? value : null;

  return (
    getString(candidate.variantName) ??
    getString(candidate.variantLabel) ??
    item.variantId ??
    null
  );
};

const resolvePriceOptionLabel = (item: CartItem): string | null => {
  const candidate = item as unknown as Record<string, unknown>;
  const getString = (value: unknown) =>
    typeof value === "string" ? value : null;

  return getString(candidate.priceOptionLabel) ?? null;
};

export default function CartLineItem({
  item,
  onRemove,
  onUpdateQuantity,
  disabled = false,
}: CartLineItemProps) {
  const imageUrl = resolveImageUrl(item);
  const variantLabel = resolveVariantLabel(item);
  const priceOptionLabel = resolvePriceOptionLabel(item);

  const originalLineTotal = item.unitPrice * item.quantity;
  const lineSavings = Math.max(0, originalLineTotal - item.lineTotal);
  const hasDiscount =
    (item.appliedPromotion?.discountAmount ?? 0) > 0 || lineSavings > 0;

  const handleQuantityChange = (delta: number) => {
    const nextQuantity = Math.max(1, item.quantity + delta);
    onUpdateQuantity(item.id, nextQuantity);
  };

  const handleRemove = () => {
    onRemove(item.id);
  };

  return (
    <div className="flex gap-3 rounded-lg border bg-card p-3 shadow-[0_12px_30px_-14px_rgba(0,0,0,0.25)]">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.productName}
            fill
            sizes="64px"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {item.productName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <Link
              href={`/products/${item.productSlug}`}
              className="block font-semibold leading-tight hover:text-primary"
            >
              {item.productName}
            </Link>

            {variantLabel && (
              <p className="text-xs text-muted-foreground">Variant: {variantLabel}</p>
            )}
            {priceOptionLabel && (
              <p className="text-xs text-muted-foreground">Price: {priceOptionLabel}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Unit</span>
              <PriceFormatter
                amount={item.unitPrice}
                className="text-xs font-medium text-muted-foreground"
              />
            </div>

            {item.appliedPromotion ? (
              <AppliedPromotionBadge
                promotion={item.appliedPromotion}
                className="w-fit text-[11px]"
              />
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Remove item</span>
          </Button>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="inline-flex items-center rounded-md border bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuantityChange(-1)}
              disabled={disabled || item.quantity <= 1}
              className="rounded-none"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">{item.quantity}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuantityChange(1)}
              disabled={disabled}
              className="rounded-none"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-right">
            {hasDiscount && (
              <PriceFormatter
                amount={originalLineTotal}
                className="text-xs text-muted-foreground line-through"
              />
            )}
            <PriceFormatter amount={item.lineTotal} className="text-lg font-semibold" />
            {hasDiscount && (
              <div className="text-[11px] font-semibold text-emerald-700">
                Discount{" "}
                <PriceFormatter
                  amount={lineSavings}
                  className="text-[11px] text-emerald-700"
                />
              </div>
            )}
          </div>
        </div>

        {item.messages?.length ? (
          <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            {item.messages.map((message, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
