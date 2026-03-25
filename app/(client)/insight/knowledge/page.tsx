import type { Metadata } from "next";
import KnowledgePageClient from "@/app/(client)/insight/knowledge/KnowledgePageClient";
import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement, getInsightCategories, getKnowledgeInsights } from "@/sanity/queries";

const siteName = "ShopCart";

type KnowledgeSearchParams = {
  type?: string | string[];
};

type KnowledgePageProps = {
  searchParams?: KnowledgeSearchParams | Promise<KnowledgeSearchParams>;
};

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Knowledge Base | Insight Hub | ${siteName}`,
    description:
      "Explore expert knowledge with product guidance, industry insights, comparisons, and problem-solving playbooks tailored for your team.",
  };
}

const KnowledgePage = async ({ searchParams }: KnowledgePageProps) => {
  const heroBanner = await getHeroBannerByPlacement("insightpagehero", "sitewidepagehero");
  const resolvedSearchParams = await searchParams;
  const typeParam = parseParam(resolvedSearchParams?.type);
  const activeType = typeParam || null;

  const [insights, categories] = await Promise.all([
    getKnowledgeInsights(20),
    getInsightCategories(),
  ]);

  return (
    <>
      {heroBanner ? <HeroBanner placement="insightpagehero" banner={heroBanner} /> : null}
      <KnowledgePageClient
        insights={Array.isArray(insights) ? insights : []}
        categories={categories}
        activeType={activeType}
        showHeroCard={!heroBanner}
      />
    </>
  );
};

export default KnowledgePage;
