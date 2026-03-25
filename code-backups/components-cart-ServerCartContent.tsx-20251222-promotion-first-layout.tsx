"use client";

import React, { useEffect, useState } from "react";
import useCartStore from "@/store";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import EmptyCart from "@/components/EmptyCart";
import PriceFormatter from "@/components/PriceFormatter";
import Link from "next/link";
import { AddressSelector } from "./AddressSelector";
import { CheckoutButton } from "./CheckoutButton";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { PersonalizedOffers } from "@/components/promotions/PersonalizedOffers";
import { useCart } from "@/hooks/useCart";
import type { CartPromotionGroup } from "@/lib/cart/types";
import { CartPromotionGroupCard } from "./CartPromotionGroup";

interface Address {
  _id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  default: boolean;
  createdAt: string;
}

interface UserOrder {
  _id: string;
  orderNumber: string;
  totalPrice: number;
  currency: string;
  status: string;
  orderDate: string;
  customerName: string;
  email: string;
}

interface ServerCartContentProps {
  userEmail: string;
  userAddresses: Address[];
  userOrders: UserOrder[];
  onAddressesRefresh?: () => Promise<void>;
  abandonmentStatus?: "none" | "at_risk" | "abandoned" | "recovered";
}

export function ServerCartContent({
  userEmail,

  userAddresses,
  userOrders,
  onAddressesRefresh,
  abandonmentStatus = "none",
}: ServerCartContentProps) {
  const {
    items: storeCart,
    getSubTotalPrice,
    getTotalDiscount,
    setOrderPlacementState,
  } = useCartStore();
  const { clearCart, view, removeItem, updateItem, isLoading, isMutating } = useCart();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const isBusy = isLoading || isMutating;

  // Reset order placement state when cart page loads to clear any stale state
  useEffect(() => {
    setOrderPlacementState(false, "validating");
  }, [setOrderPlacementState]);

  const handleResetCart = () => {
    setShowClearModal(true);
  };

  const confirmResetCart = async () => {
    try {
      await clearCart();
      setShowClearModal(false);
      toast.success("Cart cleared successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to clear cart";
      toast.error(message);
    }
  };

  // Set default address on mount
  useEffect(() => {
    const defaultAddress = userAddresses.find((addr) => addr.default);
    if (defaultAddress) {
      setSelectedAddress(defaultAddress);
    } else if (userAddresses.length > 0) {
      setSelectedAddress(userAddresses[0]);
    }
  }, []);

  // New pricing structure:
  // 1. Subtotal = gross amount (sum of original prices before discount)
  // 2. Discount = total discount amount
  // 3. Current total = subtotal - discount
  // 4. Shipping and tax calculated on current total
  // 5. Final total = current total + shipping + tax

  const grossSubtotal = view?.summary.subtotal ?? getSubTotalPrice(); // Gross amount (before discount)
  const totalDiscount = view?.summary.totalDiscount ?? getTotalDiscount(); // Total discount amount
  const currentSubtotal = view?.summary.total ?? grossSubtotal - totalDiscount; // After discount
  const shipping = currentSubtotal > 100 ? 0 : 10;
  const tax =
    currentSubtotal * (parseFloat(process.env.TAX_AMOUNT || "0") || 0);
  const finalTotal = currentSubtotal + shipping + tax;
  const cartItemsForOffers = storeCart.map((item) => ({
    productId: item.product._id,
    categoryId: item.product.categories?.[0]?._ref,
    quantity: item.quantity,
    unitPrice: item.product.price ?? 0,
  }));
  const itemCount = view?.summary.itemCount ?? storeCart.length;

  // Don't show order placement skeleton in ServerCartContent
  // The overlay is handled by CheckoutButton component instead

  const fallbackGroup: CartPromotionGroup | null = storeCart.length
    ? {
        groupId: "ungrouped",
        groupType: "ungrouped",
        displayName: "Cart items",
        items: storeCart,
        originalTotal: grossSubtotal,
        discountAmount: totalDiscount,
        finalTotal: currentSubtotal,
        isCollapsible: false,
        isEditable: true,
      }
    : null;

  const groups = view?.groups ?? (fallbackGroup ? [fallbackGroup] : []);
  const hasItems = groups.some((group) => group.items.length > 0);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (isBusy) return;
    try {
      await updateItem(itemId, quantity);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update item quantity";
      toast.error(message);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (isBusy) return;
    try {
      await removeItem(itemId);
      toast.success("Item removed from cart");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove item";
      toast.error(message);
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (isBusy) return;
    const group = groups.find((entry) => entry.groupId === groupId);
    if (!group) return;
    try {
      await Promise.all(group.items.map((item) => removeItem(item.id)));
      toast.success("Promotion items removed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to remove promotion items";
      toast.error(message);
    }
  };

  if (!hasItems) {
    return (
      <div className="space-y-8">
        <EmptyCart />

        {/* Show recent orders if available */}
        {userOrders.length > 0 && (
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {userOrders.slice(0, 3).map((order) => (
                <div
                  key={order._id}
                  className="flex justify-between items-center p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">#{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <PriceFormatter amount={order.totalPrice} />
                    <Badge
                      variant={
                        order.status === "delivered" ? "default" : "secondary"
                      }
                      className="ml-2"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/user/orders">
                <Button variant="outline" className="w-full">
                  View All Orders
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <AbandonmentUrgencyMessage status={abandonmentStatus} />

        {abandonmentStatus === "at_risk" && (
          <PersonalizedOffers
            context="cart"
            cartValue={currentSubtotal}
            cartItems={cartItemsForOffers}
            variant="banner"
            maxOffers={1}
            className="mb-2"
          />
        )}

        <div className="space-y-4">
          {groups.map((group, index) => (
            <CartPromotionGroupCard
              key={group.groupId}
              group={group}
              onRemoveGroup={handleRemoveGroup}
              onUpdateItemQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              defaultExpanded={group.groupType !== "ungrouped" || index === 0}
            />
          ))}
        </div>

        <PersonalizedOffers
          context="cart"
          cartValue={currentSubtotal}
          cartItems={cartItemsForOffers}
          variant="card"
          maxOffers={2}
          className="my-2"
        />

        {/* Continue Shopping */}
        <div className="flex flex-col gap-2 w-48">
          <Link href="/shop">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleResetCart}
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-semibold"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cart
          </Button>
        </div>
      </div>

      {/* Order Summary & Checkout */}
      <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
        {/* Address Selection */}
        <AddressSelector
          userEmail={userEmail}
          addresses={userAddresses}
          selectedAddress={selectedAddress}
          onAddressSelect={setSelectedAddress}
          onAddressesRefresh={onAddressesRefresh}
        />

        {/* Order Summary */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
          <span>Subtotal ({view?.summary.itemCount ?? storeCart.length} items)</span>
          <PriceFormatter amount={grossSubtotal ?? 0} />
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-success-base">
                <span>Discount</span>
                <span>
                  -<PriceFormatter amount={totalDiscount} />
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              {shipping === 0 ? (
                <span className="text-success-base font-medium">Free</span>
              ) : (
                <PriceFormatter amount={shipping} />
              )}
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <PriceFormatter amount={tax} />
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <PriceFormatter amount={finalTotal} />
            </div>

            {shipping === 0 && (
              <p className="text-sm text-success-base">
                🎉 You got free shipping!
              </p>
            )}
            {currentSubtotal < 100 && (
              <p className="text-sm text-muted-foreground">
                Add <PriceFormatter amount={100 - currentSubtotal} /> more for
                free shipping
              </p>
            )}
          </div>

          {/* Checkout */}
          <div className="mt-6">
            <CheckoutButton cart={storeCart} selectedAddress={selectedAddress} />
          </div>
        </div>
      </div>

      {/* Clear Cart Confirmation Modal */}
      <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
            )}
          >
            <VisuallyHidden.Root>
              <DialogTitle>Clear Cart Confirmation</DialogTitle>
            </VisuallyHidden.Root>
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-4 border-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Clear Cart</h3>
                <p className="text-gray-600 leading-relaxed">
                  You&apos;re about to remove{" "}
                  <span className="font-semibold text-red-600">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>{" "}
                  from your cart. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowClearModal(false)}
                className="flex-1 border-gray-300 hover:bg-gray-50 font-medium"
              >
                Keep Items
              </Button>
              <Button
                variant="destructive"
                onClick={confirmResetCart}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500 font-semibold shadow-lg hover:shadow-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Cart
              </Button>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

function AbandonmentUrgencyMessage({
  status,
}: {
  status: "none" | "at_risk" | "abandoned" | "recovered";
}) {
  if (status === "at_risk") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 font-medium">
          ⏰ Your cart is waiting! Complete your order to lock in these prices.
        </p>
      </div>
    );
  }

  if (status === "abandoned") {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-orange-800 font-medium">
          👋 Welcome back! We saved your cart. Here&apos;s a special offer to complete
          your purchase:
        </p>
      </div>
    );
  }

  return null;
}
