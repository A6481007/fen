"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ChevronDown,
  Info,
  Minus,
  Package,
  Plus,
  ShoppingCart,
} from "lucide-react";

import useSolutionCart, {
  type SolutionProduct,
} from "@/lib/hooks/useSolutionCart";
import PriceFormatter from "@/components/PriceFormatter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { buildProductPath } from "@/lib/paths";
import { urlFor } from "@/sanity/lib/image";

export interface SolutionProductBundleProps {
  solutionTitle: string;
  solutionProducts: Array<{
    product: {
      _id: string;
      name: string;
      slug: { current: string };
      images?: any[];
      price: number;
      dealerPrice?: number;
      stock: number;
      discount?: number;
      description?: string;
      brand?: { title: string };
    };
    quantity: number;
    isRequired: boolean;
    notes?: string;
  }>;
  className?: string;
}

type BundleProduct =
  SolutionProductBundleProps["solutionProducts"][number]["product"];

type NormalizedItem = {
  id: string;
  product: BundleProduct;
  quantity: number;
  isRequired: boolean;
  notes?: string;
};

const getStockLimit = (product: BundleProduct) => {
  const stock = Number.isFinite(product.stock)
    ? Math.max(0, Math.floor(product.stock))
    : 0;
  return stock;
};

const clampQuantity = (product: BundleProduct, nextValue: number) => {
  const stock = getStockLimit(product);
  if (stock <= 0) return 0;
  const safeValue = Number.isFinite(nextValue) ? Math.floor(nextValue) : 1;
  return Math.min(Math.max(1, safeValue), stock);
};

const normalizeItems = (
  solutionProducts: SolutionProductBundleProps["solutionProducts"]
): NormalizedItem[] => {
  if (!Array.isArray(solutionProducts)) return [];

  return solutionProducts
    .map((item, index) => {
      const product = item?.product;
      if (!product?._id) return null;
      const initialQuantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;

      return {
        id: product._id ?? `solution-product-${index}`,
        product,
        quantity: clampQuantity(product, initialQuantity),
        isRequired: item?.isRequired !== false,
        notes: item?.notes ?? undefined,
      };
    })
    .filter(Boolean) as NormalizedItem[];
};

const buildQuantityState = (items: NormalizedItem[]) =>
  items.reduce((acc, item) => {
    acc[item.id] = item.quantity || 0;
    return acc;
  }, {} as Record<string, number>);

const buildOptionalState = (items: NormalizedItem[]) =>
  items.reduce((acc, item) => {
    acc[item.id] = false;
    return acc;
  }, {} as Record<string, boolean>);

const SolutionProductBundle = ({
  solutionTitle,
  solutionProducts,
  className,
}: SolutionProductBundleProps) => {
  const items = useMemo(
    () => normalizeItems(solutionProducts),
    [solutionProducts]
  );
  const requiredItems = useMemo(
    () => items.filter((item) => item.isRequired),
    [items]
  );
  const optionalItems = useMemo(
    () => items.filter((item) => !item.isRequired),
    [items]
  );
  const bundleTitle = solutionTitle || "Solution bundle";

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    buildQuantityState(items)
  );
  const [optionalSelection, setOptionalSelection] = useState<Record<string, boolean>>(
    () => buildOptionalState(optionalItems)
  );

  useEffect(() => {
    setQuantities(buildQuantityState(items));
  }, [items]);

  useEffect(() => {
    setOptionalSelection(buildOptionalState(optionalItems));
  }, [optionalItems]);

  const { addSolutionToCart, isLoading } = useSolutionCart();
  const { isSignedIn } = useUser();
  const [useDealerPrice, setUseDealerPrice] = useState(false);

  useEffect(() => {
    let abort = false;
    const resolvePricing = async () => {
      if (!isSignedIn) {
        setUseDealerPrice(false);
        return;
      }
      try {
        const response = await fetch("/api/user/status", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          setUseDealerPrice(false);
          return;
        }
        const data = await response.json();
        if (abort) return;
        const profile = data?.userProfile;
        const isDealer =
          profile?.isBusiness === true ||
          profile?.businessStatus === "active" ||
          profile?.membershipType === "business";
        setUseDealerPrice(Boolean(isDealer));
      } catch (error) {
        console.error("Unable to resolve pricing mode:", error);
        if (!abort) {
          setUseDealerPrice(false);
        }
      }
    };
    resolvePricing();
    return () => {
      abort = true;
    };
  }, [isSignedIn]);

  const getEffectivePrice = useCallback(
    (product: BundleProduct) => {
      const dealerPrice = product.dealerPrice;
      if (useDealerPrice && typeof dealerPrice === "number") {
        return dealerPrice;
      }
      return product.price ?? 0;
    },
    [useDealerPrice]
  );

  const getOriginalPrice = useCallback(
    (product: BundleProduct) => {
      const basePrice = getEffectivePrice(product);
      const discount = typeof product.discount === "number" ? product.discount : 0;
      if (discount > 0) {
        return basePrice + (basePrice * discount) / 100;
      }
      return basePrice;
    },
    [getEffectivePrice]
  );

  const selectedOptionalItems = useMemo(
    () => optionalItems.filter((item) => optionalSelection[item.id]),
    [optionalItems, optionalSelection]
  );

  const selectedItems = useMemo(
    () => [...requiredItems, ...selectedOptionalItems],
    [requiredItems, selectedOptionalItems]
  );

  const totals = useMemo(
    () =>
      selectedItems.reduce(
        (acc, item) => {
          const quantity = quantities[item.id] ?? item.quantity;
          if (!quantity || quantity <= 0) return acc;
          const unitPrice = getEffectivePrice(item.product);
          const originalPrice = getOriginalPrice(item.product);
          acc.itemCount += quantity;
          acc.discountedTotal += unitPrice * quantity;
          acc.originalTotal += originalPrice * quantity;
          return acc;
        },
        { itemCount: 0, discountedTotal: 0, originalTotal: 0 }
      ),
    [selectedItems, quantities, getEffectivePrice, getOriginalPrice]
  );

  const bundleSavings = Math.max(
    0,
    totals.originalTotal - totals.discountedTotal
  );

  const hasUnavailableRequired = requiredItems.some(
    (item) => getStockLimit(item.product) <= 0
  );

  const updateQuantity = useCallback((item: NormalizedItem, delta: number) => {
    setQuantities((prev) => {
      const currentValue = prev[item.id] ?? item.quantity;
      const nextValue = clampQuantity(item.product, currentValue + delta);
      return {
        ...prev,
        [item.id]: nextValue,
      };
    });
  }, []);

  const buildCartItems = useCallback((): SolutionProduct[] => {
    const selectedItems = [...requiredItems, ...selectedOptionalItems];

    return selectedItems.map((item) => {
      const quantity = clampQuantity(
        item.product,
        quantities[item.id] ?? item.quantity
      );

      return {
        product: item.product,
        quantity,
        isRequired: true,
        notes: item.notes ?? undefined,
      };
    });
  }, [requiredItems, selectedOptionalItems, quantities]);

  const handleAddBundle = useCallback(async () => {
    const cartItems = buildCartItems();
    await addSolutionToCart(cartItems, bundleTitle);
  }, [addSolutionToCart, buildCartItems, bundleTitle]);

  if (!items.length) {
    return (
      <Card className={cn("border border-border bg-surface-0", className)}>
        <CardHeader>
          <CardTitle className="text-lg text-ink-strong">
            {bundleTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-ink-muted">
          Product bundle details are being finalized. Check back soon for the full kit.
        </CardContent>
      </Card>
    );
  }

  const renderRow = (item: NormalizedItem) => {
    const product = item.product;
    const quantity = quantities[item.id] ?? item.quantity;
    const stock = getStockLimit(product);
    const isOutOfStock = stock <= 0;
    const isOptional = !item.isRequired;
    const isSelected = item.isRequired || optionalSelection[item.id];
    const controlsDisabled = isOutOfStock || (isOptional && !isSelected);
    const unitPrice = getEffectivePrice(product);
    const originalPrice = getOriginalPrice(product);
    const hasDiscount =
      typeof product.discount === "number" && product.discount > 0;
    const subtotal = unitPrice * (quantity || 0);
    const productHref = buildProductPath(product);
    const imageUrl = product.images?.[0]
      ? urlFor(product.images[0]).width(160).height(160).url()
      : null;
    const notesText =
      item.notes?.trim() || "No implementation notes provided yet.";

    return (
      <div
        key={item.id}
        className={cn(
          "rounded-xl border border-border p-4 shadow-sm",
          isOptional ? "bg-surface-1" : "bg-surface-0"
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-surface-1">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={product.name || "Bundle product"}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package
                  className="h-6 w-6 text-ink-soft"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={productHref}
                  className="text-base font-semibold text-ink-strong hover:text-ink"
                >
                  {product.name || "Solution product"}
                </Link>
                {item.isRequired ? (
                  <Badge variant="secondary">Required</Badge>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-ink-soft">
                    <Checkbox
                      checked={optionalSelection[item.id] || false}
                      onCheckedChange={(checked) =>
                        setOptionalSelection((prev) => ({
                          ...prev,
                          [item.id]: checked === true,
                        }))
                      }
                      disabled={isOutOfStock}
                    />
                    Optional
                  </div>
                )}
                {isOutOfStock ? (
                  <Badge variant="destructive">Out of stock</Badge>
                ) : null}
              </div>
              {product.brand?.title ? (
                <p className="text-xs text-ink-soft">
                  Brand: {product.brand.title}
                </p>
              ) : null}
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <span>Implementation notes</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-ink-soft transition hover:text-ink-strong"
                      aria-label="Implementation notes"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {notesText}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="space-y-1 text-sm">
              <span className="text-xs text-ink-soft">Unit price</span>
              <div className="flex flex-wrap items-center gap-2">
                <PriceFormatter
                  amount={unitPrice}
                  className="text-ink-strong"
                />
                {hasDiscount ? (
                  <>
                    <PriceFormatter
                      amount={originalPrice}
                      className="text-xs text-ink-soft line-through"
                    />
                    <Badge variant="secondary">
                      -{Math.round(product.discount || 0)}%
                    </Badge>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface-0 px-2 py-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => updateQuantity(item, -1)}
                  disabled={controlsDisabled || quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span
                  className={cn(
                    "w-6 text-center text-sm font-semibold",
                    controlsDisabled ? "text-ink-soft" : "text-ink-strong"
                  )}
                >
                  {quantity || 0}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => updateQuantity(item, 1)}
                  disabled={controlsDisabled || quantity >= stock}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-soft">Subtotal</p>
                <PriceFormatter
                  amount={subtotal}
                  className={cn(
                    "text-ink-strong",
                    isOptional && !isSelected ? "text-ink-soft" : ""
                  )}
                />
                {isOptional && !isSelected && !isOutOfStock ? (
                  <p className="text-[10px] text-ink-soft">Not selected</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isAddDisabled =
    isLoading || hasUnavailableRequired || requiredItems.length === 0;

  return (
    <TooltipProvider>
      <Card className={cn("border border-border bg-surface-0", className)}>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">
                Solution bundle
              </p>
              <CardTitle className="text-2xl font-semibold text-ink-strong">
                {bundleTitle}
              </CardTitle>
            </div>
            <Badge variant="secondary">
              {requiredItems.length} required, {optionalItems.length} optional
            </Badge>
          </div>
          <p className="text-sm text-ink-muted">
            Add the recommended products and quantities for this solution.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-ink-strong">
                Required products
              </h3>
              <span className="text-xs text-ink-soft">
                {requiredItems.length} items
              </span>
            </div>
            {requiredItems.map(renderRow)}
          </div>

          <details className="group rounded-2xl border border-border bg-surface-0 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-strong">
              <span>Optional add-ons</span>
              <span className="flex items-center gap-2 text-xs text-ink-soft">
                {selectedOptionalItems.length} selected
                <ChevronDown
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <div className="mt-4 space-y-4">
              {optionalItems.length ? (
                optionalItems.map(renderRow)
              ) : (
                <p className="text-sm text-ink-muted">
                  No optional add-ons are listed for this solution.
                </p>
              )}
            </div>
          </details>

          <Separator />

          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-ink-soft">
                  Bundle summary
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <PriceFormatter
                    amount={totals.discountedTotal}
                    className="text-2xl text-ink-strong"
                  />
                  {bundleSavings > 0 ? (
                    <Badge variant="secondary">
                      Save{" "}
                      <PriceFormatter
                        amount={bundleSavings}
                        className="text-xs"
                      />
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs text-ink-soft">
                  Total items: {totals.itemCount}
                </div>
                {bundleSavings > 0 ? (
                  <div className="text-xs text-ink-soft">
                    Estimated savings vs buying separately:{" "}
                    <PriceFormatter amount={bundleSavings} className="text-ink-strong" />
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="accent"
                onClick={handleAddBundle}
                disabled={isAddDisabled}
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Add Complete Solution to Cart
              </Button>
            </div>
            {hasUnavailableRequired ? (
              <p className="mt-2 text-xs text-status-error">
                Some required items are currently out of stock.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SolutionProductBundle;
