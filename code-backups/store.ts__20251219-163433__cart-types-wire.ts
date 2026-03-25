import { Product } from "./sanity.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import _ from "lodash";
import {
  deriveSegment,
  getFullSegmentResult,
  type SegmentType,
  type UserSegmentData,
} from "@/lib/segmentation/rules";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreUser {
  id?: string;
}

interface StoreState {
  items: CartItem[];
  lastCartUpdatedAt: Date | null;
  hasCheckoutStarted: boolean;
  checkoutStartedAt: Date | null;
  isAbandoned: boolean;
  abandonmentStatus: "none" | "at_risk" | "abandoned" | "recovered";
  user: StoreUser | null;
  segment: SegmentType | null;
  segmentData: UserSegmentData | null;
  segmentLastCalculated: Date | null;
  addItem: (product: Product) => void;
  addMultipleItems: (
    products: Array<{ product: Product; quantity: number }>
  ) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  removeItem: (productId: string) => void;
  deleteCartProduct: (productId: string) => void;
  resetCart: () => void;
  getTotalPrice: () => number;
  getSubTotalPrice: () => number;
  getTotalDiscount: () => number;
  getItemCount: (productId: string) => number;
  getGroupedItems: () => CartItem[];
  setUser: (user: StoreUser | null) => void;
  setSegmentData: (data: UserSegmentData) => void;
  calculateSegment: () => void;
  refreshSegment: () => Promise<void>;
  // favorite
  favoriteProduct: Product[];
  addToFavorite: (product: Product) => Promise<void>;
  removeFromFavorite: (productId: string) => void;
  resetFavorite: () => void;
  // order placement state
  isPlacingOrder: boolean;
  orderStep: "validating" | "creating" | "emailing" | "redirecting";
  setOrderPlacementState: (
    isPlacing: boolean,
    step?: "validating" | "creating" | "emailing" | "redirecting"
  ) => void;
  // cart abandonment tracking actions
  markCheckoutStarted: () => void;
  markCheckoutCompleted: () => void;
  markCheckoutAbandoned: () => void;
  checkAbandonmentStatus: () => void;
  resetAbandonmentTracking: () => void;
}

const normalizeSegmentData = (data: UserSegmentData): UserSegmentData => ({
  ...data,
  lastCartValue: data.lastCartValue ?? null,
  lastPurchaseAt: data.lastPurchaseAt ? new Date(data.lastPurchaseAt) : null,
  lastCartAbandonedAt: data.lastCartAbandonedAt
    ? new Date(data.lastCartAbandonedAt)
    : null,
  accountCreatedAt: new Date(data.accountCreatedAt),
});

const ABANDONMENT_CONFIG = {
  atRiskThreshold: 15,
  abandonedThreshold: 30,
};

const useCartStore = create<StoreState>()(
  persist(
    (set, get) => ({
      items: [],
      lastCartUpdatedAt: null,
      hasCheckoutStarted: false,
      checkoutStartedAt: null,
      isAbandoned: false,
      abandonmentStatus: "none",
      user: null,
      segment: null,
      segmentData: null,
      segmentLastCalculated: null,
      favoriteProduct: [],
      addItem: (product) => {
        set((state) => {
          const existingItem = _.find(
            state.items,
            (item) => item.product._id === product._id
          );
          if (existingItem) {
            const updatedItems = _.map(state.items, (item) =>
              item.product._id === product._id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
            const cartWasEmpty = state.items.length === 0;
            return {
              items: updatedItems,
              lastCartUpdatedAt: new Date(),
              abandonmentStatus: cartWasEmpty ? "none" : state.abandonmentStatus,
              isAbandoned: cartWasEmpty ? false : state.isAbandoned,
            };
          } else {
            const updatedItems = [...state.items, { product, quantity: 1 }];
            const cartWasEmpty = state.items.length === 0;
            return {
              items: updatedItems,
              lastCartUpdatedAt: new Date(),
              abandonmentStatus: cartWasEmpty ? "none" : state.abandonmentStatus,
              isAbandoned: cartWasEmpty ? false : state.isAbandoned,
            };
          }
        });
        get().calculateSegment();
      },
      addMultipleItems: (products) => {
        set((state) => {
          let updatedItems = [...state.items];

          _.forEach(products, ({ product, quantity }) => {
            const existingItem = _.find(
              updatedItems,
              (item) => item.product._id === product._id
            );

            if (existingItem) {
              updatedItems = _.map(updatedItems, (item) =>
                item.product._id === product._id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              );
            } else {
              updatedItems.push({ product, quantity });
            }
          });

          const cartWasEmpty = state.items.length === 0;

          return {
            items: updatedItems,
            lastCartUpdatedAt: new Date(),
            abandonmentStatus: cartWasEmpty ? "none" : state.abandonmentStatus,
            isAbandoned: cartWasEmpty ? false : state.isAbandoned,
          };
        });
        get().calculateSegment();
      },
      updateCartItem: (productId, updates) => {
        set((state) => ({
          items: _.map(state.items, (item) =>
            item.product._id === productId ? { ...item, ...updates } : item
          ),
          lastCartUpdatedAt: new Date(),
        }));
        get().calculateSegment();
      },
      removeItem: (productId) => {
        set((state) => {
          const nextItems = _.reduce(
            state.items,
            (acc: CartItem[], item) => {
              if (item.product._id === productId) {
                if (item.quantity > 1) {
                  acc.push({ ...item, quantity: item.quantity - 1 });
                }
              } else {
                acc.push(item);
              }
              return acc;
            },
            [] as CartItem[]
          );
          const cartIsEmpty = nextItems.length === 0;

          return {
            items: nextItems,
            lastCartUpdatedAt: cartIsEmpty ? null : new Date(),
            abandonmentStatus: cartIsEmpty ? "none" : state.abandonmentStatus,
            isAbandoned: cartIsEmpty ? false : state.isAbandoned,
            hasCheckoutStarted: cartIsEmpty ? false : state.hasCheckoutStarted,
            checkoutStartedAt: cartIsEmpty ? null : state.checkoutStartedAt,
          };
        });
        get().calculateSegment();
      },
      deleteCartProduct: (productId) => {
        set((state) => {
          const filteredItems = _.filter(
            state.items,
            ({ product }) => product?._id !== productId
          );
          const cartIsEmpty = filteredItems.length === 0;

          return {
            items: filteredItems,
            lastCartUpdatedAt: cartIsEmpty ? null : new Date(),
            abandonmentStatus: cartIsEmpty ? "none" : state.abandonmentStatus,
            isAbandoned: cartIsEmpty ? false : state.isAbandoned,
            hasCheckoutStarted: cartIsEmpty ? false : state.hasCheckoutStarted,
            checkoutStartedAt: cartIsEmpty ? null : state.checkoutStartedAt,
          };
        });
        get().calculateSegment();
      },
      resetCart: () => {
        set({
          items: [],
          lastCartUpdatedAt: null,
          hasCheckoutStarted: false,
          checkoutStartedAt: null,
          isAbandoned: false,
          abandonmentStatus: "none",
        });
        get().calculateSegment();
      },
      markCheckoutStarted: () => {
        set({
          hasCheckoutStarted: true,
          checkoutStartedAt: new Date(),
          lastCartUpdatedAt: new Date(),
          abandonmentStatus: "none",
          isAbandoned: false,
        });
      },
      markCheckoutCompleted: () => {
        set({
          hasCheckoutStarted: false,
          checkoutStartedAt: null,
          abandonmentStatus: "recovered",
          isAbandoned: false,
          items: [],
          lastCartUpdatedAt: null,
        });

        get().refreshSegment?.();
      },
      markCheckoutAbandoned: () => {
        set({
          isAbandoned: true,
          abandonmentStatus: "abandoned",
        });
      },
      checkAbandonmentStatus: () => {
        const { items, lastCartUpdatedAt, abandonmentStatus } = get();

        if (items.length === 0 || !lastCartUpdatedAt) {
          if (abandonmentStatus !== "none") {
            set({ abandonmentStatus: "none", isAbandoned: false });
          }
          return;
        }

        if (abandonmentStatus === "recovered") {
          return;
        }

        const minutesSinceUpdate =
          (Date.now() - lastCartUpdatedAt.getTime()) / (1000 * 60);

        if (minutesSinceUpdate >= ABANDONMENT_CONFIG.abandonedThreshold) {
          if (abandonmentStatus !== "abandoned") {
            set({ abandonmentStatus: "abandoned", isAbandoned: true });
          }
        } else if (minutesSinceUpdate >= ABANDONMENT_CONFIG.atRiskThreshold) {
          if (abandonmentStatus !== "at_risk") {
            set({ abandonmentStatus: "at_risk" });
          }
        }
      },
      resetAbandonmentTracking: () => {
        set({
          hasCheckoutStarted: false,
          checkoutStartedAt: null,
          isAbandoned: false,
          abandonmentStatus: "none",
          lastCartUpdatedAt: new Date(),
        });
      },
      getTotalPrice: () => {
        // This should be the final payable amount (current/discounted prices)
        return _.reduce(
          get().items,
          (total, item) => total + (item.product.price ?? 0) * item.quantity,
          0
        );
      },
      getSubTotalPrice: () => {
        // This should be the gross amount (before discount)
        return _.reduce(
          get().items,
          (total, item) => {
            const currentPrice = item.product.price ?? 0;
            const discount = item.product.discount ?? 0;
            const discountAmount = (discount * currentPrice) / 100;
            const grossPrice = currentPrice + discountAmount;
            return total + grossPrice * item.quantity;
          },
          0
        );
      },
      getTotalDiscount: () => {
        // New function to get total discount amount
        return _.reduce(
          get().items,
          (total, item) => {
            const currentPrice = item.product.price ?? 0;
            const discount = item.product.discount ?? 0;
            const discountAmount = (discount * currentPrice) / 100;
            return total + discountAmount * item.quantity;
          },
          0
        );
      },
      getItemCount: (productId) => {
        const item = _.find(
          get().items,
          (item) => item.product._id === productId
        );
        return item ? item.quantity : 0;
      },
      getGroupedItems: () => get().items,
      setUser: (user) => {
        set({ user });
      },
      setSegmentData: (data) => {
        const normalizedData = normalizeSegmentData(data);
        const result = getFullSegmentResult(normalizedData);
        set({
          segmentData: normalizedData,
          segment: result.primary,
          segmentLastCalculated: new Date(),
        });
      },
      calculateSegment: () => {
        const { segmentData } = get();
        if (!segmentData) return;

        const normalizedData = normalizeSegmentData(segmentData);
        set({
          segment: deriveSegment(normalizedData),
          segmentData: normalizedData,
          segmentLastCalculated: new Date(),
        });
      },
      refreshSegment: async () => {
        const { user } = get();
        if (!user?.id) return;

        try {
          const response = await fetch(
            `/api/user/segment-data?userId=${user.id}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch segment data");
          }
          const data = await response.json();
          get().setSegmentData(data);
        } catch (error) {
          console.error("Failed to refresh segment:", error);
        }
      },
      addToFavorite: (product: Product) => {
        return new Promise<void>((resolve) => {
          set((state: StoreState) => {
            const isFavorite = _.some(
              state.favoriteProduct,
              (item) => item._id === product._id
            );
            return {
              favoriteProduct: isFavorite
                ? _.filter(
                    state.favoriteProduct,
                    (item) => item._id !== product._id
                  )
                : [...state.favoriteProduct, { ...product }],
            };
          });
          resolve();
        });
      },
      removeFromFavorite: (productId: string) => {
        set((state: StoreState) => ({
          favoriteProduct: _.filter(
            state.favoriteProduct,
            (item) => item?._id !== productId
          ),
        }));
      },
      resetFavorite: () => {
        set({ favoriteProduct: [] });
      },
      // order placement state
      isPlacingOrder: false,
      orderStep: "validating" as const,
      setOrderPlacementState: (isPlacing, step = "validating") => {
        set({
          isPlacingOrder: isPlacing,
          orderStep: step,
        });
      },
    }),
    {
      name: "cart-store",
      merge: (persistedState, currentState) => {
        const storageState = (persistedState as { state?: StoreState })?.state;
        const state = {
          ...currentState,
          ...storageState,
        };

        const segmentData = state.segmentData
          ? normalizeSegmentData(state.segmentData)
          : null;
        const segmentLastCalculated = state.segmentLastCalculated
          ? new Date(state.segmentLastCalculated)
          : null;
        const lastCartUpdatedAt = state.lastCartUpdatedAt
          ? new Date(state.lastCartUpdatedAt)
          : null;
        const checkoutStartedAt = state.checkoutStartedAt
          ? new Date(state.checkoutStartedAt)
          : null;

        return {
          ...state,
          segmentData,
          segmentLastCalculated,
          lastCartUpdatedAt,
          checkoutStartedAt,
        };
      },
    }
  )
);

export default useCartStore;
