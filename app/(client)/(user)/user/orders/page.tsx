import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMyOrders } from "@/sanity/helpers";
import OrdersPageClient from "./OrdersPageClient";

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

async function UserOrdersPage({ searchParams }: OrdersPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { page } = await searchParams;
  const currentPage = parseInt(page || "1", 10);
  const ordersPerPage = 20;

  const orderData = await getMyOrders(user.id, currentPage, ordersPerPage);
  const { orders, totalCount, totalPages, hasNextPage, hasPrevPage } =
    orderData;

  return (
    <OrdersPageClient
      orders={orders}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={currentPage}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
    />
  );
}

export default UserOrdersPage;
