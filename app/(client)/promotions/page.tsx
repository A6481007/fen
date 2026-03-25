import type { Metadata } from "next";
import PromotionsPageClient from "./PromotionsPageClient";
import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import { getActivePromotions } from "@/sanity/queries/promotions";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type PromotionType = "flashSale" | "seasonal" | "bundle" | "loyalty" | "deal";
type SortKey = "priority" | "ending" | "newest" | "discount";

type PromotionsSearchParams = {
  type?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type FilterCounts = {
  all: number;
  flashSale: number;
  seasonal: number;
  bundle: number;
  loyalty: number;
  deal: number;
};

const PROMOTION_TYPES: PromotionType[] = ["flashSale", "seasonal", "bundle", "loyalty", "deal"];
const SORT_OPTIONS: SortKey[] = ["priority", "ending", "newest", "discount"];

const PER_PAGE = 12;

const baseMetadata: Metadata = {
  title: "Promotions & Deals | ShopCart",
  description: "Browse our current promotions, flash sales, and exclusive deals.",
  openGraph: {
    title: "Current Promotions & Deals",
    description: "Discover limited-time offers and save on your favorite products.",
  },
  alternates: {
    canonical: "/promotions",
  },
};

const parseParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value || "");

const normalizeType = (value?: string | string[]): PromotionType | undefined => {
  const raw = parseParam(value).trim();
  return PROMOTION_TYPES.includes(raw as PromotionType) ? (raw as PromotionType) : undefined;
};

const normalizeSort = (value?: string | string[]): SortKey => {
  const raw = parseParam(value).trim();
  return SORT_OPTIONS.includes(raw as SortKey) ? (raw as SortKey) : "priority";
};

const normalizePage = (value?: string | string[]) => {
  const raw = parseParam(value);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const buildQueryString = (params: { type?: PromotionType; sort?: SortKey; page?: number }) => {
  const search = new URLSearchParams();

  if (params.type) search.set("type", params.type);
  if (params.sort && params.sort !== "priority") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", params.page.toString());

  return search.toString();
};

function sortPromotions(promotions: Promotion[], sort: SortKey) {
  switch (sort) {
    case "ending":
      return [...promotions].sort((a, b) => {
        const aEnd = new Date(a.endDate || "").getTime();
        const bEnd = new Date(b.endDate || "").getTime();
        return (Number.isFinite(aEnd) ? aEnd : Number.MAX_SAFE_INTEGER) -
          (Number.isFinite(bEnd) ? bEnd : Number.MAX_SAFE_INTEGER);
      });
    case "newest":
      return [...promotions].sort((a, b) => {
        const aStart = new Date(a.startDate || "").getTime();
        const bStart = new Date(b.startDate || "").getTime();
        return (Number.isFinite(bStart) ? bStart : 0) - (Number.isFinite(aStart) ? aStart : 0);
      });
    case "discount":
      return [...promotions].sort(
        (a, b) => (b.discountValue ?? 0) - (a.discountValue ?? 0)
      );
    case "priority":
    default:
      return [...promotions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
}

const buildCounts = (promotions: Promotion[]): FilterCounts => ({
  all: promotions.length,
  flashSale: promotions.filter((promo) => promo?.type === "flashSale").length,
  seasonal: promotions.filter((promo) => promo?.type === "seasonal").length,
  bundle: promotions.filter((promo) => promo?.type === "bundle").length,
  loyalty: promotions.filter((promo) => promo?.type === "loyalty").length,
  deal: promotions.filter((promo) => (promo?.type as string) === "deal").length,
});

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: PromotionsSearchParams | Promise<PromotionsSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const type = normalizeType(resolvedSearchParams?.type);
  const sort = normalizeSort(resolvedSearchParams?.sort);
  const page = normalizePage(resolvedSearchParams?.page);

  const canonicalQuery = buildQueryString({
    type,
    sort,
    page,
  });

  return {
    ...baseMetadata,
    alternates: {
      canonical: canonicalQuery ? `/promotions?${canonicalQuery}` : "/promotions",
    },
  };
}

const PromotionsPage = async ({ searchParams }: { searchParams?: PromotionsSearchParams | Promise<PromotionsSearchParams> }) => {
  const heroBanner = await getHeroBannerByPlacement("promotionspagehero", "sitewidepagehero");
  const resolvedSearchParams = await searchParams;
  const currentType = normalizeType(resolvedSearchParams?.type);
  const currentSort = normalizeSort(resolvedSearchParams?.sort);
  const requestedPage = normalizePage(resolvedSearchParams?.page);

  const promotions = (await getActivePromotions())?.filter(Boolean) as Promotion[];
  const counts = buildCounts(promotions);

  const filtered = currentType ? promotions.filter((promo) => promo?.type === currentType) : promotions;
  const sorted = sortPromotions(filtered, currentSort);

  const totalItems = sorted.length;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / PER_PAGE) : 1;
  const currentPage = Math.min(Math.max(requestedPage, 1), Math.max(totalPages, 1));
  const offset = (currentPage - 1) * PER_PAGE;
  const paginated = sorted.slice(offset, offset + PER_PAGE);
  const featured = sorted[0];

  return (
    <>
      {heroBanner ? (
        <HeroBanner placement="promotionspagehero" banner={heroBanner} />
      ) : null}
      <PromotionsPageClient
        counts={counts}
        currentType={currentType}
        currentSort={currentSort}
        currentPage={currentPage}
        totalPages={totalPages}
        featured={featured}
        promotions={paginated}
        showHeroHeader={!heroBanner}
      />
    </>
  );
};

export default PromotionsPage;
