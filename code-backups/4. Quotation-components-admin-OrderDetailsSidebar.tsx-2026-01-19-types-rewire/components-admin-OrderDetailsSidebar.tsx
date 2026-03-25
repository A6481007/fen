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
  X,
} from "lucide-react";
import { Order } from "./types";
import { showToast } from "@/lib/toast";
import { trackOrderFullfillment, trackOrderDetails } from "@/lib/analytics";
import { OrderDetailsSkeleton } from "./SkeletonLoaders";

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
    salesContactId: order?.salesContact?._id || "",
  });

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
        salesContactId: order.salesContact?._id || "",
      });
    }
  }, [order]);

  React.useEffect(() => {
    if (!isOpen) return;

    let isActive = true;

    const fetchSalesContacts = async () => {
      setIsLoadingSalesContacts(true);
      setSalesContactsError(null);
      try {
        const response = await fetch("/api/admin/sales-contacts");
        if (!response.ok) {
          throw new Error("Failed to fetch sales contacts");
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
        setSalesContactsError("Unable to load sales contacts.");
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const selectedSalesContactId = formData.salesContactId?.trim();
  const selectedSalesContact = selectedSalesContactId
    ? salesContacts.find((contact) => contact._id === selectedSalesContactId) ??
      (order?.salesContact?._id === selectedSalesContactId
        ? order.salesContact
        : null)
    : null;

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
        throw new Error("Failed to update order");
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
            name: p.product?.name || "Unknown Product",
            quantity: p.quantity,
            price: p.product?.price || 0,
          })) || [],
      });

      // Show success message with refund info if applicable
      if (result.walletRefunded && result.refundAmount) {
        showToast.success(
          `Order updated successfully! $${result.refundAmount.toFixed(
            2
          )} refunded to customer's wallet.`
        );
      } else {
        showToast.success("Order updated successfully");
      }

      // Refresh the orders list immediately to get the latest data
      await onOrderUpdate(order._id);

      // Close the sidebar immediately after refresh
      onClose();
    } catch (error) {
      console.error("Error updating order:", error);
      showToast.error("Failed to update order");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInteractOutside = (e: Event) => {
    if (isUpdating) {
      e.preventDefault();
      showToast.warning(
        "Action in Progress",
        "Please wait for the current action to complete before closing."
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
              ? `Order Details - #${order.orderNumber}`
              : "Loading Order Details..."}
          </SheetTitle>
          <SheetDescription>
            {order
              ? "View and manage order information, status, and tracking details."
              : "Loading order information..."}
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
                    Cancellation Request Pending
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-brand-red-accent mb-2">
                      <strong>Requested At:</strong>{" "}
                      {formatDate(order.cancellationRequestedAt || "")}
                    </p>
                    <p className="text-sm text-brand-red-accent mb-4">
                      <strong>Reason:</strong>{" "}
                      {order.cancellationRequestReason || "No reason provided"}
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
                            "Failed to reject cancellation request"
                          );
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      disabled={isUpdating}
                      className="bg-success-base hover:bg-success-base"
                    >
                      {isUpdating ? "Processing..." : "✓ Confirm Order"}
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
                            "Failed to approve cancellation request"
                          );
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      disabled={isUpdating}
                      variant="destructive"
                    >
                      {isUpdating ? "Processing..." : "✗ Approve Cancellation"}
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
                    Debug Info (Dev Only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-yellow-700 font-medium mb-2">
                      Raw Order Data (Click to expand)
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
                  <span>Order Status</span>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleInputChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">🔴 Pending</SelectItem>
                        <SelectItem value="address_confirmed">
                          🟡 Address Confirmed
                        </SelectItem>
                        <SelectItem value="order_confirmed">
                          🟢 Order Confirmed
                        </SelectItem>
                        <SelectItem value="packed">📦 Packed</SelectItem>
                        <SelectItem value="ready_for_delivery">
                          ✅ Ready for Delivery
                        </SelectItem>
                        <SelectItem value="out_for_delivery">
                          🚚 Out for Delivery
                        </SelectItem>
                        <SelectItem value="delivered">📬 Delivered</SelectItem>
                        <SelectItem value="completed">✔️ Completed</SelectItem>
                        <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                        <SelectItem value="rescheduled">
                          📅 Rescheduled
                        </SelectItem>
                        <SelectItem value="failed_delivery">
                          ⚠️ Failed Delivery
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <Select
                      value={formData.paymentStatus}
                      onValueChange={(value) =>
                        handleInputChange("paymentStatus", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="cash_on_delivery">
                          Cash on Delivery
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
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm">{order.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
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
                  Quotation Sales Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salesContact">Sales Contact</Label>
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
                            ? "Loading sales contacts..."
                            : "Select sales contact"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {salesContacts.map((contact) => (
                        <SelectItem key={contact._id} value={contact._id}>
                          {contact.name || "Unnamed contact"}
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
                          Name
                        </Label>
                        <p>{selectedSalesContact.name || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Phone
                        </Label>
                        <p>
                          {selectedSalesContact.phone
                            ? `${selectedSalesContact.phone}${
                                selectedSalesContact.ext
                                  ? ` ext ${selectedSalesContact.ext}`
                                  : ""
                              }`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Mobile
                        </Label>
                        <p>{selectedSalesContact.mobile || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Email
                        </Label>
                        <p>{selectedSalesContact.email || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Line ID
                        </Label>
                        <p>
                          {selectedSalesContact.lineId
                            ? `${selectedSalesContact.lineId}${
                                selectedSalesContact.lineExt
                                  ? ` (${selectedSalesContact.lineExt})`
                                  : ""
                              }`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Website
                        </Label>
                        <p>{selectedSalesContact.web || "-"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Payment Condition
                        </Label>
                        <p>{selectedSalesContact.terms?.paymentCondition || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Delivery Condition
                        </Label>
                        <p>{selectedSalesContact.terms?.deliveryCondition || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Validity Condition
                        </Label>
                        <p>{selectedSalesContact.terms?.validityCondition || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Warranty Condition
                        </Label>
                        <p>{selectedSalesContact.terms?.warrantyCondition || "-"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No sales contact assigned to this order yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalPrice">Total Amount</Label>
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
                      Original: {formatCurrency(order.totalPrice || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Payment Method
                    </Label>
                    <p className="text-sm capitalize">
                      {order.paymentMethod || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Currency</Label>
                    <p className="text-sm">{order.currency || "THB"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Subtotal</Label>
                    <p className="text-sm font-medium">
                      {formatCurrency(order.subtotal || 0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Tax</Label>
                    <p className="text-sm">{formatCurrency(order.tax || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Shipping</Label>
                    <p className="text-sm">
                      {formatCurrency(order.shipping || 0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Discount</Label>
                    <p className="text-sm text-success-base">
                      -{formatCurrency(order.amountDiscount || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Items Total</Label>
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
                  Shipping & Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={(e) =>
                      handleInputChange("trackingNumber", e.target.value)
                    }
                    placeholder="Enter tracking number"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedDelivery">Estimated Delivery</Label>
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
                      Shipping Address
                    </Label>
                    <div className="text-sm bg-gray-50 p-3 rounded-md">
                      <p>{order.address.name}</p>
                      <p>{order.address.address}</p>
                      <p>
                        {order.address.city}, {order.address.state}{" "}
                        {order.address.zip}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Employee Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Address Confirmed By
                    </Label>
                    <p className="text-sm">
                      {order.addressConfirmedBy || "Not confirmed"}
                    </p>
                    {order.addressConfirmedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.addressConfirmedAt)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Order Confirmed By
                    </Label>
                    <p className="text-sm">
                      {order.orderConfirmedBy || "Not confirmed"}
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
                    <Label className="text-sm font-medium">Packed By</Label>
                    <p className="text-sm">{order.packedBy || "Not packed"}</p>
                    {order.packedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.packedAt)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Dispatched By</Label>
                    <p className="text-sm">
                      {order.dispatchedBy || "Not dispatched"}
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
                      Warehouse Assigned By
                    </Label>
                    <p className="text-sm">
                      {order.assignedWarehouseBy || "Not assigned"}
                    </p>
                    {order.assignedWarehouseAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(order.assignedWarehouseAt)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Delivered By</Label>
                    <p className="text-sm">
                      {order.deliveredBy || "Not delivered"}
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
                    Assigned Deliveryman
                  </Label>
                  <p className="text-sm">
                    {order.assignedDeliverymanName || "Not assigned"}
                  </p>
                  {order.assignedDeliverymanId && (
                    <p className="text-xs text-gray-500">
                      ID: {order.assignedDeliverymanId}
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
                  Packing & Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="packingNotes">Packing Notes</Label>
                  <Textarea
                    id="packingNotes"
                    value={formData.packingNotes}
                    onChange={(e) =>
                      handleInputChange("packingNotes", e.target.value)
                    }
                    placeholder="Enter packing notes"
                    className="min-h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryNotes">Delivery Notes</Label>
                  <Textarea
                    id="deliveryNotes"
                    value={formData.deliveryNotes}
                    onChange={(e) =>
                      handleInputChange("deliveryNotes", e.target.value)
                    }
                    placeholder="Enter delivery notes"
                    className="min-h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryAttempts">Delivery Attempts</Label>
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
                    <Label htmlFor="rescheduledDate">Rescheduled Date</Label>
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
                  <Label htmlFor="rescheduledReason">Reschedule Reason</Label>
                  <Textarea
                    id="rescheduledReason"
                    value={formData.rescheduledReason}
                    onChange={(e) =>
                      handleInputChange("rescheduledReason", e.target.value)
                    }
                    placeholder="Enter reason for rescheduling"
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
                  Cash Collection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Cash Collected
                    </Label>
                    <p className="text-sm font-semibold">
                      {order.cashCollected ? "✅ Yes" : "❌ No"}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="cashCollectedAmount">Cash Amount</Label>
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
                    <Label className="text-sm font-medium">Collected At</Label>
                    <p className="text-sm">
                      {order.cashCollectedAt
                        ? formatDate(order.cashCollectedAt)
                        : "Not collected"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Payment Received By
                    </Label>
                    <p className="text-sm">
                      {order.paymentReceivedBy || "Not received"}
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
                  Order Items
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
                            {product?.name || "Unknown Product"}
                          </p>
                          <div className="text-sm text-gray-600">
                            <p>
                              Qty: {quantity} × {formatCurrency(price)}
                            </p>
                            {price === 0 && (
                              <p className="text-xs text-red-500 mt-1 flex items-center">
                                <span className="mr-1">⚠️</span>
                                No price data found - check order source data
                              </p>
                            )}
                            {process.env.NODE_ENV === "development" &&
                              price === 0 && (
                                <p className="text-xs text-brand-red-accent mt-1">
                                  Available fields:{" "}
                                  {Object.keys(item).join(", ")} | Product
                                  fields:{" "}
                                  {product
                                    ? Object.keys(product).join(", ")
                                    : "No product data"}
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
                        Order Total:
                      </p>
                      <p className="font-bold text-2xl text-success-base">
                        {formatCurrency(order.totalPrice || 0)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Items calculated total:{" "}
                      {formatCurrency(
                        order.products?.reduce((sum, item) => {
                          const price = item.product?.price || 0;
                          return sum + price * (item.quantity || 1);
                        }, 0) || 0
                      )}
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
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Order Date</Label>
                  <p className="text-sm">{formatDate(order.orderDate)}</p>
                </div>
                {order.estimatedDelivery && (
                  <div>
                    <Label className="text-sm font-medium">
                      Estimated Delivery
                    </Label>
                    <p className="text-sm">
                      {formatDate(order.estimatedDelivery)}
                    </p>
                  </div>
                )}
                {order.actualDelivery && (
                  <div>
                    <Label className="text-sm font-medium">
                      Actual Delivery
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
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Add notes about this order..."
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
                {isUpdating ? "Updating..." : "Update Order"}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="h-12 px-8 text-base font-medium"
                size="lg"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailsSidebar;
