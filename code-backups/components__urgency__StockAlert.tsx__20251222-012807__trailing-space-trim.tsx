"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StockAlertProps {
  stock: number;
  threshold?: number;
  className?: string;
}

export function StockAlert({ stock, threshold = 10, className }: StockAlertProps) {
  if (stock > threshold) return null;
  
  const isVeryLow = stock <= 3;
  const isSoldOut = stock <= 0;
  
  if (isSoldOut) {
    return (
      <Badge variant="destructive" className={cn("gap-1", className)}>
        SOLD OUT
      </Badge>
    );
  }
  
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm",
      isVeryLow ? "text-red-600" : "text-orange-600",
      className
    )}>
      <AlertTriangle className="w-4 h-4" />
      <span className="font-medium">
        {isVeryLow ? "Almost gone!" : "Low stock"} - Only {stock} left
      </span>
    </div>
  );
}
