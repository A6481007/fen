"use server";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import type { Cart } from "./types";

export interface AddToCartFromPromotionInput {
  promotionId: string;
  productId?: string;
  quantity?: number;
  variantId?: string;
}

export interface AddToCartFromDealInput {
  dealId: string;
  productId?: string;
  quantity?: number;
  variantId?: string;
}

type AddToCartResult =
  | { success: true; cart: Cart }
  | { success: false; error: string };

export const CART_COOKIE_NAME = "cartId";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_SITE_URL = "http://localhost:3000";

const normalizeQuantity = (quantity?: number) => {
  const parsed = Math.floor(quantity ?? 1);
  return parsed > 0 ? parsed : 1;
};

const getBaseUrl = () => {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return envUrl || DEFAULT_SITE_URL;
};

const serializeRequestCookies = async (): Promise<Record<string, string>> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");

  return cookieHeader.length ? { Cookie: cookieHeader } : {};
};

const buildJsonRequestInit = async (body: object): Promise<RequestInit> => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(await serializeRequestCookies()),
  },
  body: JSON.stringify(body),
  cache: "no-store",
});

const ensureCartId = async (): Promise<string> => {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  jar.set(CART_COOKIE_NAME, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
  });

  return id;
};

const parseCartResponse = async (
  response: Response
): Promise<{ ok: boolean; cart?: Cart; error?: string }> => {
  try {
    const data = (await response.json()) as Cart & { message?: string; reason?: string };
    if (!response.ok) {
      return {
        ok: false,
        error: data.message || data.reason || "Unable to update cart",
      };
    }

    return { ok: true, cart: data as Cart };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected cart response",
    };
  }
};

export async function addToCartFromPromotion(
  input: AddToCartFromPromotionInput
): Promise<AddToCartResult> {
  const normalizedQuantity = normalizeQuantity(input.quantity);
  const cartId = await ensureCartId();
  const { userId } = await auth().catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cart][actions] Clerk auth unavailable, continuing anonymously", error);
      return { userId: null };
    }
    throw error;
  });
  void cartId;
  void userId;

  const payload = {
    promotionId: input.promotionId,
    items: [
      {
        productId: input.productId ?? input.promotionId,
        quantity: normalizedQuantity,
        variantId: input.variantId,
      },
    ],
  };

  const response = await fetch(
    new URL("/api/cart/items", getBaseUrl()),
    await buildJsonRequestInit(payload)
  );
  const result = await parseCartResponse(response);

  if (!result.ok || !result.cart) {
    return { success: false, error: result.error ?? "Unable to add to cart from promotion" };
  }

  return { success: true, cart: result.cart };
}

export async function addToCartFromDeal(
  input: AddToCartFromDealInput
): Promise<AddToCartResult> {
  const normalizedQuantity = normalizeQuantity(input.quantity);
  const cartId = await ensureCartId();
  const { userId } = await auth().catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cart][actions] Clerk auth unavailable, continuing anonymously", error);
      return { userId: null };
    }
    throw error;
  });
  void cartId;
  void userId;

  const payload = {
    dealId: input.dealId,
    items: [
      {
        productId: input.productId ?? input.dealId,
        quantity: normalizedQuantity,
        variantId: input.variantId,
      },
    ],
  };

  const response = await fetch(
    new URL("/api/cart/items", getBaseUrl()),
    await buildJsonRequestInit(payload)
  );
  const result = await parseCartResponse(response);

  if (!result.ok || !result.cart) {
    return { success: false, error: result.error ?? "Unable to add deal to cart" };
  }

  return { success: true, cart: result.cart };
}

export async function getCart(): Promise<Cart | null> {
  const cartId = await ensureCartId();
  void cartId;

  try {
    const response = await fetch(new URL("/api/cart", getBaseUrl()), {
      method: "GET",
      headers: await serializeRequestCookies(),
      cache: "no-store",
    });

    const data = (await response.json()) as Cart;
    return response.ok ? data : null;
  } catch (error) {
    console.error("[cart] Failed to fetch cart", error);
    return null;
  }
}
