import type { SanityClient } from "sanity";

const CATEGORY_BASE_QUERY = `
*[_type == "category"]{
  _id,
  title,
  "slug": slug.current,
  depth,
  parentCategory,
  isActive,
  displayOrder,
  isParentCategory,
  "productCount": count(*[_type == "product" && references(^._id)])
}
`;

const MAX_CATEGORY_DEPTH = 2;

interface RawCategoryDocument {
  _id: string;
  title?: string;
  slug?: string | { current?: string | null } | null;
  depth?: number | null;
  parentCategory?: { _ref?: string | null } | null;
  isActive?: boolean | null;
  displayOrder?: number | null;
  isParentCategory?: boolean | null;
  productCount?: number | null;
}

interface NormalizedCategory {
  id: string;
  documentId: string;
  title: string;
  slug: string;
  depth: number;
  parentId?: string;
  isActive: boolean;
  displayOrder: number;
  productCount: number;
}

export interface CategoryTreeNode {
  id: string;
  title: string;
  slug: string;
  depth: number;
  isActive: boolean;
  displayOrder: number;
  children: CategoryTreeNode[];
}

export interface CategoryTreeOptions {
  includeInactive?: boolean;
  maxDepth?: number;
  sortBy?: "displayOrder" | "title";
}

export interface CategoryBreadcrumbResult {
  path: string[];
  slugPath: string[];
  depthPath: number[];
}

export interface CategoryHierarchyError {
  categoryId: string;
  type: "circular_reference" | "orphaned" | "invalid_depth";
  message: string;
  path?: string[];
}

export interface CategoryHierarchyValidation {
  valid: boolean;
  errors: CategoryHierarchyError[];
}

export interface MoveCategoryResult {
  movedCount: number;
  newDepths: Record<string, number>;
}

export interface CategoryProductSummary {
  id: string;
  name: string;
  slug: string;
  primaryCategoryId?: string | null;
  categoryIds: string[];
}

export interface CategoryProductsResult {
  categoryIdsQueried: string[];
  products: CategoryProductSummary[];
}

export interface CategoryStats {
  totalCategories: number;
  byDepth: Record<number, number>;
  emptyCategories: Array<{ id: string; title: string; slug: string }>;
}

const normalizeId = (value?: string | null) =>
  typeof value === "string" ? value.replace(/^drafts\./, "") : undefined;

const isDraftId = (value?: string | null) =>
  typeof value === "string" && value.startsWith("drafts.");

const normalizeDepth = (value?: number | null) =>
  typeof value === "number" && !Number.isNaN(value) && value >= 0 ? value : 0;

const normalizeSlug = (value?: RawCategoryDocument["slug"]) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return typeof value.current === "string" ? value.current : "";
};

const normalizeDisplayOrder = (value?: number | null) => {
  if (typeof value === "number" && !Number.isNaN(value) && value >= 0) {
    return value;
  }
  return Number.MAX_SAFE_INTEGER;
};

const buildSorter = (sortBy: CategoryTreeOptions["sortBy"] = "displayOrder") => {
  return (a: CategoryTreeNode, b: CategoryTreeNode) => {
    if (sortBy === "displayOrder") {
      const diff = a.displayOrder - b.displayOrder;
      if (diff !== 0) return diff;
    }
    return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  };
};

const fetchCategories = async (client: SanityClient) => {
  const docs = await client.fetch<RawCategoryDocument[]>(CATEGORY_BASE_QUERY);
  const categories = new Map<string, NormalizedCategory>();

  for (const doc of docs) {
    const normalizedId = normalizeId(doc._id);
    if (!normalizedId) continue;

    const normalizedParent = normalizeId(doc.parentCategory?._ref);
    const normalizedProductCount = typeof doc.productCount === "number" ? Math.max(0, doc.productCount) : 0;
    const normalized: NormalizedCategory = {
      id: normalizedId,
      documentId: doc._id,
      title: doc.title || "Untitled category",
      slug: normalizeSlug(doc.slug),
      depth: normalizeDepth(doc.depth),
      parentId: normalizedParent,
      isActive: doc.isActive !== false,
      displayOrder: normalizeDisplayOrder(doc.displayOrder),
      productCount: normalizedProductCount,
    };

    const existing = categories.get(normalizedId);
    if (!existing) {
      categories.set(normalizedId, normalized);
      continue;
    }

    const mergedProductCount = Math.max(existing.productCount, normalized.productCount);

    if (isDraftId(doc._id) && !isDraftId(existing.documentId)) {
      categories.set(normalizedId, { ...normalized, productCount: mergedProductCount });
    } else if (!isDraftId(existing.documentId)) {
      categories.set(normalizedId, { ...normalized, productCount: mergedProductCount });
    } else {
      categories.set(normalizedId, { ...existing, productCount: mergedProductCount });
    }
  }

  return categories;
};

const buildChildrenMap = (categories: Map<string, NormalizedCategory>) => {
  const children = new Map<string, string[]>();

  for (const category of categories.values()) {
    if (!category.parentId) continue;
    const current = children.get(category.parentId) || [];
    current.push(category.id);
    children.set(category.parentId, current);
  }

  return children;
};

const collectBranchIds = (rootId: string, childrenMap: Map<string, string[]>) => {
  const queue = [rootId];
  const branch: string[] = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    branch.push(current);

    const childIds = childrenMap.get(current) || [];
    queue.push(...childIds);
  }

  return branch;
};

const sortTree = (nodes: CategoryTreeNode[], comparator: (a: CategoryTreeNode, b: CategoryTreeNode) => number) => {
  nodes.sort(comparator);
  nodes.forEach((node) => sortTree(node.children, comparator));
};

const traceAncestry = (
  categoryId: string,
  categories: Map<string, NormalizedCategory>
): { depth: number; cyclePath?: string[]; missingParent?: boolean } => {
  const seen = new Set<string>();
  const path: string[] = [];
  let depth = 0;
  let currentId = categoryId;

  while (true) {
    const current = categories.get(currentId);
    const parentId = current?.parentId;
    if (!parentId) {
      return { depth, cyclePath: undefined, missingParent: false };
    }

    path.push(parentId);
    if (seen.has(parentId)) {
      return { depth, cyclePath: [...path, parentId], missingParent: false };
    }

    seen.add(parentId);
    depth += 1;
    currentId = parentId;

    if (depth > categories.size) {
      return { depth, cyclePath: [...path], missingParent: false };
    }

    if (!categories.has(parentId)) {
      return { depth, cyclePath: undefined, missingParent: true };
    }
  }
};

export const getCategoryTree = async (
  client: SanityClient,
  options: CategoryTreeOptions = {}
): Promise<CategoryTreeNode[]> => {
  const { includeInactive = false, maxDepth = MAX_CATEGORY_DEPTH, sortBy = "displayOrder" } = options;
  const categories = await fetchCategories(client);
  const nodes = new Map<string, CategoryTreeNode>();

  for (const category of categories.values()) {
    if (!includeInactive && !category.isActive) continue;
    if (category.depth > maxDepth) continue;

    nodes.set(category.id, {
      id: category.id,
      title: category.title,
      slug: category.slug,
      depth: category.depth,
      isActive: category.isActive,
      displayOrder: category.displayOrder,
      children: [],
    });
  }

  const roots: CategoryTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = categories.get(node.id)?.parentId;
    const parentNode = parent ? nodes.get(parent) : undefined;

    if (parentNode && parentNode.depth < maxDepth) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortTree(roots, buildSorter(sortBy));
  return roots;
};

export const getCategoryBreadcrumb = async (
  client: SanityClient,
  categoryId: string
): Promise<CategoryBreadcrumbResult> => {
  const categories = await fetchCategories(client);
  const normalizedId = normalizeId(categoryId);

  if (!normalizedId) {
    return { path: [], slugPath: [], depthPath: [] };
  }

  const titles: string[] = [];
  const slugs: string[] = [];
  const depths: number[] = [];
  const visited = new Set<string>();

  let currentId: string | undefined = normalizedId;
  while (currentId) {
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const category = categories.get(currentId);
    if (!category) break;

    titles.unshift(category.title);
    slugs.unshift(category.slug);
    depths.unshift(category.depth);

    currentId = category.parentId;
  }

  return { path: titles, slugPath: slugs, depthPath: depths };
};

export const validateCategoryHierarchy = async (
  client: SanityClient
): Promise<CategoryHierarchyValidation> => {
  const categories = await fetchCategories(client);
  const errors: CategoryHierarchyError[] = [];

  for (const category of categories.values()) {
    if (category.depth > 0 && !category.parentId) {
      errors.push({
        categoryId: category.id,
        type: "orphaned",
        message: `Category "${category.title}" has depth ${category.depth} but no parent reference.`,
      });
    }

    const trace = traceAncestry(category.id, categories);
    if (trace.cyclePath) {
      errors.push({
        categoryId: category.id,
        type: "circular_reference",
        message: `Circular reference detected starting at "${category.title}".`,
        path: trace.cyclePath,
      });
    }

    if (trace.missingParent) {
      errors.push({
        categoryId: category.id,
        type: "orphaned",
        message: `Parent reference for "${category.title}" is missing.`,
      });
    }

    const computedDepth = trace.depth;
    const storedDepth = category.depth;
    if (computedDepth !== storedDepth || storedDepth > MAX_CATEGORY_DEPTH) {
      errors.push({
        categoryId: category.id,
        type: "invalid_depth",
        message: `Depth mismatch for "${category.title}" (stored: ${storedDepth}, expected: ${computedDepth}).`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
};

export const moveCategoryBranch = async (
  client: SanityClient,
  categoryId: string,
  newParentId: string | null
): Promise<MoveCategoryResult> => {
  const categories = await fetchCategories(client);
  const targetId = normalizeId(categoryId);
  const normalizedParentId = normalizeId(newParentId);

  if (!targetId) {
    throw new Error("A valid categoryId is required.");
  }

  const target = categories.get(targetId);
  if (!target) {
    throw new Error(`Category ${categoryId} not found.`);
  }

  const newParent = normalizedParentId ? categories.get(normalizedParentId) : undefined;
  if (normalizedParentId && !newParent) {
    throw new Error(`New parent category ${newParentId} not found.`);
  }

  const childrenMap = buildChildrenMap(categories);
  const branchIds = collectBranchIds(targetId, childrenMap);

  if (normalizedParentId && branchIds.includes(normalizedParentId)) {
    throw new Error("Cannot move a category into its own subtree.");
  }

  const targetDepth = target.depth;
  const baseDepth = newParent ? newParent.depth + 1 : 0;
  const newDepths: Record<string, number> = {};

  for (const id of branchIds) {
    const current = categories.get(id);
    if (!current) continue;
    const depthOffset = current.depth - targetDepth;
    const nextDepth = baseDepth + depthOffset;

    if (nextDepth > MAX_CATEGORY_DEPTH) {
      throw new Error(`Moving would exceed the maximum depth of ${MAX_CATEGORY_DEPTH}.`);
    }

    newDepths[id] = nextDepth;
  }

  const transaction = client.transaction();

  for (const id of branchIds) {
    const category = categories.get(id);
    if (!category) continue;

    const setPayload: Record<string, unknown> = {
      depth: newDepths[id],
      isSubcategory: newDepths[id] > 0,
    };

    const unsetPayload: string[] = [];

    if (id === targetId) {
      if (normalizedParentId && newParent) {
        setPayload.parentCategory = { _type: "reference", _ref: newParent.id };
      } else {
        unsetPayload.push("parentCategory");
      }
    }

    transaction.patch(category.documentId, {
      set: setPayload,
      ...(unsetPayload.length ? { unset: unsetPayload } : {}),
    });
  }

  await transaction.commit({ autoGenerateArrayKeys: true });

  return {
    movedCount: branchIds.length,
    newDepths,
  };
};

const PRODUCTS_BY_CATEGORY_QUERY = `
*[_type == "product" && !(_id in path("drafts.**")) && references($categoryIds)]{
  _id,
  name,
  "slug": slug.current,
  "primaryCategoryId": primaryCategory._ref,
  "categoryIds": categories[]._ref
}
`;

export const getProductsByCategory = async (
  client: SanityClient,
  categoryId: string,
  includeSubcategories = true
): Promise<CategoryProductsResult> => {
  const categories = await fetchCategories(client);
  const targetId = normalizeId(categoryId);

  if (!targetId) {
    return { categoryIdsQueried: [], products: [] };
  }

  const childrenMap = buildChildrenMap(categories);
  const categoryIds = includeSubcategories ? collectBranchIds(targetId, childrenMap) : [targetId];

  const products = await client.fetch<CategoryProductSummary[]>(PRODUCTS_BY_CATEGORY_QUERY, {
    categoryIds,
  });

  return { categoryIdsQueried: categoryIds, products };
};

export const getCategoryStats = async (client: SanityClient): Promise<CategoryStats> => {
  const categories = await fetchCategories(client);
  const byDepth: Record<number, number> = { 0: 0, 1: 0, 2: 0 };

  for (const category of categories.values()) {
    byDepth[category.depth] = (byDepth[category.depth] || 0) + 1;
  }

  const emptyCategories = Array.from(categories.values())
    .filter((category) => category.productCount === 0)
    .map((category) => ({
      id: category.id,
      title: category.title,
      slug: category.slug,
    }));

  return {
    totalCategories: categories.size,
    byDepth,
    emptyCategories,
  };
};
