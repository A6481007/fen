import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/client";
import { PAYMENT_STATUSES } from "@/lib/orderStatus";

export const POST = async (request: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await request.json();
    const { orderId, sessionId, status } = reqBody;

    if (!orderId || !sessionId) {
      return NextResponse.json(
        { error: "Order ID and Session ID are required" },
        { status: 400 }
      );
    }

    // Update the order with payment status
    const updatedOrder = await writeClient
      .patch(orderId)
      .set({
        clerkPaymentId: sessionId,
        clerkPaymentStatus: status || "completed",
        paymentStatus:
          status === "completed"
            ? PAYMENT_STATUSES.PAID
            : PAYMENT_STATUSES.PENDING,
        stripePaymentIntentId: sessionId, // Store for reference
      })
      .commit();

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Payment status updated successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Clerk payment completion error:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to update payment status" },
      { status: 500 }
    );
  }
};
