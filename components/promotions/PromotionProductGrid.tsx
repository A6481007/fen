import PromotionGrid from "./PromotionGrid";
import type { PROMOTION_BY_SLUG_QUERYResult } from "@/sanity.types";

type Promotion = NonNullable<PROMOTION_BY_SLUG_QUERYResult>;
type PromotionProduct = NonNullable<Promotion["products"]>[number];

interface PromotionProductGridProps {
  products: PromotionProduct[];
  promotion: Promotion;
  className?: string;
}

export function PromotionProductGrid({ products, promotion, className }: PromotionProductGridProps) {
  return (
    <PromotionGrid
      products={products}
      variant="products"
      campaignId={promotion.campaignId || promotion._id}
      discountType={promotion.discountType}
      discountValue={promotion.discountValue}
      className={className}
    />
  );
}

export default PromotionProductGrid;
