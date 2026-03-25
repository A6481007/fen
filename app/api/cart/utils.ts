import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { adminDb } from "@/lib/firebaseAdmin";
import { client as sanityClient } from "@/sanity/lib/client";
import { backendClient } from "@/sanity/lib/backendClient";
import type {
  AppliedPromotion,
  Cart,
  CartItem,
  CartResponsePayload,
  DiscountType,
} from "@/lib/cart/types";
import { buildCartViewModel } from "@/lib/cart/viewModel";
import { promotionEngine } from "@/lib/promotions/promotionEngine";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
} from "@/lib/promotions/analytics";
import { getPromotionByCampaignId } from "@/sanity/queries";
import type { PROMOTION_BY_CAMPAIGN_ID_QUERYResult } from "@/sanity.types";

export const CART_COOKIE_NAME = "cart_session";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const JWT_SECRET = new TextEncoder().encode(
  process.env.CART_JWT_SECRET || "fallback-dev-secret-change-in-prod"
);

const db = adminDb;

// In-memory cache (per-instance, cleared on restart)
const memoryCache = new Map<string, { cart: Cart; expiresAt: number }>();
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CompactCartLine = {
  i: string;      // id
  p: string;      // productId
  s: string;      // productSlug
  n: string;      // productName
  v?: string;     // variantId
  po?: string;    // priceOptionId
  pl?: string;    // priceOptionLabel
  q: number;      // quantity
  u: number;      // unitPrice
  l: number;      // lineTotal
  img?: string;   // imageUrl
  a?: {           // appliedPromotion (compact)
    t: "p" | "d"; // type: promotion/deal
    i: string;    // id
    n: string;    // name
    bl?: string;  // badgeLabel
    bc?: string;  // badgeColor
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

type ProductSnapshot = {
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
  categories?: Array<{ _ref?: string; _type?: string; _id?: string; name?: string; title?: string }>;
};

type HydratedProduct = {
  _id: string;
  name?: string | null;
  slug?: string | null;
  price?: number | null;
  dealerPrice?: number | null;
  priceOptions?: Array<{
    _key?: string;
    label?: string;
    price?: number;
    dealerPrice?: number;
    isDefault?: boolean;
  }>;
  stock?: number | null;
  variant?: string | null;
  imageUrl?: string | null;
  categories?: string[];
};

type PromotionDoc = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;
type EnginePromotion = Parameters<typeof promotionEngine.checkEligibility>[0];
type EngineUser = Parameters<typeof promotionEngine.checkEligibility>[1];
type EngineContext = Parameters<typeof promotionEngine.checkEligibility>[2];

export type StockIssue = {
  productId: string;
  productName: string;
  available: number;
  requested: number;
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
    po: item.priceOptionId,
    pl: item.priceOptionLabel,
    q: item.quantity,
    u: item.unitPrice,
    l: item.lineTotal,
    img: item.imageUrl ?? undefined,
    a: item.appliedPromotion ? {
      t: item.appliedPromotion.type === "promotion" ? "p" : "d",
      i: item.appliedPromotion.id,
      n: item.appliedPromotion.name,
      bl: item.appliedPromotion.badgeLabel ?? undefined,
      bc: item.appliedPromotion.badgeColor ?? undefined,
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
    priceOptionId: item.po,
    priceOptionLabel: item.pl,
    quantity: item.q,
    unitPrice: item.u,
    lineTotal: item.l,
    imageUrl: item.img ?? undefined,
    appliedPromotion: item.a ? {
      type: item.a.t === "p" ? "promotion" : "deal",
      id: item.a.i,
      name: item.a.n,
      badgeLabel: item.a.bl,
      badgeColor: item.a.bc,
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

export const fetchProductsByIds = async (
  ids: string[]
): Promise<Record<string, HydratedProduct>> => {
  if (!ids.length) return {};

  const products = await sanityClient.fetch<ProductSnapshot[]>(
    '*[_type == "product" && _id in $ids]{_id,name,slug,price,dealerPrice,priceOptions[]{_key,label,price,dealerPrice,isDefault},stock,variant,images[]{asset->{url}},thumbnailImage{asset->{url}},categories[]->{_id,name,title}}',
    { ids }
  );

  return products.reduce<Record<string, HydratedProduct>>((acc, product) => {
    if (!product?._id) return acc;
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
      priceOptions: product.priceOptions ?? undefined,
      stock: product.stock ?? null,
      variant: product.variant ?? null,
      imageUrl: imageCandidate,
      categories:
        product.categories
          ?.map((category) => category?.name || category?.title || category?._id || category?._ref)
          .filter((value): value is string => Boolean(value)) ?? [],
    };
    return acc;
  }, {});
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

const isPromotionActive = (promotion: PromotionDoc) => {
  if (typeof promotion.isActive === "boolean") return promotion.isActive;

  const now = Date.now();
  const start = parseDateMs(promotion.startDate);
  const end = parseDateMs(promotion.endDate);
  const status = promotion.status ?? "draft";
  const withinWindow = (start === 0 || start <= now) && (end === 0 || now <= end);

  return withinWindow && (status === "active" || status === "scheduled");
};

const fetchUserData = async (userId: string | null): Promise<EngineUser> => {
  if (!userId) return null;

  const maybeFetcher = (promotionEngine as unknown as {
    fetchUserData?: (uid: string) => Promise<EngineUser>;
  }).fetchUserData;

  if (typeof maybeFetcher !== "function") return null;

  try {
    return await maybeFetcher.call(promotionEngine, userId);
  } catch (error) {
    console.error("[cart][promotions] Failed to fetch user data", error);
    return null;
  }
};

export const resolveDealerPricing = async (
  userId?: string | null,
  userEmail?: string | null
): Promise<boolean> => {
  if (!userId && !userEmail) return false;

  try {
    const profile = await backendClient.fetch<{
      isBusiness?: boolean;
      businessStatus?: string;
      membershipType?: string;
    } | null>(
      `*[_type in ["userType", "user"] && (email == $email || clerkUserId == $clerkUserId)][0]{
        isBusiness,
        businessStatus,
        membershipType
      }`,
      {
        email: userEmail ?? "",
        clerkUserId: userId ?? "",
      }
    );

    return Boolean(
      profile?.isBusiness ||
        profile?.businessStatus === "active" ||
        profile?.membershipType === "business"
    );
  } catch (error) {
    console.error("[cart] Failed to resolve dealer pricing", error);
    return false;
  }
};

const validatePromotionLimits = async (
  promotion: PromotionDoc,
  userId: string | null
): Promise<string | null> => {
  if (!isPromotionActive(promotion)) {
    return "Promotion is no longer active";
  }

  const campaignId = promotion.campaignId || promotion._id;
  if (!campaignId) {
    return "Promotion is unavailable";
  }

  if (promotion.budgetCap && promotion.budgetCap > 0) {
    const withinBudget = await checkBudgetAvailable(campaignId, promotion.budgetCap);
    if (!withinBudget) {
      return "Promotion budget exhausted";
    }
  }

  if (promotion.usageLimit && promotion.usageLimit > 0) {
    const withinUsage = await checkUsageLimitAvailable(campaignId, promotion.usageLimit);
    if (!withinUsage) {
      return "Promotion usage limit reached";
    }
  }

  if (promotion.perCustomerLimit && promotion.perCustomerLimit > 0) {
    if (!userId) {
      return "Sign in required to keep this promotion";
    }

    const withinCustomerLimit = await checkPerCustomerLimit(
      userId,
      campaignId,
      promotion.perCustomerLimit
    );

    if (!withinCustomerLimit) {
      return "Per-customer limit reached";
    }
  }

  return null;
};

const addLineMessage = (item: CartItem, message: string): CartItem => {
  const messages = item.messages ?? [];
  if (messages.includes(message)) return item;
  return { ...item, messages: [...messages, message] };
};

const removePromotionFromLine = (item: CartItem, message: string): CartItem => {
  const next = {
    ...item,
    appliedPromotion: undefined,
    lineTotal: Math.max(0, item.unitPrice * item.quantity),
  };
  return addLineMessage(next, message);
};

export const buildStockIssueMessage = (issue: StockIssue): string =>
  `Only ${issue.available} units of ${issue.productName} available`;

export const getStockIssues = (items: CartItem[]): StockIssue[] => {
  const totals = new Map<string, number>();
  const available = new Map<string, number>();
  const names = new Map<string, string>();

  items.forEach((item) => {
    const productId = item.productId;
    names.set(productId, item.productName ?? item.productId);
    totals.set(productId, (totals.get(productId) ?? 0) + item.quantity);

    const stock = item.availableStock ?? item.product?.stock;
    if (typeof stock === "number" && Number.isFinite(stock) && stock >= 0) {
      const current = available.get(productId);
      available.set(productId, typeof current === "number" ? Math.min(current, stock) : stock);
    }
  });

  const issues: StockIssue[] = [];
  totals.forEach((requested, productId) => {
    const stock = available.get(productId);
    if (typeof stock === "number" && requested > stock) {
      issues.push({
        productId,
        productName: names.get(productId) ?? productId,
        available: stock,
        requested,
      });
    }
  });

  return issues;
};

export const applyStockIssuesToItems = (
  items: CartItem[],
  issues: StockIssue[]
): CartItem[] => {
  if (!issues.length) return items;
  const issueMap = new Map(issues.map((issue) => [issue.productId, issue]));

  return items.map((item) => {
    const issue = issueMap.get(item.productId);
    if (!issue) return item;
    return addLineMessage(item, buildStockIssueMessage(issue));
  });
};

export const syncCartItemsWithLatestProducts = async (
  items: CartItem[],
  options?: { useDealerPrice?: boolean }
): Promise<CartItem[]> => {
  if (!items.length) return items;

  const ids = Array.from(new Set(items.map((item) => item.productId).filter(Boolean)));
  const products = await fetchProductsByIds(ids);
  const useDealerPrice = options?.useDealerPrice === true;

  return items.map((item) => {
    const product = products[item.productId];
    const productName = product?.name ?? item.productName ?? item.productId;
    const productSlug = product?.slug ?? item.productSlug ?? item.productId;
    const imageUrl = product?.imageUrl ?? item.imageUrl ?? null;
    const availableStock =
      typeof product?.stock === "number" ? product.stock : item.availableStock ?? null;
    const variantLabel = item.variantLabel ?? product?.variant ?? item.variantId ?? undefined;
    const priceOptions = product?.priceOptions ?? [];
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
      typeof product?.price === "number" && product.price > 0 ? product.price : null;
    const baseDealer =
      typeof product?.dealerPrice === "number" && product.dealerPrice >= 0
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

    const resolvedPrice =
      useDealerPrice && typeof optionDealerPrice === "number"
        ? optionDealerPrice
        : useDealerPrice && typeof product?.dealerPrice === "number"
          ? product.dealerPrice
          : typeof optionPrice === "number"
            ? optionPrice
            : typeof product?.price === "number"
              ? product.price
              : toNumber(item.unitPrice, 0);
    const dealAwarePrice =
      item.appliedPromotion?.type === "deal"
        ? toNumber(item.unitPrice, 0)
        : resolvedPrice;
    const unitPrice = Math.max(0, dealAwarePrice);
    const lineTotal = Math.max(0, unitPrice * item.quantity);

    let appliedPromotion = item.appliedPromotion;
    if (appliedPromotion?.type === "deal") {
      const referencePrice =
        typeof product?.price === "number"
          ? product.price
          : typeof item.product?.price === "number"
            ? item.product?.price
            : null;
      const perUnitDiscount =
        typeof referencePrice === "number"
          ? Math.max(0, referencePrice - unitPrice)
          : item.quantity > 0
            ? Math.max(0, toNumber(appliedPromotion.discountAmount, 0) / item.quantity)
            : 0;
      appliedPromotion = {
        ...appliedPromotion,
        discountAmount: Math.max(0, perUnitDiscount * item.quantity),
      };
    }

    const productSnapshot = product
      ? {
          id: product._id,
          name: product.name ?? productName,
          slug: product.slug ?? productSlug,
          price: typeof optionPrice === "number" ? optionPrice : typeof product.price === "number" ? product.price : unitPrice,
          dealerPrice:
            typeof optionDealerPrice === "number"
              ? optionDealerPrice
              : typeof product.dealerPrice === "number"
                ? product.dealerPrice
                : null,
          imageUrl: product.imageUrl ?? imageUrl ?? undefined,
          stock: typeof product.stock === "number" ? product.stock : undefined,
          variant: product.variant ?? variantLabel ?? undefined,
          categories: product.categories ?? item.product?.categories,
        }
      : item.product;

    return {
      ...item,
      productName,
      productSlug,
      imageUrl: imageUrl ?? undefined,
      availableStock,
      variantLabel,
      priceOptionId: item.priceOptionId ?? resolvedOption?._key ?? undefined,
      priceOptionLabel: item.priceOptionLabel ?? resolvedOption?.label ?? undefined,
      unitPrice,
      lineTotal,
      appliedPromotion,
      product: productSnapshot,
    };
  });
};

const allocatePromotionDiscount = (
  items: CartItem[],
  promotion: AppliedPromotion,
  discountAmount: number
): { items: CartItem[]; totalDiscount: number } => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const safeSubtotal = subtotal > 0 ? subtotal : 1;
  let remaining = Math.min(Math.max(0, discountAmount), subtotal);

  const updatedItems = items.map((item, index) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    const proportionalDiscount =
      index === items.length - 1
        ? remaining
        : Math.min(remaining, (itemSubtotal / safeSubtotal) * discountAmount);
    remaining -= proportionalDiscount;

    return {
      ...item,
      lineTotal: Math.max(0, itemSubtotal - proportionalDiscount),
      appliedPromotion: {
        ...promotion,
        discountAmount: Math.max(0, proportionalDiscount),
      },
    };
  });

  const totalDiscount = updatedItems.reduce(
    (sum, item) => sum + Math.max(0, item.unitPrice * item.quantity - item.lineTotal),
    0
  );

  return { items: updatedItems, totalDiscount };
};

const resolvePromotionProductSets = (promotion: PromotionDoc) => {
  const buyProductIds = new Set<string>();
  const getProductIds = new Set<string>();

  (promotion.targetAudience?.products ?? []).forEach((product) =>
    addPromotionProduct(buyProductIds, product)
  );
  (promotion.products ?? []).forEach((product) => addPromotionProduct(buyProductIds, product));

  const bundleItems = Array.isArray(promotion.defaultBundleItems)
    ? promotion.defaultBundleItems
    : [];
  bundleItems.forEach((item) => {
    const product = (item as { product?: { _id?: string | null } | null })?.product;
    if (!product?._id) return;
    if ((item as { isFree?: boolean })?.isFree) {
      getProductIds.add(product._id);
    } else {
      buyProductIds.add(product._id);
    }
  });

  if (getProductIds.size === 0) {
    bundleItems.forEach((item) => {
      const product = (item as { product?: { _id?: string | null } | null })?.product;
      if (product?._id) getProductIds.add(product._id);
    });
  }

  return { buyProductIds, getProductIds };
};

const allocateBxgyDiscount = (
  items: CartItem[],
  promotion: AppliedPromotion,
  buyQuantity: number,
  getQuantity: number,
  buyProductIds: Set<string>,
  getProductIds: Set<string>
): { items: CartItem[]; totalDiscount: number } => {
  const normalizedBuyQty = Math.max(1, Math.floor(toNumber(buyQuantity, 0)));
  const normalizedGetQty = Math.max(1, Math.floor(toNumber(getQuantity, 0)));

  const buyEligibleItems = items.filter((item) =>
    buyProductIds.size ? buyProductIds.has(item.productId) : true
  );
  const getEligibleItems = items.filter((item) => {
    if (item.unitPrice <= 0 || item.quantity <= 0) return false;
    return getProductIds.size ? getProductIds.has(item.productId) : true;
  });

  const totalBuyQty = buyEligibleItems.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const bundleCount = Math.floor(totalBuyQty / normalizedBuyQty);
  let freeUnitsRemaining = bundleCount * normalizedGetQty;

  if (bundleCount <= 0 || freeUnitsRemaining <= 0 || getEligibleItems.length === 0) {
    return { items, totalDiscount: 0 };
  }

  const sortedGetItems = [...getEligibleItems].sort((a, b) => a.unitPrice - b.unitPrice);
  const discountByLineId = new Map<string, number>();
  let totalDiscount = 0;

  for (const item of sortedGetItems) {
    if (freeUnitsRemaining <= 0) break;
    const freeUnitsForLine = Math.min(freeUnitsRemaining, Math.max(0, item.quantity));
    if (freeUnitsForLine <= 0) continue;

    const lineDiscount = Math.max(0, freeUnitsForLine * Math.max(0, item.unitPrice));
    if (lineDiscount <= 0) continue;

    discountByLineId.set(item.id, lineDiscount);
    totalDiscount += lineDiscount;
    freeUnitsRemaining -= freeUnitsForLine;
  }

  if (totalDiscount <= 0) {
    return { items, totalDiscount: 0 };
  }

  const updatedItems = items.map((item) => {
    const itemSubtotal = Math.max(0, item.unitPrice * item.quantity);
    const lineDiscount = Math.max(0, discountByLineId.get(item.id) ?? 0);
    if (lineDiscount <= 0) {
      return item;
    }

    return {
      ...item,
      lineTotal: Math.max(0, itemSubtotal - lineDiscount),
      appliedPromotion: {
        ...promotion,
        discountAmount: lineDiscount,
      },
    };
  });

  return { items: updatedItems, totalDiscount };
};

const deriveAppliedPromotionsFromItems = (items: CartItem[]): AppliedPromotion[] => {
  const grouped = new Map<string, AppliedPromotion>();

  items.forEach((item) => {
    const promo = item.appliedPromotion;
    if (!promo) return;

    const key = `${promo.type}:${promo.id}`;
    const discountAmount = Math.max(0, toNumber(promo.discountAmount, 0));
    const existing = grouped.get(key);
    if (existing) {
      grouped.set(key, { ...existing, discountAmount: existing.discountAmount + discountAmount });
    } else {
      grouped.set(key, { ...promo, discountAmount });
    }
  });

  return Array.from(grouped.values());
};

type PromotionScope = {
  allowedProducts: Set<string>;
  excludedProducts: Set<string>;
  allowedCategories: Set<string>;
};

const addPromotionProduct = (
  set: Set<string>,
  product?: { _id?: string | null } | null
) => {
  if (product?._id) {
    set.add(product._id);
  }
};

const addPromotionCategory = (
  set: Set<string>,
  category?:
    | {
        _id?: string | null;
        title?: string | null;
        slug?: { current?: string | null } | string | null;
      }
    | null
) => {
  if (!category) return;
  if (category._id) set.add(category._id);
  if (category.title) set.add(category.title);
  const slugValue =
    typeof category.slug === "string" ? category.slug : category.slug?.current;
  if (slugValue) set.add(slugValue);
};

const buildPromotionScope = (promotion: PromotionDoc): PromotionScope => {
  const allowedProducts = new Set<string>();
  const excludedProducts = new Set<string>();
  const allowedCategories = new Set<string>();

  (promotion.products ?? []).forEach((product) => addPromotionProduct(allowedProducts, product));
  (promotion.targetAudience?.products ?? []).forEach((product) =>
    addPromotionProduct(allowedProducts, product)
  );
  (promotion.defaultProducts ?? []).forEach((item) =>
    addPromotionProduct(
      allowedProducts,
      (item as { product?: { _id?: string | null } | null })?.product
    )
  );
  (promotion.defaultBundleItems ?? []).forEach((item) =>
    addPromotionProduct(
      allowedProducts,
      (item as { product?: { _id?: string | null } | null })?.product
    )
  );
  (promotion.excludedProducts ?? []).forEach((product) =>
    addPromotionProduct(excludedProducts, product)
  );
  (promotion.targetAudience?.excludedProducts ?? []).forEach((product) =>
    addPromotionProduct(excludedProducts, product)
  );
  (promotion.categories ?? []).forEach((category) => addPromotionCategory(allowedCategories, category));
  (promotion.targetAudience?.categories ?? []).forEach((category) =>
    addPromotionCategory(allowedCategories, category)
  );

  return { allowedProducts, excludedProducts, allowedCategories };
};

const matchesPromotionScope = (item: CartItem, scope: PromotionScope): boolean => {
  if (scope.excludedProducts.has(item.productId)) {
    return false;
  }

  if (scope.allowedProducts.size > 0 && !scope.allowedProducts.has(item.productId)) {
    return false;
  }

  if (scope.allowedCategories.size > 0) {
    const categories =
      item.product?.categories
        ?.map((category) => (typeof category === "string" ? category.trim() : ""))
        .filter(Boolean) ?? [];
    if (!categories.some((category) => scope.allowedCategories.has(category))) {
      return false;
    }
  }

  return true;
};

const resetPromotionAdjustments = (items: CartItem[]): CartItem[] =>
  items.map((item) => {
    if (item.appliedPromotion?.type !== "promotion") return item;
    return {
      ...item,
      appliedPromotion: undefined,
      lineTotal: Math.max(0, item.unitPrice * item.quantity),
    };
  });

export const recalculatePromotionsForItems = async (
  items: CartItem[],
  userId: string | null,
  activePromotions?: AppliedPromotion[]
): Promise<{ items: CartItem[]; appliedPromotions: AppliedPromotion[] }> => {
  if (!items.length) return { items, appliedPromotions: [] };

  const promotionGroups = new Map<string, CartItem[]>();
  const promotionIds: string[] = [];
  const seenPromotions = new Set<string>();
  const addPromotionId = (promotionId?: string | null) => {
    if (!promotionId || seenPromotions.has(promotionId)) return;
    seenPromotions.add(promotionId);
    promotionIds.push(promotionId);
  };

  (activePromotions ?? []).forEach((promotion) => {
    if (promotion?.type !== "promotion") return;
    addPromotionId(promotion.id);
  });

  items.forEach((item) => {
    const promo = item.appliedPromotion;
    if (promo?.type === "promotion" && promo.id) {
      addPromotionId(promo.id);
      const existing = promotionGroups.get(promo.id) ?? [];
      promotionGroups.set(promo.id, [...existing, item]);
    }
  });

  if (!promotionIds.length) {
    return { items, appliedPromotions: deriveAppliedPromotionsFromItems(items) };
  }

  const baseItems = resetPromotionAdjustments(items);

  const promotionDocs = await Promise.all(
    promotionIds.map(async (id) => {
      try {
        const promotion = (await getPromotionByCampaignId(id, {
          revalidate: false,
        })) as PromotionDoc | null;
        return { id, promotion };
      } catch (error) {
        console.warn("[cart][promotions] Failed to fetch promotion for revalidation", error);
        return { id, promotion: null as PromotionDoc | null };
      }
    })
  );
  const promotionLookup = new Map(promotionDocs.map(({ id, promotion }) => [id, promotion]));

  const user = await fetchUserData(userId);
  const updatedItemsById = new Map<string, CartItem>(
    baseItems.map((item) => [item.id, item])
  );

  const removePromotionFromGroup = (promotionId: string, message: string) => {
    const groupItems = promotionGroups.get(promotionId) ?? [];
    groupItems.forEach((item) => {
      const current = updatedItemsById.get(item.id);
      if (!current) return;
      if (current.appliedPromotion?.type) return;
      updatedItemsById.set(item.id, removePromotionFromLine(current, message));
    });
  };

  for (const promotionId of promotionIds) {
    const promotion = promotionLookup.get(promotionId);
    if (!promotion) {
      removePromotionFromGroup(promotionId, "Promotion is unavailable");
      continue;
    }

    const scope = buildPromotionScope(promotion);
    const eligibleItems = Array.from(updatedItemsById.values()).filter((item) => {
      if (item.appliedPromotion?.type === "deal") return false;
      if (item.appliedPromotion?.type === "promotion" && item.appliedPromotion.id !== promotionId) {
        return false;
      }
      return matchesPromotionScope(item, scope);
    });

    if (!eligibleItems.length) {
      removePromotionFromGroup(promotionId, "Promotion not eligible");
      continue;
    }

    const cartItemsForEngine: EngineContext["cartItems"] = eligibleItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      categoryId:
        promotion.targetAudience?.categories?.[0]?._id ??
        promotion.categories?.[0]?._id ??
        item.product?.categories?.[0],
    }));
    const cartValue = cartItemsForEngine.reduce(
      (sum, entry) => sum + toNumber(entry.unitPrice) * toNumber(entry.quantity, 0),
      0
    );

    const eligibilityContext: EngineContext = {
      page: "cart",
      productId: eligibleItems[0]?.productId,
      categoryId:
        promotion.targetAudience?.categories?.[0]?._id ??
        promotion.categories?.[0]?._id ??
        eligibleItems[0]?.product?.categories?.[0],
      cartValue,
      cartItems: cartItemsForEngine,
    };

    const eligibility = promotionEngine.checkEligibility(
      promotion as unknown as EnginePromotion,
      user,
      eligibilityContext
    );

    if (!eligibility.eligible) {
      const reason = eligibility.reason ?? "Promotion not eligible";
      removePromotionFromGroup(promotionId, reason);
      continue;
    }

    const limitReason = await validatePromotionLimits(promotion, userId);
    if (limitReason) {
      removePromotionFromGroup(promotionId, limitReason);
      continue;
    }

    const engineWithContext = promotionEngine as unknown as {
      lastCartItems?: EngineContext["cartItems"];
      lastSessionData?: EngineContext["sessionData"];
      calculateDiscount: typeof promotionEngine.calculateDiscount;
    };

    engineWithContext.lastCartItems = cartItemsForEngine;
    const discount = engineWithContext.calculateDiscount(
      promotion as unknown as EnginePromotion,
      cartValue,
      user?.ltv
    );
    engineWithContext.lastCartItems = undefined;
    engineWithContext.lastSessionData = undefined;

    const discountAmount = Math.max(0, toNumber(discount.discountAmount, 0));
    const discountType: DiscountType =
      promotion.discountType === "percentage" ? "percentage" : "fixed_amount";
    const discountValue =
      discountType === "percentage"
        ? Math.max(0, promotion.discountValue ?? 0)
        : discountAmount;

    const basePromotion: AppliedPromotion = {
      type: "promotion",
      id: promotionId,
      name: promotion.name ?? promotionId,
      badgeLabel: promotion.badgeLabel ?? undefined,
      badgeColor: promotion.badgeColor ?? undefined,
      discountType,
      discountValue,
      discountAmount,
      expiresAt: promotion.endDate ?? undefined,
    };

    const { items: discountedItems, totalDiscount } =
      promotion.discountType === "bxgy"
        ? (() => {
            const { buyProductIds, getProductIds } = resolvePromotionProductSets(promotion);
            return allocateBxgyDiscount(
              eligibleItems,
              basePromotion,
              Math.max(1, toNumber(promotion.buyQuantity, 1)),
              Math.max(1, toNumber(promotion.getQuantity, 1)),
              buyProductIds,
              getProductIds
            );
          })()
        : allocatePromotionDiscount(eligibleItems, basePromotion, discountAmount);

    if (totalDiscount <= 0) {
      removePromotionFromGroup(promotionId, "Promotion not eligible");
      continue;
    }

    discountedItems.forEach((item) => updatedItemsById.set(item.id, item));
  }

  const finalItems = baseItems.map((item) => updatedItemsById.get(item.id) ?? item);
  return { items: finalItems, appliedPromotions: deriveAppliedPromotionsFromItems(finalItems) };
};

const hydrateCartItems = async (items: CartItem[]): Promise<CartItem[]> => {
  if (!items.length) return items;

  const needsHydration = items.some(
    (item) => !item.imageUrl || item.availableStock == null
  );
  if (!needsHydration) return items;

  const ids = Array.from(
    new Set(items.map((item) => item.productId).filter(Boolean))
  );
  const products = await fetchProductsByIds(ids);

  return items.map((item) => {
    const product = products[item.productId];
    if (!product) return item;

    const imageUrl = item.imageUrl ?? product.imageUrl ?? null;
    const availableStock =
      item.availableStock ??
      (typeof product.stock === "number" ? product.stock : null);

    return {
      ...item,
      imageUrl: imageUrl ?? undefined,
      availableStock,
      product:
        item.product ??
        (product
          ? {
              id: product._id,
              name: product.name ?? item.productName ?? undefined,
              slug: product.slug ?? item.productSlug ?? undefined,
              price: product.price ?? item.unitPrice ?? undefined,
              dealerPrice: product.dealerPrice ?? undefined,
              imageUrl: product.imageUrl ?? undefined,
              stock: typeof product.stock === "number" ? product.stock : undefined,
              variant: product.variant ?? undefined,
              categories: product.categories ?? undefined,
            }
          : undefined),
    };
  });
};

export const hydrateCartForResponse = async (cart: Cart): Promise<Cart> => {
  if (!cart.items.length) return cart;
  const hydratedItems = await hydrateCartItems(cart.items);
  return hydratedItems === cart.items ? cart : { ...cart, items: hydratedItems };
};

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
const firestoreCartRef = (userId: string) => db?.collection("carts").doc(userId) ?? null;

const getFirestoreCart = async (userId: string): Promise<Cart | null> => {
  if (!db) return null;
  const ref = firestoreCartRef(userId);
  if (!ref) return null;
  const doc = await ref.get();
  return doc.exists ? (doc.data() as Cart) : null;
};

const setFirestoreCart = async (userId: string, cart: Cart): Promise<void> => {
  if (!db) return;
  const ref = firestoreCartRef(userId);
  if (!ref) return;
  await ref.set({
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

type CookieReader = { get?: (name: string) => { value?: string } | undefined };

const readCartCookie = async (cookieStore?: CookieReader): Promise<string | undefined> => {
  const store = cookieStore ?? (await cookies());
  const getter = typeof store?.get === "function" ? store.get.bind(store) : null;
  return getter ? getter(CART_COOKIE_NAME)?.value : undefined;
};

export const getOrCreateCart = async (
  cartId: string,
  userId?: string | null,
  cookieStore?: CookieReader
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
  const cartCookie = await readCartCookie(cookieStore);
  if (cartCookie) {
    const cart = await verifyCart(cartCookie);
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
  const cookieStore = await cookies();
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
  appliedPromotions?: AppliedPromotion[],
  userId?: string | null
): Promise<Cart> => {
  const { items: recalculatedItems, appliedPromotions: resolvedPromotions } =
    await recalculatePromotionsForItems(
      items,
      userId ?? cart.userId ?? null,
      appliedPromotions ?? cart.appliedPromotions
    );
  const totals = computeTotals(recalculatedItems);
  const nextCart: Cart = {
    ...cart,
    items: recalculatedItems,
    appliedPromotions: resolvedPromotions,
    ...totals,
    updatedAt: new Date().toISOString(),
  };
  return persistCart(nextCart);
};

const mergeKey = (item: CartItem) =>
  [
    item.productId,
    item.variantId ?? "base",
    item.priceOptionId ?? item.priceOptionLabel ?? "default",
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

export const toCartPayload = (cart: Cart): CartResponsePayload => ({
  cart,
  view: buildCartViewModel(cart),
});
