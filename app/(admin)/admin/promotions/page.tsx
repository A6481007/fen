import { requirePermission } from "@/lib/authz";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { getPromotions } from "@/sanity/queries";
import { Metadata } from "next";
import { PromotionAnalyticsIndexClient } from "./client";

const METADATA_BY_LOCALE = {
  en: {
    title: "Promotion Analytics",
    description: "Pick a campaign to open its analytics dashboard.",
  },
  th: {
    title: "วิเคราะห์โปรโมชัน",
    description: "เลือกแคมเปญเพื่อเปิดแดชบอร์ดการวิเคราะห์",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

const PromotionAnalyticsIndexPage = async () => {
  const ctx = await requirePermission("analytics.promotions.read");
  const promotions = await getPromotions();

  const campaigns = (promotions ?? []).filter((promotion) => Boolean(promotion.campaignId));
  const visibleCampaigns = campaigns.slice(0, 20);
  const hasMarketingAccess =
    ctx.isAdmin || ctx.permissions.includes("marketing.promotions.read");

  return (
    <PromotionAnalyticsIndexClient
      campaigns={visibleCampaigns}
      hasMarketingAccess={hasMarketingAccess}
    />
  );
};

export default PromotionAnalyticsIndexPage;
