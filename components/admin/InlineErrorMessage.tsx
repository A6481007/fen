"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type InlineErrorMessageProps = {
  message?: string | null;
  fallbackKey?: string;
  className?: string;
};

const InlineErrorMessage = ({
  message,
  fallbackKey,
  className,
}: InlineErrorMessageProps) => {
  const { t } = useTranslation();
  const fallback =
    fallbackKey && t(fallbackKey) !== fallbackKey
      ? t(fallbackKey)
      : "Something went wrong.";
  const resolvedMessage = message
    ? message.startsWith("admin.")
      ? t(message)
      : message
    : fallback;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>{resolvedMessage}</span>
    </div>
  );
};

export default InlineErrorMessage;
