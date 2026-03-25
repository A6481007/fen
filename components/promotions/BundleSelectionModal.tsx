"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Gift, Info, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { image } from "@/sanity/image";

type BundleProduct = {
  _id: string;
  name?: string | null;
  price?: number | null;
  images?: unknown;
};

type BundlePromotion = {
  name: string;
  products?: BundleProduct[];
  buyQuantity?: number | null;
  getQuantity?: number | null;
  discountType: string;
  discountValue: number;
};

export type SelectedProduct = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  freeQuantity?: number;
};

type SelectionState = {
  included: boolean;
  quantity: number;
};

export interface BundleSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: BundlePromotion;
  onConfirm: (selectedProducts: SelectedProduct[]) => void;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatCurrency = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? currencyFormatter.format(value) : "$0.00";

const normalizeQuantity = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.min(20, Math.max(1, Math.floor(parsed)));
};

const buildImageUrl = (product: BundleProduct) => {
  const images = product?.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    try {
      const built = image(first as any).width(320).height(240).fit("crop").url();
      if (built) {
        return built;
      }
    } catch {
      // ignore builder errors and fall back
    }

    const fallback =
      (first as { asset?: { url?: string } })?.asset?.url ||
      (first as { url?: string })?.url ||
      (typeof first === "string" ? first : null);
    if (typeof fallback === "string") {
      return fallback;
    }
  }
  return null;
};

const computeFreeAllocation = (items: SelectedProduct[], freeCount: number) => {
  if (freeCount <= 0) {
    return {} as Record<string, number>;
  }

  const unitized = items.flatMap((item) =>
    Array.from({ length: item.quantity }).map(() => ({
      productId: item.productId,
      price: item.price,
    }))
  );

  unitized.sort((a, b) => a.price - b.price);
  const freebies = unitized.slice(0, Math.min(freeCount, unitized.length));

  return freebies.reduce<Record<string, number>>((acc, unit) => {
    acc[unit.productId] = (acc[unit.productId] ?? 0) + 1;
    return acc;
  }, {});
};

const formatDealCopy = (promotion: BundlePromotion) => {
  if (promotion.discountType === "bxgy") {
    const buy = Math.max(0, promotion.buyQuantity ?? 0);
    const get = Math.max(0, promotion.getQuantity ?? 0);
    if (buy && get) {
      return `Buy ${buy}, Get ${get} Free`;
    }
    if (buy) {
      return `Buy ${buy}, get free add-ons`;
    }
  }

  if (promotion.discountType === "percentage") {
    return `${promotion.discountValue}% off bundle picks`;
  }

  if (
    promotion.discountType === "fixed" ||
    promotion.discountType === "fixed_amount" ||
    promotion.discountType === "fixedAmount"
  ) {
    return `${formatCurrency(promotion.discountValue)} off bundle picks`;
  }

  return promotion.name;
};

export function BundleSelectionModal({
  open,
  onOpenChange,
  promotion,
  onConfirm,
}: BundleSelectionModalProps) {
  const [selection, setSelection] = useState<Record<string, SelectionState>>({});

  const products = promotion.products ?? [];
  const buyQuantity = Math.max(0, promotion.buyQuantity ?? 0);
  const getQuantity = Math.max(0, promotion.getQuantity ?? 0);
  const isBxgy = promotion.discountType === "bxgy";
  const requiredTotal = isBxgy ? Math.max(buyQuantity + getQuantity, buyQuantity) : 0;

  const selectedProducts = useMemo<SelectedProduct[]>(() => {
    return products.flatMap((product) => {
      if (!product?._id) {
        return [];
      }
      const state = selection[product._id];
      if (!state?.included) {
        return [];
      }

      const price =
        typeof product.price === "number" && Number.isFinite(product.price) ? product.price : 0;

      return [
        {
          productId: product._id,
          name: product.name ?? "Selected product",
          quantity: normalizeQuantity(state.quantity),
          price,
        },
      ];
    });
  }, [products, selection]);

  const totalQuantity = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const eligibleFreeUnits = isBxgy ? Math.max(0, Math.min(getQuantity, totalQuantity - buyQuantity)) : 0;
  const meetsBxgyRequirement = !isBxgy || totalQuantity >= requiredTotal;

  const freeAllocation = useMemo(
    () => computeFreeAllocation(selectedProducts, eligibleFreeUnits),
    [selectedProducts, eligibleFreeUnits]
  );

  const selectedWithFree = useMemo<SelectedProduct[]>(
    () =>
      selectedProducts.map((item) => ({
        ...item,
        freeQuantity: freeAllocation[item.productId] ?? 0,
      })),
    [selectedProducts, freeAllocation]
  );

  const subtotal = selectedWithFree.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const bxgySavings = selectedWithFree.reduce(
    (sum, item) => sum + item.price * (item.freeQuantity ?? 0),
    0
  );

  let discountSavings = 0;
  if (!isBxgy) {
    if (promotion.discountType === "percentage") {
      discountSavings = subtotal * (promotion.discountValue / 100);
    } else if (
      promotion.discountType === "fixed" ||
      promotion.discountType === "fixed_amount" ||
      promotion.discountType === "fixedAmount"
    ) {
      discountSavings = promotion.discountValue;
    }
  }

  const totalSavings = Math.min(subtotal, isBxgy ? bxgySavings : Math.max(0, discountSavings));
  const totalDue = Math.max(0, subtotal - totalSavings);
  const remainingToUnlock = isBxgy ? Math.max(0, requiredTotal - totalQuantity) : 0;
  const canConfirm = selectedProducts.length > 0 && meetsBxgyRequirement;

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelection({});
    }
    onOpenChange(nextOpen);
  };

  const toggleProduct = (productId: string, included: boolean) => {
    setSelection((prev) => {
      const current = prev[productId];
      return {
        ...prev,
        [productId]: {
          included,
          quantity: normalizeQuantity(current?.quantity ?? 1),
        },
      };
    });
  };

  const updateQuantity = (productId: string, value: string) => {
    const qty = normalizeQuantity(value);
    setSelection((prev) => {
      const current = prev[productId];
      return {
        ...prev,
        [productId]: {
          included: current?.included ?? true,
          quantity: qty,
        },
      };
    });
  };

  const handleConfirm = () => {
    if (!canConfirm) {
      return;
    }
    onConfirm(selectedWithFree);
    onOpenChange(false);
    setSelection({});
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl space-y-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold leading-tight">
            {promotion.name}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {formatDealCopy(promotion)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
          <Info className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-900">
              {isBxgy
                ? `Select ${buyQuantity + getQuantity} items to unlock ${getQuantity} free.`
                : "Pick the items you want in this bundle and we will apply the discount."}
            </p>
            {isBxgy ? (
              <p className="text-xs text-slate-600">
                The cheapest {getQuantity || 0} item(s) in your selection will be free once the
                requirement is met.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Choose products
              </div>
              {isBxgy ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Buy {buyQuantity} Get {getQuantity}
                </span>
              ) : null}
            </div>

            <div className="rounded-lg border">
              {products.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No products available for this promotion.
                </div>
              ) : (
                <ScrollArea className="h-[420px]">
                  <div className="divide-y">
                    {products.map((product) => {
                      const checked = Boolean(selection[product._id]?.included);
                      const quantity = selection[product._id]?.quantity ?? 1;
                      const imageUrl = buildImageUrl(product);
                      const freeQty = freeAllocation[product._id] ?? 0;
                      const unitPrice =
                        typeof product.price === "number" && Number.isFinite(product.price)
                          ? product.price
                          : 0;

                      return (
                        <div key={product._id} className="flex items-center gap-4 px-4 py-3">
                          <Checkbox
                            id={`select-${product._id}`}
                            checked={checked}
                            onCheckedChange={(value) => toggleProduct(product._id, Boolean(value))}
                            className="mt-1"
                          />
                          <div className="flex flex-1 items-start gap-3">
                            <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-slate-100">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={product.name ?? "Bundle product"}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-500">
                                  <Gift className="h-5 w-5" aria-hidden="true" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <label
                                    htmlFor={`select-${product._id}`}
                                    className="block cursor-pointer text-sm font-semibold text-slate-900"
                                  >
                                    {product.name ?? "Bundle product"}
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(unitPrice)}
                                  </p>
                                </div>
                                {freeQty > 0 ? (
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    {freeQty} free
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={`quantity-${product._id}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Quantity
                                </Label>
                                <Input
                                  id={`quantity-${product._id}`}
                                  type="number"
                                  min={1}
                                  max={20}
                                  disabled={!checked}
                                  value={quantity}
                                  onChange={(event) => updateQuantity(product._id, event.target.value)}
                                  className="w-24"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Selection summary</p>
                {isBxgy ? (
                  <span className="text-xs font-medium text-slate-600">
                    {remainingToUnlock > 0
                      ? `${remainingToUnlock} item(s) to unlock freebies`
                      : "Free items applied"}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Items selected</span>
                  <span>{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {totalSavings > 0 ? (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Savings</span>
                    <span>-{formatCurrency(totalSavings)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Total due</span>
                  <span>{formatCurrency(totalDue)}</span>
                </div>
              </div>

              {isBxgy ? (
                <div className="mt-3 rounded-md border border-dashed border-emerald-200 bg-white p-3 text-xs text-slate-700">
                  {remainingToUnlock > 0 ? (
                    <p>
                      Add {remainingToUnlock} more item{remainingToUnlock > 1 ? "s" : ""} to get{" "}
                      {getQuantity} free.
                    </p>
                  ) : (
                    <p>
                      We will mark the {eligibleFreeUnits} cheapest item
                      {eligibleFreeUnits === 1 ? "" : "s"} as free.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Items chosen
                </p>
                {selectedWithFree.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items selected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedWithFree.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {item.quantity}× {item.name}
                          </span>
                          {item.freeQuantity ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              {item.freeQuantity} free
                            </span>
                          ) : null}
                        </div>
                        <span className="text-slate-700">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleDialogChange(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" disabled={!canConfirm} onClick={handleConfirm}>
                Confirm selection
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BundleSelectionModal;
