import { unstable_cache } from "next/cache";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "../lib/live";

type CatalogQueryParams = {
  category?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  fileType?: string;
  tags?: string[];
};

type AssetMetadata = {
  size?: number;
  mimeType?: string;
  lqip?: string | null;
  preview?: { url?: string | null } | null;
  thumbnail?: { url?: string | null } | null;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  thumbUrl?: string | null;
};

type CatalogAsset = {
  _id?: string;
  url?: string;
  originalFilename?: string;
  metadata?: AssetMetadata | null;
};

type CatalogFileRef = { asset?: CatalogAsset | null } | null;

type CatalogCoverImage = {
  customCover?: CatalogFileRef | null;
  useAutoGeneration?: boolean;
  generatedFromFile?: string | null;
};

type CatalogMetadata = {
  category?: string | null;
  tags?: string[] | null;
  version?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
};

type RelatedDownload = {
  _id?: string;
  title?: string;
  slug?: string;
  file?: CatalogFileRef | null;
};

type CatalogItem = {
  _id?: string;
  title?: string;
  slug?: string;
  description?: string;
  summary?: string;
  publishDate?: string;
  file?: CatalogFileRef | null;
  metadata?: CatalogMetadata | null;
  relatedDownloads?: RelatedDownload[] | null;
  coverImage?: CatalogCoverImage | null;
  versionHistory?: unknown;
  versions?: unknown;
};

type CatalogItemsResult = {
  items: CatalogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  sort?: string;
};

type CatalogCoverImageResult = {
  url: string;
  assetId?: string | null;
  source: "custom" | "auto" | "generated" | "placeholder";
};

const CATALOG_CACHE_REVALIDATE_SECONDS = 360;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const PLACEHOLDER_COVER_URL = "/file.svg";

const SORT_OPTIONS: Record<string, string> = {
  publishDate_desc: "publishDate desc",
  publishDate_asc: "publishDate asc",
  date_desc: "publishDate desc",
  date_asc: "publishDate asc",
  title_asc: "lower(title) asc",
  title_desc: "lower(title) desc",
  name_asc: "lower(title) asc",
  name_desc: "lower(title) desc",
  category_asc: "metadata.category asc, publishDate desc",
  size_desc:
    "coalesce(metadata.fileSize, file.asset->metadata.size, 0) desc, publishDate desc",
  size_asc:
    "coalesce(metadata.fileSize, file.asset->metadata.size, 0) asc, publishDate desc",
  popularity_desc: "count(relatedDownloads) desc, publishDate desc",
};

const normalizeLimit = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_LIMIT;
  }

  const integer = Math.floor(value);
  if (integer <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(integer, MAX_LIMIT);
};

const normalizeOffset = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  const integer = Math.floor(value);
  return integer > 0 ? integer : 0;
};

const buildSearchTerm = (value?: string | null) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return "";
  }

  return `*${normalized.replace(/\s+/g, " ")}*`;
};

const CATALOG_PROJECTION = `
  _id,
  title,
  "slug": slug.current,
  description,
  summary,
  publishDate,
  file{
    asset->{
      _id,
      url,
      originalFilename,
      metadata{
        size,
        mimeType,
        lqip,
        preview,
        thumbnail,
        previewUrl,
        thumbnailUrl,
        thumbUrl
      }
    }
  },
  metadata{
    category,
    tags,
    version,
    fileSize,
    fileType
  },
  relatedDownloads[]->{
    _id,
    title,
    "slug": slug.current,
    file{
      asset->{
        _id,
        url,
        originalFilename,
        metadata{
          size,
          mimeType
        }
      }
    }
  },
  coverImage{
    customCover{
      asset->{
        _id,
        url,
        originalFilename,
        metadata{
          size,
          mimeType,
          lqip,
          previewUrl,
          thumbnailUrl,
          thumbUrl
        }
      }
    },
    useAutoGeneration,
    generatedFromFile
  },
  versionHistory,
  versions
`;

const catalogCountQuery = defineQuery(`
  count(*[
    _type == "catalog"
    && (!defined($category) || $category == "" || metadata.category == $category)
    && (!defined($searchTerm) || $searchTerm == "" || title match $searchTerm || description match $searchTerm || summary match $searchTerm)
    && (!defined($fileType) || $fileType == "" || metadata.fileType == $fileType)
    && (!defined($tags) || count($tags) == 0 || count((metadata.tags[])[@ in $tags]) > 0)
  ])
`);

const catalogBySlugQuery = defineQuery(`
  *[_type == "catalog" && slug.current == $slug][0]{
    ${CATALOG_PROJECTION}
  }
`);

const catalogCoverQuery = defineQuery(`
  *[_type == "catalog" && (_id == $identifier || slug.current == $identifier)][0]{
    _id,
    title,
    "slug": slug.current,
    file{
      asset->{
        _id,
        url,
        originalFilename,
        metadata{
          size,
          mimeType,
          lqip,
          preview,
          thumbnail,
          previewUrl,
          thumbnailUrl,
          thumbUrl
        }
      }
    },
    coverImage{
      customCover{
        asset->{
          _id,
          url,
          originalFilename,
          metadata{
            size,
            mimeType,
            lqip,
            previewUrl,
            thumbnailUrl,
            thumbUrl
          }
        }
      },
      useAutoGeneration,
      generatedFromFile
    }
  }
`);

const extractPreviewUrl = (asset?: CatalogAsset | null) => {
  const metadata = asset?.metadata;

  if (metadata?.preview && typeof metadata.preview === "object" && metadata.preview?.url) {
    return metadata.preview.url;
  }

  if (metadata?.thumbnail && typeof metadata.thumbnail === "object" && metadata.thumbnail?.url) {
    return metadata.thumbnail.url;
  }

  return (
    metadata?.previewUrl ??
    metadata?.thumbnailUrl ??
    metadata?.thumbUrl ??
    null
  );
};

let hasLoggedMissingPreview = false;

const logMissingPreview = (context: Record<string, unknown>) => {
  if (hasLoggedMissingPreview) {
    return;
  }

  console.error("Catalog cover preview missing; using placeholder.", context);
  hasLoggedMissingPreview = true;
};

export const getCatalogItems = async (params?: CatalogQueryParams): Promise<CatalogItemsResult> => {
  const normalizedCategory =
    typeof params?.category === "string" ? params.category.trim() : "";
  const normalizedSearch = buildSearchTerm(params?.search);
  const sortKey = typeof params?.sort === "string" ? params.sort.trim() : "";
  const orderBy =
    SORT_OPTIONS[sortKey] ??
    SORT_OPTIONS.date_desc ??
    SORT_OPTIONS.publishDate_desc;
  const normalizedSortKey = SORT_OPTIONS[sortKey] ? sortKey : "date_desc";
  const limit = normalizeLimit(params?.limit);
  const offset = normalizeOffset(params?.offset);
  const normalizedFileType =
    typeof params?.fileType === "string" ? params.fileType.trim() : "";
  const normalizedTags = Array.isArray(params?.tags)
    ? Array.from(
        new Set(
          params.tags
            .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
            .filter(Boolean)
        )
      )
    : [];
  const end = offset + limit - 1;

  const cacheKey = [
    "catalog-items",
    normalizedCategory || "all",
    normalizedSearch || "none",
    orderBy,
    `limit:${limit}`,
    `offset:${offset}`,
    normalizedFileType || "all-file-types",
    normalizedTags.length ? `tags:${normalizedTags.join("|")}` : "all-tags",
  ];

  const tags = ["catalog"];

  const catalogItemsQuery = defineQuery(`
    *[
      _type == "catalog"
      && (!defined($category) || $category == "" || metadata.category == $category)
      && (!defined($searchTerm) || $searchTerm == "" || title match $searchTerm || description match $searchTerm || summary match $searchTerm)
      && (!defined($fileType) || $fileType == "" || metadata.fileType == $fileType)
      && (!defined($tags) || count($tags) == 0 || count((metadata.tags[])[@ in $tags]) > 0)
    ] | order(${orderBy})[$offset...$end]{
      ${CATALOG_PROJECTION}
    }
  `);

  const fetchCatalogItems = unstable_cache(
    async () => {
      const [itemsResult, totalCountResult] = await Promise.all([
        sanityFetch({
          query: catalogItemsQuery,
          params: {
            category: normalizedCategory || "",
            searchTerm: normalizedSearch,
            offset,
            end,
            fileType: normalizedFileType || "",
            tags: normalizedTags,
          },
        }),
        sanityFetch({
          query: catalogCountQuery,
          params: {
            category: normalizedCategory || "",
            searchTerm: normalizedSearch,
            fileType: normalizedFileType || "",
            tags: normalizedTags,
          },
        }),
      ]);

      const items = Array.isArray(itemsResult?.data)
        ? (itemsResult.data as CatalogItem[])
        : [];

      const totalCount =
        typeof totalCountResult?.data === "number" ? totalCountResult.data : 0;
      const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;
      const currentPage =
        totalPages > 0
          ? Math.min(Math.floor(offset / limit) + 1, totalPages)
          : 1;

      return {
        items,
        totalCount,
        totalPages,
        currentPage,
        hasNextPage: offset + items.length < totalCount,
        hasPrevPage: offset > 0 && totalCount > 0,
        sort: normalizedSortKey,
      };
    },
    cacheKey,
    { revalidate: CATALOG_CACHE_REVALIDATE_SECONDS, tags }
  );

  return fetchCatalogItems();
};

export const getCatalogItemBySlug = async (
  slug?: string | null
): Promise<CatalogItem | null> => {
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";

  if (!normalizedSlug) {
    return null;
  }

  const cacheKey = ["catalog-item-by-slug", normalizedSlug];
  const tags = ["catalog", `catalog:${normalizedSlug}`];

  const fetchCatalogItem = unstable_cache(
    async () => {
      const { data } = await sanityFetch({
        query: catalogBySlugQuery,
        params: { slug: normalizedSlug },
      });

      return (data as CatalogItem | null) ?? null;
    },
    cacheKey,
    { revalidate: CATALOG_CACHE_REVALIDATE_SECONDS, tags }
  );

  return fetchCatalogItem();
};

export const getCatalogCoverImage = async (
  catalogIdOrSlug?: string | null
): Promise<CatalogCoverImageResult> => {
  const normalizedIdentifier =
    typeof catalogIdOrSlug === "string" ? catalogIdOrSlug.trim() : "";

  if (!normalizedIdentifier) {
    return { url: PLACEHOLDER_COVER_URL, source: "placeholder" as const };
  }

  const cacheKey = ["catalog-cover-image", normalizedIdentifier];
  const tags = ["catalog", `catalog:${normalizedIdentifier}`];

  const fetchCoverImage = unstable_cache(
    async () => {
      const { data } = await sanityFetch({
        query: catalogCoverQuery,
        params: { identifier: normalizedIdentifier },
      });

      const catalog = data as
        | (Pick<CatalogItem, "_id" | "slug" | "file" | "coverImage"> & {
            title?: string;
          })
        | null;

      if (!catalog) {
        return { url: PLACEHOLDER_COVER_URL, source: "placeholder" as const };
      }

      const customAsset = catalog.coverImage?.customCover?.asset;
      if (customAsset?.url) {
        return {
          url: customAsset.url,
          assetId: customAsset._id ?? null,
          source: "custom" as const,
        };
      }

      const autoEnabled = !!catalog.coverImage?.useAutoGeneration;
      const previewUrl = extractPreviewUrl(catalog.file?.asset);
      if (autoEnabled && previewUrl) {
        return {
          url: previewUrl,
          assetId: catalog.file?.asset?._id ?? null,
          source: "auto" as const,
        };
      }

      if (catalog.coverImage?.generatedFromFile) {
        return {
          url: catalog.coverImage.generatedFromFile,
          assetId: catalog.file?.asset?._id ?? null,
          source: "generated" as const,
        };
      }

      if (autoEnabled && !previewUrl) {
        logMissingPreview({
          catalogId: catalog._id,
          slug: catalog.slug,
          reason: "missing_preview_metadata",
        });
      }

      return {
        url: PLACEHOLDER_COVER_URL,
        assetId: catalog.file?.asset?._id ?? null,
        source: "placeholder" as const,
      };
    },
    cacheKey,
    { revalidate: CATALOG_CACHE_REVALIDATE_SECONDS, tags }
  );

  return fetchCoverImage();
};

export type { CatalogCoverImageResult, CatalogItem, CatalogItemsResult };
