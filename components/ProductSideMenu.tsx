"use client";
import { cn } from "@/lib/utils";
import { Product } from "@/sanity.types";
import useCartStore from "@/store";
import { Heart } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import _ from "lodash";
import ShareButton from "@/components/shared/ShareButton";
import { buildProductPath } from "@/lib/paths";

const ProductSideMenu = ({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) => {
  const { favoriteProduct, addToFavorite } = useCartStore();
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const shareUrl = buildProductPath(product);

  useEffect(() => {
    const availableItem = _.find(
      favoriteProduct,
      (item) => item?._id === product?._id
    );
    setExistingProduct(availableItem || null);
  }, [product, favoriteProduct]);

  const handleFavorite = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    if (product?._id) {
      addToFavorite(product).then(() => {
        toast.success(
          existingProduct ? "Removed from wishlist" : "Added to wishlist",
          {
            description: existingProduct
              ? "Product removed successfully!"
              : "Product added successfully!",
            duration: 3000,
          }
        );
      });
    }
  };
  return (
    <div className={cn("absolute top-2 right-2 flex flex-col gap-2", className)}>
      <div
        onClick={handleFavorite}
        className={`p-2.5 rounded-full hover:bg-brand-black-strong/80 hover:text-white hoverEffect ${existingProduct ? "bg-brand-black-strong/80 text-white" : "bg-product-bg"}`}
      >
        <Heart size={15} />
      </div>
      <ShareButton
        url={shareUrl}
        title={product?.name || "Product"}
        ariaLabel={`Share ${product?.name || "product"}`}
        iconOnly
        size="icon"
        variant="ghost"
        className="rounded-full bg-product-bg text-brand-black-strong/80 hover:bg-brand-black-strong/80 hover:text-white hoverEffect"
      />
    </div>
  );
};

export default ProductSideMenu;
