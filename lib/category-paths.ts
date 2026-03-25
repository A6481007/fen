import type { Category, Product } from "@/sanity.types";

type CategoryMaps = { byId: Map<string, Category>; bySlug: Map<string, Category> };
export type CategoryTrailItem = {
  title: string;
  slug?: string;
  isParent?: boolean;
  depth?: number;
};

export const buildCategoryMaps = (categories: Category[]): CategoryMaps => {
  const byId = new Map<string, Category>();
  const bySlug = new Map<string, Category>();

  categories.forEach((cat) => {
    if (cat?._id) byId.set(cat._id, cat);
    const slug = cat?.slug?.current;
    if (slug) bySlug.set(slug, cat);
  });

  return { byId, bySlug };
};

export const buildCategoryPath = (
  category: Category | null | undefined,
  maps: CategoryMaps
): Category[] => {
  if (!category) return [];

  const path: Category[] = [];
  const seen = new Set<string>();
  let cursor: Category | null | undefined = category;

  while (cursor) {
    path.unshift(cursor);

    const cursorId = cursor._id;
    if (cursorId) {
      if (seen.has(cursorId)) break;
      seen.add(cursorId);
    }

    const parentId = (cursor.parentCategory as Category | undefined)?._id;
    if (!parentId) break;

    cursor = maps.byId.get(parentId) || (cursor.parentCategory as Category | undefined) || null;
  }

  return path;
};

export const getCategoryPathBySlug = (
  slug: string | undefined,
  maps: CategoryMaps
): Category[] => {
  if (!slug) return [];
  const category = maps.bySlug.get(slug);
  return category ? buildCategoryPath(category, maps) : [];
};

export const getDeepestProductCategoryPath = (
  product: Product | null,
  maps: CategoryMaps
): Category[] => {
  if (!product?.categories?.length) return [];

  let bestPath: Category[] = [];

  (product.categories as Array<Category | { _ref?: string }>).forEach((rawCategory) => {
    const candidateId = (rawCategory as Category)?._id || (rawCategory as { _ref?: string })?._ref;
    const candidateSlug = (rawCategory as Category)?.slug?.current;
    const candidate =
      (candidateId && maps.byId.get(candidateId)) ||
      (candidateSlug && maps.bySlug.get(candidateSlug)) ||
      (rawCategory as Category);

    const path = buildCategoryPath(candidate, maps);
    const currentDepth = path[path.length - 1]?.depth ?? 0;
    const bestDepth = bestPath[bestPath.length - 1]?.depth ?? 0;

    if (path.length > bestPath.length || (path.length === bestPath.length && currentDepth > bestDepth)) {
      bestPath = path;
    }
  });

  return bestPath;
};

export const toCategoryTrail = (path: Category[]): CategoryTrailItem[] =>
  path.map((cat) => ({
    title: cat.title || cat.slug?.current || "Category",
    slug: cat.slug?.current,
    depth: cat.depth,
    isParent: cat.isParentCategory || cat.depth === 0,
  }));
