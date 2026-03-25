import HomeCategories from "@/components/HomeCategories";
import NewsHighlight from "@/components/NewsHighlight";
import HeroBannerSliderSection from "@/components/storefront/HeroBannerSliderSection";
import ProductGrid from "@/components/ProductGrid";
import ShopByBrands from "@/components/ShopByBrands";
import ShopFeatures from "@/components/ShopFeatures";
import { PromotionsShowcase } from "@/components/homepage/PromotionsShowcase";
import FeaturedProducts from "@/components/homepage/FeaturedProducts";
import type { NewsArticleListItem } from "@/components/news/ArticleCard";
import type { Product } from "@/sanity.types";
import {
  getActivePromotions,
  getAllBrands,
  getFeaturedProducts,
  getHomepageDeals,
  getNewsArticles,
  getRootCategoriesForNav,
} from "@/sanity/queries";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";

export default async function Home() {
  const [categories, promotions, deals, featuredProductsRaw, brands, newsData] = await Promise.all([
    getRootCategoriesForNav(),
    getActivePromotions(),
    getHomepageDeals(),
    getFeaturedProducts(),
    getAllBrands(),
    getNewsArticles({ limit: 4, offset: 0, sort: "newest" }),
  ]);
  const featuredProducts = (
    Array.isArray(featuredProductsRaw)
      ? (featuredProductsRaw as unknown as Product[])
      : []
  ).filter(Boolean);
  const articles: NewsArticleListItem[] = Array.isArray(newsData?.items)
    ? (newsData.items as NewsArticleListItem[])
    : [];

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <main>
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

      {/* Hero Section */}
      <HeroBannerSliderSection />

      {/* Promotions Showcase - high visibility placement */}
      <PromotionsShowcase promotions={promotions} deals={deals} />

      {/* Featured Products */}
      <FeaturedProducts products={featuredProducts} />

      <section className="py-10">
        <ProductGrid />
        <HomeCategories categories={categories} />
        <ShopFeatures />
        <ShopByBrands brands={brands} />
        <NewsHighlight articles={articles} />
      </section>
    </main>
  );
}
