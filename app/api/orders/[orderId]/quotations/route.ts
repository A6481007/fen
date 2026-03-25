import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import type { SanityDocumentStub } from "@sanity/client";
import { backendClient } from "@/sanity/lib/backendClient";
import { NEW_QUOTE_FEATURE } from "@/lib/featureFlags";
import { isUserAdmin } from "@/lib/adminUtils";

const stripOfficeField = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const sanitized = { ...(value as Record<string, unknown>) };
  delete sanitized.office;
  return sanitized;
};

const sanitizeQuotationDetailsUpdate = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const sanitized = { ...(value as Record<string, unknown>) };
  delete sanitized.office;
  delete sanitized.customerCode;
  return sanitized;
};

const mergeQuotationDetails = (
  base: Record<string, unknown> | null | undefined,
  updates: unknown
) => {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return base ?? null;
  }
  if (!base) return updates as Record<string, unknown>;
  return { ...base, ...(updates as Record<string, unknown>) };
};

type OrderAuthorization = {
  _id: string;
  orderNumber?: string | null;
  salesContact?: { email?: string | null } | null;
  quotationDetails?: {
    salesContact?: { email?: string | null } | null;
  } | null;
};

type QuotationSnapshot = {
  _id: string;
  order?: { _ref?: string; _type?: string } | null;
  number?: string | null;
  version?: number | null;
  quotationDetails?: Record<string, unknown> | null;
  salesContact?: { _ref?: string; _type?: string } | null;
  products?: unknown[] | null;
  items?: unknown[] | null;
  totals?: Record<string, unknown> | null;
  terms?: Record<string, unknown> | null;
  subtotal?: number | null;
  tax?: number | null;
  shipping?: number | null;
  totalPrice?: number | null;
  amountDiscount?: number | null;
  currency?: string | null;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type QuotationUpdatePayload = {
  number?: unknown;
  quotationDetails?: unknown;
  salesContactId?: unknown;
  salesContact?: unknown;
  products?: unknown;
  items?: unknown;
  totals?: unknown;
  terms?: unknown;
  subtotal?: unknown;
  tax?: unknown;
  shipping?: unknown;
  totalPrice?: unknown;
  amountDiscount?: unknown;
  currency?: unknown;
  customerName?: unknown;
  email?: unknown;
  phone?: unknown;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await backendClient.fetch<{
      _id: string;
    }>(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id
      }`,
      { orderId, clerkUserId: user.id }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!NEW_QUOTE_FEATURE) {
      return NextResponse.json({ success: true, quotations: [] });
    }

    const quotes = await backendClient.fetch(
      `*[_type=="quotation" && order._ref == $orderId] | order(version asc){
        _id,
        number,
        version,
        createdAt,
        emailSentAt,
        pdfUrl
      }`,
      { orderId }
    );

    return NextResponse.json({ success: true, quotations: quotes });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!NEW_QUOTE_FEATURE) {
      return NextResponse.json(
        { error: "Quotation versioning is disabled" },
        { status: 400 }
      );
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await backendClient.fetch<OrderAuthorization | null>(
      `*[_type == "order" && _id == $orderId][0]{
        _id,
        orderNumber,
        salesContact->{
          email
        },
        quotationDetails{
          salesContact->{
            email
          }
        }
      }`,
      { orderId }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const userEmail =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress;
    const normalizedUserEmail = (userEmail ?? "").trim().toLowerCase();
    const isAdmin = isUserAdmin(userEmail);
    const salesContactEmails = new Set<string>();

    if (order.salesContact?.email) {
      salesContactEmails.add(order.salesContact.email.toLowerCase());
    }

    if (order.quotationDetails?.salesContact?.email) {
      salesContactEmails.add(
        order.quotationDetails.salesContact.email.toLowerCase()
      );
    }

    const isSalesContact =
      normalizedUserEmail.length > 0 &&
      salesContactEmails.has(normalizedUserEmail);

    if (!isAdmin && !isSalesContact) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const latestQuotation = await backendClient.fetch<QuotationSnapshot | null>(
      `*[_type=="quotation" && order._ref == $orderId && isLatestVersion][0]{
        _id,
        order,
        number,
        version,
        quotationDetails,
        salesContact,
        products,
        items,
        totals,
        terms,
        subtotal,
        tax,
        shipping,
        totalPrice,
        amountDiscount,
        currency,
        customerName,
        email,
        phone
      }`,
      { orderId }
    );

    if (!latestQuotation?._id) {
      return NextResponse.json(
        { error: "Latest quotation not found" },
        { status: 404 }
      );
    }

    let payload: QuotationUpdatePayload | null = null;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        payload = body as QuotationUpdatePayload;
      }
    } catch {}

    const updates: Record<string, unknown> = {};

    if (payload) {
      if (typeof payload.number === "string") {
        updates.number = payload.number;
      }
      if (
        payload.quotationDetails &&
        typeof payload.quotationDetails === "object" &&
        !Array.isArray(payload.quotationDetails)
      ) {
        const baseQuotationDetails = latestQuotation?.quotationDetails
          ? (stripOfficeField(latestQuotation.quotationDetails) as Record<
              string,
              unknown
            >)
          : null;
        const sanitizedUpdates = sanitizeQuotationDetailsUpdate(
          payload.quotationDetails
        );
        updates.quotationDetails = mergeQuotationDetails(
          baseQuotationDetails,
          sanitizedUpdates
        );
      }
      if (typeof payload.salesContactId === "string") {
        const salesContactId = payload.salesContactId.trim();
        if (salesContactId) {
          updates.salesContact = { _type: "reference", _ref: salesContactId };
        }
      } else if (payload.salesContact && typeof payload.salesContact === "object") {
        const salesContact = payload.salesContact as { _ref?: unknown };
        if (typeof salesContact._ref === "string" && salesContact._ref.trim()) {
          updates.salesContact = {
            _type: "reference",
            _ref: salesContact._ref.trim(),
          };
        }
      }
      if (Array.isArray(payload.products)) {
        updates.products = payload.products;
      }
      if (Array.isArray(payload.items)) {
        updates.items = payload.items;
      }
      if (
        payload.totals &&
        typeof payload.totals === "object" &&
        !Array.isArray(payload.totals)
      ) {
        updates.totals = payload.totals;
      }
      if (
        payload.terms &&
        typeof payload.terms === "object" &&
        !Array.isArray(payload.terms)
      ) {
        updates.terms = payload.terms;
      }
      if (typeof payload.subtotal === "number") {
        updates.subtotal = payload.subtotal;
      }
      if (typeof payload.tax === "number") {
        updates.tax = payload.tax;
      }
      if (typeof payload.shipping === "number") {
        updates.shipping = payload.shipping;
      }
      if (typeof payload.totalPrice === "number") {
        updates.totalPrice = payload.totalPrice;
      }
      if (typeof payload.amountDiscount === "number") {
        updates.amountDiscount = payload.amountDiscount;
      }
      if (typeof payload.currency === "string") {
        updates.currency = payload.currency;
      }
      if (typeof payload.customerName === "string") {
        updates.customerName = payload.customerName;
      }
      if (typeof payload.email === "string") {
        updates.email = payload.email;
      }
      if (typeof payload.phone === "string") {
        updates.phone = payload.phone;
      }
    }

    const nextVersion =
      typeof latestQuotation.version === "number"
        ? latestQuotation.version + 1
        : 1;
    const createdAt = new Date().toISOString();
    const newQuotationId = crypto.randomUUID();

    const newQuotation: SanityDocumentStub<Record<string, unknown>> = {
      _id: newQuotationId,
      _type: "quotation",
      order: latestQuotation.order ?? { _type: "reference", _ref: orderId },
      version: nextVersion,
      isLatestVersion: true,
      createdAt,
    };

    if (typeof latestQuotation.number === "string") {
      newQuotation.number = latestQuotation.number;
    }
    if (latestQuotation.quotationDetails) {
      newQuotation.quotationDetails = stripOfficeField(
        latestQuotation.quotationDetails
      );
    }
    if (latestQuotation.salesContact) {
      newQuotation.salesContact = latestQuotation.salesContact;
    }
    if (Array.isArray(latestQuotation.products)) {
      newQuotation.products = latestQuotation.products;
    }
    if (Array.isArray(latestQuotation.items)) {
      newQuotation.items = latestQuotation.items;
    }
    if (latestQuotation.totals) {
      newQuotation.totals = latestQuotation.totals;
    }
    if (latestQuotation.terms) {
      newQuotation.terms = latestQuotation.terms;
    }
    if (typeof latestQuotation.subtotal === "number") {
      newQuotation.subtotal = latestQuotation.subtotal;
    }
    if (typeof latestQuotation.tax === "number") {
      newQuotation.tax = latestQuotation.tax;
    }
    if (typeof latestQuotation.shipping === "number") {
      newQuotation.shipping = latestQuotation.shipping;
    }
    if (typeof latestQuotation.totalPrice === "number") {
      newQuotation.totalPrice = latestQuotation.totalPrice;
    }
    if (typeof latestQuotation.amountDiscount === "number") {
      newQuotation.amountDiscount = latestQuotation.amountDiscount;
    }
    if (typeof latestQuotation.currency === "string") {
      newQuotation.currency = latestQuotation.currency;
    }
    if (typeof latestQuotation.customerName === "string") {
      newQuotation.customerName = latestQuotation.customerName;
    }
    if (typeof latestQuotation.email === "string") {
      newQuotation.email = latestQuotation.email;
    }
    if (typeof latestQuotation.phone === "string") {
      newQuotation.phone = latestQuotation.phone;
    }

    Object.assign(newQuotation, updates);

    await backendClient
      .transaction()
      .patch(latestQuotation._id, { set: { isLatestVersion: false } })
      .create(newQuotation)
      .commit();

    return NextResponse.json({
      success: true,
      quotation: newQuotation,
    });
  } catch (error) {
    console.error("Error creating quotation version:", error);
    return NextResponse.json(
      { error: "Failed to create quotation version" },
      { status: 500 }
    );
  }
}
