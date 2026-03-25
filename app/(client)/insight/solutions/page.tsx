import type { Metadata } from "next";
import SolutionsPageClient from "@/app/(client)/insight/solutions/SolutionsPageClient";
import { getInsightCategories, getSolutionInsights } from "@/sanity/queries";

type SolutionSearchParams = {
  type?: string | string[];
  complexity?: string | string[];
  industry?: string | string[];
  category?: string | string[];
};

type SolutionsPageProps = {
  searchParams?: SolutionSearchParams | Promise<SolutionSearchParams>;
};

const siteName = "ShopCart";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Solutions | Insights | ${siteName}`,
  description:
    "Discover proven solutions, validated playbooks, and implementation-ready frameworks backed by real-world results.",
};

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

const SolutionsPage = async ({ searchParams }: SolutionsPageProps) => {
  const resolvedSearchParams = await searchParams;
  const activeType = parseParam(resolvedSearchParams?.type) || null;
  const activeComplexity = parseParam(resolvedSearchParams?.complexity) || null;
  const activeIndustry = parseParam(resolvedSearchParams?.industry) || null;
  const activeCategory = parseParam(resolvedSearchParams?.category) || null;

  const [insights, categories] = await Promise.all([
    getSolutionInsights(24),
    getInsightCategories(),
  ]);

  return (
    <SolutionsPageClient
      insights={Array.isArray(insights) ? insights : []}
      categories={categories}
      activeType={activeType}
      activeComplexity={activeComplexity}
      activeIndustry={activeIndustry}
      activeCategory={activeCategory}
    />
  );
};

export default SolutionsPage;
