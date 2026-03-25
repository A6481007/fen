"use client";
import "@/app/i18n";
import { BRANDS_QUERYResult, Category, Product } from "@/sanity.types";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Container from "../Container";
import Title from "../Title";
import CategoryList from "./CategoryList";
import { Filter, Search, ArrowUpDown, CheckSquare } from "lucide-react";
import ProductCard from "../ProductCard";
import BrandList from "./BrandList";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PriceList from "./PriceList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";

interface Props {
  categories: Category[];
  brands: BRANDS_QUERYResult;
  initialProducts?: Product[];
}

const Shop = ({ categories, brands, initialProducts = [] }: Props) => {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const brandParams = searchParams?.get("brand") || "";
  const categoryParams = searchParams?.get("categories") || "";
  const qParam = searchParams?.get("q") || "";
  const sortParam = searchParams?.get("sort") || "newest";
  const pageParam = Number(searchParams?.get("page") || 1);
  const minPriceParam = Number(searchParams?.get("minPrice") || 0);
  const maxPriceParam = Number(searchParams?.get("maxPrice") || 10000);

  const [searchTerm, setSearchTerm] = useState(qParam);
  const [debouncedSearch, setDebouncedSearch] = useState(qParam);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [totalProducts, setTotalProducts] = useState(initialProducts.length);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [progressBytes, setProgressBytes] = useState<{ loaded: number; total?: number } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryParams ? categoryParams.split(",").filter(Boolean) : []);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(brandParams || null);
  const initialPrice =
    (minPriceParam > 0 || maxPriceParam < 10000) && searchParams?.get("minPrice") && searchParams?.get("maxPrice")
      ? `${minPriceParam}-${maxPriceParam}`
      : null;
  const [selectedPrice, setSelectedPrice] = useState<string | null>(initialPrice);
  const [minPrice, setMinPrice] = useState<number>(minPriceParam);
  const [maxPrice, setMaxPrice] = useState<number>(maxPriceParam || 10000);
  const [sortOrder, setSortOrder] = useState<string>(sortParam);
  const [page, setPage] = useState<number>(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1);
  const pageSize = 20;
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [inStockOnly, setInStockOnly] = useState<boolean>(searchParams?.get("inStock") === "1");
  const abortRef = useRef<AbortController | null>(null);
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    selectedCategories.length > 0 ||
    selectedBrand !== null ||
    selectedPrice !== null ||
    inStockOnly;

  const slugToParent = useMemo(() => {
    const map = new Map<string, string | undefined>();
    categories.forEach((cat) => {
      if (cat?.slug?.current) {
        const parentSlug = (cat.parentCategory as Category | undefined)?.slug?.current;
        map.set(cat.slug.current, parentSlug);
      }
    });
    return map;
  }, [categories]);

  const simplifyCategories = useCallback(
    (slugs: string[]) => {
      const set = new Set<string>();
      slugs.forEach((slug) => {
        set.add(slug);
        let parent = slugToParent.get(slug);
        while (parent) {
          set.delete(parent);
          parent = slugToParent.get(parent);
        }
      });
      return Array.from(set);
    },
    [slugToParent]
  );

  const updateSelectedCategories = useCallback(
    (updater: ((prev: string[]) => string[]) | string[]) => {
      setSelectedCategories((prev) =>
        simplifyCategories(typeof updater === "function" ? updater(prev) : updater)
      );
      setPage(1);
    },
    [simplifyCategories]
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const sortClause = useMemo(() => {
    if (sortOrder === "price-asc") return "price asc";
    if (sortOrder === "price-desc") return "price desc";
    if (sortOrder === "popularity") return "coalesce(totalReviews,0) desc, _createdAt desc";
    return "_createdAt desc";
  }, [sortOrder]);

  const readJsonWithProgress = useCallback(
    async (
      res: Response,
      onProgress: (loaded: number, total?: number) => void
    ) => {
      const contentLengthHeader = res.headers.get("content-length");
      const total = contentLengthHeader ? Number(contentLengthHeader) : undefined;

      if (!res.body || !total || Number.isNaN(total)) {
        const data = await res.json();
        onProgress(total ? total : 1, total);
        return data;
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          onProgress(loaded, total);
        }
      }

      const combined = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let offset = 0;
      chunks.forEach((chunk) => {
        combined.set(chunk, offset);
        offset += chunk.length;
      });

      const text = new TextDecoder().decode(combined);
      const data = JSON.parse(text);
      onProgress(total, total);
      return data;
    },
    []
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setLoadingProgress(null);
    setProgressBytes(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams();
      if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
      if (selectedBrand) params.set("brand", selectedBrand);
      if (selectedPrice) {
        const [min, max] = selectedPrice.split("-");
        params.set("minPrice", min);
        params.set("maxPrice", max);
      } else if (searchParams) {
        // Preserve explicit URL-driven min/max only if present; otherwise skip price filter entirely.
        const urlMin = searchParams.get("minPrice");
        const urlMax = searchParams.get("maxPrice");
        if (urlMin !== null) params.set("minPrice", urlMin);
        if (urlMax !== null) params.set("maxPrice", urlMax);
      }
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (sortOrder && sortOrder !== "newest") params.set("sort", sortOrder);
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      if (inStockOnly) params.set("inStock", "1");

      const res = await fetch(`/api/shop/products?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Fetch failed with status ${res.status}`);
      }
      const data = (await readJsonWithProgress(res, (loaded, total) => {
        if (total && total > 0) {
          const ratio = Math.min(1, loaded / total);
          setLoadingProgress(ratio);
          setProgressBytes({ loaded, total });
          return;
        }
        setLoadingProgress((prev) => prev);
      })) as { items?: Product[]; total?: number };
      setProducts(data?.items || []);
      setTotalProducts(data?.total || 0);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Shop product fetching Error", error);
      setProducts([]);
      setTotalProducts(0);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load products"
      );
    } finally {
      setLoadingProgress((prev) => (prev !== null ? 1 : prev));
      setLoading(false);
    }
  }, [
    debouncedSearch,
    maxPrice,
    minPrice,
    page,
    pageSize,
    searchParams,
    selectedBrand,
    selectedCategories,
    selectedPrice,
    sortOrder,
    readJsonWithProgress,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
    if (selectedBrand) params.set("brand", selectedBrand);
    if (selectedPrice) {
      const [min, max] = selectedPrice.split("-");
      params.set("minPrice", min);
      params.set("maxPrice", max);
    } else {
      if (minPrice) params.set("minPrice", String(minPrice));
      if (maxPrice && maxPrice !== 10000) params.set("maxPrice", String(maxPrice));
    }
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (sortOrder && sortOrder !== "newest") params.set("sort", sortOrder);
    if (page > 1) params.set("page", String(page));
    if (inStockOnly) params.set("inStock", "1");
    const queryString = params.toString();
    router.replace(`${pathname}?${queryString}`, { scroll: false });
  }, [
    debouncedSearch,
    maxPrice,
    minPrice,
    page,
    pathname,
    router,
    selectedBrand,
    selectedCategories,
    selectedPrice,
    sortOrder,
    inStockOnly,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrand(null);
    setSelectedPrice(null);
    setSearchTerm("");
    setMinPrice(0);
    setMaxPrice(10000);
    setPage(1);
    setSortOrder("newest");
    setInStockOnly(false);
  };

  const handleBrandChange = useCallback((value: string | null) => {
    setSelectedBrand(value);
    setPage(1);
  }, []);

  const handlePriceChange = useCallback((value: string | null) => {
    setSelectedPrice(value);
    setPage(1);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Container className="py-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <Title className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                {t("client.shop.header.title")}
              </Title>
              <p className="text-gray-600 text-sm">
                {t("client.shop.header.subtitle")}
              </p>
            </div>
            {(selectedCategories.length > 0 || selectedBrand !== null || selectedPrice !== null || searchTerm) && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors duration-200 text-sm font-medium"
              >
                {t("client.shop.filters.clearAll")}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t("client.shop.search.placeholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-black-strong/20 focus:border-brand-black-strong text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-black-strong/20 focus:border-brand-black-strong"
              >
                <option value="newest">{t("client.shop.sort.newest")}</option>
                <option value="price-asc">{t("client.shop.sort.priceAsc")}</option>
                <option value="price-desc">{t("client.shop.sort.priceDesc")}</option>
                <option value="popularity">{t("client.shop.sort.popularity")}</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedCategories.length || selectedBrand || selectedPrice || searchTerm) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2">
                  {t("client.shop.filters.active")}
                </span>
                {selectedCategories.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {t("client.shop.filters.category", {
                      name:
                        categories?.find((cat) => cat?.slug?.current === slug)
                          ?.title || slug,
                    })}
                  </span>
                ))}
                {selectedBrand && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-highlight text-success-base">
                    {t("client.shop.filters.brand", {
                      name: brands?.find(
                        (brand) => brand?.slug?.current === selectedBrand
                      )?.title,
                    })}
                  </span>
                )}
                {selectedPrice && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {t("client.shop.filters.price", {
                      range: `$${selectedPrice.replace("-", " - $")}`,
                    })}
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {t("client.shop.filters.search", { term: searchTerm })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <SheetTrigger asChild>
              <button
                className="inline-flex items-center justify-center w-full px-4 py-3 bg-white border border-border rounded-lg text-sm font-medium text-ink hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)] transition-colors duration-200"
                aria-controls="mobile-filters-panel"
                aria-expanded={showMobileFilters}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showMobileFilters
                  ? t("client.shop.mobile.hide")
                  : t("client.shop.mobile.show")}
                {(selectedCategories.length > 0 || selectedBrand || selectedPrice) && (
                  <span className="ml-2 bg-ink text-white text-xs px-2 py-1 rounded-full">
                    {[...selectedCategories, selectedBrand, selectedPrice, searchTerm].filter(Boolean).length}
                  </span>
                )}
              </button>
            </SheetTrigger>
          </div>

          {/* <div className="flex flex-col lg:flex-row gap-6" /> */}
          <div className="flex flex-col lg:flex-row gap-6">
            <SheetContent
              side="bottom"
              className="h-[80vh] max-h-[80vh] overflow-y-auto bg-surface-0 text-ink"
              aria-label={t("client.shop.filters.panelLabel")}
              id="mobile-filters-panel"
            >
              <SheetHeader className="px-1">
                <SheetTitle>{t("client.shop.filters.title")}</SheetTitle>
                <SheetDescription>{t("client.shop.filters.description")}</SheetDescription>
              </SheetHeader>
              <div className="divide-y divide-border">
                <Accordion type="multiple" defaultValue={["categories", "brand"]}>
                  <AccordionItem value="categories">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-ink">
                      {t("client.shop.filters.categories")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <CategoryList
                        categories={categories}
                        selectedCategories={selectedCategories}
                        setSelectedCategories={updateSelectedCategories}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="brand">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-ink">
                      {t("client.shop.filters.brandLabel")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <BrandList
                        brands={brands}
                        setSelectedBrand={handleBrandChange}
                        selectedBrand={selectedBrand}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="price">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-ink">
                      {t("client.shop.filters.priceLabel")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <PriceList
                        setSelectedPrice={handlePriceChange}
                        selectedPrice={selectedPrice}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="more">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-ink">
                      {t("client.shop.filters.more")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-4 flex items-center gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => setInStockOnly((v) => !v)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)] ${
                            inStockOnly
                              ? "border-ink bg-ink text-white"
                              : "border-border text-ink"
                          }`}
                        >
                          <CheckSquare className="h-4 w-4" />
                          <span>{t("client.shop.filters.inStock")}</span>
                        </button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <SheetFooter className="mt-4 gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    resetFilters();
                    setShowMobileFilters(false);
                  }}
                >
                  {t("client.shop.filters.clearAll")}
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  className="w-full"
                  onClick={() => setShowMobileFilters(false)}
                >
                  {t("client.shop.filters.apply")}
                </Button>
              </SheetFooter>
            </SheetContent>

            {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t("client.shop.filters.title")}
                  </h3>
                </div>
                <Accordion type="multiple" defaultValue={["categories"]} className="divide-y divide-gray-100">
                  <AccordionItem value="categories">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {t("client.shop.filters.categories")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <CategoryList
                        categories={categories}
                        selectedCategories={selectedCategories}
                        setSelectedCategories={updateSelectedCategories}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="brand">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {t("client.shop.filters.brandLabel")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <BrandList
                        brands={brands}
                        setSelectedBrand={handleBrandChange}
                        selectedBrand={selectedBrand}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="price">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {t("client.shop.filters.priceLabel")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <PriceList
                        setSelectedPrice={handlePriceChange}
                        selectedPrice={selectedPrice}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="more">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {t("client.shop.filters.more")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-4 flex items-center gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => setInStockOnly((v) => !v)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)] ${
                            inStockOnly
                              ? "border-ink bg-ink text-white"
                              : "border-gray-200 text-gray-800"
                          }`}
                        >
                          <CheckSquare className="h-4 w-4" />
                          <span>{t("client.shop.filters.inStock")}</span>
                        </button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {t("client.shop.loading.title")}
                        </p>
                        <p className="text-xs text-gray-600">
                          {loadingProgress !== null
                            ? `${Math.round(loadingProgress * 100)}%`
                            : t("client.shop.loading.waiting")}
                        </p>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-text-main to-brand-red-accent transition-[width] duration-200 ease-out"
                          style={{
                            width:
                              loadingProgress !== null
                                ? `${Math.round(loadingProgress * 100)}%`
                                : "35%",
                          }}
                        />
                      </div>
                      {progressBytes?.total ? (
                        <p className="mt-2 text-xs text-gray-500">
                          {t("client.shop.loading.bytes", {
                            loaded: Math.round(progressBytes.loaded / 1024),
                            total: Math.round(progressBytes.total / 1024),
                          })}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">
                          {t("client.shop.loading.helper")}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-pulse"
                        >
                          <div className="aspect-square bg-gray-200"></div>
                          <div className="p-4 space-y-3">
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-8 bg-gray-200 rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : errorMessage ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-gray-900">
                      {t("client.shop.error.load")}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => void fetchProducts()}
                        className="px-4 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        {t("client.shop.error.retry")}
                      </button>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="px-4 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        {t("client.shop.filters.clearAll")}
                      </button>
                    </div>
                  </div>
                ) : products?.length > 0 ? (
                  <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 pb-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
                      {totalProducts === 1
                        ? t("client.shop.results.single", { count: totalProducts })
                        : t("client.shop.results.plural", { count: totalProducts })}
                    </h2>
                    <div className="text-sm text-gray-600">
                      {t("client.shop.results.page", {
                        page,
                        total: totalPages,
                      })}
                    </div>
                  </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {products?.map((product) => (
                        <ProductCard key={product?._id} product={product} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <button
                          disabled={page === 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="px-4 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {t("client.shop.pagination.prev")}
                        </button>
                        <span className="text-sm text-gray-700">
                          {t("client.shop.pagination.page", {
                            page,
                            total: totalPages,
                          })}
                        </span>
                        <button
                          disabled={page === totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className="px-4 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {t("client.shop.pagination.next")}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12">
                    <div className="text-center text-sm text-gray-600">
                      {t("client.shop.empty")}
                    </div>
                    {hasActiveFilters ? (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="px-4 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        >
                          {t("client.shop.filters.clearAll")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </Sheet>
      </Container>
    </div>
  );
};

export default Shop;
