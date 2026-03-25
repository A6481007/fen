"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StickyNote, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface StatusHistoryItem {
  status: string;
  changedBy: string;
  changedByRole: string;
  changedAt: string;
  notes?: string;
}

interface OrderNotesProps {
  statusHistory?: StatusHistoryItem[];
}

const roleOrder = [
  "callcenter",
  "packer",
  "warehouse",
  "deliveryman",
  "accounts",
  "incharge",
  "admin",
  "system",
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-red-500 text-white hover:bg-red-600";
    case "callcenter":
      return "bg-blue-500 text-white hover:bg-blue-600";
    case "packer":
      return "bg-purple-500 text-white hover:bg-purple-600";
    case "warehouse":
      return "bg-brand-red-accent text-white hover:bg-brand-red-accent";
    case "deliveryman":
      return "bg-success-base text-white hover:bg-success-base";
    case "accounts":
      return "bg-yellow-500 text-white hover:bg-yellow-600";
    case "incharge":
      return "bg-pink-500 text-white hover:bg-pink-600";
    default:
      return "bg-gray-500 text-white hover:bg-gray-600";
  }
};

export default function OrderNotes({ statusHistory }: OrderNotesProps) {
  const { t } = useTranslation();
  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  // Filter only items with notes
  const notesItems = statusHistory.filter(
    (item) => item.notes && item.notes.trim() !== ""
  );

  if (notesItems.length === 0) {
    return null;
  }

  // Sort by role order and then by date
  const sortedNotes = [...notesItems].sort((a, b) => {
    const roleIndexA = roleOrder.indexOf(a.changedByRole);
    const roleIndexB = roleOrder.indexOf(b.changedByRole);

    if (roleIndexA !== roleIndexB) {
      return roleIndexA - roleIndexB;
    }

    return new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime();
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "callcenter":
        return t("employee.accounts.orderNotes.roles.sales");
      case "deliveryman":
        return t("employee.accounts.orderNotes.roles.delivery");
      case "incharge":
        return t("employee.accounts.orderNotes.roles.incharge");
      default:
        return t("employee.accounts.orderNotes.roles.default", {
          role: role.charAt(0).toUpperCase() + role.slice(1),
        });
    }
  };

  const getStatusLabel = (status: string) =>
    t(`employee.orders.status.${status}`, status);

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-brand-black-strong" />
          <h3 className="font-semibold text-brand-black-strong">
            {t("employee.accounts.orderNotes.title")}
          </h3>
          <Badge variant="secondary" className="ml-auto">
            {sortedNotes.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {sortedNotes.map((item, index) => (
            <div
              key={index}
              className={cn(
                "relative p-4 rounded-lg border transition-all duration-300 animate-fade-in",
                item.changedByRole === "admin"
                  ? "bg-red-50 border-red-200 shadow-md ring-2 ring-red-100"
                  : "bg-gray-50 border-gray-200 hover:shadow-sm"
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Admin highlight badge */}
              {item.changedByRole === "admin" && (
                <div className="absolute -top-2 -right-2 animate-pulse">
                  <Badge className="bg-red-500 text-white gap-1 shadow-lg">
                    <AlertCircle className="w-3 h-3" />
                    {t("employee.accounts.orderNotes.adminBadge")}
                  </Badge>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={cn(
                      "text-xs font-semibold",
                      getRoleBadgeColor(item.changedByRole)
                    )}
                  >
                    {getRoleLabel(item.changedByRole)}
                  </Badge>
                  <span className="text-sm font-medium text-gray-900">
                    {item.changedBy}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {t("employee.accounts.orderNotes.changedAt", {
                    date: format(new Date(item.changedAt), "MMM dd, yyyy"),
                    time: format(new Date(item.changedAt), "HH:mm"),
                  })}
                </span>
              </div>

              {/* Status */}
              <div className="text-xs text-muted-foreground mb-2">
                {t("employee.accounts.orderNotes.statusLabel")}{" "}
                <span className="font-medium">
                  {getStatusLabel(item.status)}
                </span>
              </div>

              {/* Notes content */}
              <div
                className={cn(
                  "text-sm leading-relaxed whitespace-pre-wrap",
                  item.changedByRole === "admin"
                    ? "text-red-900 font-medium"
                    : "text-gray-700"
                )}
              >
                {item.notes}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
