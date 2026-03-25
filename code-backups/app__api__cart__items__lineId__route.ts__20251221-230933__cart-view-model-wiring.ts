import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import type { AppliedPromotion, CartItem } from "@/lib/cart/types";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
} from "@/lib/promotions/analytics";
import { getPromotionByCampaignId } from "@/sanity/queries";
import type { PROMOTION_BY_CAMPAIGN_ID_QUERYResult } from "@/sanity.types";
import {
  CART_COOKIE_MAX_AGE,
  CART_COOKIE_NAME,
  getOrCreateCart,
  recalculateLineItem,
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

type PromotionDoc = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;

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

const deriveAppliedPromotions = (
  items: CartItem[],
  existing: AppliedPromotion[]
): AppliedPromotion[] => {
  const activeKeys = new Set(
    items
      .map((item) => item.appliedPromotion)
      .filter(Boolean)
      .map((promo) => `${promo!.type}:${promo!.id}`)
  );

  return existing.filter((promo) => activeKeys.has(`${promo.type}:${promo.id}`));
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

const ensureStockAvailability = (items: CartItem[]): string | null => {
  for (const item of items) {
    const stock = item.availableStock ?? item.product?.stock;
    if (typeof stock === "number" && stock >= 0 && item.quantity > stock) {
      return `Only ${stock} units of ${item.productName} available`;
    }
  }

  return null;
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

const revalidatePromotions = async (
  items: CartItem[],
  userId: string | null
): Promise<CartItem[]> => {
  const linesWithPromos = items.filter(
    (item) => item.appliedPromotion && item.appliedPromotion.type === "promotion"
  );
  if (!linesWithPromos.length) return items;

  const uniquePromotionIds = Array.from(
    new Set(linesWithPromos.map((item) => item.appliedPromotion!.id).filter(Boolean))
  );

  const promotionDocs = await Promise.all(
    uniquePromotionIds.map(async (id) => {
      try {
        const promotion = (await getPromotionByCampaignId(id, {
          revalidate: false,
        })) as PromotionDoc | null;
        return { id, promotion };
      } catch (error) {
        console.warn("[cart][line] Failed to fetch promotion for revalidation", error);
        return { id, promotion: null as PromotionDoc | null };
      }
    })
  );

  const validationResults = new Map<string, { valid: boolean; reason?: string }>();

  for (const { id, promotion } of promotionDocs) {
    if (!promotion) {
      validationResults.set(id, { valid: false, reason: "Promotion is unavailable" });
      continue;
    }

    try {
      const reason = await validatePromotionLimits(promotion, userId);
      validationResults.set(id, { valid: !reason, reason: reason ?? undefined });
    } catch (error) {
      console.warn("[cart][line] Promotion validation failed", error);
      validationResults.set(id, {
        valid: false,
        reason: "Unable to validate promotion at this time",
      });
    }
  }

  return items.map((item) => {
    const promo = item.appliedPromotion;
    if (!promo || promo.type !== "promotion") return item;

    const validation = validationResults.get(promo.id);
    if (!validation || validation.valid) return item;

    const lineMessages = item.messages ?? [];
    const warning = validation.reason || "Promotion removed due to validation failure";

    return {
      ...item,
      appliedPromotion: undefined,
      lineTotal: Math.max(0, item.unitPrice * item.quantity),
      messages: lineMessages.includes(warning) ? lineMessages : [...lineMessages, warning],
    };
  });
};

const buildResponse = (cart: any, shouldSetCookie: boolean, cartId: string) => {
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

const resolveCart = async (request: NextRequest) => {
  const cookieStore = request.cookies;
  const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cartId = existingCartId ?? crypto.randomUUID();
  const userId = await getUserIdSafe();
  const cart = await getOrCreateCart(cartId, userId);
  const shouldSetCookie = !existingCartId;

  return { cart, cartId, shouldSetCookie, userId };
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { lineId: string } }
) {
  try {
    const { quantity } = await quantitySchema.parseAsync(await request.json());
    const { cart, cartId, shouldSetCookie, userId } = await resolveCart(request);

    const index = cart.items.findIndex((item) => item.id === params.lineId);
    if (index === -1) {
      return NextResponse.json(
        { message: "Item not found", reason: "not_found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const nextItems =
      quantity > 0
        ? cart.items.map((item, idx) =>
            idx === index ? recalculateLineItem(item, quantity) : item
          )
        : cart.items.filter((item) => item.id !== params.lineId);

    const stockError = ensureStockAvailability(nextItems);
    if (stockError) {
      return NextResponse.json(
        { message: stockError, reason: "out_of_stock" },
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const validatedItems = await revalidatePromotions(nextItems, userId);
    const nextPromotions = deriveAppliedPromotions(validatedItems, cart.appliedPromotions);
    const updatedCart = await updateCartTotals(cart, validatedItems, nextPromotions);

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
  { params }: { params: { lineId: string } }
) {
  try {
    const { cart, cartId, shouldSetCookie } = await resolveCart(request);
    const nextItems = cart.items.filter((item) => item.id !== params.lineId);
    const nextPromotions = deriveAppliedPromotions(nextItems, cart.appliedPromotions);
    const updatedCart = await updateCartTotals(cart, nextItems, nextPromotions);

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
