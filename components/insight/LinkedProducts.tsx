"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import AddToCartButton from "@/components/AddToCartButton";
import PriceView from "@/components/PriceView";
import Title from "@/components/Title";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { image } from "@/sanity/image";
import type { Product } from "@/sanity.types";
import { buildProductPath } from "@/lib/paths";

export interface LinkedProductsProps {
  products: Array<{
    _id: string;
    name: string;
    slug: { current: string };
    images?: any[];
    price: number;
    dealerPrice?: number;
    discount?: number;
    stock: number;
    description?: string;
    brand?: { title: string; slug?: { current: string } };
  }>;
  title?: string;
  variant?: "grid" | "carousel" | "compact";
  showAddToCart?: boolean;
}

type LinkedProduct = LinkedProductsProps["products"][number];

const FALLBACK_IMAGE = "/images/catalog-placeholder.png";

const useDealerPricing = () => {
  const { isSignedIn } = useUser();
  const [useDealerPrice, setUseDealerPrice] = useState(false);

  useEffect(() => {
    let abort = false;
    const resolvePricing = async () => {
      if (!isSignedIn) {
        setUseDealerPrice(false);
        return;
      }
      try {
        const response = await fetch("/api/user/status", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
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
    resolvePricing();
    return () => {
      abort = true;
    };
  }, [isSignedIn]);

  return useDealerPrice;
};

const getStockCount = (product: LinkedProduct) => {
  const stock = Number.isFinite(product.stock) ? product.stock : 0;
  return Math.max(0, Math.floor(stock));
};

const getProductHref = (product: LinkedProduct) => {
  return buildProductPath(product);
};

const getImageUrl = (product: LinkedProduct) => {
  const source = product.images?.[0];
  if (!source) return FALLBACK_IMAGE;
  try {
    return image(source).size(800, 800).url();
  } catch (error) {
    console.error("Unable to build product image url:", error);
    return FALLBACK_IMAGE;
  }
};

const getEffectivePrice = (product: LinkedProduct, useDealerPrice: boolean) => {
  if (useDealerPrice && typeof product.dealerPrice === "number") {
    return product.dealerPrice;
  }
  return typeof product.price === "number" ? product.price : 0;
};

const toCartProduct = (product: LinkedProduct): Product => ({
  _id: product._id,
  _type: "product",
  _createdAt: "",
  _updatedAt: "",
  _rev: "",
  name: product.name,
  slug: product.slug?.current
    ? { _type: "slug", current: product.slug.current }
    : undefined,
  description: product.description,
  price: product.price,
  dealerPrice: product.dealerPrice,
  discount: product.discount,
  stock: product.stock,
});

const StockIndicator = ({
  stock,
  className,
}: {
  stock: number;
  className?: string;
}) => {
  const isOutOfStock = stock <= 0;
  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isOutOfStock ? "bg-red-500" : "bg-emerald-500"
        )}
      />
      <span className={cn(isOutOfStock ? "text-red-600" : "text-emerald-700")}>
        {isOutOfStock ? "Out of stock" : "In stock"}
      </span>
    </div>
  );
};

const LinkedProductCard = ({
  product,
  showAddToCart,
  useDealerPrice,
}: {
  product: LinkedProduct;
  showAddToCart: boolean;
  useDealerPrice: boolean;
}) => {
  const stock = getStockCount(product);
  const isOutOfStock = stock <= 0;
  const productHref = getProductHref(product);
  const imageUrl = getImageUrl(product);
  const effectivePrice = getEffectivePrice(product, useDealerPrice);

  return (
    <div className="text-sm border rounded-md border-dark-blue/20 group bg-white flex h-full flex-col">
      <div className="relative group overflow-hidden bg-brand-background-subtle">
        <Link href={productHref} className="block">
          <img
            src={imageUrl}
            className={cn(
              "w-full h-56 object-contain overflow-hidden transition-transform bg-brand-background-subtle duration-500",
              isOutOfStock ? "opacity-50" : "group-hover:scale-105"
            )}
            alt={product.name || "Product"}
            loading="lazy"
          />
        </Link>
      </div>
      <div className="p-3 flex flex-1 flex-col gap-2">
        <Link href={productHref} className="hover:text-brand-black-strong">
          <Title className="text-sm line-clamp-2">{product.name}</Title>
        </Link>
        <StockIndicator stock={stock} />
        <PriceView
          price={effectivePrice}
          discount={product.discount}
          className="text-sm"
        />
        {useDealerPrice && typeof product.dealerPrice === "number" ? (
          <span className="text-[10px] uppercase tracking-wide text-emerald-700">
            Dealer price
          </span>
        ) : null}
        {showAddToCart ? (
          <AddToCartButton product={toCartProduct(product)} className="w-36 rounded-full" />
        ) : null}
      </div>
    </div>
  );
};

const LinkedProductRow = ({
  product,
  showAddToCart,
  useDealerPrice,
}: {
  product: LinkedProduct;
  showAddToCart: boolean;
  useDealerPrice: boolean;
}) => {
  const stock = getStockCount(product);
  const isOutOfStock = stock <= 0;
  const productHref = getProductHref(product);
  const imageUrl = getImageUrl(product);
  const effectivePrice = getEffectivePrice(product, useDealerPrice);

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Link
          href={productHref}
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-dark-blue/10 bg-brand-background-subtle"
        >
          <img
            src={imageUrl}
            className={cn(
              "h-full w-full object-contain",
              isOutOfStock ? "opacity-50" : ""
            )}
            alt={product.name || "Product"}
            loading="lazy"
          />
        </Link>
        <div className="space-y-1">
          <Link href={productHref} className="hover:text-brand-black-strong">
            <p className="text-sm font-semibold text-brand-black-strong line-clamp-2">
              {product.name}
            </p>
          </Link>
          <StockIndicator stock={stock} />
          <PriceView
            price={effectivePrice}
            discount={product.discount}
            className="text-sm"
          />
          {useDealerPrice && typeof product.dealerPrice === "number" ? (
            <span className="text-[10px] uppercase tracking-wide text-emerald-700">
              Dealer price
            </span>
          ) : null}
        </div>
      </div>
      {showAddToCart ? (
        <div className="w-full sm:w-40">
          <AddToCartButton product={toCartProduct(product)} className="rounded-full" />
        </div>
      ) : null}
    </div>
  );
};

const LinkedProducts = ({
  products,
  title,
  variant = "grid",
  showAddToCart = true,
}: LinkedProductsProps) => {
  const useDealerPrice = useDealerPricing();
  const items = Array.isArray(products) ? products : [];
  const carouselRef = useRef<HTMLDivElement | null>(null);

  if (!items.length) {
    return null;
  }

  const handleScroll = (direction: "prev" | "next") => {
    if (!carouselRef.current) return;
    const amount =
      direction === "prev"
        ? -carouselRef.current.clientWidth
        : carouselRef.current.clientWidth;
    carouselRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (variant === "compact") {
    return (
      <section className="space-y-3">
        {title ? (
          <h3 className="text-lg font-semibold text-brand-black-strong">
            {title}
          </h3>
        ) : null}
        <div className="divide-y divide-gray-200">
          {items.map((product) => (
            <LinkedProductRow
              key={product._id}
              product={product}
              showAddToCart={showAddToCart}
              useDealerPrice={useDealerPrice}
            />
          ))}
        </div>
      </section>
    );
  }

  if (variant === "carousel") {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          {title ? (
            <h3 className="text-lg font-semibold text-brand-black-strong">
              {title}
            </h3>
          ) : (
            <span />
          )}
          <div className="hidden md:flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleScroll("prev")}
              aria-label="Scroll linked products left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleScroll("next")}
              aria-label="Scroll linked products right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {items.map((product) => (
            <div
              key={product._id}
              className="snap-start shrink-0 w-[80%] sm:w-[60%] md:w-[45%] lg:w-[25%]"
            >
              <LinkedProductCard
                product={product}
                showAddToCart={showAddToCart}
                useDealerPrice={useDealerPrice}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {title ? (
        <h3 className="text-lg font-semibold text-brand-black-strong">{title}</h3>
      ) : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((product) => (
          <LinkedProductCard
            key={product._id}
            product={product}
            showAddToCart={showAddToCart}
            useDealerPrice={useDealerPrice}
          />
        ))}
      </div>
    </section>
  );
};

export default LinkedProducts;
