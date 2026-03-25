"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import clsx from "clsx";
import { EditorState } from "draft-js";
import { getSelectionCustomInlineStyle } from "draftjs-utils";

type PickerStyle = "color" | "bgcolor";

type ColorPickerProps = {
  expanded?: boolean;
  onExpandEvent?: () => void;
  onChange?: (style: PickerStyle, color: string) => void;
  config?: {
    icon?: string;
    className?: string;
    title?: string;
    colors?: string[];
    popupClassName?: string;
  };
  currentState?: {
    color?: string;
    bgColor?: string;
  };
  translations?: Record<string, string>;
  editorState?: EditorState;
};

const DEFAULT_PALETTE = [
  "#000000",
  "#4B5563",
  "#6B7280",
  "#9CA3AF",
  "#D1D5DB",
  "#FFFFFF",
  "#EF4444",
  "#F59E0B",
  "#FCD34D",
  "#34D399",
  "#10B981",
  "#22D3EE",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#16A34A",
  "#0F172A",
];

const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_PATTERN =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i;

const clamp = (value: number) => Math.min(255, Math.max(0, value));
const toHex = (value: number) => clamp(value).toString(16).padStart(2, "0");

const normalizeColor = (raw?: string | null): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  const withoutPrefix = value.replace(/^(color|bgcolor|backgroundcolor)-/i, "");
  const hexMatch = withoutPrefix.match(HEX_PATTERN);
  if (hexMatch) {
    const digits = hexMatch[1];
    const hex =
      digits.length === 3
        ? digits
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : digits;
    return `#${hex.toUpperCase()}`;
  }

  const rgbMatch = withoutPrefix.match(RGB_PATTERN);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch.slice(1, 4).map((part) => parseInt(part || "0", 10));
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  return null;
};

const getSelectionColor = (editorState?: EditorState, style: PickerStyle = "color") => {
  if (!editorState) return null;
  const styles = getSelectionCustomInlineStyle(editorState, [style]);
  return normalizeColor(styles?.[style]);
};

const buildPalette = (colors?: string[]) =>
  (colors ?? DEFAULT_PALETTE).map((swatch) => {
    const normalized = normalizeColor(swatch);
    return normalized ? { label: swatch, value: normalized } : null;
  }).filter(Boolean) as { label: string; value: string }[];

export default function CustomColorPicker({
  expanded,
  onExpandEvent,
  onChange,
  config,
  currentState,
  translations,
  editorState,
}: ColorPickerProps) {
  const [currentStyle, setCurrentStyle] = useState<PickerStyle>("color");
  const [hexInput, setHexInput] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();
  const palette = useMemo(() => buildPalette(config?.colors), [config?.colors]);

  const currentColor = useMemo(
    () => normalizeColor(currentState?.color) || getSelectionColor(editorState, "color"),
    [currentState?.color, editorState],
  );

  const currentBgColor = useMemo(
    () => normalizeColor(currentState?.bgColor) || getSelectionColor(editorState, "bgcolor"),
    [currentState?.bgColor, editorState],
  );

  useEffect(() => {
    if (expanded) {
      setCurrentStyle("color");
      setError("");
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const next = currentStyle === "color" ? currentColor : currentBgColor;
    setHexInput(next ?? "");
  }, [expanded, currentStyle, currentColor, currentBgColor]);

  const applyColor = (value: string | null) => {
    const normalized = normalizeColor(value ?? hexInput);
    if (!normalized) {
      setError("Enter a valid hex or rgb color");
      return;
    }
    setError("");
    setHexInput(normalized);
    onChange?.(currentStyle, normalized);
  };

  const handleSwatch = (value: string) => {
    applyColor(value);
  };

  const handleHexSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    applyColor(hexInput);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      handleHexSubmit();
    }
  };

  const activeColor = currentStyle === "color" ? currentColor : currentBgColor;
  const paletteHasActive = !!(activeColor && palette.some((p) => p.value === activeColor));

  const labels = {
    color: translations?.["components.controls.colorpicker.text"] ?? "Text",
    background: translations?.["components.controls.colorpicker.background"] ?? "Highlight",
    picker: translations?.["components.controls.colorpicker.colorpicker"] ?? "Text color",
  };

  return (
    <div
      className="rdw-colorpicker-wrapper"
      aria-haspopup="true"
      aria-expanded={expanded}
      aria-label="rdw-color-picker"
      title={config?.title || labels.picker}
    >
      <button
        type="button"
        className={clsx("rdw-option-wrapper", config?.className)}
        onMouseDown={(event) => {
          event.preventDefault();
          onExpandEvent?.();
        }}
        aria-label={labels.picker}
      >
        {config?.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.icon} alt="" />
        ) : (
          <span className="colorpicker-icon">A</span>
        )}
      </button>
      {expanded ? (
        <div className={clsx("rdw-colorpicker-modal", "custom-colorpicker", config?.popupClassName)}>
          <div className="colorpicker-tabs">
            <button
              type="button"
              className={clsx("colorpicker-tab", currentStyle === "color" && "is-active")}
              onClick={() => {
                setCurrentStyle("color");
                setError("");
                setHexInput(currentColor ?? "");
              }}
            >
              {labels.color}
            </button>
            <button
              type="button"
              className={clsx("colorpicker-tab", currentStyle === "bgcolor" && "is-active")}
              onClick={() => {
                setCurrentStyle("bgcolor");
                setError("");
                setHexInput(currentBgColor ?? "");
              }}
            >
              {labels.background}
            </button>
          </div>

          {!paletteHasActive && activeColor ? (
            <div className="colorpicker-current">
              <span className="colorpicker-current-label">Current</span>
              <button
                type="button"
                className="color-swatch is-active"
                style={{ backgroundColor: activeColor }}
                onClick={() => applyColor(activeColor)}
                aria-label="Current color"
              >
                <span className="color-swatch-indicator" />
              </button>
              <span className="colorpicker-current-value">{activeColor}</span>
            </div>
          ) : null}

          <div className="colorpicker-grid">
            {palette.map((swatch) => {
              const isActive = activeColor === swatch.value;
              return (
                <button
                  key={swatch.value}
                  type="button"
                  className={clsx("color-swatch", isActive && "is-active")}
                  style={{ backgroundColor: swatch.value }}
                  onClick={() => handleSwatch(swatch.value)}
                  aria-label={`Apply ${swatch.value} ${currentStyle === "color" ? "text" : "highlight"} color`}
                >
                  {isActive ? <span className="color-swatch-indicator" /> : null}
                </button>
              );
            })}
          </div>

          <div className="colorpicker-hex">
            <label className="colorpicker-hex-label" htmlFor={inputId}>
              Hex
            </label>
            <input
              id={inputId}
              type="text"
              value={hexInput}
              onChange={(event) => {
                setError("");
                setHexInput(event.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="#RRGGBB or rgb()"
              className={clsx("colorpicker-hex-input", error && "has-error")}
              spellCheck={false}
            />
            <button
              type="button"
              className="colorpicker-apply"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleHexSubmit();
              }}
            >
              Apply
            </button>
          </div>
          {error ? <div className="colorpicker-error">{error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
