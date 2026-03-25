// @ts-nocheck
'use client';

import type { Meta, StoryObj } from "@storybook/react";

import { DeviceBreakdownChart } from "./DeviceBreakdownChart";

const meta = {
  title: "Admin/Charts/DeviceBreakdownChart",
  component: DeviceBreakdownChart,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof DeviceBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = [
  { device: "Mobile", value: 12400 },
  { device: "Desktop", value: 8800 },
  { device: "Tablet", value: 2100 },
];

export const Default: Story = {
  args: {
    data: sampleData,
    title: "Devices",
    description: "Sessions by device type",
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
