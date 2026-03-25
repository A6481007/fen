import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import InsightsPageClient from "./client";
import { fetchInsightsTable } from "./actions";
import { getRequestLocale } from "@/lib/i18n/requestLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Insights",
    description: "Sanity-backed knowledge and updates",
  },
  th: {
    title: "อินไซต์",
    description: "ความรู้และอัปเดตที่เชื่อมกับ Sanity",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type AdminInsightsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const AdminInsightsPage = async ({ searchParams }: AdminInsightsPageProps) => {
  const resolvedSearchParams = (await searchParams) ?? {};

  const statusParam = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "";
  const searchParam = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const locale = await getRequestLocale();

  const initialData = await fetchInsightsTable({
    page: 1,
    pageSize: 10,
    status: statusParam || undefined,
    search: searchParam || undefined,
    locale,
  });

  return (
    <InsightsPageClient
      initialData={initialData}
      initialStatus={statusParam}
      initialSearch={searchParam}
    />
  );
};

export default AdminInsightsPage;
