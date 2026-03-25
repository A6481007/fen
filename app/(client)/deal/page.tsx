import type { Metadata } from "next";
import DealPageClient from "@/app/(client)/deal/DealPageClient";
import HeroBanner from "@/components/HeroBanner";
import { getDeals, getHeroBannerByPlacement } from "@/sanity/queries";
import { getActivePromotions } from "@/sanity/queries/promotions";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import type { Deal } from "@/components/deals/DealGrid";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;

export const metadata: Metadata = {
  title: "Featured Deals & Promotions | ShopCart",
  description: "Explore featured deals, flash sales, and seasonal promotions powered by Deal docs.",
  openGraph: {
    title: "Featured Deals & Promotions | ShopCart",
    description: "Discover featured deals, live flash sales, and limited-time offers.",
  },
  alternates: {
    canonical: "/deal",
  },
};

const DealPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("dealpagehero", "sitewidepagehero");
  const [promotionData, dealsData] = await Promise.all([
    getActivePromotions({ includeDeals: false }),
    getDeals(),
  ]);

  const promotions = (promotionData || []).filter(Boolean) as Promotion[];
  const deals = (Array.isArray(dealsData) ? dealsData : []) as Deal[];

  return (
    <>
      {heroBanner ? (
        <HeroBanner placement="dealpagehero" banner={heroBanner} />
      ) : null}
      <DealPageClient promotions={promotions} deals={deals} showHeroHeader={!heroBanner} />
    </>
  );
};

export default DealPage;
