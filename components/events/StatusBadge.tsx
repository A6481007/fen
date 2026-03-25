import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/sanity/helpers/eventStatus";

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "Happening now",
  ended: "Ended",
};

const STATUS_STYLES: Record<EventStatus, string> = {
  upcoming: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ongoing: "bg-amber-50 text-amber-800 border-amber-200",
  ended: "bg-gray-100 text-gray-600 border-gray-200",
};

type StatusBadgeProps = {
  status: EventStatus;
  className?: string;
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-full px-3 py-1 text-xs font-semibold",
      STATUS_STYLES[status],
      className
    )}
  >
    {STATUS_LABELS[status]}
  </Badge>
);

export default StatusBadge;
