'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { FunnelStage } from "./types";

type FunnelChartProps = {
  data: FunnelStage[];
};

export function FunnelChart({ data }: FunnelChartProps) {
  return (
    <Card className="border border-gray-100/80 shadow-sm">
      <CardContent className="pt-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="stage"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
              />
              <Bar dataKey="value" radius={[8, 8, 4, 4]} fill="url(#funnelGradient)">
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value: number) => value.toLocaleString()}
                  fill="#111827"
                />
              </Bar>
              <defs>
                <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
