"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PaymentsPageClient() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("employee.payments.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("employee.payments.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t("employee.payments.collections.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">
              {t("employee.payments.collections.emptyTitle")}
            </p>
            <p className="text-sm">
              {t("employee.payments.collections.emptySubtitle")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
