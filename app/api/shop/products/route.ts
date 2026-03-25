import { NextRequest, NextResponse } from "next/server";
import { sanityFetch } from "@/sanity/lib/live";

const ACTIVE_DEAL_PROJECTION = `
  "activeDeal": *[
    _type == "deal"
    && status == "active"
    && references(^._id)
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now()))
  ] | order(coalesce(priority, 0) desc)[0]{
    _id,
    dealId,
    dealType,
    title,
    status,
    priority,
    startDate,
    endDate,
    originalPrice,
    dealPrice,
    badge,
    badgeColor,
    quantityLimit,
    perCustomerLimit,
    soldCount,
    "discountPercent": select(
      coalesce(originalPrice, ^.price) > 0 => round(
        (coalesce(originalPrice, ^.price) - coalesce(dealPrice, originalPrice, ^.price))
        / coalesce(originalPrice, ^.price) * 100
      ),
      0
    ),
    "remainingQty": coalesce(quantityLimit, 999999) - coalesce(soldCount, 0)
  }
`;

const BASE_PROJECTION = `
  ...,
  brand->{_id,title,slug},
  categories[]{
    _ref,
    ...@->{
      _id,
      title,
      slug,
      isParentCategory,
      parentCategory->{_id,title,slug,isParentCategory}
    }
  },
  ${ACTIVE_DEAL_PROJECTION}
`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCategories = searchParams.get("categories") || "";
  const categorySlugs = rawCategories.split(",").filter(Boolean);
  const brandSlug = searchParams.get("brand") || "";
  const search = (searchParams.get("q") || "").trim();
  const sort = (searchParams.get("sort") || "newest").trim();
  const inStock = searchParams.get("inStock") === "1" || searchParams.get("inStock") === "true";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(50, Number.parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  // Price filters only if explicitly provided
  const hasPrice =
    searchParams.has("minPrice") || searchParams.has("maxPrice") || Boolean(searchParams.get("priceRange"));
  const minPrice = hasPrice ? Number(searchParams.get("minPrice") || "0") : 0;
  const maxPrice = hasPrice ? Number(searchParams.get("maxPrice") || "1000000000") : 1000000000;

  const filters = ['_type == "product"'];
  if (categorySlugs.length) {
    filters.push('references(*[_type == "category" && slug.current in $categorySlugs]._id)');
  }
  if (brandSlug) {
    filters.push('brand->slug.current == $brandSlug');
  }
  if (hasPrice) {
    filters.push("coalesce(price, 0) >= $minPrice && coalesce(price, 0) <= $maxPrice");
  }
  if (inStock) {
    filters.push("coalesce(stock, 0) > 0");
  }
  if (search) {
    filters.push("name match $search || description match $search || sku match $search");
  }
  const whereClause = filters.join(" && ");

  const sortClause =
    sort === "price-asc"
      ? "price asc"
      : sort === "price-desc"
      ? "price desc"
      : sort === "name-asc"
      ? "name asc"
      : sort === "name-desc"
      ? "name desc"
      : sort === "popularity"
      ? "coalesce(totalReviews,0) desc, _createdAt desc"
      : "_createdAt desc";

  const query = `
  {
    "items": *[${whereClause}] | order(${sortClause})[$offset...$offset+$limit]{
      ${BASE_PROJECTION}
    },
    "total": count(*[${whereClause}])
  }`;

  try {
    const { data } = await sanityFetch({
      query,
      params: {
        categorySlugs,
        brandSlug,
        minPrice,
        maxPrice,
        search: search ? `${search}*` : "",
        offset,
        limit,
        inStock,
      },
    });
    return NextResponse.json({ items: data?.items ?? [], total: data?.total ?? 0 });
  } catch (error) {
    console.error("Failed to fetch shop products", error);
    return NextResponse.json({ items: [], total: 0, error: "fetch_failed" }, { status: 500 });
  }
}
