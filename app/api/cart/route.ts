import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  applyStockIssuesToItems,
  getOrCreateCart,
  getStockIssues,
  resolveDealerPricing,
  hydrateCartForResponse,
  syncCartItemsWithLatestProducts,
  toCartPayload,
  updateCartTotals,
} from "./utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export async function GET() {
  const cookieStore = await cookies();
  const { userId } = await auth();
  const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cartId = existingCartId ?? crypto.randomUUID();

  const cart = await getOrCreateCart(cartId, userId, cookieStore);
  const hydratedCart = await hydrateCartForResponse(cart);
  const response = NextResponse.json(toCartPayload(hydratedCart), {
    headers: JSON_HEADERS,
  });

  if (!existingCartId) {
    response.cookies.set(CART_COOKIE_NAME, cartId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export async function PATCH() {
  const cookieStore = await cookies();
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cartId = existingCartId ?? crypto.randomUUID();

  const cart = await getOrCreateCart(cartId, userId, cookieStore);
  const useDealerPrice = await resolveDealerPricing(userId, userEmail);
  const syncedItems = await syncCartItemsWithLatestProducts(cart.items, {
    useDealerPrice,
  });
  const stockIssues = getStockIssues(syncedItems);
  const finalItems = applyStockIssuesToItems(syncedItems, stockIssues);
  const updatedCart = await updateCartTotals(cart, finalItems, undefined, userId);

  const response = NextResponse.json(toCartPayload(updatedCart), { headers: JSON_HEADERS });

  if (!existingCartId) {
    response.cookies.set(CART_COOKIE_NAME, cartId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export async function DELETE() {
  const cookieStore = await cookies();
  const { userId } = await auth();
  const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cartId = existingCartId ?? crypto.randomUUID();

  const cart = await getOrCreateCart(cartId, userId, cookieStore);
  const clearedCart = await updateCartTotals(cart, [], []);
  const response = NextResponse.json(toCartPayload(clearedCart), { headers: JSON_HEADERS });

  if (!existingCartId) {
    response.cookies.set(CART_COOKIE_NAME, cartId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }

  return response;
}
