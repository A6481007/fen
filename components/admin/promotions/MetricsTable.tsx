'use client';

import { useMemo } from "react";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DerivedMetrics, FilterState } from "./types";

type MetricsTableProps = {
  metrics: DerivedMetrics;
  campaignName?: string;
  filters?: FilterState;
  lastUpdated?: string | null;
};

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const normalize = (value?: string | null) =>
  value && value.trim().length > 0 ? value : null;

const safeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function MetricsTable({ metrics, campaignName, filters, lastUpdated }: MetricsTableProps) {
  const { t } = useTranslation();

  const rows = useMemo(
    () => [
      { label: t("admin.promotions.metrics.impressions"), value: metrics.impressions.toLocaleString() },
      { label: t("admin.promotions.metrics.clicks"), value: metrics.clicks.toLocaleString() },
      { label: t("admin.promotions.metrics.addToCarts"), value: metrics.addToCarts.toLocaleString() },
      { label: t("admin.promotions.metrics.conversions"), value: metrics.conversions.toLocaleString() },
      { label: t("admin.promotions.metrics.ctr"), value: `${metrics.ctr.toFixed(2)}%` },
      { label: t("admin.promotions.metrics.cvr"), value: `${metrics.cvr.toFixed(2)}%` },
      { label: t("admin.promotions.metrics.cartRate"), value: `${metrics.cartRate.toFixed(2)}%` },
      { label: t("admin.promotions.metrics.purchaseRate"), value: `${metrics.purchaseRate.toFixed(2)}%` },
      { label: t("admin.promotions.metrics.aov"), value: `$${metrics.aov.toFixed(2)}` },
      { label: t("admin.promotions.metrics.baselineAov"), value: `$${metrics.baselineAov.toFixed(2)}` },
      { label: t("admin.promotions.metrics.aovLift"), value: `${metrics.aovLift.toFixed(1)}%` },
      { label: t("admin.promotions.metrics.revenue"), value: `$${metrics.revenue.toLocaleString()}` },
      { label: t("admin.promotions.metrics.discountSpent"), value: `$${metrics.discountSpent.toLocaleString()}` },
      { label: t("admin.promotions.metrics.roi"), value: `${metrics.roi.toFixed(1)}%` },
    ],
    [metrics, t],
  );

  const filterSummary = useMemo(() => {
    const parts = [
      filters?.dateFrom || filters?.dateTo
        ? t("admin.promotions.metricsTable.datesRange", {
            from: filters?.dateFrom ?? t("admin.promotions.metricsTable.datesStart"),
            to: filters?.dateTo ?? t("admin.promotions.metricsTable.datesPresent"),
          })
        : t("admin.promotions.metricsTable.datesAll"),
      t("admin.promotions.metricsTable.channel", {
        value: normalize(filters?.channel) ?? t("admin.promotions.metricsTable.all"),
      }),
      t("admin.promotions.metricsTable.segment", {
        value: normalize(filters?.segment) ?? t("admin.promotions.metricsTable.all"),
      }),
      t("admin.promotions.metricsTable.device", {
        value: normalize(filters?.device) ?? t("admin.promotions.metricsTable.all"),
      }),
    ];

    const parsedLastUpdated = safeDate(lastUpdated);
    if (parsedLastUpdated) {
      parts.push(
        t("admin.promotions.metricsTable.lastUpdated", {
          date: parsedLastUpdated.toLocaleString(),
        }),
      );
    }

    return parts.join(" • ");
  }, [filters, lastUpdated, t]);

  const exportCsv = () => {
    const filenameBase =
      campaignName
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "promotion";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const headerBlock = [
      [t("admin.promotions.metricsTable.csv.campaign"), campaignName ?? t("admin.promotions.metricsTable.csv.promotion")],
      [t("admin.promotions.metricsTable.csv.dateFrom"), filters?.dateFrom ?? t("admin.promotions.metricsTable.csv.all")],
      [t("admin.promotions.metricsTable.csv.dateTo"), filters?.dateTo ?? t("admin.promotions.metricsTable.csv.all")],
      [t("admin.promotions.metricsTable.csv.channel"), normalize(filters?.channel) ?? t("admin.promotions.metricsTable.csv.all")],
      [t("admin.promotions.metricsTable.csv.segment"), normalize(filters?.segment) ?? t("admin.promotions.metricsTable.csv.all")],
      [t("admin.promotions.metricsTable.csv.device"), normalize(filters?.device) ?? t("admin.promotions.metricsTable.csv.all")],
      [t("admin.promotions.metricsTable.csv.lastUpdated"), lastUpdated ?? t("admin.promotions.metricsTable.csv.unknown")],
      [t("admin.promotions.metricsTable.csv.exportedAt"), new Date().toISOString()],
      [],
      [t("admin.promotions.metricsTable.csv.metric"), t("admin.promotions.metricsTable.csv.value")],
    ];

    const csvRows = headerBlock
      .concat(rows.map((row) => [row.label, row.value]))
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameBase}-analytics-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500">{filterSummary}</p>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" aria-hidden />
          {t("admin.promotions.metricsTable.exportCsv")}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.promotions.metricsTable.metric")}</TableHead>
            <TableHead className="text-right">{t("admin.promotions.metricsTable.value")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium text-gray-800">{row.label}</TableCell>
              <TableCell className="text-right text-gray-700">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
