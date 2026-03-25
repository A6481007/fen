'use client';

import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  change?: number;
  icon?: ReactNode;
  helperText?: string;
  highlight?: boolean;
};

export function MetricCard({
  title,
  value,
  change = 0,
  icon,
  helperText,
  highlight,
}: MetricCardProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const ChangeIcon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  return (
    <Card
      className={cn(
        "h-full border border-gray-100/70 shadow-sm",
        highlight ? "ring-2 ring-emerald-200" : ""
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {typeof icon === "string" ? (
          <span className="text-lg">{icon}</span>
        ) : (
          icon
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-gray-900">{value}</span>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 border-gray-200 text-xs font-medium",
              isPositive && "border-emerald-100 bg-emerald-50 text-emerald-700",
              isNegative && "border-rose-100 bg-rose-50 text-rose-700"
            )}
          >
            <ChangeIcon className="h-3 w-3" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </Badge>
        </div>
        {helperText ? (
          <p className="text-xs text-gray-500 leading-relaxed">{helperText}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
