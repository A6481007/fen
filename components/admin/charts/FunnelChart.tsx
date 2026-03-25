'use client';

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
  TooltipProps,
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type FunnelStage = {
  stage: string;
  value: number;
};

type FunnelChartProps = {
  data: FunnelStage[];
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

export function FunnelChart({
  data,
  title = "Funnel Performance",
  description = "Stage-to-stage conversion health",
  isLoading = false,
  className,
}: FunnelChartProps) {
  const processedData = useMemo(() => {
    return data.map((stage, index) => {
      const previous = index > 0 ? data[index - 1].value : null;
      const dropOff = previous !== null ? Math.max(previous - stage.value, 0) : 0;
      const dropOffPct =
        previous && previous > 0 ? Number(((dropOff / previous) * 100).toFixed(1)) : 0;
      const conversionPct =
        data[0]?.value > 0 ? Number(((stage.value / data[0].value) * 100).toFixed(1)) : 0;

      return {
        ...stage,
        dropOff,
        dropOffPct,
        conversionPct,
      };
    });
  }, [data]);

  const hasData = processedData.some((item) => item.value > 0);
  const maxValue = processedData.reduce((max, item) => Math.max(max, item.value), 0);

  if (isLoading) {
    return (
      <Card className={className} role="status" aria-live="polite">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="h-10 w-full animate-pulse rounded-md bg-muted" />
          ))}
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
          <p className="text-sm text-muted-foreground">No funnel data available.</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig: ChartConfig = {
    value: { label: "Volume", color: "hsl(var(--chart-1))" },
    dropOffPct: { label: "Drop-off", color: "hsl(var(--chart-2))" },
  };

  const completionRate = processedData[processedData.length - 1]?.conversionPct ?? 0;

  const renderTooltip = ({ payload, label }: TooltipProps<number, string>) => {
    if (!payload?.length) return null;
    const stage = payload[0].payload as (typeof processedData)[number];

    const syntheticPayload = [
      {
        ...payload[0],
        name: "Volume",
        value: stage.value,
        color: "hsl(var(--chart-1))",
        dataKey: "value",
      },
      {
        ...payload[0],
        name: "Drop-off",
        value: stage.dropOffPct,
        color: "hsl(var(--chart-2))",
        dataKey: "dropOffPct",
      },
      {
        ...payload[0],
        name: "Overall conversion",
        value: stage.conversionPct,
        color: "hsl(var(--chart-3))",
        dataKey: "conversionPct",
      },
    ];

    return (
      <ChartTooltipContent
        payload={syntheticPayload as any}
        label={label}
        labelFormatter={(value) => `Stage: ${value as string}`}
        formatter={(value, name, item) => {
          if (name === "Volume") {
            return [
              typeof value === "number" ? value.toLocaleString() : value,
              item.name,
            ];
          }

          if (typeof value === "number") {
            return [`${value.toFixed(1)}%`, item.name];
          }

          return [value, item.name];
        }}
      />
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Completion</p>
            <p className="text-lg font-semibold">{completionRate.toFixed(1)}%</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Total volume: {maxValue.toLocaleString()}</span>
          <span>Stages: {processedData.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
          <ChartContainer
            config={chartConfig}
            className="h-[320px]"
            role="img"
            aria-label={`${title} funnel chart`}
          >
            <BarChart data={processedData} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis type="number" hide domain={[0, maxValue]} />
              <YAxis
                dataKey="stage"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={120}
              />
              <defs>
                <linearGradient id="funnelGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor="var(--color-value, hsl(var(--chart-1)))"
                    stopOpacity={0.85}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-dropOffPct, hsl(var(--chart-2)))"
                    stopOpacity={0.6}
                  />
                </linearGradient>
              </defs>
              <ChartTooltip cursor={false} content={renderTooltip} />
              <Bar
                dataKey="value"
                radius={[10, 10, 8, 8]}
                fill="url(#funnelGradient)"
                stroke="var(--color-value, hsl(var(--chart-1)))"
                aria-label="Stage volume"
              >
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value: number) => value.toLocaleString()}
                />
              </Bar>
            </BarChart>
          </ChartContainer>

          <div
            className="space-y-3 rounded-lg border bg-muted/40 p-4"
            role="list"
            aria-label="Funnel drop-off summary"
          >
            {processedData.map((stage, index) => {
              const accent = palette[index % palette.length];

              return (
                <div key={stage.stage} className="space-y-1.5" role="listitem">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                      <p className="font-medium text-foreground">{stage.stage}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {stage.value.toLocaleString()}
                    </span>
                  </div>
                  {index === 0 ? (
                    <p className="text-xs text-muted-foreground">Entry point</p>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Drop-off</span>
                      <span className={stage.dropOffPct > 0 ? "text-destructive" : ""}>
                        -{stage.dropOffPct.toFixed(1)}% ({stage.dropOff.toLocaleString()})
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Overall conversion</span>
                    <span className="font-medium text-foreground">
                      {stage.conversionPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
