// NEW: components/cart/CartItemRow.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuantityButtons } from "@/components/QuantityButtons";
import PriceFormatter from "@/components/PriceFormatter";
import type { CartItem } from "@/lib/cart/types";
import { cn } from "@/lib/utils";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  showPromoBadge?: boolean;
  compact?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  showPromoBadge = true,
  compact = false,
  minQuantity = 1,
  maxQuantity,
}: CartItemRowProps) {
  const isFree = item.lineTotal === 0 && item.unitPrice > 0;
  const hasDiscount = item.appliedPromotion && !isFree;
  const originalLineTotal = item.unitPrice * item.quantity;
  const savings = originalLineTotal - item.lineTotal;
  
  return (
    <div className={cn(
      "flex items-center gap-3 py-2",
      compact ? "text-sm" : ""
    )}>
      {/* Product Image */}
      <Link 
        href={`/products/${item.productSlug}`}
        className={cn(
          "flex-shrink-0 rounded-md overflow-hidden bg-muted",
          compact ? "w-10 h-10" : "w-16 h-16"
        )}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            width={compact ? 40 : 64}
            height={compact ? 40 : 64}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </Link>
      
      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <Link 
          href={`/products/${item.productSlug}`}
          className="font-medium hover:underline line-clamp-1"
        >
          {item.productName}
        </Link>
        
        {item.variantLabel && (
          <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          {isFree ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Gift className="w-3 h-3 mr-1" />
              FREE
            </Badge>
          ) : showPromoBadge && item.appliedPromotion ? (
            <Badge variant="outline" className="text-xs">
              {item.appliedPromotion.name}
            </Badge>
          ) : null}
        </div>
      </div>
      
      {/* Quantity Controls */}
      <div className="flex items-center gap-2">
        {onUpdateQuantity ? (
          <QuantityButtons
            quantity={item.quantity}
            onIncrease={() => onUpdateQuantity(item.quantity + 1)}
            onDecrease={() => onUpdateQuantity(Math.max(minQuantity, item.quantity - 1))}
            min={minQuantity}
            max={maxQuantity ?? item.availableStock ?? undefined}
            size={compact ? "sm" : "default"}
          />
        ) : (
          <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
        )}
      </div>
      
      {/* Price */}
      <div className="text-right min-w-[80px]">
        {isFree ? (
          <>
            <div className="text-xs text-muted-foreground line-through">
              <PriceFormatter amount={originalLineTotal} />
            </div>
            <div className="font-semibold text-green-600">FREE</div>
          </>
        ) : hasDiscount ? (
          <>
            <div className="text-xs text-muted-foreground line-through">
              <PriceFormatter amount={originalLineTotal} />
            </div>
            <div className="font-semibold">
              <PriceFormatter amount={item.lineTotal} />
            </div>
          </>
        ) : (
          <div className="font-semibold">
            <PriceFormatter amount={item.lineTotal} />
          </div>
        )}
      </div>
      
      {/* Remove Button */}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className={cn(compact ? "w-4 h-4" : "w-5 h-5")} />
        </Button>
      )}
    </div>
  );
}
