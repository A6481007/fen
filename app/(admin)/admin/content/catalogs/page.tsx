import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { fetchCatalogsTable } from "./actions";
import { CatalogsPageClient } from "./client";

const METADATA_BY_LOCALE = {
  en: {
    title: "Catalogs",
    description: "Manage catalog entries and linked downloads.",
  },
  th: {
    title: "แคตตาล็อก",
    description: "จัดการรายการแคตตาล็อกและดาวน์โหลดที่เชื่อมโยง",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type CatalogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const CatalogsPage = async ({ searchParams }: CatalogsPageProps) => {
  const resolvedSearchParams = (await searchParams) ?? {};

  const search = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "";
  const category = typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : "";
  const page =
    typeof resolvedSearchParams.page === "string" && Number.isFinite(Number(resolvedSearchParams.page))
      ? Number(resolvedSearchParams.page)
      : 1;

  const statusValue = status === "draft" || status === "published" ? status : undefined;

  const initialResult = await fetchCatalogsTable({
    page,
    search: search || undefined,
    status: statusValue,
    category: category || undefined,
  });

  if (!initialResult.success) {
    throw new Error(initialResult.message ?? "Failed to load catalogs");
  }

  const initialData = initialResult.data;

  return (
    <CatalogsPageClient
      initialData={initialData}
      initialSearch={search}
      initialStatus={status}
      initialCategory={category}
    />
  );
};

export default CatalogsPage;
