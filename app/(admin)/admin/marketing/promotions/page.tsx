import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { fetchPromotionsTable } from "./actions";
import { PromotionsPageClient } from "./client";
import { getBackofficeContext, hasPermission } from "@/lib/authz";

const METADATA_BY_LOCALE = {
  en: {
    title: "Promotions",
    description: "Manage Sanity promotion documents and schedules.",
  },
  th: {
    title: "โปรโมชัน",
    description: "จัดการเอกสารโปรโมชันจาก Sanity และกำหนดเวลา",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type PromotionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const PromotionsPage = async ({ searchParams }: PromotionsPageProps) => {
  const resolvedSearchParams = (await searchParams) ?? {};

  const search = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "";
  const type = typeof resolvedSearchParams.type === "string" ? resolvedSearchParams.type : "";
  const from = typeof resolvedSearchParams.from === "string" ? resolvedSearchParams.from : "";
  const to = typeof resolvedSearchParams.to === "string" ? resolvedSearchParams.to : "";
  const page =
    typeof resolvedSearchParams.page === "string" && Number.isFinite(Number(resolvedSearchParams.page))
      ? Number(resolvedSearchParams.page)
      : 1;

  const [initialData, ctx] = await Promise.all([
    fetchPromotionsTable({
      page,
      search: search || undefined,
      status: status || undefined,
      type: type || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    getBackofficeContext(),
  ]);

  const canDelete = hasPermission(ctx, "marketing.promotions.publish");

  return (
    <PromotionsPageClient
      initialData={initialData}
      initialSearch={search}
      initialStatus={status}
      initialType={type}
      initialFrom={from}
      initialTo={to}
      canDelete={canDelete}
    />
  );
};

export default PromotionsPage;
