"use client";

import OrdersList from "@/components/employee/OrdersList";
import SalesContactProfileCard from "@/components/employee/SalesContactProfileCard";
import { useTranslation } from "react-i18next";
import type { Employee } from "@/types/employee";

type OrdersPageClientProps = {
  employee: Employee;
};

export default function OrdersPageClient({ employee }: OrdersPageClientProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("employee.orders.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("employee.orders.subtitle")}
        </p>
      </div>
      {employee.role === "callcenter" && <SalesContactProfileCard />}
      <OrdersList employee={employee} />
    </div>
  );
}
