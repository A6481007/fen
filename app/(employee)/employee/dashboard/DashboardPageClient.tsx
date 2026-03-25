"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  AlertCircle,
  Package,
  Users,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function DashboardPageClient() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("employee.dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("employee.dashboard.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5" />
              {t("employee.dashboard.cards.totalOrders.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("employee.dashboard.cards.totalOrders.caption")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" />
              {t("employee.dashboard.cards.activeEmployees.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("employee.dashboard.cards.activeEmployees.caption")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5" />
              {t("employee.dashboard.cards.performance.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">-</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("employee.dashboard.cards.performance.caption")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            {t("employee.dashboard.analytics.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">
              {t("employee.dashboard.analytics.emptyTitle")}
            </p>
            <p className="text-sm">
              {t("employee.dashboard.analytics.emptySubtitle")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
