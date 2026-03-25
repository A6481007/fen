import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderById } from "@/sanity/queries";
import { currentUser } from "@clerk/nextjs/server";
import OrderDetailsPage from "@/components/OrderDetailsPage";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return {
      title: "Order Not Found",
    };
  }

  return {
    title: `Order ${order.orderNumber} - NCSSHOP`,
    description: `Order details for ${order.customerName}`,
  };
}

export default async function OrderDetailsPageRoute({ params }: Props) {
  const user = await currentUser();
  const { id } = await params;

  if (!user) {
    notFound();
  }

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  // Security check: ensure user can only view their own orders
  if (order.clerkUserId !== user.id) {
    notFound();
  }

  return (
    <div className="w-full">
      <OrderDetailsPage order={order} />
    </div>
  );
}
