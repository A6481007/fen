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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  Edit,
  Save,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import {
  confirmAddress,
  confirmOrder,
  confirmQuotationSelection,
  updateQuotationDetails,
  updateShippingAddress,
} from "@/actions/orderEmployeeActions";
import { toast } from "sonner";
import { urlFor } from "@/sanity/lib/image";
import PriceFormatter from "@/components/PriceFormatter";
import { Employee } from "@/types/employee";
import OrderNotes from "./OrderNotes";
import { AddressForm, type AddressFormValues } from "@/components/addresses/AddressForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface OrderDetailSheetProps {
  order: any;
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    shouldSwitchToConfirmed?: boolean,
    shouldCloseSheet?: boolean
  ) => void;
}

interface EditableProduct {
  _key: string;
  product: {
    _id: string;
    name: string;
    image?: string;
    price: number;
  };
  quantity: number;
  unitPrice?: number;
}

const formatTermValue = (
  value: string | null | undefined,
  placeholder: string
) => (value && value.trim() ? value : placeholder);

const buildQuotationLabel = (
  quotation?: {
    number?: string | null;
    version?: number | null;
  },
  t?: (key: string, options?: Record<string, unknown>) => string
) => {
  if (!quotation) return t ? t("employee.orders.detail.none") : "None";
  const numberLabel = quotation.number
    ? t
      ? t("employee.orders.detail.quotationNumber", {
          number: quotation.number,
        })
      : `Quotation ${quotation.number}`
    : t
    ? t("employee.orders.detail.quotation")
    : "Quotation";
  const versionLabel =
    typeof quotation.version === "number" && quotation.version > 0
      ? t
        ? t("employee.orders.detail.version", { version: quotation.version })
        : `v${quotation.version}`
      : null;
  return versionLabel ? `${numberLabel} • ${versionLabel}` : numberLabel;
};

export default function OrderDetailSheet({
  order,
  employee,
  isOpen,
  onClose,
  onUpdate,
}: OrderDetailSheetProps) {
  const { t } = useTranslation();
  const placeholder = t("employee.orders.detail.placeholder");
  const getStatusLabel = (status?: string) =>
    status ? t(`employee.orders.status.${status}`) : t("employee.orders.detail.na");
  const getPaymentStatusLabel = (status?: string) =>
    status
      ? t(`employee.orders.paymentStatus.${status}`)
      : t("employee.orders.detail.na");
  const getPaymentMethodLabel = (method?: string) =>
    method ? t(`employee.orders.paymentMethod.${method}`) : t("employee.orders.detail.na");
  const [isConfirmingAddress, setIsConfirmingAddress] = useState(false);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const [addressNotes, setAddressNotes] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [editableProducts, setEditableProducts] = useState<EditableProduct[]>(
    []
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [isUpdatingQuotationDetails, setIsUpdatingQuotationDetails] =
    useState(false);
  const [confirmingQuotationId, setConfirmingQuotationId] = useState<
    string | null
  >(null);
  const [editableAddress, setEditableAddress] = useState({
    fullName: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
  });

  useEffect(() => {
    if (order?.products) {
      // Ensure each product has a unique _key
      const productsWithKeys = order.products.map(
        (item: any, index: number) => ({
          ...item,
          _key:
            item._key || `${item.product?._id}-${index}` || `product-${index}`,
        })
      );
      setEditableProducts(productsWithKeys);
    }

    // Initialize editable address
    if (order?.shippingAddress) {
      setEditableAddress({
        fullName: order.shippingAddress.fullName || "",
        address: order.shippingAddress.address || "",
        city: order.shippingAddress.city || "",
        state: order.shippingAddress.state || "",
        postalCode: order.shippingAddress.postalCode || "",
        country: order.shippingAddress.country || "",
        phone: order.shippingAddress.phone || "",
      });
    }
  }, [order]);

  const handleConfirmAddress = async () => {
    if (!order?._id) return;

    setIsConfirmingAddress(true);
    try {
      const result = await confirmAddress(order._id, addressNotes);

      if (result.success) {
        toast.success(t("employee.orders.detail.toast.addressConfirmed"));
        setAddressNotes("");
        onUpdate(false, false); // Don't switch tabs, don't close sheet
      } else {
        toast.error(
          result.message ||
            t("employee.orders.detail.toast.confirmAddressFailed")
        );
      }
    } catch (error) {
      toast.error(t("employee.orders.detail.toast.genericError"));
    } finally {
      setIsConfirmingAddress(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!order?._id) return;

    setIsConfirmingOrder(true);
    try {
      const result = await confirmOrder(order._id, orderNotes);

      if (result.success) {
        toast.success(t("employee.orders.detail.toast.orderConfirmed"));
        setOrderNotes("");
        onUpdate(false, true); // Don't switch to confirmed tab, just close sheet
      } else {
        toast.error(
          result.message || t("employee.orders.detail.toast.confirmOrderFailed")
        );
      }
    } catch (error) {
      toast.error(t("employee.orders.detail.toast.genericError"));
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!order?._id) return;

    setIsSavingAddress(true);
    try {
      const result = await updateShippingAddress(order._id, editableAddress);

      if (result.success) {
        toast.success(t("employee.orders.detail.toast.addressUpdated"));
        setIsEditingAddress(false);
        onUpdate(false, false); // Refresh order data
      } else {
        toast.error(
          result.message || t("employee.orders.detail.toast.updateAddressFailed")
        );
      }
    } catch (error) {
      toast.error(t("employee.orders.detail.toast.genericError"));
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleUpdateQuotationDetails = async (values: AddressFormValues) => {
    if (!order?._id) return;

    setIsUpdatingQuotationDetails(true);
    try {
      const result = await updateQuotationDetails(order._id, values);

      if (result.success) {
        toast.success(t("employee.orders.detail.toast.quotationUpdated"));
        setShowQuotationDialog(false);
        onUpdate(false, false);
      } else {
        toast.error(
          result.message ||
            t("employee.orders.detail.toast.updateQuotationFailed")
        );
      }
    } catch (error) {
      console.error("Error updating quotation details:", error);
      toast.error(t("employee.orders.detail.toast.genericError"));
    } finally {
      setIsUpdatingQuotationDetails(false);
    }
  };

  const handleConfirmQuotation = async (quotationId: string) => {
    if (!order?._id || !quotationId) return;

    setConfirmingQuotationId(quotationId);
    try {
      const result = await confirmQuotationSelection(order._id, quotationId);

      if (result.success) {
        toast.success(t("employee.orders.detail.toast.confirmedQuotation"));
        onUpdate(false, false);
      } else {
        toast.error(
          result.message || t("employee.orders.detail.toast.confirmQuotationFailed")
        );
      }
    } catch (error) {
      console.error("Error confirming quotation:", error);
      toast.error(t("employee.orders.detail.toast.genericError"));
    } finally {
      setConfirmingQuotationId(null);
    }
  };

  const handleCancelEditAddress = () => {
    // Reset to original values
    if (order?.shippingAddress) {
      setEditableAddress({
        fullName: order.shippingAddress.fullName || "",
        address: order.shippingAddress.address || "",
        city: order.shippingAddress.city || "",
        state: order.shippingAddress.state || "",
        postalCode: order.shippingAddress.postalCode || "",
        country: order.shippingAddress.country || "",
        phone: order.shippingAddress.phone || "",
      });
    }
    setIsEditingAddress(false);
  };

  const handleQuantityChange = (key: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setEditableProducts((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveProduct = (key: string) => {
    setEditableProducts((prev) => prev.filter((item) => item._key !== key));
  };

  const handleSaveProducts = async () => {
    // TODO: Implement updateOrderProducts server action
    toast.info(t("employee.orders.detail.toast.productsComingSoon"));
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditableProducts(order.products);
    setIsEditing(false);
  };

  const calculateTotal = () => {
    return editableProducts.reduce((total, item) => {
      const unitPrice = item.unitPrice ?? item.product.price;
      return total + unitPrice * item.quantity;
    }, 0);
  };

  if (!order) return null;

  const isAddressConfirmed = !!order.addressConfirmedBy;
  const isOrderConfirmed = !!order.orderConfirmedBy;
  const quotationDetails =
    order.quotationDetails || order.shippingAddress || null;
  const quotationContactEmail =
    quotationDetails?.contactEmail || quotationDetails?.email || order.email;
  const assignedSalesContact =
    order.salesContact || order.quotationDetails?.salesContact || null;
  const salesContactTerms = assignedSalesContact?.terms;
  const quotationList = Array.isArray(order.quotations) ? order.quotations : [];
  const confirmedQuotation = order.selectedQuotation || null;
  const confirmedQuotationLabel = buildQuotationLabel(confirmedQuotation, t);
  const confirmedQuotationAtLabel = order.selectedQuotationAt
    ? format(new Date(order.selectedQuotationAt), "PPP")
    : null;
  const canEditQuotationDetails = ["callcenter", "incharge"].includes(
    employee.role
  );
  const showQuotationSections =
    order.status === "quotation_requested" ||
    Boolean(quotationDetails) ||
    Boolean(assignedSalesContact) ||
    quotationList.length > 0 ||
    Boolean(confirmedQuotation);

  // Prevent closing during any loading/processing state
  const isProcessing =
    isConfirmingAddress ||
    isConfirmingOrder ||
    isSavingAddress ||
    isUpdatingQuotationDetails ||
    confirmingQuotationId !== null;

  const handleSheetOpenChange = (open: boolean) => {
    // Prevent closing if processing
    if (!open && isProcessing) {
      toast.warning(t("employee.orders.detail.toast.waitForAction"));
      return;
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="sticky top-0 bg-background z-10 pb-4">
          <SheetTitle>
            {t("employee.orders.detail.title", { number: order.orderNumber })}
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                order.status === "pending" ||
                order.status === "quotation_requested"
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
              {getStatusLabel(order.status)}
            </Badge>
            <Badge
              variant={order.paymentStatus === "paid" ? "default" : "secondary"}
            >
              {getPaymentStatusLabel(order.paymentStatus)}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-6 py-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.orders.detail.sections.customerInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.orders.detail.labels.name")}
                </span>
                <span className="font-medium">
                  {order.customerName || t("employee.orders.detail.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.orders.detail.labels.email")}
                </span>
                <span className="font-medium">
                  {order.email || t("employee.orders.detail.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.orders.detail.labels.phone")}
                </span>
                <span className="font-medium">
                  {order.phone || t("employee.orders.detail.na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.orders.detail.labels.orderDate")}
                </span>
                <span className="font-medium">
                  {order._createdAt
                    ? format(new Date(order._createdAt), "MMM dd, yyyy")
                    : t("employee.orders.detail.na")}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {showQuotationSections && (
            <>
              {/* Quotation Sales Contact */}
              <div>
                <h3 className="font-semibold mb-3">
                  {t("employee.orders.detail.sections.quotationSalesContact")}
                </h3>
                {assignedSalesContact ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.name")}
                      </span>
                      <span className="font-medium">
                        {assignedSalesContact.name || placeholder}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.phone")}
                      </span>
                      <span className="font-medium">
                        {assignedSalesContact.phone
                          ? `${assignedSalesContact.phone}${
                              assignedSalesContact.ext
                                ? ` ${t("employee.orders.detail.labels.extension")} ${assignedSalesContact.ext}`
                                : ""
                            }`
                          : placeholder}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.mobile")}
                      </span>
                      <span className="font-medium">
                        {assignedSalesContact.mobile || placeholder}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.email")}
                      </span>
                      <span className="font-medium">
                        {assignedSalesContact.email || placeholder}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.salesLine")}
                      </span>
                      <span className="font-medium">
                        {assignedSalesContact.lineId
                          ? `${assignedSalesContact.lineId}${
                              assignedSalesContact.lineExt
                                ? ` (${assignedSalesContact.lineExt})`
                                : ""
                            }`
                          : placeholder}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.website")}
                      </span>
                      <span className="font-medium">
                        {assignedSalesContact.web || placeholder}
                      </span>
                    </div>
                    <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>
                          {t("employee.orders.detail.labels.paymentCondition")}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatTermValue(
                            salesContactTerms?.paymentCondition,
                            placeholder
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {t("employee.orders.detail.labels.deliveryCondition")}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatTermValue(
                            salesContactTerms?.deliveryCondition,
                            placeholder
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {t("employee.orders.detail.labels.validityCondition")}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatTermValue(
                            salesContactTerms?.validityCondition,
                            placeholder
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {t("employee.orders.detail.labels.warrantyCondition")}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatTermValue(
                            salesContactTerms?.warrantyCondition,
                            placeholder
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("employee.orders.detail.empty.salesContact")}
                  </p>
                )}
              </div>

              <Separator />

              {/* Quotation Requests */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("employee.orders.detail.sections.quotationRequests")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.orders.detail.quotationRequests.subtitle")}
                    </p>
                    {confirmedQuotationAtLabel && (
                      <p className="text-xs text-muted-foreground">
                        {t("employee.orders.detail.quotationRequests.confirmedOn", {
                          date: confirmedQuotationAtLabel,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("employee.orders.detail.quotationRequests.currentConfirmed")}{" "}
                    <span className="font-medium text-foreground">
                      {confirmedQuotationLabel}
                    </span>
                  </div>
                </div>
                {quotationList.length > 0 ? (
                  <div className="space-y-3">
                    {quotationList.map((quotation: any) => {
                      const isConfirmed =
                        confirmedQuotation?._id === quotation._id;
                      const createdAtLabel = quotation.createdAt
                        ? format(new Date(quotation.createdAt), "PPP")
                        : t("employee.orders.detail.quotationRequests.dateUnavailable");
                      const emailSentLabel = quotation.emailSentAt
                        ? format(new Date(quotation.emailSentAt), "PPP")
                        : null;
                      const previewUrl =
                        quotation.pdfUrl ||
                        (order
                          ? `/api/orders/${order._id}/purchase-order?pdf=1&quoteId=${quotation._id}`
                          : null);

                      return (
                        <div
                          key={quotation._id}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {buildQuotationLabel(quotation, t)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("employee.orders.detail.quotationRequests.createdOn", {
                                  date: createdAtLabel,
                                })}
                              </p>
                              {emailSentLabel && (
                                <p className="text-xs text-muted-foreground">
                                  {t("employee.orders.detail.quotationRequests.emailSent", {
                                    date: emailSentLabel,
                                  })}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {isConfirmed ? (
                                <Badge variant="default">
                                  {t("employee.orders.detail.quotationRequests.confirmedBadge")}
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleConfirmQuotation(quotation._id)
                                  }
                                  disabled={
                                    confirmingQuotationId === quotation._id
                                  }
                                >
                                  {confirmingQuotationId === quotation._id
                                    ? t("employee.orders.detail.quotationRequests.updating")
                                    : t("employee.orders.detail.quotationRequests.setConfirmed")}
                                </Button>
                              )}
                              {previewUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    window.open(
                                      previewUrl,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  {t("employee.orders.detail.quotationRequests.previewPdf")}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("employee.orders.detail.empty.quotationRequests")}
                  </p>
                )}
              </div>

              <Separator />

              {/* Quotation Details */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t("employee.orders.detail.sections.quotationDetails")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.orders.detail.quotationDetails.subtitle")}
                    </p>
                  </div>
                  {canEditQuotationDetails && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowQuotationDialog(true)}
                    >
                      {t("employee.orders.detail.quotationDetails.editButton")}
                    </Button>
                  )}
                </div>
                {quotationDetails ? (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">
                          {t("employee.orders.detail.labels.contactName")}
                        </span>
                        <p className="font-medium">
                          {quotationDetails.name || placeholder}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("employee.orders.detail.labels.company")}
                        </span>
                        <p className="font-medium">
                          {quotationDetails.company || placeholder}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("employee.orders.detail.labels.customerCode")}
                        </span>
                        <p className="font-medium">
                          {quotationDetails.customerCode || placeholder}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("employee.orders.detail.labels.winCode")}
                        </span>
                        <p className="font-medium">
                          {quotationDetails.winCode || placeholder}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("employee.orders.detail.labels.lineId")}
                        </span>
                        <p className="font-medium">
                          {quotationDetails.lineId || placeholder}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("employee.orders.detail.labels.taxId")}
                        </span>
                        <p className="font-medium">
                          {quotationDetails.taxId || placeholder}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("employee.orders.detail.labels.branch")}
                        </span>
                        <p className="font-medium">
                          {quotationDetails.branch || placeholder}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.address")}
                      </span>
                      <p className="font-medium break-words">
                        {[
                          quotationDetails.address,
                          quotationDetails.subArea,
                          quotationDetails.city,
                          quotationDetails.state,
                          quotationDetails.zip,
                        ]
                          .filter(Boolean)
                          .join(", ") || placeholder}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("employee.orders.detail.labels.contactEmail")}
                      </span>
                      <p className="font-medium break-words">
                        {quotationContactEmail || placeholder}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("employee.orders.detail.empty.quotationDetails")}
                  </p>
                )}
                {!canEditQuotationDetails && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("employee.orders.detail.quotationDetails.restrictedHint")}
                  </p>
                )}
              </div>

              <Separator />
            </>
          )}

          {/* Delivery Address with inline confirm button */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                {t("employee.orders.detail.sections.deliveryAddress")}
              </h3>
              {!isAddressConfirmed && employee.role === "callcenter" && (
                <div className="flex gap-2">
                  {isEditingAddress ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditAddress}
                        disabled={isSavingAddress}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("employee.orders.detail.actions.cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveAddress}
                        disabled={isSavingAddress}
                      >
                        {isSavingAddress ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        {t("employee.orders.detail.actions.save")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingAddress(true)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {t("employee.orders.detail.actions.edit")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleConfirmAddress}
                        disabled={isConfirmingAddress}
                        className="gap-2"
                      >
                        {isConfirmingAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        {t("employee.orders.detail.actions.confirm")}
                      </Button>
                    </>
                  )}
                </div>
              )}
              {!isAddressConfirmed && employee.role !== "callcenter" && (
                <Badge variant="secondary" className="gap-1">
                  {t("employee.orders.detail.badges.pendingConfirmation")}
                </Badge>
              )}
              {isAddressConfirmed && (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  {t("employee.orders.detail.badges.addressConfirmed")}
                </Badge>
              )}
            </div>

            {isEditingAddress &&
            !isAddressConfirmed &&
            employee.role === "callcenter" ? (
              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {t("employee.orders.detail.labels.fullName")}
                  </label>
                  <Input
                    value={editableAddress.fullName}
                    onChange={(e) =>
                      setEditableAddress({
                        ...editableAddress,
                        fullName: e.target.value,
                      })
                    }
                    placeholder={t(
                      "employee.orders.detail.placeholders.fullName"
                    )}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {t("employee.orders.detail.labels.address")}
                  </label>
                  <Textarea
                    value={editableAddress.address}
                    onChange={(e) =>
                      setEditableAddress({
                        ...editableAddress,
                        address: e.target.value,
                      })
                    }
                    placeholder={t(
                      "employee.orders.detail.placeholders.address"
                    )}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("employee.orders.detail.labels.city")}
                    </label>
                    <Input
                      value={editableAddress.city}
                      onChange={(e) =>
                        setEditableAddress({
                          ...editableAddress,
                          city: e.target.value,
                        })
                      }
                      placeholder={t(
                        "employee.orders.detail.placeholders.city"
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("employee.orders.detail.labels.state")}
                    </label>
                    <Input
                      value={editableAddress.state}
                      onChange={(e) =>
                        setEditableAddress({
                          ...editableAddress,
                          state: e.target.value,
                        })
                      }
                      placeholder={t(
                        "employee.orders.detail.placeholders.state"
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("employee.orders.detail.labels.postalCode")}
                    </label>
                    <Input
                      value={editableAddress.postalCode}
                      onChange={(e) =>
                        setEditableAddress({
                          ...editableAddress,
                          postalCode: e.target.value,
                        })
                      }
                      placeholder={t(
                        "employee.orders.detail.placeholders.postalCode"
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("employee.orders.detail.labels.country")}
                    </label>
                    <Input
                      value={editableAddress.country}
                      onChange={(e) =>
                        setEditableAddress({
                          ...editableAddress,
                          country: e.target.value,
                        })
                      }
                      placeholder={t(
                        "employee.orders.detail.placeholders.country"
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {t("employee.orders.detail.labels.phone")}
                  </label>
                  <Input
                    value={editableAddress.phone}
                    onChange={(e) =>
                      setEditableAddress({
                        ...editableAddress,
                        phone: e.target.value,
                      })
                    }
                    placeholder={t(
                      "employee.orders.detail.placeholders.phone"
                    )}
                  />
                </div>
              </div>
            ) : (
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
                    {t("employee.orders.detail.labels.phone")}{" "}
                    {order.shippingAddress.phone}
                  </p>
                )}
              </div>
            )}

            {isAddressConfirmed && (
              <div className="mt-2 text-xs text-muted-foreground">
                {t("employee.orders.detail.address.confirmedBy", {
                  name: order.addressConfirmedBy?.name ?? "",
                  date: order.addressConfirmedAt
                    ? format(
                        new Date(order.addressConfirmedAt),
                        "MMM dd, yyyy"
                      )
                    : t("employee.orders.detail.na"),
                  time: order.addressConfirmedAt
                    ? format(new Date(order.addressConfirmedAt), "hh:mm a")
                    : t("employee.orders.detail.na"),
                })}
              </div>
            )}

            {!isAddressConfirmed && (
              <Textarea
                placeholder={t(
                  "employee.orders.detail.placeholders.addressNotes"
                )}
                value={addressNotes}
                onChange={(e) => setAddressNotes(e.target.value)}
                className="mt-3"
                rows={2}
              />
            )}
          </div>

          <Separator />

          {/* Products Section with Edit Capability */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                {t("employee.orders.detail.sections.orderItems")}
              </h3>
              {!isOrderConfirmed && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("employee.orders.detail.actions.cancel")}
                      </Button>
                      <Button size="sm" onClick={handleSaveProducts}>
                        <Check className="h-4 w-4 mr-1" />
                        {t("employee.orders.detail.actions.save")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      {t("employee.orders.detail.actions.editProducts")}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {editableProducts.map((item, index) => (
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

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() =>
                          handleQuantityChange(item._key, item.quantity - 1)
                        }
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(
                            item._key,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-16 h-7 text-center"
                        min="1"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() =>
                          handleQuantityChange(item._key, item.quantity + 1)
                        }
                      >
                        +
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={() => handleRemoveProduct(item._key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm font-medium">
                      {t("employee.orders.detail.quantity", {
                        count: item.quantity,
                      })}
                    </div>
                  )}

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
                  {t("employee.orders.detail.labels.total")}
                </span>
                <span className="text-lg font-bold">
                  <PriceFormatter amount={calculateTotal()} />
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Confirmation Section - Only show after address confirmed */}
          {isAddressConfirmed && !isOrderConfirmed && (
            <div>
              <h3 className="font-semibold mb-3">
                {t("employee.orders.detail.sections.confirmOrder")}
              </h3>
              <Textarea
                placeholder={t(
                  "employee.orders.detail.placeholders.orderNotes"
                )}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="mb-3"
                rows={3}
              />
              <Button
                onClick={handleConfirmOrder}
                disabled={isConfirmingOrder}
                className="w-full gap-2"
              >
                {isConfirmingOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t("employee.orders.detail.actions.confirmOrder")}
              </Button>
            </div>
          )}

          {isOrderConfirmed && (
            <div>
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                {t("employee.orders.detail.badges.orderConfirmed")}
              </Badge>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("employee.orders.detail.order.confirmedBy", {
                  name: order.orderConfirmedBy?.name ?? "",
                  date: order.orderConfirmedAt
                    ? format(
                        new Date(order.orderConfirmedAt),
                        "MMM dd, yyyy"
                      )
                    : t("employee.orders.detail.na"),
                  time: order.orderConfirmedAt
                    ? format(new Date(order.orderConfirmedAt), "hh:mm a")
                    : t("employee.orders.detail.na"),
                })}
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div>
            <h3 className="font-semibold mb-3">
              {t("employee.orders.detail.sections.paymentInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.orders.detail.labels.paymentMethod")}
                </span>
                <span className="font-medium capitalize">
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("employee.orders.detail.labels.paymentStatus")}
                </span>
                <Badge
                  variant={
                    order.paymentStatus === "paid" ? "default" : "secondary"
                  }
                >
                  {getPaymentStatusLabel(order.paymentStatus)}
                </Badge>
              </div>
              {order.transactionId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("employee.orders.detail.labels.transactionId")}
                  </span>
                  <span className="font-medium font-mono text-xs">
                    {order.transactionId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Notes */}
          <OrderNotes statusHistory={order.statusHistory} />
        </div>

        <Dialog
          open={showQuotationDialog}
          onOpenChange={setShowQuotationDialog}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {t("employee.orders.detail.quotationDetails.dialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("employee.orders.detail.quotationDetails.dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            {quotationDetails && (
              <AddressForm
                initialValues={{
                  ...quotationDetails,
                  email: quotationDetails.email || order.email || "",
                }}
                defaultContactEmail={quotationContactEmail}
                onSubmit={handleUpdateQuotationDetails}
                onCancel={() => setShowQuotationDialog(false)}
                submitLabel={t("employee.orders.detail.quotationDetails.save")}
                cancelLabel={t("employee.orders.detail.actions.cancel")}
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
      </SheetContent>
    </Sheet>
  );
}
