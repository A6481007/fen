"use client";
import { Product } from "@/sanity.types";
import useCartStore from "@/store";
import { Heart } from "lucide-react";
import BreadcrumbLink from "@/components/BreadcrumbLink";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import isArray from "js-isarray";
import _ from "lodash";
import { trackWishlistAdd, trackWishlistRemove } from "@/lib/analytics";

const FavoriteButton = ({
  showProduct = false,
  product,
}: {
  showProduct?: boolean;
  product?: Product;
}) => {
  const { favoriteProduct, addToFavorite } = useCartStore();
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);

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
      const isRemoving = !!existingProduct;

      addToFavorite(product).then(() => {
        toast.success(
          isRemoving ? "Removed from wishlist" : "Added to wishlist",
          {
            description: isRemoving
              ? "Product removed successfully!"
              : "Product added successfully!",
            duration: 3000,
          }
        );

        // Track wishlist analytics
        if (isRemoving) {
          trackWishlistRemove({
            productId: product._id,
            name: product.name || "Unknown Product",
          });
        } else {
          trackWishlistAdd({
            productId: product._id,
            name: product.name || "Unknown Product",
          });
        }
      });
    }
  };
  return (
    <>
      {!showProduct ? (
        <BreadcrumbLink
          href={"/wishlist"}
          className="group relative hover:text-brand-text-main hoverEffect"
        >
          <Heart className="group-hover:text-brand-text-main hoverEffect mt-.5" />
          {/* {isArray(favoriteProduct) && favoriteProduct.length > 0 && ( */}
          <span
            className={`absolute -top-1 -right-1 bg-brand-red-accent text-white rounded-full text-xs font-semibold flex items-center justify-center min-w-[14px] h-[14px] ${
              favoriteProduct.length > 9 ? "px-1" : ""
            }`}
          >
            {/* {favoriteProduct.length > 9 ? "9+" : favoriteProduct.length} */}
            {isArray(favoriteProduct) && favoriteProduct.length > 0
              ? favoriteProduct.length > 9
                ? "9+"
                : favoriteProduct.length
              : 0}
          </span>
          {/* )} */}
        </BreadcrumbLink>
      ) : (
        <button
          onClick={handleFavorite}
          className="group relative hover:text-brand-text-main hoverEffect border border-brand-text-main/80 p-1.5 rounded-sm "
        >
          <Heart
            fill={existingProduct ? "#063c28" : "#fff"}
            className="text-brand-text-main/80 group-hover:text-brand-text-main hoverEffect mt-.5"
          />
        </button>
      )}
    </>
  );
};

export default FavoriteButton;
