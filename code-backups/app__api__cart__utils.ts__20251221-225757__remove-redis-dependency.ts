import IORedis, { type Redis } from "ioredis";
import type { AppliedPromotion, Cart, CartItem } from "@/lib/cart/types";

export const CART_COOKIE_NAME = "cartId";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const CART_TTL_SECONDS = CART_COOKIE_MAX_AGE;

type CartStoreRecord = { cart: Cart; version: number; expiresAt: number };

const globalForCart = globalThis as unknown as {
  __cartRedis?: Redis | null;
  __cartStore?: Map<string, CartStoreRecord>;
  __cartRedisWarned?: boolean;
};

const memoryStore: Map<string, CartStoreRecord> =
  globalForCart.__cartStore ?? new Map<string, CartStoreRecord>();

if (!globalForCart.__cartStore) {
  globalForCart.__cartStore = memoryStore;
}

const getRedisClient = (): Redis | null => {
  if (globalForCart.__cartRedis !== undefined) {
    return globalForCart.__cartRedis;
  }

  const url = process.env.CACHE_REDIS_URL;
  if (!url) {
    globalForCart.__cartRedis = null;
    return null;
  }

  try {
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 1000,
      retryStrategy: () => null,
      reconnectOnError: () => false,
    });

    client.on("error", (error) => {
      if (!globalForCart.__cartRedisWarned) {
        console.warn("[cart][redis] connection error, falling back to memory", error);
        globalForCart.__cartRedisWarned = true;
      }
      try {
        client.disconnect();
      } catch {
        // ignore
      }
      globalForCart.__cartRedis = null;
    });

    globalForCart.__cartRedis = client;
    return client;
  } catch (error) {
    if (!globalForCart.__cartRedisWarned) {
      console.warn("[cart][redis] failed to init client, using memory store", error);
      globalForCart.__cartRedisWarned = true;
    }
    globalForCart.__cartRedis = null;
    return null;
  }
};

const computeTotals = (items: CartItem[]) => {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.unitPrice) * Math.max(0, item.quantity),
    0
  );
  const total = items.reduce((sum, item) => sum + Math.max(0, item.lineTotal), 0);
  const totalDiscount = Math.max(0, subtotal - total);

  return { subtotal, total, totalDiscount };
};

export const createEmptyCart = (cartId: string, userId?: string | null): Cart => {
  const now = new Date().toISOString();
  return {
    id: cartId,
    userId: userId ?? undefined,
    items: [],
    appliedPromotions: [],
    subtotal: 0,
    totalDiscount: 0,
    total: 0,
    createdAt: now,
    updatedAt: now,
  };
};

const memoryCleanup = () => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
};

const readCartFromMemory = (cartId: string): Cart | null => {
  memoryCleanup();
  const record = memoryStore.get(cartId);
  if (!record || record.expiresAt <= Date.now()) return null;
  return record.cart;
};

const writeCartToMemory = (cart: Cart): Cart => {
  const expiresAt = Date.now() + CART_TTL_SECONDS * 1000;
  const version = Date.now();
  memoryStore.set(cart.id, { cart, version, expiresAt });
  return cart;
};

const readCartFromRedis = async (cartId: string): Promise<Cart | null> => {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    const raw = await redis.get(`cart:${cartId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartStoreRecord | Cart;
    return "cart" in parsed ? parsed.cart : (parsed as Cart);
  } catch (error) {
    console.warn("[cart][redis] read failed, using memory fallback", error);
    return null;
  }
};

const writeCartToRedis = async (cart: Cart): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) return;

  const payload: CartStoreRecord = {
    cart,
    version: Date.now(),
    expiresAt: Date.now() + CART_TTL_SECONDS * 1000,
  };

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    await redis.set(
      `cart:${cart.id}`,
      JSON.stringify(payload),
      "EX",
      CART_TTL_SECONDS
    );
  } catch (error) {
    console.warn("[cart][redis] write failed, keeping memory copy", error);
  }
};

export const getOrCreateCart = async (
  cartId: string,
  userId?: string | null
): Promise<Cart> => {
  const existing = (await readCartFromRedis(cartId)) ?? readCartFromMemory(cartId);
  if (existing) {
    const updatedUser = existing.userId ?? userId ?? undefined;
    const normalized =
      updatedUser && existing.userId !== updatedUser
        ? { ...existing, userId: updatedUser }
        : existing;
    await writeCartToRedis(normalized);
    writeCartToMemory(normalized);
    return normalized;
  }

  const fresh = createEmptyCart(cartId, userId);
  await writeCartToRedis(fresh);
  writeCartToMemory(fresh);
  return fresh;
};

export const persistCart = async (cart: Cart): Promise<Cart> => {
  await writeCartToRedis(cart);
  writeCartToMemory(cart);
  return cart;
};

export const mergeAppliedPromotions = (
  existing: AppliedPromotion[],
  incoming?: AppliedPromotion | AppliedPromotion[]
): AppliedPromotion[] => {
  if (!incoming) return existing;
  const additions = Array.isArray(incoming) ? incoming : [incoming];

  return additions.reduce<AppliedPromotion[]>((acc, promo) => {
    const current = acc.find(
      (existingPromo) =>
        existingPromo.id === promo.id && existingPromo.type === promo.type
    );

    if (current) {
      const updated: AppliedPromotion = {
        ...current,
        ...promo,
        discountAmount: (current.discountAmount || 0) + (promo.discountAmount || 0),
      };
      return acc.map((item) =>
        item.id === current.id && item.type === current.type ? updated : item
      );
    }

    return [...acc, promo];
  }, existing);
};

export const updateCartTotals = async (
  cart: Cart,
  items: CartItem[],
  appliedPromotions?: AppliedPromotion[]
): Promise<Cart> => {
  const now = new Date().toISOString();
  const totals = computeTotals(items);

  const nextCart: Cart = {
    ...cart,
    items,
    appliedPromotions: appliedPromotions ?? cart.appliedPromotions,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    total: totals.total,
    updatedAt: now,
  };

  await persistCart(nextCart);
  return nextCart;
};

const mergeKey = (item: CartItem) =>
  [
    item.productId,
    item.variantId ?? "base",
    item.appliedPromotion?.type ?? "none",
    item.appliedPromotion?.id ?? "none",
  ].join(":");

export const recalculateLineItem = (item: CartItem, nextQuantity?: number): CartItem => {
  const quantity = Math.max(0, Math.floor(nextQuantity ?? item.quantity));
  const currentDiscount =
    item.unitPrice * item.quantity - (item.lineTotal ?? item.unitPrice * item.quantity);
  const perUnitDiscount = item.quantity > 0 ? Math.max(0, currentDiscount / item.quantity) : 0;
  const discountAmount = Math.max(0, perUnitDiscount * quantity);
  const lineTotal = Math.max(0, item.unitPrice * quantity - discountAmount);

  const appliedPromotion =
    item.appliedPromotion && quantity > 0
      ? { ...item.appliedPromotion, discountAmount }
      : undefined;

  return {
    ...item,
    quantity,
    appliedPromotion,
    lineTotal,
  };
};

export const mergeCartItems = (existing: CartItem[], incoming: CartItem[]): CartItem[] => {
  const merged = [...existing];

  incoming.forEach((item) => {
    const key = mergeKey(item);
    const index = merged.findIndex((line) => mergeKey(line) === key);

    if (index === -1) {
      merged.push(item);
      return;
    }

    const target = merged[index];
    const totalQuantity = target.quantity + item.quantity;
    const combinedLineTotal = target.lineTotal + item.lineTotal;
    const combinedDiscount =
      target.unitPrice * target.quantity -
      target.lineTotal +
      (item.unitPrice * item.quantity - item.lineTotal);
    const averageUnitPrice =
      totalQuantity > 0
        ? (target.unitPrice * target.quantity + item.unitPrice * item.quantity) / totalQuantity
        : target.unitPrice;

    merged[index] = recalculateLineItem(
      {
        ...target,
        quantity: totalQuantity,
        unitPrice: averageUnitPrice,
        appliedPromotion: target.appliedPromotion ?? item.appliedPromotion,
        lineTotal: combinedLineTotal,
      },
      totalQuantity
    );
    if (merged[index].appliedPromotion) {
      merged[index].appliedPromotion!.discountAmount = Math.max(0, combinedDiscount);
    }
  });

  return merged;
};
