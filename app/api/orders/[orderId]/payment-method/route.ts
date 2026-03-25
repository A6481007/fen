import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { writeClient } from "@/sanity/lib/client";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/orderStatus";

export async function PATCH(
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

    const order = await writeClient.fetch<{
      _id: string;
      orderNumber?: string;
      clerkUserId: string;
      status?: string;
      paymentStatus?: string;
      paymentMethod?: string;
      stripeCheckoutSessionId?: string;
      stripePaymentIntentId?: string;
    } | null>(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id,
        orderNumber,
        clerkUserId,
        status,
        paymentStatus,
        paymentMethod,
        stripeCheckoutSessionId,
        stripePaymentIntentId
      }`,
      { orderId, clerkUserId: user.id }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot update payment method for cancelled orders." },
        { status: 400 }
      );
    }

    if (order.paymentStatus === PAYMENT_STATUSES.PAID) {
      return NextResponse.json(
        { error: "Payment method cannot be changed after payment is completed." },
        { status: 400 }
      );
    }

    if (order.stripeCheckoutSessionId) {
      return NextResponse.json(
        { error: "Payment method cannot be changed after checkout has started." },
        { status: 400 }
      );
    }

    const canChangeForQuotation =
      order.status === ORDER_STATUSES.QUOTATION_REQUESTED;
    const canChangeForCreditRejection =
      order.paymentStatus === PAYMENT_STATUSES.CREDIT_REJECTED;

    if (!canChangeForQuotation && !canChangeForCreditRejection) {
      return NextResponse.json(
        {
          error:
            "Payment method can only be updated before checkout or after credit rejection.",
        },
        { status: 400 }
      );
    }

    if (
      paymentMethod === PAYMENT_METHODS.CREDIT &&
      canChangeForCreditRejection
    ) {
      return NextResponse.json(
        { error: "Credit payment cannot be re-requested after rejection." },
        { status: 400 }
      );
    }

    if (
      paymentMethod === PAYMENT_METHODS.CLERK ||
      paymentMethod === PAYMENT_METHODS.CREDIT
    ) {
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
          {
            email: user.emailAddresses[0]?.emailAddress ?? "",
            clerkUserId: user.id,
          }
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
          {
            error:
              paymentMethod === PAYMENT_METHODS.CLERK
                ? "Invoice payment is for dealer accounts only"
                : "Credit payment is for dealer accounts only",
          },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      paymentMethod,
      paymentStatus:
        paymentMethod === PAYMENT_METHODS.CREDIT
          ? PAYMENT_STATUSES.CREDIT_REQUESTED
          : PAYMENT_STATUSES.PENDING,
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
      paymentMethod: updatedOrder.paymentMethod,
      paymentStatus: updatedOrder.paymentStatus,
    });
  } catch (error) {
    console.error("Error updating payment method:", error);
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}
