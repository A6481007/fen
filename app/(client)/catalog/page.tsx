import Container from "@/components/Container";
import HeroBanner from "@/components/HeroBanner";
import CatalogPageClient from "@/components/catalog/CatalogPageClient";
import { getHeroBannerByPlacement, getRootCategoriesForNav } from "@/sanity/queries";
import { getCatalogItems } from "@/sanity/queries/catalog";
import type { CatalogItem } from "@/sanity/queries/catalog";
import type { Category } from "@/sanity.types";
import type { Metadata } from "next";
import CatalogCategoryOverview from "./CatalogCategoryOverview";
import CatalogHeroClient from "./CatalogHeroClient";

type CatalogSearchParams = {
  category?: string | string[];
  fileType?: string | string[];
  tags?: string | string[];
  search?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type SortOption = { value: string; label: string };
type CategoryPreview = Category & {
  productCount?: number;
  subCategoryCount?: number;
};

const ITEMS_PER_PAGE = 12;
const DEFAULT_SORT = "date_desc";
const SORT_OPTIONS: SortOption[] = [
  { value: "date_desc", label: "client.catalog.sort.date_desc" },
  { value: "date_asc", label: "client.catalog.sort.date_asc" },
  { value: "name_asc", label: "client.catalog.sort.name_asc" },
  { value: "name_desc", label: "client.catalog.sort.name_desc" },
  { value: "popularity_desc", label: "client.catalog.sort.popularity_desc" },
  { value: "size_desc", label: "client.catalog.sort.size_desc" },
  { value: "size_asc", label: "client.catalog.sort.size_asc" },
];

const CATALOG_DESCRIPTION =
  "Browse downloadable resources, product one-pagers, and release assets in the catalog.";

export const metadata: Metadata = {
  title: "Catalog | Downloadable assets and product resources",
  description: CATALOG_DESCRIPTION,
  keywords: [
    "catalog",
    "downloads",
    "assets",
    "resources",
    "product sheets",
    "specs",
  ],
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: "Catalog | Downloadable assets and product resources",
    description: CATALOG_DESCRIPTION,
    url: "/catalog",
    images: [
      {
        url: "/images/catalog-placeholder.png",
        width: 1200,
        height: 630,
        alt: "Catalog preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Catalog | Downloadable assets and product resources",
    description: CATALOG_DESCRIPTION,
    images: ["/images/catalog-placeholder.png"],
  },
};

const parseParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

const parseTags = (raw?: string) =>
  raw
    ? raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

const resolveSearchParams = async (
  searchParams?: CatalogSearchParams | Promise<CatalogSearchParams>
): Promise<CatalogSearchParams> => {
  if (!searchParams) return {};
  if (typeof (searchParams as { then?: unknown }).then === "function") {
    return ((await searchParams) as CatalogSearchParams) || {};
  }
  return searchParams as CatalogSearchParams;
};

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

const buildStructuredData = (items: CatalogItem[], totalCount: number) => {
  const baseUrl = getBaseUrl();

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Catalog",
    description: CATALOG_DESCRIPTION,
    url: `${baseUrl}/catalog`,
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Catalog items",
    numberOfItems: totalCount,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.slug ? `${baseUrl}/catalog/${item.slug}` : `${baseUrl}/catalog`,
      name: item.title || `Catalog item ${index + 1}`,
      description: item.summary || item.description || "",
    })),
  };

  return [collectionSchema, itemListSchema];
};

const CatalogPage = async ({
  searchParams,
}: {
  searchParams?: CatalogSearchParams | Promise<CatalogSearchParams>;
}) => {
  const catalogHeroBanner = await getHeroBannerByPlacement("catalogpagehero", null);
  const resolvedParams = await resolveSearchParams(searchParams);
  const categoryParam = parseParam(resolvedParams.category);
  const category = categoryParam && categoryParam !== "all" ? categoryParam : "";
  const fileTypeParam = parseParam(resolvedParams.fileType);
  const fileType = fileTypeParam && fileTypeParam !== "all" ? fileTypeParam : "";
  const tags = parseTags(parseParam(resolvedParams.tags));
  const searchQuery = parseParam(resolvedParams.search);
  const sortParam = parseParam(resolvedParams.sort);
  const sort =
    SORT_OPTIONS.find((option) => option.value === sortParam)?.value || DEFAULT_SORT;
  const pageParam = parseParam(resolvedParams.page);
  const parsedPage = Number.parseInt(pageParam || "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const productCategories = await getRootCategoriesForNav();
  const categoryPreview = Array.isArray(productCategories)
    ? (productCategories as CategoryPreview[]).slice(0, 6)
    : [];

  let catalogData: Awaited<ReturnType<typeof getCatalogItems>> | null = null;
  let loadError: string | null = null;

  try {
    catalogData = await getCatalogItems({
      category: category || undefined,
      search: searchQuery || undefined,
      sort,
      limit: ITEMS_PER_PAGE,
      offset,
      fileType: fileType || undefined,
      tags: tags.length ? tags : undefined,
    });
  } catch (error) {
    console.error("Failed to load catalog items:", error);
    loadError = "client.catalog.error.loadFailed";
  }

  const items: CatalogItem[] = Array.isArray(catalogData?.items)
    ? (catalogData?.items as CatalogItem[])
    : [];
  const totalCount = catalogData?.totalCount ?? items.length ?? 0;
  const totalPages =
    catalogData?.totalPages ??
    (totalCount > 0 ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0);
  const normalizedPage = Math.min(
    Math.max(catalogData?.currentPage ?? page, 1),
    Math.max(totalPages, 1)
  );

  const categoryOptions = Array.from(
    new Set(
      items
        .map((item) => item.metadata?.category)
        .filter((value): value is string => Boolean(value))
    )
  );
  if (category && !categoryOptions.includes(category)) {
    categoryOptions.unshift(category);
  }
  const categoryCount = categoryOptions.length;

  const fileTypeOptions = Array.from(
    new Set(
      items
        .map(
          (item) =>
            item.metadata?.fileType ||
            item.file?.asset?.metadata?.mimeType ||
            ""
        )
        .filter((value): value is string => Boolean(value))
    )
  );
  if (fileType && !fileTypeOptions.includes(fileType)) {
    fileTypeOptions.unshift(fileType);
  }

  const tagOptions = Array.from(
    new Set(
      items.flatMap((item) => item.metadata?.tags || []).filter(Boolean)
    )
  );
  tags.forEach((tag) => {
    if (!tagOptions.includes(tag)) {
      tagOptions.push(tag);
    }
  });

  const structuredData = buildStructuredData(items, totalCount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <CatalogHeroClient
        totalCount={totalCount}
        categoryCount={categoryCount}
        showHeroCard={!catalogHeroBanner}
      />

      {catalogHeroBanner ? (
        <HeroBanner
          placement="catalogpagehero"
          banner={catalogHeroBanner}
          className="mt-6"
        />
      ) : null}

      <Container className="pb-12 space-y-10">
        <CatalogCategoryOverview categories={categoryPreview} />

        <CatalogPageClient
          items={items}
          totalCount={totalCount}
          totalPages={totalPages}
          currentPage={normalizedPage}
          limit={ITEMS_PER_PAGE}
          filters={{
            categories: categoryOptions,
            fileTypes: fileTypeOptions,
            tags: tagOptions,
          }}
          initialFilters={{
            category,
            fileType,
            tags,
            search: searchQuery || "",
            sort,
            page: normalizedPage,
          }}
          sortOptions={SORT_OPTIONS}
          errorMessage={loadError}
        />
      </Container>
    </div>
  );
};

export default CatalogPage;
