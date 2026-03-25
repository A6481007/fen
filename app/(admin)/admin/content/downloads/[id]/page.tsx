import { notFound } from "next/navigation";
import DownloadForm from "@/components/admin/backoffice/downloads/DownloadForm";
import type { DownloadFormState } from "@/components/admin/backoffice/downloads/types";
import type { ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { loadDownload, saveDownload, searchDownloadProducts } from "../actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";

type DownloadDetailPageProps = {
  params: { id: string };
};

const DownloadDetailPage = async ({ params }: DownloadDetailPageProps) => {
  const result = await loadDownload(params.id);

  if (!result.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={result.message}
          fallbackKey="admin.content.downloads.errors.loadDownload"
        />
      </div>
    );
  }

  const download = result.data;
  if (!download) {
    return notFound();
  }

  const initialValues: DownloadFormState = {
    _id: download._id,
    title: download.title ?? "",
    slug: download.slug?.current ?? "",
    summary: download.summary ?? "",
    status: download.status === "published" ? "published" : "draft",
    fileAssetId: download.file?.asset?._ref ?? null,
    relatedProductIds: download.relatedProducts?.map((p) => p._id ?? "").filter(Boolean),
  };

  const initialRelatedProducts: ReferenceOption[] =
    download.relatedProducts?.map((product) => ({
      id: product._id ?? "",
      label: product.name ?? "",
      description: product.slug?.current ?? undefined,
    })) ?? [];

  return (
    <div className="p-6">
      <DownloadForm
        initialValues={initialValues}
        initialRelatedProducts={initialRelatedProducts.filter((item) => Boolean(item.id))}
        onSubmit={saveDownload}
        searchProducts={searchDownloadProducts}
      />
    </div>
  );
};

export default DownloadDetailPage;
