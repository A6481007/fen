import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";

import Container from "@/components/Container";
import CheckoutSuccessBreadcrumb from "@/components/checkout/CheckoutSuccessBreadcrumb";
import CheckoutSuccessHero from "@/components/checkout/CheckoutSuccessHero";
import CheckoutSuccessMissing from "@/components/checkout/CheckoutSuccessMissing";
import CheckoutSuccessSummary from "@/components/checkout/CheckoutSuccessSummary";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/orderStatus";
import { backendClient } from "@/sanity/lib/backendClient";
import { getOrderById } from "@/sanity/queries";

interface Props {
  searchParams: Promise<{
    session_id?: string;
    orderId?: string;
    order_id?: string;
    orderNumber?: string;
    payment_method?: string;
  }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id;
  let orderId = params.orderId ?? params.order_id;
  const fallbackOrderNumber = params.orderNumber;
  const paymentMethodParam = params.payment_method;
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  let paymentStatusKey: string | null = null;

  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!orderId && session.metadata?.orderId) {
        orderId = session.metadata.orderId;
      }

      if (session.payment_status === "paid" && orderId) {
        const orderRecord = await backendClient.fetch<{
          _id: string;
          paymentStatus?: string;
          status?: string;
          paymentMethod?: string;
          stripeCheckoutSessionId?: string;
          stripePaymentIntentId?: string;
          stripeCustomerId?: string;
        } | null>(
          `*[_type == "order" && _id == $orderId][0]{
            _id,
            paymentStatus,
            status,
            paymentMethod,
            stripeCheckoutSessionId,
            stripePaymentIntentId,
            stripeCustomerId
          }`,
          { orderId }
        );

        if (orderRecord) {
          const needsStripeIds =
            !orderRecord.stripeCheckoutSessionId ||
            !orderRecord.stripePaymentIntentId;
          const needsPaymentStatus =
            orderRecord.paymentStatus !== PAYMENT_STATUSES.PAID;

          if (needsStripeIds || needsPaymentStatus) {
            const updateData: Record<string, unknown> = {
              paymentStatus: PAYMENT_STATUSES.PAID,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string,
              paymentCompletedAt: new Date().toISOString(),
            };

            if (session.customer) {
              updateData.stripeCustomerId = session.customer as string;
            }

            if (
              orderRecord.paymentMethod !==
                PAYMENT_METHODS.CASH_ON_DELIVERY &&
              orderRecord.status === ORDER_STATUSES.PENDING
            ) {
              updateData.status = ORDER_STATUSES.PENDING;
            }

            await backendClient.patch(orderId).set(updateData).commit();
          }
        }
      } else if (session.payment_status !== "paid") {
        paymentStatusKey = "client.checkoutSuccess.payment.pending";
      }
    } catch (error) {
      console.error("Failed to confirm Stripe payment:", error);
      paymentStatusKey = "client.checkoutSuccess.payment.error";
    }
  } else if (sessionId && !process.env.STRIPE_SECRET_KEY) {
    paymentStatusKey = "client.checkoutSuccess.payment.unavailable";
  }

  if (!orderId) {
    return <CheckoutSuccessMissing />;
  }

  const order = await getOrderById(orderId);

  if (!order || order.clerkUserId !== user.id) {
    notFound();
  }

  const normalizedPaymentMethod = paymentMethodParam?.toLowerCase();
  const isCodRequest = normalizedPaymentMethod === "cod";
  const isClerkRequest =
    normalizedPaymentMethod === "clerk" || normalizedPaymentMethod === "invoice";
  const isQuotationOrder =
    order.status === ORDER_STATUSES.QUOTATION_REQUESTED;
  const isCodOrder =
    order.paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY;
  const isClerkOrder = order.paymentMethod === PAYMENT_METHODS.CLERK;
  const showCodMessaging = isCodRequest || isCodOrder;
  const showClerkMessaging =
    isClerkRequest || isClerkOrder || isQuotationOrder;
  const isStripeSession = Boolean(sessionId);
  const showStripeMessaging =
    isStripeSession && !showClerkMessaging && !showCodMessaging;

  const displayOrderNumber =
    order.orderNumber || fallbackOrderNumber || order._id.slice(-8);
  const email =
    order.email || user.emailAddresses?.[0]?.emailAddress || undefined;
  const headlineKey = showClerkMessaging
    ? "client.checkoutSuccess.headline.quotation"
    : showStripeMessaging
      ? "client.checkoutSuccess.headline.paid"
      : "client.checkoutSuccess.headline.thankYou";
  const subheadingKey = showClerkMessaging
    ? "client.checkoutSuccess.subheading.quotation"
    : showStripeMessaging
      ? "client.checkoutSuccess.subheading.paid"
      : "client.checkoutSuccess.subheading.placed";
  const detailKey = showClerkMessaging
    ? "client.checkoutSuccess.detail.invoice"
    : showCodMessaging
      ? "client.checkoutSuccess.detail.cod"
      : showStripeMessaging
        ? "client.checkoutSuccess.detail.processing"
        : undefined;
  const emailKey = showClerkMessaging
    ? email
      ? "client.checkoutSuccess.email.invoiceWithEmail"
      : "client.checkoutSuccess.email.invoice"
    : email
      ? "client.checkoutSuccess.email.confirmationWithEmail"
      : "client.checkoutSuccess.email.confirmation";
  const summaryProducts =
    order.products?.map(
      (
        item: {
          product?: { _id?: string; name?: string; price?: number };
          quantity?: number;
          lineTotal?: number;
          unitPrice?: number;
        },
        index: number
      ) => {
        const quantity = item.quantity ?? 0;
        const unitPrice =
          item.unitPrice ??
          (item.product?.price ?? 0);
        const lineTotal =
          item.lineTotal ??
          unitPrice * quantity;

        return {
          id: item.product?._id ?? `item-${index}`,
          name: item.product?.name,
          quantity,
          unitPrice,
          lineTotal,
        };
      }
    ) ?? [];
  const subtotal = order.subtotal ?? 0;
  const shipping = order.shipping ?? 0;
  const tax = order.tax ?? 0;
  const total = order.totalPrice ?? 0;
  const discount = order.amountDiscount ?? 0;
  const invoiceUrl = order.invoice?.hosted_invoice_url;
  const canDownloadQuotation = Boolean(order.purchaseOrder);

  return (
    <Container className="py-8">
      <CheckoutSuccessBreadcrumb orderNumber={displayOrderNumber} />
      <div className="max-w-3xl mx-auto space-y-6">
        <CheckoutSuccessHero
          paymentStatusKey={paymentStatusKey ?? undefined}
          headlineKey={headlineKey}
          headlineParams={{ order: displayOrderNumber }}
          subheadingKey={subheadingKey}
          subheadingParams={{ order: displayOrderNumber }}
          detailKey={detailKey ?? undefined}
          orderNumber={displayOrderNumber}
          emailKey={emailKey}
          emailParams={email ? { email } : undefined}
        />
        <CheckoutSuccessSummary
          subtotal={subtotal}
          discount={discount}
          shipping={shipping}
          tax={tax}
          total={total}
          orderId={order._id}
          products={summaryProducts}
          invoiceUrl={invoiceUrl ?? undefined}
          canDownloadQuotation={canDownloadQuotation}
        />
      </div>
    </Container>
  );
}
