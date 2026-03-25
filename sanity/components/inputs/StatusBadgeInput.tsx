"use client";

import React, { useCallback } from "react";
import { Flex, Badge, Card } from "@sanity/ui";
import { set, StringInputProps } from "sanity";

interface StatusOption {
  value: string;
  label: string;
  tone: "positive" | "caution" | "critical" | "primary" | "default";
  icon?: string;
}

interface StatusBadgeInputProps extends StringInputProps {
  options?: StatusOption[];
}

const defaultOrderStatuses: StatusOption[] = [
  { value: "pending", label: "Pending", tone: "caution", icon: "🔴" },
  { value: "address_confirmed", label: "Address Confirmed", tone: "primary", icon: "🟡" },
  { value: "order_confirmed", label: "Order Confirmed", tone: "positive", icon: "🟢" },
  { value: "packed", label: "Packed", tone: "primary", icon: "📦" },
  { value: "ready_for_delivery", label: "Ready for Delivery", tone: "positive", icon: "🏭" },
  { value: "out_for_delivery", label: "Out for Delivery", tone: "positive", icon: "🚚" },
  { value: "delivered", label: "Delivered", tone: "positive", icon: "✅" },
  { value: "completed", label: "Completed", tone: "positive", icon: "✔️" },
  { value: "cancelled", label: "Cancelled", tone: "critical", icon: "❌" },
  { value: "rescheduled", label: "Rescheduled", tone: "caution", icon: "🔄" },
  { value: "failed_delivery", label: "Failed Delivery", tone: "critical", icon: "⚠️" },
];

export function StatusBadgeInput(props: StatusBadgeInputProps) {
  const { onChange, value, schemaType } = props;

  // Get options from schema or use defaults
  const options: StatusOption[] =
    (schemaType.options as any)?.statusOptions ||
    (schemaType.options?.list as any[])?.map((item) => ({
      value: typeof item === "string" ? item : item.value,
      label: typeof item === "string" ? item : item.title,
      tone: "default" as const,
    })) ||
    defaultOrderStatuses;

  const handleSelect = useCallback(
    (statusValue: string) => {
      onChange(set(statusValue));
    },
    [onChange]
  );

  return (
    <Flex gap={2} wrap="wrap" padding={2}>
      {options.map((option) => (
        <Card
          key={option.value}
          padding={2}
          radius={2}
          tone={value === option.value ? option.tone : "transparent"}
          style={{
            cursor: "pointer",
            border: value === option.value ? "2px solid currentColor" : "2px solid transparent",
            transition: "all 0.15s ease",
          }}
          onClick={() => handleSelect(option.value)}
        >
          <Badge mode={value === option.value ? "default" : "outline"} tone={option.tone}>
            {option.icon && `${option.icon} `}
            {option.label}
          </Badge>
        </Card>
      ))}
    </Flex>
  );
}
