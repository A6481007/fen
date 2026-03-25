'use client';

import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelPerformance } from "./types";
import { useTranslation } from "react-i18next";

type ChannelBreakdownChartProps = {
  data: ChannelPerformance[];
};

const COLORS = ["#22c55e", "#0ea5e9", "#f97316", "#a855f7"];

export function ChannelBreakdownChart({ data }: ChannelBreakdownChartProps) {
  const { t } = useTranslation();
  const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0) || 1;
  const getChannelLabel = (channel: string) =>
    t(`admin.promotions.channels.${channel.toLowerCase()}`, channel);

  return (
    <Card className="border border-gray-100/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          {t("admin.promotions.channelBreakdown.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="conversions"
                nameKey="channel"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`channel-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, { payload }) => {
                  const share = ((value / totalConversions) * 100).toFixed(1);
                  return [
                    t("admin.promotions.channelBreakdown.tooltip", {
                      value: value.toLocaleString(),
                      share,
                    }),
                    getChannelLabel(payload.channel),
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 text-sm">
          {data.map((item, index) => {
            const share = ((item.conversions / totalConversions) * 100).toFixed(1);
            return (
              <div
                key={item.channel}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-gray-800">{getChannelLabel(item.channel)}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.conversions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("admin.promotions.channelBreakdown.share", { share })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
