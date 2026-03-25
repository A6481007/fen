"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { useCart } from "@/hooks/useCart";
import { trackAddToCart, trackEvent } from "@/lib/analytics";

export interface SolutionProduct {
  product: {
    _id: string;
    name: string;
    price: number;
    dealerPrice?: number;
    stock: number;
    discount?: number;
    images?: any[];
    slug: { current: string };
  };
  quantity: number;
  isRequired: boolean;
  notes?: string;
}

export interface UseSolutionCartReturn {
  addSolutionToCart: (products: SolutionProduct[], title: string) => Promise<void>;
  addProductToCart: (
    product: SolutionProduct["product"],
    quantity: number
  ) => void;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  calculateTotal: (
    products: SolutionProduct[],
    quantities: Record<string, number>
  ) => number;
  calculateBundleTotal: (
    products: SolutionProduct[],
    quantities: Record<string, number>
  ) => number;
  validateStock: (
    products: SolutionProduct[],
    quantities: Record<string, number>
  ) => { valid: boolean; outOfStock: string[] };
}

const toSafeInt = (value: number | null | undefined, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

const resolveQuantity = (
  item: SolutionProduct,
  quantities?: Record<string, number>
) => {
  const override = quantities?.[item.product._id];
  if (typeof override === "number" && Number.isFinite(override)) {
    return Math.max(0, Math.floor(override));
  }

  if (item.isRequired === false) {
    return 0;
  }

  return toSafeInt(item.quantity, 1);
};

const useSolutionCart = (): UseSolutionCartReturn => {
  const { cart, addItems, updateItem, isLoading, isMutating, error: cartError } =
    useCart();
  const [localError, setLocalError] = useState<string | null>(null);
  const { isSignedIn } = useUser();
  const [useDealerPrice, setUseDealerPrice] = useState(false);

  useEffect(() => {
    let abort = false;
    const resolvePricing = async () => {
      if (!isSignedIn) {
        setUseDealerPrice(false);
        return;
      }
      try {
        const response = await fetch("/api/user/status", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          setUseDealerPrice(false);
          return;
        }
        const data = await response.json();
        if (abort) return;
        const profile = data?.userProfile;
        const isDealer =
          profile?.isBusiness === true ||
          profile?.businessStatus === "active" ||
          profile?.membershipType === "business";
        setUseDealerPrice(Boolean(isDealer));
      } catch (error) {
        console.error("Unable to resolve pricing mode:", error);
        if (!abort) {
          setUseDealerPrice(false);
        }
      }
    };
    resolvePricing();
    return () => {
      abort = true;
    };
  }, [isSignedIn]);

  const getUnitPrice = useCallback(
    (product: SolutionProduct["product"]) => {
      const dealerPrice = product.dealerPrice;
      if (useDealerPrice && typeof dealerPrice === "number") {
        return dealerPrice;
      }
      return typeof product.price === "number" ? product.price : 0;
    },
    [useDealerPrice]
  );

  const calculateBundleTotal = useCallback(
    (products: SolutionProduct[], quantities: Record<string, number>) =>
      (products || []).reduce((sum, item) => {
        const quantity = resolveQuantity(item, quantities);
        if (quantity <= 0) return sum;
        return sum + getUnitPrice(item.product) * quantity;
      }, 0),
    [getUnitPrice]
  );

  const validateStock = useCallback(
    (products: SolutionProduct[], quantities: Record<string, number>) => {
      const outOfStock = new Set<string>();

      (products || []).forEach((item) => {
        const quantity = resolveQuantity(item, quantities);
        if (quantity <= 0) return;
        const stock =
          typeof item.product.stock === "number" && Number.isFinite(item.product.stock)
            ? Math.max(0, Math.floor(item.product.stock))
            : null;
        if (stock !== null && (stock === 0 || quantity > stock)) {
          outOfStock.add(item.product.name || item.product._id);
        }
      });

      return { valid: outOfStock.size === 0, outOfStock: Array.from(outOfStock) };
    },
    []
  );

  const addSolutionToCart = useCallback(
    async (products: SolutionProduct[], title: string) => {
      setLocalError(null);
      const bundleTitle = title?.trim() || "Solution bundle";

      if (!Array.isArray(products) || products.length === 0) {
        const message = "No products available for this solution.";
        setLocalError(message);
        toast.error(message);
        return;
      }

      const requiredItems = products.filter((item) => item.isRequired !== false);
      if (requiredItems.length === 0) {
        const message = "No required products are configured for this solution.";
        setLocalError(message);
        toast.error(message);
        return;
      }

      const unavailableRequired = requiredItems
        .filter((item) => {
          const stock =
            typeof item.product.stock === "number" &&
            Number.isFinite(item.product.stock)
              ? Math.max(0, Math.floor(item.product.stock))
              : null;
          return stock !== null && stock <= 0;
        })
        .map((item) => item.product.name || item.product._id);

      if (unavailableRequired.length) {
        const message = "Some required items are out of stock.";
        setLocalError(message);
        toast.error(message, {
          description: unavailableRequired.join(", "),
        });
        return;
      }

      const quantities = requiredItems.reduce((acc, item) => {
        acc[item.product._id] = resolveQuantity(item);
        return acc;
      }, {} as Record<string, number>);

      const missingQuantities = requiredItems
        .filter((item) => quantities[item.product._id] <= 0)
        .map((item) => item.product.name || item.product._id);

      if (missingQuantities.length) {
        const message = "Please set quantities for all required products.";
        setLocalError(message);
        toast.error(message, {
          description: missingQuantities.join(", "),
        });
        return;
      }

      const stockCheck = validateStock(requiredItems, quantities);
      if (!stockCheck.valid) {
        const message = "Some required items are out of stock.";
        setLocalError(message);
        toast.error(message, {
          description: stockCheck.outOfStock.join(", "),
        });
        return;
      }

      const lineItems = requiredItems
        .map((item) => {
          const quantity = quantities[item.product._id];
          if (quantity <= 0) return null;
          return {
            productId: item.product._id,
            productName: item.product.name ?? item.product._id,
            productSlug: item.product.slug?.current ?? item.product._id,
            quantity,
            unitPrice: getUnitPrice(item.product),
          };
        })
        .filter(Boolean) as Array<{
        productId: string;
        productName: string;
        productSlug: string;
        quantity: number;
        unitPrice: number;
      }>;

      if (!lineItems.length) {
        const message = "No items could be added to the cart.";
        setLocalError(message);
        toast.error(message);
        return;
      }

      try {
        const result = await addItems({ items: lineItems });
        const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);
        const total = calculateBundleTotal(requiredItems, quantities);

        toast.success(`${bundleTitle} added to cart.`, {
          description: `${itemCount} items added.`,
          duration: 3000,
        });

        trackEvent("solution_bundle_add", {
          solutionTitle: bundleTitle,
          itemCount,
          total,
          productIds: lineItems.map((item) => item.productId),
          quantities: lineItems.map((item) => item.quantity),
        });

        lineItems.forEach((item) => {
          const newCount =
            result.cart.items
              ?.filter((line) => line.productId === item.productId)
              ?.reduce((sum, line) => sum + line.quantity, 0) ?? item.quantity;
          trackAddToCart({
            productId: item.productId,
            name: item.productName || "Unknown",
            price: item.unitPrice,
            quantity: newCount,
          });
        });

        setLocalError(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to add the solution bundle.";
        setLocalError(message);
        toast.error(message);
      }
    },
    [addItems, calculateBundleTotal, getUnitPrice, validateStock]
  );

  const addProductToCart = useCallback(
    (product: SolutionProduct["product"], quantity: number) => {
      void (async () => {
        setLocalError(null);
        if (!product?._id) {
          const message = "Product information is missing.";
          setLocalError(message);
          toast.error(message);
          return;
        }

        const normalizedQuantity = toSafeInt(quantity, 0);
        if (normalizedQuantity <= 0) {
          const message = "Quantity must be at least 1.";
          setLocalError(message);
          toast.error(message);
          return;
        }

        const currentCount =
          cart?.items
            ?.filter((item) => item.productId === product._id)
            ?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

        const stock =
          typeof product.stock === "number" && Number.isFinite(product.stock)
            ? Math.max(0, Math.floor(product.stock))
            : null;

        if (stock !== null && currentCount + normalizedQuantity > stock) {
          const message = "Stock limit reached.";
          setLocalError(message);
          toast.error(message, {
            description: "Cannot add more than available stock.",
            duration: 4000,
          });
          return;
        }

        const lineItem = {
          productId: product._id,
          productName: product.name ?? product._id,
          productSlug: product.slug?.current ?? product._id,
          quantity: normalizedQuantity,
          unitPrice: getUnitPrice(product),
        };

        try {
          const result = await addItems({ items: [lineItem] });
          const newCount =
            result.cart.items
              ?.filter((item) => item.productId === product._id)
              ?.reduce((sum, item) => sum + item.quantity, 0) ??
            currentCount + normalizedQuantity;

          toast.success(`${product.name} added to cart.`, {
            description: `Current quantity: ${newCount}`,
            duration: 3000,
          });

          trackAddToCart({
            productId: product._id,
            name: product.name || "Unknown",
            price: lineItem.unitPrice,
            quantity: newCount,
          });

          setLocalError(null);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to add product to cart.";
          setLocalError(message);
          toast.error(message);
        }
      })();
    },
    [addItems, cart, getUnitPrice]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      setLocalError(null);
      if (!productId) {
        const message = "Product ID is required to update quantity.";
        setLocalError(message);
        toast.error(message);
        return;
      }

      if (!Number.isFinite(quantity) || quantity < 0) {
        const message = "Quantity must be a non-negative number.";
        setLocalError(message);
        toast.error(message);
        return;
      }

      const line = cart?.items.find((item) => item.productId === productId);
      if (!line) {
        const message = "Item not found in cart.";
        setLocalError(message);
        toast.error(message);
        return;
      }

      const nextQuantity = Math.floor(quantity);
      const availableStock = line.availableStock ?? line.product?.stock ?? null;
      if (
        typeof availableStock === "number" &&
        Number.isFinite(availableStock) &&
        nextQuantity > Math.max(0, Math.floor(availableStock))
      ) {
        const message = "Stock limit reached.";
        setLocalError(message);
        toast.error(message, {
          description: "Cannot add more than available stock.",
          duration: 4000,
        });
        return;
      }

      try {
        await updateItem(line.id, nextQuantity);
        if (nextQuantity === 0) {
          toast.success(`${line.productName} removed from cart.`);
        } else {
          toast.success("Quantity updated.");
        }
        setLocalError(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update quantity.";
        setLocalError(message);
        toast.error(message);
      }
    },
    [cart, updateItem]
  );

  const error = localError ?? cartError;
  const loading = isLoading || isMutating;

  return {
    addSolutionToCart,
    addProductToCart,
    updateQuantity,
    isLoading: loading,
    error,
    calculateTotal: calculateBundleTotal,
    calculateBundleTotal,
    validateStock,
  };
};

export default useSolutionCart;
