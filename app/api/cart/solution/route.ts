import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import type { Cart, CartItem } from "@/lib/cart/types";
import { client as sanityClient } from "@/sanity/lib/client";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  getOrCreateCart,
  mergeCartItems,
  toCartPayload,
  updateCartTotals,
} from "../utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const solutionProductSchema = z.object({
  product: z.object({
    _id: z.string().trim().min(1, "product id is required"),
    name: z.string().optional(),
    price: z.number().nonnegative().optional(),
    dealerPrice: z.number().nonnegative().optional(),
    stock: z.number().int().optional(),
    discount: z.number().optional(),
    images: z.array(z.unknown()).optional(),
    slug: z
      .object({
        current: z.string().trim().optional(),
      })
      .optional(),
  }),
  quantity: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional(),
  notes: z.string().optional(),
});

const addSolutionSchema = z.object({
  solutionId: z.string().trim().min(1, "solutionId is required"),
  products: z.array(solutionProductSchema).min(1, "At least one product is required"),
  quantities: z.record(z.string(), z.number().int().nonnegative()).optional(),
});

type AddSolutionRequest = z.infer<typeof addSolutionSchema>;

type SolutionProduct = AddSolutionRequest["products"][number];

interface ProductSnapshot {
  _id: string;
  name?: string | null;
  slug?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  stock?: number | null;
  variant?: string | null;
  categories?: string[];
}

interface NormalizedItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
  productName?: string;
  productSlug?: string;
  imageUrl?: string | null;
  stock?: number | null;
  productSnapshot?: ProductSnapshot;
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeQuantity = (value: unknown, fallback: number) => {
  const parsed = Number.isFinite(value as number) ? Math.floor(value as number) : fallback;
  return Math.max(0, parsed);
};

const resolveQuantity = (item: SolutionProduct, quantities?: Record<string, number>) => {
  const productId = item.product._id;
  const override = quantities?.[productId];
  if (typeof override === "number" && Number.isFinite(override)) {
    return Math.max(0, Math.floor(override));
  }

  if (item.isRequired === false) {
    return 0;
  }

  return normalizeQuantity(item.quantity, 1);
};

const getUserIdSafe = async (): Promise<string | null> => {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cart][solution] Clerk auth unavailable, continuing anonymously", error);
      return null;
    }
    throw error;
  }
};

const fetchProductsByIds = async (ids: string[]): Promise<Record<string, ProductSnapshot>> => {
  if (!ids.length) return {};

  const products = await sanityClient.fetch<
    Array<{
      _id?: string;
      name?: string;
      slug?: { current?: string } | string;
      price?: number;
      stock?: number;
      variant?: string;
      images?: Array<{ asset?: { url?: string } }>;
      thumbnailImage?: { asset?: { url?: string } };
      categories?: Array<{ _ref?: string; _type?: string; _id?: string }>;
    }>
  >(
    '*[_type == "product" && _id in $ids]{_id,name,slug,price,stock,variant,images[]{asset->{url}},thumbnailImage{asset->{url}},categories[]->{_id,name,title}}',
    { ids }
  );

  return products.reduce<Record<string, ProductSnapshot>>((acc, product) => {
    if (product?._id) {
      const slugValue =
        typeof product.slug === "string"
          ? product.slug
          : (product.slug as { current?: string } | undefined)?.current ?? null;
      const imageCandidate =
        product.thumbnailImage?.asset?.url ??
        product.images?.find((img) => img?.asset?.url)?.asset?.url ??
        null;
      acc[product._id] = {
        _id: product._id,
        name: product.name ?? null,
        slug: slugValue,
        price: product.price ?? null,
        stock: product.stock ?? null,
        variant: product.variant ?? null,
        imageUrl: imageCandidate,
        categories:
          product.categories
            ?.map(
              (category) =>
                (category as any)?.name ||
                (category as any)?.title ||
                (category as any)?._id ||
                (category as any)?._ref
            )
            .filter((id): id is string => Boolean(id)) ?? [],
      };
    }
    return acc;
  }, {});
};

const hydrateItems = async (items: NormalizedItem[]): Promise<NormalizedItem[]> => {
  const ids = items.map((item) => item.productId);
  const fetched = await fetchProductsByIds(ids);

  return items.map((item) => {
    const product = fetched[item.productId];
    const unitPrice = toNumber(product?.price ?? item.unitPrice, 0);
    const slugValue = product?.slug ?? item.productSlug;
    const imageUrl = product?.imageUrl ?? item.imageUrl ?? null;
    return {
      ...item,
      unitPrice,
      productName: item.productName ?? product?.name ?? item.productId,
      productSlug: slugValue ?? item.productId,
      imageUrl,
      stock: product?.stock ?? item.stock ?? null,
      productSnapshot: product,
    };
  });
};

const checkStockLimits = (items: NormalizedItem[], cart: Cart) => {
  const totals = new Map<string, number>();
  const failures: Array<{
    productId: string;
    productName: string;
    stock: number;
    requested: number;
  }> = [];

  cart.items.forEach((item) => {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  });

  for (const item of items) {
    const stock = item.stock ?? item.productSnapshot?.stock;
    if (typeof stock === "number" && stock >= 0) {
      const nextCount = (totals.get(item.productId) ?? 0) + item.quantity;
      if (nextCount > stock) {
        failures.push({
          productId: item.productId,
          productName: item.productName ?? item.productId,
          stock,
          requested: nextCount,
        });
      }
      totals.set(item.productId, nextCount);
    }
  }

  return failures;
};

const buildResponse = (cart: Cart, shouldSetCookie: boolean, cartId: string) => {
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

const SOLUTION_PRODUCTS_QUERY = `
  *[_type == "insight" && status == "published" && (_id == $solutionId || slug.current == $solutionId)][0]{
    _id,
    title,
    solutionProducts[]{
      product->{_id,name,slug,price,dealerPrice,stock,images},
      quantity,
      isRequired,
      notes
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const solutionId = new URL(request.url).searchParams.get("solutionId")?.trim();

    if (!solutionId) {
      return NextResponse.json(
        { message: "solutionId is required" },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const solution = await sanityClient.fetch<{
      _id?: string;
      title?: string;
      solutionProducts?: Array<{
        product?: {
          _id?: string;
          name?: string;
          slug?: { current?: string } | string;
          price?: number;
          dealerPrice?: number;
          stock?: number;
        };
        quantity?: number;
        isRequired?: boolean;
        notes?: string;
      }>;
    }>(SOLUTION_PRODUCTS_QUERY, { solutionId });

    if (!solution || !Array.isArray(solution.solutionProducts)) {
      return NextResponse.json(
        { message: "Solution not found", reason: "not_found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const items = solution.solutionProducts
      .map((item) => {
        const product = item.product;
        if (!product?._id) return null;
        const stock =
          typeof product.stock === "number" && Number.isFinite(product.stock)
            ? Math.max(0, Math.floor(product.stock))
            : null;
        const quantity = normalizeQuantity(
          item.quantity,
          item.isRequired === false ? 0 : 1
        );
        const hasStock = typeof stock === "number";
        const inStock = hasStock ? stock > 0 && quantity <= stock : null;
        const slugValue =
          typeof product.slug === "string"
            ? product.slug
            : product.slug?.current ?? null;
        return {
          productId: product._id,
          name: product.name ?? product._id,
          slug: slugValue,
          quantity,
          isRequired: item.isRequired !== false,
          availableStock: stock,
          inStock,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      name: string;
      slug: string | null;
      quantity: number;
      isRequired: boolean;
      availableStock: number | null;
      inStock: boolean | null;
    }>;

    const allAvailable = items.every(
      (item) => item.inStock === null || item.inStock === true
    );

    return NextResponse.json(
      {
        solutionId: solution._id ?? solutionId,
        title: solution.title ?? null,
        available: allAvailable,
        items,
      },
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    console.error("[cart][solution][get] Unexpected error", error);
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

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const payload = await addSolutionSchema.parseAsync(raw);
    const quantities = payload.quantities ?? {};

    const requiredItems = payload.products.filter((item) => item.isRequired !== false);
    if (!requiredItems.length) {
      return NextResponse.json(
        { message: "No required products configured for this solution." },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const missingRequired = requiredItems
      .filter((item) => resolveQuantity(item, quantities) <= 0)
      .map((item) => item.product.name ?? item.product._id);

    if (missingRequired.length) {
      return NextResponse.json(
        {
          message: "Please set quantities for all required products.",
          missing: missingRequired,
        },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const requestedItems = payload.products
      .map((item) => {
        if (!item.product?._id) return null;
        const quantity = resolveQuantity(item, quantities);
        if (quantity <= 0) return null;
        return {
          productId: item.product._id,
          quantity,
          productName: item.product.name ?? undefined,
          productSlug: item.product.slug?.current ?? undefined,
          unitPrice:
            typeof item.product.price === "number" && Number.isFinite(item.product.price)
              ? item.product.price
              : undefined,
          stock:
            typeof item.product.stock === "number" && Number.isFinite(item.product.stock)
              ? Math.max(0, Math.floor(item.product.stock))
              : null,
        } as NormalizedItem;
      })
      .filter(Boolean) as NormalizedItem[];

    if (!requestedItems.length) {
      return NextResponse.json(
        { message: "No items could be added to the cart." },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const cookieStore = request.cookies;
    const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
    const cartId = existingCartId ?? crypto.randomUUID();
    const userId = await getUserIdSafe();
    const cart = await getOrCreateCart(cartId, userId, cookieStore);
    const shouldSetCookie = !existingCartId;

    const hydratedItems = await hydrateItems(requestedItems);
    const stockFailures = checkStockLimits(hydratedItems, cart);
    if (stockFailures.length) {
      return NextResponse.json(
        {
          message: "Some items are out of stock.",
          reason: "out_of_stock",
          items: stockFailures,
        },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const cartItems: CartItem[] = hydratedItems.map((item) => ({
      id: crypto.randomUUID(),
      productId: item.productId,
      productSlug: item.productSlug ?? item.productId,
      productName: item.productName ?? item.productId,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice, 0),
      lineTotal: Math.max(0, toNumber(item.unitPrice, 0) * item.quantity),
      imageUrl: item.imageUrl ?? null,
      availableStock: item.stock ?? item.productSnapshot?.stock ?? null,
      product: item.productSnapshot
        ? {
            id: item.productSnapshot._id,
            name: item.productSnapshot.name ?? undefined,
            slug: item.productSnapshot.slug ?? undefined,
            price: item.productSnapshot.price ?? undefined,
            imageUrl: item.productSnapshot.imageUrl ?? undefined,
            stock: item.productSnapshot.stock ?? undefined,
            variant: item.productSnapshot.variant ?? undefined,
            categories: item.productSnapshot.categories,
          }
        : undefined,
    }));

    const mergedItems = mergeCartItems(cart.items, cartItems);
    const updatedCart = await updateCartTotals(cart, mergedItems, undefined, userId);
    return buildResponse(updatedCart, shouldSetCookie, cartId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload", errors: error.flatten().fieldErrors },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    console.error("[cart][solution][post] Unexpected error", error);
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
