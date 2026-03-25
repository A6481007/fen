"use client";

import AccountsOrdersList from "@/components/employee/AccountsOrdersList";
import { useTranslation } from "react-i18next";

export default function AccountsPageClient() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("employee.accounts.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("employee.accounts.subtitle")}
        </p>
      </div>

      <AccountsOrdersList />
    </div>
  );
}
