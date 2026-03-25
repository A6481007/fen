'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DerivedMetrics } from "./types";

type MetricsTableProps = {
  metrics: DerivedMetrics;
};

export function MetricsTable({ metrics }: MetricsTableProps) {
  const rows = [
    { label: "Impressions", value: metrics.impressions.toLocaleString() },
    { label: "Clicks", value: metrics.clicks.toLocaleString() },
    { label: "Add to carts", value: metrics.addToCarts.toLocaleString() },
    { label: "Conversions", value: metrics.conversions.toLocaleString() },
    { label: "CTR", value: `${metrics.ctr.toFixed(2)}%` },
    { label: "CVR", value: `${metrics.cvr.toFixed(2)}%` },
    { label: "Cart rate", value: `${metrics.cartRate.toFixed(2)}%` },
    { label: "Purchase rate", value: `${metrics.purchaseRate.toFixed(2)}%` },
    { label: "Average order value", value: `$${metrics.aov.toFixed(2)}` },
    { label: "Baseline AOV", value: `$${metrics.baselineAov.toFixed(2)}` },
    { label: "AOV lift", value: `${metrics.aovLift.toFixed(1)}%` },
    { label: "Revenue", value: `$${metrics.revenue.toLocaleString()}` },
    { label: "Discount spent", value: `$${metrics.discountSpent.toLocaleString()}` },
    { label: "ROI", value: `${metrics.roi.toFixed(1)}%` },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Value</TableHead>
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
