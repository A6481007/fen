import Container from "@/components/Container";
import Title from "@/components/Title";
import ProductContent from "@/components/ProductContent";
import ProductPageSkeleton from "@/components/ProductPageSkeleton";
import CategoryProducts from "@/components/product/CategoryProducts";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  generateBreadcrumbSchema,
  generateCategoryCollectionSchema,
  generateCategoryMetadata,
  generateItemListSchema,
  generateProductMetadata,
  generateProductSchema,
} from "@/lib/seo";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { getBrand, getCategories, getCategoryBySlug, getProductBySlug, getRelatedProducts } from "@/sanity/queries";
import { Category, Product } from "@/sanity.types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Filter, Grid3X3, Package, Tag, TrendingUp } from "lucide-react";
import { Fragment, Suspense } from "react";

type Props = {
  params: Promise<{ slug: string }>;
};

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

const CATEGORY_PRODUCTS_QUERY = `
  *[_type == "product" && references(*[_type == "category" && slug.current == $slug]._id)] {
    ...,
    brand->{_id,title,slug},
    categories[]{
      _ref,
      ...@->{
        _id,
        title,
        slug,
        isParentCategory,
        depth,
        parentCategory->{_id,title,slug,isParentCategory,depth}
      }
    },
    ${ACTIVE_DEAL_PROJECTION}
  }
`;

type CategoryTrailItem = { title: string; slug?: string; isParent?: boolean; depth?: number };
type BreadcrumbItem = { name: string; url: string };
type CategoryMaps = { byId: Map<string, Category>; bySlug: Map<string, Category> };
type ProductsSlugCopy = {
  home: string;
  category: string;
  product: string;
  featuredCategory: string;
  rangeLabel: string;
  productsCount: (count: number) => string;
  backToProducts: string;
  viewAllProducts: string;
  categoryView: string;
  filteredResults: string;
  exploreOtherCategories: string;
  viewAll: string;
  discoverTitle: string;
  discoverBody: (categoryTitle: string) => string;
  browseAllProducts: string;
  allCategories: string;
};

const copyEn: ProductsSlugCopy = {
  home: "Home",
  category: "Category",
  product: "Product",
  featuredCategory: "Featured Category",
  rangeLabel: "Range",
  productsCount: (count) => `${count} products`,
  backToProducts: "Back to Products",
  viewAllProducts: "View All Products",
  categoryView: "Category View",
  filteredResults: "Filtered Results",
  exploreOtherCategories: "Explore Other Categories",
  viewAll: "View All",
  discoverTitle: "Discover More Amazing Products",
  discoverBody: (categoryTitle) =>
    `Can't find what you're looking for in ${categoryTitle}? Explore our complete collection across all categories.`,
  browseAllProducts: "Browse All Products",
  allCategories: "All Categories",
};

const copyTh: ProductsSlugCopy = {
  home: "หน้าแรก",
  category: "หมวดหมู่",
  product: "สินค้า",
  featuredCategory: "หมวดหมู่แนะนำ",
  rangeLabel: "ช่วง",
  productsCount: (count) => `${count} รายการสินค้า`,
  backToProducts: "กลับไปหน้าสินค้า",
  viewAllProducts: "ดูสินค้าทั้งหมด",
  categoryView: "มุมมองหมวดหมู่",
  filteredResults: "ผลลัพธ์ที่กรองแล้ว",
  exploreOtherCategories: "สำรวจหมวดหมู่อื่น",
  viewAll: "ดูทั้งหมด",
  discoverTitle: "ค้นพบสินค้าที่น่าสนใจเพิ่มเติม",
  discoverBody: (categoryTitle) =>
    `ไม่พบสิ่งที่คุณต้องการใน ${categoryTitle}? สำรวจคอลเลกชันสินค้าทั้งหมดของเราได้ทุกหมวดหมู่`,
  browseAllProducts: "เรียกดูสินค้าทั้งหมด",
  allCategories: "ทุกหมวดหมู่",
};

const buildCategoryMaps = (categories: Category[]): CategoryMaps => {
  const byId = new Map<string, Category>();
  const bySlug = new Map<string, Category>();

  categories.forEach((cat) => {
    if (cat?._id) byId.set(cat._id, cat);
    const slug = cat?.slug?.current;
    if (slug) bySlug.set(slug, cat);
  });

  return { byId, bySlug };
};

const buildCategoryPath = (category: Category | null | undefined, maps: CategoryMaps): Category[] => {
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

    const parentId: string | undefined = (cursor.parentCategory as Category | undefined)?._id;
    if (!parentId) break;

    cursor = maps.byId.get(parentId) || (cursor.parentCategory as Category | undefined) || null;
  }

  return path;
};

const getCategoryPathBySlug = (slug: string | undefined, maps: CategoryMaps): Category[] => {
  if (!slug) return [];
  const category = maps.bySlug.get(slug);
  return category ? buildCategoryPath(category, maps) : [];
};

const getDeepestProductCategoryPath = (product: Product | null, maps: CategoryMaps): Category[] => {
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

const toCategoryTrail = (path: Category[]): CategoryTrailItem[] =>
  path.map((cat) => ({
    title: cat.title || cat.slug?.current || "Category",
    slug: cat.slug?.current,
    depth: cat.depth,
    isParent: cat.isParentCategory || cat.depth === 0,
  }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [productRaw, category, categories] = await Promise.all([
    getProductBySlug(slug),
    getCategoryBySlug(slug),
    getCategories(),
  ]);
  const product = productRaw as Product | null;
  const categoryMaps = buildCategoryMaps(categories);

  if (product) {
    const brand = await getBrand(slug);
    const path = getDeepestProductCategoryPath(product, categoryMaps);
    const parentCategory = path[0] || null;
    const childCategory = path[path.length - 1] || null;
    return generateProductMetadata({ ...product, brand }, { parentCategory, childCategory });
  }

  if (category) {
    const path = category.slug?.current ? getCategoryPathBySlug(category.slug.current, categoryMaps) : [];
    const immediateParent = path.length > 1 ? path[path.length - 2] : (category.parentCategory as Category | null);
    return generateCategoryMetadata(category, category.productCount || 0, {
      parentCategory: immediateParent,
    });
  }

  return {
    title: "Not Found",
    description: "The requested product or category could not be found.",
  };
}

const CategoryView = ({
  category,
  categories,
  products,
  categoryPath,
  copy,
}: {
  category: Category & { productCount?: number };
  categories: Category[];
  products: Product[];
  categoryPath: Category[];
  copy: ProductsSlugCopy;
}) => {
  const parentCategory = categoryPath.length > 1 ? categoryPath[categoryPath.length - 2] : null;
  const categoryTitle = category.title || category.slug?.current || "Category";
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: copy.home, url: "/" },
    ...categoryPath.map((cat) => ({
      name: cat.title || cat.slug?.current || copy.category,
      url: cat.slug?.current ? `/products/${cat.slug.current}` : "/products",
    })),
  ];
  const relatedCategories = categories
    .filter((cat) => cat.slug?.current !== category.slug?.current)
    .filter((cat) => {
      const catParentId = (cat.parentCategory as Category | undefined)?._id;
      if (parentCategory?._id) {
        return catParentId === parentCategory._id;
      }
      return !catParentId;
    })
    .slice(0, 6);

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);
  const itemListSchema = generateItemListSchema(products, `${categoryTitle} Products`, { basePath: "/products" });
  const collectionSchema = generateCategoryCollectionSchema(category, products, breadcrumbItems);

  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
        }}
      />

      <Container className="py-6 sm:py-10">
        <div className="mb-8">
          <Breadcrumb>
            <BreadcrumbList className="flex flex-wrap items-center gap-y-1">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="inline-flex min-h-[44px] items-center">
                    {copy.home}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {categoryPath.map((node, index) => (
                <Fragment key={node._id || node.slug?.current || `${node.title}-${index}`}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {index === categoryPath.length - 1 ? (
                      <BreadcrumbPage>{node.title || categoryTitle}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          href={node.slug?.current ? `/products/${node.slug.current}` : "/products"}
                          className="inline-flex min-h-[44px] items-center"
                        >
                          {node.title || node.slug?.current}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 lg:p-8 shadow-md border border-gray-100/50 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                {category?.image && (
                  <div className="flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-shop_light_pink to-shop_light_bg rounded-xl overflow-hidden">
                    <Image
                      src={urlFor(category.image).url()}
                      alt={categoryTitle}
                      width={80}
                      height={80}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <Title className="text-2xl lg:text-3xl font-bold text-shop_dark_green mb-2">
                    {categoryTitle}
                  </Title>

                  {categoryPath.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-dark-text">
                      {categoryPath.map((node, index) => (
                        <span
                          key={node._id || node.slug?.current || `${node.title}-${index}-pill`}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                            index === categoryPath.length - 1
                              ? "bg-shop_light_green/15 text-shop_dark_green"
                              : "bg-white/70 text-light-text"
                          }`}
                        >
                          {node.title || node.slug?.current}
                          {index < categoryPath.length - 1 && <ArrowRight className="w-3 h-3 opacity-60" />}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-sm text-dark-text mb-3">
                    {category?.featured && (
                      <div className="flex items-center gap-1 text-shop_orange">
                        <Tag className="w-4 h-4" />
                        <span>{copy.featuredCategory}</span>
                      </div>
                    )}
                    {category?.range && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>
                          {copy.rangeLabel}: {category.range}
                        </span>
                      </div>
                    )}
                    {category.productCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        <span>{copy.productsCount(category.productCount)}</span>
                      </div>
                    )}
                  </div>

                  {category?.description && (
                    <p className="text-dark-text text-sm lg:text-base whitespace-pre-line">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-shop_dark_green transition-colors duration-300 hover:text-shop_light_green"
                >
                  {copy.backToProducts}
                </Link>

                <div className="h-4 w-px bg-gray-300" />

                <Link
                  href="/shop"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-shop_light_green px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-md hover:bg-shop_dark_green hover:shadow-lg hover:scale-105"
                >
                  <Package className="w-4 h-4" />
                  {copy.viewAllProducts}
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-dark-text bg-white/60 px-3 py-1.5 rounded-full">
                  <Grid3X3 className="w-3 h-3" />
                  <span>{copy.categoryView}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-dark-text bg-white/60 px-3 py-1.5 rounded-full">
                  <Filter className="w-3 h-3" />
                  <span>{copy.filteredResults}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CategoryProducts categories={categories} slug={category.slug?.current || ""} initialProducts={products} />

        {relatedCategories.length > 0 && (
          <div className="mt-12">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl lg:text-2xl font-bold text-shop_dark_green">
                {copy.exploreOtherCategories}
              </h3>
              <Link
                href="/products"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-shop_light_green transition-colors duration-300 hover:text-shop_dark_green"
              >
                {copy.viewAll}
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedCategories.map((item) => (
                <Link
                  key={item._id}
                  href={`/products/${item.slug?.current}`}
                  className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 hover:border-shop_light_green p-4 text-center"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-shop_light_pink to-shop_light_bg rounded-lg flex items-center justify-center">
                    {item.image ? (
                      <Image
                        src={urlFor(item.image).url()}
                        alt={item.title || "Category"}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-shop_light_green opacity-60" />
                    )}
                  </div>

                  <h4 className="text-sm font-medium text-shop_dark_green break-words transition-colors duration-300 group-hover:text-shop_light_green sm:line-clamp-1">
                    {item.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 bg-gradient-to-r from-shop_light_green/10 via-shop_orange/5 to-shop_light_green/10 rounded-xl p-6 lg:p-8 border border-shop_light_green/20 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl lg:text-2xl font-bold text-shop_dark_green mb-3">
              {copy.discoverTitle}
            </h3>
            <p className="text-dark-text mb-6 text-sm lg:text-base">
              {copy.discoverBody(categoryTitle)}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-shop_dark_green hover:bg-shop_light_green text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Package className="w-5 h-5" />
                {copy.browseAllProducts}
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 border-2 border-shop_light_green text-shop_light_green hover:bg-shop_light_green hover:text-white px-6 py-3 rounded-full font-semibold transition-all duration-300"
              >
                <Grid3X3 className="w-5 h-5" />
                {copy.allCategories}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

const ProductView = async ({
  product,
  slug,
  categoryTrail,
  breadcrumbItems,
}: {
  product: Product;
  slug: string;
  categoryTrail: CategoryTrailItem[];
  breadcrumbItems: BreadcrumbItem[];
}) => {
  const categoryIds =
    product?.categories
      ?.map((cat) => (cat as any)?._ref || (cat as any)?._id)
      .filter((id): id is string => Boolean(id)) || [];
  const [relatedProducts, brand] = await Promise.all([
    getRelatedProducts(categoryIds, product?.slug?.current || "", null, 4),
    getBrand(product?.slug?.current as string),
  ]);

  const productSchema = generateProductSchema({ ...product, brand });
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <ProductContent
        product={product as Product}
        relatedProducts={(relatedProducts || []) as unknown as Product[]}
        brand={brand}
        categoryTrail={categoryTrail}
      />
    </>
  );
};

const ProductsSlugPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const cookieStore = await cookies();
  const lang = cookieStore.get("i18next")?.value?.toLowerCase() || "en";
  const copy = lang.startsWith("th") ? copyTh : copyEn;
  const { slug } = await params;
  const [productRaw, category, categories] = await Promise.all([
    getProductBySlug(slug),
    getCategoryBySlug(slug),
    getCategories(),
  ]);
  const product = productRaw as Product | null;
  const categoryMaps = buildCategoryMaps(categories);

  if (product) {
    const productCategoryPath = getDeepestProductCategoryPath(product, categoryMaps);
    const categoryTrail = toCategoryTrail(productCategoryPath);
    const breadcrumbItems: BreadcrumbItem[] = [
      { name: copy.home, url: "/" },
      ...productCategoryPath.map((cat) => ({
        name: cat.title || cat.slug?.current || copy.category,
        url: cat.slug?.current ? `/products/${cat.slug.current}` : "/products",
      })),
      { name: product.name || copy.product, url: `/products/${slug}` },
    ];

    return (
      <div>
        <Suspense fallback={<ProductPageSkeleton />}>
          <ProductView
            product={product}
            slug={slug}
            categoryTrail={categoryTrail}
            breadcrumbItems={breadcrumbItems}
          />
        </Suspense>
      </div>
    );
  }

  if (!category) {
    return notFound();
  }

  const products = await client.fetch<Product[]>(CATEGORY_PRODUCTS_QUERY, { slug });
  const categoryPathFromSlug = getCategoryPathBySlug(slug, categoryMaps);
  const categoryPathFallback = buildCategoryPath(category, categoryMaps);
  const categoryPath =
    categoryPathFromSlug.length > 0
      ? categoryPathFromSlug
      : categoryPathFallback.length > 0
      ? categoryPathFallback
      : [category];

  return (
    <CategoryView
      category={category}
      categories={categories}
      products={products}
      categoryPath={categoryPath}
      copy={copy}
    />
  );
};

export default ProductsSlugPage;
