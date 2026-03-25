import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { fetchDealsTable } from "./actions";
import { DealsPageClient } from "./client";

const METADATA_BY_LOCALE = {
  en: {
    title: "Deals",
    description: "Manage Sanity deal documents, schedules, and inventory caps.",
  },
  th: {
    title: "ดีล",
    description: "จัดการเอกสารดีลจาก Sanity ตารางเวลา และเพดานสต็อก",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type DealsPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const DealsPage = async ({ searchParams }: DealsPageProps) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const search = typeof resolvedSearchParams?.search === "string" ? resolvedSearchParams.search : "";
  const status = typeof resolvedSearchParams?.status === "string" ? resolvedSearchParams.status : "";
  const dealType = typeof resolvedSearchParams?.dealType === "string" ? resolvedSearchParams.dealType : "";
  const from = typeof resolvedSearchParams?.from === "string" ? resolvedSearchParams.from : "";
  const to = typeof resolvedSearchParams?.to === "string" ? resolvedSearchParams.to : "";
  const page =
    typeof resolvedSearchParams?.page === "string" && Number.isFinite(Number(resolvedSearchParams.page))
      ? Number(resolvedSearchParams.page)
      : 1;

  const initialData = await fetchDealsTable({
    page,
    search: search || undefined,
    status: status || undefined,
    dealType: dealType || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <DealsPageClient
      initialData={initialData}
      initialSearch={search}
      initialStatus={status}
      initialDealType={dealType}
      initialFrom={from}
      initialTo={to}
    />
  );
};

export default DealsPage;
