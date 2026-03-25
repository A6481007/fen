import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { promotionEngine } from "@/lib/promotions/promotionEngine";
import { getActivePromotions } from "@/sanity/queries/promotions";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const quoteRequestSchema = z.object({
  dealId: z.string().trim().min(1, "dealId is required"),
  quantity: z.number().int().positive().optional(),
  variantId: z.string().trim().optional(),
});

type QuoteRequest = z.infer<typeof quoteRequestSchema>;
type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type EnginePromotion = Parameters<(typeof promotionEngine)["checkEligibility"]>[0];
type EngineUser = Parameters<(typeof promotionEngine)["checkEligibility"]>[1];
type EngineContext = Parameters<(typeof promotionEngine)["checkEligibility"]>[2];

type DealProduct = NonNullable<Promotion["products"]>[number];

interface QuoteItem {
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
  thumbnailUrl?: string | null;
  stock?: number | null;
}

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveSlug = (value?: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof (value as { current?: string }).current === "string") {
    return (value as { current?: string }).current || null;
  }
  return null;
};

const ensureQuantity = (value?: number): number => {
  const normalized = Math.floor(value ?? 1);
  return normalized > 0 ? normalized : 1;
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

const findDealPromotion = (promotions: Promotion[], dealId: string): Promotion | null => {
  const normalized = dealId.trim();
  return (
    promotions.find(
      (promo) =>
        (promo?.type as string) === "deal" &&
        (promo?.campaignId === normalized || promo?._id === normalized)
    ) ??
    promotions.find(
      (promo) =>
        (promo?.type as string) === "deal" &&
        (promo as { dealId?: string | null }).dealId === normalized
    ) ??
    null
  );
};

const findPromotionProduct = (promotion: Promotion, productId?: string | null) => {
  const defaults =
    promotion.defaultProducts
      ?.map((entry) => entry?.product)
      .filter(Boolean) ?? [];
  const candidates = [
    ...(promotion.products ?? []),
    ...(promotion.targetAudience?.products ?? []),
    ...(defaults as DealProduct[]),
  ].filter((product): product is DealProduct => Boolean(product?._id));

  if (productId) {
    const match = candidates.find((product) => product._id === productId);
    if (match) {
      return match;
    }
  }

  return candidates[0] ?? null;
};

const buildCartContext = (
  promotion: Promotion,
  payload: QuoteRequest
): {
  product: DealProduct | null;
  cartItems: EngineContext["cartItems"];
  cartValue: number;
  quantity: number;
} => {
  const quantity = ensureQuantity(payload.quantity);
  const product = findPromotionProduct(promotion);
  const unitPrice = toSafeNumber(product?.price, 0);
  const cartItems: EngineContext["cartItems"] = product
    ? [
        {
          productId: product._id,
          quantity,
          unitPrice,
          categoryId:
            promotion.targetAudience?.categories?.[0]?._id ??
            promotion.categories?.[0]?._id ??
            product.categories?.[0]?._id,
        },
      ]
    : [];

  return {
    product,
    cartItems,
    cartValue: unitPrice * quantity,
    quantity,
  };
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const payload = await quoteRequestSchema.parseAsync(raw);

    const promotions = await getActivePromotions({
      includeDeals: true,
      revalidate: false,
    });
    const promotion = findDealPromotion(promotions as Promotion[], payload.dealId);

    if (!promotion) {
      return NextResponse.json(
        { eligible: false, reason: "Deal not found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const { product, cartItems, cartValue, quantity } = buildCartContext(
      promotion,
      payload
    );

    if (!product?._id) {
      return NextResponse.json(
        { eligible: false, reason: "Deal is missing a product reference" },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const remainingQty = resolveDealRemainingQty(promotion);
    if (remainingQty !== null && quantity > remainingQty) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "Requested quantity exceeds remaining available quantity",
          remainingQty,
        },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const eligibilityContext: EngineContext = {
      page: "product",
      productId: product._id,
      categoryId:
        promotion.targetAudience?.categories?.[0]?._id ??
        promotion.categories?.[0]?._id ??
        product.categories?.[0]?._id,
      cartValue,
      cartItems,
    };

    const user: EngineUser = null;
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

    const engineWithContext = promotionEngine as unknown as {
      lastCartItems?: EngineContext["cartItems"];
      lastSessionData?: EngineContext["sessionData"];
      calculateDiscount: typeof promotionEngine.calculateDiscount;
    };

    engineWithContext.lastCartItems = cartItems;

    const discount = engineWithContext.calculateDiscount(
      promotion as unknown as EnginePromotion,
      cartValue,
      undefined
    );

    engineWithContext.lastCartItems = undefined;
    engineWithContext.lastSessionData = undefined;

    const originalTotal = toSafeNumber(discount.originalPrice, cartValue);
    const dealTotal = toSafeNumber(discount.discountedPrice, cartValue);
    const discountAmount = Math.max(0, toSafeNumber(discount.discountAmount, 0));
    const dealUnitPrice = quantity > 0 ? dealTotal / quantity : dealTotal;
    const discountPercent =
      originalTotal > 0 ? Math.max(0, (discountAmount / originalTotal) * 100) : 0;

    const slug = resolveSlug(product.slug);

    const responseItem: QuoteItem = {
      productId: product._id,
      name: product.name ?? null,
      slug,
      quantity,
      variantId: payload.variantId,
      variantLabel: payload.variantId ?? null,
      unitPrice: dealUnitPrice,
      originalUnitPrice: toSafeNumber(product.price, 0),
      lineTotal: dealTotal,
      imageUrl: product.imageUrl ?? null,
      thumbnailUrl: product.imageUrl ?? null,
      stock: typeof product.stock === "number" ? product.stock : null,
    };

    return NextResponse.json(
      {
        eligible: true,
        deal: {
          id: promotion.campaignId ?? promotion._id ?? payload.dealId,
          type: (promotion as { dealType?: string | null }).dealType ?? null,
          title: promotion.name ?? null,
          status: promotion.status ?? null,
          badge: promotion.badgeLabel ?? null,
          badgeColor: promotion.badgeColor ?? null,
          startDate: promotion.startDate ?? null,
          endDate: promotion.endDate ?? null,
          quantityLimit: (promotion as { quantityLimit?: number | null }).quantityLimit ?? null,
          soldCount: (promotion as { soldCount?: number | null }).soldCount ?? null,
          remainingQty,
        },
        items: [responseItem],
        totals: {
          originalPrice: originalTotal,
          dealPrice: dealTotal,
          discountAmount,
          discountPercent,
        },
      },
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "Invalid request payload",
          errors: error.flatten().fieldErrors,
        },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    console.error("[deals][quote] Unexpected error", error);
    return NextResponse.json(
      { eligible: false, reason: "Internal server error" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
