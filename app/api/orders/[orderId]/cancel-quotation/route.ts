import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { writeClient } from "@/sanity/lib/client";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orderStatus";

const normalizeReason = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    let cancellationReason = "";
    try {
      const body = await request.json();
      cancellationReason = normalizeReason(body?.reason);
    } catch {}

    const order = await backendClient.fetch<{
      _id: string;
      status?: string;
      orderNumber?: string | null;
    } | null>(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id,
        status,
        orderNumber
      }`,
      { orderId, clerkUserId: userId }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === ORDER_STATUSES.CANCELLED) {
      return NextResponse.json(
        { error: "Quotation is already cancelled" },
        { status: 400 }
      );
    }

    if (order.status !== ORDER_STATUSES.QUOTATION_REQUESTED) {
      return NextResponse.json(
        { error: "Only quotation requests can be cancelled" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const cancelledBy =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      userId;

    await writeClient
      .patch(orderId)
      .set({
        status: ORDER_STATUSES.CANCELLED,
        paymentStatus: PAYMENT_STATUSES.CANCELLED,
        cancelledAt: now,
        cancelledBy,
        cancellationReason:
          cancellationReason || "Cancelled by customer",
        cancellationRequested: false,
        cancellationRequestedAt: null,
        cancellationRequestReason: null,
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: "Quotation cancelled successfully.",
      status: ORDER_STATUSES.CANCELLED,
      cancelledAt: now,
    });
  } catch (error) {
    console.error("Error cancelling quotation:", error);
    return NextResponse.json(
      { error: "Failed to cancel quotation" },
      { status: 500 }
    );
  }
}
