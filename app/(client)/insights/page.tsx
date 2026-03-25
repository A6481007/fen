import type { Metadata } from "next";
import InsightsPageClient from "@/app/(client)/insights/InsightsPageClient";
import HeroBanner from "@/components/HeroBanner";
import { getAllInsights, getHeroBannerByPlacement, getInsightCategories } from "@/sanity/queries";

const siteName = "ShopCart";

type InsightsSearchParams = {
  section?: string | string[];
  category?: string | string[];
  tag?: string | string[];
};

type InsightsPageProps = {
  searchParams?: InsightsSearchParams | Promise<InsightsSearchParams>;
};

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

const normalizeSection = (value: string): "all" | "knowledge" | "solutions" => {
  if (value === "knowledge" || value === "solutions") return value;
  return "all";
};

export const generateMetadata: Metadata = {
  title: `Insights | Knowledge & Solutions | ${siteName}`,
  description:
    "Browse knowledge, comparisons, and solution playbooks across our insight library.",
};

const InsightsPage = async ({ searchParams }: InsightsPageProps) => {
  const resolvedSearchParams = await searchParams;
  const section = normalizeSection(parseParam(resolvedSearchParams?.section));
  const category = parseParam(resolvedSearchParams?.category) || null;
  const tag = parseParam(resolvedSearchParams?.tag) || null;

  const [insights, categories, heroBanner] = await Promise.all([
    getAllInsights(24),
    getInsightCategories(),
    getHeroBannerByPlacement("insightslandinghero", "sitewidepagehero"),
  ]);

  return (
    <>
      {heroBanner ? <HeroBanner placement="insightslandinghero" banner={heroBanner} /> : null}
      <InsightsPageClient
        insights={Array.isArray(insights) ? insights : []}
        categories={categories}
        activeSection={section}
        activeCategory={category}
        activeTag={tag}
        showHeroSection={!heroBanner}
      />
    </>
  );
};

export default InsightsPage;
