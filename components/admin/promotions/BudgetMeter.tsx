'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type BudgetMeterProps = {
  spent: number;
  cap: number;
};

export function BudgetMeter({ spent, cap }: BudgetMeterProps) {
  const { t } = useTranslation();
  const safeCap = cap > 0 ? cap : 0;
  const percentage = safeCap > 0 ? Math.min(100, (spent / safeCap) * 100) : 0;
  const remaining = Math.max(0, safeCap - spent);
  const isNearCap = percentage >= 85;

  return (
    <Card className="border border-gray-100/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          {t("admin.promotions.budgetMeter.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-semibold text-gray-900">${spent.toLocaleString()}</p>
            <p className="text-xs text-gray-500">
              {t("admin.promotions.budgetMeter.spentOf", {
                spent: `$${spent.toLocaleString()}`,
                cap: `$${safeCap.toLocaleString()}`,
              })}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isNearCap ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
            )}
          >
            {isNearCap
              ? t("admin.promotions.budgetMeter.watchSpend")
              : t("admin.promotions.budgetMeter.onTrack")}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all",
              isNearCap && "from-amber-500 to-rose-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{t("admin.promotions.budgetMeter.used", { percent: percentage.toFixed(1) })}</span>
          <span>
            {t("admin.promotions.budgetMeter.remaining", {
              amount: `$${remaining.toLocaleString()}`,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
