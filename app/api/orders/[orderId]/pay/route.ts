import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { client, writeClient } from "@/sanity/lib/client";
import Stripe from "stripe";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orderStatus";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    // Check authentication
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Fetch the order from Sanity
    const order = await client.fetch(
      `*[_type == "order" && _id == $orderId && clerkUserId == $userId][0]{
        _id,
        orderNumber,
        customerName,
        email,
        clerkUserId,
        status,
        paymentStatus,
        paymentMethod,
        totalPrice,
        currency,
        products[]{
          _key,
          quantity,
          product->{
            _id,
            name,
            price,
            currency,
            images
          }
        },
        address
      }`,
      { orderId, userId }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order is already paid
    if (
      order.status === ORDER_STATUSES.PAID ||
      order.paymentStatus === PAYMENT_STATUSES.PAID
    ) {
      return NextResponse.json(
        { error: "Order is already paid" },
        { status: 400 }
      );
    }

    // Check if order is eligible for payment (not cancelled)
    if (order.status === ORDER_STATUSES.CANCELLED) {
      return NextResponse.json(
        { error: "Cannot pay for cancelled order" },
        { status: 400 }
      );
    }

    if (!order.totalPrice || order.totalPrice <= 0) {
      return NextResponse.json(
        { error: "Invalid order total" },
        { status: 400 }
      );
    }

    const currency = order.currency?.toLowerCase() || "thb";
    const unitAmount = Math.round((order.totalPrice || 0) * 100);
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: `Order ${order.orderNumber}`,
              description: "Order total",
              metadata: {
                orderId: order._id,
              },
            },
          },
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,
      cancel_url: `${baseUrl}/user/orders/${order._id}?cancelled=1`,
      metadata: {
        orderId: order._id,
        email: order.email,
        orderDate: new Date().toISOString(),
        itemCount: order.products.length.toString(),
        shippingAddress: JSON.stringify(order.address),
        orderAmount: order.totalPrice?.toString() || "",
      },
      customer_email: order.email,
    });

    await writeClient
      .patch(order._id)
      .set({ stripeCheckoutSessionId: session.id })
      .commit();

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: "Payment session created successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Payment session creation error:", error);
    return NextResponse.json(
      {
        error: errorMessage || "Failed to create payment session",
        details: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
