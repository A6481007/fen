"use client";

import ContentCard, { type ContentCardBadge, type ContentCardMetadata } from "@/components/shared/ContentCard";
import type { CatalogItem } from "@/sanity/queries/catalog";
import { Download, FileText, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();

  const detailsHref = item.slug ? `/catalog/${item.slug}` : "/catalog";
  const downloadUrl = item.file?.asset?.url ?? undefined;
  const coverImageUrl = getCoverImageUrl(item);
  const titleFallback = t("client.catalog.card.titleFallback");
  const title = item.title || titleFallback;
  const category = item.metadata?.category || t("client.catalog.card.categoryFallback");
  const tags = Array.isArray(item.metadata?.tags) ? item.metadata?.tags : [];
  const versionLabel = item.metadata?.version ? `v${item.metadata.version}` : "";
  const fileSizeLabel =
    formatFileSize(item.metadata?.fileSize ?? item.file?.asset?.metadata?.size) || "";
  const fileTypeLabel = getFileTypeLabel(item);
  const locale = i18n.language?.startsWith("th") ? "th-TH" : "en-US";
  const releaseDateLabel =
    item.publishDate && !Number.isNaN(new Date(item.publishDate).valueOf())
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
          new Date(item.publishDate)
        )
      : "";

  const badges: ContentCardBadge[] = [
    {
      label: category,
      variant: "default",
      colorClassName: "bg-white/90 text-slate-900 shadow-sm",
    },
  ];

  if (tags.length > 0) {
    badges.push({
      label: tags[0],
      variant: "outline",
      colorClassName: "bg-white/90 text-slate-800 border border-slate-200",
      icon: <Tag className="h-3.5 w-3.5" />,
    });
  }

  const metadata: ContentCardMetadata[] = [];

  if (fileTypeLabel) {
    metadata.push({
      icon: <FileText className="h-4 w-4 text-shop_dark_green" />,
      label: t("client.catalog.card.metadata.type"),
      value: fileTypeLabel,
    });
  }

  if (fileSizeLabel) {
    metadata.push({
      icon: <Download className="h-4 w-4 text-shop_dark_green" />,
      label: t("client.catalog.card.metadata.size"),
      value: fileSizeLabel,
    });
  }

  if (versionLabel) {
    metadata.push({
      label: t("client.catalog.card.metadata.version"),
      value: versionLabel,
    });
  }

  if (releaseDateLabel) {
    metadata.push({
      label: t("client.catalog.card.metadata.release"),
      value: releaseDateLabel,
    });
  }

  return (
    <ContentCard
      title={title}
      description={
        item.summary || item.description || t("client.catalog.card.descriptionFallback")
      }
      image={{
        url: coverImageUrl,
        alt: t("client.catalog.card.coverAlt", { title }),
      }}
      badges={badges}
      metadata={metadata}
      layout="grid"
      size="default"
      mediaClassName="aspect-[3/4]"
      mediaHref={detailsHref}
      primaryAction={{
        label: t("client.catalog.card.primaryAction"),
        href: detailsHref,
        ariaLabel: t("client.catalog.card.primaryAria", { title }),
      }}
      secondaryAction={{
        label: t("client.catalog.card.secondaryAction"),
        href: downloadUrl,
        ariaLabel: t("client.catalog.card.secondaryAria", { title }),
        disabled: !downloadUrl,
        rel: downloadUrl ? "noreferrer" : undefined,
        target: downloadUrl ? "_blank" : undefined,
      }}
    />
  );
};

export default CatalogCard;
