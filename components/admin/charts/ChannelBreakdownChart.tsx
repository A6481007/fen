'use client';

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

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

type ChannelBreakdownItem = {
  channel: string;
  value: number;
};

type ChannelBreakdownChartProps = {
  data: ChannelBreakdownItem[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
};

const palette = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ChannelBreakdownChart({
  data,
  title = "Channel Breakdown",
  description = "Distribution across acquisition and messaging channels",
  isLoading = false,
  className,
}: ChannelBreakdownChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.some((item) => item.value > 0);

  const chartConfig = useMemo<ChartConfig>(() => {
    return data.reduce((acc, item, index) => {
      acc[item.channel] = {
        label: item.channel,
        color: item.value > 0 ? palette[index % palette.length] : "hsl(var(--muted))",
      };
      return acc;
    }, {} as ChartConfig);
  }, [data]);

  if (isLoading) {
    return (
      <Card className={className} role="status" aria-live="polite">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-[220px] w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length || !hasData) {
    return (
      <Card className={className} role="status" aria-live="polite">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No channel data available.</p>
        </CardContent>
      </Card>
    );
  }

  const topChannel = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              Top: {topChannel.channel} ({((topChannel.value / total) * 100).toFixed(1)}%)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer
          config={chartConfig}
          className="h-[280px]"
          role="img"
          aria-label={`${title} pie chart`}
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="channel"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.channel}
                  fill={`var(--color-${entry.channel}, ${palette[index % palette.length]})`}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                    const percent = total > 0 ? (numericValue / total) * 100 : 0;
                    const label =
                      chartConfig?.[item.payload?.channel as keyof ChartConfig]?.label || name;

                    return [`${numericValue.toLocaleString()} (${percent.toFixed(1)}%)`, label];
                  }}
                  labelFormatter={(value) => `Channel: ${value as string}`}
                />
              }
            />
            <ChartLegend
              verticalAlign="bottom"
              content={<ChartLegendContent nameKey="channel" />}
            />
          </PieChart>
        </ChartContainer>

        <div className="space-y-2" aria-label="Channel distribution details" role="list">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const color = palette[index % palette.length];

            return (
              <div key={item.channel} className="space-y-1" role="listitem">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="font-medium text-foreground">{item.channel}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
