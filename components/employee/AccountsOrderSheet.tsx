"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  User,
  Mail,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  receivePaymentFromDeliveryman,
  rejectCashSubmission,
} from "@/actions/orderEmployeeActions";
import PriceFormatter from "../PriceFormatter";
import OrderNotes from "./OrderNotes";
import { useTranslation } from "react-i18next";

type Order = {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderDate: string;
  shippingAddress?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  products: Array<{
    _key: string;
    quantity: number;
    unitPrice?: number;
    lineTotal?: number;
    product: {
      _id: string;
      name: string;
      price: number;
      image?: string;
    };
  }>;
  deliveredAt?: string;
  cashCollected?: boolean;
  cashCollectedAmount?: number;
  cashCollectedAt?: string;
  cashSubmittedToAccounts?: boolean;
  cashSubmittedBy?: string;
  cashSubmittedAt?: string;
  cashSubmissionNotes?: string;
  cashSubmissionStatus?: string;
  cashSubmissionRejectionReason?: string;
  assignedAccountsEmployeeId?: string;
  assignedAccountsEmployeeName?: string;
  paymentReceivedBy?: string;
  paymentReceivedAt?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paymentCompletedAt?: string;
  statusHistory?: Array<{
    status: string;
    changedBy: string;
    changedByRole: string;
    changedAt: string;
    notes?: string;
  }>;
};

interface AccountsOrderSheetProps {
  order: Order;
  open: boolean;
  onClose: () => void;
}

export default function AccountsOrderSheet({
  order,
  open,
  onClose,
}: AccountsOrderSheetProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleReceivePayment = async () => {
    if (order.paymentReceivedBy) {
      toast.error(t("employee.accounts.sheet.toast.alreadyReceived"));
      return;
    }

    setLoading(true);
    try {
      const result = await receivePaymentFromDeliveryman(order._id, notes);
      if (result.success) {
        toast.success(t("employee.accounts.sheet.toast.paymentReceived"));
        setNotes("");
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.accounts.sheet.toast.receiveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmission = async () => {
    if (!rejectionReason.trim()) {
      toast.error(t("employee.accounts.sheet.toast.rejectionReasonRequired"));
      return;
    }

    setRejecting(true);
    try {
      const result = await rejectCashSubmission(order._id, rejectionReason);
      if (result.success) {
        toast.success(t("employee.accounts.sheet.toast.rejected"));
        setRejectionReason("");
        setShowRejectForm(false);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.accounts.sheet.toast.rejectFailed"));
    } finally {
      setRejecting(false);
    }
  };

  const handleSheetOpenChange = (open: boolean) => {
    // Prevent closing if payment is being processed
    if (!open && loading) {
      toast.warning(t("employee.accounts.sheet.toast.waitForAction"));
      return;
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="sm:max-w-2xl p-0 flex flex-col h-full">
        {/* Sticky Header */}
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center justify-between">
            <span>
              {t("employee.accounts.sheet.title", {
                number: order.orderNumber,
              })}
            </span>
            <Badge
              variant={
                order.paymentReceivedBy
                  ? "default"
                  : order.status === "delivered"
                  ? "secondary"
                  : "outline"
              }
            >
              {order.status}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-20">
          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("employee.accounts.sheet.sections.customerInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.accounts.sheet.labels.name")}
                </span>
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.accounts.sheet.labels.email")}
                </span>
                <span className="text-xs">{order.email}</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Delivery Address */}
          {order.shippingAddress && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t("employee.accounts.sheet.sections.deliveryAddress")}
                </h3>
                <div className="text-sm bg-muted/50 p-3 rounded-lg">
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}
                    {order.shippingAddress.state &&
                      `, ${order.shippingAddress.state}`}
                  </p>
                  {order.shippingAddress.postalCode && (
                    <p>{order.shippingAddress.postalCode}</p>
                  )}
                  <p>{order.shippingAddress.country}</p>
                </div>
              </div>
              <Separator className="my-4" />
            </>
          )}

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t("employee.accounts.sheet.sections.orderItems", {
                count: order.products.length,
              })}
            </h3>
            <div className="space-y-2">
              {order.products.map((item) => (
                <div
                  key={item._key}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {item.product.image && (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("employee.accounts.sheet.labels.quantity")}{" "}
                      {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <PriceFormatter
                      amount={
                        item.lineTotal ??
                        (item.unitPrice ?? item.product.price) * item.quantity
                      }
                      className="font-semibold text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Payment Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t("employee.accounts.sheet.sections.paymentInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.accounts.sheet.labels.paymentMethod")}
                </span>
                <Badge variant="outline">{order.paymentMethod}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.accounts.sheet.labels.totalAmount")}
                </span>
                <PriceFormatter
                  amount={order.totalPrice}
                  className="font-bold"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.accounts.sheet.labels.paymentStatus")}
                </span>
                <Badge
                  variant={
                    order.paymentStatus === "paid" ? "default" : "secondary"
                  }
                >
                  {order.paymentStatus}
                </Badge>
              </div>

              {/* Online Payment Details */}
              {order.stripePaymentIntentId && (
                <>
                  <Separator className="my-2" />
                  <div className="bg-green-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs text-success-base font-medium mb-2">
                      <CheckCircle className="w-3 h-3" />
                      {t("employee.accounts.sheet.onlinePayment.title")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.accounts.sheet.onlinePayment.amount")}
                      </span>
                      <span className="font-semibold text-success-base">
                        <PriceFormatter amount={order.totalPrice} />
                      </span>
                    </div>
                    {order.paymentCompletedAt && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("employee.accounts.sheet.onlinePayment.paidAt")}
                        </span>
                        <span>
                          {format(
                            new Date(order.paymentCompletedAt),
                            "MMM d, yyyy h:mm a"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t("employee.accounts.sheet.onlinePayment.paymentId")}
                      </span>
                      <span className="font-mono text-[10px]">
                        {order.stripePaymentIntentId.substring(0, 20)}...
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Cash Submission Details */}
              {order.cashSubmittedToAccounts && (
                <>
                  <Separator className="my-2" />
                  <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.accounts.sheet.cashSubmission.cashAmount")}
                      </span>
                      <span className="font-semibold text-blue-700">
                        ${order.cashCollectedAmount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t("employee.accounts.sheet.cashSubmission.submittedBy")}
                      </span>
                      <span className="font-medium">
                        {order.cashSubmittedBy}
                      </span>
                    </div>
                    {order.assignedAccountsEmployeeName && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("employee.accounts.sheet.cashSubmission.assignedTo")}
                        </span>
                        <span className="font-medium text-blue-700">
                          {order.assignedAccountsEmployeeName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t("employee.accounts.sheet.cashSubmission.submittedAt")}
                      </span>
                      <span>
                        {order.cashSubmittedAt &&
                          format(
                            new Date(order.cashSubmittedAt),
                            "MMM d, yyyy h:mm a"
                          )}
                      </span>
                    </div>
                    {order.cashSubmissionNotes && (
                      <div className="border-t border-blue-200 pt-2 mt-2">
                        <div className="text-xs text-muted-foreground mb-1">
                          {t(
                            "employee.accounts.sheet.cashSubmission.notesLabel"
                          )}
                        </div>
                        <div className="text-xs bg-white p-2 rounded">
                          {order.cashSubmissionNotes}
                        </div>
                      </div>
                    )}

                    {/* Receipt Status */}
                    {order.paymentReceivedBy ? (
                      <div className="border-t border-success-highlight pt-2 mt-2">
                        <div className="flex items-center gap-2 text-xs text-success-base font-medium mb-2">
                          <CheckCircle className="w-3 h-3" />
                          {t(
                            "employee.accounts.sheet.cashSubmission.receivedTitle"
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t(
                              "employee.accounts.sheet.cashSubmission.receivedBy"
                            )}
                          </span>
                          <span className="font-medium">
                            {order.paymentReceivedBy}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t(
                              "employee.accounts.sheet.cashSubmission.receivedAt"
                            )}
                          </span>
                          <span>
                            {order.paymentReceivedAt &&
                              format(
                                new Date(order.paymentReceivedAt),
                                "MMM d, h:mm a"
                              )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-brand-red-accent/20 pt-3 mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-brand-red-accent font-medium">
                          <Clock className="w-3 h-3" />
                          {t(
                            "employee.accounts.sheet.cashSubmission.pendingTitle"
                          )}
                        </div>

                        {!showRejectForm ? (
                          <>
                            <div>
                              <Label htmlFor="receiptNotes" className="text-xs">
                                {t(
                                  "employee.accounts.sheet.cashSubmission.receiptNotesLabel"
                                )}
                              </Label>
                              <Textarea
                                id="receiptNotes"
                                placeholder={t(
                                  "employee.accounts.sheet.cashSubmission.receiptNotesPlaceholder"
                                )}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="mt-1 text-xs"
                                rows={2}
                                disabled={loading}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleReceivePayment}
                                disabled={loading}
                                size="sm"
                                className="flex-1"
                              >
                                <CheckCircle className="w-3 h-3 mr-2" />
                                {loading
                                  ? t(
                                      "employee.accounts.sheet.cashSubmission.processing"
                                    )
                                  : t(
                                      "employee.accounts.sheet.cashSubmission.receiveCash"
                                    )}
                              </Button>
                              <Button
                                onClick={() => setShowRejectForm(true)}
                                disabled={loading}
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                              >
                                {t(
                                  "employee.accounts.sheet.cashSubmission.reject"
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              {t(
                                "employee.accounts.sheet.cashSubmission.confirmReceiptHint"
                              )}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="bg-red-50 p-2 rounded">
                              <p className="text-xs text-red-700 font-medium mb-2">
                                {t(
                                  "employee.accounts.sheet.cashSubmission.rejectingTitle"
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "employee.accounts.sheet.cashSubmission.rejectingSubtitle"
                                )}
                              </p>
                            </div>
                            <div>
                              <Label
                                htmlFor="rejectionReason"
                                className="text-xs"
                              >
                                {t(
                                  "employee.accounts.sheet.cashSubmission.rejectionReason"
                                )}{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Textarea
                                id="rejectionReason"
                                placeholder={t(
                                  "employee.accounts.sheet.cashSubmission.rejectionReasonPlaceholder"
                                )}
                                value={rejectionReason}
                                onChange={(e) =>
                                  setRejectionReason(e.target.value)
                                }
                                className="mt-1 text-xs"
                                rows={3}
                                disabled={rejecting}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setShowRejectForm(false);
                                  setRejectionReason("");
                                }}
                                disabled={rejecting}
                                size="sm"
                                variant="outline"
                                className="flex-1"
                              >
                                {t(
                                  "employee.accounts.sheet.cashSubmission.cancel"
                                )}
                              </Button>
                              <Button
                                onClick={handleRejectSubmission}
                                disabled={rejecting || !rejectionReason.trim()}
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                              >
                                {rejecting
                                  ? t(
                                      "employee.accounts.sheet.cashSubmission.rejecting"
                                    )
                                  : t(
                                      "employee.accounts.sheet.cashSubmission.confirmRejection"
                                    )}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Order Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t("employee.accounts.sheet.sections.orderTimeline")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.accounts.sheet.labels.ordered")}
                </span>
                <span>
                  {format(new Date(order.orderDate), "MMM d, yyyy h:mm a")}
                </span>
              </div>
              {order.deliveredAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.accounts.sheet.labels.delivered")}
                  </span>
                  <span>
                    {format(new Date(order.deliveredAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              )}
              {order.cashCollectedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.accounts.sheet.labels.cashCollected")}
                  </span>
                  <span>
                    {format(
                      new Date(order.cashCollectedAt),
                      "MMM d, yyyy h:mm a"
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Notes */}
          <OrderNotes statusHistory={order.statusHistory} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
