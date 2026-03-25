import { cn } from "@/lib/utils";
import { Lock, Unlock } from "lucide-react";

type LockBadgeProps = {
  isLocked?: boolean;
  reason?: string | null;
  className?: string;
};

const LockBadge = ({ isLocked = true, reason, className }: LockBadgeProps) => {
  const label = reason?.trim() || (isLocked ? "Locked" : "Unlocked");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
        isLocked ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200",
        className
      )}
    >
      {isLocked ? (
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="leading-none">{label}</span>
    </span>
  );
};

export default LockBadge;
