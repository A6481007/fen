import { notFound } from "next/navigation";
import { getPromotionById } from "@/actions/backoffice/promotionsActions";
import { PromotionForm } from "@/components/admin/backoffice/promotions/PromotionForm";
import type { PromotionFormState } from "@/components/admin/backoffice/promotions/types";
import { savePromotion } from "./actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Edit Promotion | Marketing",
    description: "Edit promotion settings and schedule.",
  },
  th: {
    title: "แก้ไขโปรโมชัน | การตลาด",
    description: "แก้ไขการตั้งค่าและตารางเวลาโปรโมชัน",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

type PromotionDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const PromotionDetailPage = async ({ params }: PromotionDetailPageProps) => {
  const resolvedParams = await params;
  const promotionId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  const result = await getPromotionById(promotionId);

  if (!result.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={result.message}
          fallbackKey="admin.marketing.promotions.errors.loadPromotion"
        />
      </div>
    );
  }

  const promotion = result.data;

  if (!promotion) {
    return notFound();
  }

  const initialValues: Partial<PromotionFormState> = {
    _id: promotion._id,
    name: promotion.name ?? "",
    campaignId: promotion.campaignId ?? "",
    slug: promotion.slug?.current ?? "",
    status: promotion.status ?? "draft",
    type: promotion.type ?? "flashSale",
    priority: promotion.priority,
    discountType: promotion.discountType ?? "percentage",
    discountValue: promotion.discountValue,
    buyQuantity: promotion.buyQuantity,
    getQuantity: promotion.getQuantity,
    minimumOrderValue: promotion.minimumOrderValue,
    startDate: promotion.startDate ?? "",
    endDate: promotion.endDate ?? "",
    timezone: promotion.timezone ?? "UTC",
    segmentType: promotion.targetAudience?.segmentType,
    heroMessage: promotion.heroMessage ?? "",
    shortDescription: promotion.shortDescription ?? "",
    badgeLabel: promotion.badgeLabel ?? "",
    badgeColor: promotion.badgeColor ?? "",
    ctaText: promotion.ctaText ?? "",
    ctaLink: promotion.ctaLink ?? "",
    budgetCap: promotion.budgetCap,
    usageLimit: promotion.usageLimit,
    perCustomerLimit: promotion.perCustomerLimit,
    utmSource: promotion.utmSource ?? "",
    utmMedium: promotion.utmMedium ?? "",
    utmCampaign: promotion.utmCampaign ?? "",
    trackingPixelId: promotion.trackingPixelId ?? "",
    internalNotes: promotion.internalNotes ?? "",
    targetProducts:
      (
        promotion.defaultBundleItems?.some((item) => !item.isFree)
          ? promotion.defaultBundleItems
              ?.filter((item) => !item.isFree)
              .map((item) => ({
                id: item.product?._id ?? "",
                label: item.product?.name ?? item.product?.slug ?? item.product?._id ?? "",
                quantity: item.quantity ?? promotion.buyQuantity ?? 1,
              }))
          : promotion.targetAudience?.products?.map((item) => ({
              id: item._id ?? "",
              label: item.name ?? item.slug?.current ?? item._id,
              quantity: promotion.buyQuantity ?? 1,
            }))
      )?.filter((item) => item.id) ?? [],
    targetCategories:
      promotion.targetAudience?.categories?.map((item) => ({
        id: item._id ?? "",
        label: item.title ?? item.slug?.current ?? item._id,
      })).filter((item) => item.id) ?? [],
    defaultBundleItems:
      promotion.defaultBundleItems?.map((item) => ({
        productId: item.product?._id ?? "",
        productLabel: item.product?.name ?? item.product?.slug ?? item.product?._id ?? "",
        quantity: item.quantity ?? (item.isFree ? promotion.getQuantity : promotion.buyQuantity) ?? 1,
        isFree: item.isFree ?? false,
        variantId: item.variantId ?? undefined,
      })).filter((item) => item.productId) ?? [],
  };

  const analyticsHref = promotion.campaignId
    ? `/admin/promotions/${promotion.campaignId}/analytics`
    : undefined;

  return (
    <div className="p-6">
      <PromotionForm
        initialValues={initialValues}
        onSubmit={savePromotion}
        analyticsHref={analyticsHref}
      />
    </div>
  );
};

export default PromotionDetailPage;
