"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Truck, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { urlFor } from "@/sanity/lib/image";
import PriceFormatter from "@/components/PriceFormatter";
import { Employee } from "@/types/employee";
import { assignDeliveryman } from "@/actions/orderEmployeeActions";
import { writeClient } from "@/sanity/lib/client";
import OrderNotes from "./OrderNotes";
import { useTranslation } from "react-i18next";

interface WarehouseOrderSheetProps {
  order: any;
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    shouldSwitchToAssigned?: boolean,
    shouldCloseSheet?: boolean
  ) => void;
}

export default function WarehouseOrderSheet({
  order,
  employee,
  isOpen,
  onClose,
  onUpdate,
}: WarehouseOrderSheetProps) {
  const { t } = useTranslation();
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedDeliveryman, setSelectedDeliveryman] = useState("");
  const [deliverymen, setDeliverymen] = useState<
    Array<{
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    }>
  >([]);
  const [loadingDeliverymen, setLoadingDeliverymen] = useState(false);

  // Fetch available deliverymen
  useEffect(() => {
    const fetchDeliverymen = async () => {
      setLoadingDeliverymen(true);
      try {
        const data = await writeClient.fetch(`
          *[_type == "user" && isEmployee == true && employeeRole == "deliveryman" && employeeStatus == "active"] {
            _id,
            firstName,
            lastName,
            email
          }
        `);
        setDeliverymen(data);
      } catch (error) {
        console.error("Error fetching deliverymen:", error);
        toast.error(t("employee.warehouse.sheet.toast.deliverymenError"));
      } finally {
        setLoadingDeliverymen(false);
      }
    };

    if (isOpen) {
      fetchDeliverymen();
    }
  }, [isOpen]);

  const handleAssignDeliveryman = async () => {
    if (!order?._id || !selectedDeliveryman) {
      toast.error(t("employee.warehouse.sheet.toast.selectDeliveryman"));
      return;
    }

    setIsAssigning(true);
    try {
      const result = await assignDeliveryman(order._id, selectedDeliveryman);

      if (result.success) {
        toast.success(result.message);
        setSelectedDeliveryman("");
        onUpdate(false, true); // Don't switch to assigned tab, just close sheet
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("employee.warehouse.sheet.toast.assignError"));
      console.error("Error assigning deliveryman:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  if (!order) return null;

  const isAssigned = !!order.assignedDeliverymanId;
  const selectedDeliverymanData = deliverymen.find(
    (d) => d._id === selectedDeliveryman
  );

  const getOrderStatusLabel = (status?: string) =>
    status ? t(`employee.orders.status.${status}`) : t("employee.warehouse.na");

  const getPaymentStatusLabel = (status?: string) =>
    status
      ? t(`employee.orders.paymentStatus.${status}`)
      : t("employee.warehouse.na");

  const getPaymentMethodLabel = (method?: string) =>
    method
      ? t(`employee.orders.paymentMethod.${method}`)
      : t("employee.warehouse.na");

  const handleSheetOpenChange = (open: boolean) => {
    // Prevent closing if assigning deliveryman or loading deliverymen data
    if (!open && (isAssigning || loadingDeliverymen)) {
      toast.warning(t("employee.warehouse.sheet.toast.wait"));
      return;
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="sticky top-0 bg-background z-10 pb-4">
          <SheetTitle>
            {t("employee.warehouse.sheet.title", {
              orderNumber: order.orderNumber,
            })}
          </SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={
                order.status === "packed"
                  ? "secondary"
                  : order.status === "ready_for_delivery"
                  ? "default"
                  : order.status === "out_for_delivery"
                  ? "outline"
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
            {isAssigned && (
              <Badge variant="default" className="gap-1 bg-success-base">
                <Check className="h-3 w-3" />
                {t("employee.warehouse.sheet.badge.assigned")}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 px-6 py-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.warehouse.sheet.sections.customerInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.warehouse.sheet.labels.name")}
                </span>
                <span className="font-medium">
                  {order.customerName || t("employee.warehouse.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.warehouse.sheet.labels.email")}
                </span>
                <span className="font-medium">
                  {order.email || t("employee.warehouse.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.warehouse.sheet.labels.phone")}
                </span>
                <span className="font-medium">
                  {order.phone ||
                    order.shippingAddress?.phone ||
                    t("employee.warehouse.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.warehouse.sheet.labels.orderDate")}
                </span>
                <span className="font-medium">
                  {order.orderDate
                    ? format(new Date(order.orderDate), "MMM dd, yyyy")
                    : t("employee.warehouse.na")}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Address */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.warehouse.sheet.sections.deliveryAddress")}
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
                  {t("employee.warehouse.sheet.labels.phoneInline", {
                    phone: order.shippingAddress.phone,
                  })}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Products List */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.warehouse.sheet.sections.products")}
            </h3>
            <div className="space-y-3">
              {order.products?.map((item: any) => {
                const product = item.product;
                const imageUrl = product?.image
                  ? urlFor(product.image).url()
                  : null;

                return (
                  <div
                    key={item._key}
                    className="flex gap-4 p-3 border rounded-lg bg-muted/30"
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={
                          product?.name || t("employee.warehouse.sheet.product")
                        }
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">
                        {product?.name ||
                          t("employee.warehouse.sheet.unknownProduct")}
                      </h4>
                      <div className="text-sm text-muted-foreground">
                        {t("employee.warehouse.sheet.labels.quantity", {
                          count: item.quantity,
                        })}
                      </div>
                      <div className="text-sm font-medium mt-1">
                        <PriceFormatter amount={product?.price || 0} />
                        {item.quantity > 1 && (
                          <span className="text-muted-foreground">
                            {t("employee.warehouse.sheet.quantityMultiplier", {
                              count: item.quantity,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.warehouse.sheet.sections.orderSummary")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.warehouse.sheet.labels.paymentMethod")}
                </span>
                <span className="font-medium capitalize">
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.warehouse.sheet.labels.totalAmount")}
                </span>
                <span className="font-semibold text-lg">
                  <PriceFormatter amount={order.totalPrice} />
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Packing Status */}
          {order.packedBy && (
            <div>
              <h3 className="font-semibold mb-3">
                {t("employee.warehouse.sheet.sections.packingStatus")}
              </h3>
              <div className="space-y-2 text-sm bg-green-50 p-4 rounded-lg border border-success-highlight">
                <div className="flex items-center gap-2 text-success-base">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">
                    {t("employee.warehouse.sheet.packing.ready")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.warehouse.sheet.packing.packedBy")}
                  </span>
                  <span className="font-medium">
                    {order.packedBy?.name || order.packedBy}
                  </span>
                </div>
                {order.packedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.warehouse.sheet.packing.packedAt")}
                    </span>
                    <span className="font-medium">
                      {t("employee.warehouse.sheet.dateTime", {
                        date: format(
                          new Date(order.packedAt),
                          "MMM dd, yyyy"
                        ),
                        time: format(new Date(order.packedAt), "HH:mm"),
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Assignment Status */}
          {isAssigned && (
            <div>
              <h3 className="font-semibold mb-3">
                {t("employee.warehouse.sheet.sections.assignment")}
              </h3>
              <div className="space-y-2 text-sm bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <UserPlus className="h-4 w-4" />
                  <span className="font-medium">
                    {t("employee.warehouse.sheet.assignment.assigned")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.warehouse.sheet.assignment.deliveryman")}
                  </span>
                  <span className="font-medium">
                    {order.assignedDeliverymanName}
                  </span>
                </div>
                {order.dispatchedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.warehouse.sheet.assignment.dispatchedAt")}
                    </span>
                    <span className="font-medium">
                      {t("employee.warehouse.sheet.dateTime", {
                        date: format(
                          new Date(order.dispatchedAt),
                          "MMM dd, yyyy"
                        ),
                        time: format(new Date(order.dispatchedAt), "HH:mm"),
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assign Deliveryman Section */}
          {!isAssigned && (
            <div>
              <h3 className="font-semibold mb-3">
                {t("employee.warehouse.sheet.sections.assignDeliveryman")}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deliveryman">
                    {t("employee.warehouse.sheet.labels.selectDeliveryman")}
                  </Label>
                  <Select
                    value={selectedDeliveryman}
                    onValueChange={setSelectedDeliveryman}
                    disabled={loadingDeliverymen || isAssigning}
                  >
                    <SelectTrigger id="deliveryman" className="mt-2">
                      <SelectValue
                        placeholder={
                          loadingDeliverymen
                            ? t("employee.warehouse.sheet.loadingDeliverymen")
                            : t("employee.warehouse.sheet.chooseDeliveryman")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {deliverymen.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t("employee.warehouse.sheet.emptyDeliverymen")}
                        </div>
                      ) : (
                        deliverymen.map((deliveryman) => (
                          <SelectItem
                            key={deliveryman._id}
                            value={deliveryman._id}
                          >
                            {deliveryman.firstName} {deliveryman.lastName}
                            <span className="text-muted-foreground text-xs ml-2">
                              ({deliveryman.email})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAssignDeliveryman}
                  disabled={
                    !selectedDeliveryman || isAssigning || loadingDeliverymen
                  }
                  className="w-full gap-2"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("employee.warehouse.sheet.actions.assigning")}
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4" />
                      {t("employee.warehouse.sheet.actions.assign")}
                    </>
                  )}
                </Button>

                {selectedDeliveryman && selectedDeliverymanData && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <p className="font-medium mb-1">
                      {t("employee.warehouse.sheet.selectedDeliveryman")}
                    </p>
                    <p>
                      {selectedDeliverymanData.firstName}{" "}
                      {selectedDeliverymanData.lastName}
                    </p>
                    <p className="text-xs">{selectedDeliverymanData.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Notes */}
          <OrderNotes statusHistory={order.statusHistory} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
