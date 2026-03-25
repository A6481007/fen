'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

type UsageMeterProps = {
  used: number;
  limit: number;
};

export function UsageMeter({ used, limit }: UsageMeterProps) {
  const { t } = useTranslation();
  const safeLimit = limit > 0 ? limit : 0;
  const percentage = safeLimit > 0 ? Math.min(100, (used / safeLimit) * 100) : 0;
  const remaining = Math.max(0, safeLimit - used);

  return (
    <Card className="border border-gray-100/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          {t("admin.promotions.usageMeter.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-semibold text-gray-900">{used.toLocaleString()}</p>
            <p className="text-xs text-gray-500">
              {safeLimit
                ? t("admin.promotions.usageMeter.conversionsOfLimit", {
                    limit: safeLimit.toLocaleString(),
                  })
                : t("admin.promotions.usageMeter.conversionsNoLimit")}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {safeLimit
              ? t("admin.promotions.usageMeter.remainingBadge", {
                  remaining: remaining.toLocaleString(),
                })
              : t("admin.promotions.usageMeter.noCap")}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {t("admin.promotions.usageMeter.percentOfLimit", {
              percent: percentage.toFixed(1),
            })}
          </span>
          <span>
            {safeLimit
              ? t("admin.promotions.usageMeter.remaining", {
                  remaining: remaining.toLocaleString(),
                })
              : t("admin.promotions.usageMeter.unlimited")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
