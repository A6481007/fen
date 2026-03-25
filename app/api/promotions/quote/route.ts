import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { promotionEngine } from "@/lib/promotions/promotionEngine";
import {
  checkBudgetAvailable,
  checkPerCustomerLimit,
  checkUsageLimitAvailable,
} from "@/lib/promotions/analytics";
import { getActivePromotions } from "@/sanity/queries/promotions";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const quoteRequestSchema = z.object({
  promotionId: z.string().trim().min(1, "promotionId is required"),
  productId: z.string().trim().optional(),
  quantity: z.number().int().positive().optional(),
  variantId: z.string().trim().optional(),
});

type QuoteRequestBody = z.infer<typeof quoteRequestSchema>;
type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type EnginePromotion = Parameters<(typeof promotionEngine)["checkEligibility"]>[0];
type EngineUser = Parameters<(typeof promotionEngine)["checkEligibility"]>[1];
type EngineContext = Parameters<(typeof promotionEngine)["checkEligibility"]>[2];

interface QuoteItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantId?: string;
  name?: string | null;
  slug?: string | null;
}

interface QuoteTotals {
  subtotal: number;
  discount: number;
  total: number;
  savingsDisplay: string;
}

interface QuotePromotionInfo {
  id: string;
  name?: string | null;
  discountType?: Promotion["discountType"];
  discountValue?: Promotion["discountValue"];
}

interface QuoteResponseBody {
  eligible: boolean;
  reason?: string;
  matchedCriteria?: string[];
  promotion?: QuotePromotionInfo;
  items?: QuoteItem[];
  totals?: QuoteTotals;
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveDealRemainingQty = (promotion: Promotion): number | null => {
  const candidate = (promotion as { remainingQty?: number | null }).remainingQty;
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return Math.max(0, Math.floor(candidate));
  }

  const quantityLimit = (promotion as { quantityLimit?: number | null }).quantityLimit;
  if (typeof quantityLimit !== "number" || !Number.isFinite(quantityLimit)) {
    return null;
  }

  const soldCount = (promotion as { soldCount?: number | null }).soldCount;
  const sold = typeof soldCount === "number" && Number.isFinite(soldCount) ? soldCount : 0;
  return Math.max(0, Math.floor(quantityLimit - sold));
};

const findPromotionProduct = (promotion: Promotion, productId?: string | null) => {
  const defaults =
    promotion.defaultProducts
      ?.map((entry) => entry?.product)
      .filter(Boolean) ?? [];
  const candidates = [
    ...(promotion.products ?? []),
    ...(promotion.targetAudience?.products ?? []),
    ...(defaults as NonNullable<Promotion["products"]>[number][]),
  ].filter((product): product is NonNullable<Promotion["products"]>[number] =>
    Boolean(product?._id)
  );

  if (productId) {
    const match = candidates.find((product) => product._id === productId);
    if (match) {
      return match;
    }
  }

  return candidates[0] ?? null;
};

const findPromotionById = (promotions: Promotion[], promotionId: string) => {
  const normalized = promotionId.trim();
  return (
    promotions.find((promo) => promo?.campaignId === normalized) ??
    promotions.find((promo) => promo?._id === normalized) ??
    promotions.find(
      (promo) => (promo as { dealId?: string | null }).dealId === normalized
    )
  );
};

const buildCartFromPayload = (promotion: Promotion, payload: QuoteRequestBody) => {
  const quantity = Math.max(1, Math.floor(payload.quantity ?? 1));
  const product = findPromotionProduct(promotion, payload.productId);
  const categoryId =
    promotion.targetAudience?.categories?.[0]?._id ??
    promotion.categories?.[0]?._id ??
    undefined;

  const productId = product?._id ?? payload.productId;
  const unitPrice = toNumber(product?.price, 0);

  const quoteItems: QuoteItem[] =
    productId !== undefined
      ? [
          {
            productId,
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity,
            variantId: payload.variantId,
            name: product?.name ?? null,
            slug: product?.slug ?? null,
          },
        ]
      : [];

  const cartItems: EngineContext["cartItems"] =
    productId !== undefined
      ? [
          {
            productId,
            quantity,
            unitPrice,
            categoryId,
          },
        ]
      : [];

  const cartValue = quoteItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return { quoteItems, cartItems, cartValue };
};

const fetchUserData = async (userId?: string | null): Promise<EngineUser> => {
  if (!userId) {
    return null;
  }

  const maybeFetcher = (promotionEngine as unknown as {
    fetchUserData?: (uid: string) => Promise<EngineUser>;
  }).fetchUserData;

  if (typeof maybeFetcher !== "function") {
    return null;
  }

  try {
    return await maybeFetcher.call(promotionEngine, userId);
  } catch (error) {
    console.error("[promotions][quote] Failed to fetch user data", error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const payload = await quoteRequestSchema.parseAsync(raw);
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult?.userId ?? null;
    } catch (error) {
      console.warn("[promotions][quote] auth unavailable", error);
      userId = null;
    }

    const promotions = await getActivePromotions({
      includeDeals: true,
      revalidate: false,
    });
    const promotion = findPromotionById(promotions as Promotion[], payload.promotionId);

    if (!promotion) {
      return NextResponse.json(
        { eligible: false, reason: "Promotion not found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const { quoteItems, cartItems, cartValue } = buildCartFromPayload(
      promotion,
      payload
    );
    const requestedQty = quoteItems[0]?.quantity ?? 0;

    const eligibilityContext: EngineContext = {
      page: "product",
      productId: payload.productId ?? quoteItems[0]?.productId,
      categoryId:
        promotion.targetAudience?.categories?.[0]?._id ??
        promotion.categories?.[0]?._id,
      cartValue,
      cartItems,
    };

    const user = await fetchUserData(userId);

    const eligibility = promotionEngine.checkEligibility(
      promotion as unknown as EnginePromotion,
      user,
      eligibilityContext
    );

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          eligible: false,
          reason: eligibility.reason,
          matchedCriteria: eligibility.matchedCriteria,
        },
        { status: 200, headers: JSON_HEADERS }
      );
    }

    const campaignId = promotion.campaignId || promotion._id;
    const isDeal = (promotion.type as string) === "deal";

    if (isDeal) {
      const remainingQty = resolveDealRemainingQty(promotion);
      if (remainingQty !== null && requestedQty > remainingQty) {
        return NextResponse.json(
          { eligible: false, reason: "Requested quantity exceeds remaining deal inventory" },
          { status: 200, headers: JSON_HEADERS }
        );
      }
    }

    if (!isDeal) {
      if (promotion.budgetCap && promotion.budgetCap > 0) {
        const withinBudget = await checkBudgetAvailable(campaignId, promotion.budgetCap);
        if (!withinBudget) {
          return NextResponse.json(
            { eligible: false, reason: "Promotion budget exhausted" },
            { status: 200, headers: JSON_HEADERS }
          );
        }
      }

      if (promotion.usageLimit && promotion.usageLimit > 0) {
        const withinUsage = await checkUsageLimitAvailable(campaignId, promotion.usageLimit);
        if (!withinUsage) {
          return NextResponse.json(
            { eligible: false, reason: "Promotion usage limit reached" },
            { status: 200, headers: JSON_HEADERS }
          );
        }
      }

      if (promotion.perCustomerLimit && promotion.perCustomerLimit > 0) {
        if (!userId) {
          return NextResponse.json(
            { eligible: false, reason: "Sign in required for this promotion" },
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
            { eligible: false, reason: "Per-customer limit reached" },
            { status: 200, headers: JSON_HEADERS }
          );
        }
      }
    }

    const engineWithContext = promotionEngine as unknown as {
      lastCartItems?: EngineContext["cartItems"];
      lastSessionData?: EngineContext["sessionData"];
      calculateDiscount: typeof promotionEngine.calculateDiscount;
    };

    engineWithContext.lastCartItems = cartItems;

    const discount = engineWithContext.calculateDiscount(
      promotion as unknown as EnginePromotion,
      cartValue,
      user?.ltv
    );

    engineWithContext.lastCartItems = undefined;
    engineWithContext.lastSessionData = undefined;

    const totals: QuoteTotals = {
      subtotal: discount.originalPrice ?? cartValue,
      discount: discount.discountAmount,
      total: discount.discountedPrice,
      savingsDisplay: discount.savingsDisplay,
    };

    const responseBody: QuoteResponseBody = {
      eligible: true,
      matchedCriteria: eligibility.matchedCriteria,
      promotion: {
        id: campaignId,
        name: promotion.name ?? campaignId,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
      },
      items: quoteItems,
      totals,
    };

    return NextResponse.json(responseBody, { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { eligible: false, reason: "Invalid request payload", issues: error.issues },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    console.error("[promotions][quote] Unexpected error", error);
    return NextResponse.json(
      { eligible: false, reason: "Server error" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
