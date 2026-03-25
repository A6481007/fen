"use client";

import { useMemo, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import type { CartLineInput } from "@/lib/cart/client";
import type { CartItem } from "@/lib/cart/types";

type PromotionBundleQuantityControlProps = {
  promotionId: string;
  items: CartLineInput[];
  disabled?: boolean;
  className?: string;
};

type GroupedBundleItem = {
  key: string;
  quantity: number;
  item: CartLineInput;
};

const buildKey = (item: { productId?: string; variantId?: string }) =>
  `${item.productId || ""}:${item.variantId || ""}`;

const matchesBundleItem = (cartItem: CartItem, bundleItem: GroupedBundleItem) => {
  if (buildKey(cartItem) === bundleItem.key) return true;
  return cartItem.productId === bundleItem.item.productId;
};

const groupBundleItems = (items: CartLineInput[]): GroupedBundleItem[] => {
  const grouped = new Map<string, GroupedBundleItem>();

  items.forEach((item) => {
    const key = buildKey(item);
    const quantity = Math.max(0, item.quantity || 0);
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += quantity;
      return;
    }

    grouped.set(key, { key, quantity, item });
  });

  return Array.from(grouped.values()).filter((entry) => entry.quantity > 0);
};

const countBundlesInCart = (
  cartItems: CartItem[],
  promotionId: string,
  bundleItems: GroupedBundleItem[],
) => {
  if (!bundleItems.length) return 0;

  const promotionItems = cartItems.filter(
    (item) =>
      item.appliedPromotion?.type === "promotion" &&
      item.appliedPromotion.id === promotionId,
  );

  if (!promotionItems.length) return 0;

  const counts = bundleItems.map((bundleItem) => {
    const matchingQuantity = promotionItems
      .filter((item) => matchesBundleItem(item, bundleItem))
      .reduce((sum, item) => sum + item.quantity, 0);

    return {
      expectedQuantity: bundleItem.quantity,
      matchingQuantity,
      count:
        bundleItem.quantity > 0 ? Math.floor(matchingQuantity / bundleItem.quantity) : 0,
    };
  });

  const matchedCounts = counts
    .filter((entry) => entry.matchingQuantity > 0)
    .map((entry) => entry.count)
    .filter((count) => count > 0);
  const derivedCount = matchedCounts.length ? Math.max(0, Math.min(...matchedCounts)) : 0;
  if (derivedCount > 0) return derivedCount;

  const matchedExpectedQuantity = counts
    .filter((entry) => entry.matchingQuantity > 0)
    .reduce((sum, entry) => sum + entry.expectedQuantity, 0);
  const matchedPromotionQuantity = counts
    .filter((entry) => entry.matchingQuantity > 0)
    .reduce((sum, entry) => sum + entry.matchingQuantity, 0);
  if (matchedExpectedQuantity > 0 && matchedPromotionQuantity > 0) {
    return Math.max(1, Math.floor(matchedPromotionQuantity / matchedExpectedQuantity));
  }

  const totalPromotionQuantity = promotionItems.reduce((sum, item) => sum + item.quantity, 0);
  return totalPromotionQuantity > 0 ? 1 : 0;
};

export default function PromotionBundleQuantityControl({
  promotionId,
  items,
  disabled,
  className,
}: PromotionBundleQuantityControlProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { cart, addItems, updateItem, removeItem, isMutating } = useCart();
  const [isPending, setIsPending] = useState(false);

  const groupedItems = useMemo(() => groupBundleItems(items), [items]);
  const bundleCount = useMemo(
    () => countBundlesInCart(cart?.items ?? [], promotionId, groupedItems),
    [cart?.items, groupedItems, promotionId],
  );

  const handleAddBundle = async () => {
    if (!groupedItems.length) {
      toast.error(
        t("client.promotions.bundle.actions.noItems", "No bundle items are configured."),
      );
      return;
    }

    setIsPending(true);
    try {
      await addItems({ promotionId, items });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(
              "client.promotions.bundle.actions.updateFailed",
              "Unable to update bundle quantity.",
            );
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleDecreaseBundle = async () => {
    const promotionItems = (cart?.items ?? []).filter(
      (item) =>
        item.appliedPromotion?.type === "promotion" &&
        item.appliedPromotion.id === promotionId,
    );

    if (!promotionItems.length) return;

    setIsPending(true);
    try {
      for (const bundleItem of groupedItems) {
        let remainingToRemove = bundleItem.quantity;
        const matchingLines = promotionItems
          .filter((item) => matchesBundleItem(item, bundleItem))
          .sort((a, b) => b.quantity - a.quantity);

        for (const line of matchingLines) {
          if (remainingToRemove <= 0) break;

          if (line.quantity > remainingToRemove) {
            await updateItem(line.id, line.quantity - remainingToRemove);
            remainingToRemove = 0;
            break;
          }

          remainingToRemove -= line.quantity;
          await removeItem(line.id);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(
              "client.promotions.bundle.actions.updateFailed",
              "Unable to update bundle quantity.",
            );
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  if (bundleCount > 0) {
    return (
      <div className={className}>
        <div className="inline-flex w-full items-center justify-center gap-4 rounded-md border border-slate-300 bg-white px-4 py-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={disabled || isMutating || isPending}
            onClick={() => void handleDecreaseBundle()}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
          </Button>
          <span className="min-w-8 text-center text-sm font-semibold text-ink-strong">
            {bundleCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={disabled || isMutating || isPending}
            onClick={() => void handleAddBundle()}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      onClick={() => void handleAddBundle()}
      disabled={disabled || isMutating || isPending || groupedItems.length === 0}
      className={className}
      variant="outline"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      <span>{t("client.promotions.detail.addBundle", "Add to bundle")}</span>
    </Button>
  );
}
