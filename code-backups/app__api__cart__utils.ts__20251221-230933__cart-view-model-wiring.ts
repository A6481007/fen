import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/firebase/admin";
import type { AppliedPromotion, Cart, CartItem } from "@/lib/cart/types";

export const CART_COOKIE_NAME = "cart_session";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const JWT_SECRET = new TextEncoder().encode(
  process.env.CART_JWT_SECRET || "fallback-dev-secret-change-in-prod"
);

// In-memory cache (per-instance, cleared on restart)
const memoryCache = new Map<string, { cart: Cart; expiresAt: number }>();
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CompactCartLine = {
  i: string;      // id
  p: string;      // productId
  s: string;      // productSlug
  n: string;      // productName
  v?: string;     // variantId
  q: number;      // quantity
  u: number;      // unitPrice
  l: number;      // lineTotal
  a?: {           // appliedPromotion (compact)
    t: "p" | "d"; // type: promotion/deal
    i: string;    // id
    n: string;    // name
    dt: "%" | "$";// discountType
    dv: number;   // discountValue
    da: number;   // discountAmount
  };
};

type CompactCart = {
  id: string;
  uid?: string;
  items: CompactCartLine[];
  sub: number;    // subtotal
  disc: number;   // totalDiscount
  tot: number;    // total
};

// Compress cart for cookie storage
const compressCart = (cart: Cart): CompactCart => ({
  id: cart.id,
  uid: cart.userId,
  items: cart.items.map(item => ({
    i: item.id,
    p: item.productId,
    s: item.productSlug,
    n: item.productName,
    v: item.variantId,
    q: item.quantity,
    u: item.unitPrice,
    l: item.lineTotal,
    a: item.appliedPromotion ? {
      t: item.appliedPromotion.type === "promotion" ? "p" : "d",
      i: item.appliedPromotion.id,
      n: item.appliedPromotion.name,
      dt: item.appliedPromotion.discountType === "percentage" ? "%" : "$",
      dv: item.appliedPromotion.discountValue,
      da: item.appliedPromotion.discountAmount,
    } : undefined,
  })),
  sub: cart.subtotal,
  disc: cart.totalDiscount,
  tot: cart.total,
});

// Expand compact cart to full cart
const expandCart = (compact: CompactCart): Cart => ({
  id: compact.id,
  userId: compact.uid,
  items: compact.items.map(item => ({
    id: item.i,
    productId: item.p,
    productSlug: item.s,
    productName: item.n,
    variantId: item.v,
    quantity: item.q,
    unitPrice: item.u,
    lineTotal: item.l,
    appliedPromotion: item.a ? {
      type: item.a.t === "p" ? "promotion" : "deal",
      id: item.a.i,
      name: item.a.n,
      discountType: item.a.dt === "%" ? "percentage" : "fixed_amount",
      discountValue: item.a.dv,
      discountAmount: item.a.da,
    } : undefined,
  })),
  appliedPromotions: [],
  subtotal: compact.sub,
  totalDiscount: compact.disc,
  total: compact.tot,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Sign and encode cart for cookie
const signCart = async (cart: Cart): Promise<string> => {
  const compact = compressCart(cart);
  return new SignJWT({ cart: compact })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
};

// Verify and decode cart from cookie
const verifyCart = async (token: string): Promise<Cart | null> => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return expandCart(payload.cart as CompactCart);
  } catch {
    return null;
  }
};

// Firestore cart operations for authenticated users
const firestoreCartRef = (userId: string) => 
  db.collection("carts").doc(userId);

const getFirestoreCart = async (userId: string): Promise<Cart | null> => {
  const doc = await firestoreCartRef(userId).get();
  return doc.exists ? (doc.data() as Cart) : null;
};

const setFirestoreCart = async (userId: string, cart: Cart): Promise<void> => {
  await firestoreCartRef(userId).set({
    ...cart,
    updatedAt: new Date().toISOString(),
  });
};

// Main cart operations
export const createEmptyCart = (cartId: string, userId?: string | null): Cart => ({
  id: cartId,
  userId: userId ?? undefined,
  items: [],
  appliedPromotions: [],
  subtotal: 0,
  totalDiscount: 0,
  total: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const getOrCreateCart = async (
  cartId: string,
  userId?: string | null
): Promise<Cart> => {
  // Check memory cache first
  const cached = memoryCache.get(cartId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.cart;
  }

  // For authenticated users, check Firestore
  if (userId) {
    const firestoreCart = await getFirestoreCart(userId);
    if (firestoreCart) {
      memoryCache.set(cartId, { cart: firestoreCart, expiresAt: Date.now() + MEMORY_TTL_MS });
      return firestoreCart;
    }
  }

  // Check cookie
  const cookieStore = cookies();
  const cartCookie = cookieStore.get(CART_COOKIE_NAME);
  if (cartCookie?.value) {
    const cart = await verifyCart(cartCookie.value);
    if (cart) {
      memoryCache.set(cartId, { cart, expiresAt: Date.now() + MEMORY_TTL_MS });
      return cart;
    }
  }

  // Create new cart
  return createEmptyCart(cartId, userId);
};

export const persistCart = async (cart: Cart): Promise<Cart> => {
  const now = new Date().toISOString();
  const updatedCart = { ...cart, updatedAt: now };
  
  // Update memory cache
  memoryCache.set(cart.id, { cart: updatedCart, expiresAt: Date.now() + MEMORY_TTL_MS });
  
  // For authenticated users, persist to Firestore
  if (cart.userId) {
    await setFirestoreCart(cart.userId, updatedCart);
  }
  
  // Always set cookie (for session continuity)
  const token = await signCart(updatedCart);
  const cookieStore = cookies();
  cookieStore.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
  
  return updatedCart;
};

// Keep existing helper functions
export const computeTotals = (items: CartItem[]) => {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.unitPrice) * Math.max(0, item.quantity),
    0
  );
  const total = items.reduce((sum, item) => sum + Math.max(0, item.lineTotal), 0);
  const totalDiscount = Math.max(0, subtotal - total);
  return { subtotal, total, totalDiscount };
};

export const mergeAppliedPromotions = (
  existing: AppliedPromotion[],
  incoming?: AppliedPromotion | AppliedPromotion[]
): AppliedPromotion[] => {
  if (!incoming) return existing;
  const additions = Array.isArray(incoming) ? incoming : [incoming];
  return additions.reduce<AppliedPromotion[]>((acc, promo) => {
    const current = acc.find(p => p.id === promo.id && p.type === promo.type);
    if (current) {
      return acc.map(item =>
        item.id === current.id && item.type === current.type
          ? { ...current, ...promo, discountAmount: current.discountAmount + promo.discountAmount }
          : item
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
  const totals = computeTotals(items);
  const nextCart: Cart = {
    ...cart,
    items,
    appliedPromotions: appliedPromotions ?? cart.appliedPromotions,
    ...totals,
    updatedAt: new Date().toISOString(),
  };
  return persistCart(nextCart);
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
