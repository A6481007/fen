"use client";

import { Check, Home, Package, ShoppingBag, Calendar, Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MY_ORDERS_QUERYResult } from "@/sanity.types";
import { client } from "@/sanity/lib/client";
import { defineQuery } from "next-sanity";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PriceFormatter from "@/components/PriceFormatter";
import { format } from "date-fns";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

const SuccessPage = () => {
  const [orders, setOrders] = useState<MY_ORDERS_QUERYResult>([]);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");
  const sessionId = searchParams.get("session_id");
  const paymentMethodParam = searchParams.get("payment_method") ?? "";
  const normalizedPaymentMethod = paymentMethodParam.toLowerCase();
  const isCodPayment = normalizedPaymentMethod === "cod";
  const isClerkPayment =
    normalizedPaymentMethod === "clerk" || normalizedPaymentMethod === "invoice";
  const isClerkPaymentComplete = isClerkPayment && Boolean(sessionId);
  const { t } = useTranslation();
  const heroTitleKey = isClerkPaymentComplete
    ? "client.success.hero.title.paymentComplete"
    : isClerkPayment
      ? "client.success.hero.title.quotation"
      : "client.success.hero.title.orderPlaced";
  const heroMessageKey = isClerkPaymentComplete
    ? "client.success.hero.message.paymentComplete"
    : isClerkPayment
      ? "client.success.hero.message.quotation"
      : isCodPayment
        ? "client.success.hero.message.cod"
        : "client.success.hero.message.default";
  const breadcrumbOrderLabel = orderNumber
    ? t("client.checkoutSuccess.breadcrumb.orderNumber", { order: orderNumber })
    : t("client.checkoutSuccess.breadcrumb.order");
  const progressSteps = [
    {
      icon: Package,
      title: t("client.success.progress.step.processing.title"),
      description: t("client.success.progress.step.processing.description"),
      bg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: ShoppingBag,
      title: t("client.success.progress.step.shipping.title"),
      description: t("client.success.progress.step.shipping.description"),
      bg: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
    {
      icon: Check,
      title: t("client.success.progress.step.delivery.title"),
      description: t("client.success.progress.step.delivery.description"),
      bg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  const { user } = useUser();
  const userId = user?.id;

  const query =
    defineQuery(`*[_type == 'order' && clerkUserId == $userId] | order(orderDate desc){
  ...,products[]{
    ...,product->
  }
}`);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        console.log("User ID not found. Cannot fetch orders.");
        return;
      }

      try {
        const ordersData = await client.fetch(query, { userId });
        setOrders(ordersData as MY_ORDERS_QUERYResult);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchData();
  }, [userId, query]);

  const breadcrumbOrdersLabel = t("client.checkoutSuccess.breadcrumb.orders");

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <DynamicBreadcrumb
          customItems={[
            { label: breadcrumbOrdersLabel, href: "/user/orders" },
            { label: breadcrumbOrderLabel },
          ]}
          className="mb-6"
        />
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <Check className="text-white w-12 h-12" />
          </motion.div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t(heroTitleKey)}
          </h1>

          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            {t(heroMessageKey)}
          </p>

          {orderNumber && (
            <div className="bg-white rounded-lg p-6 shadow-md inline-block">
              <div className="flex items-center justify-center gap-3">
                <Package className="w-5 h-5 text-green-600" />
                <span className="text-gray-700 font-medium">
                  {t("client.success.hero.orderNumberLabel")}
                </span>
                <span className="text-xl font-bold text-green-600">
                  {orderNumber}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Order Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8"
        >
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  {t("client.success.progress.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  {progressSteps.map((step) => (
                    <div key={step.title} className="space-y-3">
                      <div
                        className={`${step.bg} w-12 h-12 rounded-full flex items-center justify-center mx-auto`}
                      >
                        <step.icon className={`w-6 h-6 ${step.iconColor}`} />
                      </div>
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-600">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {t("client.success.recentOrders.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(showAllOrders ? orders : orders.slice(0, 2)).map(
                    (order) => (
                      <div
                        key={order?._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Order #
                              {order.orderNumber?.slice(-8) ||
                                order._id.slice(-8)}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {order.orderDate
                                  ? format(
                                      new Date(order.orderDate),
                                      "MMM dd, yyyy"
                                    )
                                  : "N/A"}
                              </div>
                              <PriceFormatter amount={order.totalPrice || 0} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              order.status === "completed" ||
                              order.status === "delivered"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {order.status || "pending"}
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/user/orders/${order._id}`}>
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {orders.length > 2 && (
                    <div className="text-center pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAllOrders(!showAllOrders)}
                        className="text-sm"
                      >
                        {showAllOrders
                          ? t("client.success.recentOrders.button.showLess")
                          : t("client.success.recentOrders.button.showAll", {
                              count: orders.length,
                            })}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          <Button asChild size="lg" className="h-12">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              {t("client.success.actions.continueShopping")}
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-12">
            <Link
              href="/user/orders"
              className="flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              {t("client.success.actions.trackOrders")}
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-12">
            <Link
              href="/shop"
              className="flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              {t("client.success.actions.shopMore")}
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessPage;
