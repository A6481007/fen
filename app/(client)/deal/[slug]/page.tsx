import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DealDetailPageClient from "./DealDetailPageClient";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { generateDealProductSchema } from "@/lib/seo/structured-data";
import { getDealById, getDeals } from "@/sanity/queries";


type DealDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const buildDescription = (deal: any) => {
  const title = deal?.title || deal?.product?.name || "Deal";
  const discount = deal?.discountPercent ? `${deal.discountPercent}%` : "";
  if (discount) {
    return `${title} - Save ${discount} on this limited-time deal.`;
  }
  return `Limited-time pricing on ${title}.`;
};

export async function generateMetadata({ params }: DealDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const deal = await getDealById(slug);

  if (!deal) {
    return { title: "Deal not found" };
  }

  const title = `${deal.title || deal.product?.name || "Deal"} | ShopCart`;
  const description = buildDescription(deal);
  const canonical = `/deal/${deal.dealId || slug}`;
  const isActive = deal.isActive !== false && deal.status !== "draft";

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
    },
    robots: isActive ? "index" : "noindex",
  };
}

const DealDetailPage = async ({ params }: DealDetailPageProps) => {
  const { slug } = await params;
  const deal = await getDealById(slug);

  if (!deal) {
    return notFound();
  }

  const relatedDeals = await getDeals({ type: deal.dealType || undefined });
  const related = (Array.isArray(relatedDeals) ? relatedDeals : [])
    .filter((item) => item?.dealId && item.dealId !== deal.dealId)
    .slice(0, 4);

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const shareUrl = `${baseUrl || ""}/deal/${deal.dealId || slug}`;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Deals", url: "/deal" },
    { name: deal.title || deal.product?.name || "Deal", url: `/deal/${deal.dealId || slug}` },
  ]);
  const structuredData = [generateDealProductSchema(deal), breadcrumbSchema].filter(Boolean);

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <DealDetailPageClient deal={deal} relatedDeals={related as any} shareUrl={shareUrl} />
    </>
  );
};

export default DealDetailPage;
