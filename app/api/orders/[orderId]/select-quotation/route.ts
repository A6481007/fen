import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/client";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orderStatus";
import { NEW_QUOTE_FEATURE } from "@/lib/featureFlags";

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
        { error: "Quotation selection is disabled" },
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

    const payload = await request.json();
    const quoteId =
      typeof payload?.quoteId === "string" ? payload.quoteId.trim() : "";

    if (!quoteId) {
      return NextResponse.json(
        { error: "Quotation ID is required" },
        { status: 400 }
      );
    }

    const order = await writeClient.fetch<{
      _id: string;
      clerkUserId: string;
      orderKind?: string;
      status?: string;
      paymentStatus?: string;
    } | null>(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id,
        clerkUserId,
        orderKind,
        status,
        paymentStatus
      }`,
      { orderId, clerkUserId: user.id }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const canSelect =
      order.status === ORDER_STATUSES.QUOTATION_REQUESTED ||
      order.status === ORDER_STATUSES.PENDING;

    if (!canSelect || order.paymentStatus === PAYMENT_STATUSES.PAID) {
      return NextResponse.json(
        { error: "Quotation selection is locked after checkout." },
        { status: 400 }
      );
    }

    const quotation = await writeClient.fetch<{
      _id: string;
      number?: string | null;
      version?: number | null;
      createdAt?: string | null;
      pdfUrl?: string | null;
    } | null>(
      `*[_type == "quotation" && _id == $quoteId && order._ref == $orderId][0]{
        _id,
        number,
        version,
        createdAt,
        pdfUrl
      }`,
      { quoteId, orderId }
    );

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    const selectedAt = new Date().toISOString();

    await writeClient
      .patch(orderId)
      .set({
        selectedQuotation: { _type: "reference", _ref: quotation._id },
        selectedQuotationAt: selectedAt,
      })
      .commit();

    return NextResponse.json({
      success: true,
      selectedQuotation: quotation,
      selectedQuotationAt: selectedAt,
    });
  } catch (error) {
    console.error("Error selecting quotation:", error);
    return NextResponse.json(
      { error: "Failed to select quotation" },
      { status: 500 }
    );
  }
}
