"use client";

import DeliveryOrdersList from "@/components/employee/DeliveryOrdersList";
import { useTranslation } from "react-i18next";

export default function DeliveriesPageClient() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("employee.deliveries.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("employee.deliveries.subtitle")}
        </p>
      </div>

      <DeliveryOrdersList />
    </div>
  );
}
