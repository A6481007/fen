'use client';

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = status?.toLowerCase?.() || "unknown";
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    scheduled: "bg-amber-50 text-amber-700 border-amber-100",
    paused: "bg-sky-50 text-sky-700 border-sky-100",
    ended: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize border px-3 py-1 text-xs font-semibold",
        styles[normalized] || "bg-gray-100 text-gray-700 border-gray-200"
      )}
    >
      {t(`admin.promotions.form.status.${normalized}`, normalized)}
    </Badge>
  );
}
