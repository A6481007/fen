"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
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
import CartLineItem from "./CartLineItem";
import { useCart } from "@/hooks/useCart";
import type { AppliedPromotion, CartItem, CartPromotionGroup } from "@/lib/cart/types";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cart, view, itemCount, removeItem, updateItem, clearCart, isLoading } =
    useCart();

  const items = cart?.items ?? [];
  const summary = view?.summary ?? {
    subtotal: cart?.subtotal ?? 0,
    totalDiscount: cart?.totalDiscount ?? 0,
    total: cart?.total ?? 0,
    itemCount,
    promotionCount: view?.summary?.promotionCount ?? 0,
  };
  const appliedPromotions = cart?.appliedPromotions ?? [];
  const subtotal = summary.subtotal;
  const totalDiscount = summary.totalDiscount;
  const total = summary.total;

  const fallbackGroup: CartPromotionGroup | null = items.length
    ? {
        groupId: "ungrouped",
        groupType: "ungrouped",
        displayName: "Items",
        items,
        originalTotal: subtotal,
        discountAmount: totalDiscount,
        finalTotal: total,
        isCollapsible: false,
        isEditable: true,
      }
    : null;

  const groups = view?.groups ?? (fallbackGroup ? [fallbackGroup] : []);
  const hasItems = groups.some((group) => group.items.length > 0);

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    void updateItem(itemId, quantity);
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
            {hasItems && (
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

        {!hasItems ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
            Your cart is empty.
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-5 py-4">
                {groups.map((group) => (
                  <div
                    key={group.groupId}
                    className="rounded-lg border bg-background/90 shadow-[0_18px_38px_-24px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-3 border-b px-3 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {group.groupType === "ungrouped"
                              ? "Cart items"
                              : group.groupType === "deal"
                                ? "Deal"
                                : "Promotion"}
                          </span>
                          {group.badge && (
                            <Badge
                              variant="outline"
                              style={
                                group.badgeColor
                                  ? { borderColor: group.badgeColor, color: group.badgeColor }
                                  : undefined
                              }
                              className="text-[11px] font-semibold"
                            >
                              {group.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold leading-tight">{group.displayName}</p>
                        {group.tagline && (
                          <p className="text-xs text-muted-foreground">{group.tagline}</p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <PriceFormatter amount={group.finalTotal} className="text-base font-semibold" />
                        {group.discountAmount > 0 && (
                          <p className="text-[11px] font-semibold text-emerald-700">
                            Saved{" "}
                            <PriceFormatter
                              amount={group.discountAmount}
                              className="text-[11px] text-emerald-700"
                            />
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 px-3 py-3">
                      {group.items.map((item) => (
                        <CartLineItem
                          key={item.id}
                          item={item}
                          onUpdateQuantity={handleUpdateQuantity}
                          onRemove={handleRemove}
                          disabled={isLoading || group.isEditable === false}
                        />
                      ))}
                    </div>
                  </div>
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
