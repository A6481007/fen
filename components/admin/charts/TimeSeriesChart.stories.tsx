// @ts-nocheck
'use client';

import type { Meta, StoryObj } from "@storybook/react";

import { TimeSeriesChart } from "./TimeSeriesChart";

const meta = {
  title: "Admin/Charts/TimeSeriesChart",
  component: TimeSeriesChart,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TimeSeriesChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSeries = [
  { dataKey: "conversions", label: "Conversions" },
  { dataKey: "revenue", label: "Revenue" },
  { dataKey: "sessions", label: "Sessions" },
];

const sampleData = [
  { date: "2025-11-01", conversions: 120, revenue: 12500, sessions: 1800 },
  { date: "2025-11-02", conversions: 135, revenue: 13200, sessions: 1920 },
  { date: "2025-11-03", conversions: 110, revenue: 11800, sessions: 1750 },
  { date: "2025-11-04", conversions: 148, revenue: 14100, sessions: 2050 },
  { date: "2025-11-05", conversions: 152, revenue: 15050, sessions: 2100 },
  { date: "2025-11-06", conversions: 160, revenue: 15700, sessions: 2190 },
  { date: "2025-11-07", conversions: 172, revenue: 16800, sessions: 2300 },
  { date: "2025-11-08", conversions: 180, revenue: 17400, sessions: 2400 },
  { date: "2025-11-09", conversions: 165, revenue: 16300, sessions: 2210 },
  { date: "2025-11-10", conversions: 170, revenue: 17000, sessions: 2280 },
  { date: "2025-11-11", conversions: 190, revenue: 18250, sessions: 2450 },
  { date: "2025-11-12", conversions: 210, revenue: 19800, sessions: 2600 },
  { date: "2025-11-13", conversions: 205, revenue: 19400, sessions: 2550 },
  { date: "2025-11-14", conversions: 225, revenue: 20500, sessions: 2700 },
];

export const Default: Story = {
  args: {
    title: "Daily Performance",
    description: "Conversions, revenue, and sessions over time",
    data: sampleData,
    dateKey: "date",
    series: sampleSeries,
  },
};

export const Loading: Story = {
  args: {
    title: "Daily Performance",
    data: sampleData,
    series: sampleSeries,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
  },
};
