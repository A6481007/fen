import HomeCategories from "@/components/HomeCategories";
import NewsHighlight from "@/components/NewsHighlight";
import HomeBanner from "@/components/HomeBanner";
import ProductGrid from "@/components/ProductGrid";
import ShopByBrands from "@/components/ShopByBrands";
import ShopFeatures from "@/components/ShopFeatures";
import { PromotionsShowcase } from "@/components/homepage/PromotionsShowcase";
import { getActivePromotions, getHomepageDeals, getRootCategoriesForNav } from "@/sanity/queries";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";

export default async function Home() {
  const [categories, promotions, deals] = await Promise.all([
    getRootCategoriesForNav(),
    getActivePromotions(),
    getHomepageDeals(),
  ]);

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <div>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />

      <HomeBanner />
      <PromotionsShowcase promotions={promotions} deals={deals} />
      <div className="py-10">
        <ProductGrid />
        <HomeCategories categories={categories} />
        <ShopFeatures />
        <ShopByBrands />
        <NewsHighlight />
      </div>
    </div>
  );
}
