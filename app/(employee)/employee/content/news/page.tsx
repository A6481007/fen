import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz";
import NewsPageClient from "@/app/(admin)/admin/content/news/client";
import { fetchNewsTable } from "@/app/(admin)/admin/content/news/actions";
import { NEWS_CATEGORY_OPTIONS } from "@/lib/news/categories";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { getRequestLocale } from "@/lib/i18n/requestLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "News | Content Management",
    description: "Manage news posts",
  },
  th: {
    title: "ข่าวสาร | จัดการเนื้อหา",
    description: "จัดการโพสต์ข่าวสาร",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type EmployeeNewsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const EmployeeNewsPage = async ({ searchParams }: EmployeeNewsPageProps) => {
  try {
    await requirePermission("content.news.read");
  } catch {
    redirect("/employee");
  }

  const allowedCategories = new Set(NEWS_CATEGORY_OPTIONS.map((option) => option.value));
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const getFirstString = (value?: string | string[]) => {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  };

  const rawCategory = getFirstString(resolvedSearchParams?.category).trim();
  const categoryParam = allowedCategories.has(rawCategory) ? rawCategory : "";

  const rawSearch = getFirstString(resolvedSearchParams?.search).trim();
  const searchParam = rawSearch ? rawSearch.slice(0, 120) : "";

  const parsePositiveInt = (value?: string | string[]) => {
    const raw = getFirstString(value);
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const pageParam = parsePositiveInt(resolvedSearchParams?.page) ?? 1;
  const pageSizeParam = Math.min(parsePositiveInt(resolvedSearchParams?.pageSize) ?? 10, 50);
  const locale = await getRequestLocale();

  const initialData = await fetchNewsTable({
    page: pageParam,
    pageSize: pageSizeParam,
    category: categoryParam || undefined,
    search: searchParam || undefined,
    locale,
  });

  return (
    <NewsPageClient
      initialData={initialData}
      initialCategory={categoryParam}
      initialSearch={searchParam}
      basePath="/employee/content/news"
    />
  );
};

export default EmployeeNewsPage;
