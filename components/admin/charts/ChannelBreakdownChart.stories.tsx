// @ts-nocheck
'use client';

import type { Meta, StoryObj } from "@storybook/react";

import { ChannelBreakdownChart } from "./ChannelBreakdownChart";

const meta = {
  title: "Admin/Charts/ChannelBreakdownChart",
  component: ChannelBreakdownChart,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ChannelBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = [
  { channel: "Email", value: 7200 },
  { channel: "SMS", value: 3800 },
  { channel: "Push", value: 2600 },
  { channel: "Organic", value: 5100 },
];

export const Default: Story = {
  args: {
    data: sampleData,
    title: "Channel Mix",
    description: "Share of conversions by channel",
  },
};

export const Loading: Story = {
  args: {
    data: sampleData,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
  },
};
