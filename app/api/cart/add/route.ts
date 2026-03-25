import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import type { AppliedPromotion, Cart, CartItem, DiscountType } from "@/lib/cart/types";
import { client as sanityClient } from "@/sanity/lib/client";
import { getPromotionByCampaignId } from "@/sanity/queries";
import { getActivePromotions } from "@/sanity/queries/promotions";
import type {
  PROMOTION_BY_CAMPAIGN_ID_QUERYResult,
  PROMOTIONS_LIST_QUERYResult,
} from "@/sanity.types";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  applyStockIssuesToItems,
  getOrCreateCart,
  getStockIssues,
  mergeCartItems,
  resolveDealerPricing,
  syncCartItemsWithLatestProducts,
  toCartPayload,
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
        priceOptionId: z.string().trim().optional(),
        priceOptionLabel: z.string().trim().optional(),
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
  defaultBundleItems?: Array<{ product?: ProductSnapshot; quantity?: number | null; isFree?: boolean | null }>;
};
type ActivePromotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type PromotionEngineModule = typeof import("@/lib/promotions/promotionEngine");
type EnginePromotion = Parameters<PromotionEngineModule["promotionEngine"]["checkEligibility"]>[0];
type EngineUser = Parameters<PromotionEngineModule["promotionEngine"]["checkEligibility"]>[1];
type EngineContext = Parameters<PromotionEngineModule["promotionEngine"]["checkEligibility"]>[2];

interface ProductSnapshot {
  _id: string;
  name?: string | null;
  slug?: string | null;
  price?: number | null;
  dealerPrice?: number | null;
  priceOptions?: Array<{
    _key?: string | null;
    label?: string | null;
    price?: number | null;
    dealerPrice?: number | null;
    isDefault?: boolean | null;
  }> | null;
  imageUrl?: string | null;
  stock?: number | null;
  variant?: string | null;
  categories?: string[];
}

interface NormalizedItem {
  productId: string;
  quantity: number;
  variantId?: string;
  priceOptionId?: string;
  priceOptionLabel?: string;
  unitPrice?: number;
  productName?: string;
  productSlug?: string;
  imageUrl?: string | null;
  variantLabel?: string | null;
  stock?: number | null;
  variant?: string | null;
}

type DealQuoteItem = {
  productId: string;
  name?: string | null;
  slug?: string | null;
  quantity: number;
  variantId?: string | null;
  variantLabel?: string | null;
  unitPrice?: number | null;
  originalUnitPrice?: number | null;
  lineTotal?: number | null;
  imageUrl?: string | null;
  image?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  stock?: number | null;
};

type DealQuoteResponse = {
  eligible?: boolean;
  reason?: string;
  message?: string;
  deal?: {
    id?: string | null;
    title?: string | null;
    badge?: string | null;
    badgeColor?: string | null;
    endDate?: string | null;
  };
  totals?: {
    discountAmount?: number | null;
    discountPercent?: number | null;
  };
  items?: DealQuoteItem[];
};

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

const findActivePromotionById = (
  promotions: ActivePromotion[],
  promotionId: string
) => {
  const normalized = promotionId.trim();
  return (
    promotions.find((promo) => promo?.campaignId === normalized) ??
    promotions.find((promo) => promo?._id === normalized) ??
    promotions.find(
      (promo) => (promo as { dealId?: string | null }).dealId === normalized
    ) ??
    null
  );
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
      dealerPrice?: number;
      priceOptions?: Array<{
        _key?: string;
        label?: string;
        price?: number;
        dealerPrice?: number;
        isDefault?: boolean;
      }>;
      stock?: number;
      variant?: string;
      images?: Array<{ asset?: { url?: string } }>;
      thumbnailImage?: { asset?: { url?: string } };
      categories?: Array<{ _ref?: string; _type?: string; _id?: string }>;
    }>
  >(
    '*[_type == "product" && _id in $ids]{_id,name,slug,price,dealerPrice,priceOptions[]{_key,label,price,dealerPrice,isDefault},stock,variant,images[]{asset->{url}},thumbnailImage{asset->{url}},categories[]->{_id,name,title}}',
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
        dealerPrice: product.dealerPrice ?? null,
        priceOptions: product.priceOptions ?? null,
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

const collectPromotionProducts = (promotion: PromotionDoc) => {
  const products: ProductSnapshot[] = [];

  const addIfPresent = (product?: ProductSnapshot | Record<string, any> | null | undefined) => {
    if (product?._id) {
      const productWithId = product as ProductSnapshot;
      const slugValue =
        typeof productWithId.slug === "string"
          ? productWithId.slug
          : (productWithId.slug as { current?: string } | undefined)?.current ?? null;
      const categoryIds = Array.isArray(productWithId.categories)
        ? productWithId.categories
            .map(
              (cat) =>
                (cat as any)?._id ||
                (cat as any)?._ref ||
                (cat as any)?.slug ||
                (cat as any)?.title ||
                (typeof cat === "string" ? cat : null)
            )
            .filter((id): id is string => typeof id === "string" && Boolean(id))
        : productWithId.categories;
      products.push({
        ...productWithId,
        slug: slugValue,
        categories: categoryIds,
      });
    }
  };

  (promotion.products ?? []).forEach((product) => {
    addIfPresent(product);
  });

  (promotion.targetAudience?.products ?? []).forEach((product) => {
    addIfPresent(product);
  });

  (promotion.defaultProducts ?? []).forEach((item) => {
    addIfPresent((item as { product?: any }).product);
  });

  (promotion.defaultBundleItems ?? []).forEach((item) => {
    addIfPresent((item as { product?: any }).product);
  });

  return products;
};

const resolvePriceOption = (
  product: ProductSnapshot | undefined,
  item: NormalizedItem
): { id: string; label: string; price: number; dealerPrice?: number | null } | null => {
  const options = product?.priceOptions ?? [];
  if (!Array.isArray(options) || options.length === 0) return null;

  const normalizedId = typeof item.priceOptionId === "string" ? item.priceOptionId.trim() : "";
  const normalizedLabel =
    typeof item.priceOptionLabel === "string" ? item.priceOptionLabel.trim().toLowerCase() : "";

  let match =
    (normalizedId
      ? options.find((option) => (option?._key ?? "") === normalizedId)
      : undefined) ??
    (normalizedLabel
      ? options.find(
          (option) => (option?.label ?? "").trim().toLowerCase() === normalizedLabel
        )
      : undefined) ??
    options.find((option) => option?.isDefault) ??
    options[0];

  if (!match || typeof match.price !== "number") return null;

  const basePrice =
    typeof product?.price === "number" && product.price > 0 ? product.price : null;
  const baseDealer =
    typeof product?.dealerPrice === "number" && product.dealerPrice >= 0
      ? product.dealerPrice
      : null;
  const dealerRatio =
    basePrice && baseDealer !== null ? baseDealer / basePrice : null;
  const derivedDealer =
    typeof match.dealerPrice === "number"
      ? match.dealerPrice
      : dealerRatio !== null
        ? Number((match.price * dealerRatio).toFixed(2))
        : null;

  const resolvedId = match._key || normalizedId || match.label || "option";
  return {
    id: resolvedId,
    label: match.label ?? "Price option",
    price: match.price,
    dealerPrice: derivedDealer,
  };
};

const hydrateItems = async (
  items: NormalizedItem[],
  promotion?: PromotionDoc
): Promise<
  Array<
    NormalizedItem & {
      unitPrice: number;
      priceOptionId?: string;
      priceOptionLabel?: string | null;
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

  const requestedIds = items.map((item) => item.productId).filter(Boolean);
  const fetched = await fetchProductsByIds(requestedIds);
  const lookup = { ...knownMap, ...fetched };

  return items.map((item) => {
    const product = lookup[item.productId];
    const resolvedOption = resolvePriceOption(product, item);
    const unitPrice =
      typeof resolvedOption?.price === "number"
        ? resolvedOption.price
        : typeof product?.price === "number"
          ? product.price
          : toNumber(item.unitPrice, 0);
    const slugValue = product?.slug ?? item.productSlug;
    const imageUrl = product?.imageUrl ?? item.imageUrl;
    const variantLabel = item.variantLabel ?? item.variantId ?? product?.variant ?? null;
    return {
      ...item,
      unitPrice,
      priceOptionId: item.priceOptionId ?? resolvedOption?.id,
      priceOptionLabel: item.priceOptionLabel ?? resolvedOption?.label ?? undefined,
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
    ? (promotion.defaultBundleItems as Array<{
        product?: ProductSnapshot;
        quantity?: number;
        isFree?: boolean | null;
        variantId?: string | null;
      }>)
    : [];
  const productDefaults = Array.isArray(promotion.defaultProducts)
    ? (promotion.defaultProducts as Array<{ product?: ProductSnapshot; quantity?: number }>)
    : [];

  if (promotion.discountType === "bxgy" || promotion.type === "bundle") {
    const buyQty = Math.max(1, Math.floor(toNumber(promotion.buyQuantity, 1)));
    const getQty = Math.max(1, Math.floor(toNumber(promotion.getQuantity, 1)));

    const buyDefaults = bundleDefaults.filter((item) => !item?.isFree);
    const getDefaults = bundleDefaults.filter((item) => Boolean(item?.isFree));

    const fallbackBuyProducts =
      (promotion.targetAudience?.products ?? promotion.products ?? [])
        .map((product) => ({
          productId: product?._id ?? "",
          quantity: buyQty,
          productName: product?.name ?? undefined,
          productSlug: product?.slug ?? undefined,
          unitPrice: toNumber(product?.price),
          variantId:
            typeof product?.variantId === "string" && product.variantId.trim()
              ? product.variantId
              : undefined,
        }))
        .filter((item) => Boolean(item.productId)) as NormalizedItem[];

    const buySource = buyDefaults.length
      ? buyDefaults
          .map((item) => ({
            productId: item.product?._id ?? "",
            quantity: normalizeQuantity(item.quantity),
            productName: item.product?.name ?? undefined,
            productSlug: item.product?.slug ?? undefined,
            unitPrice: toNumber(item.product?.price),
            variantId: item.variantId ?? undefined,
          }))
          .filter((item) => Boolean(item.productId))
      : fallbackBuyProducts;

    const getSource = getDefaults
      .map((item) => ({
        productId: item.product?._id ?? "",
        quantity: normalizeQuantity(item.quantity),
        productName: item.product?.name ?? undefined,
        productSlug: item.product?.slug ?? undefined,
        unitPrice: toNumber(item.product?.price),
        variantId: item.variantId ?? undefined,
      }))
      .filter((item) => Boolean(item.productId)) as NormalizedItem[];

    if (buySource.length && getSource.length) {
      return [...buySource, ...getSource];
    }
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
      .filter((item) => Boolean(item.productId)) as NormalizedItem[];
  }

  return payload.items.map((item) => ({
    productId: item.productId,
    quantity: normalizeQuantity(item.quantity),
    variantId: item.variantId,
    priceOptionId: item.priceOptionId,
    priceOptionLabel: item.priceOptionLabel,
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

  if (buyQty < 1 || getQty < 1) {
    return "Buy X Get Y promotions require buy and get quantities greater than 0.";
  }

  if (!items.length) {
    return "No items were provided for this promotion.";
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
      priceOptionId: item.priceOptionId,
      priceOptionLabel: item.priceOptionLabel ?? undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl,
      product: item.productSnapshot
        ? {
            id: item.productSnapshot._id,
            name: item.productSnapshot.name ?? undefined,
            slug: item.productSnapshot.slug ?? undefined,
            price: item.unitPrice ?? item.productSnapshot.price ?? undefined,
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
  userId: string | null,
  shouldSetCookie: boolean,
  cartId: string,
  useDealerPrice: boolean
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

  let quoteBody: DealQuoteResponse | string | null = null;
  const isJson = (quoteResponse.headers.get("content-type") || "").includes("application/json");
  try {
    quoteBody = isJson
      ? ((await quoteResponse.json()) as DealQuoteResponse)
      : await quoteResponse.text();
  } catch (error) {
    console.error("[cart][deal] Failed to parse deal quote response", error);
    return NextResponse.json(
      { message: "Unable to validate deal pricing" },
      { status: 502, headers: JSON_HEADERS }
    );
  }

  const quoteData =
    quoteBody && typeof quoteBody === "object" ? quoteBody : null;

  if (!quoteResponse.ok || quoteData?.eligible === false) {
    const message = quoteData?.reason || quoteData?.message || "Deal not eligible";
    return NextResponse.json({ message }, { status: quoteResponse.status || 409, headers: JSON_HEADERS });
  }

  if (!quoteData) {
    return NextResponse.json(
      { message: "Unexpected deal response" },
      { status: 502, headers: JSON_HEADERS }
    );
  }

  const quotedItem = quoteData.items?.[0];

  if (!quotedItem) {
    return NextResponse.json(
      { message: "Deal quote did not include an item" },
      { status: 422, headers: JSON_HEADERS }
    );
  }

  const discountAmount =
    toNumber(quoteData.totals?.discountAmount, 0) ||
    Math.max(
      0,
      toNumber(quotedItem.originalUnitPrice ?? quotedItem.unitPrice, 0) * quotedItem.quantity -
        toNumber(quotedItem.lineTotal, 0)
    );
  const percent = toNumber(quoteData.totals?.discountPercent, 0);
  const discountType: DiscountType = percent > 0 ? "percentage" : "fixed_amount";

  const appliedPromotion: AppliedPromotion = {
    type: "deal",
    id: quoteData.deal?.id ?? payload.dealId ?? quotedItem.productId,
    name: quoteData.deal?.title ?? payload.dealId ?? quotedItem.productId,
    badgeLabel: quoteData.deal?.badge ?? undefined,
    badgeColor: quoteData.deal?.badgeColor ?? undefined,
    discountType,
    discountValue: discountType === "percentage" ? percent : discountAmount,
    discountAmount,
    expiresAt: quoteData.deal?.endDate ?? undefined,
  };

  const cartItem: CartItem = {
    id: crypto.randomUUID(),
    productId: quotedItem.productId,
    productSlug: quotedItem.slug ?? quotedItem.productId,
    productName: quotedItem.name ?? quotedItem.productId,
    variantId: quotedItem.variantId ?? firstItem?.variantId,
    variantLabel: quotedItem.variantLabel ?? quotedItem.variantId ?? firstItem?.variantId,
    priceOptionId: firstItem?.priceOptionId,
    priceOptionLabel: firstItem?.priceOptionLabel ?? undefined,
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

  const mergedItems = mergeCartItems(cart.items, [cartItem]);
  const syncedItems = await syncCartItemsWithLatestProducts(mergedItems, {
    useDealerPrice,
  });
  const stockIssues = getStockIssues(syncedItems);
  const finalItems = applyStockIssuesToItems(syncedItems, stockIssues);
  const updatedCart = await updateCartTotals(cart, finalItems, undefined, userId);

  return buildResponse(updatedCart, shouldSetCookie, cartId);
};

const handlePromotionAdd = async (
  payload: AddRequest,
  cart: Cart,
  promotion: PromotionDoc,
  userId: string | null,
  shouldSetCookie: boolean,
  cartId: string,
  useDealerPrice: boolean
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

  const campaignId = promotion.campaignId || promotion._id || payload.promotionId || "promotion";

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
    badgeLabel: promotion.badgeLabel ?? undefined,
    badgeColor: promotion.badgeColor ?? undefined,
    discountType,
    discountValue,
    discountAmount: Math.max(0, discount.discountAmount),
    expiresAt: promotion.endDate ?? undefined,
  };

  const cartItemsWithPromo = cartItems.map((item) => ({
    ...item,
    appliedPromotion,
  }));

  const mergedItems = mergeCartItems(cart.items, cartItemsWithPromo);
  const syncedItems = await syncCartItemsWithLatestProducts(mergedItems, {
    useDealerPrice,
  });
  const stockIssues = getStockIssues(syncedItems);
  const finalItems = applyStockIssuesToItems(syncedItems, stockIssues);
  const updatedCart = await updateCartTotals(cart, finalItems, undefined, userId);

  return buildResponse(updatedCart, shouldSetCookie, cartId);
};

const handleGenericAdd = async (
  payload: AddRequest,
  cart: Cart,
  userId: string | null,
  shouldSetCookie: boolean,
  cartId: string,
  useDealerPrice: boolean
) => {
  const hydratedItems = await hydrateItems(
    payload.items.map((item) => ({
      productId: item.productId,
      quantity: normalizeQuantity(item.quantity),
      variantId: item.variantId,
      priceOptionId: item.priceOptionId,
      priceOptionLabel: item.priceOptionLabel,
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
    priceOptionId: item.priceOptionId,
    priceOptionLabel: item.priceOptionLabel ?? undefined,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    imageUrl: item.imageUrl,
    availableStock: item.stock ?? null,
    product: item.productSnapshot
      ? {
          id: item.productSnapshot._id,
          name: item.productSnapshot.name ?? undefined,
          slug: item.productSnapshot.slug ?? undefined,
          price: item.unitPrice ?? item.productSnapshot.price ?? undefined,
          imageUrl: item.productSnapshot.imageUrl ?? undefined,
          stock: item.productSnapshot.stock ?? undefined,
          variant: item.productSnapshot.variant ?? undefined,
          categories: item.productSnapshot.categories,
        }
      : undefined,
    lineTotal: Math.max(0, item.unitPrice * item.quantity),
  }));

  const mergedItems = mergeCartItems(cart.items, cartItems);
  const syncedItems = await syncCartItemsWithLatestProducts(mergedItems, {
    useDealerPrice,
  });
  const stockIssues = getStockIssues(syncedItems);
  const finalItems = applyStockIssuesToItems(syncedItems, stockIssues);
  const updatedCart = await updateCartTotals(cart, finalItems, undefined, userId);
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
    const user = userId ? await currentUser() : null;
    const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
    const useDealerPrice = await resolveDealerPricing(userId, userEmail);
    const promoCode = payload.promoCode?.trim();
    const promotionId = payload.promotionId ?? promoCode;

    if (payload.promotionId && promoCode && payload.promotionId !== promoCode) {
      return NextResponse.json(
        { message: "Provide either promotionId or promoCode, not both." },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    if (payload.dealId && promotionId) {
      return NextResponse.json(
        { message: "Provide either a dealId or promotionId, not both." },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const cart = await getOrCreateCart(cartId, userId, cookieStore);
    const shouldSetCookie = !existingCartId;

    if (payload.dealId) {
      return handleDealAdd(
        request,
        payload,
        cart,
        userId ?? null,
        shouldSetCookie,
        cartId,
        useDealerPrice
      );
    }

    if (promotionId) {
      const activePromotions = await getActivePromotions({
        includeDeals: true,
        revalidate: false,
      });
      const activePromotion = findActivePromotionById(
        activePromotions as ActivePromotion[],
        promotionId
      );

      if (activePromotion && (activePromotion.type as string) === "deal") {
        const dealId =
          activePromotion.campaignId || activePromotion._id || promotionId;
        return handleDealAdd(
          request,
          { ...payload, dealId },
          cart,
          userId ?? null,
          shouldSetCookie,
          cartId,
          useDealerPrice
        );
      }

      const promotion = (await getPromotionByCampaignId(promotionId, {
        revalidate: false,
      })) as PromotionDoc | null;

      if (!promotion) {
        return NextResponse.json(
          { message: "Promotion not found", reason: "not_found" },
          { status: 404, headers: JSON_HEADERS }
        );
      }

      return handlePromotionAdd(
        { ...payload, promotionId },
        cart,
        promotion,
        userId ?? null,
        shouldSetCookie,
        cartId,
        useDealerPrice
      );
    }

    return handleGenericAdd(
      payload,
      cart,
      userId ?? null,
      shouldSetCookie,
      cartId,
      useDealerPrice
    );
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
