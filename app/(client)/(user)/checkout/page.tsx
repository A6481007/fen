import Container from "@/components/Container";
import { ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";
import { getOrderById } from "@/sanity/queries";
import { currentUser } from "@clerk/nextjs/server";
import { OrderCheckoutContent } from "@/components/checkout/OrderCheckoutContent";
import CheckoutBreadcrumb from "@/components/checkout/CheckoutBreadcrumb";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ORDER_STATUSES } from "@/lib/orderStatus";

interface Props {
  searchParams: Promise<{
    orderId?: string;
    order_id?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { orderId, order_id } = await searchParams;
  const resolvedOrderId = orderId ?? order_id;
  const user = await currentUser();

  // If there's an orderId, this is a payment for an existing order
  if (resolvedOrderId) {
    if (!user) {
      notFound();
    }

    const order = await getOrderById(resolvedOrderId);
    if (!order || order.clerkUserId !== user.id) {
      notFound();
    }
    const isQuotation =
      order.status === ORDER_STATUSES.QUOTATION_REQUESTED ||
      order.orderKind === "quotation";

    if (isQuotation) {
      return (
        <Container className="py-4 sm:py-6">
          <CheckoutFlow order={order} />
        </Container>
      );
    }

    return (
      <Container className="py-4 sm:py-6">
        <CheckoutBreadcrumb activeStep="payment" className="mb-4 sm:mb-6" />

        {/* Checkout Header */}
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
          <ShoppingBag className="w-6 h-6" aria-hidden="true" />
          <h1 className="text-xl font-bold sm:text-2xl">
            Complete Payment
          </h1>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link href="/user/orders">Back to Orders</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11">
            <Link href="/cart">View Cart</Link>
          </Button>
        </div>

        {/* Order Checkout Content */}
        <OrderCheckoutContent order={order} />
      </Container>
    );
  }

  // Regular checkout flow
  return (
    <Container className="py-4 sm:py-6">
      <CheckoutFlow />
    </Container>
  );
}
