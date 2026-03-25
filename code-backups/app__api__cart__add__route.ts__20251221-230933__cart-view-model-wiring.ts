import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import type { AppliedPromotion, Cart, CartItem, DiscountType } from "@/lib/cart/types";
import { client as sanityClient } from "@/sanity/lib/client";
import { getPromotionByCampaignId } from "@/sanity/queries";
import type { PROMOTION_BY_CAMPAIGN_ID_QUERYResult } from "@/sanity.types";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  getOrCreateCart,
  mergeAppliedPromotions,
  mergeCartItems,
  updateCartTotals,
} from "../utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const addRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, "productId is required"),
        quantity: z.number().int().positive().default(1),
        variantId: z.string().trim().optional(),
        productName: z.string().optional(),
        productSlug: z.string().optional(),
        unitPrice: z.number().positive().optional(),
      })
    )
    .min(1, "At least one item is required"),
  dealId: z.string().trim().optional(),
  promotionId: z.string().trim().optional(),
  promoCode: z.string().trim().optional(),
});

type AddRequest = z.infer<typeof addRequestSchema>;
type PromotionDoc = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult> & {
  defaultProducts?: Array<{ product?: ProductSnapshot; quantity?: number | null }>;
  defaultBundleItems?: Array<{ product?: ProductSnapshot; quantity?: number | null }>;
};
type PromotionEngineModule = typeof import("@/lib/promotions/promotionEngine");
type EnginePromotion = Parameters<PromotionEngineModule["promotionEngine"]["checkEligibility"]>[0];
type EngineUser = Parameters<PromotionEngineModule["promotionEngine"]["checkEligibility"]>[1];
type EngineContext = Parameters<PromotionEngineModule["promotionEngine"]["checkEligibility"]>[2];

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
  variantId?: string;
  unitPrice?: number;
  productName?: string;
  productSlug?: string;
  imageUrl?: string | null;
  variantLabel?: string | null;
  stock?: number | null;
  variant?: string | null;
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDateMs = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const normalizeQuantity = (quantity?: number) => {
  const parsed = Math.floor(quantity ?? 1);
  return parsed > 0 ? parsed : 1;
};

const isPromotionActiveNow = (promotion: PromotionDoc): boolean => {
  if (typeof promotion.isActive === "boolean") {
    return promotion.isActive;
  }

  const now = Date.now();
  const start = parseDateMs(promotion.startDate);
  const end = parseDateMs(promotion.endDate);
  const withinWindow = (start === 0 || start <= now) && (end === 0 || now <= end);
  const status = promotion.status ?? "draft";

  return withinWindow && (status === "active" || (status === "scheduled" && start <= now));
};

const buildResponse = (cart: Cart, shouldSetCookie: boolean, cartId: string) => {
  const response = NextResponse.json(cart, { status: 200, headers: JSON_HEADERS });

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
      console.warn("[cart][add] Clerk auth unavailable, continuing anonymously", error);
      return null;
    }
    throw error;
  }
};

const fetchUserData = async (
  userId: string | null | undefined,
  engine: PromotionEngineModule["promotionEngine"]
): Promise<EngineUser> => {
  if (!userId) return null;

  const maybeFetcher = (engine as unknown as {
    fetchUserData?: (uid: string) => Promise<EngineUser>;
  }).fetchUserData;

  if (typeof maybeFetcher !== "function") return null;

  try {
    return await maybeFetcher.call(engine, userId);
  } catch (error) {
    console.error("[cart][promotions] Failed to fetch user data", error);
    return null;
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
                category?.name || category?.title || category?._id || category?._ref
            )
            .filter((id): id is string => Boolean(id)) ?? [],
      };
    }
    return acc;
  }, {});
};

const collectPromotionProducts = (promotion: PromotionDoc) => {
  const products: ProductSnapshot[] = [];

  const addIfPresent = (product?: ProductSnapshot | null | undefined) => {
    if (product?._id) {
      const slugValue =
        typeof product.slug === "string"
          ? product.slug
          : (product.slug as { current?: string } | undefined)?.current ?? null;
      products.push({
        ...product,
        slug: slugValue,
      });
    }
  };

  (promotion.products ?? []).forEach((product) => {
    addIfPresent(product as ProductSnapshot);
  });

  (promotion.targetAudience?.products ?? []).forEach((product) => {
    addIfPresent(product as ProductSnapshot);
  });

  (promotion.defaultProducts ?? []).forEach((item) => {
    addIfPresent((item as { product?: ProductSnapshot }).product);
  });

  (promotion.defaultBundleItems ?? []).forEach((item) => {
    addIfPresent((item as { product?: ProductSnapshot }).product);
  });

  return products;
};

const hydrateItems = async (
  items: NormalizedItem[],
  promotion?: PromotionDoc
): Promise<
  Array<
    NormalizedItem & {
      unitPrice: number;
      productName?: string;
      productSlug?: string;
      imageUrl?: string | null;
      variantLabel?: string | null;
      stock?: number | null;
      productSnapshot?: ProductSnapshot;
    }
  >
> => {
  const knownProducts = promotion ? collectPromotionProducts(promotion) : [];
  const knownMap = knownProducts.reduce<Record<string, ProductSnapshot>>((acc, product) => {
    if (product?._id) {
      acc[product._id] = product;
    }
    return acc;
  }, {});

  const missingIds = items
    .map((item) => item.productId)
    .filter((id) => id && !knownMap[id]);

  const fetched = await fetchProductsByIds(missingIds);
  const lookup = { ...knownMap, ...fetched };

  return items.map((item) => {
    const product = lookup[item.productId];
    const unitPrice = item.unitPrice ?? toNumber(product?.price, 0);
    const slugValue = product?.slug ?? item.productSlug;
    const imageUrl = product?.imageUrl ?? item.imageUrl;
    const variantLabel = item.variantLabel ?? item.variantId ?? product?.variant ?? null;
    return {
      ...item,
      unitPrice,
      productName: item.productName ?? product?.name ?? item.productId,
      productSlug: slugValue ?? item.productId,
      imageUrl,
      variantLabel,
      stock: product?.stock ?? item.stock ?? null,
      productSnapshot: product,
    };
  });
};

const buildPromotionItems = (payload: AddRequest, promotion: PromotionDoc): NormalizedItem[] => {
  const bundleDefaults = Array.isArray(promotion.defaultBundleItems)
    ? (promotion.defaultBundleItems as Array<{ product?: ProductSnapshot; quantity?: number }>)
    : [];
  const productDefaults = Array.isArray(promotion.defaultProducts)
    ? (promotion.defaultProducts as Array<{ product?: ProductSnapshot; quantity?: number }>)
    : [];

  if (
    (promotion.discountType === "bxgy" || promotion.type === "bundle") &&
    bundleDefaults.length
  ) {
    return bundleDefaults
      .map((item) => ({
        productId: item.product?._id ?? "",
        quantity: normalizeQuantity(item.quantity),
        productName: item.product?.name ?? undefined,
        productSlug: item.product?.slug ?? undefined,
        unitPrice: toNumber(item.product?.price),
      }))
      .filter((item): item is NormalizedItem => Boolean(item.productId));
  }

  if (productDefaults.length) {
    return productDefaults
      .map((item) => ({
        productId: item.product?._id ?? "",
        quantity: normalizeQuantity(item.quantity),
        productName: item.product?.name ?? undefined,
        productSlug: item.product?.slug ?? undefined,
        unitPrice: toNumber(item.product?.price),
      }))
      .filter((item): item is NormalizedItem => Boolean(item.productId));
  }

  return payload.items.map((item) => ({
    productId: item.productId,
    quantity: normalizeQuantity(item.quantity),
    variantId: item.variantId,
    productName: item.productName,
    productSlug: item.productSlug,
    unitPrice: item.unitPrice,
  }));
};

const ensureBxgyPayload = (promotion: PromotionDoc, items: NormalizedItem[]) => {
  if (promotion.discountType !== "bxgy") {
    return null;
  }

  const buyQty = Math.max(0, promotion.buyQuantity ?? 0);
  const getQty = Math.max(0, promotion.getQuantity ?? 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctLines = items.length;

  if (buyQty > 0 && getQty > 0 && (totalQty < buyQty + getQty || distinctLines < 2)) {
    return "Buy X Get Y promotions require both buy and get items in the same request.";
  }

  return null;
};

const checkStockLimits = (
  incoming: Awaited<ReturnType<typeof hydrateItems>>,
  cart: Cart
): string | null => {
  const totals = new Map<string, number>();
  cart.items.forEach((item) => {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  });

  for (const item of incoming) {
    const stock = item.stock ?? item.productSnapshot?.stock;
    if (typeof stock === "number" && stock >= 0) {
      const nextCount = (totals.get(item.productId) ?? 0) + item.quantity;
      if (nextCount > stock) {
        return `Only ${stock} units of ${item.productName ?? item.productId} available`;
      }
      totals.set(item.productId, nextCount);
    }
  }

  return null;
};

const allocateDiscountAcrossItems = (
  items: Awaited<ReturnType<typeof hydrateItems>>,
  discountAmount: number
): { cartItems: CartItem[]; appliedPromotion?: AppliedPromotion } => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const safeSubtotal = subtotal > 0 ? subtotal : 1; // avoid division by zero

  let remainingDiscount = Math.min(Math.max(0, discountAmount), subtotal);

  const cartItems = items.map((item, index) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    const proportionalDiscount =
      index === items.length - 1
        ? remainingDiscount
        : Math.min(remainingDiscount, (itemSubtotal / safeSubtotal) * discountAmount);
    remainingDiscount -= proportionalDiscount;

    const lineTotal = Math.max(0, itemSubtotal - proportionalDiscount);

    return {
      id: crypto.randomUUID(),
      productId: item.productId,
      productSlug: item.productSlug ?? item.productId,
      productName: item.productName ?? item.productId,
      variantId: item.variantId,
      variantLabel: item.variantLabel ?? undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl,
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
      availableStock: item.stock ?? item.productSnapshot?.stock ?? null,
      appliedPromotion: undefined,
      lineTotal,
    };
  });

  return { cartItems };
};

const handleDealAdd = async (
  request: NextRequest,
  payload: AddRequest,
  cart: Cart,
  shouldSetCookie: boolean,
  cartId: string
) => {
  const firstItem = payload.items[0];
  const origin = new URL(request.url).origin;

  const quoteResponse = await fetch(`${origin}/api/deals/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      dealId: payload.dealId,
      quantity: firstItem?.quantity,
      variantId: firstItem?.variantId,
    }),
  });

  let quoteBody: any = null;
  const isJson = (quoteResponse.headers.get("content-type") || "").includes("application/json");
  try {
    quoteBody = isJson ? await quoteResponse.json() : await quoteResponse.text();
  } catch (error) {
    console.error("[cart][deal] Failed to parse deal quote response", error);
    return NextResponse.json(
      { message: "Unable to validate deal pricing" },
      { status: 502, headers: JSON_HEADERS }
    );
  }

  if (!quoteResponse.ok || quoteBody?.eligible === false) {
    const message = quoteBody?.reason || quoteBody?.message || "Deal not eligible";
    return NextResponse.json({ message }, { status: quoteResponse.status || 409, headers: JSON_HEADERS });
  }

  if (!quoteBody || typeof quoteBody !== "object") {
    return NextResponse.json(
      { message: "Unexpected deal response" },
      { status: 502, headers: JSON_HEADERS }
    );
  }

  const quotedItem = (quoteBody as { items?: any[] }).items?.[0];

  if (!quotedItem) {
    return NextResponse.json(
      { message: "Deal quote did not include an item" },
      { status: 422, headers: JSON_HEADERS }
    );
  }

  const discountAmount =
    toNumber(quoteBody.totals?.discountAmount, 0) ||
    Math.max(
      0,
      toNumber(quotedItem.originalUnitPrice ?? quotedItem.unitPrice, 0) * quotedItem.quantity -
        toNumber(quotedItem.lineTotal, 0)
    );
  const percent = toNumber(quoteBody.totals?.discountPercent, 0);
  const discountType: DiscountType = percent > 0 ? "percentage" : "fixed_amount";

  const appliedPromotion: AppliedPromotion = {
    type: "deal",
    id: quoteBody.deal?.id ?? payload.dealId ?? quotedItem.productId,
    name: quoteBody.deal?.title ?? payload.dealId ?? quotedItem.productId,
    discountType,
    discountValue: discountType === "percentage" ? percent : discountAmount,
    discountAmount,
    expiresAt: quoteBody.deal?.endDate ?? undefined,
  };

  const cartItem: CartItem = {
    id: crypto.randomUUID(),
    productId: quotedItem.productId,
    productSlug: quotedItem.slug ?? quotedItem.productId,
    productName: quotedItem.name ?? quotedItem.productId,
    variantId: quotedItem.variantId ?? firstItem?.variantId,
    variantLabel: quotedItem.variantLabel ?? quotedItem.variantId ?? firstItem?.variantId,
    quantity: normalizeQuantity(quotedItem.quantity),
    unitPrice: toNumber(quotedItem.unitPrice, 0),
    appliedPromotion,
    lineTotal: Math.max(0, toNumber(quotedItem.lineTotal, 0)),
    imageUrl:
      quotedItem.imageUrl ??
      quotedItem.image ??
      quotedItem.thumbnail ??
      quotedItem.thumbnailUrl ??
      null,
    availableStock: quotedItem.stock ?? null,
    product: {
      id: quotedItem.productId,
      name: quotedItem.name ?? quotedItem.productId,
      slug: quotedItem.slug ?? quotedItem.productId,
      price: toNumber(quotedItem.originalUnitPrice ?? quotedItem.unitPrice, 0),
      imageUrl:
        quotedItem.imageUrl ??
        quotedItem.image ??
        quotedItem.thumbnail ??
        quotedItem.thumbnailUrl ??
        null,
      stock: quotedItem.stock ?? null,
      variant: quotedItem.variantId ?? null,
    },
  };

  const updatedPromos = mergeAppliedPromotions(cart.appliedPromotions, appliedPromotion);
  const mergedItems = mergeCartItems(cart.items, [cartItem]);
  const updatedCart = await updateCartTotals(cart, mergedItems, updatedPromos);

  return buildResponse(updatedCart, shouldSetCookie, cartId);
};

const handlePromotionAdd = async (
  payload: AddRequest,
  cart: Cart,
  promotion: PromotionDoc,
  userId: string | null,
  shouldSetCookie: boolean,
  cartId: string
) => {
  const [promotionEngineModule, analytics] = await Promise.all([
    import("@/lib/promotions/promotionEngine"),
    import("@/lib/promotions/analytics"),
  ]);
  const engine = promotionEngineModule.promotionEngine;
  const { checkBudgetAvailable, checkPerCustomerLimit, checkUsageLimitAvailable } = analytics;

  if (!isPromotionActiveNow(promotion)) {
    return NextResponse.json(
      { message: "Promotion is not active", reason: "inactive" },
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const requestedItems = buildPromotionItems(payload, promotion);
  if (!requestedItems.length) {
    return NextResponse.json(
      { message: "Promotion is missing default products", reason: "missing_products" },
      { status: 422, headers: JSON_HEADERS }
    );
  }

  const bxgyError = ensureBxgyPayload(promotion, requestedItems);
  if (bxgyError) {
    return NextResponse.json({ message: bxgyError, reason: "invalid_payload" }, { status: 422, headers: JSON_HEADERS });
  }

  const hydratedItems = await hydrateItems(requestedItems, promotion);
  const stockError = checkStockLimits(hydratedItems, cart);
  if (stockError) {
    return NextResponse.json(
      { message: stockError, reason: "out_of_stock" },
      { status: 409, headers: JSON_HEADERS }
    );
  }
  const cartItemsForEngine: EngineContext["cartItems"] = hydratedItems.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    categoryId:
      promotion.targetAudience?.categories?.[0]?._id ?? promotion.categories?.[0]?._id ?? undefined,
  }));
  const cartValue = cartItemsForEngine.reduce(
    (sum, item) => sum + toNumber(item.unitPrice, 0) * toNumber(item.quantity, 0),
    0
  );

  const user = await fetchUserData(userId, engine);
  const eligibilityContext: EngineContext = {
    page: "cart",
    productId: hydratedItems[0]?.productId,
    categoryId:
      promotion.targetAudience?.categories?.[0]?._id ?? promotion.categories?.[0]?._id ?? undefined,
    cartValue,
    cartItems: cartItemsForEngine,
  };

  const eligibility = engine.checkEligibility(
    promotion as unknown as EnginePromotion,
    user,
    eligibilityContext
  );

  if (!eligibility.eligible) {
    return NextResponse.json(
      { message: eligibility.reason ?? "Promotion not eligible", reason: eligibility.reason },
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const campaignId = promotion.campaignId || promotion._id || payload.promotionId;

  if (promotion.budgetCap && promotion.budgetCap > 0) {
    const withinBudget = await checkBudgetAvailable(campaignId, promotion.budgetCap);
    if (!withinBudget) {
      return NextResponse.json(
        { message: "Promotion budget exhausted", reason: "budget_exhausted" },
        { status: 409, headers: JSON_HEADERS }
      );
    }
  }

  if (promotion.usageLimit && promotion.usageLimit > 0) {
    const withinUsage = await checkUsageLimitAvailable(campaignId, promotion.usageLimit);
    if (!withinUsage) {
      return NextResponse.json(
        { message: "Promotion usage limit reached", reason: "usage_limit" },
        { status: 409, headers: JSON_HEADERS }
      );
    }
  }

  if (promotion.perCustomerLimit && promotion.perCustomerLimit > 0) {
    if (!userId) {
      return NextResponse.json(
        { message: "Sign in required for this promotion", reason: "auth_required" },
        { status: 401, headers: JSON_HEADERS }
      );
    }

    const withinPerCustomer = await checkPerCustomerLimit(
      userId,
      campaignId,
      promotion.perCustomerLimit
    );

    if (!withinPerCustomer) {
      return NextResponse.json(
        { message: "Per-customer limit reached", reason: "per_customer_limit" },
        { status: 409, headers: JSON_HEADERS }
      );
    }
  }

  const engineWithContext = engine as unknown as {
    lastCartItems?: EngineContext["cartItems"];
    lastSessionData?: EngineContext["sessionData"];
    calculateDiscount: typeof engine["calculateDiscount"];
  };

  engineWithContext.lastCartItems = cartItemsForEngine;

  const discount = engineWithContext.calculateDiscount(
    promotion as unknown as EnginePromotion,
    cartValue,
    user?.ltv
  );

  engineWithContext.lastCartItems = undefined;
  engineWithContext.lastSessionData = undefined;

  const { cartItems } = allocateDiscountAcrossItems(hydratedItems, discount.discountAmount);

  const discountType: DiscountType =
    promotion.discountType === "percentage" ? "percentage" : "fixed_amount";
  const discountValue =
    discountType === "percentage"
      ? Math.max(0, promotion.discountValue ?? 0)
      : Math.max(0, discount.discountAmount);

  const appliedPromotion: AppliedPromotion = {
    type: "promotion",
    id: campaignId,
    name: promotion.name ?? campaignId,
    discountType,
    discountValue,
    discountAmount: Math.max(0, discount.discountAmount),
    expiresAt: promotion.endDate ?? undefined,
  };

  const cartItemsWithPromo = cartItems.map((item) => ({
    ...item,
    appliedPromotion,
  }));

  const updatedPromos = mergeAppliedPromotions(cart.appliedPromotions, appliedPromotion);
  const mergedItems = mergeCartItems(cart.items, cartItemsWithPromo);
  const updatedCart = await updateCartTotals(cart, mergedItems, updatedPromos);

  return buildResponse(updatedCart, shouldSetCookie, cartId);
};

const handleGenericAdd = async (
  payload: AddRequest,
  cart: Cart,
  shouldSetCookie: boolean,
  cartId: string
) => {
  const hydratedItems = await hydrateItems(
    payload.items.map((item) => ({
      productId: item.productId,
      quantity: normalizeQuantity(item.quantity),
      variantId: item.variantId,
      productName: item.productName,
      productSlug: item.productSlug,
      unitPrice: item.unitPrice,
    }))
  );

  const stockError = checkStockLimits(hydratedItems, cart);
  if (stockError) {
    return NextResponse.json(
      { message: stockError, reason: "out_of_stock" },
      { status: 409, headers: JSON_HEADERS }
    );
  }

  const cartItems: CartItem[] = hydratedItems.map((item) => ({
    id: crypto.randomUUID(),
    productId: item.productId,
    productSlug: item.productSlug ?? item.productId,
    productName: item.productName ?? item.productId,
    variantId: item.variantId,
    variantLabel: item.variantLabel ?? undefined,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    imageUrl: item.imageUrl,
    availableStock: item.stock ?? null,
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
    lineTotal: Math.max(0, item.unitPrice * item.quantity),
  }));

  const mergedItems = mergeCartItems(cart.items, cartItems);
  const updatedCart = await updateCartTotals(cart, mergedItems);
  return buildResponse(updatedCart, shouldSetCookie, cartId);
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const payload = await addRequestSchema.parseAsync(raw);
    const cookieStore = request.cookies;
    const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
    const cartId = existingCartId ?? crypto.randomUUID();
    const userId = await getUserIdSafe();

    if (payload.dealId && payload.promotionId) {
      return NextResponse.json(
        { message: "Provide either a dealId or promotionId, not both." },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const cart = await getOrCreateCart(cartId, userId);
    const shouldSetCookie = !existingCartId;

    if (payload.dealId) {
      return handleDealAdd(request, payload, cart, shouldSetCookie, cartId);
    }

    if (payload.promotionId) {
      const promotion = (await getPromotionByCampaignId(payload.promotionId, {
        revalidate: false,
      })) as PromotionDoc | null;

      if (!promotion) {
        return NextResponse.json(
          { message: "Promotion not found", reason: "not_found" },
          { status: 404, headers: JSON_HEADERS }
        );
      }

      return handlePromotionAdd(payload, cart, promotion, userId ?? null, shouldSetCookie, cartId);
    }

    return handleGenericAdd(payload, cart, shouldSetCookie, cartId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload", errors: error.flatten().fieldErrors },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[cart][add] Unexpected error", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
