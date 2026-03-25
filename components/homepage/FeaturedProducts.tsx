"use client";

import Link from "next/link";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/sanity.types";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FeaturedProductsProps {
  products?: Product[];
}

const FeaturedProducts = ({ products = [] }: FeaturedProductsProps) => {
  const { t } = useTranslation();
  const items = Array.isArray(products) ? products.filter(Boolean) : [];
  if (!items.length) return null;

  return (
    <section className="py-12">
      <Container className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-brand-text-muted">
              {t("client.home.featuredProducts.kicker")}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-brand-black-strong">
              {t("client.home.featuredProducts.title")}
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-text-main hover:text-brand-black-strong transition-colors"
          >
            {t("client.home.featuredProducts.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.slice(0, 8).map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
};

export default FeaturedProducts;
