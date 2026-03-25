"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import type { PROMOTION_BY_CAMPAIGN_ID_QUERYResult } from "@/sanity.types";
import { useTranslation } from "react-i18next";

type Promotion = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;
type PromotionProduct = NonNullable<Promotion["products"]>[number];

type PromotionProductsTableProps = {
  products: PromotionProduct[];
  promotion: Promotion;
  className?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Math.max(0, value || 0));

const resolveSlug = (slug: unknown): string | undefined => {
  if (typeof slug === "string" && slug) return slug;
  if (slug && typeof slug === "object" && "current" in (slug as Record<string, unknown>)) {
    const current = (slug as { current?: unknown }).current;
    return typeof current === "string" && current ? current : undefined;
  }
  return undefined;
};

const resolveImage = (product: PromotionProduct) => {
  if (typeof product.imageUrl === "string" && product.imageUrl) return product.imageUrl;
  const imageList = Array.isArray(product.images) ? product.images : [];
  const first = imageList.find((img) => img && typeof img === "object") as
    | { url?: string; asset?: { url?: string } }
    | undefined;
  return first?.url || first?.asset?.url || "";
};

const resolveVariantId = (product: PromotionProduct) => {
  const direct = (product as { variantId?: unknown }).variantId;
  if (typeof direct === "string" && direct.trim()) return direct;

  const variant = (product as { variant?: { _id?: string | null } | null }).variant;
  if (variant?._id && typeof variant._id === "string") return variant._id;

  return undefined;
};

const computePromoPrice = (
  basePrice: number,
  discountType?: string | null,
  discountValue?: number | null,
) => {
  const safeBase = Math.max(0, basePrice || 0);
  const value = typeof discountValue === "number" ? Math.max(0, discountValue) : 0;

  if (discountType === "percentage" && value > 0) {
    return Math.max(0, safeBase * (1 - value / 100));
  }

  if (
    (discountType === "fixed" ||
      discountType === "fixed_amount" ||
      discountType === "fixedAmount") &&
    value > 0
  ) {
    return Math.max(0, safeBase - value);
  }

  return safeBase;
};

export default function PromotionProductsTable({
  products,
  promotion,
  className,
}: PromotionProductsTableProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { cart, addItems, updateItem, removeItem, isMutating } = useCart();
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const promotionId = promotion.campaignId || promotion._id;
  const isBundlePromotion =
    promotion.discountType === "bxgy" || promotion.type === "bundle";

  const handleAddToCart = async (product: PromotionProduct, unitPrice: number, slug?: string) => {
    setPendingProductId(product._id);
    try {
      await addItems({
        promotionId,
        items: [
          {
            productId: product._id,
            productName: product.name ?? product._id,
            productSlug: slug ?? product._id,
            quantity: 1,
            unitPrice,
            variantId: resolveVariantId(product),
          },
        ],
      });

      toast.success("Added to cart", {
        description: t("client.promotions.productList.addedDesc", {
          defaultValue: "{{name}} was added.",
          name: product.name || t("client.promotions.productList.productFallback", "Product"),
        }),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("client.promotions.productList.addFailed", "Unable to add product to cart");
      toast.error(message);
    } finally {
      setPendingProductId((current) => (current === product._id ? null : current));
    }
  };

  const handleIncreaseQuantity = async (
    product: PromotionProduct,
    unitPrice: number,
    slug?: string,
    lineId?: string,
  ) => {
    const variantId = resolveVariantId(product);
    const matchingItems =
      cart?.items.filter(
        (item) => item.productId === product._id && (item.variantId ?? "") === (variantId ?? ""),
      ) ?? [];
    const itemCount = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
    const availableStock = typeof product.stock === "number" ? product.stock : undefined;

    if (typeof availableStock === "number" && itemCount >= availableStock) {
      toast.error(t("client.promotions.productList.stockLimit", "Stock limit reached"), {
        description: t(
          "client.promotions.productList.stockLimitDesc",
          "Cannot add more than available stock."
        ),
      });
      return;
    }

    setPendingProductId(product._id);
    try {
      if (isBundlePromotion) {
        await addItems({
          promotionId,
          items: [
            {
              productId: product._id,
              productName: product.name ?? product._id,
              productSlug: slug ?? product._id,
              quantity: 1,
              unitPrice,
              variantId,
            },
          ],
        });
      } else if (lineId) {
        const line = cart?.items.find((item) => item.id === lineId);
        if (line) {
          await updateItem(line.id, line.quantity + 1);
        } else {
          await addItems({
            promotionId,
            items: [
              {
                productId: product._id,
                productName: product.name ?? product._id,
                productSlug: slug ?? product._id,
                quantity: 1,
                unitPrice,
                variantId,
              },
            ],
          });
        }
      } else {
        await addItems({
          promotionId,
          items: [
            {
              productId: product._id,
              productName: product.name ?? product._id,
              productSlug: slug ?? product._id,
              quantity: 1,
              unitPrice,
              variantId,
            },
          ],
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("client.promotions.productList.updateFailed", "Unable to update cart quantity");
      toast.error(message);
    } finally {
      setPendingProductId((current) => (current === product._id ? null : current));
    }
  };

  const handleDecreaseQuantity = async (product: PromotionProduct, lineId?: string) => {
    if (!lineId) return;

    const line = cart?.items.find((item) => item.id === lineId);
    if (!line) return;

    setPendingProductId(product._id);
    try {
      if (line.quantity > 1) {
        await updateItem(line.id, line.quantity - 1);
      } else {
        await removeItem(line.id);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("client.promotions.productList.updateFailed", "Unable to update cart quantity");
      toast.error(message);
    } finally {
      setPendingProductId((current) => (current === product._id ? null : current));
    }
  };

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="w-[48%]">
                {t("client.promotions.productList.columns.product", "Product")}
              </TableHead>
              <TableHead className="text-right">
                {t("client.promotions.productList.columns.original", "Original")}
              </TableHead>
              <TableHead className="text-right">
                {t("client.promotions.productList.columns.promo", "Promo")}
              </TableHead>
              <TableHead className="text-right">
                {t("client.promotions.productList.columns.savings", "Savings")}
              </TableHead>
              <TableHead className="text-right">
                {t("client.promotions.productList.columns.action", "Action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const basePrice = typeof product.price === "number" ? product.price : 0;
              const promoPrice = computePromoPrice(
                basePrice,
                promotion.discountType,
                promotion.discountValue,
              );
              const savings = Math.max(0, basePrice - promoPrice);
              const slug = resolveSlug(product.slug);
              const productRouteParam = slug || product._id;
              const imageSrc = resolveImage(product);
              const isRowPending = pendingProductId === product._id && isMutating;
              const variantId = resolveVariantId(product) ?? "";
              const productItems =
                cart?.items.filter((item) => item.productId === product._id) ?? [];
              const variantMatchedItems = productItems.filter(
                (item) => (item.variantId ?? "") === variantId,
              );
              const matchingItems =
                variantMatchedItems.length > 0 ? variantMatchedItems : productItems;
              const promotionLine =
                matchingItems.find(
                  (item) =>
                    item.appliedPromotion?.type === "promotion" &&
                    item.appliedPromotion.id === promotionId,
                ) ?? matchingItems[0];
              const quantityInCart = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
              const productHref = `/products/${productRouteParam}`;
              const navigateToProduct = () => {
                window.location.href = productHref;
              };

              return (
                <TableRow
                  key={product._id}
                  className="cursor-pointer"
                  onClick={navigateToProduct}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigateToProduct();
                    }
                  }}
                  tabIndex={0}
                >
                  <TableCell>
                    <a
                      href={productHref}
                      className="group block"
                      onClick={(event) => {
                        event.preventDefault();
                        navigateToProduct();
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={product.name || t("client.promotions.productList.productFallback", "Product")}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-strong group-hover:underline">
                            {product.name || t("client.promotions.productList.unnamed", "Unnamed product")}
                          </p>
                          <p className="truncate text-xs text-ink-muted">{slug || product._id}</p>
                        </div>
                      </div>
                    </a>
                  </TableCell>
                  <TableCell className="text-right text-sm text-ink-muted">
                    {formatCurrency(basePrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-ink-strong">
                    {formatCurrency(promoPrice)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-emerald-700">
                    {savings > 0 ? `-${formatCurrency(savings)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {quantityInCart > 0 ? (
                      <div
                        className="inline-flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isRowPending}
                          onClick={() => void handleDecreaseQuantity(product, promotionLine?.id)}
                        >
                          {isRowPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <span className="min-w-6 text-center text-sm font-semibold text-ink-strong">
                          {quantityInCart}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isRowPending}
                          onClick={() =>
                            void handleIncreaseQuantity(product, promoPrice, slug, promotionLine?.id)
                          }
                        >
                          {isRowPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isMutating}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleAddToCart(product, promoPrice, slug);
                        }}
                        className="inline-flex items-center gap-1.5"
                      >
                        {isRowPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-3.5 w-3.5" />
                        )}
                        {t("client.promotions.addToCart.cta", "Add to Cart")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
