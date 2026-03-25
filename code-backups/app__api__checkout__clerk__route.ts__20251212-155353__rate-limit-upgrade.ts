import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export const POST = async (request: NextRequest) => {
  try {
    const reqBody = await request.json();
    const {
      orderId,
      orderNumber,
      items,
      email,
      shippingAddress,
      orderAmount,
      clerkUserId,
    } = reqBody;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Clerk User ID is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Verify user exists in Clerk
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(clerkUserId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a payment session ID for tracking
    const clerkPaymentId = `clerk_payment_${Date.now()}_${orderId}`;

    // For now, we'll simulate a payment session
    // In a real implementation, you would integrate with Clerk's payment processing
    // or a payment gateway that works with Clerk's user management

    const paymentSession = {
      id: clerkPaymentId,
      orderId,
      orderNumber,
      userId: clerkUserId,
      email: user.emailAddresses[0]?.emailAddress || email,
      amount: orderAmount,
      currency: "usd",
      status: "pending",
      metadata: {
        orderId: orderId.toString(),
        orderNumber: orderNumber.toString(),
        email,
        orderDate: new Date().toISOString(),
        itemCount: items.length.toString(),
        shippingAddress: JSON.stringify(shippingAddress),
        orderAmount: orderAmount?.toString() || "",
      },
      createdAt: new Date().toISOString(),
    };

    // In production, you would:
    // 1. Create a payment intent with your payment processor
    // 2. Associate it with the Clerk user
    // 3. Return a checkout URL or payment confirmation

    // Return payment page URL where user can complete payment
    const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/clerk-payment?session_id=${clerkPaymentId}&order_id=${orderId}&orderNumber=${orderNumber}&amount=${orderAmount}`;

    return NextResponse.json({
      success: true,
      paymentId: clerkPaymentId,
      url: paymentUrl,
      session: paymentSession,
      message: "Clerk payment session created successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Clerk checkout error:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to create Clerk checkout session" },
      { status: 500 }
    );
  }
};
