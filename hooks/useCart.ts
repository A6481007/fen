"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiAddItems,
  apiApplyPromoCode,
  apiClearCart,
  apiRefreshCart,
  apiRemovePromoCode,
  apiRemoveLine,
  apiUpdateLine,
  type AddItemsRequest,
} from "@/lib/cart/client";
import type { Cart, CartResponsePayload, CartViewModel } from "@/lib/cart/types";
import { buildCartViewModel } from "@/lib/cart/viewModel";
import useCartStore from "@/store";

type AddItemsResult = { cart: Cart; view: CartViewModel; delta: number };
type CartSnapshot = { cart: Cart | null; view: CartViewModel | null };

let sharedSnapshot: CartSnapshot = { cart: null, view: null };
const listeners = new Set<(state: CartSnapshot) => void>();

const notify = (state: CartSnapshot) => {
  sharedSnapshot = state;
  listeners.forEach((listener) => listener(state));
};

const toSnapshot = (
  payload: CartResponsePayload | Cart | null | undefined
): CartSnapshot => {
  if (!payload) return { cart: null, view: null };
  if (
    (payload as CartResponsePayload).cart &&
    (payload as CartResponsePayload).view
  ) {
    const casted = payload as CartResponsePayload;
    return { cart: casted.cart, view: casted.view };
  }

  const cart = payload as Cart;
  return { cart, view: buildCartViewModel(cart) };
};

let refreshPromise: Promise<CartSnapshot> | null = null;

const getRefreshPromise = () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const next = await apiRefreshCart();
      const snapshot = toSnapshot(next);
      notify(snapshot);
      return snapshot;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const syncCartSnapshot = (
  payload: CartResponsePayload | Cart | null | undefined
) => {
  const snapshot = toSnapshot(payload);
  notify(snapshot);
  try {
    useCartStore.getState().hydrateFromApiCart?.(snapshot.cart ?? null);
  } catch (error) {
    console.error("[cart] Failed to sync zustand cart from snapshot", error);
  }
  return snapshot;
};

export function useCart(initialCart: Cart | null = null) {
  const initialState =
    sharedSnapshot.cart || sharedSnapshot.view
      ? sharedSnapshot
      : initialCart
        ? toSnapshot(initialCart)
        : { cart: null, view: null };

  const [state, setState] = useState<CartSnapshot>(initialState);
  const [isLoading, setIsLoading] = useState(
    !(sharedSnapshot.cart || sharedSnapshot.view || initialCart)
  );
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { cart, view } = state;

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const snapshot = await getRefreshPromise();
      setState(snapshot);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load cart data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshInBackground = useCallback(async () => {
    try {
      const snapshot = await getRefreshPromise();
      setState(snapshot);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to refresh cart data";
      setError(message);
    }
  }, []);

  useEffect(() => {
    const listener = (nextState: CartSnapshot) => setState(nextState);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!initialCart && !sharedSnapshot.cart && !sharedSnapshot.view) {
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
        const updated = await apiAddItems(payload);
        const snapshot = toSnapshot(updated);
        setState(snapshot);
        notify(snapshot);
        setError(null);
        return {
          cart: snapshot.cart!,
          view: snapshot.view!,
          delta: (snapshot.cart?.total ?? 0) - previousTotal,
        };
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
        const updated = await apiUpdateLine(lineId, quantity);
        const snapshot = toSnapshot(updated);
        setState(snapshot);
        notify(snapshot);
        setError(null);
        return snapshot;
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
        const updated = await apiRemoveLine(lineId);
        const snapshot = toSnapshot(updated);
        setState(snapshot);
        notify(snapshot);
        setError(null);
        return snapshot;
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
      const updated = await apiClearCart();
      const snapshot = toSnapshot(updated);
      setState(snapshot);
      notify(snapshot);
      setError(null);
      return snapshot;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to clear cart";
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const applyPromoCode = useCallback(async (code: string) => {
    setIsMutating(true);
    try {
      const updated = await apiApplyPromoCode(code);
      const snapshot = toSnapshot(updated);
      setState(snapshot);
      notify(snapshot);
      setError(null);
      return snapshot;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to apply promo code";
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const removePromoCode = useCallback(async (code?: string) => {
    setIsMutating(true);
    try {
      const updated = await apiRemovePromoCode(code);
      const snapshot = toSnapshot(updated);
      setState(snapshot);
      notify(snapshot);
      setError(null);
      return snapshot;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove promo code";
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const itemCount = useMemo(() => {
    if (view?.summary.itemCount !== undefined) {
      return view.summary.itemCount;
    }
    return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }, [cart, view]);

  return {
    cart,
    view,
    error,
    isLoading,
    isMutating,
    itemCount,
    refresh,
    refreshInBackground,
    addItems,
    updateItem,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
  };
}

export type UseCartReturn = ReturnType<typeof useCart>;
