import type { Metadata } from "next";
import ProductPageClient from "@/app/(client)/product/ProductPageClient";
import { getAllBrands, getCategories } from "@/sanity/queries";

export const metadata: Metadata = {
  title: "Search | Product results",
  description: "Search products by name, SKU, or category to find the right item fast.",
  alternates: { canonical: "/search" },
};

const SearchPage = async () => {
  const [categories, brands] = await Promise.all([getCategories(), getAllBrands()]);

  return (
    <ProductPageClient
      products={[]}
      categories={categories ?? []}
      brands={brands ?? []}
    />
  );
};

export default SearchPage;
