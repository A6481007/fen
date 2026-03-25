// @ts-nocheck
'use client';

import type { Meta, StoryObj } from "@storybook/react";

import { FunnelChart } from "./FunnelChart";

const meta = {
  title: "Admin/Charts/FunnelChart",
  component: FunnelChart,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof FunnelChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = [
  { stage: "Impressions", value: 120_000 },
  { stage: "Clicks", value: 48_000 },
  { stage: "Carts", value: 15_500 },
  { stage: "Purchases", value: 6_300 },
];

export const Default: Story = {
  args: {
    title: "Acquisition Funnel",
    description: "Impressions to purchase conversion",
    data: sampleData,
  },
};

export const Loading: Story = {
  args: {
    title: "Acquisition Funnel",
    data: sampleData,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    title: "Acquisition Funnel",
    data: [],
  },
};
