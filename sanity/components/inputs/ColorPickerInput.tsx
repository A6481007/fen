"use client";

import React, { useCallback } from "react";
import { Stack, TextInput, Box, Flex, Text } from "@sanity/ui";
import { set, unset, StringInputProps } from "sanity";

const PRESET_COLORS = [
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#22C55E", // Green
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#DC2626", // Red-600
];

export function ColorPickerInput(props: StringInputProps) {
  const { onChange, value = "", elementProps } = props;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.currentTarget.value;
      onChange(nextValue ? set(nextValue) : unset());
    },
    [onChange]
  );

  const handlePresetClick = useCallback(
    (color: string) => {
      onChange(set(color));
    },
    [onChange]
  );

  return (
    <Stack space={3}>
      <Flex gap={3} align="center">
        <Box
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: value || "#E5E7EB",
            border: "2px solid #E5E7EB",
          }}
        />
        <TextInput
          {...elementProps}
          value={value}
          onChange={handleChange}
          placeholder="#FFFFFF"
          style={{ fontFamily: "monospace" }}
        />
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(set(e.target.value.toUpperCase()))}
          style={{
            width: 40,
            height: 40,
            border: "none",
            cursor: "pointer",
            borderRadius: 4,
          }}
        />
      </Flex>

      <Stack space={2}>
        <Text size={1} muted>
          Quick colors:
        </Text>
        <Flex gap={2} wrap="wrap">
          {PRESET_COLORS.map((color) => (
            <Box
              key={color}
              onClick={() => handlePresetClick(color)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: color,
                cursor: "pointer",
                border: value === color ? "3px solid #000" : "2px solid #E5E7EB",
                transition: "transform 0.1s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          ))}
        </Flex>
      </Stack>
    </Stack>
  );
}
