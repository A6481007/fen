import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { fetchDownloadsTable } from "./actions";
import { DownloadsPageClient } from "./client";

const METADATA_BY_LOCALE = {
  en: {
    title: "Downloads",
    description: "Legacy downloads/resources list.",
  },
  th: {
    title: "ดาวน์โหลด",
    description: "รายการดาวน์โหลด/ทรัพยากรเดิม",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type DownloadsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const DownloadsPage = async ({ searchParams }: DownloadsPageProps) => {
  const resolvedSearchParams = (await searchParams) ?? {};

  const search = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "";
  const page =
    typeof resolvedSearchParams.page === "string" && Number.isFinite(Number(resolvedSearchParams.page))
      ? Number(resolvedSearchParams.page)
      : 1;
  const statusValue = status === "draft" || status === "published" ? status : undefined;

  const initialResult = await fetchDownloadsTable({
    page,
    search: search || undefined,
    status: statusValue,
  });

  if (!initialResult.success) {
    throw new Error(initialResult.message ?? "Failed to load downloads");
  }

  const initialData = initialResult.data;

  return (
    <DownloadsPageClient
      initialData={initialData}
      initialSearch={search}
      initialStatus={status}
    />
  );
};

export default DownloadsPage;
