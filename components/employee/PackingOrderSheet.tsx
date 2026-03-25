"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2, Package } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { urlFor } from "@/sanity/lib/image";
import PriceFormatter from "@/components/PriceFormatter";
import { Employee } from "@/types/employee";
import { markAsPacked } from "@/actions/orderEmployeeActions";
import OrderNotes from "./OrderNotes";
import { useTranslation } from "react-i18next";

interface PackingOrderSheetProps {
  order: any;
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    shouldSwitchToPacked?: boolean,
    shouldCloseSheet?: boolean
  ) => void;
}

export default function PackingOrderSheet({
  order,
  employee,
  isOpen,
  onClose,
  onUpdate,
}: PackingOrderSheetProps) {
  const { t } = useTranslation();
  const [isPacking, setIsPacking] = useState(false);
  const [packingNotes, setPackingNotes] = useState("");

  const getOrderStatusLabel = (status?: string) =>
    status ? t(`employee.orders.status.${status}`) : t("employee.packing.sheet.na");

  const getPaymentStatusLabel = (status?: string) =>
    status
      ? t(`employee.orders.paymentStatus.${status}`)
      : t("employee.packing.sheet.na");

  const getPaymentMethodLabel = (method?: string) =>
    method
      ? t(`employee.orders.paymentMethod.${method}`)
      : t("employee.packing.sheet.na");

  const handleMarkAsPacked = async () => {
    if (!order?._id) return;

    setIsPacking(true);
    try {
      const result = await markAsPacked(order._id, packingNotes);

      if (result.success) {
        toast.success(result.message);
        setPackingNotes("");
        onUpdate(false, true); // Don't switch to packed tab, just close sheet
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.packing.sheet.toast.error"));
      console.error("Error packing order:", error);
    } finally {
      setIsPacking(false);
    }
  };

  if (!order) return null;

  const isPacked = !!order.packedBy;

  const handleSheetOpenChange = (open: boolean) => {
    // Prevent closing if packing is in progress
    if (!open && isPacking) {
      toast.warning(t("employee.packing.sheet.toast.wait"));
      return;
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="sticky top-0 bg-background z-10 pb-4">
          <SheetTitle>
            {t("employee.packing.sheet.title", {
              orderNumber: order.orderNumber,
            })}
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                order.status === "pending"
                  ? "secondary"
                  : order.status === "processing"
                  ? "default"
                  : order.status === "shipped"
                  ? "outline"
                  : order.status === "delivered"
                  ? "default"
                  : "destructive"
              }
            >
              {getOrderStatusLabel(order.status)}
            </Badge>
            <Badge
              variant={order.paymentStatus === "paid" ? "default" : "secondary"}
            >
              {getPaymentStatusLabel(order.paymentStatus)}
            </Badge>
            {isPacked && (
              <Badge variant="default" className="gap-1 bg-success-base">
                <Check className="h-3 w-3" />
                {t("employee.packing.sheet.badge.packed")}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 px-6 py-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.packing.sheet.sections.customerInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.packing.sheet.labels.name")}
                </span>
                <span className="font-medium">
                  {order.customerName || t("employee.packing.sheet.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.packing.sheet.labels.email")}
                </span>
                <span className="font-medium">
                  {order.email || t("employee.packing.sheet.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.packing.sheet.labels.phone")}
                </span>
                <span className="font-medium">
                  {order.phone ||
                    order.shippingAddress?.phone ||
                    t("employee.packing.sheet.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.packing.sheet.labels.orderDate")}
                </span>
                <span className="font-medium">
                  {order.orderDate
                    ? format(new Date(order.orderDate), "MMM dd, yyyy")
                    : t("employee.packing.sheet.na")}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Address */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.packing.sheet.sections.deliveryAddress")}
            </h3>
            <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg">
              <p className="font-medium">{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.address}</p>
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
                {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country}</p>
              {order.shippingAddress?.phone && (
                <p className="text-muted-foreground">
                  {t("employee.packing.sheet.labels.phoneInline", {
                    phone: order.shippingAddress.phone,
                  })}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.packing.sheet.sections.itemsToPack")}
            </h3>
            <div className="space-y-3">
              {order.products?.map((item: any, index: number) => (
                <div
                  key={
                    item._key ||
                    `product-${item.product?._id}-${index}` ||
                    `item-${index}`
                  }
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {item.product?.image && (
                    <img
                      src={urlFor(item.product.image)
                        .width(60)
                        .height(60)
                        .url()}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.product?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <PriceFormatter amount={item.product?.price || 0} />
                    </p>
                  </div>

                  <div className="text-sm font-medium">
                    {t("employee.packing.sheet.quantity", {
                      count: item.quantity,
                    })}
                  </div>

                  <div className="text-sm font-semibold">
                    <PriceFormatter
                      amount={(item.product?.price || 0) * item.quantity}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {t("employee.packing.sheet.labels.total")}
                </span>
                <span className="text-lg font-bold">
                  <PriceFormatter amount={order.totalPrice || 0} />
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Packing Confirmation */}
          {!isPacked ? (
            <div>
              <h3 className="font-semibold mb-3">
                {t("employee.packing.sheet.sections.markPacked")}
              </h3>
              <Textarea
                placeholder={t("employee.packing.sheet.placeholders.packingNotes")}
                value={packingNotes}
                onChange={(e) => setPackingNotes(e.target.value)}
                className="mb-3"
                rows={3}
              />
              <Button
                onClick={handleMarkAsPacked}
                disabled={isPacking}
                className="w-full gap-2"
              >
                {isPacking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                {t("employee.packing.sheet.actions.markPacked")}
              </Button>
            </div>
          ) : (
            <div>
              <Badge variant="default" className="gap-1 bg-success-base">
                <Check className="h-3 w-3" />
                {t("employee.packing.sheet.badge.orderPacked")}
              </Badge>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("employee.packing.sheet.packedBy", {
                  name: order.packedBy?.name,
                  date: order.packedAt
                    ? format(new Date(order.packedAt), "MMM dd, yyyy")
                    : t("employee.packing.sheet.na"),
                  time: order.packedAt
                    ? format(new Date(order.packedAt), "hh:mm a")
                    : t("employee.packing.sheet.na"),
                })}
              </div>
            </div>
          )}

          {/* Order Confirmed Info */}
          {order.orderConfirmedBy && (
            <div>
              <h3 className="font-semibold mb-2">
                {t("employee.packing.sheet.sections.orderConfirmed")}
              </h3>
              <div className="text-xs text-muted-foreground">
                {t("employee.packing.sheet.confirmedBy", {
                  name: order.orderConfirmedBy?.name,
                  date: order.orderConfirmedAt
                    ? format(new Date(order.orderConfirmedAt), "MMM dd, yyyy")
                    : t("employee.packing.sheet.na"),
                  time: order.orderConfirmedAt
                    ? format(new Date(order.orderConfirmedAt), "hh:mm a")
                    : t("employee.packing.sheet.na"),
                })}
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.packing.sheet.sections.paymentInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.packing.sheet.labels.paymentMethod")}
                </span>
                <span className="font-medium capitalize">
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.packing.sheet.labels.paymentStatus")}
                </span>
                <Badge
                  variant={
                    order.paymentStatus === "paid" ? "default" : "secondary"
                  }
                >
                  {getPaymentStatusLabel(order.paymentStatus)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Order Notes */}
          <OrderNotes statusHistory={order.statusHistory} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
