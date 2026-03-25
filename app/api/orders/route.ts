import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getMyOrders } from "@/sanity/helpers";
import { getPricingSettings } from "@/sanity/queries";
import { writeClient } from "@/sanity/lib/client";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from "@/lib/orderStatus";
import { NEW_QUOTE_FEATURE } from "@/lib/featureFlags";
import {
  generateLegacyQuotation,
  generateQuotation,
} from "@/lib/quotationService";
import { evaluateAndActOnChurn } from "@/lib/promotions/churnPrediction";
import crypto from "crypto";
import { sendOrderStatusNotification } from "@/lib/notificationService";
import type { CartItem as CartLineItem } from "@/lib/cart/types";
import type { PromotionAttributionSummary } from "@/lib/promotions/analytics";
import type { Address } from "@/lib/address";
import { ensureCustomerCodeForUser } from "@/lib/customerCode";
import { getTaxRate } from "@/lib/taxRate";

type OrderCartItem = {
  product: {
    _id: string;
    name?: string;
    price?: number;
    category?: string;
    sku?: string;
    discount?: number;
  };
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  priceOptionId?: string;
  priceOptionLabel?: string;
  appliedPromotion?: CartLineItem["appliedPromotion"];
};

type AnalyticsCartItem = Pick<
  CartLineItem,
  "productId" | "quantity" | "unitPrice"
> & {
  name?: string;
  category?: string;
};

const toNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const toMinor = (amount: number) => Math.round(amount * 100);
const fromMinor = (amount: number) => Number((amount / 100).toFixed(2));

type PromotionAttributionLineItem = {
  promotionId?: unknown;
  promotionName?: unknown;
  promotionType?: unknown;
  discountAmount?: unknown;
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isLoyaltyPromotion = (
  promotionType: string | null,
  promotionName: string | null,
  promotionId: string | null
) => {
  const haystack = [promotionType, promotionName, promotionId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes("loyalty");
};

const buildPromotionAttribution = (
  lineItems: unknown[]
): {
  appliedPromotions: PromotionAttributionSummary[];
  loyaltyPromotionFound: boolean;
} => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { appliedPromotions: [], loyaltyPromotionFound: false };
  }

  const grouped = new Map<
    string,
    PromotionAttributionSummary & { lineItemCount: number }
  >();
  let loyaltyPromotionFound = false;

  for (const rawLine of lineItems) {
    if (!rawLine || typeof rawLine !== "object") continue;
    const line = rawLine as PromotionAttributionLineItem;
    const promotionId = normalizeString(line.promotionId);
    const promotionName = normalizeString(line.promotionName);
    const promotionType = normalizeString(line.promotionType);

    if (!promotionId && !promotionName) continue;

    const key = promotionId
      ? `id:${promotionId}`
      : `name:${promotionName}`;
    const discountAmount = Math.max(0, toNumber(line.discountAmount));
    const existing = grouped.get(key);

    if (existing) {
      existing.totalDiscount += discountAmount;
      existing.lineItemCount += 1;
      if (!existing.id && promotionId) existing.id = promotionId;
      if (!existing.name && promotionName) existing.name = promotionName;
      if (!existing.type && promotionType) existing.type = promotionType;
    } else {
      grouped.set(key, {
        id: promotionId ?? undefined,
        name: promotionName ?? undefined,
        type: promotionType ?? undefined,
        totalDiscount: discountAmount,
        lineItemCount: 1,
      });
    }

    if (
      !loyaltyPromotionFound &&
      isLoyaltyPromotion(promotionType, promotionName, promotionId)
    ) {
      loyaltyPromotionFound = true;
    }
  }

  return {
    appliedPromotions: Array.from(grouped.values()),
    loyaltyPromotionFound,
  };
};

const updateStockLevels = async (
  lineItems: Array<{ item: OrderCartItem; quantity: number }>
) => {
  for (const line of lineItems) {
    const productId = line.item?.product?._id;
    const quantity = line.quantity ?? 0;
    if (!productId || quantity <= 0) continue;

    try {
      const product = await backendClient.getDocument(productId);
      if (!product || typeof product.stock !== "number") {
        console.warn(
          `Product with ID ${productId} not found or stock is invalid.`
        );
        continue;
      }

      const newStock = Math.max(product.stock - quantity, 0);
      await backendClient.patch(productId).set({ stock: newStock }).commit();
    } catch (error) {
      console.error(`Failed to update stock for product ${productId}:`, error);
    }
  }
};

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getMyOrders(userId);

    return NextResponse.json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = async (request: NextRequest) => {
  try {
    // Check authentication
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await request.json();
    const {
      items,
      shippingAddress,
      quotationDetails,
      paymentMethod,
      orderKind,
      isQuotation: isQuotationFlag,
      salesContactId,
    }: {
      items: OrderCartItem[];
      shippingAddress: Partial<Address>;
      quotationDetails?: Partial<Address>;
      paymentMethod: (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
      orderKind?: "order" | "quotation";
      isQuotation?: boolean;
      salesContactId?: string;
    } = reqBody;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    if (
      !paymentMethod ||
      !Object.values(PAYMENT_METHODS).includes(paymentMethod)
    ) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `ORDER-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const userName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
    const userPhone =
      user.phoneNumbers?.[0]?.phoneNumber || shippingAddress.phone || "";
    let customerCode: string | undefined;
    try {
      const ensured = await ensureCustomerCodeForUser({
        clerkUserId: userId,
        email: userEmail || shippingAddress.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phoneNumbers?.[0]?.phoneNumber,
      });
      customerCode = ensured.customerCode || undefined;
    } catch (error) {
      console.error("Failed to ensure customer code:", error);
      customerCode = undefined;
    }
    const resolvedEmail = shippingAddress.email || userEmail || "";
    const resolvedContactEmail =
      shippingAddress.contactEmail || resolvedEmail || "";
    const resolvedAddress: Address = {
      _id: shippingAddress._id,
      name: shippingAddress.name || userName,
      email: resolvedEmail,
      contactEmail: resolvedContactEmail || undefined,
      lineId: shippingAddress.lineId || undefined,
      phone: shippingAddress.phone || userPhone || undefined,
      fax: shippingAddress.fax || undefined,
      company: shippingAddress.company || undefined,
      customerCode: customerCode || undefined,
      taxId: shippingAddress.taxId || undefined,
      branch: shippingAddress.branch || undefined,
      address: shippingAddress.address || "",
      city: shippingAddress.city || "",
      state: shippingAddress.state || "",
      zip: shippingAddress.zip || "",
      country: shippingAddress.country || "United States",
      countryCode: shippingAddress.countryCode || undefined,
      stateCode: shippingAddress.stateCode || undefined,
      subArea: shippingAddress.subArea || undefined,
      type: shippingAddress.type,
      default: shippingAddress.default,
      createdAt: shippingAddress.createdAt,
      lastUsedAt: shippingAddress.lastUsedAt,
    };

    const resolvedQuotationDetails: Address = {
      _id: quotationDetails?._id,
      name: quotationDetails?.name || resolvedAddress.name,
      email: quotationDetails?.email || resolvedAddress.email,
      contactEmail:
        quotationDetails?.contactEmail ||
        quotationDetails?.email ||
        resolvedAddress.contactEmail ||
        resolvedAddress.email,
      lineId: quotationDetails?.lineId || resolvedAddress.lineId,
      phone: quotationDetails?.phone || resolvedAddress.phone,
      fax: quotationDetails?.fax || resolvedAddress.fax,
      company: quotationDetails?.company || resolvedAddress.company,
      customerCode: customerCode || resolvedAddress.customerCode,
      winCode: quotationDetails?.winCode || resolvedAddress.winCode,
      taxId: quotationDetails?.taxId || resolvedAddress.taxId,
      branch: quotationDetails?.branch || resolvedAddress.branch,
      address: quotationDetails?.address || resolvedAddress.address,
      city: quotationDetails?.city || resolvedAddress.city,
      state: quotationDetails?.state || resolvedAddress.state,
      zip: quotationDetails?.zip || resolvedAddress.zip,
      country: quotationDetails?.country || resolvedAddress.country,
      countryCode: quotationDetails?.countryCode || resolvedAddress.countryCode,
      stateCode: quotationDetails?.stateCode || resolvedAddress.stateCode,
      subArea: quotationDetails?.subArea || resolvedAddress.subArea,
      type: quotationDetails?.type || resolvedAddress.type,
      default: false,
      createdAt: quotationDetails?.createdAt,
      lastUsedAt: quotationDetails?.lastUsedAt,
    };
    let isBusinessAccount = false;
    let isPremiumAccount = false;

    try {
      const businessProfile = await backendClient.fetch<{
        isBusiness?: boolean;
        businessStatus?: string;
        membershipType?: string;
        premiumStatus?: string;
      } | null>(
        `*[_type in ["userType", "user"] && (email == $email || clerkUserId == $clerkUserId)][0]{
          isBusiness,
          businessStatus,
          membershipType,
          premiumStatus
        }`,
        { email: userEmail ?? "", clerkUserId: userId }
      );
      isBusinessAccount = Boolean(
        businessProfile?.isBusiness ||
          businessProfile?.businessStatus === "active" ||
          businessProfile?.membershipType === "business"
      );
      isPremiumAccount =
        businessProfile?.membershipType === "premium" ||
        businessProfile?.premiumStatus === "active";
    } catch (profileError) {
      console.error("Failed to resolve dealer status:", profileError);
    }

    if (paymentMethod === PAYMENT_METHODS.CLERK && !isBusinessAccount) {
      return NextResponse.json(
        { error: "Invoice payment is for dealer accounts only" },
        { status: 403 }
      );
    }

    const computedLineItems = items.map((item) => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = toNumber(item.unitPrice ?? item.product.price);
      const unitPriceMinor = toMinor(unitPrice);
      const grossLineMinor = unitPriceMinor * quantity;
      const appliedPromotion = item.appliedPromotion;
      const lineTotalCandidate = toNumber(
        typeof item.lineTotal === "number"
          ? item.lineTotal
          : unitPrice * quantity
      );
      const lineTotalMinorCandidate = Math.max(
        0,
        toMinor(lineTotalCandidate)
      );
      const promoDiscountMinor = appliedPromotion
        ? Math.max(0, toMinor(toNumber(appliedPromotion.discountAmount)))
        : null;
      const discountMinor = Math.min(
        grossLineMinor,
        Math.max(
          0,
          promoDiscountMinor ?? grossLineMinor - lineTotalMinorCandidate
        )
      );
      const lineTotalMinor = Math.max(0, grossLineMinor - discountMinor);

      return {
        item,
        quantity,
        unitPriceMinor,
        unitPrice: fromMinor(unitPriceMinor),
        grossLineMinor,
        discountMinor,
        discountAmount: fromMinor(discountMinor),
        lineTotalMinor,
        lineTotal: fromMinor(lineTotalMinor),
        appliedPromotion,
      };
    });

    const grossSubtotalMinor = computedLineItems.reduce(
      (sum, line) => sum + line.grossLineMinor,
      0
    );
    const totalLineDiscountMinor = computedLineItems.reduce(
      (sum, line) => sum + line.discountMinor,
      0
    );
    const netSubtotalMinor = Math.max(
      0,
      grossSubtotalMinor - totalLineDiscountMinor
    );
    const pricingSettings = await getPricingSettings();
    const dealerDiscountPercent = Number.isFinite(
      pricingSettings?.dealerDiscountPercent
    )
      ? Math.max(0, pricingSettings.dealerDiscountPercent ?? 0)
      : 0;
    const dealerFreeShippingEnabled = Boolean(
      pricingSettings?.dealerFreeShippingEnabled
    );
    const premiumFreeShippingEnabled = Boolean(
      pricingSettings?.premiumFreeShippingEnabled
    );
    const dealerDiscountRate =
      dealerDiscountPercent > 0 ? dealerDiscountPercent / 100 : 0;
    const businessDiscountMinor =
      isBusinessAccount && dealerDiscountRate > 0
        ? Math.min(netSubtotalMinor, Math.round(netSubtotalMinor * dealerDiscountRate))
        : 0;
    const subtotalMinor = Math.max(0, netSubtotalMinor - businessDiscountMinor);
    const taxRate = await getTaxRate();
    const hasMemberFreeShipping =
      (dealerFreeShippingEnabled && isBusinessAccount) ||
      (premiumFreeShippingEnabled && isPremiumAccount);
    const shippingMinor = hasMemberFreeShipping
      ? 0
      : subtotalMinor >= toMinor(100)
        ? 0
        : toMinor(10);
    const taxMinor = Math.round(subtotalMinor * taxRate);
    const totalMinor = subtotalMinor + shippingMinor + taxMinor;
    const grossSubtotal = fromMinor(grossSubtotalMinor);
    const totalDiscount = fromMinor(totalLineDiscountMinor);
    const businessDiscount = fromMinor(businessDiscountMinor);
    const subtotal = fromMinor(subtotalMinor);
    const shippingAmount = fromMinor(shippingMinor);
    const taxAmount = fromMinor(taxMinor);
    const computedTotal = fromMinor(totalMinor);

    const resolvedOrderKind =
      orderKind === "quotation" ||
      isQuotationFlag === true ||
      (paymentMethod === PAYMENT_METHODS.CLERK && isBusinessAccount)
        ? "quotation"
        : "order";
    const isQuotation = resolvedOrderKind === "quotation";
    const status = isQuotation
      ? ORDER_STATUSES.QUOTATION_REQUESTED
      : ORDER_STATUSES.PENDING;
    const salesContactRefId =
      typeof salesContactId === "string" ? salesContactId.trim() : "";
    const salesContactReference = salesContactRefId
      ? { _type: "reference", _ref: salesContactRefId }
      : null;

    // Create order object
    const orderData = {
      _type: "order" as const,
      orderNumber,
      orderKind: resolvedOrderKind,
      customerName: userName,
      email: userEmail,
      phone: userPhone,
      clerkUserId: userId,
      products: computedLineItems.map((line) => {
        const appliedPromotion = line.appliedPromotion;
        return {
          _key: crypto.randomUUID(), // Generate unique key for each product item
          product: {
            _type: "reference",
            _ref: line.item.product._id,
          },
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          priceOptionId: line.item.priceOptionId ?? null,
          priceOptionLabel: line.item.priceOptionLabel ?? null,
          discountAmount: line.discountAmount,
          discountType: appliedPromotion?.discountType ?? null,
          discountValue: appliedPromotion?.discountValue ?? 0,
          promotionName: appliedPromotion?.name ?? null,
          promotionType: appliedPromotion?.type ?? null,
          promotionId: appliedPromotion?.id ?? null,
        };
      }),
      totalPrice: computedTotal,
      currency: "THB",
      amountDiscount: totalDiscount,
      grossSubtotal,
      businessDiscount,
      address: {
        _type: "object",
        name: resolvedAddress.name,
        email: resolvedAddress.email,
        contactEmail: resolvedAddress.contactEmail || resolvedAddress.email || "",
        lineId: resolvedAddress.lineId || "",
        phone: resolvedAddress.phone || userPhone || "",
        fax: resolvedAddress.fax || "",
        company: resolvedAddress.company || "",
        customerCode: resolvedAddress.customerCode || "",
        taxId: resolvedAddress.taxId || "",
        branch: resolvedAddress.branch || "",
        address: resolvedAddress.address,
        city: resolvedAddress.city,
        state: resolvedAddress.state,
        zip: resolvedAddress.zip,
        country: resolvedAddress.country,
        countryCode: resolvedAddress.countryCode || "",
        stateCode: resolvedAddress.stateCode || "",
        subArea: resolvedAddress.subArea || "",
        type: resolvedAddress.type || "home",
        default: Boolean(resolvedAddress.default),
        createdAt: resolvedAddress.createdAt,
        lastUsedAt: resolvedAddress.lastUsedAt,
      },
      quotationDetails: {
        _type: "object",
        ...(salesContactReference
          ? { salesContact: salesContactReference }
          : {}),
        name: resolvedQuotationDetails.name,
        email: resolvedQuotationDetails.email,
        contactEmail:
          resolvedQuotationDetails.contactEmail ||
          resolvedQuotationDetails.email ||
          "",
        lineId: resolvedQuotationDetails.lineId || "",
        phone: resolvedQuotationDetails.phone || "",
        fax: resolvedQuotationDetails.fax || "",
        company: resolvedQuotationDetails.company || "",
        customerCode: resolvedQuotationDetails.customerCode || "",
        winCode: resolvedQuotationDetails.winCode || "",
        taxId: resolvedQuotationDetails.taxId || "",
        branch: resolvedQuotationDetails.branch || "",
        address: resolvedQuotationDetails.address,
        city: resolvedQuotationDetails.city,
        state: resolvedQuotationDetails.state,
        zip: resolvedQuotationDetails.zip,
        country: resolvedQuotationDetails.country,
        countryCode: resolvedQuotationDetails.countryCode || "",
        stateCode: resolvedQuotationDetails.stateCode || "",
        subArea: resolvedQuotationDetails.subArea || "",
        type: resolvedQuotationDetails.type || "home",
        default: false,
        createdAt: resolvedQuotationDetails.createdAt,
        lastUsedAt: resolvedQuotationDetails.lastUsedAt,
      },
      status,
      ...(isQuotation && { quotationRequestedAt: new Date().toISOString() }),
      orderDate: new Date().toISOString(),
      paymentMethod,
      paymentStatus:
        paymentMethod === PAYMENT_METHODS.CREDIT
          ? PAYMENT_STATUSES.CREDIT_REQUESTED
          : PAYMENT_STATUSES.PENDING,
      subtotal,
      shipping: shippingAmount,
      tax: taxAmount,
      // Add payment-specific fields based on payment method
      ...(paymentMethod === PAYMENT_METHODS.STRIPE && {
        stripeCustomerId: "", // Will be populated when needed for invoicing
        stripePaymentIntentId: "", // Will be populated for Stripe payments
        stripeCheckoutSessionId: "", // Will be populated for Stripe payments
      }),
      ...(paymentMethod === PAYMENT_METHODS.CLERK && {
        clerkPaymentId: "", // Will be populated for Clerk payments
        clerkPaymentStatus: "invoice_sent", // Initial status for offline invoices
      }),
      ...(paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY && {
        stripePaymentIntentId: `cod_${orderNumber}`,
      }),
      ...(salesContactReference ? { salesContact: salesContactReference } : {}),
    };

    // Create order in Sanity using writeClient (has create permissions)
    const createdOrder = await writeClient.create(orderData);

    if (paymentMethod === PAYMENT_METHODS.CLERK) {
      try {
        const generate = NEW_QUOTE_FEATURE
          ? generateQuotation
          : generateLegacyQuotation;
        await generate(createdOrder._id, userId, {
          baseUrl: request.nextUrl.origin,
          fallbackPhone:
            user.phoneNumbers?.[0]?.phoneNumber || shippingAddress.phone || "",
          requireEmail: true,
        });
      } catch (quotationError) {
        const errorMessage =
          quotationError instanceof Error
            ? quotationError.message
            : "Failed to generate quotation";
        console.error(
          "Failed to generate quotation for Clerk checkout:",
          quotationError
        );
        return NextResponse.json(
          { error: errorMessage || "Failed to generate quotation. Please retry." },
          { status: 500 }
        );
      }
    }

    const shouldUpdateStock =
      resolvedOrderKind === "order" &&
      paymentMethod !== PAYMENT_METHODS.STRIPE;
    if (shouldUpdateStock) {
      try {
        await updateStockLevels(computedLineItems);
      } catch (stockError) {
        console.error("Failed to update stock levels:", stockError);
      }
    }

    if (shippingAddress?._id && userEmail) {
      try {
        const existingAddress = await writeClient.fetch(
          `*[_type == "address" && _id == $id && email == $email][0]{_id}`,
          { id: shippingAddress._id, email: userEmail }
        );
        if (existingAddress?._id) {
          await writeClient
            .patch(existingAddress._id)
            .set({ lastUsedAt: new Date().toISOString() })
            .commit();
        }
      } catch (addressError) {
        console.error("Failed to update address lastUsedAt:", addressError);
      }
    }

    const analyticsItems: AnalyticsCartItem[] = items.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
      unitPrice:
        typeof item.unitPrice === "number"
          ? item.unitPrice
          : item.product.price ?? 0,
      name: item.product.name,
      category: item.product.category,
    }));
    const orderCurrency =
      typeof createdOrder?.currency === "string" && createdOrder.currency.trim()
        ? createdOrder.currency
        : orderData.currency ?? "THB";
    const { appliedPromotions, loyaltyPromotionFound } =
      buildPromotionAttribution(
        Array.isArray(createdOrder?.products)
          ? createdOrder.products
          : orderData.products
      );
    const segmentHint = loyaltyPromotionFound ? "loyalty" : undefined;

    // Track order placed event
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/analytics/track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "order_placed",
            eventParams: {
              orderId: createdOrder._id,
              orderNumber: createdOrder.orderNumber,
              amount: computedTotal,
              status: createdOrder.status,
              userId: userId,
              paymentMethod: paymentMethod,
              itemCount: items.length,
              subtotal,
              shipping: shippingAmount,
              tax: taxAmount,
              currency: orderCurrency,
              customerEmail: userEmail,
              appliedPromotions,
              ...(segmentHint ? { segmentHint } : {}),
              products: analyticsItems.map((item) => ({
                productId: item.productId,
                name: item.name || "Unknown Product",
                quantity: item.quantity,
                price: item.unitPrice,
              })),
            },
          }),
        }
      );

      // Also track purchase event for e-commerce analytics
      await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/analytics/track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "purchase",
            eventParams: {
              orderId: createdOrder._id,
              value: computedTotal,
              currency: orderCurrency,
              appliedPromotions,
              ...(segmentHint ? { segmentHint } : {}),
              items: analyticsItems.map((item) => ({
                productId: item.productId,
                name: item.name || "Unknown Product",
                category: item.category || "Uncategorized",
                quantity: item.quantity,
                price: item.unitPrice,
              })),
              userId: userId,
            },
          }),
        }
      );
    } catch (analyticsError) {
      console.error("Failed to track order placed event:", analyticsError);
    }

    // Send order confirmation notification to user
    try {
      await sendOrderStatusNotification({
        clerkUserId: userId,
        orderNumber: createdOrder.orderNumber,
        orderId: createdOrder._id,
        status: createdOrder.status,
      });
    } catch (notificationError) {
      console.error(
        "Failed to send order confirmation notification:",
        notificationError
      );
      // Don't fail the order creation if notification fails
    }

    // Run churn evaluation to trigger win-back journeys for at-risk users
    try {
      await evaluateAndActOnChurn(userId);
    } catch (churnError) {
      console.error("Failed to evaluate churn after order creation:", churnError);
    }

    return NextResponse.json({
      success: true,
      order: {
        _id: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        paymentMethod: createdOrder.paymentMethod,
        totalPrice: createdOrder.totalPrice,
        currency: createdOrder.currency,
      },
      message: "Order created successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Order creation error:", error);
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : null,
    });
    return NextResponse.json(
      {
        error: errorMessage || "Failed to create order",
        details: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
};
