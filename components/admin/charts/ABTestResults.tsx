'use client';

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

interface VariantResult {
  name: string;
  conversions: number;
  users: number;
  revenue?: number;
}

interface ABTestResultsProps {
  variants: VariantResult[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

const palette = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ABTestResults({
  variants,
  title = "A/B Test Results",
  description = "Variant performance by conversions and rate",
  isLoading = false,
  className,
}: ABTestResultsProps) {
  const variantsWithRates = useMemo(() => {
    return variants.map((variant, index) => {
      const conversionRate =
        variant.users > 0 ? Number(((variant.conversions / variant.users) * 100).toFixed(2)) : 0;
      return {
        ...variant,
        conversionRate,
        color: palette[index % palette.length],
      };
    });
  }, [variants]);

  const hasData = variantsWithRates.length > 0;
  const controlRate = variantsWithRates[0]?.conversionRate ?? 0;
  const bestVariant = variantsWithRates.reduce(
    (leader, variant) =>
      variant.conversionRate > leader.conversionRate ? variant : leader,
    variantsWithRates[0] ?? null
  );

  if (isLoading) {
    return (
      <Card className={className} role="status" aria-live="polite">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-[240px] w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className={className} role="status" aria-live="polite">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No A/B test data available.</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig: ChartConfig = {
    conversions: { label: "Conversions", color: "hsl(var(--chart-1))" },
    conversionRate: { label: "Conversion Rate", color: "hsl(var(--chart-2))" },
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {bestVariant && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-right">
              <p className="text-xs text-muted-foreground">Leader</p>
              <p className="text-base font-semibold text-foreground">{bestVariant.name}</p>
              <p className="text-xs text-emerald-600">
                {bestVariant.conversionRate.toFixed(2)}% conversion rate
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer
          config={chartConfig}
          className="h-[320px]"
          role="img"
          aria-label={`${title} bar chart`}
        >
          <BarChart
            data={variantsWithRates}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              height={36}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => (value as number).toLocaleString()}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${(value as number).toFixed(0)}%`}
            />
            <ReferenceLine
              yAxisId="right"
              y={controlRate}
              stroke="var(--border)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{
                value: "Control",
                position: "right",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `Variant: ${value as string}`}
                  formatter={(value, name, item) => {
                    const payload = item?.payload as (typeof variantsWithRates)[number];
                    if (name === "conversionRate") {
                      const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                      const uplift =
                        controlRate > 0
                          ? ((payload.conversionRate - controlRate) / controlRate) * 100
                          : null;
                      const upliftLabel =
                        uplift === null ? "N/A" : `${uplift >= 0 ? "+" : ""}${uplift.toFixed(1)}%`;
                      return [`${numericValue.toFixed(2)}% (${upliftLabel} vs control)`, "Conversion rate"];
                    }

                    return [
                      typeof value === "number" ? value.toLocaleString() : value,
                      chartConfig[name]?.label ?? name,
                    ];
                  }}
                />
              }
            />
            <ChartLegend
              verticalAlign="top"
              content={<ChartLegendContent />}
              wrapperStyle={{ paddingBottom: 12 }}
            />
            <Bar
              yAxisId="left"
              dataKey="conversions"
              radius={[6, 6, 4, 4]}
              fill="var(--color-conversions, hsl(var(--chart-1)))"
            />
            <Bar
              yAxisId="right"
              dataKey="conversionRate"
              radius={[6, 6, 4, 4]}
              fill="var(--color-conversionRate, hsl(var(--chart-2)))"
            >
              <LabelList
                dataKey="conversionRate"
                position="top"
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              {variantsWithRates.map((variant) => (
                <Cell
                  key={variant.name}
                  fill={
                    bestVariant && variant.name === bestVariant.name
                      ? "hsl(var(--chart-3))"
                      : "var(--color-conversionRate, hsl(var(--chart-2)))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="grid gap-3 md:grid-cols-2" aria-label="Variant details" role="list">
          {variantsWithRates.map((variant) => {
            const uplift =
              controlRate > 0
                ? ((variant.conversionRate - controlRate) / controlRate) * 100
                : null;
            const isWinner = bestVariant && variant.name === bestVariant.name;

            return (
              <div
                key={variant.name}
                className={`rounded-lg border p-3 ${
                  isWinner ? "border-emerald-500 bg-emerald-50" : "border-muted"
                }`}
                role="listitem"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{variant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {variant.users.toLocaleString()} users
                    </p>
                  </div>
                  {isWinner && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Winner
                    </span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p className="text-foreground font-medium">
                      {variant.conversions.toLocaleString()}
                    </p>
                    <p>Conversions</p>
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {variant.conversionRate.toFixed(2)}%
                    </p>
                    <p>Conversion rate</p>
                  </div>
                  {variant.revenue !== undefined && (
                    <div>
                      <p className="text-foreground font-medium">
                        ${variant.revenue.toLocaleString()}
                      </p>
                      <p>Revenue</p>
                    </div>
                  )}
                  <div>
                    <p
                      className={`text-foreground font-medium ${
                        uplift !== null && uplift < 0 ? "text-destructive" : "text-emerald-600"
                      }`}
                    >
                      {uplift === null
                        ? "N/A"
                        : `${uplift >= 0 ? "+" : ""}${uplift.toFixed(1)}% vs control`}
                    </p>
                    <p>Uplift</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
