import { notFound } from "next/navigation";
import { getDealById } from "@/actions/backoffice/dealsActions";
import { DealForm } from "@/components/admin/backoffice/deals/DealForm";
import type { DealFormState } from "@/components/admin/backoffice/deals/types";
import { saveDeal, searchDealProducts } from "../actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";

type DealDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const DealDetailPage = async ({ params }: DealDetailPageProps) => {
  const resolvedParams = await params;
  const dealId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  const result = await getDealById(dealId);

  if (!result.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={result.message}
          fallbackKey="admin.marketing.deals.errors.loadDeal"
        />
      </div>
    );
  }

  const deal = result.data;

  if (!deal) {
    return notFound();
  }

  const initialValues: Partial<DealFormState> = {
    _id: deal._id,
    dealId: deal.dealId ?? "",
    title: deal.title ?? "",
    status: deal.status ?? "draft",
    dealType: deal.dealType ?? "featured",
    productId: deal.product?._id,
    productLabel: deal.product?.name ?? deal.product?.slug?.current ?? "",
    originalPrice: deal.originalPrice,
    dealPrice: deal.dealPrice,
    badge: deal.badge ?? "",
    badgeColor: deal.badgeColor ?? "",
    showOnHomepage: deal.showOnHomepage,
    priority: deal.priority,
    startDate: deal.startDate ?? "",
    endDate: deal.endDate ?? "",
    quantityLimit: deal.quantityLimit,
    perCustomerLimit: deal.perCustomerLimit,
    soldCount: deal.soldCount,
  };

  return (
    <div className="p-6">
      <DealForm
        initialValues={initialValues}
        onSubmit={saveDeal}
        onSearchProduct={searchDealProducts}
      />
    </div>
  );
};

export default DealDetailPage;
