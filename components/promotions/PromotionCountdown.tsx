"use client";

import { useEffect, useMemo, useState } from "react";

type TimeParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type PromotionCountdownProps = {
  targetDate?: string | null;
  label?: string;
};

const clampNonNegative = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

const getTimeParts = (targetDate?: string | null): TimeParts => {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const endMs = new Date(targetDate).getTime();
  if (!Number.isFinite(endMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const diffSeconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  const days = clampNonNegative(Math.floor(diffSeconds / 86_400));
  const hours = clampNonNegative(Math.floor((diffSeconds % 86_400) / 3_600));
  const minutes = clampNonNegative(Math.floor((diffSeconds % 3_600) / 60));
  const seconds = clampNonNegative(diffSeconds % 60);

  return { days, hours, minutes, seconds };
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center rounded-lg border bg-white/80 px-3 py-2 shadow-sm">
    <span className="text-xl font-bold text-gray-900 tabular-nums">{value.toString().padStart(2, "0")}</span>
    <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
  </div>
);

export function PromotionCountdown({ targetDate, label }: PromotionCountdownProps) {
  const [parts, setParts] = useState<TimeParts>(() => getTimeParts(targetDate));
  const countdownLabel = useMemo(() => label || "Ends in", [label]);

  useEffect(() => {
    setParts(getTimeParts(targetDate));
    if (!targetDate) return;

    const interval = setInterval(() => {
      setParts(getTimeParts(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const isInactive =
    !targetDate ||
    (parts.days === 0 && parts.hours === 0 && parts.minutes === 0 && parts.seconds === 0);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden />
        {countdownLabel}
      </span>
      {isInactive ? (
        <span className="text-sm font-medium text-gray-500">No countdown available</span>
      ) : (
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          <TimeUnit value={parts.days} label="Days" />
          <TimeUnit value={parts.hours} label="Hours" />
          <TimeUnit value={parts.minutes} label="Mins" />
          <TimeUnit value={parts.seconds} label="Secs" />
        </div>
      )}
    </div>
  );
}

export default PromotionCountdown;
