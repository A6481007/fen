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
import type { Cart as CartShape, CartItem as BaseCartItem } from "@/lib/cart/types";

export type CartItem = BaseCartItem & { product: Product };

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
  hydrateFromApiCart: (cart: CartShape | null) => void;
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

const generateCartLineId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const computeLineTotal = (item: CartItem) =>
  item.unitPrice * item.quantity - (item.appliedPromotion?.discountAmount ?? 0);

const resolveProductImage = (product: Product, fallback?: string | null) => {
  const productWithImageUrl = product as { imageUrl?: string | null };
  const imageUrl = productWithImageUrl.imageUrl ?? undefined;
  const firstImage = product.images?.[0] as { asset?: { url?: string } } | undefined;

  return fallback ?? imageUrl ?? firstImage?.asset?.url ?? undefined;
};

const normalizeCartItem = (
  item: Partial<CartItem> & { product: Product }
): CartItem => {
  const quantity = item.quantity ?? 1;
  const unitPrice = item.unitPrice ?? item.product.price ?? 0;

  return {
    id: item.id ?? generateCartLineId(),
    productId: item.productId ?? item.product._id,
    productSlug:
      item.productSlug ?? item.product.slug?.current ?? item.product._id,
    productName: item.productName ?? item.product.name ?? "Unknown product",
    variantId: item.variantId,
    variantLabel: item.variantLabel ?? item.variantId ?? item.product.variant,
    priceOptionId: item.priceOptionId,
    priceOptionLabel: item.priceOptionLabel,
    quantity,
    unitPrice,
    appliedPromotion: item.appliedPromotion
      ? {
          ...item.appliedPromotion,
          discountAmount: item.appliedPromotion.discountAmount ?? 0,
        }
      : undefined,
    lineTotal:
      item.lineTotal ??
      computeLineTotal({
        ...(item as CartItem),
        id: item.id ?? generateCartLineId(),
        productId: item.productId ?? item.product._id,
        productSlug:
          item.productSlug ?? item.product.slug?.current ?? item.product._id,
        productName: item.productName ?? item.product.name ?? "Unknown product",
        variantId: item.variantId,
        priceOptionId: item.priceOptionId,
        priceOptionLabel: item.priceOptionLabel,
        quantity,
        unitPrice,
        product: item.product,
        appliedPromotion: item.appliedPromotion
          ? {
              ...item.appliedPromotion,
              discountAmount: item.appliedPromotion.discountAmount ?? 0,
            }
          : undefined,
      }),
    imageUrl:
      resolveProductImage(item.product, item.imageUrl ?? undefined),
    messages: item.messages ?? undefined,
    availableStock:
      item.availableStock ??
      (typeof item.product.stock === "number" ? item.product.stock : null),
    product: item.product,
  };
};

const normalizeItems = (
  items: Array<Partial<CartItem> & { product: Product }>
): CartItem[] => items.map(normalizeCartItem);

const buildCartItemFromProduct = (
  product: Product,
  quantity = 1
): CartItem => normalizeCartItem({ product, quantity, unitPrice: product.price });

const buildProductFromCartLine = (line: BaseCartItem): Product => {
  const snapshot = line.product;
  const snapshotMeta = snapshot as Partial<
    Pick<Product, "_createdAt" | "_updatedAt" | "_rev">
  > | null;
  return {
    _id: snapshot?.id ?? line.productId,
    _type: "product",
    _createdAt: snapshotMeta?._createdAt ?? "",
    _updatedAt: snapshotMeta?._updatedAt ?? "",
    _rev: snapshotMeta?._rev ?? "",
    name: snapshot?.name ?? line.productName,
    slug: line.productSlug
      ? {
          _type: "slug",
          current: line.productSlug,
        }
      : undefined,
    price: line.unitPrice ?? snapshot?.price ?? 0,
    stock:
      snapshot?.stock ??
      (typeof line.availableStock === "number" ? line.availableStock : null) ??
      null,
    variant: snapshot?.variant ?? line.variantLabel ?? line.variantId ?? undefined,
    categories: snapshot?.categories?.map((category, idx) => ({
      _key: `${line.productId}-cat-${idx}`,
      _type: "reference",
      _ref: category,
    })),
    images: [],
  };
};

const mapApiCartToStoreItems = (cart: CartShape | null | undefined): CartItem[] => {
  if (!cart?.items?.length) return [];
  return cart.items.map((line) =>
    normalizeCartItem({
      ...line,
      product: buildProductFromCartLine(line),
    })
  );
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
                ? normalizeCartItem({
                    ...item,
                    quantity: item.quantity + 1,
                    unitPrice: item.unitPrice ?? product.price,
                  })
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
            const updatedItems = [
              ...state.items,
              buildCartItemFromProduct(product, 1),
            ];
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
                  ? normalizeCartItem({
                      ...item,
                      quantity: item.quantity + quantity,
                      unitPrice: item.unitPrice ?? product.price,
                    })
                  : item
              );
            } else {
              updatedItems.push(
                buildCartItemFromProduct(product, quantity ?? 1)
              );
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
            item.product._id === productId
              ? normalizeCartItem({ ...item, ...updates })
              : item
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
                  acc.push(
                    normalizeCartItem({
                      ...item,
                      quantity: item.quantity - 1,
                    })
                  );
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
        // Final payable amount (current/discounted prices)
        return _.reduce(
          get().items,
          (total, item) => total + item.lineTotal,
          0
        );
      },
      getSubTotalPrice: () => {
        // Gross amount (before discount)
        return _.reduce(
          get().items,
          (total, item) => total + (item.unitPrice ?? 0) * item.quantity,
          0
        );
      },
      getTotalDiscount: () => {
        const subtotal = get().getSubTotalPrice();
        const total = get().getTotalPrice();
        return Math.max(0, subtotal - total);
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
            console.warn("Failed to fetch segment data", response.status, response.statusText);
            return;
          }
          const data = await response.json();
          get().setSegmentData(data);
        } catch (error) {
          console.error("Failed to refresh segment:", error);
        }
      },
      hydrateFromApiCart: (cart) => {
        const mappedItems = mapApiCartToStoreItems(cart);
        set({
          items: mappedItems,
          lastCartUpdatedAt: cart ? new Date(cart.updatedAt) : null,
          abandonmentStatus: mappedItems.length ? get().abandonmentStatus : "none",
          isAbandoned: mappedItems.length ? get().isAbandoned : false,
        });
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

        const normalizedItems = state.items
          ? normalizeItems(state.items)
          : ([] as CartItem[]);
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
          items: normalizedItems,
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
