import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { client } from "@/sanity/lib/client";
import { backendClient } from "@/sanity/lib/backendClient";
import { slugify } from "@/lib/slugify";

const hasWriteToken =
  typeof process.env.SANITY_API_TOKEN === "string" &&
  process.env.SANITY_API_TOKEN.trim().length > 0;

const normalizeString = (value?: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const ensureAdmin = async () => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized - Not logged in" },
      { status: 401 }
    );
  }

  const clerk = await clerkClient();
  const currentUser = await clerk.users.getUser(userId);
  const userEmail = currentUser.primaryEmailAddress?.emailAddress;

  if (!userEmail || !isUserAdmin(userEmail)) {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }

  return null;
};

const getCategoryAncestors = async (categoryId: string) => {
  const ancestors: string[] = [];
  const visited = new Set<string>();
  let cursor: string | null = categoryId;

  while (cursor) {
    const result: { parentId?: string } | null = await backendClient.fetch<{ parentId?: string } | null>(
      '*[_type == "category" && _id == $id][0]{ "parentId": parentCategory->_id }',
      { id: cursor }
    );
    const parentId: string | undefined = result?.parentId;
    if (!parentId || visited.has(parentId)) break;
    ancestors.push(parentId);
    visited.add(parentId);
    cursor = parentId;
  }

  return ancestors;
};

export async function GET(req: NextRequest) {
  try {
    const adminError = await ensureAdmin();
    if (adminError) return adminError;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "_createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    console.log("API Params - category:", category, "search:", search);

    // If requesting a specific product by ID, return full details
    if (productId) {
      const productQuery = `
        *[_type == "product" && _id == "${productId}"][0] {
          _id,
          _type,
          _createdAt,
          _updatedAt,
          _rev,
          name,
          slug,
          description,
          price,
          discount,
          stock,
          images[]{
            ...,
            asset->{
              _id,
              url
            }
          },
          categories[]->{
            _id,
            title,
            slug
          },
          brand->{
            _id,
            title,
            slug
          },
          status,
          variant->{
            _id,
            title,
            slug
          },
          isFeatured
        }
      `;

      const product = await client.fetch(productQuery);

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Transform the data to match our interface
      const transformedProduct = {
        ...product,
        category: product.categories?.[0]
          ? {
              _id: product.categories[0]._id,
              name: product.categories[0].title,
              title: product.categories[0].title,
              slug: product.categories[0].slug,
            }
          : null,
        brand: product.brand
          ? {
              _id: product.brand._id,
              name: product.brand.title,
              title: product.brand.title,
              slug: product.brand.slug,
            }
          : null,
        featured: product.isFeatured,
      };

      return NextResponse.json({ product: transformedProduct });
    }

    // Build filter conditions
    const filterConditions = [];
    if (category) {
      // Use references to filter by category
      filterConditions.push(
        `references(*[_type == "category" && title == "${category}"]._id)`
      );
    }
    if (search) {
      filterConditions.push(
        `(name match "${search}*" || description match "${search}*")`
      );
    } // Build GROQ query
    const query = `
      *[_type == "product"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }] | order(${sortBy} ${sortOrder}) [${offset}...${offset + limit}] {
        _id,
        _createdAt,
        name,
        description,
        price,
        stock,
        images[]{
          asset->{
            _id,
            url
          },
          alt
        },
        "category": categories[0]->{
          _id,
          "name": title,
          "title": title
        },
        "categories": categories[]->{
          _id,
          "name": title,
          "title": title
        },
        brand-> {
          _id,
          "name": title
        },
        "featured": isFeatured,
        status
      }
    `;

    // Get count query
    const countQuery = `
      count(*[_type == "product"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }])
    `;

    // Execute queries
    const [products, totalCount] = await Promise.all([
      client.fetch(query),
      client.fetch(countQuery),
    ]);

    return NextResponse.json({
      products,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const adminError = await ensureAdmin();
  if (adminError) return adminError;

  if (!hasWriteToken) {
    return NextResponse.json(
      {
        error: "Product creation is temporarily unavailable.",
        reason: "Missing SANITY_API_TOKEN with write permissions.",
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const name = normalizeString(body?.name);
  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  const price = toNumber(body?.price);
  if (typeof price !== "number" || price < 0) {
    return NextResponse.json({ error: "Valid price is required." }, { status: 400 });
  }

  const discount = toNumber(body?.discount);
  if (typeof discount !== "number" || discount < 0) {
    return NextResponse.json({ error: "Valid discount is required." }, { status: 400 });
  }

  const unit = normalizeString(body?.unit);
  if (!unit) {
    return NextResponse.json({ error: "Unit is required." }, { status: 400 });
  }

  const variantId = normalizeString(body?.variantId);
  if (!variantId) {
    return NextResponse.json({ error: "Product type is required." }, { status: 400 });
  }

  const rawCategoryIds = Array.isArray(body?.categoryIds)
    ? (body?.categoryIds as Array<unknown>).map(normalizeString).filter(Boolean)
    : [];
  const primaryCategoryId =
    normalizeString(body?.primaryCategoryId) || rawCategoryIds[0];

  if (!primaryCategoryId) {
    return NextResponse.json(
      { error: "Primary category is required." },
      { status: 400 }
    );
  }

  const primaryCategoryExists = await backendClient.fetch<number>(
    'count(*[_type == "category" && _id == $id])',
    { id: primaryCategoryId }
  );
  if (primaryCategoryExists === 0) {
    return NextResponse.json(
      { error: "Primary category not found." },
      { status: 400 }
    );
  }

  const slugValue = normalizeString(body?.slug) || slugify(name);
  if (!slugValue) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const slugExists = await backendClient.fetch<number>(
    'count(*[_type == "product" && slug.current == $slug])',
    { slug: slugValue }
  );
  if (slugExists > 0) {
    return NextResponse.json(
      { error: "Slug already exists. Choose a unique slug." },
      { status: 409 }
    );
  }

  const ancestors = await getCategoryAncestors(primaryCategoryId);
  const categoryIds = Array.from(
    new Set([...rawCategoryIds, primaryCategoryId, ...ancestors])
  );

  const brandId = normalizeString(body?.brandId) || undefined;
  const status = normalizeString(body?.status) || undefined;
  const description = normalizeString(body?.description) || undefined;
  const sku = normalizeString(body?.sku) || undefined;
  const stock = toNumber(body?.stock);
  const isFeatured = toBoolean(body?.isFeatured, false);

  try {
    const product = await backendClient.create({
      _type: "product",
      name,
      slug: { _type: "slug", current: slugValue },
      description,
      price,
      discount,
      sku,
      unit,
      stock: typeof stock === "number" && stock >= 0 ? stock : 0,
      status: status || undefined,
      isFeatured,
      categories: categoryIds.map((id) => ({ _type: "reference", _ref: id })),
      primaryCategory: { _type: "reference", _ref: primaryCategoryId },
      brand: brandId ? { _type: "reference", _ref: brandId } : undefined,
      variant: { _type: "reference", _ref: variantId },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product." },
      { status: 500 }
    );
  }
}
