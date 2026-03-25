"use client";
import { useCart } from "@/hooks/useCart";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

const CartIcon = () => {
  const { itemCount } = useCart();
  const displayCount = itemCount > 9 ? "9+" : itemCount;

  return (
    <Link href={"/cart"} className="group relative">
      <ShoppingBag className="group-hover:text-brand-text-main hoverEffect" />
      {itemCount > 0 ? (
        <span
          className={`absolute -top-1 -right-1 bg-brand-red-accent text-white rounded-full text-xs font-semibold flex items-center justify-center min-w-[14px] h-[14px] ${
            itemCount > 9 ? "px-1" : ""
          }`}
        >
          {displayCount}
        </span>
      ) : (
        <span className="absolute -top-1 -right-1 bg-brand-red-accent text-white rounded-full text-xs font-semibold flex items-center justify-center min-w-[14px]">
          0
        </span>
      )}
    </Link>
  );
};

export default CartIcon;
