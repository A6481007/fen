// @ts-nocheck
'use client';

import type { Meta, StoryObj } from "@storybook/react";

import { ABTestResults } from "./ABTestResults";

const meta = {
  title: "Admin/Charts/ABTestResults",
  component: ABTestResults,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ABTestResults>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleVariants = [
  { name: "Control", conversions: 820, users: 12_000, revenue: 54_000 },
  { name: "Variant B", conversions: 980, users: 11_800, revenue: 61_000 },
  { name: "Variant C", conversions: 760, users: 10_900, revenue: 49_500 },
];

export const Default: Story = {
  args: {
    title: "Banner Experiment",
    description: "Conversions and rates across variants",
    variants: sampleVariants,
  },
};

export const Loading: Story = {
  args: {
    variants: sampleVariants,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    variants: [],
  },
};
