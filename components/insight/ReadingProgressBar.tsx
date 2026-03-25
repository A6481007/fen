"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ReadingProgressBarProps = {
  targetId: string;
  className?: string;
};

const ReadingProgressBar = ({ targetId, className }: ReadingProgressBarProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const target = document.getElementById(targetId);
      if (!target) {
        setProgress(0);
        return;
      }

      const rect = target.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const targetTop = rect.top + scrollTop;
      const total = target.offsetHeight - window.innerHeight;

      if (total <= 0) {
        setProgress(100);
        return;
      }

      const current = scrollTop - targetTop;
      const next = Math.min(100, Math.max(0, (current / total) * 100));
      setProgress(next);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [targetId]);

  return (
    <div
      className={cn("h-1 w-full bg-surface-1", className)}
      aria-hidden="true"
    >
      <div
        className="h-full bg-ink transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ReadingProgressBar;
