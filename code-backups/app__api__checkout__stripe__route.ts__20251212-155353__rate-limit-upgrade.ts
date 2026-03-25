import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { urlFor } from "@/sanity/lib/image";
// Removed unused imports

export const POST = async (request: NextRequest) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const reqBody = await request.json();
    const { orderId, orderNumber, items, email, shippingAddress, orderAmount } =
      reqBody;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Convert cart items to Stripe line items
    const extractingItems = items.map(
      (item: {
        product: {
          _id: string;
          name?: string;
          description?: string;
          price?: number;
          images?: string[];
        };
        quantity: number;
      }) => {
        const itemPrice = item.product.price || 0;
        const unitAmount = Math.round(itemPrice * 100); // Convert to cents

        // Convert Sanity image objects to URLs for Stripe
        let productImages: string[] = [];
        if (
          item.product.images &&
          Array.isArray(item.product.images) &&
          item.product.images.length > 0
        ) {
          try {
            // Convert first image to URL
            const imageUrl = urlFor(item.product.images[0])
              .width(800)
              .height(600)
              .url();
            if (imageUrl) {
              productImages = [imageUrl];
            }
          } catch (error) {
            console.warn("Failed to convert image URL:", error);
            productImages = [];
          }
        }

        return {
          quantity: item.quantity || 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: item.product.name || "Product",
              description:
                item.product.description || `Product from order ${orderId}`,
              images: productImages,
              metadata: {
                productId: item.product._id?.toString() || "",
                orderId: orderId.toString(),
                quantity: item.quantity.toString(),
              },
            },
          },
        };
      }
    );

    // Validate line items
    if (!extractingItems || extractingItems.length === 0) {
      throw new Error("No valid line items found");
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: extractingItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}&orderNumber=${orderNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/orders/${orderId}?cancelled=true`,
      metadata: {
        orderId: orderId.toString(),
        orderNumber: orderNumber.toString(),
        email,
        orderDate: new Date().toISOString(),
        itemCount: items.length.toString(),
        shippingAddress: JSON.stringify(shippingAddress),
        orderAmount: orderAmount?.toString() || "",
      },
      customer_email: email,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
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
