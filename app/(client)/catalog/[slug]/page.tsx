import CatalogDetail from "@/components/catalog/CatalogDetail";
import Container from "@/components/Container";
import { metadata as rootMetadata } from "@/app/layout";
import { getCatalogItemBySlug } from "@/sanity/queries/catalog";
import type { CatalogItem } from "@/sanity/queries/catalog";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

const metadataBase =
  rootMetadata.metadataBase instanceof URL
    ? rootMetadata.metadataBase
    : rootMetadata.metadataBase
      ? new URL(rootMetadata.metadataBase)
      : null;

const buildCatalogUrl = (slug: string) => {
  const path = `/catalog/${slug}`;
  return metadataBase ? new URL(path, metadataBase).toString() : path;
};

const getCatalogItem = cache(async (slug: string) => getCatalogItemBySlug(slug));

const resolveCoverImageUrl = (item: CatalogItem) => {
  const customCover = item.coverImage?.customCover?.asset?.url ?? null;
  const generatedFromFile = item.coverImage?.generatedFromFile ?? null;
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

  return customCover || autoPreview || generatedFromFile || "/images/catalog-placeholder.png";
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return "";

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const buildStructuredData = (
  item: CatalogItem,
  shareUrl: string,
  coverImageUrl: string,
  downloadUrl: string | null
) => {
  const tags = Array.isArray(item.metadata?.tags)
    ? item.metadata.tags.filter(Boolean)
    : [];
  const fileSize =
    formatFileSize(item.metadata?.fileSize ?? item.file?.asset?.metadata?.size) || undefined;
  const fileType =
    item.metadata?.fileType ||
    item.file?.asset?.metadata?.mimeType ||
    item.file?.asset?.originalFilename?.split(".").pop();

  return {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: item.title || "Catalog asset",
    description: item.summary || item.description || "",
    url: shareUrl,
    fileFormat: fileType || undefined,
    datePublished: item.publishDate || undefined,
    image: coverImageUrl,
    thumbnailUrl: coverImageUrl,
    keywords: tags,
    encoding: downloadUrl
      ? {
          "@type": "MediaObject",
          contentUrl: downloadUrl,
          fileFormat: fileType || undefined,
          contentSize: fileSize,
        }
      : undefined,
  };
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> => {
  const { slug } = await params;
  const item = await getCatalogItem(slug);

  if (!item) {
    return {
      title: "Catalog item not found | Catalog",
      description: "The requested catalog item could not be found.",
    };
  }

  const pagePath = `/catalog/${slug}`;
  const pageUrl = buildCatalogUrl(slug);
  const coverImageUrl = resolveCoverImageUrl(item);
  const description = item.summary || item.description || "Downloadable catalog asset.";
  const fileType =
    item.metadata?.fileType ||
    item.file?.asset?.metadata?.mimeType ||
    item.file?.asset?.originalFilename?.split(".").pop();

  return {
    title: item.title ? `${item.title} | Catalog` : "Catalog item",
    description,
    alternates: { canonical: pagePath },
    keywords: [
      "catalog",
      item.title || "",
      item.metadata?.category || "",
      fileType || "",
      ...(Array.isArray(item.metadata?.tags) ? item.metadata.tags : []),
    ].filter(Boolean),
    openGraph: {
      title: item.title || "Catalog item",
      description,
      url: pageUrl,
      images: [
        {
          url: coverImageUrl,
          width: 1200,
          height: 630,
          alt: item.title || "Catalog cover",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title || "Catalog item",
      description,
      images: [coverImageUrl],
    },
  };
};

const CatalogDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const catalogItem = await getCatalogItem(slug);

  if (!catalogItem) {
    return notFound();
  }

  const coverImageUrl = resolveCoverImageUrl(catalogItem);
  const shareUrl = buildCatalogUrl(slug);
  const downloadUrl = catalogItem.file?.asset?.url || null;
  const structuredData = buildStructuredData(
    catalogItem,
    shareUrl,
    coverImageUrl,
    downloadUrl
  );
  const jsonLd = JSON.stringify(structuredData).replace(/</g, "\\u003c");

  const category = (catalogItem.metadata?.category || "").trim();
  const hasCategory =
    category.length > 0 && category.toLowerCase() !== "catalog";
  const breadcrumbCategoryHref = hasCategory
    ? `/catalog?category=${encodeURIComponent(category)}`
    : "/catalog";

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <Container className="pt-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Link href="/" className="hover:text-shop_dark_green">
            Home
          </Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-shop_dark_green">
            Catalog
          </Link>
          <span>/</span>
          {hasCategory ? (
            <>
              <Link href={breadcrumbCategoryHref} className="hover:text-shop_dark_green">
                {category}
              </Link>
              <span>/</span>
            </>
          ) : null}
          <span className="font-semibold text-slate-900">
            {catalogItem.title || "Catalog item"}
          </span>
        </div>
      </Container>

      <Container className="py-8">
        <CatalogDetail
          item={catalogItem}
          coverImageUrl={coverImageUrl}
          shareUrl={shareUrl}
        />
      </Container>
    </div>
  );
};

export default CatalogDetailPage;
