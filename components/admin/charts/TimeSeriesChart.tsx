'use client';

import { useMemo } from "react";
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type TimeSeriesDatum = Record<string, string | number>;

type SeriesDefinition = {
  dataKey: string;
  label: string;
  color?: string;
};

type TimeSeriesChartProps = {
  data: TimeSeriesDatum[];
  series?: SeriesDefinition[];
  dateKey?: string;
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
};

const defaultSeries: SeriesDefinition[] = [
  { dataKey: "value", label: "Value", color: "hsl(var(--chart-1))" },
];

const numberFormatter = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
};

const labelFormatter = (value: string | number) => {
  if (typeof value !== "string") return String(value);
  return value.length > 12 ? value.slice(0, 12) + "…" : value;
};

export function TimeSeriesChart({
  data,
  series,
  dateKey = "label",
  title = "Time Series",
  description = "Metric trends over time",
  isLoading = false,
  className,
}: TimeSeriesChartProps) {
  const resolvedSeries = series?.length ? series : defaultSeries;

  const chartConfig = useMemo<ChartConfig>(() => {
    return resolvedSeries.reduce((acc, current, index) => {
      acc[current.dataKey] = {
        label: current.label,
        color: current.color ?? `hsl(var(--chart-${(index % 5) + 1}))`,
      };
      return acc;
    }, {} as ChartConfig);
  }, [resolvedSeries]);

  const hasValues = data.some((point) =>
    resolvedSeries.some(
      (serie) => typeof point[serie.dataKey] === "number" && !Number.isNaN(point[serie.dataKey])
    )
  );

  const primaryKey = resolvedSeries[0]?.dataKey;
  const lastPoint = data[data.length - 1];
  const firstPoint = data[0];
  const latestValue =
    lastPoint && primaryKey && typeof lastPoint[primaryKey] === "number"
      ? (lastPoint[primaryKey] as number)
      : null;
  const firstValue =
    firstPoint && primaryKey && typeof firstPoint[primaryKey] === "number"
      ? (firstPoint[primaryKey] as number)
      : null;
  const changePct =
    firstValue && latestValue !== null
      ? ((latestValue - firstValue) / firstValue) * 100
      : null;

  if (isLoading) {
    return (
      <Card className={className} role="status" aria-live="polite">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length || !hasValues) {
    return (
      <Card className={className} role="status" aria-live="polite">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No time-series data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {latestValue !== null && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-right">
              <p className="text-xs text-muted-foreground">Latest</p>
              <p className="text-lg font-semibold">{latestValue.toLocaleString()}</p>
              {changePct !== null && (
                <p
                  className={`text-xs ${
                    changePct >= 0 ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {changePct >= 0 ? "+" : ""}
                  {changePct.toFixed(1)}% vs first point
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[360px]"
          role="img"
          aria-label={`${title} line chart`}
        >
          <LineChart
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={dateKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={labelFormatter}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => numberFormatter(value as number)}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `Date: ${String(value)}`}
                  formatter={(value, name) => {
                    const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                    const displayValue = Number.isFinite(numericValue) ? numericValue.toLocaleString() : value;

                    return [displayValue, chartConfig?.[name]?.label ?? name];
                  }}
                />
              }
            />
            <ChartLegend
              verticalAlign="top"
              content={<ChartLegendContent />}
              wrapperStyle={{ paddingBottom: 12 }}
            />
            {resolvedSeries.map((serie, index) => (
              <Line
                key={serie.dataKey}
                type="monotone"
                dataKey={serie.dataKey}
                stroke={`var(--color-${serie.dataKey}, ${
                  serie.color ?? `hsl(var(--chart-${(index % 5) + 1}))`
                })`}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
            <Brush
              dataKey={dateKey}
              height={24}
              travellerWidth={10}
              tickFormatter={labelFormatter}
              stroke="var(--color-value, hsl(var(--chart-1)))"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
