"use client";

import PackingOrdersList from "@/components/employee/PackingOrdersList";
import { useTranslation } from "react-i18next";
import type { Employee } from "@/types/employee";

type PackingPageClientProps = {
  employee: Employee;
};

export default function PackingPageClient({ employee }: PackingPageClientProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("employee.packing.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("employee.packing.subtitle")}
        </p>
      </div>

      <PackingOrdersList employee={employee} />
    </div>
  );
}
