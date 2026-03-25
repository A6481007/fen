"use client";

import OrdersClient from "@/components/OrdersClient";
import UserOrdersHeader from "@/components/orders/UserOrdersHeader";
import type { MY_ORDERS_QUERYResult } from "@/sanity.types";

type OrdersPageClientProps = {
  orders: MY_ORDERS_QUERYResult;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const OrdersPageClient = ({
  orders,
  totalCount,
  totalPages,
  currentPage,
  hasNextPage,
  hasPrevPage,
}: OrdersPageClientProps) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <UserOrdersHeader loaded={orders.length} total={totalCount} />

      <OrdersClient
        initialOrders={orders}
        totalPages={totalPages}
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
      />
    </div>
  );
};

export default OrdersPageClient;
