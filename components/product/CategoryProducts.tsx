"use client";
import { Category, Product } from "@/sanity.types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { client } from "@/sanity/lib/client";
import { motion } from "motion/react";
import { ChevronRight, Grid3X3, Layers, Loader2 } from "lucide-react";
import ProductCard from "../ProductCard";
import NoProductAvailable from "./NoProductAvailable";
import { useRouter } from "next/navigation";
import { buildCategoryUrl } from "@/lib/paths";

interface Props {
  categories: Category[];
  slug: string;
  initialProducts: Product[];
}

type CategoryNode = Category & { children: CategoryNode[]; productCount?: number };

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

const CategoryProducts = ({ categories, slug, initialProducts }: Props) => {
  const [currentSlug, setCurrentSlug] = useState(slug);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { roots, idToNode, slugToId } = useMemo(() => {
    const nodeMap = new Map<string, CategoryNode>();
    const slugMap = new Map<string, string>();

    categories.forEach((cat) => {
      if (!cat?._id) return;
      nodeMap.set(cat._id, { ...(cat as CategoryNode), children: [] });
      const slug = cat.slug?.current;
      if (slug) slugMap.set(slug, cat._id);
    });

    const roots: CategoryNode[] = [];
    nodeMap.forEach((node) => {
      const parentId = (node.parentCategory as Category | undefined)?._id;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (list: CategoryNode[]): CategoryNode[] =>
      list
        .map((item) => ({ ...item, children: sortNodes(item.children || []) }))
        .sort(
          (a, b) =>
            (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
            (a.title || "").localeCompare(b.title || "")
        );

    return { roots: sortNodes(roots), idToNode: nodeMap, slugToId: slugMap };
  }, [categories]);

  const findPathById = useCallback(
    (id?: string | null) => {
      if (!id) return [] as CategoryNode[];
      const path: CategoryNode[] = [];
      const seen = new Set<string>();
      let current: CategoryNode | undefined = idToNode.get(id);

      while (current) {
        path.unshift(current);
        const currentId = current._id;
        if (currentId) {
          if (seen.has(currentId)) break;
          seen.add(currentId);
        }

        const parentId = (current.parentCategory as Category | undefined)?._id;
        if (!parentId) break;
        current = idToNode.get(parentId);
      }

      return path;
    },
    [idToNode]
  );

  const activePath = useMemo(() => findPathById(slugToId.get(currentSlug)), [currentSlug, findPathById, slugToId]);
  const activePathIds = useMemo(() => new Set(activePath.map((node) => node._id).filter(Boolean) as string[]), [activePath]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      activePathIds.forEach((id) => next.add(id));
      return next;
    });
  }, [activePathIds]);

  useEffect(() => {
    setCurrentSlug(slug);
    setProducts(initialProducts);
    setLoading(false);
  }, [slug, initialProducts]);

  useEffect(() => {
    if (!currentSlug || currentSlug === slug) {
      return;
    }

    const fetchCategoryProducts = async () => {
      setLoading(true);
      try {
        const query = `
      *[_type == "product" && references(*[_type == "category" && slug.current == $slug]._id)] {
        ...,
        brand->{
          _id,
          title,
          slug
        },
        ${ACTIVE_DEAL_PROJECTION}
      }
    `;
        const products = await client.fetch(query, { slug: currentSlug });
        setProducts(products);
      } catch (error) {
        console.error("Error fetching category products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentSlug) {
      fetchCategoryProducts();
    }
  }, [currentSlug, slug]);

  const handleCategoryChange = useCallback(
    (newSlug: string) => {
      if (!newSlug || newSlug === currentSlug) return;
      setCurrentSlug(newSlug);
      router.push(buildCategoryUrl(newSlug));
    },
    [currentSlug, router]
  );

  const toggleExpand = useCallback((id?: string, hasChildren?: boolean) => {
    if (!id || !hasChildren) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const renderNode = useCallback(
    (node: CategoryNode, depth: number = 0) => {
      const slug = node.slug?.current;
      const hasChildren = !!node.children?.length;
      const expanded = hasChildren && node._id ? expandedIds.has(node._id) : false;
      const isActive = slug ? slug === currentSlug : false;
      const isOnPath = node._id ? activePathIds.has(node._id) : false;
      const indent = depth * 16;
      const count = typeof node.productCount === "number" ? node.productCount : null;

      return (
        <div key={node._id || slug || node.title} className="space-y-1">
          <div
            className={`flex items-center gap-2 rounded-md border transition-all duration-150 pr-3 py-2 ${
              isActive
                ? "bg-brand-text-main/10 border-brand-text-main ring-1 ring-brand-text-main/20"
                : isOnPath
                ? "bg-gray-50 border-gray-200"
                : "border-transparent hover:bg-gray-50"
            }`}
            style={{ marginLeft: `${indent}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                aria-label={expanded ? "Collapse category" : "Expand category"}
                className="p-1 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node._id, hasChildren);
                }}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    expanded ? "rotate-90 text-brand-text-main" : ""
                  }`}
                />
              </button>
            ) : (
              <span className="w-4" />
            )}

            <button
              type="button"
              className="flex-1 text-left text-sm font-semibold text-brand-black-strong truncate"
              onClick={() => slug && handleCategoryChange(slug)}
            >
              {node.title || node.slug?.current || "Category"}
            </button>

            {count !== null && (
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full leading-none ${
                  count > 0 ? "bg-blue-600 text-white" : "text-slate-600 bg-slate-100"
                }`}
              >
                {count}
              </span>
            )}
          </div>

          {hasChildren && expanded && (
            <div className="space-y-1">{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    },
    [activePathIds, currentSlug, expandedIds, handleCategoryChange, toggleExpand]
  );

  const activePathLabel =
    activePath.length > 0
      ? activePath.map((node) => node.title || node.slug?.current).filter(Boolean).join(" / ")
      : currentSlug
      ? currentSlug.replace(/-/g, " ")
      : "this category";

  return (
    <div className="py-5 flex flex-col lg:flex-row items-start gap-5">
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
            <Layers className="w-5 h-5 text-brand-black-strong" />
            <div>
              <p className="text-sm font-semibold text-brand-black-strong">Category layers</p>
              <p className="text-xs text-gray-600">Navigate parents, children, and leaf nodes.</p>
            </div>
          </div>
          <div className="p-4 space-y-1">{roots.map((node) => renderNode(node))}</div>
        </div>
      </div>

      <motion.div
        className="w-full"
        key={currentSlug} // Trigger re-animation when slug changes
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {loading ? (
          <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-48 mb-2"></div>
                <div className="h-3 bg-gray-200 animate-pulse rounded w-32"></div>
              </div>
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : products?.length > 0 ? (
          <div className="w-full">
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold text-brand-black-strong">
                    Products in {activePathLabel}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {products.length} product{products.length !== 1 ? "s" : ""} found
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Grid3X3 className="w-4 h-4" />
                  <span>Grid View</span>
                </div>
              </div>
            </div>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {products?.map((product: Product, index: number) => (
                <motion.div
                  key={product?._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05, // Stagger the animation
                  }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-brand-black-strong">
                Products in {activePathLabel}
              </h3>
              <p className="text-sm text-gray-600">0 products found</p>
            </div>

            <NoProductAvailable
              selectedTab={currentSlug}
              className="mt-0 w-full border-2 border-dashed border-gray-200 bg-white"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CategoryProducts;
