'use client';

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeSeriesPoint } from "./types";
import { useTranslation } from "react-i18next";

type TimeSeriesChartProps = {
  daily: TimeSeriesPoint[];
  hourly: TimeSeriesPoint[];
};

export function TimeSeriesChart({ daily, hourly }: TimeSeriesChartProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<"daily" | "hourly">("daily");
  const data = view === "daily" ? daily : hourly;
  const chartConfig = {
    conversions: {
      label: t("admin.promotions.timeSeries.conversions"),
      color: "hsl(var(--chart-1))",
    },
    revenue: {
      label: t("admin.promotions.timeSeries.revenue"),
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="border border-gray-100/80 shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-gray-800">
            {t("admin.promotions.timeSeries.title")}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {t("admin.promotions.timeSeries.subtitle", {
              unit: t(
                view === "daily"
                  ? "admin.promotions.timeSeries.unit.day"
                  : "admin.promotions.timeSeries.unit.hour",
              ),
            })}
          </p>
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value as "daily" | "hourly")}>
          <TabsList>
            <TabsTrigger value="daily">{t("admin.promotions.timeSeries.daily")}</TabsTrigger>
            <TabsTrigger value="hourly">{t("admin.promotions.timeSeries.hourly")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 16,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-conversions)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-conversions)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="conversions"
              type="monotone"
              fill="url(#fillConversions)"
              stroke="var(--color-conversions)"
              strokeWidth={2}
              name={t("admin.promotions.timeSeries.conversions")}
            />
            <Area
              dataKey="revenue"
              type="monotone"
              fill="url(#fillRevenue)"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              name={t("admin.promotions.timeSeries.revenue")}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
