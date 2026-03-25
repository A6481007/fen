"use client";

import { Button } from "@/components/ui/button";
import QuantityButtons from "@/components/QuantityButtons";
import { Trash2 } from "lucide-react";
import { Product } from "@/sanity.types";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";

interface CartItemControlsProps {
  product: Product;
  lineId: string;
}

export function CartItemControls({ product, lineId }: CartItemControlsProps) {
  const { removeItem, isMutating } = useCart();

  const handleRemove = async () => {
    try {
      await removeItem(lineId);
      toast.success("Item removed from cart");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove item";
      toast.error(message);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <QuantityButtons product={product} lineId={lineId} />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={isMutating}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
