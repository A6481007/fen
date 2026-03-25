"use client";
import "@/app/i18n";
import { Product } from "@/sanity.types";
import { useEffect, useState, memo, useCallback } from "react";
import { toast } from "sonner";
import PriceFormatter from "./PriceFormatter";
import { Button } from "./ui/button";
import QuantityButtons from "./QuantityButtons";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import { trackAddToCart } from "@/lib/analytics";
import { useCart } from "@/hooks/useCart";
import DealAddToCartButton from "@/components/deals/DealAddToCartButton";
import { useDealerPricing } from "@/lib/hooks/useDealerPricing";
import {
  isDealActive,
  resolveActiveDeal,
  resolveDealId,
  resolveDealRemainingQty,
  resolveDealPrice,
} from "@/lib/deals";
import { useTranslation } from "react-i18next";

interface Props {
  product: Product;
  className?: string;
  priceOption?: {
    id: string;
    label: string;
    price: number;
    dealerPrice?: number | null;
  } | null;
}

const AddToCartButton = memo(({ product, className, priceOption }: Props) => {
  const { t } = useTranslation();
  const { cart, addItems, isMutating } = useCart();
  const [isClient, setIsClient] = useState(false);
  const useDealerPrice = useDealerPricing();
  const activeDeal = resolveActiveDeal(product as any);
  const dealId = resolveDealId(activeDeal);
  const isDeal = Boolean(activeDeal && dealId);
  const variantId = (() => {
    const direct = (product as any)?.variantId;
    if (typeof direct === "string" && direct.trim()) return direct;
    const variant = (product as any)?.variant;
    if (typeof variant === "string" && variant.trim()) return variant;
    if (variant?._id) return variant._id;
    if (variant?._ref) return variant._ref;
    if (variant?.slug && typeof variant.slug.current === "string") {
      return variant.slug.current;
    }
    return undefined;
  })();
  const requiresVariant = Boolean((product as any)?.variant || (product as any)?.variantId);
  const canAutoAdd = !requiresVariant || Boolean(variantId);
  const dealRemainingQty = resolveDealRemainingQty(activeDeal);
  const isDealLive = isDeal ? isDealActive(activeDeal) : false;
  const basePrice =
    typeof priceOption?.price === "number" ? priceOption.price : product?.price ?? 0;
  const dealPrice = resolveDealPrice(activeDeal, basePrice);
  const isDealSoldOut =
    typeof dealRemainingQty === "number" && dealRemainingQty <= 0;

  // All hooks must be called before any conditional logic
  const matchingItems =
    cart?.items?.filter(
      (item) =>
        item.productId === product?._id &&
        (!priceOption?.id || item.priceOptionId === priceOption.id)
    ) ?? [];
  const itemCount =
    matchingItems.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const matchedLineId = matchingItems[0]?.id;
  const productOutOfStock = product?.stock === 0;
  const isOutOfStock = isDeal ? isDealSoldOut || productOutOfStock : productOutOfStock;

  // Use useEffect to set isClient to true after component mounts
  // This ensures that the component only renders on the client-side
  // Preventing hydration errors due to server/client mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const dealerPrice =
    typeof priceOption?.dealerPrice === "number"
      ? priceOption.dealerPrice
      : (product as any).dealerPrice ?? null;
  const effectivePrice = isDeal
    ? dealPrice ?? basePrice
    : useDealerPrice && dealerPrice !== null
      ? dealerPrice
      : basePrice;

  const handleAddToCart = useCallback(async () => {
    if ((product?.stock as number) <= itemCount) {
      toast.error(t("client.productPage.addToCart.toast.stockLimit", { defaultValue: "Stock limit reached" }), {
        description: t("client.productPage.addToCart.toast.stockLimitDesc", {
          defaultValue: "Cannot add more than available stock",
        }),
        duration: 4000,
      });
      return;
    }

    try {
      const { cart: updatedCart } = await addItems({
        items: [
          {
            productId: product._id,
            productName: product.name ?? product._id,
            productSlug: product.slug?.current ?? product._id,
            quantity: 1,
            unitPrice: effectivePrice,
            priceOptionId: priceOption?.id,
            priceOptionLabel: priceOption?.label,
          },
        ],
      });
      const newCount =
        updatedCart.items
          ?.filter((item) => item.productId === product._id)
          ?.reduce((sum, item) => sum + item.quantity, 0) ?? itemCount + 1;
      toast.success(t("client.productPage.addToCart.toast.added", {
        defaultValue: "{{name}} added to cart!",
        name: product?.name ?? t("client.productPage.fallback.product", { defaultValue: "Product" }),
      }), {
        description: t("client.productPage.addToCart.toast.currentQty", {
          defaultValue: "Current quantity: {{count}}",
          count: newCount,
        }),
        duration: 3000,
      });
      trackAddToCart({
        productId: product._id,
        name: product.name || t("client.productPage.fallback.unknown", { defaultValue: "Unknown" }),
        price: effectivePrice,
        quantity: newCount,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("client.productPage.addToCart.toast.failed", {
              defaultValue: "Unable to add to cart",
            });
      toast.error(message);
    }
  }, [product, itemCount, addItems, effectivePrice, priceOption?.id, priceOption?.label, t]);

  // Early return after all hooks have been called - this is crucial for Rules of Hooks
  if (!isClient) {
    return (
      <div className="w-full h-12 flex items-center">
        <Button
          disabled
          className={cn(
            "w-full bg-gray-200 text-gray-500 shadow-none border border-gray-300",
            className
          )}
        >
          <ShoppingBag />{" "}
          {t("client.productPage.addToCart.loading", { defaultValue: "Loading..." })}
        </Button>
      </div>
    );
  }

  if (isDeal && dealId) {
    return (
      <div className="w-full">
        <DealAddToCartButton
          dealId={dealId}
          productId={product._id}
          variantId={variantId}
          remainingQty={dealRemainingQty ?? undefined}
          status={activeDeal?.status ?? undefined}
          startDate={activeDeal?.startDate ?? undefined}
          endDate={activeDeal?.endDate ?? undefined}
          disabled={!isDealLive || isOutOfStock || !canAutoAdd}
          className={cn(
            "w-full bg-brand-black-strong/80 text-brand-background-subtle shadow-none border border-brand-black-strong/80 font-semibold tracking-wide hover:text-white hover:bg-brand-black-strong hover:border-brand-black-strong hoverEffect",
            className
          )}
        />
        {!canAutoAdd ? (
          <p className="mt-2 text-xs text-amber-700">
            {t("client.productPage.addToCart.selectOptions", {
              defaultValue: "Select product options before adding this deal.",
            })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full h-12 flex items-center">
      {itemCount ? (
        <div className="text-sm w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t("client.productPage.addToCart.quantity", { defaultValue: "Quantity" })}
            </span>
            <QuantityButtons product={product} lineId={matchedLineId} />
          </div>
          <div className="flex items-center justify-between border-t pt-1">
            <span className="text-xs font-semibold">
              {t("client.productPage.addToCart.subtotal", { defaultValue: "Subtotal" })}
            </span>
            <PriceFormatter
              amount={effectivePrice ? effectivePrice * itemCount : 0}
            />
          </div>
        </div>
      ) : (
        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isMutating}
          className={cn(
            "w-full bg-brand-black-strong/80 text-brand-background-subtle shadow-none border border-brand-black-strong/80 font-semibold tracking-wide hover:text-white hover:bg-brand-black-strong hover:border-brand-black-strong hoverEffect",
            className
          )}
        >
          <ShoppingBag />{" "}
          {isOutOfStock
            ? t("client.productPage.stock.out", { defaultValue: "Out of Stock" })
            : t("client.productPage.addToCart.button", { defaultValue: "Add to Cart" })}
        </Button>
      )}
    </div>
  );
});

AddToCartButton.displayName = "AddToCartButton";

export default AddToCartButton;
