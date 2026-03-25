"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import PriceFormatter from "@/components/PriceFormatter";
import { useCart } from "@/contexts/CartContext";
import type { AppliedPromotion, CartItem } from "@/lib/cart/types";
import { cn } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cart, itemCount, removeItem, updateQuantity, clearCart, isLoading } =
    useCart();

  const items = cart?.items ?? [];
  const appliedPromotions = cart?.appliedPromotions ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const totalDiscount = cart?.totalDiscount ?? 0;
  const total = cart?.total ?? 0;

  const handleDecrement = (item: CartItem) => {
    const nextQty = Math.max(1, item.quantity - 1);
    void updateQuantity(item.id, nextQty);
  };

  const handleIncrement = (item: CartItem) => {
    void updateQuantity(item.id, item.quantity + 1);
  };

  const handleRemove = (itemId: string) => {
    void removeItem(itemId);
  };

  const handleClear = () => {
    void clearCart();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0">
        <SheetHeader className="border-b bg-muted/40">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <SheetTitle>Your Cart</SheetTitle>
              <SheetDescription>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </SheetDescription>
            </div>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
            Your cart is empty.
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <CartLineItem
                    key={item.id}
                    item={item}
                    onIncrement={() => handleIncrement(item)}
                    onDecrement={() => handleDecrement(item)}
                    onRemove={() => handleRemove(item.id)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="mt-auto space-y-3 bg-background/80 border-t">
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <PriceFormatter amount={subtotal} />
                </div>

                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm text-emerald-800">
                    <span className="font-medium">Applied discounts</span>
                    {totalDiscount > 0 ? (
                      <span className="font-semibold">
                        -<PriceFormatter
                          amount={totalDiscount}
                          className="text-emerald-800"
                        />
                      </span>
                    ) : (
                      <span className="text-emerald-700">None yet</span>
                    )}
                  </div>
                  <AppliedDiscounts promotions={appliedPromotions} />
                </div>

                <Separator />

                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <PriceFormatter amount={total} className="text-lg" />
                </div>

                {totalDiscount > 0 && (
                  <p className="text-xs font-medium text-emerald-700">
                    You&apos;re saving{" "}
                    <PriceFormatter
                      amount={totalDiscount}
                      className="text-emerald-700"
                    />
                    {" "}on this order.
                  </p>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={isLoading || items.length === 0}
                  asChild
                >
                  <Link href="/checkout">Checkout</Link>
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface CartLineItemProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

function CartLineItem({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  disabled,
}: CartLineItemProps) {
  const originalLineTotal = item.unitPrice * item.quantity;
  const lineSavings = Math.max(0, originalLineTotal - item.lineTotal);
  const hasDiscount = lineSavings > 0;
  const promo = item.appliedPromotion;

  return (
    <div className="rounded-lg border bg-card p-3 shadow-[0_12px_30px_-14px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            href={`/products/${item.productSlug}`}
            className="font-semibold leading-tight hover:text-primary"
          >
            {item.productName}
          </Link>
          {promo && (
            <div className="flex items-center gap-2 text-xs text-emerald-700">
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-800"
              >
                {promo.type === "deal" ? "Deal" : "Promo"}
              </Badge>
              <span>{promo.name}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Unit price{" "}
            <PriceFormatter
              amount={item.unitPrice}
              className="text-xs text-muted-foreground font-medium"
            />{" "}
            · Qty {item.quantity}
          </div>
        </div>

        <div className="text-right">
          {hasDiscount && (
            <PriceFormatter
              amount={originalLineTotal}
              className="text-xs text-muted-foreground line-through"
            />
          )}
          <PriceFormatter
            amount={item.lineTotal}
            className={cn(
              "text-lg font-semibold",
              hasDiscount && "text-foreground"
            )}
          />
          {hasDiscount && (
            <div className="text-[11px] font-semibold text-emerald-700">
              You save{" "}
              <PriceFormatter
                amount={lineSavings}
                className="text-[11px] text-emerald-700"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="inline-flex items-center rounded-md border bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDecrement}
            disabled={disabled || item.quantity <= 1}
            className="rounded-none"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm font-medium">{item.quantity}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onIncrement}
            disabled={disabled}
            className="rounded-none"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove item</span>
        </Button>
      </div>
    </div>
  );
}

function AppliedDiscounts({
  promotions,
}: {
  promotions: AppliedPromotion[];
}) {
  if (!promotions.length) {
    return (
      <p className="text-xs text-emerald-700">
        Discounts will appear here when applied.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {promotions.map((promotion) => (
        <div
          key={`${promotion.type}-${promotion.id}`}
          className="flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {promotion.type}
            </Badge>
            <span className="font-medium">{promotion.name}</span>
          </div>
          {promotion.discountAmount > 0 && (
            <span className="text-emerald-700 font-semibold">
              -{" "}
              <PriceFormatter
                amount={promotion.discountAmount}
                className="text-emerald-700 font-semibold"
              />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
