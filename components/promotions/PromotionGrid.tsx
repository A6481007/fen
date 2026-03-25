'use client';

import { useTranslation } from "react-i18next";
import { PromotionCard } from "./PromotionCard";
import ProductCard from "@/components/ProductCard";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import "@/app/i18n";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type PromotionProduct = NonNullable<Promotion["products"]>[number];

export interface PromotionGridProps {
  // For promotion cards
  promotions?: Promotion[];

  // For product cards within a promotion
  products?: PromotionProduct[];

  // Promotion context for product display
  campaignId?: string;
  discountType?: string;
  discountValue?: number;

  // Display options
  variant?: "cards" | "products" | "compact";
  columns?: 2 | 3 | 4;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const PromotionProductCard: any = ProductCard;

export function PromotionGrid({
  promotions,
  products,
  campaignId,
  discountType,
  discountValue,
  variant = "cards",
  columns = 3,
  showLoadMore = false,
  onLoadMore,
  loading = false,
  emptyMessage,
  className = "",
}: PromotionGridProps) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage || t("client.promotions.grid.emptyMessage");
  // Column class mapping
  const columnClasses: Record<2 | 3 | 4, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`grid ${columnClasses[columns]} gap-6 ${className}`}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-xl aspect-[16/9] mb-4" />
            <div className="bg-gray-200 h-6 rounded w-3/4 mb-2" />
            <div className="bg-gray-200 h-4 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Render promotion cards
  if (variant === "cards" && promotions) {
    if (promotions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>{resolvedEmptyMessage}</p>
        </div>
      );
    }

    return (
      <div className={className}>
        <div className={`grid ${columnClasses[columns]} gap-6`}>
          {promotions.map((promo) => (
            <PromotionCard
              key={promo.campaignId || promo._id}
              promotion={promo}
              showCountdown
              showAddToCart
            />
          ))}
        </div>

        {showLoadMore && onLoadMore && (
          <div className="text-center mt-8">
            <button
              onClick={onLoadMore}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              {t("client.promotions.grid.loadMorePromotions")}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render compact promotion list
  if (variant === "compact" && promotions) {
    return (
      <div className={`space-y-2 ${className}`}>
        {promotions.map((promo) => (
          <PromotionCard
            key={promo.campaignId || promo._id}
            promotion={promo}
            variant="compact"
          />
        ))}
      </div>
    );
  }

  // Render products with promotion discount applied
  if (variant === "products" && products) {
    if (products.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>{resolvedEmptyMessage}</p>
        </div>
      );
    }

    return (
      <div className={className}>
        <div className={`grid ${columnClasses[columns]} gap-6`}>
          {products.map((product) => {
            // Calculate discounted price
            const originalPrice = typeof product.price === "number" ? product.price : 0;
            let discountedPrice = originalPrice;
            let savingsDisplay = "";

            if (discountType && discountValue) {
              if (discountType === "percentage") {
                discountedPrice = originalPrice * (1 - discountValue / 100);
                savingsDisplay = t("client.promotions.discount.percentage", { value: discountValue });
              } else if (
                discountType === "fixed" ||
                discountType === "fixed_amount" ||
                discountType === "fixedAmount"
              ) {
                discountedPrice = Math.max(0, originalPrice - discountValue);
                savingsDisplay = t("client.promotions.discount.fixed", { value: discountValue });
              }
            }

            const normalizedProduct = {
              ...product,
              slug: typeof product.slug === "string" ? { current: product.slug } : product.slug,
              categories: Array.isArray((product as any).categories)
                ? (product as any).categories
                    .map((cat: any) => cat?.title || cat?.name)
                    .filter(Boolean)
                : (product as any).category
                  ? [(product as any).category.name]
                  : undefined,
              price: discountedPrice,
              compareAtPrice: originalPrice,
            };

            return (
              <PromotionProductCard
                key={product._id}
                product={normalizedProduct}
                badge={savingsDisplay}
                campaignId={campaignId}
              />
            );
          })}
        </div>

        {showLoadMore && onLoadMore && (
          <div className="text-center mt-8">
            <button
              onClick={onLoadMore}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              {t("client.promotions.grid.loadMoreProducts")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default PromotionGrid;
