import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogItem } from "@/sanity/queries/catalog";
import { ArrowRight, Download, FileText, Tag } from "lucide-react";

type CatalogCardProps = {
  item: CatalogItem;
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const getCoverImageUrl = (item: CatalogItem) => {
  const customCover =
    (item.coverImage as { customCover?: { asset?: { url?: string | null } | null } | null } | null)
      ?.customCover?.asset?.url;
  const generatedThumbnail =
    (item.coverImage as { generatedThumbnail?: { url?: string | null } | null } | null)
      ?.generatedThumbnail?.url || item.coverImage?.generatedFromFile;
  const autoPreview = item.coverImage?.useAutoGeneration
    ? item.file?.asset?.metadata?.previewUrl ||
      item.file?.asset?.metadata?.thumbnailUrl ||
      item.file?.asset?.metadata?.thumbUrl ||
      (typeof item.file?.asset?.metadata?.preview === "object"
        ? item.file?.asset?.metadata?.preview?.url
        : null) ||
      (typeof item.file?.asset?.metadata?.thumbnail === "object"
        ? item.file?.asset?.metadata?.thumbnail?.url
        : null)
    : null;

  return (
    customCover ||
    generatedThumbnail ||
    autoPreview ||
    "/images/catalog-placeholder.png"
  );
};

const getFileTypeLabel = (item: CatalogItem) =>
  item.metadata?.fileType ||
  item.file?.asset?.metadata?.mimeType ||
  item.file?.asset?.originalFilename?.split(".").pop();

const CatalogCard = ({ item }: CatalogCardProps) => {
  const detailsHref = item.slug ? `/catalog/${item.slug}` : "/catalog";
  const downloadUrl = item.file?.asset?.url ?? null;
  const coverImageUrl = getCoverImageUrl(item);
  const category = item.metadata?.category || "General";
  const tags = Array.isArray(item.metadata?.tags) ? item.metadata?.tags : [];
  const versionLabel = item.metadata?.version ? `v${item.metadata.version}` : "";
  const fileSizeLabel =
    formatFileSize(item.metadata?.fileSize ?? item.file?.asset?.metadata?.size) || "";
  const fileTypeLabel = getFileTypeLabel(item);
  const releaseDateLabel =
    item.publishDate && !Number.isNaN(new Date(item.publishDate).valueOf())
      ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
          new Date(item.publishDate)
        )
      : "";

  return (
    <Card className="group h-full overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={detailsHref} className="relative block aspect-[3/4] overflow-hidden bg-slate-100">
        <Image
          src={coverImageUrl}
          alt={item.title || "Catalog cover"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent opacity-0 transition group-hover:opacity-90" />
        {category && (
          <Badge className="absolute left-3 top-3 bg-white/90 text-slate-900 shadow-sm backdrop-blur">
            {category}
          </Badge>
        )}
        {versionLabel && (
          <Badge variant="secondary" className="absolute right-3 top-3 bg-slate-900 text-white">
            {versionLabel}
          </Badge>
        )}
      </Link>

      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="space-y-2">
          <Link
            href={detailsHref}
            className="group/link flex items-start gap-2 text-lg font-semibold leading-tight text-slate-900 hover:text-shop_dark_green"
          >
            <FileText className="mt-0.5 h-4 w-4 text-shop_dark_green" />
            <span className="line-clamp-2">{item.title || "Untitled asset"}</span>
          </Link>
          <p className="line-clamp-2 text-sm text-slate-600">
            {item.summary || item.description || "A ready-to-download resource from our catalog."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          {fileTypeLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
              <FileText className="h-3.5 w-3.5 text-shop_dark_green" />
              {fileTypeLabel}
            </span>
          )}
          {fileSizeLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
              <Download className="h-3.5 w-3.5 text-shop_dark_green" />
              {fileSizeLabel}
            </span>
          )}
          {releaseDateLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
              Released {releaseDateLabel}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="border-dashed">
                <Tag className="mr-1 h-3 w-3 text-shop_dark_green" />
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                +{tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="group/button gap-1 border-slate-200 bg-white text-slate-900 hover:border-shop_dark_green hover:text-shop_dark_green"
          >
            <Link href={detailsHref}>
              View details
              <ArrowRight className="ml-1 h-4 w-4 transition group-hover/button:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="gap-2 bg-shop_dark_green text-white hover:bg-shop_dark_green/90"
            disabled={!downloadUrl}
          >
            <Link href={downloadUrl || "#"} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Download
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogCard;
