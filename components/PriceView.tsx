import PriceFormatter from "./PriceFormatter";
import { cn } from "@/lib/utils";

interface Props {
  price: number | undefined;
  discount: number | undefined;
  originalPrice?: number | null;
  className?: string;
}

const PriceView = ({ price, discount, originalPrice, className }: Props) => {
  // Current/payable price is the actual price (discounted price)
  const currentPrice = price || 0;

  const hasOriginal =
    typeof originalPrice === "number" &&
    Number.isFinite(originalPrice) &&
    originalPrice > currentPrice;

  if (hasOriginal) {
    const percentOff =
      originalPrice > 0
        ? Math.max(0, Math.round(((originalPrice - currentPrice) / originalPrice) * 100))
        : 0;

    return (
      <div className="flex items-center justify-between gap-5">
        <div className="flex items-center gap-2">
          <PriceFormatter
            amount={currentPrice}
            className={cn("text-brand-black-strong font-semibold", className)}
          />
          <div className="flex items-center gap-1">
            <PriceFormatter
              amount={originalPrice}
              className="line-through text-xs font-normal text-zinc-500"
            />
            {percentOff > 0 ? (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                -{percentOff}%
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Gross price = current price + discount amount
  const discountAmount =
    discount && currentPrice ? (discount * currentPrice) / 100 : 0;
  const grossPrice = currentPrice + discountAmount;

  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex items-center gap-2">
        {/* Current/Payable Price (discounted price) */}
        <PriceFormatter
          amount={currentPrice}
          className={cn("text-brand-black-strong font-semibold", className)}
        />

        {/* Gross Price (original price before discount) - only show if there's a discount */}
        {discount && discountAmount > 0 && (
          <div className="flex items-center gap-1">
            <PriceFormatter
              amount={grossPrice}
              className="line-through text-xs font-normal text-zinc-500"
            />
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
              -{discount}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceView;
