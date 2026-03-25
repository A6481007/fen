import ProductsPageClient from "@/app/(client)/products/ProductsPageClient";
import HeroBanner from "@/components/HeroBanner";
import type { Category } from "@/sanity.types";
import { getCategories, getHeroBannerByPlacement } from "@/sanity/queries";

const ProductsLandingPage = async () => {
  const [categories, heroBanner] = await Promise.all([
    getCategories(),
    getHeroBannerByPlacement("productspagehero", "sitewidepagehero"),
  ]);
  const parentCategories = categories.filter((cat: Category) => cat.isParentCategory);
  const childCategories = categories.filter((cat: Category) => !cat.isParentCategory);

  return (
    <>
      {heroBanner ? <HeroBanner placement="productspagehero" banner={heroBanner} /> : null}
      <ProductsPageClient
        parentCategories={parentCategories}
        childCategories={childCategories}
        showHeroSection={!heroBanner}
      />
    </>
  );
};

export default ProductsLandingPage;
