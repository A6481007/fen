import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { withRateLimit } from "@/lib/rateLimit";
import { withFraudCheck } from "@/lib/promotions/fraudGateway";
import { backendClient } from "@/sanity/lib/backendClient";
import { writeClient } from "@/sanity/lib/client";

const handleStripeCheckout = async (request: NextRequest) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const reqBody =
      (request as unknown as { __fraudBody?: any }).__fraudBody ?? (await request.json());
    const { orderId, items, email, shippingAddress } = reqBody;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await backendClient.fetch<{
      _id: string;
      orderNumber?: string;
      totalPrice?: number;
      currency?: string;
      email?: string;
      paymentMethod?: string;
    } | null>(
      `*[_type == "order" && _id == $orderId][0]{
        _id,
        orderNumber,
        totalPrice,
        currency,
        email,
        paymentMethod
      }`,
      { orderId }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.totalPrice || order.totalPrice <= 0) {
      return NextResponse.json(
        { error: "Invalid order total" },
        { status: 400 }
      );
    }

    const currency = (order.currency || "THB").toLowerCase();
    const unitAmount = Math.round(order.totalPrice * 100);
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
              name: `Order ${order.orderNumber ?? order._id}`,
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
      cancel_url: `${baseUrl}/checkout?cancelled=1&orderId=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber?.toString() || "",
        email: order.email ?? email,
        orderDate: new Date().toISOString(),
        itemCount: Array.isArray(items) ? items.length.toString() : "0",
        shippingAddress: shippingAddress
          ? JSON.stringify(shippingAddress)
          : "",
        orderAmount: order.totalPrice.toString(),
      },
      customer_email: order.email ?? email,
    });

    await writeClient
      .patch(order._id)
      .set({ stripeCheckoutSessionId: session.id })
      .commit();

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      redirectTo: session.url,
      message: "Stripe checkout session created successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to create Stripe checkout session" },
      { status: 500 }
    );
  }
};

export const POST = withRateLimit(
  withFraudCheck(handleStripeCheckout, {
    deriveInput: async (request: NextRequest) => {
      const body = await request.json();
      (request as unknown as { __fraudBody?: any }).__fraudBody = body;

      const userId =
        (body as { userId?: string }).userId ??
        (body as { customerId?: string }).customerId ??
        (body as { email?: string }).email ??
        "anonymous";
      const sessionId =
        (body as { sessionId?: string }).sessionId ??
        (body as { orderId?: string }).orderId ??
        request.headers.get("x-session-id") ??
        "unknown-session";

      const cartValue = Number((body as { orderAmount?: number }).orderAmount ?? 0);

      return {
        userId,
        sessionId,
        campaignId: (body as { campaignId?: string }).campaignId ?? "checkout",
        cartValue: Number.isFinite(cartValue) ? cartValue : 0,
        promoMinimum: 0,
        request,
      };
    },
  }),
  "checkout",
);
