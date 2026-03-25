"use client";

import * as React from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

type LegacyToast = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
} & Omit<ExternalToast, "description">;

type ToastInput = React.ReactNode | LegacyToast;

type ToastFn = typeof sonnerToast & {
  (message: React.ReactNode, data?: ExternalToast): string | number;
  (options: LegacyToast): string | number;
};

const isLegacyToastInput = (value: ToastInput): value is LegacyToast => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value) || React.isValidElement(value)) {
    return false;
  }

  return "title" in value || "description" in value || "variant" in value;
};

const toast = Object.assign(
  (messageOrOptions: ToastInput, data?: ExternalToast) => {
    if (isLegacyToastInput(messageOrOptions) && data === undefined) {
      const { title, description, variant, ...rest } = messageOrOptions;
      const message = title ?? description ?? "";
      const options: ExternalToast = {
        ...rest,
        ...(title ? { description } : {}),
      };

      switch (variant) {
        case "destructive":
          return sonnerToast.error(message, options);
        case "success":
          return sonnerToast.success(message, options);
        case "info":
          return sonnerToast.info(message, options);
        case "warning":
          return sonnerToast.warning(message, options);
        default:
          return sonnerToast(message, options);
      }
    }

    return sonnerToast(messageOrOptions as React.ReactNode, data);
  },
  sonnerToast,
) as ToastFn;

export type UseToastReturn = {
  toast: ToastFn;
};

export function useToast(): UseToastReturn {
  return { toast };
}
