import { notFound } from "next/navigation";
import { getPromotionById } from "@/actions/backoffice/promotionsActions";
import { PromotionForm } from "@/components/admin/backoffice/promotions/PromotionForm";
import type { PromotionFormState } from "@/components/admin/backoffice/promotions/types";
import { savePromotion } from "../actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";

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
    locale: promotion.locale?.code ?? "en",
    status: promotion.status ?? "draft",
    type: promotion.type ?? "flashSale",
    priority: promotion.priority,
    discountType: promotion.discountType ?? "percentage",
    discountValue: promotion.discountValue,
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
