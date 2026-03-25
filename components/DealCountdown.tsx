"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

type DealCountdownProps = {
  targetDate?: string | Date;
  label?: string;
  className?: string;
  onComplete?: () => void;
  compact?: boolean;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const DEFAULT_DURATION_MS = 48 * ONE_HOUR; // fallback for missing/invalid target date

const resolveTargetTime = (targetDate?: string | Date) => {
  if (!targetDate) return Date.now() + DEFAULT_DURATION_MS;
  const parsed =
    typeof targetDate === "string" ? new Date(targetDate).getTime() : targetDate.getTime();
  return Number.isNaN(parsed) ? Date.now() + DEFAULT_DURATION_MS : parsed;
};

const calculateTimeLeft = (targetDate?: string | Date): TimeLeft => {
  const targetTime = resolveTargetTime(targetDate);
  const diff = Math.max(0, targetTime - Date.now());

  const days = Math.floor(diff / ONE_DAY);
  const hours = Math.floor((diff % ONE_DAY) / ONE_HOUR);
  const minutes = Math.floor((diff % ONE_HOUR) / ONE_MINUTE);
  const seconds = Math.floor((diff % ONE_MINUTE) / ONE_SECOND);

  return { days, hours, minutes, seconds, totalMs: diff };
};

export function DealCountdown({
  targetDate,
  label = "Deal ends in",
  className = "",
  onComplete,
  compact = false,
}: DealCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
  const isComplete = timeLeft.totalMs === 0;

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetDate));
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = calculateTimeLeft(targetDate);
        if (next.totalMs === 0 && prev.totalMs !== 0 && onComplete) {
          onComplete();
        }
        return next;
      });
    }, ONE_SECOND);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  const TimeUnit = ({ value, label: unitLabel }: { value: number; label: string }) => (
    <div className="flex flex-col items-center rounded-lg border bg-white p-2 shadow-md sm:p-3">
      <span className="text-lg font-bold text-brand-black-strong sm:text-2xl md:text-3xl">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="text-xs font-medium text-gray-600 sm:text-sm">{unitLabel}</span>
    </div>
  );

  return (
    <div
      className={`flex flex-wrap items-center ${compact ? "gap-1 sm:gap-2" : "gap-2 sm:gap-4"} ${className}`}
      role="timer"
      aria-live="polite"
    >
      <div className="flex items-center gap-1 text-red-600 sm:gap-2">
        <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-sm font-semibold sm:text-base">
          {isComplete ? "Offer ended" : `${label}:`}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 sm:gap-2">
        <TimeUnit value={timeLeft.days} label="Days" />
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <TimeUnit value={timeLeft.minutes} label="Mins" />
        <TimeUnit value={timeLeft.seconds} label="Secs" />
      </div>
    </div>
  );
}

export default DealCountdown;
