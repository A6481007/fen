"use client";

import { memo, useMemo } from "react";
import { Product } from "@/sanity.types";
import PriceView from "./PriceView";
import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import Title from "./Title";
import { StarIcon } from "@sanity/icons";
import ProductSideMenu from "./ProductSideMenu";
import { Flame } from "lucide-react";
import { image } from "@/sanity/image";
import { useDealerPricing } from "@/lib/hooks/useDealerPricing";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { buildProductPath } from "@/lib/paths";
import {
  resolveActiveDeal,
  resolveDealOriginalPrice,
  resolveDealPercent,
  resolveDealPrice,
} from "@/lib/deals";

const ProductCard = memo(({ product }: { product: Product }) => {
  const { t } = useTranslation();
  const useDealerPrice = useDealerPricing();
  const activeDeal = resolveActiveDeal(product as any);
  const dealPrice = resolveDealPrice(activeDeal, product?.price ?? 0);
  const dealOriginalPrice = resolveDealOriginalPrice(activeDeal, product?.price ?? 0);
  const dealPercent = resolveDealPercent(activeDeal, dealOriginalPrice, dealPrice);
  const showDeal = Boolean(activeDeal && typeof dealPrice === "number");
  const effectivePrice = useMemo(() => {
    const dealerPrice = (product as { dealerPrice?: number | null })?.dealerPrice;
    if (useDealerPrice && typeof dealerPrice === "number") {
      return dealerPrice;
    }
    return product?.price ?? 0;
  }, [product, useDealerPrice]);
  const isFeatured = Boolean((product as any)?.isFeatured || (product as any)?.featured);
  const productHref = buildProductPath(product);

  return (
    <div className="text-sm border rounded-md border-dark-blue/20 group bg-white overflow-hidden">
      <div className="relative group overflow-hidden bg-brand-background-subtle aspect-square">
        {product?.images && (
          <Link href={productHref} className="block h-full w-full">
            <div className="flex h-full w-full items-center justify-center p-2">
              <img
                src={image(product.images[0])
                  .width(900)
                  .height(900)
                  .fit("max")
                  .auto("format")
                  .url()}
                className={`max-h-full max-w-full object-contain duration-500 ${
                  product?.stock !== 0 ? "opacity-100" : "opacity-50"
                }`}
                alt={product?.name ?? "product image"}
                loading="lazy"
              />
            </div>
            {/* <Image
              src={urlFor(product.images[0]).url()}
              alt="productImage"
              width={500}
              height={500}
              priority
              className={`h-full w-full object-contain overflow-hidden transition-transform bg-brand-background-subtle duration-500 
              ${product?.stock !== 0 ? "opacity-100" : "opacity-50"}`}
            /> */}
          </Link>
        )}
        <ProductSideMenu product={product} />
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-2">
          {isFeatured && (
            <Badge variant="accent" className="shadow-sm">
              {t("client.products.card.featured", { defaultValue: "Featured" })}
            </Badge>
          )}
          {showDeal ? (
            <Badge
              className="border border-brand-black-strong/40 bg-white/90 text-brand-black-strong shadow-sm"
              style={
                activeDeal?.badgeColor
                  ? { backgroundColor: activeDeal.badgeColor, color: "#fff", borderColor: activeDeal.badgeColor }
                  : undefined
              }
            >
              {activeDeal?.badge || "Deal"}
            </Badge>
          ) : product?.status === "sale" ? (
            <p className="text-xs border border-brand-black-strong/50 px-2 rounded-full group-hover:border-success-base hover:text-brand-black-strong hoverEffect">
              Sale!
            </p>
          ) : product?.status === "hot" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-red-accent/50 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-brand-red-accent">
              <Flame size={14} className="text-brand-red-accent" /> Hot
            </span>
          ) : null}
          {showDeal && typeof dealPercent === "number" && dealPercent > 0 ? (
            <Badge variant="destructive" className="text-xs shadow-sm">
              -{dealPercent}%
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {product?.categories && (
          <p className="uppercase line-clamp-1 text-xs font-medium text-brand-text-muted">
            {product.categories
              .map((cat) =>
                typeof cat === "string"
                  ? cat
                  : typeof cat === "object"
                  ? (cat as any)?.title
                  : ""
              )
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        <Title className="text-sm line-clamp-1">{product?.name}</Title>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, index) => (
              <StarIcon
                key={index}
                className={
                  index < Math.round(product?.averageRating || 0)
                    ? "text-brand-text-main"
                    : " text-brand-text-muted"
                }
                fill={
                  index < Math.round(product?.averageRating || 0)
                    ? "#93D991"
                    : "#ababab"
                }
              />
            ))}
          </div>
          <p className="text-brand-text-muted text-xs tracking-wide">
            {product?.totalReviews
              ? `${product.totalReviews} ${
                  product.totalReviews === 1 ? "Review" : "Reviews"
                }`
              : "No Reviews"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="font-medium">In Stock</p>
          <p
            className={`${
              product?.stock === 0
                ? "text-red-600"
                : "text-brand-black-strong/80 font-semibold"
            }`}
          >
            {(product?.stock as number) > 0 ? product?.stock : "unavailable"}
          </p>
        </div>

        <PriceView
          price={showDeal ? dealPrice ?? effectivePrice : effectivePrice}
          originalPrice={showDeal ? dealOriginalPrice : undefined}
          discount={showDeal ? undefined : product?.discount}
          className="text-sm"
        />
        <AddToCartButton product={product} className="w-36 rounded-full" />
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
