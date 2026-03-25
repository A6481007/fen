import { Badge } from "@/components/ui/badge";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  FileText,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

type OrderStatusBadgeProps = {
  status?: string | null;
  className?: string;
  iconClassName?: string;
};

type StatusMeta = {
  label: string;
  className: string;
  Icon: typeof Clock;
};

const formatOrderStatusLabel = (status?: string | null) => {
  if (!status) {
    return "Pending";
  }

  const normalized = status.toLowerCase();
  if (normalized === ORDER_STATUSES.QUOTATION_REQUESTED) {
    return "Quotation";
  }

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getStatusMeta = (status?: string | null): StatusMeta => {
  const normalized = status?.toLowerCase() ?? ORDER_STATUSES.PENDING;

  if (normalized === ORDER_STATUSES.QUOTATION_REQUESTED) {
    return {
      label: "Quotation",
      className: "bg-blue-100 text-blue-800",
      Icon: FileText,
    };
  }

  if (
    normalized === ORDER_STATUSES.DELIVERED ||
    normalized === ORDER_STATUSES.PAID ||
    normalized === "completed"
  ) {
    return {
      label: formatOrderStatusLabel(normalized),
      className: "bg-success-highlight text-success-base",
      Icon: CheckCircle,
    };
  }

  if (normalized === ORDER_STATUSES.CANCELLED || normalized === "failed_delivery") {
    return {
      label: formatOrderStatusLabel(normalized),
      className: "bg-red-100 text-red-800",
      Icon: XCircle,
    };
  }

  if (normalized === "packed" || normalized === "ready_for_delivery") {
    return {
      label: formatOrderStatusLabel(normalized),
      className: "bg-blue-100 text-blue-800",
      Icon: Package,
    };
  }

  if (
    normalized === ORDER_STATUSES.SHIPPED ||
    normalized === ORDER_STATUSES.OUT_FOR_DELIVERY
  ) {
    return {
      label: formatOrderStatusLabel(normalized),
      className: "bg-blue-100 text-blue-800",
      Icon: Truck,
    };
  }

  return {
    label: formatOrderStatusLabel(normalized),
    className: "bg-yellow-100 text-yellow-800",
    Icon: Clock,
  };
};

const OrderStatusBadge = ({
  status,
  className,
  iconClassName,
}: OrderStatusBadgeProps) => {
  const { label, className: statusClassName, Icon } = getStatusMeta(status);

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        statusClassName,
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", iconClassName)} />
      <span>{label}</span>
    </Badge>
  );
};

export default OrderStatusBadge;
