'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

type VariantMetricsView = {
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cvr: number;
};

export type VariantAnalyticsView = {
  variants: Record<string, VariantMetricsView>;
  winner: string;
  confidence: number;
  sampleSize: {
    control: number;
    variantA: number;
    variantB: number;
  };
  startDate?: string;
  endDate?: string;
};

type ABTestResultsProps = {
  analytics: VariantAnalyticsView;
};

export function ABTestResults({ analytics }: ABTestResultsProps) {
  const { t } = useTranslation();
  const { variants, winner, confidence, sampleSize } = analytics;
  const winnerLabel = t(`admin.promotions.abTest.variants.${winner}`, winner);
  const formatVariantName = (name: string) =>
    t(`admin.promotions.abTest.variants.${name}`, name);

  return (
    <Card className="border border-gray-100/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-800">
          {t("admin.promotions.abTest.title")}
        </CardTitle>
        <p className="text-sm text-gray-500">
          {t("admin.promotions.abTest.winnerLabel")}{" "}
          <span className="font-semibold text-emerald-700">{winnerLabel}</span>{" "}
          {t("admin.promotions.abTest.confidence", { value: confidence })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs uppercase text-gray-500">{t("admin.promotions.abTest.sampleSize")}</p>
            <p className="font-semibold text-gray-900">
              {t("admin.promotions.abTest.control", { count: sampleSize.control })}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs uppercase text-gray-500">{t("admin.promotions.abTest.variantA")}</p>
            <p className="font-semibold text-gray-900">
              {sampleSize.variantA.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs uppercase text-gray-500">{t("admin.promotions.abTest.variantB")}</p>
            <p className="font-semibold text-gray-900">
              {sampleSize.variantB.toLocaleString()}
            </p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.promotions.abTest.table.variant")}</TableHead>
              <TableHead className="text-right">{t("admin.promotions.abTest.table.impressions")}</TableHead>
              <TableHead className="text-right">{t("admin.promotions.abTest.table.clicks")}</TableHead>
              <TableHead className="text-right">{t("admin.promotions.abTest.table.conversions")}</TableHead>
              <TableHead className="text-right">{t("admin.promotions.abTest.table.ctr")}</TableHead>
              <TableHead className="text-right">{t("admin.promotions.abTest.table.cvr")}</TableHead>
              <TableHead className="text-right">{t("admin.promotions.abTest.table.revenue")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(variants).map((variant) => {
              const isWinner = variant.name === winner;
              return (
                <TableRow key={variant.name} className={isWinner ? "bg-emerald-50/70" : ""}>
                  <TableCell className="font-semibold text-gray-900">
                    {formatVariantName(variant.name)}
                    {isWinner ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        {t("admin.promotions.abTest.winnerBadge")}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {variant.impressions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {variant.clicks.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {variant.conversions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {variant.ctr.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {variant.cvr.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    ${variant.revenue.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
