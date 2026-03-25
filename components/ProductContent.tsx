"use client";
import "@/app/i18n";
import AddToCartButton from "@/components/AddToCartButton";
import Container from "@/components/Container";
import FavoriteButton from "@/components/FavoriteButton";
import ImageView from "@/components/common/ImageView";
import PriceView from "@/components/PriceView";
import ProductCharacteristics from "@/components/ProductCharacteristics";
import ProductsDetails from "@/components/ProductsDetails";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import ProductSpecs from "@/components/ProductSpecs";
import ProductReviews from "@/components/ProductReviews";
import InsightCard, {
  type InsightCardProps,
} from "@/components/insight/InsightCard";
import { PersonalizedOffers } from "@/components/promotions/PersonalizedOffers";
import { OffersSkeleton } from "@/components/promotions/OffersSkeleton";
import { trackProductView } from "@/lib/analytics";

import { Product } from "@/sanity.types";
import {
  CornerDownLeft,
  StarIcon,
  Truck,
  Shield,
  RefreshCw,
} from "lucide-react";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaRegQuestionCircle } from "react-icons/fa";
import { FiShare2 } from "react-icons/fi";
import { RxBorderSplit } from "react-icons/rx";
import { TbTruckDelivery } from "react-icons/tb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@clerk/nextjs";
import DealCountdown from "@/components/DealCountdown";
import {
  ProductAnimationWrapper,
  ProductImageWrapper,
  ProductDetailsWrapper,
  ProductActionWrapper,
  ProductSectionWrapper,
} from "@/components/ProductClientWrapper";
import RelatedProducts from "./RelatedProducts";
import {
  resolveActiveDeal,
  resolveDealOriginalPrice,
  resolveDealPercent,
  resolveDealPrice,
} from "@/lib/deals";
import { useTranslation } from "react-i18next";

type CategoryTrailItem = { title: string; slug?: string; isParent?: boolean };
type PriceOption = {
  id: string;
  label: string;
  price: number;
  dealerPrice?: number | null;
  isDefault?: boolean;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);

const SOLUTION_INSIGHT_TYPES = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

interface ProductContentProps {
  product: Product;
  relatedProducts: Product[];
  brand: any[] | null;
  categoryTrail?: CategoryTrailItem[];
}

const ProductContent = ({
  product,
  relatedProducts,
  brand,
  categoryTrail = [],
}: ProductContentProps) => {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [useDealerPrice, setUseDealerPrice] = useState(false);
  const [productInsights, setProductInsights] = useState<
    InsightCardProps["insight"][]
  >([]);

  // Get actual review data from product
  const averageRating = product?.averageRating || 0;
  const totalReviews = product?.totalReviews || 0;
  const primaryCategoryId = product?.categories?.[0]?._ref;

  // Track product view on component mount
  useEffect(() => {
    if (product) {
      trackProductView({
        productId: product._id,
        name: product.name || t("client.productPage.fallback.unknown", { defaultValue: "Unknown" }),
      });
    }
  }, [product]);

  useEffect(() => {
    let abort = false;
    const resolvePricingMode = async () => {
      if (!isSignedIn) {
        setUseDealerPrice(false);
        return;
      }
      try {
        const response = await fetch("/api/user/status");
        if (!response.ok) {
          setUseDealerPrice(false);
          return;
        }
        const data = await response.json();
        if (abort) return;
        const profile = data?.userProfile;
        const isDealer =
          profile?.isBusiness === true ||
          profile?.businessStatus === "active" ||
          profile?.membershipType === "business";
        setUseDealerPrice(Boolean(isDealer));
      } catch (error) {
        console.error("Unable to resolve pricing mode:", error);
        if (!abort) {
          setUseDealerPrice(false);
        }
      }
    };
    resolvePricingMode();
    return () => {
      abort = true;
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!product?._id) {
      setProductInsights([]);
      return;
    }
    let abort = false;

    const fetchInsights = async () => {
      try {
        const response = await fetch(
          `/api/insights/by-product?productId=${encodeURIComponent(
            product._id
          )}`
        );
        if (!response.ok) {
          if (!abort) {
            setProductInsights([]);
          }
          return;
        }
        const data = await response.json();
        if (abort) return;
        const insights = Array.isArray(data?.insights) ? data.insights : [];
        setProductInsights(insights);
      } catch (error) {
        console.error("Unable to load product insights:", error);
        if (!abort) {
          setProductInsights([]);
        }
      }
    };

    fetchInsights();
    return () => {
      abort = true;
    };
  }, [product?._id]);

  const baseDealerPrice = (product as any)?.dealerPrice ?? null;
  const markupPercent = (product as any)?.userMarkupPercent ?? 30;
  const baseUserPrice = typeof product?.price === "number" ? product.price : null;
  const dealerRatio =
    baseUserPrice && baseDealerPrice !== null && baseUserPrice > 0
      ? baseDealerPrice / baseUserPrice
      : null;

  const priceOptions = useMemo<PriceOption[]>(() => {
    const rawOptions = (product as any)?.priceOptions;
    if (!Array.isArray(rawOptions)) return [];
    return rawOptions
      .map((option: any, index: number) => {
        const price = typeof option?.price === "number" ? option.price : null;
        if (price === null) return null;
        const id =
          option?._key ?? option?.id ?? option?.label ?? `option-${index + 1}`;
        const label = option?.label ?? option?.name ?? `Option ${index + 1}`;
        const dealerPrice =
          typeof option?.dealerPrice === "number"
            ? option.dealerPrice
            : dealerRatio !== null
              ? Number((price * dealerRatio).toFixed(2))
              : null;
        return {
          id,
          label,
          price,
          dealerPrice,
          isDefault: option?.isDefault === true,
        } as PriceOption;
      })
      .filter(Boolean) as PriceOption[];
  }, [product, dealerRatio]);

  const defaultPriceOption =
    priceOptions.find((option) => option.isDefault) ?? priceOptions[0] ?? null;
  const [selectedPriceOptionId, setSelectedPriceOptionId] = useState(
    defaultPriceOption?.id ?? ""
  );

  useEffect(() => {
    setSelectedPriceOptionId(defaultPriceOption?.id ?? "");
  }, [defaultPriceOption?.id]);

  const selectedPriceOption =
    priceOptions.find((option) => option.id === selectedPriceOptionId) ??
    defaultPriceOption ??
    null;

  const basePrice =
    typeof selectedPriceOption?.price === "number"
      ? selectedPriceOption.price
      : product?.price ?? 0;
  const selectedDealerPrice =
    typeof selectedPriceOption?.dealerPrice === "number"
      ? selectedPriceOption.dealerPrice
      : baseDealerPrice;

  const activeDeal = resolveActiveDeal(product as any);
  const dealPrice = resolveDealPrice(activeDeal, basePrice);
  const dealOriginalPrice = resolveDealOriginalPrice(activeDeal, basePrice);
  const dealPercent = resolveDealPercent(activeDeal, dealOriginalPrice, dealPrice);
  const showDeal = Boolean(activeDeal && typeof dealPrice === "number");

  const publicPriceFromDealer =
    selectedDealerPrice !== null
      ? selectedDealerPrice * (1 + markupPercent / 100)
      : null;
  const effectivePrice = showDeal
    ? dealPrice ?? basePrice
    : useDealerPrice && selectedDealerPrice !== null
      ? selectedDealerPrice
      : basePrice;

  const breadcrumbItems =
    categoryTrail.length > 0
      ? categoryTrail.map((item) => ({
          label: item.title,
          href: item.slug ? `/products/${item.slug}` : undefined,
        }))
      : [];
  const relatedInsights = productInsights
    .filter((insight) => !SOLUTION_INSIGHT_TYPES.has(insight.insightType))
    .slice(0, 3);
  const relatedSolutions = productInsights
    .filter((insight) => SOLUTION_INSIGHT_TYPES.has(insight.insightType))
    .slice(0, 3);

  return (
    <ProductAnimationWrapper>
      <Container>
        {/* Breadcrumb Navigation */}
        <DynamicBreadcrumb
          customItems={[
            ...breadcrumbItems,
            { label: product?.name || t("client.productPage.fallback.product", { defaultValue: "Product" }), href: undefined },
          ]}
        />

        <div className="flex flex-col md:flex-row gap-10 pb-6">
          {/* Product Images */}
          {product?.images && (
            <ProductImageWrapper>
              <ImageView images={product?.images} isStock={product?.stock} />
            </ProductImageWrapper>
          )}

          {/* Product Details */}
          <ProductDetailsWrapper>
            {/* Title and Category */}
            <div className="space-y-3">
              {product?.brand && (
                <Badge className="bg-brand-text-main/10 text-brand-black-strong hover:bg-brand-text-main/20 w-fit">
                  {brand && brand.length > 0 && (
                    <span className="font-semibold tracking-wide">
                      {brand[0]?.brandName}
                    </span>
                  )}
                </Badge>
              )}
              <h1 className="text-3xl lg:text-4xl font-bold text-brand-black-strong leading-tight">
                {product?.name}
              </h1>
              {categoryTrail.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {categoryTrail.map((item) => (
                    <Link
                      key={`${item.slug || item.title}-trail`}
                      href={item.slug ? `/products/${item.slug}` : "/products"}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-text-main bg-brand-text-main/10 px-2 py-1 rounded-full hover:bg-brand-text-main/20 transition-colors"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
              <p className="text-lg text-brand-black-strong leading-relaxed">
                {product?.description}
              </p>

              {/* Enhanced Rating Display */}
              {totalReviews > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, index) => (
                      <StarIcon
                        key={index}
                        size={16}
                        className={`${
                          index < Math.floor(averageRating)
                            ? "text-brand-text-main fill-brand-text-main"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-brand-black-strong">
                    {averageRating.toFixed(1)} ({totalReviews}{" "}
                    {totalReviews === 1
                      ? t("client.productPage.reviews.single", { defaultValue: "review" })
                      : t("client.productPage.reviews.plural", { defaultValue: "reviews" })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, index) => (
                      <StarIcon
                        key={index}
                        size={16}
                        className="text-gray-300"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    {t("client.productPage.reviews.none", { defaultValue: "No reviews yet" })}
                  </span>
                </div>
              )}
            </div>

            {/* Pricing Section */}
            <div className="space-y-4 border-t border-b border-gray-200 py-6 bg-white/70 rounded-lg px-4">
              {showDeal ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="border border-brand-black-strong/40 bg-white/90 text-brand-black-strong"
                    style={
                      activeDeal?.badgeColor
                        ? { backgroundColor: activeDeal.badgeColor, color: "#fff", borderColor: activeDeal.badgeColor }
                        : undefined
                    }
                  >
                    {activeDeal?.badge ||
                      t("client.productPage.deal.badge", { defaultValue: "Deal" })}
                  </Badge>
                  {typeof dealPercent === "number" && dealPercent > 0 ? (
                    <Badge variant="destructive">-{dealPercent}%</Badge>
                  ) : null}
                </div>
              ) : null}
              <PriceView
                price={effectivePrice}
                originalPrice={showDeal ? dealOriginalPrice : undefined}
                discount={showDeal ? undefined : product?.discount}
                className="text-2xl font-bold"
              />
              {priceOptions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("client.productPage.price.selectLabel", {
                      defaultValue: "Select price option",
                    })}
                  </p>
                  <Select
                    value={selectedPriceOptionId}
                    onValueChange={setSelectedPriceOptionId}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue
                        placeholder={t("client.productPage.price.selectPlaceholder", {
                          defaultValue: "Select an option",
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {priceOptions.map((option) => {
                        const displayPrice =
                          useDealerPrice && typeof option.dealerPrice === "number"
                            ? option.dealerPrice
                            : option.price;
                        return (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label} — {formatCurrency(displayPrice)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {!showDeal && useDealerPrice && selectedDealerPrice !== null && (
                <p className="text-sm text-green-700">
                  {t("client.productPage.price.dealerApplied", {
                    defaultValue: "Dealer pricing applied (standard price would be ${{price}}).",
                    price: publicPriceFromDealer?.toFixed(2),
                  })}
                </p>
              )}

              {/* Enhanced Stock Status */}
              <div className="flex items-center gap-3">
                <Badge
                  className={`text-sm font-semibold ${
                    product?.stock === 0
                      ? "bg-red-100 text-red-700 hover:bg-red-100"
                      : product?.stock && product.stock < 10
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                      : "bg-success-highlight text-success-base hover:bg-success-highlight"
                  }`}
                >
                  {product?.stock === 0
                    ? t("client.productPage.stock.out", { defaultValue: "Out of Stock" })
                    : product?.stock && product.stock < 10
                    ? t("client.productPage.stock.low", {
                        defaultValue: "Only {{count}} left!",
                        count: product.stock,
                      })
                    : t("client.productPage.stock.in", { defaultValue: "In Stock" })}
                </Badge>
              </div>

              {/* Discount Information */}
              {!showDeal && product?.discount && product.discount > 0 && (
                <div className="bg-brand-red-accent/10 text-brand-red-accent px-3 py-2 rounded-lg text-sm font-medium">
                  {t("client.productPage.discount.save", {
                    defaultValue: "Save {{discount}}% on this item!",
                    discount: product.discount,
                  })}
                </div>
              )}

              {showDeal && activeDeal?.endDate ? (
                <DealCountdown
                  targetDate={activeDeal.endDate}
                  label={t("client.productPage.deal.endsIn", {
                    defaultValue: "Deal ends in",
                  })}
                  className="pt-2"
                />
              ) : null}
            </div>

            {/* Action Buttons */}
            <ProductActionWrapper delay={0.3}>
              <div className="flex flex-col gap-3">
                <Suspense fallback={<OffersSkeleton variant="strip" />}>
                  <PersonalizedOffers
                    context="pdp"
                    productId={product._id}
                    productCategory={primaryCategoryId}
                    productPrice={basePrice}
                    variant="strip"
                    maxOffers={1}
                  />
                </Suspense>

                <div className="flex items-center gap-2.5 lg:gap-5">
                  <AddToCartButton product={product} priceOption={selectedPriceOption} />
                  <FavoriteButton showProduct={true} product={product} />
                </div>

                <Suspense fallback={<OffersSkeleton variant="card" />}>
                  <PersonalizedOffers
                    context="pdp"
                    productId={product._id}
                    productCategory={primaryCategoryId}
                    productPrice={basePrice}
                    variant="card"
                    maxOffers={2}
                    className="mt-1"
                  />
                </Suspense>
              </div>
            </ProductActionWrapper>

            {/* Product Characteristics */}
            <ProductActionWrapper delay={0.4}>
              <ProductCharacteristics product={product} brand={brand} />
            </ProductActionWrapper>

            {/* Action Links */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-b-gray-200 py-5 -mt-2">
              <button className="flex items-center gap-2 text-sm text-black hover:text-brand-text-main hoverEffect transition-colors">
                <RxBorderSplit className="text-lg" />
                <span>{t("client.productPage.actions.compare", { defaultValue: "Compare color" })}</span>
              </button>
              <button className="flex items-center gap-2 text-sm text-black hover:text-brand-text-main hoverEffect transition-colors">
                <FaRegQuestionCircle className="text-lg" />
                <span>{t("client.productPage.actions.ask", { defaultValue: "Ask a question" })}</span>
              </button>
              <button className="flex items-center gap-2 text-sm text-black hover:text-brand-text-main hoverEffect transition-colors">
                <TbTruckDelivery className="text-lg" />
                <span>{t("client.productPage.actions.deliveryReturn", { defaultValue: "Delivery & Return" })}</span>
              </button>
              <button className="flex items-center gap-2 text-sm text-black hover:text-brand-text-main hoverEffect transition-colors">
                <FiShare2 className="text-lg" />
                <span>{t("client.productPage.actions.share", { defaultValue: "Share" })}</span>
              </button>
            </div>

            {/* Delivery Information */}
            <ProductActionWrapper delay={0.5}>
              <div className="flex flex-col">
                <div className="border border-brand-text-muted/25 border-b-0 p-4 flex items-center gap-3 bg-white/70 rounded-t-lg">
                  <Truck size={32} className="text-brand-red-accent" />
                  <div>
                    <p className="text-lg font-semibold text-black">
                      {t("client.productPage.delivery.freeTitle", {
                        defaultValue: "Free Delivery",
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("client.productPage.delivery.freeBody", {
                        defaultValue: "Enter your Postal code for Delivery Availability.",
                      })}{" "}
                      <button className="underline underline-offset-2 hover:text-brand-text-main transition-colors">
                        {t("client.productPage.delivery.checkNow", {
                          defaultValue: "Check now",
                        })}
                      </button>
                    </p>
                  </div>
                </div>
                <div className="border border-brand-text-muted/25 p-4 flex items-center gap-3 bg-white/70 rounded-b-lg">
                  <CornerDownLeft size={32} className="text-brand-red-accent" />
                  <div>
                    <p className="text-lg font-semibold text-black">
                      {t("client.productPage.delivery.returnTitle", {
                        defaultValue: "Return Delivery",
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("client.productPage.delivery.returnBody", {
                        defaultValue: "Free 30 days Delivery Returns.",
                      })}{" "}
                      <button className="underline underline-offset-2 hover:text-brand-text-main transition-colors">
                        {t("client.productPage.delivery.details", {
                          defaultValue: "Details",
                        })}
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </ProductActionWrapper>
          </ProductDetailsWrapper>
        </div>

        {/* Product Details Section */}
        <ProductSectionWrapper delay={0.6}>
          <ProductsDetails product={product} />
        </ProductSectionWrapper>

        {/* Trust Indicators & Guarantees */}
        <ProductSectionWrapper delay={0.7}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
            <Card className="border-2 border-gray-100 text-center p-4">
              <Shield className="h-8 w-8 text-brand-red-accent mx-auto mb-2" />
              <h3 className="font-semibold text-brand-black-strong mb-1">
                {t("client.productPage.trust.secure.title", {
                  defaultValue: "Secure Payment",
                })}
              </h3>
              <p className="text-sm text-gray-600">
                {t("client.productPage.trust.secure.body", {
                  defaultValue: "100% secure payment with SSL encryption",
                })}
              </p>
            </Card>

            <Card className="border-2 border-gray-100 text-center p-4">
              <Truck className="h-8 w-8 text-brand-red-accent mx-auto mb-2" />
              <h3 className="font-semibold text-brand-black-strong mb-1">
                {t("client.productPage.trust.fast.title", {
                  defaultValue: "Fast Delivery",
                })}
              </h3>
              <p className="text-sm text-gray-600">
                {t("client.productPage.trust.fast.body", {
                  defaultValue: "Free shipping on orders over $50",
                })}
              </p>
            </Card>

            <Card className="border-2 border-gray-100 text-center p-4">
              <RefreshCw className="h-8 w-8 text-brand-red-accent mx-auto mb-2" />
              <h3 className="font-semibold text-brand-black-strong mb-1">
                {t("client.productPage.trust.returns.title", {
                  defaultValue: "Easy Returns",
                })}
              </h3>
              <p className="text-sm text-gray-600">
                {t("client.productPage.trust.returns.body", {
                  defaultValue: "30-day hassle-free returns",
                })}
              </p>
            </Card>
          </div>
        </ProductSectionWrapper>

        {/* Product Specifications */}
        <ProductSectionWrapper delay={0.8}>
          <ProductSpecs product={product} brand={brand} />
        </ProductSectionWrapper>

        {(relatedInsights.length > 0 || relatedSolutions.length > 0) && (
          <ProductSectionWrapper delay={0.85}>
            <div className="space-y-10 py-8">
              {relatedInsights.length > 0 && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-brand-text-main/70">
                        {t("client.productPage.insights.relatedLabel", {
                          defaultValue: "Related Insights",
                        })}
                      </p>
                      <h2 className="text-2xl font-bold text-brand-black-strong">
                        {t("client.productPage.insights.relatedTitle", {
                          defaultValue: "Learn More About This Product",
                        })}
                      </h2>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="border-brand-black-strong text-brand-black-strong hover:bg-brand-black-strong hover:text-white"
                    >
                      <Link href="/insight/knowledge">
                        {t("client.productPage.insights.relatedCta", {
                          defaultValue: "View all related articles",
                        })}
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relatedInsights.map((insight, index) => (
                      <InsightCard
                        key={insight?._id || index}
                        insight={insight}
                        variant="compact"
                      />
                    ))}
                  </div>
                </section>
              )}

              {relatedSolutions.length > 0 && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-brand-text-main/70">
                        {t("client.productPage.insights.solutionsLabel", {
                          defaultValue: "Solutions & Case Studies",
                        })}
                      </p>
                      <h2 className="text-2xl font-bold text-brand-black-strong">
                        {t("client.productPage.insights.solutionsTitle", {
                          defaultValue: "See This Product in Action",
                        })}
                      </h2>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="border-brand-black-strong text-brand-black-strong hover:bg-brand-black-strong hover:text-white"
                    >
                      <Link href="/insight/solutions">
                        {t("client.productPage.insights.solutionsCta", {
                          defaultValue: "View all solutions",
                        })}
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relatedSolutions.map((insight, index) => (
                      <InsightCard
                        key={insight?._id || index}
                        insight={insight}
                        variant="solution"
                        showMetrics={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ProductSectionWrapper>
        )}

        {/* Customer Reviews */}
        <ProductSectionWrapper delay={0.9}>
          <ProductReviews
            productId={product._id}
            productName={
              product.name ||
              t("client.productPage.fallback.thisProduct", {
                defaultValue: "this product",
              })
            }
          />
        </ProductSectionWrapper>

        {/* Related Products */}
        <ProductSectionWrapper delay={1.0}>
          <RelatedProducts
            currentProduct={product}
            relatedProducts={relatedProducts}
          />
        </ProductSectionWrapper>
      </Container>
    </ProductAnimationWrapper>
  );
};

export default ProductContent;
