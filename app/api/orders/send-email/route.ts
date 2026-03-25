import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  sendOrderConfirmationEmail,
  OrderConfirmationData,
} from "@/lib/emailService";
import { getEmailImageUrl } from "@/lib/emailImageUtils";

// Extended interface for email preparation that can handle Sanity images
interface EmailOrderItem {
  name: string;
  price: number;
  quantity: number;
  image?: string | { asset?: { _ref?: string; url?: string } }; // Can be string URL or Sanity image object
}

interface EmailOrderData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderDate: string;
  items: EmailOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  estimatedDelivery?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderData }: { orderData: EmailOrderData } = await request.json();

    if (!orderData) {
      return NextResponse.json(
        { error: "Order data is required" },
        { status: 400 }
      );
    }

    // Convert EmailOrderData to OrderConfirmationData with proper image URLs
    const emailDataWithImages: OrderConfirmationData = {
      ...orderData,
      items: orderData.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: getEmailImageUrl(item.image),
      })),
    };

    const emailResult = await sendOrderConfirmationEmail(emailDataWithImages);

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        messageId: emailResult.messageId,
        message: "Email sent successfully",
      });
    } else {
      console.error(
        "Failed to send order confirmation email:",
        emailResult.error
      );
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || "Failed to send email",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Email sending error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
