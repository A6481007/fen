"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiAddItems,
  apiClearCart,
  apiGetCart,
  apiRemoveLine,
  apiUpdateLine,
  type AddItemsRequest,
} from "@/lib/cart/client";
import type { Cart } from "@/lib/cart/types";
import useCartStore from "@/store";

type AddItemsResult = { cart: Cart; delta: number };

let sharedCart: Cart | null = null;
const listeners = new Set<(cart: Cart | null) => void>();

const notify = (cart: Cart | null) => {
  sharedCart = cart;
  listeners.forEach((listener) => listener(cart));
};

export function useCart(initialCart: Cart | null = null) {
  const [cart, setCart] = useState<Cart | null>(sharedCart ?? initialCart);
  const [isLoading, setIsLoading] = useState(!sharedCart && !initialCart);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const nextCart = await apiGetCart();
      setCart(nextCart);
      notify(nextCart);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load cart data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener = (nextCart: Cart | null) => setCart(nextCart);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!initialCart && !sharedCart) {
      void refresh();
    }
  }, [initialCart, refresh]);

  useEffect(() => {
    try {
      useCartStore.getState().hydrateFromApiCart?.(cart ?? null);
    } catch (error) {
      console.error("[cart] Failed to sync zustand cart from API", error);
    }
  }, [cart]);

  const addItems = useCallback(
    async (payload: AddItemsRequest): Promise<AddItemsResult> => {
      setIsMutating(true);
      const previousTotal = cart?.total ?? 0;

      try {
        const updatedCart = await apiAddItems(payload);
        setCart(updatedCart);
        notify(updatedCart);
        setError(null);
        return { cart: updatedCart, delta: updatedCart.total - previousTotal };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to add items to cart";
        setError(message);
        throw new Error(message);
      } finally {
        setIsMutating(false);
      }
    },
    [cart]
  );

  const updateItem = useCallback(
    async (lineId: string, quantity: number) => {
      setIsMutating(true);
      try {
        const updatedCart = await apiUpdateLine(lineId, quantity);
        setCart(updatedCart);
        notify(updatedCart);
        setError(null);
        return updatedCart;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to update cart item";
        setError(message);
        throw new Error(message);
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      setIsMutating(true);
      try {
        const updatedCart = await apiRemoveLine(lineId);
        setCart(updatedCart);
        notify(updatedCart);
        setError(null);
        return updatedCart;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to remove cart item";
        setError(message);
        throw new Error(message);
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const clearCart = useCallback(async () => {
    setIsMutating(true);
    try {
      const updatedCart = await apiClearCart();
      setCart(updatedCart);
      notify(updatedCart);
      setError(null);
      return updatedCart;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to clear cart";
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const itemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart]
  );

  return {
    cart,
    error,
    isLoading,
    isMutating,
    itemCount,
    refresh,
    addItems,
    updateItem,
    removeItem,
    clearCart,
  };
}

export type UseCartReturn = ReturnType<typeof useCart>;
