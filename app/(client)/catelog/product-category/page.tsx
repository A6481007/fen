import Container from "@/components/Container";
import Title from "@/components/Title";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";
import { urlFor } from "@/sanity/lib/image";
import { getCategories } from "@/sanity/queries";
import type { Category } from "@/sanity.types";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Grid3X3, Layers, Package, Sparkles, Tag } from "lucide-react";

type CategoryNode = Category & { children: CategoryNode[] };

const sortCategories = (categories: Category[]) =>
  [...categories].sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      (a.title || "").localeCompare(b.title || "")
  );

const sortNodeList = (nodes: CategoryNode[]) =>
  [...nodes].sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      (a.title || "").localeCompare(b.title || "")
  );

const getParentId = (category: Category) =>
  (category.parentCategory as Category | undefined)?._id || "";

const getCategoryLabel = (category: Category) =>
  category.title || category.slug?.current || "Category";

const buildCategoryTree = (items: Category[]) => {
  const nodeMap = new Map<string, CategoryNode>();

  items.forEach((category) => {
    if (!category?._id) return;
    nodeMap.set(category._id, { ...category, children: [] });
  });

  const roots: CategoryNode[] = [];

  nodeMap.forEach((node) => {
    const parentId = getParentId(node);
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: CategoryNode[]): CategoryNode[] =>
    sortNodeList(nodes).map((node) => ({
      ...node,
      children: sortNodes(node.children || []),
    }));

  return sortNodes(roots);
};

const ProductCategoryIndexPage = async () => {
  const categories = await getCategories();
  const parentCategories = sortCategories(
    categories.filter(
      (cat: { isParentCategory?: boolean; parentCategory?: { _ref?: string } | null }) =>
        cat.isParentCategory || !getParentId(cat as any)
    )
  );
  const childCategories = sortCategories(
    categories.filter((cat: any) => Boolean(getParentId(cat as any)))
  );

  const totalCategories = categories.length;
  const totalParents = parentCategories.length;
  const totalProducts = categories.reduce(
    (sum: number, cat: any) => sum + (typeof cat.productCount === "number" ? cat.productCount : 0),
    0
  );

  const featuredCategories = sortCategories(
    categories.filter((cat: any) => Boolean((cat as any)?.featured))
  ).slice(0, 6);

  const popularCategories = sortCategories(
    categories
      .filter((cat: any) => typeof cat.productCount === "number")
      .sort(
        (a: any, b: any) => (b.productCount ?? 0) - (a.productCount ?? 0)
      )
  ).slice(0, 6);

  const childrenByParent = new Map<string, Category[]>();
  childCategories.forEach((child) => {
    const parentId = getParentId(child);
    if (!parentId) return;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(child);
    childrenByParent.set(parentId, list);
  });
  const categoryTree = buildCategoryTree(categories);

  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink">
      <Container className="py-6 sm:py-10 space-y-10">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList className="flex flex-wrap items-center gap-y-1">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="inline-flex min-h-[44px] items-center">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/catalog" className="inline-flex min-h-[44px] items-center">
                    Catalog
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Categories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 lg:p-8 shadow-md border border-gray-100/60">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent" className="shadow-sm">
                    Category Directory
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-dark-text bg-white/70 px-2 py-1 rounded-full">
                    <Sparkles className="h-3.5 w-3.5" />
                    Updated catalog structure
                  </span>
                </div>

                <Title className="text-2xl lg:text-3xl font-bold text-shop_dark_green">
                  Product Categories
                </Title>
                <p className="text-dark-text text-sm lg:text-base max-w-2xl">
                  Start with a category to explore every sub-layer, filterable product grid, and curated recommendations.
                  Pick a parent category to see its full tree or jump straight to any leaf category.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/shop"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-shop_light_green px-4 py-2 text-sm font-semibold text-white transition-all duration-300 shadow-md hover:bg-shop_dark_green hover:shadow-lg hover:scale-105"
                  >
                    <Package className="h-4 w-4" />
                    View all products
                  </Link>
                  <Link
                    href="/catalog"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-shop_light_green px-4 py-2 text-sm font-semibold text-shop_dark_green transition-all duration-300 hover:bg-shop_light_green/10"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Browse catalog assets
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                {[
                  {
                    label: "Total categories",
                    value: totalCategories,
                    icon: Grid3X3,
                  },
                  {
                    label: "Parent hubs",
                    value: totalParents,
                    icon: Layers,
                  },
                  {
                    label: "Products indexed",
                    value: totalProducts,
                    icon: Package,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white/80 px-4 py-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-shop_light_green/10 text-shop_dark_green flex items-center justify-center">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-dark-text">{stat.label}</p>
                      <p className="text-lg font-semibold text-shop_dark_green">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {featuredCategories.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-dark-text">Highlights</p>
                <h2 className="text-xl lg:text-2xl font-bold text-shop_dark_green">Featured categories</h2>
              </div>
              <Link
                href={CATEGORY_BASE_PATH}
                className="inline-flex items-center gap-1 text-sm font-semibold text-shop_light_green hover:text-shop_dark_green"
              >
                View all categories
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCategories.map((category) => {
                const title = getCategoryLabel(category);
                const productCount = (category as any)?.productCount;
                return (
                  <Link
                    key={category._id}
                    href={buildCategoryUrl(category.slug?.current)}
                    className="group rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-shop_light_green hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-shop_light_pink to-shop_light_bg flex items-center justify-center">
                        {category.image ? (
                          <Image
                            src={urlFor(category.image).width(96).height(96).url()}
                            alt={title}
                            width={96}
                            height={96}
                            className="h-12 w-12 object-contain"
                          />
                        ) : (
                          <Tag className="h-6 w-6 text-shop_light_green" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-shop_dark_green">{title}</h3>
                        <p className="text-sm text-dark-text line-clamp-2">
                          {category.description || "Explore the latest products in this category."}
                        </p>
                        {typeof productCount === "number" ? (
                          <span className="text-xs font-semibold text-shop_dark_green">
                            {productCount} products
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {parentCategories.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-dark-text">Structure</p>
                <h2 className="text-xl lg:text-2xl font-bold text-shop_dark_green">
                  Browse by parent category
                </h2>
              </div>
              {popularCategories.length > 0 ? (
                <div className="flex items-center gap-2 text-xs text-dark-text bg-white/70 px-3 py-1.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  Trending categories highlighted
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {parentCategories.map((parent) => {
                const title = getCategoryLabel(parent);
                const children = sortCategories(childrenByParent.get(parent._id || "") || []).slice(0, 6);
                const parentHref = buildCategoryUrl(parent.slug?.current);
                const parentProductCount = (parent as any)?.productCount;
                return (
                  <div
                    key={parent._id}
                    className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-shop_light_green/10 to-shop_light_pink/10 flex items-center justify-center">
                        {parent.image ? (
                          <Image
                            src={urlFor(parent.image).width(96).height(96).url()}
                            alt={title}
                            width={96}
                            height={96}
                            className="h-12 w-12 object-contain"
                          />
                        ) : (
                          <Layers className="h-6 w-6 text-shop_light_green" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-shop_dark_green">{title}</h3>
                          {typeof parentProductCount === "number" ? (
                            <Badge variant="secondary" className="text-xs">
                              {parentProductCount} products
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-dark-text line-clamp-2">
                          {parent.description || "Explore all child categories and featured products."}
                        </p>
                        {children.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {children.map((child) => (
                              <Link
                                key={child._id}
                                href={buildCategoryUrl(child.slug?.current)}
                                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-dark-text hover:border-shop_light_green hover:text-shop_dark_green"
                              >
                                {getCategoryLabel(child)}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-dark-text">No subcategories found.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <Link
                        href={parentHref}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-shop_light_green hover:text-shop_dark_green"
                      >
                        Explore {title}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-dark-text">Directory</p>
              <h2 className="text-xl lg:text-2xl font-bold text-shop_dark_green">Category layers</h2>
              <p className="text-sm text-dark-text mt-1">
                Navigate parents, children, and leaf nodes.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-dark-text bg-white/70 px-3 py-1.5 rounded-full">
              <Grid3X3 className="h-3 w-3" />
              {totalCategories} total categories
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white/90 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-shop_light_green/10 text-shop_dark_green flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-shop_dark_green">Category layers</p>
                  <p className="text-xs text-dark-text">Navigate parents, children, and leaf nodes.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-shop_light_green/40 bg-shop_light_green/10 px-2 py-1 text-shop_dark_green">
                  <Layers className="h-3 w-3" /> Root
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-dark-text">
                  <Tag className="h-3 w-3" /> Child
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-dark-text">
                  <Package className="h-3 w-3" /> Leaf
                </span>
              </div>
            </div>

            {categoryTree.length ? (
              <div className="mt-4 space-y-2">
                {categoryTree.map((node) => {
                  const renderNode = (item: CategoryNode, depth: number) => {
                    const title = getCategoryLabel(item);
                    const isRoot = depth === 0;
                    const isLeaf = !item.children?.length;
                    const kindLabel = isRoot ? "Root" : isLeaf ? "Leaf" : "Child";
                    const KindIcon = isRoot ? Layers : isLeaf ? Package : Tag;
                    const indent = depth * 18;
                    const itemProductCount = (item as any)?.productCount;

                    return (
                      <div key={item._id || `${title}-${depth}`} className="space-y-2">
                        <Link
                          href={buildCategoryUrl(item.slug?.current)}
                          className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            isRoot
                              ? "border-shop_light_green/40 bg-white"
                              : "border-gray-100 bg-white/90 hover:border-shop_light_green/40"
                          }`}
                          style={{ marginLeft: `${indent}px` }}
                        >
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-shop_light_pink to-shop_light_bg flex items-center justify-center">
                            {item.image ? (
                              <Image
                                src={urlFor(item.image).width(72).height(72).url()}
                                alt={title}
                                width={72}
                                height={72}
                                className="h-9 w-9 object-contain"
                              />
                            ) : (
                              <KindIcon className="h-5 w-5 text-shop_light_green" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-shop_dark_green line-clamp-1">
                              {title}
                            </p>
                            <p className="text-xs text-dark-text line-clamp-1">
                              {item.description || "Browse this category"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {typeof itemProductCount === "number" ? (
                              <Badge variant="secondary" className="text-xs">
                                {itemProductCount} products
                              </Badge>
                            ) : null}
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-dark-text">
                              <KindIcon className="h-3 w-3" />
                              {kindLabel}
                            </span>
                          </div>
                        </Link>
                        {item.children?.length ? (
                          <div className="space-y-2">
                            {item.children.map((child) => renderNode(child, depth + 1))}
                          </div>
                        ) : null}
                      </div>
                    );
                  };

                  return renderNode(node, 0);
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white/80 p-8 text-center text-sm text-dark-text">
                No categories available right now.
              </div>
            )}
          </div>
        </section>
      </Container>
    </div>
  );
};

export default ProductCategoryIndexPage;
