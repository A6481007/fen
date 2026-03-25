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
import { CartPromotionGroupCard } from "./CartPromotionGroup";
import { useCart } from "@/hooks/useCart";
import type { AppliedPromotion, CartPromotionGroup } from "@/lib/cart/types";
import { toast } from "sonner";

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
  const appliedPromotions = summary.appliedPromotions ?? cart?.appliedPromotions ?? [];
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
    if (isLoading) return;
    void updateItem(itemId, quantity).catch((error) => {
      const message = error instanceof Error ? error.message : "Unable to update quantity";
      toast.error(message);
    });
  };

  const handleRemove = (itemId: string) => {
    if (isLoading) return;
    void removeItem(itemId);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (isLoading) return;
    const group = groups.find((entry) => entry.groupId === groupId);
    if (!group) return;
    void Promise.all(group.items.map((item) => removeItem(item.id)));
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
                {groups.map((group, index) => (
                  <CartPromotionGroupCard
                    key={group.groupId}
                    group={group}
                    onRemoveGroup={handleRemoveGroup}
                    onUpdateItemQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemove}
                    defaultExpanded={group.groupType !== "ungrouped" || index === 0}
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
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {promotion.name || promotion.id}
              </span>
              {promotion.id && promotion.id !== promotion.name ? (
                <span className="text-xs text-muted-foreground">
                  ({promotion.id})
                </span>
              ) : null}
            </div>
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
