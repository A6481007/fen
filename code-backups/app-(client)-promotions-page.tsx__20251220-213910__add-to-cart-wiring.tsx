import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PromotionHero from "@/components/promotions/PromotionHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination as Pager,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getActivePromotions } from "@/sanity/queries";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import { ArrowUpRight, CalendarClock, Clock3, Percent, Sparkles, Tag } from "lucide-react";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type PromotionType = "flashSale" | "seasonal" | "bundle" | "loyalty";
type PromotionState = "active" | "scheduled" | "ended" | "paused";
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
};

const PROMOTION_TYPES: { label: string; value?: PromotionType }[] = [
  { label: "All", value: undefined },
  { label: "Flash Sales", value: "flashSale" },
  { label: "Seasonal", value: "seasonal" },
  { label: "Bundles", value: "bundle" },
  { label: "VIP Only", value: "loyalty" },
];

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Top priority", value: "priority" },
  { label: "Ending soon", value: "ending" },
  { label: "Newest", value: "newest" },
  { label: "Highest discount", value: "discount" },
];

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
  return PROMOTION_TYPES.some((option) => option.value === raw) ? (raw as PromotionType) : undefined;
};

const normalizeSort = (value?: string | string[]): SortKey => {
  const raw = parseParam(value).trim();
  return SORT_OPTIONS.some((option) => option.value === raw) ? (raw as SortKey) : "priority";
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

const getPromotionImage = (promotion: Promotion) => {
  const hero = promotion.heroImage as { asset?: { url?: string }; url?: string } | undefined;
  const thumb = promotion.thumbnailImage as { asset?: { url?: string }; url?: string } | undefined;
  return hero?.asset?.url || hero?.url || thumb?.asset?.url || thumb?.url || "";
};

const deriveState = (promotion: Promotion): PromotionState => {
  const now = Date.now();
  const startMs = promotion.startDate ? new Date(promotion.startDate).getTime() : NaN;
  const endMs = promotion.endDate ? new Date(promotion.endDate).getTime() : NaN;

  const hasEnded =
    promotion.status === "ended" ||
    promotion.isExpired === true ||
    (Number.isFinite(endMs) && endMs < now);
  const isPaused = promotion.status === "paused";
  const isScheduled =
    promotion.status === "scheduled" ||
    promotion.isUpcoming === true ||
    (!hasEnded && Number.isFinite(startMs) && startMs > now);

  if (hasEnded) return "ended";
  if (isPaused) return "paused";
  if (isScheduled) return "scheduled";
  return "active";
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
});

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatDiscount = (promotion: Promotion) => {
  if (promotion.discountType === "percentage" && typeof promotion.discountValue === "number") {
    return `${Math.round(promotion.discountValue)}% off`;
  }

  if (promotion.discountType === "fixed" && typeof promotion.discountValue === "number") {
    return `$${promotion.discountValue.toFixed(2)} off`;
  }

  if (promotion.discountType === "freeShipping") {
    return "Free shipping";
  }

  return null;
};

const buildPageList = (totalPages: number, currentPage: number) => {
  if (totalPages <= 1) return [1];

  const pages: Array<number | "ellipsis"> = [];
  const addPage = (page: number) => {
    if (!pages.includes(page)) pages.push(page);
  };

  addPage(1);

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page += 1) addPage(page);
  if (end < totalPages - 1) pages.push("ellipsis");
  if (totalPages > 1) addPage(totalPages);

  return pages;
};

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

const PromotionFilters = ({
  currentType,
  currentSort,
  counts,
  buildUrl,
}: {
  currentType?: PromotionType;
  currentSort: SortKey;
  counts: FilterCounts;
  buildUrl: (params: { type?: PromotionType; sort?: SortKey; page?: number }) => string;
}) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Promotion type">
      {PROMOTION_TYPES.map((tab) => {
        const isActive = currentType === tab.value || (!currentType && !tab.value);
        const href = buildUrl({ type: tab.value, sort: currentSort, page: 1 });
        const count =
          tab.value === "flashSale"
            ? counts.flashSale
            : tab.value === "seasonal"
              ? counts.seasonal
              : tab.value === "bundle"
                ? counts.bundle
                : tab.value === "loyalty"
                  ? counts.loyalty
                  : counts.all;

        return (
          <Link
            key={tab.label}
            href={href}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:text-emerald-700"
            }`}
            role="tab"
            aria-selected={isActive}
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {count}
            </span>
          </Link>
        );
      })}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-700">Sort by:</span>
      {SORT_OPTIONS.map((option) => {
        const isActive = currentSort === option.value;
        const href = buildUrl({ type: currentType, sort: option.value, page: 1 });

        return (
          <Button
            key={option.value}
            asChild
            size="sm"
            variant={isActive ? "default" : "outline"}
            className={isActive ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}
          >
            <Link href={href}>{option.label}</Link>
          </Button>
        );
      })}
    </div>
  </div>
);

const PromotionCard = ({ promotion }: { promotion: Promotion }) => {
  const discount = formatDiscount(promotion);
  const endDate = formatDate(promotion.endDate);
  const href = promotion.campaignId ? `/promotions/${promotion.campaignId}` : undefined;
  const imageUrl = getPromotionImage(promotion);
  const state = deriveState(promotion);

  return (
    <Card className="group h-full overflow-hidden border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={promotion.name || "Promotion"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold uppercase tracking-wide text-white/80">
            Creative coming soon
          </div>
        )}
        {promotion.badgeLabel ? (
          <Badge className="absolute left-3 top-3 bg-white/90 text-gray-900 shadow">
            {promotion.badgeLabel}
          </Badge>
        ) : null}
      </div>

      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {promotion.type || "Promotion"}
          </Badge>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {state === "active" ? "Live" : state === "scheduled" ? "Scheduled" : "Paused"}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {promotion.name || "Untitled promotion"}
          </h3>
          {promotion.shortDescription || promotion.heroMessage ? (
            <p className="text-sm text-gray-600 line-clamp-2">
              {promotion.shortDescription || promotion.heroMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-gray-700">
          {discount ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
              <Percent className="h-4 w-4" />
              {discount}
            </span>
          ) : null}

          {endDate ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">
              <Clock3 className="h-4 w-4" />
              Ends {endDate}
            </span>
          ) : null}

          {promotion.badgeColor || promotion.badgeLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              <Tag className="h-4 w-4" />
              {promotion.badgeLabel || "Featured"}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {promotion.campaignId ? `Campaign ${promotion.campaignId}` : "Active promotion"}
          </div>
          {href ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={href}>
                View offer
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const PromotionPagination = ({
  currentPage,
  totalPages,
  buildUrl,
  disablePrev,
  disableNext,
}: {
  currentPage: number;
  totalPages: number;
  buildUrl: (params: { page: number }) => string;
  disablePrev?: boolean;
  disableNext?: boolean;
}) => (
  <Pager className="mt-6">
    <PaginationContent>
      <PaginationItem>
        <PaginationPrevious
          href={buildUrl({ page: Math.max(1, currentPage - 1) })}
          className={disablePrev ? "pointer-events-none opacity-50" : undefined}
        />
      </PaginationItem>

      {buildPageList(totalPages, currentPage).map((pageNumber, index) => {
        if (pageNumber === "ellipsis") {
          return (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          );
        }

        return (
          <PaginationItem key={pageNumber}>
            <PaginationLink href={buildUrl({ page: pageNumber })} isActive={pageNumber === currentPage}>
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        );
      })}

      <PaginationItem>
        <PaginationNext
          href={buildUrl({ page: Math.min(totalPages, currentPage + 1) })}
          className={disableNext ? "pointer-events-none opacity-50" : undefined}
        />
      </PaginationItem>
    </PaginationContent>
  </Pager>
);

const EmptyState = () => (
  <Card className="border border-dashed border-gray-200 bg-white/70">
    <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
      <Sparkles className="h-8 w-8 text-emerald-600" />
      <h3 className="text-lg font-bold text-gray-900">No promotions available</h3>
      <p className="max-w-md text-sm text-gray-600">
        Check back soon for new deals and exclusive offers curated for you.
      </p>
    </CardContent>
  </Card>
);

const PageHero = ({ total }: { total: number }) => (
  <div className="rounded-3xl border border-gray-100 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-xl">
    <div className="grid gap-6 p-7 sm:grid-cols-[1.4fr,1fr] sm:p-10">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          <Sparkles className="h-4 w-4" />
          Promotions
        </div>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Current promotions and limited-time offers
        </h1>
        <p className="max-w-2xl text-sm text-white/85 sm:text-base">
          Discover flash sales, seasonal bundles, and VIP-only drops. We surface the highest-priority
          deals first so you never miss a moment to save.
        </p>
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-white/90 text-emerald-800">
            {total.toString().padStart(2, "0")} live {total === 1 ? "offer" : "offers"}
          </Badge>
          <Badge variant="outline" className="border-white/50 text-white">
            Updated in real time
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-4 sm:grid-cols-1">
        <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 text-emerald-800 shadow">
          <Percent className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Savings</p>
            <p className="text-lg font-bold">Stackable deals</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50/30 px-4 py-3 text-white ring-1 ring-white/30">
          <CalendarClock className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Timing</p>
            <p className="text-lg font-bold">Ending soon curated</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PromotionsPage = async ({ searchParams }: { searchParams?: PromotionsSearchParams | Promise<PromotionsSearchParams> }) => {
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

  const buildUrl = ({
    type = currentType,
    sort = currentSort,
    page = currentPage,
  }: {
    type?: PromotionType;
    sort?: SortKey;
    page?: number;
  }) => {
    const query = buildQueryString({
      type: type || undefined,
      sort,
      page,
    });
    return query ? `/promotions?${query}` : "/promotions";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="space-y-8 py-10 lg:space-y-10 lg:py-14">
        <PageHero total={counts.all} />

        {featured ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Featured</p>
                <h2 className="text-xl font-bold text-gray-900">Highest-priority promotion</h2>
              </div>
              {featured?.campaignId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/promotions/${featured.campaignId}`}>View details</Link>
                </Button>
              ) : null}
            </div>
            <PromotionHero
              promotion={featured}
              state={deriveState(featured)}
            />
          </section>
        ) : null}

        <PromotionFilters
          currentType={currentType}
          currentSort={currentSort}
          counts={counts}
          buildUrl={(params) => buildUrl({ ...params, page: 1 })}
        />

        {paginated.length > 0 ? (
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((promotion) => (
                <PromotionCard key={promotion._id || promotion.campaignId} promotion={promotion} />
              ))}
            </div>

            {totalPages > 1 ? (
              <PromotionPagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildUrl={({ page }) => buildUrl({ page })}
                disablePrev={currentPage <= 1}
                disableNext={currentPage >= totalPages}
              />
            ) : null}
          </section>
        ) : (
          <EmptyState />
        )}
      </Container>
    </main>
  );
};

export default PromotionsPage;
