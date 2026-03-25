import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { writeClient } from "@/sanity/lib/client";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/orderStatus";

const ALLOWED_PAYMENT_METHODS = [
  PAYMENT_METHODS.CASH_ON_DELIVERY,
  PAYMENT_METHODS.CLERK,
  PAYMENT_METHODS.STRIPE,
  PAYMENT_METHODS.CREDIT,
];

export async function POST(
  request: NextRequest,
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

    const payload = await request.json();
    const paymentMethod = payload?.paymentMethod as string | undefined;

    if (
      !paymentMethod ||
      !Object.values(PAYMENT_METHODS).includes(
        paymentMethod as (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    const normalizedPaymentMethod = paymentMethod as (typeof ALLOWED_PAYMENT_METHODS)[number];

    if (!ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
      return NextResponse.json(
        { error: "Payment method is not available for quotations" },
        { status: 400 }
      );
    }

    const order = await writeClient.fetch<{
      _id: string;
      orderNumber?: string;
      clerkUserId: string;
      status?: string;
      email?: string;
      address?: Record<string, unknown>;
      quotationDetails?: Record<string, unknown> & {
        salesContact?: unknown;
      };
      stripePaymentIntentId?: string;
    } | null>(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id,
        orderNumber,
        clerkUserId,
        status,
        email,
        address,
        quotationDetails,
        stripePaymentIntentId
      }`,
      { orderId, clerkUserId: user.id }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== ORDER_STATUSES.QUOTATION_REQUESTED) {
      return NextResponse.json(
        { error: "Only quotations can be accepted" },
        { status: 400 }
      );
    }

    if (paymentMethod === PAYMENT_METHODS.CLERK) {
      let isBusinessAccount = false;
      try {
        const businessProfile = await backendClient.fetch<{
          isBusiness?: boolean;
          businessStatus?: string;
          membershipType?: string;
        } | null>(
          `*[_type in ["userType", "user"] && (email == $email || clerkUserId == $clerkUserId)][0]{
            isBusiness,
            businessStatus,
            membershipType
          }`,
          { email: user.emailAddresses[0]?.emailAddress ?? "", clerkUserId: user.id }
        );
        isBusinessAccount = Boolean(
          businessProfile?.isBusiness ||
            businessProfile?.businessStatus === "active" ||
            businessProfile?.membershipType === "business"
        );
      } catch (profileError) {
        console.error("Failed to resolve dealer status:", profileError);
      }

      if (!isBusinessAccount) {
        return NextResponse.json(
          { error: "Invoice payment is for dealer accounts only" },
          { status: 403 }
        );
      }
    }

    const { salesContact: _salesContact, ...quotationAddress } =
      order.quotationDetails ?? {};
    const addressSource =
      order.quotationDetails && Object.keys(quotationAddress).length > 0
        ? quotationAddress
        : order.address ?? {};

    const updateData: Record<string, unknown> = {
      status: ORDER_STATUSES.PENDING,
      orderKind: "order",
      paymentMethod,
      paymentStatus:
        paymentMethod === PAYMENT_METHODS.CREDIT
          ? PAYMENT_STATUSES.CREDIT_REQUESTED
          : PAYMENT_STATUSES.PENDING,
      address: addressSource,
      orderDate: new Date().toISOString(),
    };

    if (paymentMethod === PAYMENT_METHODS.CLERK) {
      updateData.clerkPaymentStatus = "invoice_sent";
      updateData.clerkPaymentId = "";
    }

    if (paymentMethod === PAYMENT_METHODS.STRIPE) {
      updateData.stripeCheckoutSessionId = "";
      updateData.stripePaymentIntentId = "";
      updateData.stripeCustomerId = "";
    }

    if (
      paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY &&
      !order.stripePaymentIntentId &&
      order.orderNumber
    ) {
      updateData.stripePaymentIntentId = `cod_${order.orderNumber}`;
    }

    const updatedOrder = await writeClient
      .patch(orderId)
      .set(updateData)
      .commit();

    return NextResponse.json({
      success: true,
      orderId: updatedOrder._id,
      status: updatedOrder.status,
    });
  } catch (error) {
    console.error("Error accepting quotation:", error);
    return NextResponse.json(
      { error: "Failed to accept quotation" },
      { status: 500 }
    );
  }
}
