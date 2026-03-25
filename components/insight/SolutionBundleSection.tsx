"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  Package,
  ShoppingCart,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import AddToCartButton from "@/components/AddToCartButton";
import PriceFormatter from "@/components/PriceFormatter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { urlFor } from "@/sanity/lib/image";
import type { Product } from "@/sanity.types";
import { buildProductPath } from "@/lib/paths";

type SolutionProductItem = {
  product?: Product | null;
  quantity?: number | null;
  isRequired?: boolean | null;
  notes?: string | null;
};

type Props = {
  insightTitle?: string | null;
  solutionProducts?: SolutionProductItem[] | null;
};

type NormalizedItem = {
  id: string;
  product: Product;
  quantity: number;
  isRequired: boolean;
  notes?: string | null;
};

const normalizeItems = (
  solutionProducts?: SolutionProductItem[] | null
): NormalizedItem[] => {
  if (!Array.isArray(solutionProducts)) return [];

  return solutionProducts
    .map((item, index) => {
      const product = item?.product;
      if (!product?._id) return null;

      const quantity =
        typeof item?.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;

      return {
        id: product._id ?? `solution-product-${index}`,
        product,
        quantity,
        isRequired: item?.isRequired !== false,
        notes: item?.notes ?? null,
      };
    })
    .filter(Boolean) as NormalizedItem[];
};

const buildQuantityState = (items: NormalizedItem[]) =>
  items.reduce((acc, item) => {
    acc[item.id] = item.quantity || 1;
    return acc;
  }, {} as Record<string, number>);

const buildOptionalState = (items: NormalizedItem[]) =>
  items.reduce((acc, item) => {
    acc[item.id] = false;
    return acc;
  }, {} as Record<string, boolean>);

const SolutionBundleSection = ({ insightTitle, solutionProducts }: Props) => {
  const items = useMemo(() => normalizeItems(solutionProducts), [solutionProducts]);
  const requiredItems = useMemo(
    () => items.filter((item) => item.isRequired),
    [items]
  );
  const optionalItems = useMemo(
    () => items.filter((item) => !item.isRequired),
    [items]
  );

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    buildQuantityState(items)
  );
  const [optionalSelection, setOptionalSelection] = useState<
    Record<string, boolean>
  >(() => buildOptionalState(optionalItems));

  useEffect(() => {
    setQuantities(buildQuantityState(items));
  }, [items]);

  useEffect(() => {
    setOptionalSelection(buildOptionalState(optionalItems));
  }, [optionalItems]);

  const { addItems, isMutating } = useCart();
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
        const response = await fetch("/api/user/status");
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
    (product: Product) => {
      const dealerPrice = (product as { dealerPrice?: number | null })
        ?.dealerPrice;
      if (useDealerPrice && typeof dealerPrice === "number") {
        return dealerPrice;
      }
      return product?.price ?? 0;
    },
    [useDealerPrice]
  );

  const updateQuantity = useCallback((id: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const safeValue = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
    setQuantities((prev) => ({ ...prev, [id]: safeValue }));
  }, []);

  const bundleTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (quantities[item.id] ?? item.quantity) *
            getEffectivePrice(item.product),
        0
      ),
    [items, quantities, getEffectivePrice]
  );

  const selectedOptionalItems = useMemo(
    () => optionalItems.filter((item) => optionalSelection[item.id]),
    [optionalItems, optionalSelection]
  );

  const customizedItems = useMemo(
    () => [...requiredItems, ...selectedOptionalItems],
    [requiredItems, selectedOptionalItems]
  );

  const customizedTotal = useMemo(
    () =>
      customizedItems.reduce(
        (sum, item) =>
          sum +
          (quantities[item.id] ?? item.quantity) *
            getEffectivePrice(item.product),
        0
      ),
    [customizedItems, quantities, getEffectivePrice]
  );

  const buildLineItems = useCallback(
    (source: NormalizedItem[]) =>
      source
        .map((item) => {
          const quantity = quantities[item.id] ?? item.quantity;
          if (!quantity || quantity <= 0) return null;
          return {
            productId: item.product._id,
            productName: item.product.name ?? item.product._id,
            productSlug: item.product.slug?.current ?? item.product._id,
            quantity,
            unitPrice: getEffectivePrice(item.product),
          };
        })
        .filter(Boolean) as Array<{
        productId: string;
        productName: string;
        productSlug: string;
        quantity: number;
        unitPrice: number;
      }>,
    [getEffectivePrice, quantities]
  );

  const handleAddRequired = useCallback(async () => {
    if (!requiredItems.length) {
      toast.error("No required products are configured for this bundle.");
      return;
    }
    const lineItems = buildLineItems(requiredItems);
    if (!lineItems.length) {
      toast.error("Please set a quantity for required items.");
      return;
    }

    try {
      await addItems({ items: lineItems });
      toast.success("Required products added to cart.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add items";
      toast.error(message);
    }
  }, [addItems, buildLineItems, requiredItems]);

  const handleAddCustomized = useCallback(async () => {
    if (!customizedItems.length) {
      toast.error("Select at least one optional add-on.");
      return;
    }
    const lineItems = buildLineItems(customizedItems);
    if (!lineItems.length) {
      toast.error("Please set quantities for selected items.");
      return;
    }

    try {
      await addItems({ items: lineItems });
      toast.success("Selected items added to cart.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add items";
      toast.error(message);
    }
  }, [addItems, buildLineItems, customizedItems]);

  if (!items.length) {
    return (
      <Card className="border border-dashed border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-shop_dark_green">
            Solution bundle
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          Product bundle details are being finalized. Check back soon for the
          full kit.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-shop_dark_green/70">
                Solution products
              </p>
              <CardTitle className="text-2xl font-bold text-shop_dark_green">
                Solution bundle
              </CardTitle>
            </div>
            <Badge
              variant="secondary"
              className="bg-white text-shop_dark_green border border-gray-200"
            >
              {requiredItems.length} required, {optionalItems.length} optional
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            Everything you need to deploy {insightTitle || "this solution"} with
            the recommended quantities.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {items.map((item) => {
              const product = item.product;
              const productHref = buildProductPath(product);
              const imageUrl = product.images?.[0]
                ? urlFor(product.images[0]).width(160).height(160).url()
                : null;
              const quantityValue = quantities[item.id] ?? item.quantity;
              const price = getEffectivePrice(product);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="grid gap-4 sm:grid-cols-[80px_1fr_auto] sm:items-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-shop_light_bg">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name || "Solution product"}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package
                          className="h-8 w-8 text-shop_dark_green/70"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={productHref}
                          className="text-base font-semibold text-shop_dark_green hover:text-shop_light_green"
                        >
                          {product.name || "Solution product"}
                        </Link>
                        <Badge
                          className={
                            item.isRequired
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-amber-100 text-amber-700 border border-amber-200"
                          }
                        >
                          {item.isRequired ? "Required" : "Optional"}
                        </Badge>
                        {item.isRequired ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Essential
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500">
                        SKU: {product.sku || product._id || "TBD"}
                      </div>
                      {item.notes ? (
                        <p className="text-sm text-gray-600">{item.notes}</p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Implementation tips available in the solution guide.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 text-left sm:text-right">
                      <div className="text-sm font-semibold text-shop_dark_green">
                        <PriceFormatter amount={price} />
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <span className="text-xs text-gray-500">Qty</span>
                        <Input
                          type="number"
                          min={1}
                          value={quantityValue}
                          onChange={(event) =>
                            updateQuantity(item.id, event.target.value)
                          }
                          className="h-9 w-20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-shop_light_bg/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Bundle total
              </p>
              <p className="text-2xl font-semibold text-shop_dark_green">
                <PriceFormatter amount={bundleTotal} />
              </p>
              <p className="text-xs text-gray-500">
                Total reflects the quantities listed above.
              </p>
            </div>
            <Button
              onClick={handleAddRequired}
              disabled={isMutating}
              className="gap-2 bg-shop_dark_green text-white hover:bg-shop_light_green"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Add Complete Solution to Cart
            </Button>
          </div>

          <details className="group rounded-xl border border-gray-100 bg-white p-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-shop_dark_green">
              Customize and add to cart
              <ChevronDown
                className="h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-4 space-y-4">
              {optionalItems.length ? (
                <div className="space-y-3">
                  {optionalItems.map((item) => {
                    const product = item.product;
                    const imageUrl = product.images?.[0]
                      ? urlFor(product.images[0]).width(80).height(80).url()
                      : null;
                    const quantityValue = quantities[item.id] ?? item.quantity;
                    const price = getEffectivePrice(product);

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-100 bg-shop_light_bg/40 p-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={optionalSelection[item.id] || false}
                              onCheckedChange={(checked) =>
                                setOptionalSelection((prev) => ({
                                  ...prev,
                                  [item.id]: checked === true,
                                }))
                              }
                              className="mt-1"
                            />
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-white">
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt={product.name || "Optional product"}
                                    width={48}
                                    height={48}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Package
                                    className="h-5 w-5 text-shop_dark_green/70"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-shop_dark_green">
                                  {product.name || "Optional add-on"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item.notes || "Optional add-on"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:justify-end">
                            <span className="text-sm font-semibold text-shop_dark_green">
                              <PriceFormatter amount={price} />
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Qty</span>
                              <Input
                                type="number"
                                min={1}
                                value={quantityValue}
                                onChange={(event) =>
                                  updateQuantity(item.id, event.target.value)
                                }
                                className="h-8 w-16"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  There are no optional add-ons listed for this solution.
                </p>
              )}

              <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Selected total
                  </p>
                  <p className="text-lg font-semibold text-shop_dark_green">
                    <PriceFormatter amount={customizedTotal} />
                  </p>
                </div>
                <Button
                  onClick={handleAddCustomized}
                  disabled={isMutating}
                  variant="outline"
                  className="gap-2 border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  Add Selected Items to Cart
                </Button>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      {optionalItems.length ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-shop_dark_green/70">Optional add-ons</p>
            <h3 className="text-2xl font-bold text-shop_dark_green">
              Optional add-ons
            </h3>
            <p className="text-sm text-gray-600">
              Expand the bundle with these add-on products.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {optionalItems.map((item) => {
              const product = item.product;
              const productHref = buildProductPath(product);
              const imageUrl = product.images?.[0]
                ? urlFor(product.images[0]).width(300).height(300).url()
                : null;
              const price = getEffectivePrice(product);

              return (
                <Card key={`optional-${item.id}`} className="border border-gray-100">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-shop_light_bg">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.name || "Optional add-on"}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package
                            className="h-6 w-6 text-shop_dark_green/70"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <Link
                          href={productHref}
                          className="text-sm font-semibold text-shop_dark_green hover:text-shop_light_green"
                        >
                          {product.name || "Optional add-on"}
                        </Link>
                        <p className="text-xs text-gray-500">
                          SKU: {product.sku || product._id || "TBD"}
                        </p>
                        <p className="text-sm font-semibold text-shop_dark_green">
                          <PriceFormatter amount={price} />
                        </p>
                      </div>
                    </div>
                    <AddToCartButton product={product} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SolutionBundleSection;
