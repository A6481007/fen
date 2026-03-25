import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  buildStockIssueMessage,
  getOrCreateCart,
  getStockIssues,
  resolveDealerPricing,
  syncCartItemsWithLatestProducts,
  toCartPayload,
  updateCartTotals,
} from "../../utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const quantitySchema = z.object({
  quantity: z.number().int().nonnegative(),
});

const getUserIdSafe = async (): Promise<string | null> => {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cart][line] Clerk auth unavailable, continuing anonymously", error);
      return null;
    }
    throw error;
  }
};


const buildResponse = (cart: any, shouldSetCookie: boolean, cartId: string) => {
  const response = NextResponse.json(toCartPayload(cart), { status: 200, headers: JSON_HEADERS });

  if (shouldSetCookie) {
    response.cookies.set(CART_COOKIE_NAME, cartId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }

  return response;
};

const resolveCart = async (request: NextRequest) => {
  const cookieStore = request.cookies;
  const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cartId = existingCartId ?? crypto.randomUUID();
  const userId = await getUserIdSafe();
  const user = userId ? await currentUser() : null;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const cart = await getOrCreateCart(cartId, userId, cookieStore);
  const shouldSetCookie = !existingCartId;

  return { cart, cartId, shouldSetCookie, userId, userEmail };
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ lineId: string }> | { lineId: string } }
) {
  try {
    const params = await context.params;
    const { quantity } = await quantitySchema.parseAsync(await request.json());
    const { cart, cartId, shouldSetCookie, userId, userEmail } =
      await resolveCart(request);

    const index = cart.items.findIndex((item) => item.id === params.lineId);
    if (index === -1) {
      return NextResponse.json(
        { message: "Item not found", reason: "not_found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const nextQuantity = Math.max(0, Math.floor(quantity));
    const nextItems =
      nextQuantity > 0
        ? cart.items.map((item, idx) =>
            idx === index ? { ...item, quantity: nextQuantity } : item
          )
        : cart.items.filter((item) => item.id !== params.lineId);

    const useDealerPrice = await resolveDealerPricing(userId, userEmail);
    const syncedItems = await syncCartItemsWithLatestProducts(nextItems, {
      useDealerPrice,
    });
    const stockIssues = getStockIssues(syncedItems);
    if (stockIssues.length) {
      return NextResponse.json(
        { message: buildStockIssueMessage(stockIssues[0]), reason: "out_of_stock" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const updatedCart = await updateCartTotals(cart, syncedItems, undefined, userId);

    return buildResponse(updatedCart, shouldSetCookie, cartId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload", errors: error.flatten().fieldErrors },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    console.error("[cart][line][patch] Unexpected error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        message: "Internal server error",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ lineId: string }> | { lineId: string } }
) {
  try {
    const params = await context.params;
    const { cart, cartId, shouldSetCookie, userId, userEmail } =
      await resolveCart(request);
    const nextItems = cart.items.filter((item) => item.id !== params.lineId);
    const useDealerPrice = await resolveDealerPricing(userId, userEmail);
    const syncedItems = await syncCartItemsWithLatestProducts(nextItems, {
      useDealerPrice,
    });
    const updatedCart = await updateCartTotals(cart, syncedItems, undefined, userId);

    return buildResponse(updatedCart, shouldSetCookie, cartId);
  } catch (error) {
    console.error("[cart][line][delete] Unexpected error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        message: "Internal server error",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
