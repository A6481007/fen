"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Eye,
  Package,
  Calendar,
  Tag,
  Star,
  Package2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ProductsSkeleton } from "./SkeletonLoaders";
import { Product } from "./types";
import { safeApiCall, handleApiError } from "./apiHelpers";
import type { Category } from "@/sanity.types";
import { useTranslation } from "react-i18next";

interface AdminProductsProps {
  initialCategories?: Category[];
}

const AdminProducts: React.FC<AdminProductsProps> = ({
  initialCategories = [],
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [productCategory, setProductCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const limit = 10;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(0);
    }
  }, [debouncedSearchTerm, searchTerm]);

  // Utility functions
  const formatCurrency = (amount: number): string => {
    const locale = i18n.language === "th" ? "th-TH" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const getVariantLabel = (variant: Product["variant"]) => {
    if (!variant) return "";
    if (typeof variant === "string") return variant;
    if ("title" in variant && variant.title) return variant.title;
    if ("name" in variant && variant.name) return variant.name;
    if ("slug" in variant && variant.slug?.current) {
      return variant.slug.current;
    }
    if ("_ref" in variant && variant._ref) return variant._ref;
    return "";
  };

  // Fetch products
  const fetchProducts = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const categoryParam = productCategory === "all" ? "" : productCategory;
        const data = await safeApiCall(
          `/api/admin/products?limit=${limit}&offset=${
            page * limit
          }&category=${categoryParam}&search=${debouncedSearchTerm}`
        );
        setProducts(data.products);
      } catch (error) {
        handleApiError(error, "Products fetch");
      } finally {
        setLoading(false);
      }
    },
    [productCategory, debouncedSearchTerm, limit]
  );

  // Effects
  useEffect(() => {
    fetchProducts(currentPage);
  }, [fetchProducts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [productCategory, debouncedSearchTerm]);

  // Keyboard navigation for image carousel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isProductDetailsOpen ||
        !selectedProduct?.images ||
        selectedProduct.images.length <= 1
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          goToPrevImage();
          break;
        case "ArrowRight":
          event.preventDefault();
          goToNextImage();
          break;
        case "Escape":
          event.preventDefault();
          setIsProductDetailsOpen(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isProductDetailsOpen, selectedProduct?.images]);

  // Handle product view
  const handleViewProduct = async (product: Product) => {
    try {
      // Reset image index when viewing a new product
      setCurrentImageIndex(0);
      // Fetch complete product details
      const response = await safeApiCall(
        `/api/admin/products?id=${product._id}`
      );
      setSelectedProduct(response.product);
      setIsProductDetailsOpen(true);
    } catch (error) {
      handleApiError(error, "Product details fetch");
      // Fallback to existing product data
      setCurrentImageIndex(0);
      setSelectedProduct(product);
      setIsProductDetailsOpen(true);
    }
  };

  // Carousel navigation functions
  const goToPrevImage = () => {
    if (selectedProduct?.images && selectedProduct.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedProduct.images!.length - 1 : prev - 1
      );
    }
  };

  const goToNextImage = () => {
    if (selectedProduct?.images && selectedProduct.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === selectedProduct.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const locale = i18n.language === "th" ? "th-TH" : "en-US";
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot":
        return "destructive";
      case "new":
        return "default";
      case "sale":
        return "secondary";
      default:
        return "outline";
    }
  };
  const statusLabel = (status: string) =>
    t(`admin.products.status.${status}`, status);

  const variantLabel = selectedProduct
    ? getVariantLabel(selectedProduct.variant)
    : "";

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <h3 className="text-lg font-semibold">
          {t("admin.products.title")}
        </h3>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-2 sm:space-y-0">
          <Input
            placeholder={t("admin.products.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48"
          />
          <Select value={productCategory} onValueChange={setProductCategory}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder={t("admin.products.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.products.allCategories")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category.title || ""}>
                  {category.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => fetchProducts(currentPage)}
            size="sm"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2 sm:hidden">{t("admin.products.refresh")}</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <ProductsSkeleton />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.products.table.product")}</TableHead>
                      <TableHead>{t("admin.products.table.category")}</TableHead>
                      <TableHead>{t("admin.products.table.brand")}</TableHead>
                      <TableHead>{t("admin.products.table.userPrice")}</TableHead>
                      <TableHead>{t("admin.products.table.dealerPrice")}</TableHead>
                      <TableHead>{t("admin.products.table.stock")}</TableHead>
                      <TableHead>{t("admin.products.table.status")}</TableHead>
                      <TableHead>{t("admin.products.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {t("admin.products.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {/* Product Image */}
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {product.images && product.images[0] ? (
                                  <Image
                                    src={urlFor(product.images[0])
                                      .width(48)
                                      .height(48)
                                      .url()}
                                    alt={product.name || t("admin.products.table.product")}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Package className="w-6 h-6" />
                                  </div>
                                )}
                              </div>
                              {/* Product Info */}
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {product.name}
                                </div>
                                {(product.featured || product.isFeatured) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {t("admin.products.featured")}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.category?.name ||
                              product.category?.title ||
                              t("admin.products.notAvailable")}
                          </TableCell>
                          <TableCell>
                            {product.brand?.name ||
                              product.brand?.title ||
                              t("admin.products.notAvailable")}
                          </TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell className="text-blue-700">
                            {formatCurrency((product as any)?.dealerPrice ?? product.price)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.stock > 0 ? "default" : "destructive"
                              }
                            >
                              {product.stock}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {statusLabel(product.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewProduct(product)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {products.length === 0 ? (
              <Card>
                <div className="p-8 text-center text-muted-foreground">
                  {t("admin.products.empty")}
                </div>
              </Card>
            ) : (
              products.map((product) => (
                <Card key={product._id}>
                  <div className="p-4 space-y-4">
                    {/* Product Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {product.images && product.images[0] ? (
                          <Image
                            src={urlFor(product.images[0])
                              .width(64)
                              .height(64)
                              .url()}
                            alt={product.name || t("admin.products.table.product")}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {(product.featured || product.isFeatured) && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  {t("admin.products.featured")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewProduct(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Product Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">
                          {t("admin.products.table.category")}
                        </div>
                        <div className="font-medium">
                          {product.category?.name ||
                            product.category?.title ||
                            t("admin.products.notAvailable")}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">
                          {t("admin.products.table.brand")}
                        </div>
                        <div className="font-medium">
                          {product.brand?.name ||
                            product.brand?.title ||
                            t("admin.products.notAvailable")}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">
                          {t("admin.products.table.userPrice")}
                        </div>
                        <div className="font-medium text-success-base">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">
                          {t("admin.products.table.dealerPrice")}
                        </div>
                        <div className="font-medium text-blue-700">
                          {formatCurrency((product as any)?.dealerPrice ?? product.price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">
                          {t("admin.products.table.stock")}
                        </div>
                        <Badge
                          variant={
                            product.stock > 0 ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {t("admin.products.stockUnits", {
                            count: product.stock,
                          })}
                        </Badge>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {t("admin.products.table.status")}:
                        </span>
                        <Badge
                          variant={getStatusColor(product.status)}
                          className="text-xs capitalize"
                        >
                          {statusLabel(product.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-4">
            <Button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {t("admin.products.pagination.previous")}
          </Button>
          <div className="hidden sm:flex items-center text-sm text-gray-500">
            {t("admin.products.pagination.page", { page: currentPage + 1 })}
          </div>
          <Button
            onClick={() => setCurrentPage(currentPage + 1)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {t("admin.products.pagination.next")}
          </Button>
        </div>
        </>
      )}

      {/* Product Details Sidebar */}
      <Sheet open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <SheetContent className="w-full sm:w-[480px] md:w-[640px] overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle>{t("admin.products.details.title")}</SheetTitle>
            <SheetDescription>
              {t("admin.products.details.subtitle")}
            </SheetDescription>
          </SheetHeader>

          {selectedProduct && (
            <div className="space-y-8 px-2">
              {/* Product Images Carousel */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {t("admin.products.details.images")}
                  </h4>
                  {selectedProduct.images &&
                    selectedProduct.images.length > 1 && (
                      <span className="text-xs text-gray-500">
                        {t("admin.products.details.imagesHelp")}
                      </span>
                    )}
                </div>
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <div className="space-y-4">
                    {/* Main Image Display */}
                    <div className="relative w-full">
                      <div className="aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-lg relative">
                        {imageLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          </div>
                        )}
                        <Image
                          src={urlFor(selectedProduct.images[currentImageIndex])
                            .width(400)
                            .height(400)
                            .url()}
                          alt={`${selectedProduct.name} - Image ${
                            currentImageIndex + 1
                          }`}
                          width={400}
                          height={400}
                          className="w-full h-full object-cover"
                          priority
                          onLoadStart={() => setImageLoading(true)}
                          onLoad={() => setImageLoading(false)}
                          onError={() => setImageLoading(false)}
                        />
                      </div>

                      {/* Navigation Buttons */}
                      {selectedProduct.images.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                            onClick={goToPrevImage}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                            onClick={goToNextImage}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Navigation */}
                    {selectedProduct.images.length > 1 && (
                      <div className="space-y-2">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
                          {selectedProduct.images.map((image, index) => (
                            <button
                              key={image._key || index}
                              onClick={() => goToImage(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                                index === currentImageIndex
                                  ? "border-blue-500 shadow-md"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <Image
                                src={urlFor(image).width(64).height(64).url()}
                                alt={`${selectedProduct.name} - Thumbnail ${
                                  index + 1
                                }`}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          {t("admin.products.details.imagesCount", {
                            current: currentImageIndex + 1,
                            total: selectedProduct.images.length,
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square max-w-sm mx-auto rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                    <div className="text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">
                        {t("admin.products.details.noImages")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  {t("admin.products.details.basicInfo")}
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600 min-w-[80px]">
                      {t("admin.products.details.productId")}
                    </span>
                    <span className="text-sm font-mono bg-white px-3 py-1 rounded border text-right break-all ml-2">
                      {selectedProduct._id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.details.name")}
                    </span>
                    <span className="text-sm font-medium text-right ml-2 flex-1">
                      {selectedProduct.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600 min-w-[80px]">
                      {t("admin.products.details.slug")}
                    </span>
                    <span className="text-sm font-mono bg-white px-3 py-1 rounded border text-right break-all ml-2">
                      {selectedProduct.slug?.current ||
                        t("admin.products.notAvailable")}
                    </span>
                  </div>
                  {selectedProduct.description && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-600">
                        {t("admin.products.details.description")}
                      </span>
                      <span className="text-sm text-gray-800 bg-white p-3 rounded border leading-relaxed">
                        {selectedProduct.description}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Pricing & Stock */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  {t("admin.products.details.pricingInventory")}
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.details.price")}
                    </span>
                    <span className="text-lg font-semibold text-success-base">
                      {formatCurrency(selectedProduct.price)}
                    </span>
                  </div>
                  {selectedProduct.discount && selectedProduct.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {t("admin.products.details.discount")}
                      </span>
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {selectedProduct.discount}%
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.table.stock")}
                    </span>
                    <Badge
                      variant={
                        selectedProduct.stock > 0 ? "default" : "destructive"
                      }
                      className="text-sm px-3 py-1"
                    >
                      {t("admin.products.stockUnits", {
                        count: selectedProduct.stock,
                      })}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Categories & Brand */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  {t("admin.products.details.classification")}
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.table.category")}
                    </span>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      <Tag className="w-3 h-3" />
                      {selectedProduct.category?.name ||
                        selectedProduct.category?.title ||
                        t("admin.products.notAvailable")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.table.brand")}
                    </span>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      <Package2 className="w-3 h-3" />
                      {selectedProduct.brand?.name ||
                        selectedProduct.brand?.title ||
                        t("admin.products.notAvailable")}
                    </Badge>
                  </div>
                  {variantLabel && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {t("admin.products.details.productType")}
                      </span>
                      <Badge variant="secondary" className="px-3 py-1">
                        {variantLabel}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Status & Features */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  {t("admin.products.details.statusFeatures")}
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.table.status")}
                    </span>
                    <Badge
                      variant={getStatusColor(selectedProduct.status)}
                      className="px-3 py-1"
                    >
                      {statusLabel(selectedProduct.status)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.details.featured")}
                    </span>
                    <Badge
                      variant={
                        selectedProduct.featured || selectedProduct.isFeatured
                          ? "default"
                          : "outline"
                      }
                      className="px-3 py-1"
                    >
                      {selectedProduct.featured ||
                      selectedProduct.isFeatured ? (
                        <>
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          {t("admin.products.featured")}
                        </>
                      ) : (
                        t("admin.products.notFeatured")
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Metadata */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  {t("admin.products.details.metadata")}
                </h4>
                <div className="grid gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.details.type")}
                    </span>
                    <span className="text-sm font-mono bg-white px-3 py-1 rounded border">
                      {selectedProduct._type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.details.created")}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded border">
                      <Calendar className="w-3 h-3" />
                      {formatDate(selectedProduct._createdAt)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.details.updated")}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded border">
                      <Calendar className="w-3 h-3" />
                      {formatDate(selectedProduct._updatedAt)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-gray-600">
                      {t("admin.products.details.revision")}
                    </span>
                    <span className="text-xs font-mono bg-white px-3 py-2 rounded border break-all leading-relaxed">
                      {selectedProduct._rev}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminProducts;
