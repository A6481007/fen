import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { promotionEngine } from "@/lib/promotions/promotionEngine";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
} from "@/lib/promotions/analytics";
import { getPromotionByCampaignId, getPromotionBySlug } from "@/sanity/queries";
import type {
  PROMOTION_BY_CAMPAIGN_ID_QUERYResult,
  PROMOTION_BY_SLUG_QUERYResult,
} from "@/sanity.types";
import type { AppliedPromotion, Cart, CartItem } from "@/lib/cart/types";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  applyStockIssuesToItems,
  buildStockIssueMessage,
  getOrCreateCart,
  getStockIssues,
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

const applyPromoSchema = z.object({
  code: z.string().trim().min(1, "Promo code is required"),
});

const removePromoSchema = z.object({
  code: z.string().trim().optional(),
});

type PromotionDoc =
  | NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>
  | NonNullable<PROMOTION_BY_SLUG_QUERYResult>;
type EnginePromotion = Parameters<(typeof promotionEngine)["checkEligibility"]>[0];
type EngineUser = Parameters<(typeof promotionEngine)["checkEligibility"]>[1];
type EngineContext = Parameters<(typeof promotionEngine)["checkEligibility"]>[2];

const normalizeCode = (code: string) => code.trim().toLowerCase();

const parseDateMs = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const isPromotionActive = (promotion: PromotionDoc): boolean => {
  if (typeof promotion.isActive === "boolean") {
    return promotion.isActive;
  }

  const now = Date.now();
  const start = parseDateMs(promotion.startDate);
  const end = parseDateMs(promotion.endDate);
  const withinWindow = (start === 0 || start <= now) && (end === 0 || now <= end);
  const status = promotion.status ?? "draft";

  return withinWindow && (status === "active" || status === "scheduled");
};

const getUserIdSafe = async (): Promise<string | null> => {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cart][promo] Clerk auth unavailable, continuing anonymously", error);
      return null;
    }
    throw error;
  }
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
    console.error("[cart][promo] Failed to fetch user data", error);
    return null;
  }
};

const buildResponse = (cart: Cart, shouldSetCookie: boolean, cartId: string) => {
  const response = NextResponse.json(toCartPayload(cart), {
    status: 200,
    headers: JSON_HEADERS,
  });

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

  return {
    cart,
    cartId,
    shouldSetCookie: !existingCartId,
    userId,
    userEmail,
  };
};

const findPromotionByCode = async (code: string): Promise<PromotionDoc | null> => {
  const byCampaign = (await getPromotionByCampaignId(code, {
    revalidate: false,
  })) as PromotionDoc | null;
  if (byCampaign) return byCampaign;

  const bySlug = (await getPromotionBySlug(code, {
    revalidate: false,
  })) as PromotionDoc | null;

  return bySlug ?? null;
};

const buildEligibilityContext = (
  items: CartItem[],
  promotion: PromotionDoc
): { cartItems: EngineContext["cartItems"]; cartValue: number } => {
  const cartItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    categoryId:
      promotion.targetAudience?.categories?.[0]?._id ??
      promotion.categories?.[0]?._id ??
      item.product?.categories?.[0],
  }));
  const cartValue = cartItems.reduce(
    (sum, item) => sum + Math.max(0, item.unitPrice) * Math.max(0, item.quantity),
    0
  );

  return { cartItems, cartValue };
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

  (promotion.products ?? []).forEach((product) =>
    addPromotionProduct(allowedProducts, product)
  );
  (promotion.targetAudience?.products ?? []).forEach((product) =>
    addPromotionProduct(allowedProducts, product)
  );
  (promotion.excludedProducts ?? []).forEach((product) =>
    addPromotionProduct(excludedProducts, product)
  );
  (promotion.targetAudience?.excludedProducts ?? []).forEach((product) =>
    addPromotionProduct(excludedProducts, product)
  );
  (promotion.categories ?? []).forEach((category) =>
    addPromotionCategory(allowedCategories, category)
  );
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

export async function POST(request: NextRequest) {
  try {
    const payload = applyPromoSchema.parse(await request.json());
    const code = normalizeCode(payload.code);
    const { cart, cartId, shouldSetCookie, userId, userEmail } =
      await resolveCart(request);

    if (!cart.items.length) {
      return NextResponse.json(
        { message: "Add items to your cart before applying a promo code.", reason: "empty_cart" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const promotion = await findPromotionByCode(code);
    if (!promotion) {
      return NextResponse.json(
        { message: "Promo code not found", reason: "not_found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    if (!isPromotionActive(promotion)) {
      return NextResponse.json(
        { message: "Promotion is not active", reason: "inactive" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const campaignId = promotion.campaignId || promotion._id || code;
    if (!campaignId) {
      return NextResponse.json(
        { message: "Promotion is unavailable", reason: "missing_id" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const useDealerPrice = await resolveDealerPricing(userId, userEmail);
    const syncedItems = await syncCartItemsWithLatestProducts(cart.items, {
      useDealerPrice,
    });
    const stockIssues = getStockIssues(syncedItems);
    if (stockIssues.length) {
      return NextResponse.json(
        { message: buildStockIssueMessage(stockIssues[0]), reason: "out_of_stock" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const scope = buildPromotionScope(promotion);
    const eligibleItems = syncedItems.filter((item) => {
      const appliedPromotion = item.appliedPromotion;
      if (appliedPromotion?.type === "deal") return false;
      if (
        appliedPromotion?.type === "promotion" &&
        appliedPromotion.id !== campaignId
      ) {
        return false;
      }
      return matchesPromotionScope(item, scope);
    });

    if (!eligibleItems.length) {
      return NextResponse.json(
        { message: "Promotion not eligible for current cart items", reason: "not_eligible" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const { cartItems, cartValue } = buildEligibilityContext(
      eligibleItems,
      promotion
    );
    const user = await fetchUserData(userId ?? null);
    const eligibilityContext: EngineContext = {
      page: "cart",
      productId: eligibleItems[0]?.productId,
      categoryId:
        promotion.targetAudience?.categories?.[0]?._id ??
        promotion.categories?.[0]?._id ??
        eligibleItems[0]?.product?.categories?.[0],
      cartValue,
      cartItems,
    };

    const eligibility = promotionEngine.checkEligibility(
      promotion as unknown as EnginePromotion,
      user,
      eligibilityContext
    );

    if (!eligibility.eligible) {
      return NextResponse.json(
        { message: eligibility.reason ?? "Promotion not eligible", reason: "not_eligible" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

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

      const withinCustomerLimit = await checkPerCustomerLimit(
        userId,
        campaignId,
        promotion.perCustomerLimit
      );

      if (!withinCustomerLimit) {
        return NextResponse.json(
          { message: "Per-customer limit reached", reason: "per_customer_limit" },
          { status: 409, headers: JSON_HEADERS }
        );
      }
    }

    const existingPromotions = cart.appliedPromotions ?? [];
    const alreadyApplied = existingPromotions.some(
      (entry) => entry.type === "promotion" && entry.id === campaignId
    );

    const basePromotion: AppliedPromotion = {
      type: "promotion",
      id: campaignId,
      name: promotion.name ?? campaignId,
      badgeLabel: promotion.badgeLabel ?? undefined,
      badgeColor: promotion.badgeColor ?? undefined,
      discountType:
        promotion.discountType === "percentage" ? "percentage" : "fixed_amount",
      discountValue: Math.max(0, promotion.discountValue ?? 0),
      discountAmount: 0,
      expiresAt: promotion.endDate ?? undefined,
    };

    const appliedPromotions = alreadyApplied
      ? existingPromotions
      : [...existingPromotions, basePromotion];

    const finalItems = applyStockIssuesToItems(syncedItems, stockIssues);
    const updatedCart = await updateCartTotals(
      cart,
      finalItems,
      appliedPromotions,
      userId ?? null
    );

    return buildResponse(updatedCart, shouldSetCookie, cartId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload", errors: error.flatten().fieldErrors },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[cart][promo][post] Unexpected error", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let raw: unknown = {};
    try {
      raw = await request.json();
    } catch {
      raw = {};
    }
    const payload = removePromoSchema.parse(raw);
    const code = payload.code ? normalizeCode(payload.code) : null;
    const { cart, cartId, shouldSetCookie, userId, userEmail } =
      await resolveCart(request);

    if (!cart.items.length) {
      return NextResponse.json(
        { message: "Cart is empty", reason: "empty_cart" },
        { status: 200, headers: JSON_HEADERS }
      );
    }

    let promotionId = code;
    if (code) {
      const promotion = await findPromotionByCode(code);
      if (!promotion) {
        return NextResponse.json(
          { message: "Promo code not found", reason: "not_found" },
          { status: 404, headers: JSON_HEADERS }
        );
      }
      promotionId = promotion.campaignId || promotion._id || code;
    }

    const useDealerPrice = await resolveDealerPricing(userId, userEmail);
    const syncedItems = await syncCartItemsWithLatestProducts(cart.items, {
      useDealerPrice,
    });
    const stockIssues = getStockIssues(syncedItems);
    if (stockIssues.length) {
      return NextResponse.json(
        { message: buildStockIssueMessage(stockIssues[0]), reason: "out_of_stock" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const appliedPromotions = (cart.appliedPromotions ?? []).filter((promotion) => {
      if (promotion.type !== "promotion") return true;
      if (!promotionId) return false;
      return promotion.id !== promotionId;
    });

    const finalItems = applyStockIssuesToItems(syncedItems, stockIssues);
    const updatedCart = await updateCartTotals(
      cart,
      finalItems,
      appliedPromotions,
      userId ?? null
    );

    return buildResponse(updatedCart, shouldSetCookie, cartId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload", errors: error.flatten().fieldErrors },
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[cart][promo][delete] Unexpected error", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
