import Link from "next/link";
import { cookies, headers } from "next/headers";
import CatalogForm from "@/components/admin/backoffice/catalogs/CatalogForm";
import type { CatalogFormState, CatalogStatus } from "@/components/admin/backoffice/catalogs/types";
import type { ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { getCatalogById, type CatalogRecord } from "@/actions/backoffice/catalogActions";
import { saveCatalog, searchCatalogDownloads } from "../actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";

export const dynamic = "force-dynamic";

type CatalogDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const resolveLocale = async (): Promise<"en" | "th"> => {
  const cookieLocale = (await cookies()).get("i18next")?.value?.toLowerCase();
  if (cookieLocale?.startsWith("th")) return "th";
  if (cookieLocale?.startsWith("en")) return "en";

  const acceptLanguage = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  return acceptLanguage.startsWith("th") ? "th" : "en";
};

const PAGE_COPY = {
  en: {
    missingId: "Catalog id is missing.",
    notFound: "Catalog not found.",
    backToList: "Back to list",
  },
  th: {
    missingId: "ไม่พบรหัสแคตตาล็อก",
    notFound: "ไม่พบแคตตาล็อก",
    backToList: "กลับไปที่รายการ",
  },
} as const;

const toCatalogFormState = (catalog: CatalogRecord): CatalogFormState => ({
  _id: catalog._id,
  title: catalog.title ?? "",
  slug: catalog.slug?.current ?? "",
  description: catalog.description ?? "",
  publishDate: catalog.publishDate ?? "",
  status: (catalog.status as CatalogStatus | undefined) ?? "draft",
  category: catalog.metadata?.category ?? "",
  tags: catalog.metadata?.tags ?? [],
  version: catalog.metadata?.version ?? "",
  fileAssetId: catalog.file?.asset?._ref ?? null,
  useAutoGeneration: catalog.coverImage?.useAutoGeneration ?? true,
  customCoverAssetId: catalog.coverImage?.customCover?.asset?._ref ?? null,
  relatedDownloadIds: catalog.relatedDownloads?.map((d) => d._id ?? "").filter(Boolean),
});

const CatalogDetailPage = async ({ params }: CatalogDetailPageProps) => {
  const locale = await resolveLocale();
  const copy = PAGE_COPY[locale];
  const resolvedParams = await params;
  const catalogId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  if (!catalogId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {copy.missingId}{" "}
          <Link href="/admin/content/catalogs" className="underline">
            {copy.backToList}
          </Link>
        </div>
      </div>
    );
  }

  const result = await getCatalogById(catalogId);

  if (!result.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={result.message}
          fallbackKey="admin.content.catalogs.errors.loadCatalog"
        />
      </div>
    );
  }

  const catalog = result.data;

  if (!catalog) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {copy.notFound}{" "}
          <Link href="/admin/content/catalogs" className="underline">
            {copy.backToList}
          </Link>
        </div>
      </div>
    );
  }

  const initialValues: CatalogFormState = toCatalogFormState(catalog);

  const initialRelatedDownloads: ReferenceOption[] =
    catalog.relatedDownloads?.map((download) => ({
      id: download._id ?? "",
      label: download.title ?? "",
      description: download.slug?.current ?? undefined,
    })) ?? [];

  return (
    <div className="p-6">
      <CatalogForm
        initialValues={initialValues}
        initialRelatedDownloads={initialRelatedDownloads}
        onSubmit={saveCatalog}
        searchDownloads={searchCatalogDownloads}
      />
    </div>
  );
};

export default CatalogDetailPage;
