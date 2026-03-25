'use client';

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

type DateRangeSelectorProps = {
  defaultFrom?: string;
  defaultTo?: string;
  onChange?: (range: { dateFrom?: string; dateTo?: string }) => void;
};

export function DateRangeSelector({ defaultFrom, defaultTo, onChange }: DateRangeSelectorProps) {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState(defaultFrom || "");
  const [dateTo, setDateTo] = useState(defaultTo || "");

  useEffect(() => {
    onChange?.({ dateFrom, dateTo });
  }, [dateFrom, dateTo, onChange]);

  const handlePreset = (preset: string) => {
    const today = new Date();
    const presetMap: Record<string, number> = {
      "7d": 7,
      "14d": 14,
      "30d": 30,
    };

    const days = presetMap[preset];
    if (!days) return;

    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(today.toISOString().slice(0, 10));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select onValueChange={handlePreset}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("admin.promotions.dateRange.quickRange")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">{t("admin.promotions.dateRange.last7Days")}</SelectItem>
          <SelectItem value="14d">{t("admin.promotions.dateRange.last14Days")}</SelectItem>
          <SelectItem value="30d">{t("admin.promotions.dateRange.last30Days")}</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px]"
        />
        <span className="text-sm text-gray-500">{t("admin.promotions.dateRange.to")}</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px]"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setDateFrom("");
          setDateTo("");
        }}
      >
        {t("admin.promotions.dateRange.reset")}
      </Button>
    </div>
  );
}
