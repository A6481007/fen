"use client";

import "@/app/i18n";
import { useTranslation } from "react-i18next";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";

type CheckoutSuccessBreadcrumbProps = {
  orderNumber?: string;
};

const CheckoutSuccessBreadcrumb = ({ orderNumber }: CheckoutSuccessBreadcrumbProps) => {
  const { t } = useTranslation();
  const orderLabel = orderNumber
    ? t("client.checkoutSuccess.breadcrumb.orderNumber", { order: orderNumber })
    : t("client.checkoutSuccess.breadcrumb.order");

  const items = [
    { label: t("client.checkoutSuccess.breadcrumb.orders"), href: "/user/orders" },
    { label: orderLabel },
  ];

  return <DynamicBreadcrumb customItems={items} className="mb-6" />;
};

export default CheckoutSuccessBreadcrumb;
