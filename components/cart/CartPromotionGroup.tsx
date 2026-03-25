"use client";

import "@/app/i18n";
import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CartItemRow } from "./CartItemRow";
import { DealCountdown } from "@/components/DealCountdown";
import PriceFormatter from "@/components/PriceFormatter";
import type { CartPromotionGroup } from "@/lib/cart/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CartPromotionGroupProps {
  group: CartPromotionGroup;
  onRemoveGroup: (groupId: string) => void;
  onUpdateItemQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  defaultExpanded?: boolean;
}

export function CartPromotionGroupCard({
  group,
  onRemoveGroup,
  onUpdateItemQuantity,
  onRemoveItem,
  defaultExpanded = false,
}: CartPromotionGroupProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isPromotion = group.groupType !== "ungrouped";
  const hasDiscount = group.discountAmount > 0;
  
  // For ungrouped items, render without the collapsible wrapper
  if (!isPromotion) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("client.cart.group.otherItems")}
        </h3>
        {group.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onUpdateQuantity={(qty) => onUpdateItemQuantity(item.id, qty)}
            onRemove={() => onRemoveItem(item.id)}
            showPromoBadge
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden",
      hasDiscount && "border-green-200 dark:border-green-900"
    )}>
      {/* Promotion Header - Always Visible */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className={cn(
            "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors",
            hasDiscount && "bg-green-50/50 dark:bg-green-950/20"
          )}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Promotion Image */}
              {group.imageUrl && (
                <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img 
                    src={group.imageUrl} 
                    alt={group.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{group.displayName}</h3>
                  {group.badge && (
                    <Badge 
                      variant="secondary" 
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      style={group.badgeColor ? { backgroundColor: group.badgeColor } : undefined}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {group.badge}
                    </Badge>
                  )}
                </div>
                
                {group.tagline && (
                  <p className="text-sm text-muted-foreground truncate">{group.tagline}</p>
                )}
                
                {/* Countdown Timer */}
                {group.expiresAt && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-1">
                    <Clock className="w-3 h-3" />
                    <DealCountdown targetDate={group.expiresAt} compact />
                  </div>
                )}
              </div>
            </div>
            
            {/* Price Summary */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                {hasDiscount && (
                  <div className="text-xs text-muted-foreground line-through">
                    <PriceFormatter amount={group.originalTotal} />
                  </div>
                )}
                <div className={cn("font-semibold", hasDiscount && "text-green-600 dark:text-green-400")}>
                  <PriceFormatter amount={group.finalTotal} />
                </div>
                {hasDiscount && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {t("client.cart.group.youSave")}{" "}
                    <PriceFormatter amount={group.discountAmount} />
                  </div>
                )}
              </div>
              
              {/* Expand/Collapse Indicator */}
              <div className="text-muted-foreground">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        {/* Expanded Content - Product Details */}
        <CollapsibleContent>
          <div className="border-t bg-muted/30">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>
                  {group.items.length === 1
                    ? t("client.cart.group.itemsIncluded.single", {
                        count: group.items.length,
                      })
                    : t("client.cart.group.itemsIncluded.plural", {
                        count: group.items.length,
                      })}
                </span>
                {group.isEditable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRemoveGroup(group.groupId)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {t("client.cart.group.removeAll")}
                  </Button>
                )}
              </div>
              
              {group.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={
                    group.isEditable 
                      ? (qty) => onUpdateItemQuantity(item.id, qty)
                      : undefined
                  }
                  onRemove={
                    group.isEditable && !group.editRestrictions?.fixedProducts
                      ? () => onRemoveItem(item.id)
                      : undefined
                  }
                  showPromoBadge
                  compact
                  minQuantity={group.editRestrictions?.minQuantity}
                  maxQuantity={group.editRestrictions?.maxQuantity}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
