"use client";

import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "motion/react";
import HomeTabbar from "./HomeTabbar";
import NoProductAvailable from "./product/NoProductAvailable";
import { Grid3X3, LayoutGrid, List, Filter, SortAsc, Eye } from "lucide-react";
import Container from "./Container";
import { Product } from "@/sanity.types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductGridSkeleton } from "./ProductSkeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useNavCategories } from "@/hooks/useNavCategories";
import { resolveActiveDeal, resolveDealPrice } from "@/lib/deals";
import { useTranslation } from "react-i18next";

type ViewMode = "grid-2" | "grid-3" | "grid-4" | "grid-5" | "list";
type SortOption =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "newest";

const ProductGrid = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const navCategories = useNavCategories();
  const [selectedTab, setSelectedTab] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid-5");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [showFilters, setShowFilters] = useState(false);
  const productsPerPage = 20;
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 1000]);
  const [stockStatus, setStockStatus] = useState<string>("all");
  const [rating, setRating] = useState<string>("all");
  const selectedCategoryTitle =
    navCategories.find((cat) => cat.href === selectedTab)?.title ||
    t("client.home.productGrid.browseFallback");
  const activeFiltersCount =
    (priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1] ? 1 : 0) +
    (stockStatus !== "all" ? 1 : 0) +
    (rating !== "all" ? 1 : 0);

  const getApiSortParam = (sort: SortOption): string => {
    switch (sort) {
      case "name-asc":
        return "name-asc";
      case "name-desc":
        return "name-desc";
      case "price-asc":
        return "price-asc";
      case "price-desc":
        return "price-desc";
      case "newest":
        return "newest";
      default:
        return "newest";
    }
  };

  const getFinalPrice = (product: Product) => {
    const activeDeal = resolveActiveDeal(product as any);
    const dealPrice = resolveDealPrice(activeDeal, product.price || 0);
    if (activeDeal && typeof dealPrice === "number") {
      return dealPrice;
    }
    const price = product.price || 0;
    return product.discount ? price - price * (product.discount / 100) : price;
  };

  const resetPriceRangeFromData = (items: Product[]) => {
    if (!items.length) {
      setPriceBounds([0, 1000]);
      setPriceRange([0, 1000]);
      return;
    }

    const prices = items.map(getFinalPrice);
    const minPrice = Math.max(0, Math.min(...prices));
    const maxPrice = Math.max(...prices);
    const paddedMax = Math.max(1000, Math.ceil(maxPrice / 100) * 100);

    setPriceBounds([minPrice, paddedMax]);
    setPriceRange([minPrice, paddedMax]);
  };

  // Pick first category when nav categories load
  useEffect(() => {
    // Default to first real category once loaded; avoid placeholder fallbacks.
    if (!selectedTab && navCategories.length) {
      setSelectedTab(navCategories[0].href);
    }
  }, [navCategories, selectedTab]);

  useEffect(() => {
    if (!selectedTab) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("categories", selectedTab);
        const sortParam = getApiSortParam(sortBy);
        if (sortParam) params.set("sort", sortParam);
        params.set("limit", "50");

        const response = await fetch(`/api/shop/products?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load products (${response.status})`);
        }

        const data = (await response.json()) as { items?: Product[] };
        const items = data?.items || [];

        setProducts(items);
        setFilteredProducts(items);
        resetPriceRangeFromData(items);
      } catch (error) {
        console.log("Product fetching Error", error);
        setProducts([]);
        setFilteredProducts([]);
        resetPriceRangeFromData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTab, sortBy]);

  // Apply filters to products
  const applyFilters = () => {
    let filtered = [...products];

    // Filter by price range
    const [minBound, maxBound] = priceBounds;
    if (priceRange[0] > minBound || (maxBound > 0 && priceRange[1] < maxBound)) {
      filtered = filtered.filter((product) => {
        const finalPrice = getFinalPrice(product);
        return finalPrice >= priceRange[0] && finalPrice <= priceRange[1];
      });
    }

    // Filter by stock status
    if (stockStatus !== "all") {
      filtered = filtered.filter((product) => {
        if (stockStatus === "in-stock") {
          return (product.stock || 0) > 0;
        } else if (stockStatus === "out-of-stock") {
          return (product.stock || 0) === 0;
        }
        return true;
      });
    }

    // Filter by status (using status as a proxy for "rating/quality")
    if (rating !== "all") {
      filtered = filtered.filter((product) => {
        if (rating === "5") {
          return product.status === "hot"; // Hot products = 5 stars
        } else if (rating === "4") {
          return product.status === "hot" || product.status === "new"; // Hot or New = 4+ stars
        } else if (rating === "3") {
          return (
            product.status === "hot" ||
            product.status === "new" ||
            product.status === "sale"
          ); // All products = 3+ stars
        }
        return true;
      });
    }

    setFilteredProducts(filtered);
  };

  // Auto-apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [products, priceRange, priceBounds, stockStatus, rating]);

  const getGridClasses = () => {
    switch (viewMode) {
      case "grid-2":
        return "grid-cols-1 sm:grid-cols-2 gap-6";
      case "grid-3":
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5";
      case "grid-4":
        return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";
      case "grid-5":
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3";
      case "list":
        return "grid-cols-1 gap-4";
      default:
        return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";
    }
  };

  const ViewModeButton = ({
    mode,
    icon,
    label,
  }: {
    mode: ViewMode;
    icon: React.ReactNode;
    label: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setViewMode(mode)}
      aria-pressed={viewMode === mode}
      className={`h-10 w-10 rounded-xl border transition-all duration-150 ${
        viewMode === mode
          ? "border-ink bg-ink text-white shadow-[0_10px_30px_rgba(12,18,38,0.16)]"
          : "border-transparent text-ink hover:border-border hover:bg-white/90"
      }`}
      title={label}
    >
      {icon}
    </Button>
  );

  return (
    <Container className="mt-16 flex flex-col gap-8 lg:px-0 lg:mt-24">
      <div className="relative mb-4 overflow-hidden rounded-[28px] border border-border/80 bg-gradient-to-br from-surface-0 via-surface-1 to-white shadow-[0_18px_80px_rgba(12,18,38,0.08)]">
        <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-accent-red/12 blur-3xl" />
        <div className="pointer-events-none absolute right-4 top-10 h-48 w-48 rounded-full bg-ink/5 blur-3xl" />
        <div className="relative space-y-6 p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted shadow-sm">
                {t("client.home.productGrid.kicker")}
              </div>
              <h2 className="text-3xl lg:text-4xl font-semibold text-ink-strong">
                {t("client.home.productGrid.title")}
              </h2>
              <p className="text-ink-muted text-base max-w-3xl">
                {t("client.home.productGrid.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-white/85 text-ink-strong border-border/60">
                {t("client.home.productGrid.curatedGroups", {
                  count: navCategories.length || 0,
                })}
              </Badge>
              <Badge variant="secondary" className="bg-ink/90 text-white border-transparent">
                {t("client.home.productGrid.itemsVisible", {
                  count: filteredProducts.length,
                })}
              </Badge>
              {activeFiltersCount > 0 && (
                <Badge variant="outline" className="border-ink/30 bg-white/80 text-ink-strong">
                  {t("client.home.productGrid.activeFilters", {
                    count: activeFiltersCount,
                  })}
                </Badge>
              )}
            </div>
          </div>

          <HomeTabbar
            selectedTab={selectedTab}
            onTabSelect={setSelectedTab}
            categories={navCategories}
          />

          <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-[0_10px_34px_rgba(12,18,38,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-ink/90 text-white border-transparent"
                >
                  {selectedCategoryTitle}
                </Badge>

                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                    {t("client.home.productGrid.layoutLabel")}
                  </span>
                  <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-white/90 p-1 shadow-inner">
                    <ViewModeButton
                      mode="grid-2"
                      icon={<Grid3X3 size={16} />}
                      label={t("client.home.productGrid.layout.grid2")}
                    />
                    <ViewModeButton
                      mode="grid-3"
                      icon={<LayoutGrid size={16} />}
                      label={t("client.home.productGrid.layout.grid3")}
                    />
                    <ViewModeButton
                      mode="grid-4"
                      icon={<LayoutGrid size={16} />}
                      label={t("client.home.productGrid.layout.grid4")}
                    />
                    <ViewModeButton
                      mode="grid-5"
                      icon={<LayoutGrid size={16} />}
                      label={t("client.home.productGrid.layout.grid5")}
                    />
                    <ViewModeButton
                      mode="list"
                      icon={<List size={16} />}
                      label={t("client.home.productGrid.layout.list")}
                    />
                  </div>
                </div>

                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 rounded-xl border ${
                    showFilters
                      ? "border-ink bg-ink text-white shadow-[0_12px_36px_rgba(12,18,38,0.14)]"
                      : "border-border text-ink hover:border-ink hover:bg-white"
                  }`}
                >
                  <Filter size={16} />
                  <span className="hidden sm:inline">
                    {t("client.home.productGrid.filters")}
                    {activeFiltersCount ? ` (${activeFiltersCount})` : ""}
                  </span>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <SortAsc size={16} className="text-brand-text-muted" />
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as SortOption)}
                  >
                    <SelectTrigger className="w-48 border-border/70 bg-white/80 focus:border-brand-text-main">
                      <SelectValue
                        placeholder={t("client.home.productGrid.sort.placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">
                        {t("client.home.productGrid.sort.nameAsc")}
                      </SelectItem>
                      <SelectItem value="name-desc">
                        {t("client.home.productGrid.sort.nameDesc")}
                      </SelectItem>
                      <SelectItem value="price-asc">
                        {t("client.home.productGrid.sort.priceAsc")}
                      </SelectItem>
                      <SelectItem value="price-desc">
                        {t("client.home.productGrid.sort.priceDesc")}
                      </SelectItem>
                      <SelectItem value="newest">
                        {t("client.home.productGrid.sort.newest")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-brand-text-muted">
                  <Eye size={16} />
                  <Badge variant="secondary" className="bg-brand-border text-brand-black-strong">
                    {t("client.home.productGrid.productsCount", {
                      count: filteredProducts.length,
                    })}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <Separator className="my-6 border-border/80" />
                <Card className="border-border/80 bg-white/90 backdrop-blur-sm shadow-[0_12px_40px_rgba(12,18,38,0.08)]">
                  <CardContent className="p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-brand-black-strong flex items-center gap-2 mb-2">
                        🎯 {t("client.home.productGrid.advancedFilters.title")}
                      </h3>
                      <p className="text-sm text-brand-text-muted">
                        {t("client.home.productGrid.advancedFilters.subtitle")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Price Range Filter */}
                      <div className="space-y-4 rounded-xl border border-border/80 bg-white/90 p-4">
                        <Label className="text-sm font-semibold text-ink-strong flex items-center gap-2">
                          {t("client.home.productGrid.filter.priceRange")}
                        </Label>
                        <div className="space-y-4">
                          <div className="px-2">
                            <Slider
                              value={priceRange}
                              onValueChange={(value) => setPriceRange(value as [number, number])}
                              max={priceBounds[1]}
                              min={priceBounds[0]}
                              step={10}
                              className="w-full"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-brand-text-muted">
                                {t("client.home.productGrid.filter.minPrice")}
                              </Label>
                              <Input
                                type="number"
                                placeholder={String(priceBounds[0])}
                                value={priceRange[0]}
                                onChange={(e) =>
                                  setPriceRange([
                                    parseInt(e.target.value) || priceBounds[0],
                                    priceRange[1],
                                  ])
                                }
                                className="h-9 border-gray-200 focus:border-brand-text-main"
                              />
                            </div>
                            <div className="text-brand-text-muted font-bold pt-5">
                              -
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-brand-text-muted">
                                {t("client.home.productGrid.filter.maxPrice")}
                              </Label>
                              <Input
                                type="number"
                                placeholder={String(priceBounds[1])}
                                value={priceRange[1]}
                                onChange={(e) =>
                                  setPriceRange([
                                    priceRange[0],
                                    parseInt(e.target.value) || priceBounds[1],
                                  ])
                                }
                                className="h-9 border-gray-200 focus:border-brand-text-main"
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <Badge className="bg-brand-text-main/20 text-brand-black-strong border-brand-text-main/30">
                              ${priceRange[0]} - ${priceRange[1]}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Stock Status Filter */}
                      <div className="space-y-4 rounded-xl border border-border/80 bg-white/90 p-4">
                        <Label className="text-sm font-semibold text-ink-strong flex items-center gap-2">
                          {t("client.home.productGrid.filter.stockStatus")}
                        </Label>
                        <Select
                          value={stockStatus}
                          onValueChange={setStockStatus}
                        >
                          <SelectTrigger className="border-gray-200 focus:border-brand-text-main h-10">
                            <SelectValue
                              placeholder={t("client.home.productGrid.filter.stockPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {t("client.home.productGrid.filter.allProducts")}
                            </SelectItem>
                            <SelectItem value="in-stock">
                              {t("client.home.productGrid.filter.stock.inStock")}
                            </SelectItem>
                            <SelectItem value="out-of-stock">
                              {t("client.home.productGrid.filter.stock.outOfStock")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {stockStatus && stockStatus !== "all" && (
                          <div className="text-center">
                            <Badge
                              variant="outline"
                              className="w-fit border-border text-ink"
                            >
                              {stockStatus === "in-stock"
                                ? t("client.home.productGrid.filter.stock.badgeInStockOnly")
                                : t("client.home.productGrid.filter.stock.badgeOutOfStockOnly")}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Quality Filter */}
                      <div className="space-y-4 rounded-xl border border-border/80 bg-white/90 p-4">
                        <Label className="text-sm font-semibold text-ink-strong flex items-center gap-2">
                          {t("client.home.productGrid.filter.productStatus")}
                        </Label>
                        <Select value={rating} onValueChange={setRating}>
                          <SelectTrigger className="border-gray-200 focus:border-brand-text-main h-10">
                            <SelectValue
                              placeholder={t("client.home.productGrid.filter.qualityPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {t("client.home.productGrid.filter.allProducts")}
                            </SelectItem>
                            <SelectItem value="5">
                              {t("client.home.productGrid.filter.quality.hot")}
                            </SelectItem>
                            <SelectItem value="4">
                              {t("client.home.productGrid.filter.quality.newHot")}
                            </SelectItem>
                            <SelectItem value="3">
                              {t("client.home.productGrid.filter.quality.standard")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {rating && rating !== "all" && (
                          <div className="text-center">
                            <Badge
                              variant="outline"
                              className="w-fit border-border text-ink"
                            >
                              {rating === "5"
                                ? t("client.home.productGrid.filter.quality.badgeHotOnly")
                                : rating === "4"
                                ? t("client.home.productGrid.filter.quality.badgeNewHot")
                                : t("client.home.productGrid.filter.quality.badgeStandard")}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col justify-end gap-3 rounded-xl border border-border/80 bg-white/90 p-4">
                        <div className="text-center text-xs uppercase tracking-[0.1em] text-ink-muted">
                          {t("client.home.productGrid.filter.updatesInstantly")}
                        </div>
                        <Button variant="accent" className="w-full" onClick={applyFilters}>
                          {t("client.home.productGrid.filter.apply", {
                            count: filteredProducts.length,
                          })}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setPriceRange([priceBounds[0], priceBounds[1]]);
                            setStockStatus("all");
                            setRating("all");
                          }}
                        >
                          {t("client.home.productGrid.filter.clear")}
                        </Button>
                      </div>
                    </div>

                    {/* Active Filters Display */}
                    {(priceRange[0] > priceBounds[0] ||
                      priceRange[1] < priceBounds[1] ||
                      (stockStatus && stockStatus !== "all") ||
                      (rating && rating !== "all")) && (
                      <div className="mt-6 border-t border-border pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-brand-black-strong">
                            {t("client.home.productGrid.filter.activeTitle")}
                          </span>
                          {(priceRange[0] > priceBounds[0] ||
                            priceRange[1] < priceBounds[1]) && (
                            <Badge
                              variant="secondary"
                              className="bg-brand-border text-brand-black-strong"
                            >
                              {t("client.home.productGrid.filter.activePrice", {
                                min: priceRange[0],
                                max: priceRange[1],
                              })}
                            </Badge>
                          )}
                          {stockStatus && stockStatus !== "all" && (
                            <Badge
                              variant="secondary"
                              className="bg-brand-border text-brand-black-strong"
                            >
                              {t("client.home.productGrid.filter.activeStock", {
                                status:
                                  stockStatus === "in-stock"
                                    ? t("client.home.productGrid.filter.stock.inStock")
                                    : t("client.home.productGrid.filter.stock.outOfStock"),
                              })}
                            </Badge>
                          )}
                          {rating && rating !== "all" && (
                            <Badge
                              variant="secondary"
                              className="bg-brand-border text-brand-black-strong"
                            >
                              {t("client.home.productGrid.filter.activeQuality", {
                                label:
                                  rating === "5"
                                    ? `🔥 ${t("client.home.productGrid.filter.quality.label.premium")}`
                                    : rating === "4"
                                    ? `✨ ${t("client.home.productGrid.filter.quality.label.highQuality")}`
                                    : `🛍️ ${t("client.home.productGrid.filter.quality.label.standardPlus")}`,
                              })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <ProductGridSkeleton />
      ) : filteredProducts?.length ? (
        <div className={`grid ${getGridClasses()}`}>
          <AnimatePresence mode="popLayout">
            {filteredProducts
              ?.slice(0, productsPerPage)
              .map((product, index) => (
                <motion.div
                  key={product?._id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    layout: { duration: 0.3 },
                  }}
                  className="group"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      ) : (
        <NoProductAvailable selectedTab={selectedTab} />
      )}

      {/* Load More Section */}
      {filteredProducts?.length > productsPerPage && (
        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="accent"
            className="px-8 py-3"
          >
            {t("client.home.productGrid.loadMore")}
          </Button>
        </div>
      )}
    </Container>
  );
};

export default ProductGrid;
