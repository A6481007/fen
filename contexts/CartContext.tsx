"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useTransition,
  type ReactNode,
} from "react";
import type { AppliedPromotion, Cart, CartItem } from "@/lib/cart/types";

export interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

type OptimisticAction =
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "UPDATE_QUANTITY"; itemId: string; quantity: number }
  | { type: "CLEAR" };

interface CartProviderProps {
  children: ReactNode;
  initialCart?: Cart | null;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const generateCartId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeQuantity = (quantity: number) => Math.max(0, Math.floor(quantity));

const mergePromotions = (existing: AppliedPromotion[], incoming?: AppliedPromotion) => {
  if (!incoming) {
    return existing;
  }

  const hasExisting = existing.some(
    (promotion) => promotion.id === incoming.id && promotion.type === incoming.type
  );

  if (hasExisting) {
    return existing.map((promotion) =>
      promotion.id === incoming.id && promotion.type === incoming.type
        ? { ...promotion, ...incoming }
        : promotion
    );
  }

  return [...existing, incoming];
};

const computeTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    subtotal,
    total,
    totalDiscount: Math.max(0, subtotal - total),
  };
};

const updateLineTotal = (item: CartItem, quantity: number): CartItem => {
  const normalized = normalizeQuantity(quantity);
  return {
    ...item,
    quantity: normalized,
    lineTotal: Math.max(
      0,
      item.unitPrice * normalized - (item.appliedPromotion?.discountAmount ?? 0)
    ),
  };
};

const buildCart = (
  current: Cart | null,
  items: CartItem[],
  appliedPromotions?: AppliedPromotion[]
): Cart | null => {
  if (!items.length && !current) {
    return null;
  }

  const now = new Date().toISOString();
  const totals = computeTotals(items);

  return {
    id: current?.id ?? generateCartId(),
    userId: current?.userId,
    items,
    appliedPromotions: appliedPromotions ?? current?.appliedPromotions ?? [],
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    total: totals.total,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
};

const reduceOptimisticCart = (state: Cart | null, action: OptimisticAction): Cart | null => {
  switch (action.type) {
    case "ADD_ITEM": {
      const items = state?.items ?? [];
      const existingIndex = items.findIndex((item) => item.id === action.item.id);
      const nextItems =
        existingIndex >= 0
          ? items.map((item, index) =>
              index === existingIndex
                ? updateLineTotal(item, item.quantity + action.item.quantity)
                : item
            )
          : [...items, action.item];
      const promotions = mergePromotions(
        state?.appliedPromotions ?? [],
        action.item.appliedPromotion
      );
      return buildCart(state, nextItems, promotions);
    }
    case "REMOVE_ITEM": {
      if (!state) return state;
      const nextItems = state.items.filter((item) => item.id !== action.itemId);
      return buildCart(state, nextItems, state.appliedPromotions);
    }
    case "UPDATE_QUANTITY": {
      if (!state) return state;
      const quantity = normalizeQuantity(action.quantity);
      const nextItems =
        quantity > 0
          ? state.items.map((item) =>
              item.id === action.itemId ? updateLineTotal(item, quantity) : item
            )
          : state.items.filter((item) => item.id !== action.itemId);
      return buildCart(state, nextItems, state.appliedPromotions);
    }
    case "CLEAR": {
      if (!state) return null;
      return buildCart(
        state,
        [],
        []
      );
    }
    default:
      return state;
  }
};

export function CartProvider({ children, initialCart = null }: CartProviderProps) {
  const [optimisticCart, applyOptimisticCart] = useOptimistic<Cart | null, OptimisticAction>(
    initialCart ?? null,
    reduceOptimisticCart
  );
  const [isPending, startTransition] = useTransition();

  const addItem = useCallback(
    async (item: CartItem) => {
      startTransition(() => {
        applyOptimisticCart({ type: "ADD_ITEM", item });
      });
    },
    [applyOptimisticCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      startTransition(() => {
        applyOptimisticCart({ type: "REMOVE_ITEM", itemId });
      });
    },
    [applyOptimisticCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      startTransition(() => {
        applyOptimisticCart({ type: "UPDATE_QUANTITY", itemId, quantity });
      });
    },
    [applyOptimisticCart]
  );

  const clearCart = useCallback(async () => {
    startTransition(() => {
      applyOptimisticCart({ type: "CLEAR" });
    });
  }, [applyOptimisticCart]);

  const itemCount =
    optimisticCart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const value = useMemo<CartContextValue>(
    () => ({
      cart: optimisticCart,
      isLoading: isPending,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [optimisticCart, isPending, itemCount, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
