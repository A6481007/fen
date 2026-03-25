import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import { Clock3, Lock, LockKeyhole, Unlock, Users } from "lucide-react";

export type LockBadgeVariant = "event-locked" | "auth-required" | "coming-soon" | "capacity-full";

export type LockBadgeProps = {
  variant?: LockBadgeVariant;
  reason?: string | null;
  message?: string | null;
  isLocked?: boolean;
  animated?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
  ariaLabel?: string;
};

type VariantConfig = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  className: string;
};

const variantConfig: Record<LockBadgeVariant | "unlocked", VariantConfig> = {
  "event-locked": {
    label: "Event locked",
    icon: Lock,
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  "auth-required": {
    label: "Sign-in required",
    icon: LockKeyhole,
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  "coming-soon": {
    label: "Coming soon",
    icon: Clock3,
    className: "bg-gray-100 text-gray-700 ring-gray-200",
  },
  "capacity-full": {
    label: "Capacity full",
    icon: Users,
    className: "bg-rose-50 text-rose-800 ring-rose-200",
  },
  unlocked: {
    label: "Unlocked",
    icon: Unlock,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
};

/**
 * Pill-style badge for locked states. Defaults to `event-locked` but switches to the
 * "unlocked" styling when `isLocked` is explicitly false. Accepts custom icon/aria label overrides.
 */
const LockBadge = ({
  variant = "event-locked",
  isLocked = true,
  reason,
  message,
  animated = false,
  icon,
  className,
  ariaLabel,
}: LockBadgeProps) => {
  const resolvedVariant: LockBadgeVariant | "unlocked" = isLocked === false ? "unlocked" : variant;
  const config = variantConfig[resolvedVariant] || variantConfig["event-locked"];
  const IconComponent = icon || config.icon;
  const contentMessage = (message ?? reason ?? "").trim();
  const visibleMessage = contentMessage || config.label;
  const labelPrefix = config.label;
  const computedAriaLabel = ariaLabel || `${labelPrefix}${contentMessage ? `: ${contentMessage}` : ""}`;
  const animate = animated && resolvedVariant === "coming-soon";

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
        config.className,
        animate ? "motion-safe:animate-pulse" : "",
        className
      )}
      aria-label={computedAriaLabel}
      title={computedAriaLabel}
      data-variant={resolvedVariant}
      data-animated={animate ? "true" : "false"}
    >
      <IconComponent className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
      <span className="leading-none">{visibleMessage}</span>
    </span>
  );
};

export default LockBadge;
