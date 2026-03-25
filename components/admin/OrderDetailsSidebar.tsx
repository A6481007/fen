"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  User,
  CreditCard,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  Save,
  FileText,
  X,
} from "lucide-react";
import { Order } from "./types";
import { showToast } from "@/lib/toast";
import { trackOrderFullfillment, trackOrderDetails } from "@/lib/analytics";
import { OrderDetailsSkeleton } from "./SkeletonLoaders";
import { AddressForm, type AddressFormValues } from "@/components/addresses/AddressForm";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface OrderDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderUpdate: (updatedOrderId?: string) => void;
  isLoading?: boolean;
}

type SalesContactOption = NonNullable<Order["salesContact"]>;

const OrderDetailsSidebar: React.FC<OrderDetailsSidebarProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdate,
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const [isUpdating, setIsUpdating] = useState(false);
  const [salesContacts, setSalesContacts] = useState<SalesContactOption[]>([]);
  const [isLoadingSalesContacts, setIsLoadingSalesContacts] = useState(false);
  const [salesContactsError, setSalesContactsError] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState({
    status: order?.status || "",
    totalPrice: order?.totalPrice || 0,
    paymentStatus: order?.paymentStatus || "",
    trackingNumber: order?.trackingNumber || "",
    notes: order?.notes || "",
    estimatedDelivery: order?.estimatedDelivery || "",
    packingNotes: order?.packingNotes || "",
    deliveryNotes: order?.deliveryNotes || "",
    deliveryAttempts: order?.deliveryAttempts || 0,
    rescheduledDate: order?.rescheduledDate || "",
    rescheduledReason: order?.rescheduledReason || "",
    cashCollectedAmount: order?.cashCollectedAmount || 0,
    salesContactId:
      order?.salesContact?._id || order?.quotationDetails?.salesContact?._id || "",
  });
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);
  const [isUpdatingQuotationDetails, setIsUpdatingQuotationDetails] =
    useState(false);
  const [previousConfirmedQuotationLabel, setPreviousConfirmedQuotationLabel] =
    useState<string | null>(null);
  const [quoteToConfirm, setQuoteToConfirm] =
    useState<NonNullable<Order["quotations"]>[number] | null>(null);
  const [showConfirmQuotationDialog, setShowConfirmQuotationDialog] =
    useState(false);
  const [isUpdatingConfirmedQuotation, setIsUpdatingConfirmedQuotation] =
    useState(false);

  React.useEffect(() => {
    if (order) {
      setFormData({
        status: order.status || "",
        totalPrice: order.totalPrice || 0,
        paymentStatus: order.paymentStatus || "",
        trackingNumber: order.trackingNumber || "",
        notes: order.notes || "",
        estimatedDelivery: order.estimatedDelivery || "",
        packingNotes: order.packingNotes || "",
        deliveryNotes: order.deliveryNotes || "",
        deliveryAttempts: order.deliveryAttempts || 0,
        rescheduledDate: order.rescheduledDate || "",
        rescheduledReason: order.rescheduledReason || "",
        cashCollectedAmount: order.cashCollectedAmount || 0,
        salesContactId:
          order.salesContact?._id || order.quotationDetails?.salesContact?._id || "",
      });
    }
  }, [order]);

  React.useEffect(() => {
    setPreviousConfirmedQuotationLabel(null);
  }, [order?._id]);

  React.useEffect(() => {
    if (!isOpen) return;

    let isActive = true;

    const fetchSalesContacts = async () => {
      setIsLoadingSalesContacts(true);
      setSalesContactsError(null);
      try {
        const response = await fetch("/api/admin/sales-contacts");
        if (!response.ok) {
          throw new Error(t("admin.orderDetails.salesContacts.fetchFailed"));
        }
        const data = await response.json();
        if (!isActive) return;
        const contacts = Array.isArray(data?.salesContacts)
          ? data.salesContacts
          : [];
        setSalesContacts(contacts);
      } catch (error) {
        console.error("Error fetching sales contacts:", error);
        if (!isActive) return;
        setSalesContacts([]);
        setSalesContactsError(
          t("admin.orderDetails.salesContacts.unavailable")
        );
      } finally {
        if (isActive) setIsLoadingSalesContacts(false);
      }
    };

    void fetchSalesContacts();

    return () => {
      isActive = false;
    };
  }, [isOpen]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return t("admin.orderDetails.notSet");
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTerm = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : "-";
  };

  const statusLabel = (status?: string) =>
    status
      ? t(`admin.orders.status.${status}`, status.replace(/_/g, " "))
      : t("admin.orderDetails.notSet");

  const paymentStatusLabel = (status?: string) =>
    status
      ? t(`admin.orders.paymentStatus.${status}`, status.replace(/_/g, " "))
      : t("admin.orderDetails.notSet");

  const resolveSalesContactTerms = (contact: SalesContactOption | null) => {
    if (!contact) return null;
    return {
      paymentCondition:
        contact.terms?.paymentCondition ?? contact.paymentCondition ?? "",
      deliveryCondition:
        contact.terms?.deliveryCondition ?? contact.deliveryCondition ?? "",
      validityCondition:
        contact.terms?.validityCondition ?? contact.validityCondition ?? "",
      warrantyCondition:
        contact.terms?.warrantyCondition ?? contact.warrantyCondition ?? "",
    };
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-success-highlight text-success-base";
      case "delivered":
        return "bg-success-highlight text-success-base";
      case "out_for_delivery":
        return "bg-blue-100 text-blue-800";
      case "ready_for_delivery":
        return "bg-cyan-100 text-cyan-800";
      case "packed":
        return "bg-purple-100 text-purple-800";
      case "order_confirmed":
        return "bg-emerald-100 text-emerald-800";
      case "address_confirmed":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-brand-red-accent/10 text-brand-red-accent";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "failed_delivery":
        return "bg-red-100 text-red-800";
      case "rescheduled":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateShippingAddress = async (values: AddressFormValues) => {
    if (!order) return;
    setIsUpdatingShipping(true);
    try {
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: values }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error ||
            t("admin.orderDetails.shipping.updateFailed")
        );
      }
      showToast.success(t("admin.orderDetails.shipping.updated"));
      await onOrderUpdate(order._id);
      setShowShippingDialog(false);
    } catch (error) {
      console.error("Error updating shipping address:", error);
      showToast.error(t("admin.orderDetails.shipping.updateFailed"));
    } finally {
      setIsUpdatingShipping(false);
    }
  };

  const handleUpdateQuotationDetails = async (values: AddressFormValues) => {
    if (!order) return;
    setIsUpdatingQuotationDetails(true);
    try {
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quotationDetails: values }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error ||
            t("admin.orderDetails.quotation.updateFailed")
        );
      }
      showToast.success(t("admin.orderDetails.quotation.updated"));
      await onOrderUpdate(order._id);
      setShowQuotationDialog(false);
    } catch (error) {
      console.error("Error updating quotation details:", error);
      showToast.error(t("admin.orderDetails.quotation.updateFailed"));
    } finally {
      setIsUpdatingQuotationDetails(false);
    }
  };

  const handleConfirmQuotation = async (quotationId: string) => {
    if (!order || !quotationId) return;
    const previousLabel = confirmedQuotationLabel;
    setIsUpdatingConfirmedQuotation(true);
    try {
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedQuotationId: quotationId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error ||
            t("admin.orderDetails.quotation.confirmFailed")
        );
      }
      showToast.success(
        confirmedQuotationId
          ? t("admin.orderDetails.quotation.confirmedUpdated", {
              previous: confirmedQuotationLabel,
            })
          : t("admin.orderDetails.quotation.confirmed")
      );
      setPreviousConfirmedQuotationLabel(previousLabel);
      await onOrderUpdate(order._id);
      setShowConfirmQuotationDialog(false);
      setQuoteToConfirm(null);
    } catch (error) {
      console.error("Error updating confirmed quotation:", error);
      showToast.error(t("admin.orderDetails.quotation.confirmFailed"));
    } finally {
      setIsUpdatingConfirmedQuotation(false);
    }
  };

  const orderSalesContact =
    order?.salesContact ?? order?.quotationDetails?.salesContact ?? null;
  const effectiveQuotationDetails =
    order?.quotationDetails ?? order?.address ?? null;
  const quotationContactEmail =
    effectiveQuotationDetails?.contactEmail ||
    effectiveQuotationDetails?.email ||
    order?.email ||
    "";
  const shippingContactEmail =
    order?.address?.contactEmail || order?.address?.email || order?.email || "";
  const selectedSalesContactId = formData.salesContactId?.trim();
  const selectedSalesContact = selectedSalesContactId
    ? salesContacts.find((contact) => contact._id === selectedSalesContactId) ??
      (orderSalesContact?._id === selectedSalesContactId
        ? orderSalesContact
        : null)
    : null;
  const selectedSalesContactTerms = resolveSalesContactTerms(
    selectedSalesContact
  );
  const selectedQuotation = order?.selectedQuotation ?? null;
  const selectedQuotationLabel = selectedQuotation?.number
    ? t("admin.orderDetails.quotation.label", {
        number: selectedQuotation.number,
      })
    : selectedQuotation
      ? t("admin.orderDetails.quotation.labelGeneric")
      : null;
  const selectedQuotationVersionLabel =
    selectedQuotation?.version && selectedQuotation.version > 1
      ? t("admin.orderDetails.quotation.version", {
          version: selectedQuotation.version,
        })
      : null;
  const selectedQuotationAtLabel = order?.selectedQuotationAt
    ? format(new Date(order.selectedQuotationAt), "PPP")
    : null;
  const selectedQuotationPreviewUrl =
    order && selectedQuotation?._id
      ? `/api/orders/${order._id}/purchase-order?pdf=1&quoteId=${selectedQuotation._id}`
      : null;
  const showSelectedQuotationCard =
    Boolean(selectedQuotation) || order?.status === "quotation_requested";
  const quotationList = order?.quotations ?? [];
  const confirmedQuotationId = selectedQuotation?._id ?? null;
  const confirmedQuotationLabel =
    selectedQuotationLabel ?? t("admin.orderDetails.quotation.none");

  const handleUpdateOrder = async () => {
    if (!order) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t("admin.orderDetails.updateFailed"));
      }

      const result = await response.json();

      // Track order fulfillment analytics
      if (formData.status !== order.status) {
        trackOrderFullfillment({
          orderId: order._id,
          status: formData.status,
          previousStatus: order.status,
          value: formData.totalPrice,
          userId: order.clerkUserId || "",
        });
      }

      // Track detailed order information
      trackOrderDetails({
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: formData.status,
        value: formData.totalPrice,
        itemCount: order.products?.length || 0,
        paymentMethod: order.paymentMethod,
        userId: order.clerkUserId || "",
        products:
          order.products?.map((p) => ({
            productId: p.product?._id || "",
            name:
              p.product?.name ||
              t("admin.orderDetails.products.unknown"),
            quantity: p.quantity,
            price: p.product?.price || 0,
          })) || [],
      });

      // Show success message with refund info if applicable
      if (result.walletRefunded && result.refundAmount) {
        showToast.success(
          t("admin.orderDetails.updatedWithRefund", {
            amount: formatCurrency(result.refundAmount),
          })
        );
      } else {
        showToast.success(t("admin.orderDetails.updated"));
      }

      // Refresh the orders list immediately to get the latest data
      await onOrderUpdate(order._id);

      // Close the sidebar immediately after refresh
      onClose();
    } catch (error) {
      console.error("Error updating order:", error);
      showToast.error(t("admin.orderDetails.updateFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInteractOutside = (e: Event) => {
    if (isUpdating) {
      e.preventDefault();
      showToast.warning(
        t("admin.orderDetails.actionInProgressTitle"),
        t("admin.orderDetails.actionInProgressDescription")
      );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="w-[60vw] max-w-3xl md:max-w-4xl xl:max-w-5xl overflow-y-auto px-6 py-8"
        onInteractOutside={handleInteractOutside}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {order
              ? t("admin.orderDetails.title", { number: order.orderNumber })
              : t("admin.orderDetails.loadingTitle")}
          </SheetTitle>
          <SheetDescription>
            {order
              ? t("admin.orderDetails.subtitle")
              : t("admin.orderDetails.loadingSubtitle")}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !order ? (
          <OrderDetailsSkeleton />
        ) : (
          <div className="space-y-8 mt-8">
            {/* Cancellation Request Alert */}
            {order.cancellationRequested && (
              <Card className="border-brand-red-accent/30 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-brand-red-accent flex items-center gap-2">
                    <X className="w-5 h-5" />
                    {t("admin.orderDetails.cancellation.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-brand-red-accent mb-2">
                      <strong>
                        {t("admin.orderDetails.cancellation.requestedAt")}
                      </strong>{" "}
                      {formatDate(order.cancellationRequestedAt || "")}
                    </p>
                    <p className="text-sm text-brand-red-accent mb-4">
                      <strong>
                        {t("admin.orderDetails.cancellation.reason")}
                      </strong>{" "}
                      {order.cancellationRequestReason ||
                        t("admin.orderDetails.cancellation.noReason")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={async () => {
                        setIsUpdating(true);
                        try {
                          const { rejectCancellationRequest } = await import(
                            "@/actions/orderCancellationActions"
                          );
                          const result = await rejectCancellationRequest(
                            order._id
                          );

                          if (result.success) {
                            showToast.success(result.message);
                            // Wait for order update to complete before closing
                            await onOrderUpdate(order._id);
                            // Small delay to ensure the UI has updated
                            await new Promise((resolve) =>
                              setTimeout(resolve, 300)
                            );
                            onClose();
                          } else {
                            showToast.error(result.message);
                          }
                        } catch (error) {
                          console.error("Error rejecting cancellation:", error);
                          showToast.error(
                            t("admin.orderDetails.cancellation.rejectFailed")
                          );
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      disabled={isUpdating}
                      className="bg-success-base hover:bg-success-base"
                    >
                      {isUpdating
                        ? t("admin.orderDetails.cancellation.processing")
                        : t("admin.orderDetails.cancellation.confirmOrder")}
                    </Button>
                    <Button
                      onClick={async () => {
                        setIsUpdating(true);
                        try {
                          const { approveCancellationRequest } = await import(
                            "@/actions/orderCancellationActions"
                          );
                          const result = await approveCancellationRequest(
                            order._id
                          );

                          if (result.success) {
                            showToast.success(result.message);
                            // Wait for order update to complete before closing
                            await onOrderUpdate(order._id);
                            // Small delay to ensure the UI has updated
                            await new Promise((resolve) =>
                              setTimeout(resolve, 300)
                            );
                            onClose();
                          } else {
                            showToast.error(result.message);
                          }
                        } catch (error) {
                          console.error("Error approving cancellation:", error);
                          showToast.error(
                            t("admin.orderDetails.cancellation.approveFailed")
                          );
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      disabled={isUpdating}
                      variant="destructive"
                    >
                      {isUpdating
                        ? t("admin.orderDetails.cancellation.processing")
                        : t("admin.orderDetails.cancellation.approve")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Debug Information - Remove this after testing */}
            {process.env.NODE_ENV === "development" && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-sm text-yellow-800">
                    {t("admin.orderDetails.debug.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-yellow-700 font-medium mb-2">
                      {t("admin.orderDetails.debug.summary")}
                    </summary>
                    <pre className="bg-white p-2 rounded border overflow-auto max-h-40 text-xs">
                      {JSON.stringify(
                        {
                          totalPrice: order.totalPrice,
                          products: order.products?.map((p) => ({
                            quantity: p.quantity,
                            product: p.product,
                          })),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}

            {/* Order Status and Actions */}
            <Card className="p-4 md:p-6 lg:p-8">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span>{t("admin.orderDetails.orderStatus.title")}</span>
                  <Badge className={getStatusColor(order.status)}>
                    {statusLabel(order.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="status">
                      {t("admin.orderDetails.orderStatus.statusLabel")}
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleInputChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "admin.orderDetails.orderStatus.statusPlaceholder"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          {statusLabel("pending")}
                        </SelectItem>
                        <SelectItem value="address_confirmed">
                          {statusLabel("address_confirmed")}
                        </SelectItem>
                        <SelectItem value="order_confirmed">
                          {statusLabel("order_confirmed")}
                        </SelectItem>
                        <SelectItem value="packed">
                          {statusLabel("packed")}
                        </SelectItem>
                        <SelectItem value="ready_for_delivery">
                          {statusLabel("ready_for_delivery")}
                        </SelectItem>
                        <SelectItem value="out_for_delivery">
                          {statusLabel("out_for_delivery")}
                        </SelectItem>
                        <SelectItem value="delivered">
                          {statusLabel("delivered")}
                        </SelectItem>
                        <SelectItem value="completed">
                          {statusLabel("completed")}
                        </SelectItem>
                        <SelectItem value="cancelled">
                          {statusLabel("cancelled")}
                        </SelectItem>
                        <SelectItem value="rescheduled">
                          {statusLabel("rescheduled")}
                        </SelectItem>
                        <SelectItem value="failed_delivery">
                          {statusLabel("failed_delivery")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentStatus">
                      {t("admin.orderDetails.paymentStatus.label")}
                    </Label>
                    <Select
                      value={formData.paymentStatus}
                      onValueChange={(value) =>
                        handleInputChange("paymentStatus", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "admin.orderDetails.paymentStatus.placeholder"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          {paymentStatusLabel("pending")}
                        </SelectItem>
                        <SelectItem value="paid">
                          {paymentStatusLabel("paid")}
                        </SelectItem>
                        <SelectItem value="failed">
                          {paymentStatusLabel("failed")}
                        </SelectItem>
                        <SelectItem value="credit_requested">
                          {paymentStatusLabel("credit_requested")}
                        </SelectItem>
                        <SelectItem value="credit_approved">
                          {paymentStatusLabel("credit_approved")}
                        </SelectItem>
                        <SelectItem value="credit_rejected">
                          {paymentStatusLabel("credit_rejected")}
                        </SelectItem>
                        <SelectItem value="refunded">
                          {paymentStatusLabel("refunded")}
                        </SelectItem>
                        <SelectItem value="stripe">
                          {paymentStatusLabel("stripe")}
                        </SelectItem>
                        <SelectItem value="cash_on_delivery">
                          {paymentStatusLabel("cash_on_delivery")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t("admin.orderDetails.customerInfo.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.customerInfo.nameLabel")}
                    </Label>
                    <p className="text-sm">{order.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.customerInfo.emailLabel")}
                    </Label>
                    <p className="text-sm">{order.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quotation Sales Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t("admin.orderDetails.salesContact.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salesContact">
                    {t("admin.orderDetails.salesContact.label")}
                  </Label>
                  <Select
                    value={formData.salesContactId || "none"}
                    onValueChange={(value) =>
                      handleInputChange(
                        "salesContactId",
                        value === "none" ? "" : value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingSalesContacts
                            ? t(
                                "admin.orderDetails.salesContact.loadingPlaceholder"
                              )
                            : t(
                                "admin.orderDetails.salesContact.selectPlaceholder"
                              )
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("admin.orderDetails.salesContact.unassigned")}
                      </SelectItem>
                      {salesContacts.map((contact) => (
                        <SelectItem key={contact._id} value={contact._id}>
                          {contact.name ||
                            t("admin.orderDetails.salesContact.unnamed")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {salesContactsError && (
                    <p className="text-xs text-brand-red-accent mt-2">
                      {salesContactsError}
                    </p>
                  )}
                </div>
                {selectedSalesContact ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t("admin.orderDetails.salesContact.nameLabel")}
                        </Label>
                        <p>{selectedSalesContact.name || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t("admin.orderDetails.salesContact.phoneLabel")}
                        </Label>
                        <p>
                          {selectedSalesContact.phone
                            ? `${selectedSalesContact.phone}${
                                selectedSalesContact.ext
                                  ? ` ${t(
                                      "admin.orderDetails.salesContact.extLabel",
                                      { ext: selectedSalesContact.ext }
                                    )}`
                                  : ""
                              }`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t("admin.orderDetails.salesContact.mobileLabel")}
                        </Label>
                        <p>{selectedSalesContact.mobile || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t("admin.orderDetails.salesContact.emailLabel")}
                        </Label>
                        <p>{selectedSalesContact.email || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t("admin.orderDetails.salesContact.salesLineLabel")}
                        </Label>
                        <p>
                          {selectedSalesContact.lineId
                            ? `${selectedSalesContact.lineId}${
                                selectedSalesContact.lineExt
                                  ? ` (${t(
                                      "admin.orderDetails.salesContact.lineExtLabel",
                                      { ext: selectedSalesContact.lineExt }
                                    )})`
                                  : ""
                              }`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t("admin.orderDetails.salesContact.websiteLabel")}
                        </Label>
                        <p>{selectedSalesContact.web || "-"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t(
                            "admin.orderDetails.salesContact.paymentCondition"
                          )}
                        </Label>
                        <p>
                          {formatTerm(
                            selectedSalesContactTerms?.paymentCondition
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t(
                            "admin.orderDetails.salesContact.deliveryCondition"
                          )}
                        </Label>
                        <p>
                          {formatTerm(
                            selectedSalesContactTerms?.deliveryCondition
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t(
                            "admin.orderDetails.salesContact.validityCondition"
                          )}
                        </Label>
                        <p>
                          {formatTerm(
                            selectedSalesContactTerms?.validityCondition
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t(
                            "admin.orderDetails.salesContact.warrantyCondition"
                          )}
                        </Label>
                        <p>
                          {formatTerm(
                            selectedSalesContactTerms?.warrantyCondition
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.orderDetails.salesContact.empty")}
                  </p>
                )}
              </CardContent>
            </Card>

            {showSelectedQuotationCard && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t("admin.orderDetails.confirmedQuotation.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedQuotationLabel ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{selectedQuotationLabel}</p>
                        {selectedQuotationVersionLabel && (
                          <Badge variant="outline">
                            {selectedQuotationVersionLabel}
                          </Badge>
                        )}
                        <Badge className="bg-success-highlight text-success-base">
                          {t(
                            "admin.orderDetails.confirmedQuotation.confirmedBadge"
                          )}
                        </Badge>
                      </div>
                      {selectedQuotationAtLabel && (
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "admin.orderDetails.confirmedQuotation.confirmedOn",
                            { date: selectedQuotationAtLabel }
                          )}
                        </p>
                      )}
                      {selectedQuotationPreviewUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(
                              selectedQuotationPreviewUrl,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                        >
                          {t("admin.orderDetails.confirmedQuotation.previewPdf")}
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("admin.orderDetails.confirmedQuotation.empty")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("admin.orderDetails.quotationRequests.title")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("admin.orderDetails.quotationRequests.subtitle")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {t("admin.orderDetails.quotationRequests.currentConfirmed")}{" "}
                  <span className="font-medium text-foreground">
                    {confirmedQuotationLabel}
                  </span>
                </div>
                {previousConfirmedQuotationLabel &&
                  previousConfirmedQuotationLabel !== confirmedQuotationLabel && (
                    <div className="text-xs text-muted-foreground">
                      {t("admin.orderDetails.quotationRequests.previousConfirmed")}{" "}
                      <span className="font-medium text-foreground">
                        {previousConfirmedQuotationLabel}
                      </span>
                    </div>
                  )}
                {quotationList.length > 0 ? (
                  <div className="space-y-3">
                    {quotationList.map((quotation) => {
                      const isConfirmed =
                        quotation._id === confirmedQuotationId;
                      const numberLabel = quotation.number
                        ? t("admin.orderDetails.quotation.label", {
                            number: quotation.number,
                          })
                        : t("admin.orderDetails.quotation.labelGeneric");
                      const versionLabel =
                        quotation.version && quotation.version > 0
                          ? t("admin.orderDetails.quotation.version", {
                              version: quotation.version,
                            })
                          : null;
                      const createdAtLabel = quotation.createdAt
                        ? format(new Date(quotation.createdAt), "PPP")
                        : t(
                            "admin.orderDetails.quotationRequests.dateUnavailable"
                          );
                      const emailSentLabel = quotation.emailSentAt
                        ? format(new Date(quotation.emailSentAt), "PPP")
                        : null;
                      const previewUrl = order
                        ? `/api/orders/${order._id}/purchase-order?pdf=1&quoteId=${quotation._id}`
                        : null;

                      return (
                        <div
                          key={quotation._id}
                          className="rounded-lg border p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {numberLabel}
                                {versionLabel ? ` - ${versionLabel}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "admin.orderDetails.quotationRequests.createdAt",
                                  { date: createdAtLabel }
                                )}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isConfirmed && (
                                <Badge className="bg-success-highlight text-success-base">
                                  {t(
                                    "admin.orderDetails.quotationRequests.confirmedBadge"
                                  )}
                                </Badge>
                              )}
                              {quotation.isLatestVersion && (
                                <Badge variant="outline">
                                  {t(
                                    "admin.orderDetails.quotationRequests.latestBadge"
                                  )}
                                </Badge>
                              )}
                              {quotation.emailSentAt && (
                                <Badge variant="secondary">
                                  {t(
                                    "admin.orderDetails.quotationRequests.sentBadge"
                                  )}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {t("admin.orderDetails.quotationRequests.totalLabel")}{" "}
                              {quotation.totalPrice !== null &&
                              quotation.totalPrice !== undefined
                                ? formatCurrency(quotation.totalPrice)
                                : "-"}
                            </span>
                            {emailSentLabel && (
                              <span>
                                {t(
                                  "admin.orderDetails.quotationRequests.sentAt",
                                  { date: emailSentLabel }
                                )}
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {previewUrl && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.open(
                                    previewUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                {t(
                                  "admin.orderDetails.quotationRequests.previewPdf"
                                )}
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              disabled={isConfirmed || isUpdatingConfirmedQuotation}
                              onClick={() => {
                                setQuoteToConfirm(quotation);
                                setShowConfirmQuotationDialog(true);
                              }}
                            >
                              {isConfirmed
                                ? t(
                                    "admin.orderDetails.quotationRequests.confirmedButton"
                                  )
                                : t(
                                    "admin.orderDetails.quotationRequests.setConfirmedButton"
                                  )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.orderDetails.quotationRequests.empty")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quotation Details */}
            {effectiveQuotationDetails && (
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t("admin.orderDetails.quotationDetails.title")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t("admin.orderDetails.quotationDetails.subtitle")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuotationDialog(true)}
                  >
                    {t("admin.orderDetails.quotationDetails.editButton")}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t(
                          "admin.orderDetails.quotationDetails.contactNameLabel"
                        )}
                      </Label>
                      <p>{effectiveQuotationDetails.name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t("admin.orderDetails.quotationDetails.companyLabel")}
                      </Label>
                      <p>{effectiveQuotationDetails.company || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t(
                          "admin.orderDetails.quotationDetails.customerCodeLabel"
                        )}
                      </Label>
                      <p>{effectiveQuotationDetails.customerCode || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t("admin.orderDetails.quotationDetails.winCodeLabel")}
                      </Label>
                      <p>{effectiveQuotationDetails.winCode || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t("admin.orderDetails.quotationDetails.lineIdLabel")}
                      </Label>
                      <p>{effectiveQuotationDetails.lineId || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t("admin.orderDetails.quotationDetails.taxIdLabel")}
                      </Label>
                      <p>{effectiveQuotationDetails.taxId || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t("admin.orderDetails.quotationDetails.branchLabel")}
                      </Label>
                      <p>{effectiveQuotationDetails.branch || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t("admin.orderDetails.quotationDetails.addressLabel")}
                    </Label>
                    <p className="break-words">
                      {effectiveQuotationDetails.address || "-"}
                      {effectiveQuotationDetails.subArea
                        ? `, ${effectiveQuotationDetails.subArea}`
                        : ""}
                      {effectiveQuotationDetails.city
                        ? `, ${effectiveQuotationDetails.city}`
                        : ""}
                      {effectiveQuotationDetails.state
                        ? `, ${effectiveQuotationDetails.state}`
                        : ""}
                      {effectiveQuotationDetails.zip
                        ? ` ${effectiveQuotationDetails.zip}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t(
                        "admin.orderDetails.quotationDetails.contactEmailLabel"
                      )}
                    </Label>
                    <p>{quotationContactEmail || "-"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t("admin.orderDetails.financial.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalPrice">
                      {t("admin.orderDetails.financial.totalAmountLabel")}
                    </Label>
                    <Input
                      id="totalPrice"
                      type="number"
                      step="0.01"
                      value={formData.totalPrice}
                      onChange={(e) =>
                        handleInputChange(
                          "totalPrice",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t("admin.orderDetails.financial.originalLabel", {
                        amount: formatCurrency(order.totalPrice || 0),
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.financial.paymentMethodLabel")}
                    </Label>
                    <p className="text-sm capitalize">
                      {order.paymentMethod ||
                        t("admin.orderDetails.financial.notSpecified")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.financial.currencyLabel")}
                    </Label>
                    <p className="text-sm">
                      {order.currency ||
                        t("admin.orderDetails.financial.currencyDefault")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.financial.subtotalLabel")}
                    </Label>
                    <p className="text-sm font-medium">
                      {formatCurrency(order.subtotal || 0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.financial.taxLabel")}
                    </Label>
                    <p className="text-sm">{formatCurrency(order.tax || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.financial.shippingLabel")}
                    </Label>
                    <p className="text-sm">
                      {formatCurrency(order.shipping || 0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.financial.discountLabel")}
                    </Label>
                    <p className="text-sm text-success-base">
                      -{formatCurrency(order.amountDiscount || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.financial.itemsTotalLabel")}
                    </Label>
                    <p className="text-sm font-medium">
                      {formatCurrency(
                        order.products?.reduce(
                          (sum, item) =>
                            sum +
                            (item.product?.price || 0) * (item.quantity || 1),
                          0
                        ) || 0
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  {t("admin.orderDetails.shippingInfo.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="trackingNumber">
                    {t("admin.orderDetails.shippingInfo.trackingNumberLabel")}
                  </Label>
                  <Input
                    id="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={(e) =>
                      handleInputChange("trackingNumber", e.target.value)
                    }
                    placeholder={t(
                      "admin.orderDetails.shippingInfo.trackingNumberPlaceholder"
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedDelivery">
                    {t("admin.orderDetails.shippingInfo.estimatedDeliveryLabel")}
                  </Label>
                  <Input
                    id="estimatedDelivery"
                    type="datetime-local"
                    value={formData.estimatedDelivery}
                    onChange={(e) =>
                      handleInputChange("estimatedDelivery", e.target.value)
                    }
                  />
                </div>
                {order.address && (
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.shippingInfo.addressLabel")}
                    </Label>
                    <div className="text-sm bg-gray-50 p-3 rounded-md">
                      <p>{order.address.name}</p>
                      <p>{order.address.address}</p>
                      <p>
                        {order.address.city}, {order.address.state}{" "}
                        {order.address.zip}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowShippingDialog(true)}
                    >
                      {t("admin.orderDetails.shippingInfo.editAddressButton")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t("admin.orderDetails.employeeTracking.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t(
                        "admin.orderDetails.employeeTracking.addressConfirmedBy"
                      )}
                    </Label>
                    <p className="text-sm">
                      {order.addressConfirmedBy ||
                        t("admin.orderDetails.employeeTracking.notConfirmed")}
                    </p>
                    {order.addressConfirmedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.addressConfirmedAt)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t(
                        "admin.orderDetails.employeeTracking.orderConfirmedBy"
                      )}
                    </Label>
                    <p className="text-sm">
                      {order.orderConfirmedBy ||
                        t("admin.orderDetails.employeeTracking.notConfirmed")}
                    </p>
                    {order.orderConfirmedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.orderConfirmedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.employeeTracking.packedBy")}
                    </Label>
                    <p className="text-sm">
                      {order.packedBy ||
                        t("admin.orderDetails.employeeTracking.notPacked")}
                    </p>
                    {order.packedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.packedAt)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.employeeTracking.dispatchedBy")}
                    </Label>
                    <p className="text-sm">
                      {order.dispatchedBy ||
                        t("admin.orderDetails.employeeTracking.notDispatched")}
                    </p>
                    {order.dispatchedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.dispatchedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t(
                        "admin.orderDetails.employeeTracking.warehouseAssignedBy"
                      )}
                    </Label>
                    <p className="text-sm">
                      {order.assignedWarehouseBy ||
                        t("admin.orderDetails.employeeTracking.notAssigned")}
                    </p>
                    {order.assignedWarehouseAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.assignedWarehouseAt)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.employeeTracking.deliveredBy")}
                    </Label>
                    <p className="text-sm">
                      {order.deliveredBy ||
                        t("admin.orderDetails.employeeTracking.notDelivered")}
                    </p>
                    {order.deliveredAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.deliveredAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.orderDetails.employeeTracking.assignedDelivery")}
                  </Label>
                  <p className="text-sm">
                    {order.assignedDeliverymanName ||
                      t("admin.orderDetails.employeeTracking.notAssigned")}
                  </p>
                  {order.assignedDeliverymanId && (
                    <p className="text-xs text-gray-500">
                      {t("admin.orderDetails.employeeTracking.idLabel", {
                        id: order.assignedDeliverymanId,
                      })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Packing & Delivery Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t("admin.orderDetails.packing.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="packingNotes">
                    {t("admin.orderDetails.packing.packingNotesLabel")}
                  </Label>
                  <Textarea
                    id="packingNotes"
                    value={formData.packingNotes}
                    onChange={(e) =>
                      handleInputChange("packingNotes", e.target.value)
                    }
                    placeholder={t(
                      "admin.orderDetails.packing.packingNotesPlaceholder"
                    )}
                    className="min-h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryNotes">
                    {t("admin.orderDetails.packing.deliveryNotesLabel")}
                  </Label>
                  <Textarea
                    id="deliveryNotes"
                    value={formData.deliveryNotes}
                    onChange={(e) =>
                      handleInputChange("deliveryNotes", e.target.value)
                    }
                    placeholder={t(
                      "admin.orderDetails.packing.deliveryNotesPlaceholder"
                    )}
                    className="min-h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryAttempts">
                      {t("admin.orderDetails.packing.deliveryAttemptsLabel")}
                    </Label>
                    <Input
                      id="deliveryAttempts"
                      type="number"
                      min="0"
                      value={formData.deliveryAttempts}
                      onChange={(e) =>
                        handleInputChange(
                          "deliveryAttempts",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="rescheduledDate">
                      {t("admin.orderDetails.packing.rescheduledDateLabel")}
                    </Label>
                    <Input
                      id="rescheduledDate"
                      type="date"
                      value={formData.rescheduledDate}
                      onChange={(e) =>
                        handleInputChange("rescheduledDate", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="rescheduledReason">
                    {t("admin.orderDetails.packing.rescheduledReasonLabel")}
                  </Label>
                  <Textarea
                    id="rescheduledReason"
                    value={formData.rescheduledReason}
                    onChange={(e) =>
                      handleInputChange("rescheduledReason", e.target.value)
                    }
                    placeholder={t(
                      "admin.orderDetails.packing.rescheduledReasonPlaceholder"
                    )}
                    className="min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cash Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t("admin.orderDetails.cashCollection.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.cashCollection.collectedLabel")}
                    </Label>
                    <p className="text-sm font-semibold">
                      {order.cashCollected
                        ? t("admin.orderDetails.cashCollection.collectedYes")
                        : t("admin.orderDetails.cashCollection.collectedNo")}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="cashCollectedAmount">
                      {t("admin.orderDetails.cashCollection.amountLabel")}
                    </Label>
                    <Input
                      id="cashCollectedAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cashCollectedAmount}
                      onChange={(e) =>
                        handleInputChange(
                          "cashCollectedAmount",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.cashCollection.collectedAtLabel")}
                    </Label>
                    <p className="text-sm">
                      {order.cashCollectedAt
                        ? formatDate(order.cashCollectedAt)
                        : t("admin.orderDetails.cashCollection.notCollected")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {t(
                        "admin.orderDetails.cashCollection.receivedByLabel"
                      )}
                    </Label>
                    <p className="text-sm">
                      {order.paymentReceivedBy ||
                        t("admin.orderDetails.cashCollection.notReceived")}
                    </p>
                    {order.paymentReceivedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.paymentReceivedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t("admin.orderDetails.items.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.products?.map((item, index) => {
                    // Extract product data from the nested structure
                    const product = item.product;
                    const quantity = item.quantity || 1;
                    const price = product?.price || 0;
                    const lineTotal = price * quantity;

                    // Debug logging to help identify the issue
                    console.log("Product debug info:", {
                      name: product?.name,
                      price: price,
                      quantity: quantity,
                      lineTotal,
                      rawItem: item,
                    });

                    return (
                      <div
                        key={item._key || index}
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        {product?.image && (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-md border shadow-sm"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate mb-1">
                            {product?.name ||
                              t("admin.orderDetails.products.unknown")}
                          </p>
                          <div className="text-sm text-gray-600">
                            <p>
                              {t("admin.orderDetails.items.quantityLabel", {
                                quantity,
                                price: formatCurrency(price),
                              })}
                            </p>
                            {price === 0 && (
                              <p className="text-xs text-red-500 mt-1 flex items-center">
                                <span className="mr-1">⚠️</span>
                                {t(
                                  "admin.orderDetails.items.missingPriceWarning"
                                )}
                              </p>
                            )}
                            {process.env.NODE_ENV === "development" &&
                              price === 0 && (
                                <p className="text-xs text-brand-red-accent mt-1">
                                  {t("admin.orderDetails.items.availableFields", {
                                    itemFields: Object.keys(item).join(", "),
                                    productFields: product
                                      ? Object.keys(product).join(", ")
                                      : t("admin.orderDetails.items.noProductData"),
                                  })}
                                </p>
                              )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-gray-900">
                            {formatCurrency(lineTotal)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Order Total */}
                  <div className="border-t border-gray-200 pt-4 mt-4 bg-white rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-lg text-gray-700">
                        {t("admin.orderDetails.items.orderTotalLabel")}
                      </p>
                      <p className="font-bold text-2xl text-success-base">
                        {formatCurrency(order.totalPrice || 0)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {t("admin.orderDetails.items.itemsTotalLabel", {
                        amount: formatCurrency(
                          order.products?.reduce((sum, item) => {
                            const price = item.product?.price || 0;
                            return sum + price * (item.quantity || 1);
                          }, 0) || 0
                        ),
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t("admin.orderDetails.dates.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.orderDetails.dates.orderDateLabel")}
                  </Label>
                  <p className="text-sm">{formatDate(order.orderDate)}</p>
                </div>
                {order.estimatedDelivery && (
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.dates.estimatedDeliveryLabel")}
                    </Label>
                    <p className="text-sm">
                      {formatDate(order.estimatedDelivery)}
                    </p>
                  </div>
                )}
                {order.actualDelivery && (
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.orderDetails.dates.actualDeliveryLabel")}
                    </Label>
                    <p className="text-sm">
                      {formatDate(order.actualDelivery)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.orderDetails.notes.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder={t("admin.orderDetails.notes.placeholder")}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 pb-4 px-2">
              <Button
                onClick={handleUpdateOrder}
                disabled={isUpdating}
                className="flex-1 h-12 text-base font-medium"
                size="lg"
              >
                <Save className="w-5 h-5 mr-2" />
                {isUpdating
                  ? t("admin.orderDetails.actions.updating")
                  : t("admin.orderDetails.actions.update")}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="h-12 px-8 text-base font-medium"
                size="lg"
              >
                <X className="w-5 h-5 mr-2" />
                {t("admin.orderDetails.actions.cancel")}
              </Button>
            </div>

            <Dialog
              open={showConfirmQuotationDialog}
              onOpenChange={(open) => {
                setShowConfirmQuotationDialog(open);
                if (!open) setQuoteToConfirm(null);
              }}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {t("admin.orderDetails.confirmDialog.title")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("admin.orderDetails.confirmDialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("admin.orderDetails.confirmDialog.currentConfirmed")}
                    </p>
                    <p className="font-medium">{confirmedQuotationLabel}</p>
                    {selectedQuotationAtLabel && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("admin.orderDetails.confirmDialog.confirmedOn", {
                          date: selectedQuotationAtLabel,
                        })}
                      </p>
                    )}
                  </div>
                  {quoteToConfirm && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("admin.orderDetails.confirmDialog.newConfirmation")}
                      </p>
                      <p className="font-medium">
                        {quoteToConfirm.number
                          ? t("admin.orderDetails.quotation.label", {
                              number: quoteToConfirm.number,
                            })
                          : t("admin.orderDetails.quotation.labelGeneric")}
                        {quoteToConfirm.version && quoteToConfirm.version > 0
                          ? ` - ${t("admin.orderDetails.quotation.version", {
                              version: quoteToConfirm.version,
                            })}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("admin.orderDetails.confirmDialog.createdAt", {
                          date: quoteToConfirm.createdAt
                            ? format(
                                new Date(quoteToConfirm.createdAt),
                                "PPP"
                              )
                            : t(
                                "admin.orderDetails.confirmDialog.dateUnavailable"
                              ),
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmQuotationDialog(false);
                      setQuoteToConfirm(null);
                    }}
                  >
                    {t("admin.orderDetails.confirmDialog.cancel")}
                  </Button>
                  <Button
                    onClick={() => {
                      if (quoteToConfirm?._id) {
                        void handleConfirmQuotation(quoteToConfirm._id);
                      }
                    }}
                    disabled={!quoteToConfirm?._id || isUpdatingConfirmedQuotation}
                  >
                    {isUpdatingConfirmedQuotation
                      ? t("admin.orderDetails.confirmDialog.updating")
                      : t("admin.orderDetails.confirmDialog.confirmChange")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showShippingDialog}
              onOpenChange={setShowShippingDialog}
            >
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {t("admin.orderDetails.shippingDialog.title")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("admin.orderDetails.shippingDialog.description")}
                  </DialogDescription>
                </DialogHeader>
                {order?.address && (
                  <AddressForm
                    initialValues={{
                      ...order.address,
                      email:
                        order.address.email || order.email || "",
                    }}
                    defaultContactEmail={shippingContactEmail}
                    onSubmit={handleUpdateShippingAddress}
                    onCancel={() => setShowShippingDialog(false)}
                    submitLabel={t(
                      "admin.orderDetails.shippingDialog.submitLabel"
                    )}
                    cancelLabel={t(
                      "admin.orderDetails.shippingDialog.cancelLabel"
                    )}
                    isSubmitting={isUpdatingShipping}
                    showDefaultToggle={false}
                    subAreaRequired={false}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Dialog
              open={showQuotationDialog}
              onOpenChange={setShowQuotationDialog}
            >
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {t("admin.orderDetails.quotationDialog.title")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("admin.orderDetails.quotationDialog.description")}
                  </DialogDescription>
                </DialogHeader>
                {effectiveQuotationDetails && (
                  <AddressForm
                    initialValues={{
                      ...effectiveQuotationDetails,
                      email:
                        effectiveQuotationDetails.email ||
                        order?.email ||
                        "",
                    }}
                    defaultContactEmail={quotationContactEmail}
                    onSubmit={handleUpdateQuotationDetails}
                    onCancel={() => setShowQuotationDialog(false)}
                    submitLabel={t(
                      "admin.orderDetails.quotationDialog.submitLabel"
                    )}
                    cancelLabel={t(
                      "admin.orderDetails.quotationDialog.cancelLabel"
                    )}
                    isSubmitting={isUpdatingQuotationDetails}
                    showDefaultToggle={false}
                    showCustomerCodeField={true}
                    customerCodeReadOnly={true}
                    showWinCodeField={true}
                    showLineIdField={true}
                    subAreaRequired={false}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailsSidebar;


