"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileText,
  MapPin,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/orderStatus";

interface TimelineStep {
  key: string;
  label: string;
  date?: string;
  icon: React.ReactNode;
  isCancelledStep?: boolean;
}

interface OrderTimelineProps {
  order: {
    orderDate: string;
    addressConfirmedAt?: string;
    orderConfirmedAt?: string;
    packedAt?: string;
    dispatchedAt?: string;
    deliveredAt?: string;
    status: string;
    cancelledAt?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    clerkPaymentStatus?: string;
    paymentCompletedAt?: string;
    invoice?: { hosted_invoice_url?: string };
  };
}

const STATUS_STAGE_MAP: Record<string, number> = {
  [ORDER_STATUSES.PENDING]: 0,
  [ORDER_STATUSES.PROCESSING]: 0,
  [ORDER_STATUSES.QUOTATION_REQUESTED]: 0,
  address_confirmed: 1,
  order_confirmed: 2,
  packed: 3,
  ready_for_delivery: 4,
  [ORDER_STATUSES.SHIPPED]: 4,
  [ORDER_STATUSES.OUT_FOR_DELIVERY]: 4,
  rescheduled: 1,
  failed_delivery: 4,
};

const FINAL_STATUSES = new Set([
  ORDER_STATUSES.DELIVERED,
  ORDER_STATUSES.PAID,
  "completed",
]);

const formatDate = (value?: string) => {
  if (!value) return "";
  return format(new Date(value), "MMM dd, yyyy");
};

const OrderTimeline: React.FC<OrderTimelineProps> = ({ order }) => {
  const isCancelled = order.status === ORDER_STATUSES.CANCELLED;
  const isCreditPayment = order.paymentMethod === PAYMENT_METHODS.CREDIT;
  const isInvoicePayment = order.paymentMethod === PAYMENT_METHODS.CLERK;
  const paymentStepOffset = isCreditPayment || isInvoicePayment ? 2 : 0;
  const paymentStatus = order.paymentStatus ?? "";
  const clerkPaymentStatus = order.clerkPaymentStatus ?? "";
  const isCreditApproved =
    paymentStatus === PAYMENT_STATUSES.CREDIT_APPROVED ||
    paymentStatus === PAYMENT_STATUSES.PAID;
  const isCreditRejected = paymentStatus === PAYMENT_STATUSES.CREDIT_REJECTED;
  const isCreditRequested = paymentStatus === PAYMENT_STATUSES.CREDIT_REQUESTED;
  const creditDecisionLabel = isCreditRejected
    ? "Credit Rejected"
    : isCreditApproved
      ? "Credit Approved"
      : "Credit Review";
  const creditDecisionIcon = isCreditRejected ? (
    <XCircle className="h-4 w-4" />
  ) : isCreditApproved ? (
    <CheckCircle className="h-4 w-4" />
  ) : (
    <Clock className="h-4 w-4" />
  );
  const invoiceSentStatuses = new Set([
    "invoice_sent",
    "pending",
    "unpaid",
    "completed",
    "paid",
  ]);
  const isInvoiceSent =
    Boolean(order.invoice?.hosted_invoice_url) ||
    invoiceSentStatuses.has(clerkPaymentStatus);
  const isInvoicePaid =
    clerkPaymentStatus === "paid" ||
    paymentStatus === PAYMENT_STATUSES.PAID;
  const invoicePaymentLabel = isInvoicePaid
    ? "Invoice Paid"
    : "Invoice Pending";

  const baseSteps: TimelineStep[] = [
    {
      key: "order_placed",
      label: "Order Placed",
      date: order.orderDate,
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      key: "address_confirmed",
      label: "Address Confirmed",
      date: order.addressConfirmedAt,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      key: "order_confirmed",
      label: "Order Confirmed",
      date: order.orderConfirmedAt,
      icon: <CheckCircle className="h-4 w-4" />,
    },
    {
      key: "packed",
      label: "Packed",
      date: order.packedAt,
      icon: <Package className="h-4 w-4" />,
    },
    {
      key: "shipped",
      label: "Shipped / Out for Delivery",
      date: order.dispatchedAt,
      icon: <Truck className="h-4 w-4" />,
    },
    {
      key: "delivered",
      label: "Delivered",
      date: order.deliveredAt,
      icon: <CheckCircle className="h-4 w-4" />,
    },
  ];

  const creditSteps: TimelineStep[] = [
    baseSteps[0],
    {
      key: "credit_requested",
      label: "Credit Requested",
      date: order.orderDate,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      key: "credit_review",
      label: creditDecisionLabel,
      date: isCreditApproved ? order.paymentCompletedAt : undefined,
      icon: creditDecisionIcon,
      isCancelledStep: isCreditRejected,
    },
    ...baseSteps.slice(1),
  ];

  const invoiceSteps: TimelineStep[] = [
    baseSteps[0],
    {
      key: "invoice_sent",
      label: "Invoice Sent",
      date: isInvoiceSent ? order.orderDate : undefined,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: "invoice_paid",
      label: invoicePaymentLabel,
      date: isInvoicePaid ? order.paymentCompletedAt : undefined,
      icon: <CheckCircle className="h-4 w-4" />,
    },
    ...baseSteps.slice(1),
  ];

  const steps: TimelineStep[] = isCancelled
    ? [
        baseSteps[0],
        {
          key: "cancelled",
          label: "Cancelled",
          date: order.cancelledAt,
          icon: <XCircle className="h-4 w-4" />,
          isCancelledStep: true,
        },
      ]
    : isCreditPayment
      ? creditSteps
      : isInvoicePayment
        ? invoiceSteps
        : baseSteps;

  const lastDateIndex = steps.reduce((acc, step, index) => {
    if (step.date) return index;
    return acc;
  }, -1);

  const statusStage = STATUS_STAGE_MAP[order.status] ?? 0;
  const fulfillmentStage =
    statusStage === 0 ? 0 : statusStage + paymentStepOffset;
  let progressStage = fulfillmentStage;
  if (isCreditPayment) {
    if (isCreditRequested || isCreditApproved || isCreditRejected) {
      progressStage = Math.max(progressStage, 1);
    }
    if (isCreditApproved) {
      progressStage = Math.max(progressStage, 3);
    }
    if (isCreditRejected) {
      progressStage = Math.max(progressStage, 2);
    }
  } else if (isInvoicePayment) {
    if (isInvoiceSent) {
      progressStage = Math.max(progressStage, 1);
    }
    if (isInvoicePaid) {
      progressStage = Math.max(progressStage, 3);
    }
  }
  if (FINAL_STATUSES.has(order.status)) {
    progressStage = steps.length;
  }

  const progressFromDates = lastDateIndex >= 0 ? lastDateIndex + 1 : 0;
  progressStage = Math.min(Math.max(progressStage, progressFromDates), steps.length);

  const currentIndex = progressStage < steps.length ? progressStage : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-linear-to-r from-brand-border to-white">
        <CardTitle className="flex items-center gap-2 text-brand-black-strong">
          <Clock className="w-5 h-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isCancelled && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">
              Order Cancelled
            </p>
            {order.cancelledAt && (
              <p className="text-xs text-red-600 mt-1">
                Cancelled on {formatDate(order.cancelledAt)}
              </p>
            )}
          </div>
        )}

        <ol className="relative border-l border-gray-200 pl-8 space-y-6">
          {steps.map((step, index) => {
            const isCompleted = index < progressStage;
            const isCurrent = currentIndex === index;
            const isCancelledStep = Boolean(step.isCancelledStep);
            const dateLabel = step.date ? formatDate(step.date) : "";

            return (
              <li key={step.key} className="relative pl-2">
                <span
                  className={cn(
                    "absolute -left-4 flex h-7 w-7 items-center justify-center rounded-full border",
                    isCancelledStep && "border-red-300 bg-red-100 text-red-600",
                    !isCancelledStep &&
                      isCompleted &&
                      "border-brand-black-strong bg-brand-black-strong text-white",
                    !isCancelledStep &&
                      isCurrent &&
                      "border-brand-red-accent bg-brand-red-accent text-white",
                    !isCancelledStep &&
                      !isCompleted &&
                      !isCurrent &&
                      "border-gray-200 bg-white text-gray-400"
                  )}
                >
                  {isCancelledStep ? (
                    step.icon
                  ) : isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isCurrent ? (
                    step.icon
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isCancelledStep && "text-red-700",
                        isCurrent && !isCancelledStep && "text-brand-red-accent",
                        isCompleted && !isCancelledStep && "text-gray-900",
                        !isCompleted && !isCurrent && !isCancelledStep && "text-gray-500"
                      )}
                    >
                      {step.label}
                    </p>
                    {isCurrent && !isCancelledStep && (
                      <Badge className="bg-brand-red-accent/10 text-brand-red-accent">
                        Current
                      </Badge>
                    )}
                  </div>
                  {dateLabel && (
                    <p className="text-xs text-gray-500">{dateLabel}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
};

export default OrderTimeline;
