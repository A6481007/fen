"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  Package,
  XCircle,
  Wallet,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/orderStatus";
import PriceFormatter from "./PriceFormatter";
import { MY_ORDERS_QUERYResult } from "@/sanity.types";
import DirectPaymentModal from "./DirectPaymentModal";
import OrderStatusBadge from "./orders/OrderStatusBadge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type OrderListItem = MY_ORDERS_QUERYResult[number] & {
  cancellationRequested?: boolean | null;
};

const ResponsiveOrdersComponent = ({
  orders,
}: {
  orders: OrderListItem[];
}) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<
    OrderListItem | null
  >(null);
  const [cancellingQuotation, setCancellingQuotation] = useState<
    Record<string, boolean>
  >({});
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OrderListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const router = useRouter();

  const handlePayNow = (orderId: string) => {
    if (!orderId) return;

    const order = orders.find((item) => item._id === orderId);
    if (order) {
      setSelectedOrder(order);
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentModalClose = () => {
    setPaymentModalOpen(false);
    setSelectedOrder(null);
  };

  const openCancelQuotationDialog = (order: OrderListItem) => {
    setCancelTarget(order);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleCancelQuotation = async (
    orderId: string,
    reason: string
  ) => {
    if (!orderId) return;
    setCancellingQuotation((prev) => ({ ...prev, [orderId]: true }));
    try {
      const response = await fetch(
        `/api/orders/${orderId}/cancel-quotation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason || "Cancelled by customer",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to cancel quotation.");
      }

      toast.success("Quotation cancelled.", {
        description: data?.message || undefined,
      });
      setCancelDialogOpen(false);
      setCancelTarget(null);
      setCancelReason("");
      router.refresh();
    } catch (error) {
      console.error("Failed to cancel quotation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel quotation."
      );
    } finally {
      setCancellingQuotation((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const isOrderPayable = (order: OrderListItem) => {
    const isPaid = order.paymentStatus === PAYMENT_STATUSES.PAID;
    const isCancelled = order.status === ORDER_STATUSES.CANCELLED;
    const isQuotation = order.status === ORDER_STATUSES.QUOTATION_REQUESTED;
    const isCreditPayment = order.paymentMethod === PAYMENT_METHODS.CREDIT;
    return !isPaid && !isCancelled && !isQuotation && !isCreditPayment;
  };

  const handleCardNavigate = (orderId: string) => {
    router.push(`/user/orders/${orderId}`);
  };

  const OrderCard = ({ order }: { order: OrderListItem }) => {
    const isQuotation = order.status === ORDER_STATUSES.QUOTATION_REQUESTED;
    const isCancelled = order.status === ORDER_STATUSES.CANCELLED;
    const typeLabel = isQuotation ? "Quotation" : "Order";
    const orderNumber = order.orderNumber || "N/A";
    const orderDate = order.orderDate
      ? format(new Date(order.orderDate), "MMM dd, yyyy")
      : "Date unavailable";
    const showCancellationBadge =
      order.cancellationRequested &&
      order.status !== ORDER_STATUSES.CANCELLED;
    const isCancelling = Boolean(cancellingQuotation[order._id]);
    const paymentLabels: Record<string, string> = {
      [PAYMENT_METHODS.STRIPE]: "Card (Stripe)",
      [PAYMENT_METHODS.CARD]: "Card",
      [PAYMENT_METHODS.CLERK]: "Invoice (Clerk)",
      [PAYMENT_METHODS.CASH_ON_DELIVERY]: "Cash on Delivery",
      [PAYMENT_METHODS.CREDIT]: "Credit Payment",
    };
    const paymentMethodKey = order.paymentMethod || "";
    const paymentMethodLabel =
      paymentLabels[paymentMethodKey] ||
      (paymentMethodKey
        ? paymentMethodKey.replace(/_/g, " ")
        : "Payment pending");
    const PaymentIcon =
      paymentMethodKey === PAYMENT_METHODS.CASH_ON_DELIVERY
        ? Wallet
        : paymentMethodKey === PAYMENT_METHODS.CLERK
          ? FileText
          : CreditCard;

    return (
      <Card
        role="link"
        tabIndex={0}
        aria-label={`View ${typeLabel.toLowerCase()} ${orderNumber}`}
        onClick={() => handleCardNavigate(order._id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardNavigate(order._id);
          }
        }}
        className="w-full cursor-pointer border border-gray-200 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <CardHeader className="space-y-2 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-gray-500">
                {typeLabel}
              </p>
              <h3
                className="text-base font-semibold text-gray-900 truncate"
                title={orderNumber}
              >
                Order #{orderNumber}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-1">
              <OrderStatusBadge status={order.status} className="text-xs" />
              {showCancellationBadge && (
                <Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] uppercase tracking-wide">
                  Cancellation Requested
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{orderDate}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Amount</p>
              <PriceFormatter
                amount={order.totalPrice}
                className="text-lg font-semibold text-gray-900"
              />
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                <span className="uppercase tracking-wide">Payment</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-700">
                  <PaymentIcon className="h-3 w-3" />
                  {paymentMethodLabel}
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-xs text-gray-600"
            >
              {isQuotation ? (
                <FileText className="h-3.5 w-3.5" />
              ) : (
                <Package className="h-3.5 w-3.5" />
              )}
              {typeLabel}
            </Badge>
          </div>
          {isOrderPayable(order) && (
            <div
              className="flex flex-col sm:flex-row gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  handlePayNow(order._id);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </div>
          )}
          {isQuotation && !isCancelled && (
            <div
              className="flex flex-col sm:flex-row gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  openCancelQuotationDialog(order);
                }}
                variant="destructive"
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Quotation
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {selectedOrder && selectedOrder._id && selectedOrder.orderNumber && (
        <DirectPaymentModal
          isOpen={paymentModalOpen}
          onClose={handlePaymentModalClose}
          orderId={selectedOrder._id}
          orderTotal={selectedOrder.totalPrice || 0}
          orderNumber={selectedOrder.orderNumber}
        />
      )}

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Quotation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this quotation request? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-quotation-reason">
              Reason (optional)
            </Label>
            <Textarea
              id="cancel-quotation-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Share the reason for cancelling this quotation."
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelTarget(null);
                setCancelReason("");
              }}
            >
              Keep Quotation
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelTarget?._id) {
                  void handleCancelQuotation(
                    cancelTarget._id,
                    cancelReason.trim()
                  );
                }
              }}
              disabled={
                !cancelTarget?._id ||
                Boolean(
                  cancelTarget?._id &&
                    cancellingQuotation[cancelTarget._id]
                )
              }
            >
              {cancelTarget?._id &&
              cancellingQuotation[cancelTarget._id] ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Quotation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {orders.map((order) => (
        <OrderCard key={order._id} order={order} />
      ))}
    </div>
  );
};

export default ResponsiveOrdersComponent;
