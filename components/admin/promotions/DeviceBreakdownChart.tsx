'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DevicePerformance } from "./types";
import { useTranslation } from "react-i18next";

type DeviceBreakdownChartProps = {
  data: DevicePerformance[];
};

export function DeviceBreakdownChart({ data }: DeviceBreakdownChartProps) {
  const { t } = useTranslation();
  const getDeviceLabel = (device: string) =>
    t(`admin.promotions.devices.${device.toLowerCase()}`, device);

  return (
    <Card className="border border-gray-100/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          {t("admin.promotions.deviceBreakdown.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="device"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, key: string) =>
                key === "share" ? `${value.toFixed(1)}%` : value.toLocaleString()
              }
              labelFormatter={(label) => getDeviceLabel(String(label))}
            />
            <Bar dataKey="conversions" fill="#2563eb" radius={[6, 6, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-gray-600">
          {data.map((device) => (
            <div key={device.device} className="rounded-md bg-gray-50 px-2 py-1.5">
              <p className="font-semibold text-gray-800">{device.share.toFixed(1)}%</p>
              <p className="text-gray-500">{getDeviceLabel(device.device)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
