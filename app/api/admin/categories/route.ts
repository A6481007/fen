import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { backendClient } from "@/sanity/lib/backendClient";
import { slugify } from "@/lib/slugify";
import { ADMIN_CATEGORIES_QUERY } from "@/sanity/queries/query";

const hasWriteToken =
  typeof process.env.SANITY_API_TOKEN === "string" &&
  process.env.SANITY_API_TOKEN.trim().length > 0;

const normalizeString = (value?: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

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

const getParentDepth = async (parentId: string) => {
  const result = await backendClient.fetch<{ depth?: number } | null>(
    '*[_type == "category" && _id == $id][0]{depth}',
    { id: parentId }
  );
  if (!result) return null;
  const depth = typeof result.depth === "number" ? result.depth : 0;
  return depth;
};

export async function GET() {
  const adminError = await ensureAdmin();
  if (adminError) return adminError;

  try {
    const categories = await backendClient.fetch(ADMIN_CATEGORIES_QUERY);
    return NextResponse.json({ categories: categories ?? [] });
  } catch (error) {
    console.error("Error fetching admin categories:", error);
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
        error: "Category creation is temporarily unavailable.",
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

  const title = normalizeString(body?.title);
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const slugValue = normalizeString(body?.slug) || slugify(title);
  if (!slugValue) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const isParentCategory = toBoolean(body?.isParentCategory, false);
  const parentCategoryId = normalizeString(body?.parentCategoryId) || undefined;

  if (isParentCategory && parentCategoryId) {
    return NextResponse.json(
      { error: "Parent categories cannot have a parent category." },
      { status: 400 }
    );
  }

  if (!isParentCategory && !parentCategoryId) {
    return NextResponse.json(
      { error: "Subcategories must select a parent category." },
      { status: 400 }
    );
  }

  const slugExists = await backendClient.fetch<number>(
    'count(*[_type == "category" && slug.current == $slug])',
    { slug: slugValue }
  );
  if (slugExists > 0) {
    return NextResponse.json(
      { error: "Slug already exists. Choose a unique slug." },
      { status: 409 }
    );
  }

  let depth = 0;
  if (parentCategoryId) {
    const parentDepth = await getParentDepth(parentCategoryId);
    if (parentDepth === null) {
      return NextResponse.json(
        { error: "Parent category not found." },
        { status: 400 }
      );
    }
    depth = parentDepth + 1;
  }

  const displayOrder = toNumber(body?.displayOrder);
  const isActive = toBoolean(body?.isActive, true);
  const featured = toBoolean(body?.featured, false);
  const description = normalizeString(body?.description) || undefined;

  try {
    const category = await backendClient.create({
      _type: "category",
      title,
      slug: { _type: "slug", current: slugValue },
      description,
      isActive,
      featured,
      isParentCategory,
      depth,
      ...(typeof displayOrder === "number" ? { displayOrder } : {}),
      ...(parentCategoryId
        ? { parentCategory: { _type: "reference", _ref: parentCategoryId } }
        : {}),
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 }
    );
  }
}
