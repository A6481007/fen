"use client";

import { useEffect, useState } from "react";
import { Users, ShoppingCart, Eye } from "lucide-react";

interface SocialProofProps {
  productId: string;
  variant?: "viewers" | "purchases" | "carts";
}

export function SocialProof({ productId, variant = "viewers" }: SocialProofProps) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Simulate realistic numbers (in production, fetch from analytics)
    const base = variant === "viewers" ? 15 : variant === "purchases" ? 50 : 8;
    const variance = Math.floor(Math.random() * 10);
    setCount(base + variance);
  }, [productId, variant]);
  
  if (count === 0) return null;
  
  const Icon = variant === "viewers" ? Eye : variant === "purchases" ? ShoppingCart : Users;
  const text = variant === "viewers" 
    ? `${count} people viewing now`
    : variant === "purchases"
    ? `${count}+ bought in last 24h`
    : `${count} people have this in cart`;
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="w-4 h-4" />
      <span>{text}</span>
    </div>
  );
}
