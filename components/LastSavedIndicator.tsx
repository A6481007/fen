import { useEffect, useMemo, useState } from "react";

type LastSavedIndicatorProps = {
  lastSavedAt: Date | null;
  isSaving: boolean;
  saveStatus?: "idle" | "saving" | "saved" | "error";
};

const formatRelative = (lastSavedAt: Date) => {
  const diffMs = Date.now() - lastSavedAt.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return "Last saved just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Last saved ${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `Last saved ${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
};

export function LastSavedIndicator({ lastSavedAt, isSaving, saveStatus }: LastSavedIndicatorProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const label = useMemo(() => {
    if (isSaving || saveStatus === "saving") return "Saving...";
    if (saveStatus === "error") return "Save failed";
    if (!lastSavedAt) return "";
    return formatRelative(lastSavedAt);
  }, [isSaving, lastSavedAt, saveStatus, tick]);

  if (!label) {
    return (
      <div
        aria-live="polite"
        className="h-3 w-24 animate-pulse rounded-full bg-slate-200"
        role="status"
      />
    );
  }

  return (
    <span
      aria-live="polite"
      className="max-w-[160px] truncate text-xs font-medium text-slate-500 sm:max-w-none"
    >
      {label}
    </span>
  );
}

export default LastSavedIndicator;
