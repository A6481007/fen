import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import NewsPageClient from "./client";
import { fetchNewsTable } from "./actions";
import { getRequestLocale } from "@/lib/i18n/requestLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "News",
    description: "Sanity-backed announcements with attachments",
  },
  th: {
    title: "ข่าวสาร",
    description: "ประกาศที่เชื่อมกับ Sanity พร้อมไฟล์แนบ",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type AdminNewsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const AdminNewsPage = async ({ searchParams }: AdminNewsPageProps) => {
  const resolvedSearchParams = (await searchParams) ?? {};

  const categoryParam = typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : "";
  const searchParam = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const locale = await getRequestLocale();

  const initialData = await fetchNewsTable({
    page: 1,
    pageSize: 10,
    category: categoryParam || undefined,
    search: searchParam || undefined,
    locale,
  });

  return (
    <NewsPageClient
      initialData={initialData}
      initialCategory={categoryParam}
      initialSearch={searchParam}
    />
  );
};

export default AdminNewsPage;
