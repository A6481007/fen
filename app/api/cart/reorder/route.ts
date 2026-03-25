import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import type {
  CartItem,
  CartReorderAddedItem,
  CartReorderResponse,
  CartReorderSkippedItem,
} from "@/lib/cart/types";
import { client as sanityClient } from "@/sanity/lib/client";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  fetchProductsByIds,
  getOrCreateCart,
  hydrateCartForResponse,
  mergeCartItems,
  resolveDealerPricing,
  toCartPayload,
  updateCartTotals,
} from "../utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const reorderItemSchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
  quantity: z.number().int().positive().optional(),
  priceOptionId: z.string().trim().optional(),
  priceOptionLabel: z.string().trim().optional(),
  productName: z.string().optional(),
  productSlug: z.string().optional(),
});

const reorderRequestSchema = z
  .object({
    orderId: z.string().trim().optional(),
    items: z.array(reorderItemSchema).min(1).optional(),
  })
  .refine((data) => Boolean(data.orderId || data.items?.length), {
    message: "Provide orderId or items",
  });

type RawReorderItem = {
  productId?: string;
  quantity?: number | null;
  priceOptionId?: string | null;
  priceOptionLabel?: string | null;
  productName?: string | null;
  productSlug?: string | null;
};

type OrderLookup = {
  clerkUserId?: string | null;
  products?: Array<{
    quantity?: number | null;
    priceOptionId?: string | null;
    priceOptionLabel?: string | null;
    product?: {
      _id?: string | null;
      name?: string | null;
      slug?: { current?: string } | string | null;
    } | null;
  }> | null;
};

const normalizeQuantity = (quantity?: number | null) => {
  const parsed = Math.floor(quantity ?? 1);
  return parsed > 0 ? parsed : 1;
};

const buildResponse = (
  payload: CartReorderResponse,
  shouldSetCookie: boolean,
  cartId: string
) => {
  const response = NextResponse.json(payload, { status: 200, headers: JSON_HEADERS });

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

const getUserIdSafe = async (): Promise<string | null> => {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cart][reorder] Clerk auth unavailable, continuing anonymously", error);
      return null;
    }
    throw error;
  }
};

const fetchOrderItems = async (orderId: string) => {
  const order = await sanityClient.fetch<OrderLookup | null>(
    `*[_type == "order" && _id == $orderId][0]{
      clerkUserId,
      products[]{
        quantity,
        priceOptionId,
        priceOptionLabel,
        product->{_id,name,slug}
      }
    }`,
    { orderId }
  );

  if (!order) return null;

  const items: RawReorderItem[] = (order.products ?? []).map((line) => {
    const product = line?.product;
    const slugValue =
      typeof product?.slug === "string"
        ? product.slug
        : product?.slug?.current ?? undefined;
    return {
      productId: product?._id ?? undefined,
      productName: product?.name ?? undefined,
      productSlug: slugValue ?? undefined,
      quantity: typeof line?.quantity === "number" ? line.quantity : 1,
      priceOptionId: line?.priceOptionId ?? undefined,
      priceOptionLabel: line?.priceOptionLabel ?? undefined,
    };
  });

  return { order, items };
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const payload = await reorderRequestSchema.parseAsync(raw);
    const cookieStore = request.cookies;
    const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
    const cartId = existingCartId ?? crypto.randomUUID();
    const userId = await getUserIdSafe();
    const user = userId ? await currentUser() : null;
    const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
    const useDealerPrice = await resolveDealerPricing(userId, userEmail);

    let requestItems: RawReorderItem[] = payload.items ?? [];

    if (!requestItems.length && payload.orderId) {
      const orderData = await fetchOrderItems(payload.orderId);
      if (!orderData) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404, headers: JSON_HEADERS }
        );
      }

      if (
        orderData.order?.clerkUserId &&
        userId &&
        orderData.order.clerkUserId !== userId
      ) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404, headers: JSON_HEADERS }
        );
      }

      requestItems = orderData.items;
    }

    if (!requestItems.length) {
      return NextResponse.json(
        { message: "No items provided" },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const cart = await getOrCreateCart(cartId, userId, cookieStore);
    const shouldSetCookie = !existingCartId;

    const normalizedItems = requestItems.map((item) => ({
      productId: item.productId?.trim() ?? "",
      quantity: normalizeQuantity(item.quantity),
      priceOptionId: item.priceOptionId ?? undefined,
      priceOptionLabel: item.priceOptionLabel ?? undefined,
      productName: item.productName ?? undefined,
      productSlug: item.productSlug ?? undefined,
    }));

    const productIds = Array.from(
      new Set(normalizedItems.map((item) => item.productId).filter(Boolean))
    );
    const productLookup = await fetchProductsByIds(productIds);

    const cartQuantities = new Map<string, number>();
    cart.items.forEach((item) => {
      cartQuantities.set(item.productId, (cartQuantities.get(item.productId) ?? 0) + item.quantity);
    });

    const skippedItems: CartReorderSkippedItem[] = [];
    const addedItems: CartReorderAddedItem[] = [];
    const incomingCartItems: CartItem[] = [];

    normalizedItems.forEach((item) => {
      if (!item.productId) {
        skippedItems.push({
          productName: item.productName ?? "Unknown product",
          reason: "Missing product reference",
        });
        return;
      }

      const product = productLookup[item.productId];
      if (!product) {
        skippedItems.push({
          productId: item.productId,
          productName: item.productName ?? item.productId,
          reason: "Product unavailable",
        });
        return;
      }

      const stock = product.stock;
      if (typeof stock !== "number" || Number.isNaN(stock)) {
        skippedItems.push({
          productId: item.productId,
          productName: product.name ?? item.productName ?? item.productId,
          reason: "Stock unavailable",
        });
        return;
      }

      if (stock <= 0) {
        skippedItems.push({
          productId: item.productId,
          productName: product.name ?? item.productName ?? item.productId,
          reason: "Out of stock",
        });
        return;
      }

      const existingQty = cartQuantities.get(item.productId) ?? 0;
      const availableQty = stock - existingQty;

      if (availableQty <= 0) {
        skippedItems.push({
          productId: item.productId,
          productName: product.name ?? item.productName ?? item.productId,
          reason: "Out of stock",
        });
        return;
      }

      const addQty = Math.min(item.quantity, availableQty);
      if (addQty <= 0) {
        skippedItems.push({
          productId: item.productId,
          productName: product.name ?? item.productName ?? item.productId,
          reason: "Out of stock",
        });
        return;
      }

      if (addQty < item.quantity) {
        skippedItems.push({
          productId: item.productId,
          productName: product.name ?? item.productName ?? item.productId,
          reason: `Only ${availableQty} available`,
        });
      }

      const priceOptions = product.priceOptions ?? [];
      const normalizedOptionId =
        typeof item.priceOptionId === "string" ? item.priceOptionId.trim() : "";
      const normalizedOptionLabel =
        typeof item.priceOptionLabel === "string"
          ? item.priceOptionLabel.trim().toLowerCase()
          : "";
      const resolvedOption =
        (normalizedOptionId
          ? priceOptions.find((option) => (option?._key ?? "") === normalizedOptionId)
          : undefined) ??
        (normalizedOptionLabel
          ? priceOptions.find(
              (option) => (option?.label ?? "").trim().toLowerCase() === normalizedOptionLabel
            )
          : undefined) ??
        priceOptions.find((option) => option?.isDefault) ??
        priceOptions[0];
      const optionPrice =
        typeof resolvedOption?.price === "number" ? resolvedOption.price : null;
      const basePrice =
        typeof product.price === "number" && product.price > 0 ? product.price : null;
      const baseDealer =
        typeof product.dealerPrice === "number" && product.dealerPrice >= 0
          ? product.dealerPrice
          : null;
      const dealerRatio =
        basePrice && baseDealer !== null ? baseDealer / basePrice : null;
      const optionDealerPrice =
        typeof resolvedOption?.dealerPrice === "number"
          ? resolvedOption.dealerPrice
          : dealerRatio !== null && optionPrice !== null
            ? Number((optionPrice * dealerRatio).toFixed(2))
            : null;
      const unitPrice =
        useDealerPrice && typeof optionDealerPrice === "number"
          ? optionDealerPrice
          : useDealerPrice && typeof product.dealerPrice === "number"
            ? product.dealerPrice
            : typeof optionPrice === "number"
              ? optionPrice
              : typeof product.price === "number"
                ? product.price
                : 0;
      const productSlug = product.slug ?? item.productSlug ?? item.productId;
      const productName = product.name ?? item.productName ?? item.productId;

      incomingCartItems.push({
        id: crypto.randomUUID(),
        productId: item.productId,
        productSlug,
        productName,
        quantity: addQty,
        unitPrice,
        lineTotal: Math.max(0, unitPrice * addQty),
        imageUrl: product.imageUrl ?? undefined,
        availableStock: typeof product.stock === "number" ? product.stock : null,
        priceOptionId: item.priceOptionId ?? resolvedOption?._key ?? undefined,
        priceOptionLabel: item.priceOptionLabel ?? resolvedOption?.label ?? undefined,
        product: {
          id: product._id,
          name: product.name ?? undefined,
          slug: product.slug ?? undefined,
          price: typeof optionPrice === "number" ? optionPrice : product.price ?? undefined,
          dealerPrice:
            typeof optionDealerPrice === "number"
              ? optionDealerPrice
              : product.dealerPrice ?? undefined,
          imageUrl: product.imageUrl ?? undefined,
          stock: product.stock ?? undefined,
          variant: product.variant ?? undefined,
          categories: product.categories ?? undefined,
        },
      });

      addedItems.push({
        productId: item.productId,
        productName,
        productSlug,
        quantity: addQty,
      });

      cartQuantities.set(item.productId, existingQty + addQty);
    });

    if (!incomingCartItems.length) {
      const hydratedCart = await hydrateCartForResponse(cart);
      return buildResponse(
        { ...toCartPayload(hydratedCart), addedItems, skippedItems },
        shouldSetCookie,
        cartId
      );
    }

    const mergedItems = mergeCartItems(cart.items, incomingCartItems);
    const updatedCart = await updateCartTotals(cart, mergedItems, undefined, userId);
    const hydratedCart = await hydrateCartForResponse(updatedCart);

    return buildResponse(
      { ...toCartPayload(hydratedCart), addedItems, skippedItems },
      shouldSetCookie,
      cartId
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload", errors: error.flatten().fieldErrors },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    console.error("[cart][reorder] Failed to reorder items", error);
    return NextResponse.json(
      { message: "Unable to reorder items" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
