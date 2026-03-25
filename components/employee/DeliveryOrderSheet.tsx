"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Package,
  DollarSign,
  Truck,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  startDelivery,
  markAsDelivered,
  rescheduleDelivery,
  markDeliveryFailed,
  collectCash,
  submitCashToAccounts,
  getActiveAccountsEmployees,
} from "@/actions/orderEmployeeActions";
import PriceFormatter from "../PriceFormatter";
import OrderNotes from "./OrderNotes";
import { useTranslation } from "react-i18next";

type Order = {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone?: string;
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
    phone?: string;
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
  dispatchedAt?: string;
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
  rescheduledDate?: string;
  deliveryAttempts?: number;
  deliveryNotes?: string;
  statusHistory?: Array<{
    status: string;
    changedBy: string;
    changedByRole: string;
    changedAt: string;
    notes?: string;
  }>;
};

interface DeliveryOrderSheetProps {
  order: Order;
  open: boolean;
  onClose: () => void;
}

export default function DeliveryOrderSheet({
  order,
  open,
  onClose,
}: DeliveryOrderSheetProps) {
  const { t } = useTranslation();
  const getPaymentMethodLabel = (method?: string) =>
    method
      ? t(`employee.orders.paymentMethod.${method}`)
      : t("employee.deliveries.sheet.na");
  const getPaymentStatusLabel = (status?: string) =>
    status
      ? t(`employee.orders.paymentStatus.${status}`)
      : t("employee.deliveries.sheet.na");
  const [loading, setLoading] = useState(false);
  const [collectingCash, setCollectingCash] = useState(false);
  const [submittingCash, setSubmittingCash] = useState(false);
  const [notes, setNotes] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [cashAmount, setCashAmount] = useState(order.totalPrice.toString());
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [accountsEmployees, setAccountsEmployees] = useState<
    Array<{ _id: string; firstName: string; lastName: string; email: string }>
  >([]);
  const [selectedAccountsEmployee, setSelectedAccountsEmployee] = useState("");

  const isCOD =
    order.paymentMethod === "cash_on_delivery" ||
    order.paymentStatus === "pending";
  const canDeliver = !isCOD || order.cashCollected;

  // Fetch accounts employees when sheet opens
  useEffect(() => {
    if (open) {
      const fetchAccountsEmployees = async () => {
        const employees = await getActiveAccountsEmployees();
        setAccountsEmployees(employees);
      };
      fetchAccountsEmployees();
    }
  }, [open]);

  const handleStartDelivery = async () => {
    setLoading(true);
    try {
      const result = await startDelivery(order._id, notes);
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.deliveries.sheet.toast.startFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (isCOD && !order.cashCollected) {
      toast.error(t("employee.deliveries.sheet.toast.collectCashFirst"));
      return;
    }

    setLoading(true);
    try {
      const result = await markAsDelivered(order._id, notes);
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.deliveries.sheet.toast.markDeliveredFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCollectCash = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("employee.deliveries.sheet.toast.invalidAmount"));
      return;
    }

    setCollectingCash(true);
    try {
      const result = await collectCash(order._id, amount);
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.deliveries.sheet.toast.collectFailed"));
    } finally {
      setCollectingCash(false);
    }
  };

  const handleSubmitCash = async () => {
    if (order.cashSubmittedToAccounts) {
      toast.error(t("employee.deliveries.sheet.toast.alreadySubmitted"));
      return;
    }

    if (!selectedAccountsEmployee) {
      toast.error(t("employee.deliveries.sheet.toast.selectAccountsEmployee"));
      return;
    }

    setSubmittingCash(true);
    try {
      const result = await submitCashToAccounts(
        order._id,
        selectedAccountsEmployee,
        submissionNotes
      );
      if (result.success) {
        toast.success(result.message);
        // Update local order state to reflect submission
        order.cashSubmittedToAccounts = true;
        order.cashSubmittedAt = new Date().toISOString();
        setSubmissionNotes("");
        setSelectedAccountsEmployee("");
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.deliveries.sheet.toast.submitFailed"));
    } finally {
      setSubmittingCash(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleReason) {
      toast.error(t("employee.deliveries.sheet.toast.rescheduleRequired"));
      return;
    }

    setLoading(true);
    try {
      const result = await rescheduleDelivery(
        order._id,
        rescheduleDate,
        rescheduleReason
      );
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.deliveries.sheet.toast.rescheduleFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFailed = async () => {
    if (!failureReason) {
      toast.error(t("employee.deliveries.sheet.toast.failureReasonRequired"));
      return;
    }

    setLoading(true);
    try {
      const result = await markDeliveryFailed(order._id, failureReason);
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.deliveries.sheet.toast.markFailed"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      ready_for_delivery: t("employee.deliveries.status.ready_for_delivery"),
      out_for_delivery: t("employee.deliveries.status.out_for_delivery"),
      delivered: t("employee.deliveries.status.delivered"),
      rescheduled: t("employee.deliveries.status.rescheduled"),
      failed_delivery: t("employee.deliveries.status.failed_delivery"),
    };
    const statusConfig: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: any;
      }
    > = {
      ready_for_delivery: {
        label: statusLabels.ready_for_delivery,
        variant: "secondary",
        icon: Package,
      },
      out_for_delivery: {
        label: statusLabels.out_for_delivery,
        variant: "default",
        icon: Truck,
      },
      delivered: {
        label: statusLabels.delivered,
        variant: "outline",
        icon: CheckCircle,
      },
      rescheduled: {
        label: statusLabels.rescheduled,
        variant: "secondary",
        icon: Calendar,
      },
      failed_delivery: {
        label: statusLabels.failed_delivery,
        variant: "destructive",
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status] || {
      label: statusLabels[status] ?? status,
      variant: "outline" as const,
      icon: Package,
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleSheetOpenChange = (open: boolean) => {
    // Prevent closing if any action is in progress
    if (!open && (loading || collectingCash || submittingCash)) {
      toast.warning(t("employee.deliveries.sheet.toast.waitForAction"));
      return;
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between gap-2">
              <span>
                {t("employee.deliveries.sheet.title", {
                  number: order.orderNumber,
                })}
              </span>
              {getStatusBadge(order.status)}
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="px-6 py-6 space-y-6 pb-20">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("employee.deliveries.sheet.sections.customerInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {order.customerName || t("employee.deliveries.sheet.na")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {order.email || t("employee.deliveries.sheet.na")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {order.phone ||
                    order.shippingAddress?.phone ||
                    t("employee.deliveries.sheet.na")}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Address */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t("employee.deliveries.sheet.sections.deliveryAddress")}
            </h3>
            {order.shippingAddress ? (
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.state &&
                    `, ${order.shippingAddress.state}`}{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.country}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("employee.deliveries.sheet.empty.address")}
              </p>
            )}
          </div>

          <Separator />

          {/* Products */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t("employee.deliveries.sheet.sections.products", {
                count: order.products.length,
              })}
            </h3>
            <div className="space-y-3">
              {order.products.map((item) => (
                <div
                  key={item._key}
                  className="flex items-start gap-3 bg-muted/50 p-3 rounded-lg"
                >
                  {item.product.image && (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">
                      {item.product.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {t("employee.deliveries.sheet.labels.quantity")}{" "}
                        {item.quantity}
                      </span>
                      <PriceFormatter amount={item.unitPrice ?? item.product.price} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t("employee.deliveries.sheet.sections.paymentInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.deliveries.sheet.labels.totalAmount")}
                </span>
                <span className="font-bold text-lg">
                  <PriceFormatter amount={order.totalPrice} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.deliveries.sheet.labels.paymentMethod")}
                </span>
                <Badge variant="outline">
                  {order.paymentMethod === "cash_on_delivery"
                    ? t("employee.deliveries.payment.cashOnDelivery")
                    : getPaymentMethodLabel(order.paymentMethod)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("employee.deliveries.sheet.labels.paymentStatus")}
                </span>
                <Badge
                  variant={
                    order.paymentStatus === "paid" ? "outline" : "destructive"
                  }
                  className={
                    order.paymentStatus === "paid" ? "bg-green-50" : ""
                  }
                >
                  {getPaymentStatusLabel(order.paymentStatus)}
                </Badge>
              </div>

              {order.cashCollected && (
                <>
                  <Separator className="my-2" />
                  <div className="bg-green-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.deliveries.sheet.cash.collectedLabel")}
                      </span>
                      <span className="font-semibold text-success-base">
                        ${order.cashCollectedAmount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t("employee.deliveries.sheet.cash.collectedAt")}
                      </span>
                      <span>
                        {order.cashCollectedAt &&
                          format(
                            new Date(order.cashCollectedAt),
                            "MMM d, yyyy h:mm a"
                          )}
                      </span>
                    </div>

                    {/* Submission Status */}
                    {order.cashSubmittedToAccounts &&
                      !order.paymentReceivedBy && (
                        <div className="space-y-1 border-t border-brand-red-accent/20 pt-2 mt-2">
                          <div className="flex items-center gap-2 text-xs text-brand-red-accent font-medium">
                            <Clock className="w-3 h-3" />
                            {t(
                              "employee.deliveries.sheet.cash.submittedPending"
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t(
                                "employee.deliveries.sheet.cash.submittedAt"
                              )}
                            </span>
                            <span>
                              {order.cashSubmittedAt &&
                                format(
                                  new Date(order.cashSubmittedAt),
                                  "MMM d, h:mm a"
                                )}
                            </span>
                          </div>
                          {order.assignedAccountsEmployeeName && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {t(
                                  "employee.deliveries.sheet.cash.assignedTo"
                                )}
                              </span>
                              <span className="font-medium text-brand-red-accent">
                                {order.assignedAccountsEmployeeName}
                              </span>
                            </div>
                          )}
                          {order.cashSubmissionNotes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">
                                {t(
                                  "employee.deliveries.sheet.cash.notesLabel"
                                )}{" "}
                              </span>
                              {order.cashSubmissionNotes}
                            </div>
                          )}
                        </div>
                      )}

                    {order.cashSubmittedToAccounts &&
                      order.paymentReceivedBy && (
                        <div className="space-y-1 border-t border-success-highlight pt-2 mt-2">
                          <div className="flex items-center gap-2 text-xs text-success-base font-medium">
                            <CheckCircle className="w-3 h-3" />
                            {t(
                              "employee.deliveries.sheet.cash.submittedToAccounts"
                            )}
                          </div>
                          {order.assignedAccountsEmployeeName && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {t(
                                  "employee.deliveries.sheet.cash.submittedTo"
                                )}
                              </span>
                              <span className="font-medium">
                                {order.assignedAccountsEmployeeName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t(
                                "employee.deliveries.sheet.cash.submittedAt"
                              )}
                            </span>
                            <span>
                              {order.cashSubmittedAt &&
                                format(
                                  new Date(order.cashSubmittedAt),
                                  "MMM d, h:mm a"
                                )}
                            </span>
                          </div>
                        </div>
                      )}

                    {order.paymentReceivedBy && (
                      <div className="space-y-1 border-t border-success-highlight pt-2 mt-2">
                        <div className="flex items-center gap-2 text-xs text-success-base font-medium">
                          <CheckCircle className="w-3 h-3" />
                          {t("employee.deliveries.sheet.cash.receivedByAccounts")}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t("employee.deliveries.sheet.cash.receivedAt")}
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
                    )}

                    {/* Waiting for Accounts to Receive */}
                    {order.cashSubmissionStatus === "pending" &&
                      !order.paymentReceivedBy && (
                        <div className="border-t border-blue-200 pt-3 mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
                            <Clock className="w-3 h-3 animate-pulse" />
                            {t("employee.deliveries.sheet.cash.waitingReview")}
                          </div>
                          {order.assignedAccountsEmployeeName && (
                            <div className="bg-blue-50 p-2 rounded text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {t("employee.deliveries.sheet.cash.submittedTo")}
                                </span>
                                <span className="font-medium">
                                  {order.assignedAccountsEmployeeName}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {t("employee.deliveries.sheet.cash.submittedAt")}
                                </span>
                                <span>
                                  {order.cashSubmittedAt &&
                                    format(
                                      new Date(order.cashSubmittedAt),
                                      "MMM d, h:mm a"
                                    )}
                                </span>
                              </div>
                              {order.cashSubmissionNotes && (
                                <div className="border-t border-blue-200 pt-1 mt-1">
                                  <div className="text-muted-foreground mb-1">
                                    {t("employee.deliveries.sheet.cash.notesLabel")}
                                  </div>
                                  <div className="bg-white p-1.5 rounded">
                                    {order.cashSubmissionNotes}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground text-center">
                            {t("employee.deliveries.sheet.cash.reviewNotice")}
                          </p>
                        </div>
                      )}

                    {/* Submission Rejected - Show form again */}
                    {order.cashSubmissionStatus === "rejected" && (
                      <div className="border-t border-red-200 pt-3 mt-2 space-y-3">
                        <div className="bg-red-50 p-2 rounded text-xs space-y-1 mb-3">
                          <div className="text-red-700 font-medium">
                            {t("employee.deliveries.sheet.cash.rejectedTitle")}
                          </div>
                          {order.cashSubmissionRejectionReason && (
                            <div className="text-red-600">
                              <div className="text-muted-foreground mb-1">
                                {t("employee.deliveries.sheet.cash.reasonLabel")}
                              </div>
                              <div className="bg-white p-1.5 rounded">
                                {order.cashSubmissionRejectionReason}
                              </div>
                            </div>
                          )}
                          <p className="text-muted-foreground mt-2">
                            {t("employee.deliveries.sheet.cash.resubmitHint")}
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="accountsEmployee" className="text-xs">
                            {t("employee.deliveries.sheet.cash.selectEmployee")}{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedAccountsEmployee}
                            onValueChange={setSelectedAccountsEmployee}
                            disabled={submittingCash}
                          >
                            <SelectTrigger className="mt-1 text-xs">
                              <SelectValue
                                placeholder={t(
                                  "employee.deliveries.sheet.cash.selectEmployeePlaceholder"
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {accountsEmployees.map((emp) => (
                                <SelectItem key={emp._id} value={emp._id}>
                                  {emp.firstName} {emp.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="submissionNotes" className="text-xs">
                            {t("employee.deliveries.sheet.cash.submissionNotesLabel")}
                          </Label>
                          <Textarea
                            id="submissionNotes"
                            placeholder={t(
                              "employee.deliveries.sheet.cash.submissionNotesPlaceholder"
                            )}
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                            className="mt-1 text-xs"
                            rows={2}
                            disabled={submittingCash}
                          />
                        </div>
                        <Button
                          onClick={handleSubmitCash}
                          disabled={submittingCash || !selectedAccountsEmployee}
                          size="sm"
                          className="w-full"
                        >
                          <DollarSign className="w-3 h-3 mr-2" />
                          {submittingCash
                            ? t("employee.deliveries.sheet.cash.submitting")
                            : t("employee.deliveries.sheet.cash.resubmit")}
                        </Button>
                        {!selectedAccountsEmployee && (
                          <p className="text-xs text-muted-foreground text-center">
                            {t(
                              "employee.deliveries.sheet.cash.selectEmployeeHint"
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Initial submission form - when not submitted or confirmed */}
                    {(!order.cashSubmittedToAccounts ||
                      order.cashSubmissionStatus === "not_submitted") && (
                      <div className="border-t border-brand-red-accent/20 pt-3 mt-2 space-y-3">
                        <div className="text-xs text-brand-red-accent font-medium">
                          {t("employee.deliveries.sheet.cash.pendingSubmission")}
                        </div>
                        <div>
                          <Label htmlFor="accountsEmployee" className="text-xs">
                            {t("employee.deliveries.sheet.cash.selectEmployee")}{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedAccountsEmployee}
                            onValueChange={setSelectedAccountsEmployee}
                            disabled={submittingCash}
                          >
                            <SelectTrigger className="mt-1 text-xs">
                              <SelectValue
                                placeholder={t(
                                  "employee.deliveries.sheet.cash.selectEmployeePlaceholder"
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {accountsEmployees.map((emp) => (
                                <SelectItem key={emp._id} value={emp._id}>
                                  {emp.firstName} {emp.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="submissionNotes" className="text-xs">
                            {t("employee.deliveries.sheet.cash.submissionNotesLabel")}
                          </Label>
                          <Textarea
                            id="submissionNotes"
                            placeholder={t(
                              "employee.deliveries.sheet.cash.submissionNotesPlaceholder"
                            )}
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                            className="mt-1 text-xs"
                            rows={2}
                            disabled={submittingCash}
                          />
                        </div>
                        <Button
                          onClick={handleSubmitCash}
                          disabled={submittingCash || !selectedAccountsEmployee}
                          size="sm"
                          className="w-full"
                        >
                          <DollarSign className="w-3 h-3 mr-2" />
                          {submittingCash
                            ? t("employee.deliveries.sheet.cash.submitting")
                            : t("employee.deliveries.sheet.cash.submit")}
                        </Button>
                        {!selectedAccountsEmployee && (
                          <p className="text-xs text-muted-foreground text-center">
                            {t(
                              "employee.deliveries.sheet.cash.selectEmployeeHint"
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Delivery Timeline */}
          {(order.dispatchedAt || order.deliveredAt) && (
            <>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("employee.deliveries.sheet.sections.timeline")}
                </h3>
                <div className="space-y-2 text-sm">
                  {order.dispatchedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.deliveries.sheet.timeline.dispatched")}
                      </span>
                      <span>
                        {format(
                          new Date(order.dispatchedAt),
                          "MMM d, yyyy h:mm a"
                        )}
                      </span>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.deliveries.sheet.timeline.delivered")}
                      </span>
                      <span>
                        {format(
                          new Date(order.deliveredAt),
                          "MMM d, yyyy h:mm a"
                        )}
                      </span>
                    </div>
                  )}
                  {order.deliveryAttempts && order.deliveryAttempts > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.deliveries.sheet.timeline.attempts")}
                      </span>
                      <Badge variant="secondary">
                        {order.deliveryAttempts}
                      </Badge>
                    </div>
                  )}
                  {order.rescheduledDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.deliveries.sheet.timeline.rescheduledFor")}
                      </span>
                      <span>
                        {format(new Date(order.rescheduledDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Actions based on status */}
          <div className="space-y-4">
            {order.status === "ready_for_delivery" && (
              <>
                <div>
                  <Label htmlFor="notes">
                    {t("employee.deliveries.sheet.actions.notesLabel")}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={t(
                      "employee.deliveries.sheet.actions.notesPlaceholder"
                    )}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleStartDelivery}
                  disabled={loading}
                  className="w-full"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  {loading
                    ? t("employee.deliveries.sheet.actions.starting")
                    : t("employee.deliveries.sheet.actions.startDelivery")}
                </Button>
              </>
            )}

            {order.status === "out_for_delivery" && (
              <>
                {/* Cash Collection for COD */}
                {isCOD && !order.cashCollected && (
                  <div className="border border-brand-red-accent/20 bg-orange-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-brand-red-accent font-medium">
                      <DollarSign className="w-4 h-4" />
                      {t("employee.deliveries.sheet.cash.collectionRequired")}
                    </div>
                    <div>
                      <Label htmlFor="cashAmount">
                        {t("employee.deliveries.sheet.cash.amountToCollect")}
                      </Label>
                      <Input
                        id="cashAmount"
                        type="number"
                        step="0.01"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        disabled={collectingCash}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={handleCollectCash}
                      disabled={collectingCash}
                      className="w-full"
                      variant="default"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      {collectingCash
                        ? t("employee.deliveries.sheet.cash.collecting")
                        : t("employee.deliveries.sheet.cash.confirm")}
                    </Button>
                    <p className="text-xs text-brand-red-accent">
                      {t("employee.deliveries.sheet.cash.confirmHint")}
                    </p>
                  </div>
                )}

                {/* Show cash collected status */}
                {order.cashCollected && (
                  <div className="border border-success-highlight bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-success-base font-medium mb-2">
                      <CheckCircle className="w-4 h-4" />
                      {t("employee.deliveries.sheet.cash.collectedTitle")}
                    </div>
                    <div className="text-sm text-success-base">
                      {t("employee.deliveries.sheet.cash.amountLabel", {
                        amount: order.cashCollectedAmount?.toFixed(2),
                      })}
                    </div>
                    <div className="text-xs text-success-base mt-1">
                      {t("employee.deliveries.sheet.cash.collectedAtLabel")}{" "}
                      {order.cashCollectedAt &&
                        format(
                          new Date(order.cashCollectedAt),
                          "MMM d, yyyy h:mm a"
                        )}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="deliveryNotes">
                    {t("employee.deliveries.sheet.actions.deliveryNotesLabel")}
                  </Label>
                  <Textarea
                    id="deliveryNotes"
                    placeholder={t(
                      "employee.deliveries.sheet.actions.deliveryNotesPlaceholder"
                    )}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleMarkAsDelivered}
                  disabled={loading || !canDeliver}
                  className="w-full"
                  variant={canDeliver ? "default" : "secondary"}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {loading
                    ? t("employee.deliveries.sheet.actions.markingDelivered")
                    : canDeliver
                    ? t("employee.deliveries.sheet.actions.markDelivered")
                    : t("employee.deliveries.sheet.actions.collectCashFirst")}
                </Button>

                {!canDeliver && (
                  <p className="text-xs text-center text-brand-red-accent">
                    {t("employee.deliveries.sheet.actions.collectCashHint")}
                  </p>
                )}

                <Separator />

                {/* Reschedule */}
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium text-sm">
                    {t("employee.deliveries.sheet.actions.rescheduleTitle")}
                  </h4>
                  <div>
                    <Label htmlFor="rescheduleDate">
                      {t("employee.deliveries.sheet.actions.newDate")}
                    </Label>
                    <Input
                      id="rescheduleDate"
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rescheduleReason">
                      {t("employee.deliveries.sheet.actions.reason")}
                    </Label>
                    <Textarea
                      id="rescheduleReason"
                      placeholder={t(
                        "employee.deliveries.sheet.actions.reschedulePlaceholder"
                      )}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleReschedule}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {t("employee.deliveries.sheet.actions.rescheduleButton")}
                  </Button>
                </div>

                <Separator />

                {/* Mark as Failed */}
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium text-sm text-destructive">
                    {t("employee.deliveries.sheet.actions.markFailedTitle")}
                  </h4>
                  <div>
                    <Label htmlFor="failureReason">
                      {t("employee.deliveries.sheet.actions.failureReason")}
                    </Label>
                    <Textarea
                      id="failureReason"
                      placeholder={t(
                        "employee.deliveries.sheet.actions.failurePlaceholder"
                      )}
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleMarkFailed}
                    disabled={loading}
                    variant="destructive"
                    className="w-full"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {t("employee.deliveries.sheet.actions.markFailedButton")}
                  </Button>
                </div>
              </>
            )}

            {order.status === "delivered" && (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-base" />
                <p className="font-medium">
                  {t("employee.deliveries.sheet.delivered.success")}
                </p>
                {order.deliveryNotes && (
                  <div className="mt-4 text-left">
                    <Label>
                      {t("employee.deliveries.sheet.delivered.notesLabel")}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-3 rounded">
                      {order.deliveryNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Notes */}
          <OrderNotes statusHistory={order.statusHistory} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
