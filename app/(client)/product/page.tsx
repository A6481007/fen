import ProductPageClient from "@/app/(client)/product/ProductPageClient";
import { getCategories, getAllBrands } from "@/sanity/queries";

const ProductPage = async () => {
  const [categories, brands] = await Promise.all([getCategories(), getAllBrands()]);

  return (
    <ProductPageClient
      products={[]}
      categories={categories ?? []}
      brands={brands ?? []}
    />
  );
};

export default ProductPage;
