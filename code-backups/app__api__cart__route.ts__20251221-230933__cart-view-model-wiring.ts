import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { CART_COOKIE_MAX_AGE, CART_COOKIE_NAME, getOrCreateCart, updateCartTotals } from "./utils";

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

  const cart = await getOrCreateCart(cartId, userId);
  const response = NextResponse.json(cart, { headers: JSON_HEADERS });

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

  const cart = await getOrCreateCart(cartId, userId);
  const clearedCart = await updateCartTotals(cart, [], []);
  const response = NextResponse.json(clearedCart, { headers: JSON_HEADERS });

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
