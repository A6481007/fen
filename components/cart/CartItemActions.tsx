"use client";

import "@/app/i18n";
import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

import { Trash2 } from "lucide-react";
import { removeFromCart, updateCartItem } from "@/actions/userActions";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CartItemActionsProps {
  productId: string;
  currentQuantity: number;
  maxQuantity: number;
  size?: string;
  color?: string;
  inStock: boolean;
}

export function CartItemActions({
  productId,
  currentQuantity,
  maxQuantity,
  size,
  color,
  inStock,
}: CartItemActionsProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(currentQuantity);

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);

    startTransition(async () => {
      try {
        await updateCartItem({
          productId,
          quantity: newQuantity,
          size,
          color,
        });
        toast.success(t("client.cart.itemActions.moved"));
      } catch {
        console.error("Error moving to cart");
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeFromCart(productId, size, color);
        toast.success(t("client.cart.itemActions.removed"));
      } catch {
        toast.error(t("client.cart.itemActions.removeFailed"));
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center border rounded-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
          disabled={isPending || !inStock || quantity <= 1}
          className="h-8 w-8 p-0"
        >
          -
        </Button>
        <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
          {quantity}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            handleQuantityChange(Math.min(maxQuantity, quantity + 1))
          }
          disabled={isPending || !inStock || quantity >= maxQuantity}
          className="h-8 w-8 p-0"
        >
          +
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={isPending}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
