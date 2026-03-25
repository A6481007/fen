"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  DollarSign,
  Gauge,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SolutionMetricsProps {
  metrics: Array<{
    metricLabel: string;
    metricValue: string;
    metricDescription?: string;
  }>;
  variant?: "hero" | "card" | "inline";
  className?: string;
}

type MetricTone = "positive" | "neutral";

const METRIC_ICON_RULES: Array<{ match: string[]; icon: LucideIcon }> = [
  { match: ["roi", "return", "profit"], icon: TrendingUp },
  { match: ["time", "timeline", "duration"], icon: Clock },
  { match: ["cost", "savings", "price"], icon: DollarSign },
  { match: ["uptime", "performance"], icon: Gauge },
  { match: ["reduction", "decrease"], icon: ArrowDown },
  { match: ["increase", "growth"], icon: ArrowUp },
];

const POSITIVE_KEYWORDS = [
  "roi",
  "return",
  "profit",
  "savings",
  "uptime",
  "performance",
  "reduction",
  "decrease",
  "increase",
  "growth",
];

const NUMBER_REGEX = /-?\d[\d,]*(?:\.\d+)?/g;

const getMetricIcon = (label?: string) => {
  const normalized = (label || "").toLowerCase();
  const match = METRIC_ICON_RULES.find((rule) =>
    rule.match.some((keyword) => normalized.includes(keyword))
  );
  return match?.icon ?? CheckCircle;
};

const getMetricTone = (label?: string): MetricTone => {
  const normalized = (label || "").toLowerCase();
  const isPositive = POSITIVE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  return isPositive ? "positive" : "neutral";
};

const formatNumber = (value: number, decimals: number, useGrouping: boolean) => {
  const fixed = value.toFixed(decimals);
  if (!useGrouping) return fixed;
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
};

const parseMetricNumber = (value: string) => {
  if (!value) return null;
  const matches = value.match(NUMBER_REGEX);
  if (!matches || matches.length !== 1) return null;

  const numberText = matches[0];
  const numericValue = Number.parseFloat(numberText.replace(/,/g, ""));
  if (!Number.isFinite(numericValue)) return null;

  const index = value.indexOf(numberText);
  const prefix = value.slice(0, index);
  const suffix = value.slice(index + numberText.length);
  const decimals = numberText.includes(".")
    ? numberText.split(".")[1]?.length || 0
    : 0;
  const useGrouping = numberText.includes(",");

  return {
    value: numericValue,
    prefix,
    suffix,
    decimals,
    useGrouping,
  };
};

const MetricValue = ({
  value,
  animate,
}: {
  value: string;
  animate: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const parsed = parseMetricNumber(value);
    if (!parsed) {
      setDisplayValue(value);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(value);
      return;
    }

    let animationFrame = 0;
    const durationMs = 1200;
    const startTime = performance.now();
    const fromValue = 0;
    const toValue = parsed.value;

    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const currentValue = fromValue + (toValue - fromValue) * eased;
      const formattedValue = formatNumber(
        currentValue,
        parsed.decimals,
        parsed.useGrouping
      );
      setDisplayValue(`${parsed.prefix}${formattedValue}${parsed.suffix}`);

      if (elapsed < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      } else {
        setDisplayValue(
          `${parsed.prefix}${formatNumber(
            parsed.value,
            parsed.decimals,
            parsed.useGrouping
          )}${parsed.suffix}`
        );
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [animate, value]);

  return <span>{displayValue}</span>;
};

const SolutionMetrics = ({
  metrics,
  variant = "hero",
  className,
}: SolutionMetricsProps) => {
  const safeMetrics = Array.isArray(metrics) ? metrics.filter(Boolean) : [];
  const visibleMetrics =
    variant === "hero" ? safeMetrics : safeMetrics.slice(0, 3);

  const gridClass = useMemo(() => {
    if (variant === "hero") {
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
    }
    if (variant === "card") {
      const columnClass =
        visibleMetrics.length <= 1
          ? "grid-cols-1"
          : visibleMetrics.length > 2
          ? "grid-cols-3"
          : "grid-cols-2";
      return cn(
        "grid gap-2",
        columnClass
      );
    }
    return "flex flex-wrap items-center gap-2";
  }, [variant, visibleMetrics.length]);

  if (visibleMetrics.length === 0) return null;

  return (
    <div className={cn(gridClass, className)} data-variant={variant}>
      {visibleMetrics.map((metric, index) => {
        const label = metric.metricLabel || "Metric";
        const value = metric.metricValue || "TBD";
        const description = metric.metricDescription;
        const Icon = getMetricIcon(label);
        const tone = getMetricTone(label);
        const isPositive = tone === "positive";

        const toneStyles = {
          icon: isPositive ? "text-emerald-700" : "text-amber-700",
          iconBg: isPositive ? "bg-emerald-100" : "bg-amber-100",
          label: isPositive ? "text-emerald-700" : "text-amber-700",
          value: isPositive ? "text-emerald-900" : "text-amber-900",
          card: isPositive
            ? "border-emerald-100 bg-emerald-50/60"
            : "border-amber-100 bg-amber-50/60",
          badge: isPositive
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800",
        };

        if (variant === "hero") {
          return (
            <Card
              key={`${label}-${index}`}
              className={cn("border shadow-sm", toneStyles.card)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full",
                      toneStyles.iconBg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", toneStyles.icon)} />
                  </div>
                  <div className="space-y-1">
                    <p
                      className={cn(
                        "text-xs uppercase tracking-wide",
                        toneStyles.label
                      )}
                    >
                      {label}
                    </p>
                    <p
                      className={cn(
                        "text-2xl sm:text-3xl font-semibold",
                        toneStyles.value
                      )}
                    >
                      <MetricValue value={value} animate />
                    </p>
                  </div>
                </div>
                {description ? (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {description}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        }

        if (variant === "card") {
          return (
            <div
              key={`${label}-${index}`}
              className={cn(
                "rounded-lg border bg-white p-3 shadow-sm",
                toneStyles.card
              )}
              title={description}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    toneStyles.iconBg
                  )}
                >
                  <Icon className={cn("h-4 w-4", toneStyles.icon)} />
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[10px] uppercase tracking-wide line-clamp-1",
                      toneStyles.label
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-shop_dark_green">
                    {value}
                  </p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <Badge
            key={`${label}-${index}`}
            variant="outline"
            className={cn("gap-2", toneStyles.badge)}
            title={description}
          >
            <Icon className={cn("h-3.5 w-3.5", toneStyles.icon)} />
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide",
                toneStyles.label
              )}
            >
              {label}
            </span>
            <span className={cn("text-xs font-semibold", toneStyles.value)}>
              {value}
            </span>
          </Badge>
        );
      })}
    </div>
  );
};

export default SolutionMetrics;
