"use client";

import "@/app/i18n";
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import AddToCartButton from "./AddToCartButton";
import FavoriteButton from "./FavoriteButton";
import PriceView from "./PriceView";
import { useDealerPricing } from "@/lib/hooks/useDealerPricing";
import {
  resolveActiveDeal,
  resolveDealOriginalPrice,
  resolveDealPercent,
  resolveDealPrice,
} from "@/lib/deals";
import { useTranslation } from "react-i18next";

interface RelatedProductsProps {
  currentProduct: Product;
  relatedProducts: Product[];
}

const RelatedProducts = memo(({ relatedProducts }: RelatedProductsProps) => {
  const { t } = useTranslation();
  const useDealerPrice = useDealerPricing();
  // If no related products found, return null
  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-brand-black-strong mb-2">
          {t("client.productPage.related.title", {
            defaultValue: "You Might Also Like",
          })}
        </h2>
        <p className="text-gray-600">
          {t("client.productPage.related.subtitle", {
            defaultValue: "Similar products from the same category",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product: Product) => {
          const imageUrl = product?.images?.[0]
            ? urlFor(product.images[0]).url()
            : null;
          const dealerPrice = (product as { dealerPrice?: number | null })
            ?.dealerPrice;
          const effectivePrice =
            useDealerPrice && typeof dealerPrice === "number"
              ? dealerPrice
              : product?.price ?? 0;
          const activeDeal = resolveActiveDeal(product);
          const dealPrice = resolveDealPrice(activeDeal, product?.price ?? 0);
          const dealOriginalPrice = resolveDealOriginalPrice(activeDeal, product?.price ?? 0);
          const dealPercent = resolveDealPercent(activeDeal, dealOriginalPrice, dealPrice);
          const showDeal = Boolean(activeDeal && typeof dealPrice === "number");
          const discountRate = product?.discount ?? 0;
          const isInStock = (product?.stock || 0) > 0;

          return (
            <Card
              key={product._id}
              className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-brand-text-main/30"
            >
              <CardContent className="p-4">
                {/* Product Image */}
                <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={
                        product?.name ||
                        t("client.productPage.related.imageAlt", {
                          defaultValue: "Product image",
                        })
                      }
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {t("client.productPage.related.imageAlt", {
                          defaultValue: "Product image",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {showDeal ? (
                    <Badge
                      className="absolute top-2 left-2 bg-brand-red-accent text-white hover:bg-brand-red-accent/90"
                      style={
                        activeDeal?.badgeColor
                          ? {
                              backgroundColor: activeDeal.badgeColor,
                              borderColor: activeDeal.badgeColor,
                              color: "#fff",
                            }
                          : undefined
                      }
                    >
                      {activeDeal?.badge ||
                        (typeof dealPercent === "number"
                          ? `-${dealPercent}%`
                          : t("client.productPage.deal.badge", { defaultValue: "Deal" }))}
                    </Badge>
                  ) : product?.discount && product.discount > 0 ? (
                    <Badge className="absolute top-2 left-2 bg-brand-red-accent text-white hover:bg-brand-red-accent/90">
                      -{product.discount}%
                    </Badge>
                  ) : null}

                  {/* Stock Badge */}
                  {!isInStock && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white hover:bg-red-600">
                      {t("client.productPage.stock.out", {
                        defaultValue: "Out of Stock",
                      })}
                    </Badge>
                  )}

                  {/* Quick Actions */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 rounded-full p-1 hover:bg-white transition-colors">
                      <FavoriteButton product={product} />
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <Link
                    href={`/products/${product?.slug?.current}`}
                    className="block hover:text-brand-text-main transition-colors"
                  >
                    <h3 className="font-semibold text-brand-black-strong line-clamp-2 text-sm">
                      {product?.name}
                    </h3>
                  </Link>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, index) => (
                        <StarIcon
                          key={index}
                          size={12}
                          className={`${
                            index < 4
                              ? "text-brand-text-main fill-brand-text-main"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">(4.0)</span>
                  </div>

                  {/* Price */}
                  <PriceView
                    price={showDeal ? dealPrice ?? effectivePrice : effectivePrice}
                    originalPrice={showDeal ? dealOriginalPrice : undefined}
                    discount={showDeal ? undefined : discountRate}
                    className="text-lg font-bold text-brand-black-strong"
                  />

                  {/* Add to Cart Button */}
                  <AddToCartButton
                    product={product}
                    className="w-full mt-3 bg-brand-black-strong hover:bg-brand-text-main text-white text-sm py-2 rounded-md"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View More Button */}
      <div className="text-center mt-8">
        <Button
          variant="outline"
          className="border-brand-black-strong text-brand-black-strong hover:bg-brand-black-strong hover:text-white"
          asChild
        >
          <Link href="/shop">
            {t("client.productPage.related.viewMore", {
              defaultValue: "View More Products",
            })}
          </Link>
        </Button>
      </div>
    </div>
  );
});

RelatedProducts.displayName = "RelatedProducts";

export default RelatedProducts;
