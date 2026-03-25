"use client";

import Shop from "@/components/shopPage/Shop";
import type { Brand, Category, Product } from "@/sanity.types";

type ProductPageClientProps = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
};

const ProductPageClient = ({ products, categories, brands }: ProductPageClientProps) => {
  return <Shop categories={categories} brands={brands} initialProducts={products} />;
};

export default ProductPageClient;
