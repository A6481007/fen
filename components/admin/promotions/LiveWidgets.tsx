'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type LiveConversionCounterProps = {
  count: number;
  lastUpdated?: string | null;
};

export function LiveConversionCounter({ count, lastUpdated }: LiveConversionCounterProps) {
  const { t } = useTranslation();
  const [displayed, setDisplayed] = useState(Math.max(0, count - 3));
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState(t("admin.promotions.live.live"));

  useEffect(() => {
    const diff = count - displayed;
    if (diff <= 0) return;

    const step = Math.max(1, Math.floor(diff / 10));
    const interval = setInterval(() => {
      setDisplayed((current) => {
        const next = current + step;
        return next >= count ? count : next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [count, displayed]);

  useEffect(() => {
    const computeLabel = () => {
      if (!lastUpdated) {
        setLastUpdatedLabel(t("admin.promotions.live.live"));
        return;
      }
      const updatedAt = new Date(lastUpdated).getTime();
      if (Number.isNaN(updatedAt)) {
        setLastUpdatedLabel(t("admin.promotions.live.live"));
        return;
      }
      const secondsAgo = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
      if (secondsAgo < 60) {
        setLastUpdatedLabel(
          t("admin.promotions.live.updatedSecondsAgo", { count: secondsAgo }),
        );
        return;
      }
      const minutes = Math.floor(secondsAgo / 60);
      setLastUpdatedLabel(
        t("admin.promotions.live.updatedMinutesAgo", { count: minutes }),
      );
    };

    computeLabel();
    const timer = setInterval(computeLabel, 10_000);
    return () => clearInterval(timer);
  }, [lastUpdated, t]);

  return (
    <Card className="border border-green-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          {t("admin.promotions.live.title")}
        </CardTitle>
        <span className="flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-gray-900">{displayed.toLocaleString()}</p>
        <p className="text-xs text-gray-500">{lastUpdatedLabel}</p>
      </CardContent>
    </Card>
  );
}

type TimeRemainingWidgetProps = {
  timeRemainingMs: number | null;
};

export function TimeRemainingWidget({ timeRemainingMs }: TimeRemainingWidgetProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(timeRemainingMs ?? 0);

  useEffect(() => {
    setRemaining(timeRemainingMs ?? 0);
  }, [timeRemainingMs]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const formatRemaining = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const parts = [];
    if (days) parts.push(t("admin.promotions.live.time.days", { count: days }));
    parts.push(t("admin.promotions.live.time.hours", { count: hours }));
    parts.push(t("admin.promotions.live.time.minutes", { count: minutes }));
    return parts.join(" ");
  };

  const status =
    remaining === 0
      ? { label: t("admin.promotions.live.status.ended"), tone: "bg-gray-100 text-gray-700" }
      : {
          label: t("admin.promotions.live.status.remaining"),
          tone: "bg-indigo-50 text-indigo-700",
        };

  return (
    <Card className="border border-indigo-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">{status.label}</CardTitle>
      </CardHeader>
      <CardContent className={cn("text-2xl font-semibold", status.tone)}>
        {remaining ? formatRemaining(remaining) : t("admin.promotions.live.time.zero")}
      </CardContent>
    </Card>
  );
}
