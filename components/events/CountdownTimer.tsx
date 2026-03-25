"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlarmClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { computeCountdown, type CountdownResult } from "@/sanity/helpers/countdown";

type CountdownUnit = "days" | "hours" | "minutes" | "seconds";

type CountdownTimerProps = {
  targetDate?: string | Date | null;
  onExpire?: () => void;
  variant?: "default" | "compact" | "large";
  showSeconds?: boolean;
  labels?: Partial<Record<CountdownUnit, string>>;
  label?: string;
  className?: string;
};

type CountdownTone = "normal" | "warning" | "critical" | "expired";

const DEFAULT_LABELS: Record<CountdownUnit, string> = {
  days: "DAYS",
  hours: "HOURS",
  minutes: "MINS",
  seconds: "SECS",
};

const variantStyles: Record<
  NonNullable<CountdownTimerProps["variant"]>,
  { container: string; gap: string; box: string; value: string; unit: string }
> = {
  compact: {
    container: "p-3",
    gap: "gap-2",
    box: "px-2.5 py-2",
    value: "text-xl font-black",
    unit: "text-[10px]",
  },
  default: {
    container: "p-4",
    gap: "gap-3",
    box: "px-3.5 py-3",
    value: "text-2xl font-black sm:text-3xl",
    unit: "text-[11px] sm:text-xs",
  },
  large: {
    container: "p-5 sm:p-6",
    gap: "gap-4",
    box: "px-4 py-3 sm:px-6 sm:py-4",
    value: "text-3xl font-black sm:text-4xl",
    unit: "text-xs sm:text-sm",
  },
};

const toneClasses: Record<CountdownTone, string> = {
  normal: "bg-shop_dark_green text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]",
  warning: "bg-amber-500 text-white shadow-[0_10px_30px_-12px_rgba(217,119,6,0.55)]",
  critical: "bg-red-600 text-white shadow-[0_10px_30px_-12px_rgba(220,38,38,0.65)] animate-pulse",
  expired: "bg-gray-100 text-gray-500 ring-1 ring-gray-200 shadow-none",
};

const parseTargetDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const parsed = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatUnit = (value: number) => value.toString().padStart(2, "0");

const resolveTone = (
  countdown: CountdownResult | null,
  hasTarget: boolean
): CountdownTone => {
  if (!hasTarget) return "expired";
  if (!countdown) return "normal";
  if (countdown.isExpired) return "expired";
  if (countdown.isCritical) return "critical";
  if (countdown.isPastWarning) return "warning";
  return "normal";
};

const CountdownTimer = ({
  targetDate,
  onExpire,
  variant = "default",
  showSeconds = true,
  labels,
  label = "Registration closes in",
  className = "",
}: CountdownTimerProps) => {
  const [countdown, setCountdown] = useState<CountdownResult | null>(null);
  const expireCalledRef = useRef(false);
  const parsedTarget = useMemo(() => parseTargetDate(targetDate), [targetDate]);
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const isHydrating = Boolean(parsedTarget && !countdown);

  useEffect(() => {
    expireCalledRef.current = false;
    setCountdown(null);
  }, [parsedTarget]);

  useEffect(() => {
    if (!parsedTarget) return undefined;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      const next = computeCountdown(parsedTarget, new Date());
      setCountdown(next);

      if (next.isExpired && !expireCalledRef.current) {
        expireCalledRef.current = true;
        onExpire?.();
        if (timer) clearInterval(timer);
      }
    };

    tick();
    if (!expireCalledRef.current) {
      timer = setInterval(tick, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [parsedTarget, onExpire]);

  const tone = resolveTone(countdown, Boolean(parsedTarget));
  const unitItems = [
    { key: "days" as const, label: mergedLabels.days, value: countdown?.days ?? 0 },
    { key: "hours" as const, label: mergedLabels.hours, value: countdown?.hours ?? 0 },
    { key: "minutes" as const, label: mergedLabels.minutes, value: countdown?.minutes ?? 0 },
    { key: "seconds" as const, label: mergedLabels.seconds, value: countdown?.seconds ?? 0 },
  ].filter((unit) => showSeconds || unit.key !== "seconds");

  const gridCols =
    unitItems.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";

  return (
    <section
      className={cn(
        "w-full rounded-2xl border border-gray-100 bg-white/80 shadow-sm backdrop-blur",
        variantStyles[variant].container,
        className
      )}
      role="timer"
      aria-live="polite"
      data-tone={tone}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-shop_light_bg text-shop_dark_green shadow-inner">
            <AlarmClock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wide text-shop_light_green">
              {label}
            </p>
            <p className="text-sm text-gray-600">
              {parsedTarget
                ? countdown?.isExpired
                  ? "Deadline reached"
                  : countdown?.label || "Countdown in progress"
                : "Invalid or missing date"}
            </p>
          </div>
        </div>

        {tone === "expired" ? (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 hover:bg-red-100"
          >
            Registration Closed
          </Badge>
        ) : null}
      </div>

      <div className={cn("mt-4 grid", gridCols, variantStyles[variant].gap)}>
        {unitItems.map((unit) => (
          <div
            key={unit.key}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl text-center transition-all",
              toneClasses[tone],
              variantStyles[variant].box
            )}
          >
            <span className={cn("font-mono tracking-tight", variantStyles[variant].value)}>
              {isHydrating ? "--" : formatUnit(unit.value)}
            </span>
            <span className={cn("font-semibold uppercase tracking-wide", variantStyles[variant].unit)}>
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CountdownTimer;
