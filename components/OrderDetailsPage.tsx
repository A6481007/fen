"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import {
  CalendarDays,
  MapPin,
  Package,
  CreditCard,
  Download,
  FileText,
  Clock,
  XCircle,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  Wallet,
  MoreVertical,
  BadgeDollarSign,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { urlFor } from "@/sanity/lib/image";
import PriceFormatter from "./PriceFormatter";
import { format } from "date-fns";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
} from "@/lib/orderStatus";
import { NEW_QUOTE_FEATURE } from "@/lib/featureFlags";
import { toast } from "sonner";
import useCartStore from "@/store";
import { apiReorder } from "@/lib/cart/client";
import { syncCartSnapshot } from "@/hooks/useCart";
import OrderTimeline from "./OrderTimeline";
import OrderStatusBadge from "./orders/OrderStatusBadge";
import { requestOrderCancellation } from "@/actions/orderCancellationActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { buildProductPath } from "@/lib/paths";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { AddressForm, type AddressFormValues } from "@/components/addresses/AddressForm";
import type { Address } from "@/lib/address";

interface OrderDetailsPageProps {
  order: {
    _id: string;
    orderNumber: string;
    clerkUserId: string;
    customerName: string;
    email: string;
    products: Array<{
      product?: {
        _id: string;
        name?: string;
        slug?: { current: string };
        image?: { asset: { url: string } };
        images?: Array<{ asset?: { url?: string } }>;
        price?: number;
        currency?: string;
        categories?: Array<{ title: string }>;
        stock?: number | null;
      } | null;
      quantity: number;
      unitPrice?: number;
      lineTotal?: number;
    }>;
    subtotal: number;
    tax: number;
    shipping: number;
    totalPrice: number;
    currency: string;
    amountDiscount: number;
    address: Address;
    quotationDetails?: Address;
    salesContact?: {
      _id: string;
      name?: string;
      email?: string;
      phone?: string;
    } | null;
    status: string;
    quotationRequestedAt?: string;
    paymentStatus: string;
    clerkPaymentStatus?: string;
    paymentMethod: string;
    orderDate: string;
    invoice?: {
      id: string;
      number: string;
      hosted_invoice_url: string;
    };
    purchaseOrder?: {
      number: string;
      createdAt: string;
    };
    selectedQuotation?: {
      _id: string;
      number?: string | null;
      version?: number | null;
      createdAt?: string | null;
      pdfUrl?: string | null;
    } | null;
    selectedQuotationAt?: string | null;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    paymentCompletedAt?: string;
    addressConfirmedAt?: string;
    addressConfirmedBy?: string;
    orderConfirmedAt?: string;
    orderConfirmedBy?: string;
    packedAt?: string;
    packedBy?: string;
    cashCollectedAt?: string;
    deliveredAt?: string;
    deliveredBy?: string;
    assignedDeliverymanName?: string;
    dispatchedAt?: string;
    cancellationRequested?: boolean;
    cancellationRequestedAt?: string;
    cancellationRequestReason?: string;
    cancelledAt?: string;
  };
}

type OrderProductItem = OrderDetailsPageProps["order"]["products"][number];

type ReorderSkippedItem = {
  productId?: string;
  productName?: string;
  reason?: string;
};

type ReorderAdjustment = {
  productId?: string;
  productName?: string;
  requested: number;
  available: number;
};

type QuotationSummary = {
  _id: string;
  number?: string | null;
  version?: number | null;
  createdAt?: string | null;
  emailSentAt?: string | null;
  pdfUrl?: string | null;
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case PAYMENT_STATUSES.PAID:
      return <CheckCircle className="w-4 h-4 text-success-base" />;
    case PAYMENT_STATUSES.CREDIT_APPROVED:
      return <CheckCircle className="w-4 h-4 text-success-base" />;
    case PAYMENT_STATUSES.FAILED:
    case PAYMENT_STATUSES.CANCELLED:
    case PAYMENT_STATUSES.CREDIT_REJECTED:
      return <XCircle className="w-4 h-4 text-red-500" />;
    case PAYMENT_STATUSES.CREDIT_REQUESTED:
    default:
      return <Clock className="w-4 h-4 text-yellow-500" />;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case PAYMENT_STATUSES.PAID:
      return "bg-success-highlight text-success-base";
    case PAYMENT_STATUSES.CREDIT_APPROVED:
      return "bg-success-highlight text-success-base";
    case PAYMENT_STATUSES.FAILED:
    case PAYMENT_STATUSES.CANCELLED:
    case PAYMENT_STATUSES.CREDIT_REJECTED:
      return "bg-red-100 text-red-800";
    case PAYMENT_STATUSES.CREDIT_REQUESTED:
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

const resolvePaymentStatusDisplay = (order: {
  paymentMethod: string;
  paymentStatus: string;
  clerkPaymentStatus?: string;
}) => {
  if (order.paymentMethod === PAYMENT_METHODS.CLERK) {
    if (
      order.paymentStatus === PAYMENT_STATUSES.FAILED ||
      order.paymentStatus === PAYMENT_STATUSES.CANCELLED
    ) {
      return { label: order.paymentStatus, status: order.paymentStatus };
    }

    if (
      order.clerkPaymentStatus === "paid" ||
      order.paymentStatus === PAYMENT_STATUSES.PAID
    ) {
      return { label: "Paid", status: PAYMENT_STATUSES.PAID };
    }

    if (
      ["invoice_sent", "pending", "unpaid"].includes(
        order.clerkPaymentStatus ?? ""
      )
    ) {
      return {
        label: "Unpaid (Invoice sent)",
        status: PAYMENT_STATUSES.PENDING,
      };
    }

    return { label: "Pending", status: PAYMENT_STATUSES.PENDING };
  }

  const creditStatusLabels: Record<string, string> = {
    [PAYMENT_STATUSES.CREDIT_REQUESTED]: "Credit Requested",
    [PAYMENT_STATUSES.CREDIT_APPROVED]: "Credit Approved (Successful)",
    [PAYMENT_STATUSES.CREDIT_REJECTED]: "Credit Rejected",
  };

  if (creditStatusLabels[order.paymentStatus]) {
    return {
      label: creditStatusLabels[order.paymentStatus],
      status: order.paymentStatus,
    };
  }

  return { label: order.paymentStatus, status: order.paymentStatus };
};

const CANCELLATION_REASONS = [
  "Changed my mind",
  "Found a better price",
  "Ordered by mistake",
  "Delivery time is too long",
];

const OrderDetailsPage: React.FC<OrderDetailsPageProps> = ({ order }) => {
  const newQuotesEnabled = NEW_QUOTE_FEATURE;
  const legacyQuotesEnabled = !newQuotesEnabled;
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [generatingPurchaseOrder, setGeneratingPurchaseOrder] =
    useState(false);
  const [quotationDelivery, setQuotationDelivery] = useState<{
    pdfUrl?: string;
    pdfDownloadUrl?: string;
    emailSent?: boolean;
    emailError?: string;
  } | null>(null);
  const [currentOrder, setCurrentOrder] = useState(order);
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [selectingQuotationId, setSelectingQuotationId] = useState<
    string | null
  >(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isAcceptingQuotation, setIsAcceptingQuotation] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showQuotationDetailsDialog, setShowQuotationDetailsDialog] =
    useState(false);
  const [isUpdatingQuotationDetails, setIsUpdatingQuotationDetails] =
    useState(false);
  const [showShippingDetailsDialog, setShowShippingDetailsDialog] =
    useState(false);
  const [isUpdatingShippingDetails, setIsUpdatingShippingDetails] =
    useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [nextPaymentMethod, setNextPaymentMethod] = useState<PaymentMethod>(
    PAYMENT_METHODS.STRIPE
  );
  const [isUpdatingPaymentMethod, setIsUpdatingPaymentMethod] =
    useState(false);
  const [businessProfile, setBusinessProfile] = useState<{
    isBusiness: boolean;
    businessStatus?: string;
    membershipType?: string;
  } | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedCancellationReason, setSelectedCancellationReason] =
    useState<string | null>(null);
  const isDealerAccount = Boolean(
    businessProfile?.isBusiness ||
      businessProfile?.businessStatus === "active" ||
      businessProfile?.membershipType === "business"
  );

  useEffect(() => {
    const shouldLoadBusinessProfile =
      currentOrder.status === ORDER_STATUSES.QUOTATION_REQUESTED ||
      currentOrder.paymentStatus === PAYMENT_STATUSES.CREDIT_REJECTED;

    if (!shouldLoadBusinessProfile) {
      return;
    }

    let isActive = true;

    const fetchBusinessProfile = async () => {
      try {
        const response = await fetch("/api/user/status");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!isActive) return;
        const profile = data?.userProfile;
        setBusinessProfile({
          isBusiness: Boolean(profile?.isBusiness),
          businessStatus: profile?.businessStatus ?? "none",
          membershipType: profile?.membershipType ?? "standard",
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (isActive) {
          setBusinessProfile({
            isBusiness: false,
            businessStatus: "none",
            membershipType: "standard",
          });
        }
      }
    };

    void fetchBusinessProfile();

    return () => {
      isActive = false;
    };
  }, [currentOrder.status, currentOrder.paymentStatus]);

  useEffect(() => {
    if (!newQuotesEnabled || !currentOrder._id) {
      return;
    }

    let isActive = true;

    const fetchQuotations = async () => {
      try {
        const response = await fetch(
          `/api/orders/${currentOrder._id}/quotations`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch quotations (${response.status})`);
        }
        const data = await response.json();
        if (!isActive) {
          return;
        }
        setQuotations(Array.isArray(data?.quotations) ? data.quotations : []);
      } catch (error) {
        console.error("Error fetching quotations:", error);
        if (isActive) {
          setQuotations([]);
        }
      }
    };

    void fetchQuotations();

    return () => {
      isActive = false;
    };
  }, [currentOrder._id, newQuotesEnabled]);

  const { items: cartItemsInStore } = useCartStore();
  const router = useRouter();
  const isQuotation =
    currentOrder.status === ORDER_STATUSES.QUOTATION_REQUESTED;
  const legacyQuotationDownloadUrl = legacyQuotesEnabled
    ? quotationDelivery?.pdfDownloadUrl ?? quotationDelivery?.pdfUrl
    : undefined;
  const hasLegacyQuotation =
    legacyQuotesEnabled &&
    (Boolean(currentOrder.purchaseOrder?.number) ||
      Boolean(legacyQuotationDownloadUrl));
  const canShowQuotationAction =
    legacyQuotesEnabled && (isQuotation || hasLegacyQuotation);
  const cancellationPending = Boolean(
    currentOrder.cancellationRequested && currentOrder.status !== "cancelled"
  );
  const paymentStatusDisplay = resolvePaymentStatusDisplay(currentOrder);
  const isPaid =
    currentOrder.paymentStatus === PAYMENT_STATUSES.PAID ||
    currentOrder.status === ORDER_STATUSES.PAID;
  const invoiceDownloadUrl = currentOrder.invoice?.hosted_invoice_url;
  const hasInvoiceUrl = Boolean(invoiceDownloadUrl);
  const canShowInvoiceAction = hasInvoiceUrl || isPaid;
  const paymentMethodLabels: Record<string, string> = {
    [PAYMENT_METHODS.CLERK]: "Invoice (Clerk)",
    [PAYMENT_METHODS.CASH_ON_DELIVERY]: "Cash on Delivery",
    [PAYMENT_METHODS.CREDIT]: "Credit Payment (Request Approval)",
  };
  const paymentMethodLabel =
    paymentMethodLabels[currentOrder.paymentMethod] ??
    currentOrder.paymentMethod.replace(/_/g, " ");
  const PaymentMethodIcon =
    currentOrder.paymentMethod === PAYMENT_METHODS.CREDIT
      ? BadgeDollarSign
      : currentOrder.paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY ||
          currentOrder.paymentMethod === PAYMENT_METHODS.CLERK
        ? Wallet
        : CreditCard;
  const isCreditPayment =
    currentOrder.paymentMethod === PAYMENT_METHODS.CREDIT;
  const isCreditRequested =
    currentOrder.paymentStatus === PAYMENT_STATUSES.CREDIT_REQUESTED;
  const isCreditApproved =
    currentOrder.paymentStatus === PAYMENT_STATUSES.CREDIT_APPROVED;
  const isCreditRejected =
    currentOrder.paymentStatus === PAYMENT_STATUSES.CREDIT_REJECTED;
  const isPaymentComplete =
    currentOrder.paymentStatus === PAYMENT_STATUSES.PAID;
  const isOrderCancelled = currentOrder.status === ORDER_STATUSES.CANCELLED;
  const hasStartedCheckout = Boolean(currentOrder.stripeCheckoutSessionId);
  const canChangePaymentMethod =
    !isPaymentComplete &&
    !isOrderCancelled &&
    !hasStartedCheckout &&
    (isQuotation || isCreditRejected);
  const canSelectCreditPayment =
    isDealerAccount && isQuotation && !isCreditRejected;
  const hasSalesContact = Boolean(
    currentOrder.salesContact?.name ||
      currentOrder.salesContact?.email ||
      currentOrder.salesContact?.phone
  );
  const salesContactDetails = [
    currentOrder.salesContact?.email
      ? `Email: ${currentOrder.salesContact.email}`
      : null,
    currentOrder.salesContact?.phone
      ? `Phone: ${currentOrder.salesContact.phone}`
      : null,
  ].filter(Boolean) as string[];
  const creditNotice = (() => {
    if (!isCreditPayment) {
      return null;
    }
    if (isCreditRequested) {
      return {
        tone: "pending",
        title: "Credit request submitted",
        description: hasSalesContact
          ? "Please contact your sales representative for next steps on your credit request."
          : "Our support or sales team will contact you with updates.",
      };
    }
    if (isCreditApproved) {
      return {
        tone: "approved",
        title: "Credit approved",
        description:
          "Your credit request was approved. Please continue the payment process with our sales team outside this website.",
      };
    }
    if (isCreditRejected) {
      return {
        tone: "rejected",
        title: "Credit request not approved",
        description:
          "Your credit request was not approved. You can change your payment method to continue your order.",
      };
    }
    return null;
  })();
  const statusMessage = generatingPurchaseOrder
    ? "Preparing quotation..."
    : generatingInvoice
      ? "Generating invoice..."
      : isAcceptingQuotation
      ? "Preparing checkout..."
      : isReordering
        ? "Adding items to cart..."
        : isCancelling
          ? isQuotation
            ? "Cancelling quotation..."
            : "Submitting cancellation request..."
          : null;
  const openPdf = (url: string) => {
    const nextWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!nextWindow) {
      window.location.assign(url);
    }
  };
  const quotationActionLabel = hasLegacyQuotation
    ? "Download Quotation"
    : "Generate Quotation";
  const invoiceActionLabel = hasInvoiceUrl
    ? "Download Invoice"
    : "Generate Invoice";
  const quotationActionUrl =
    legacyQuotationDownloadUrl ??
    (hasLegacyQuotation
      ? `/api/orders/${currentOrder._id}/purchase-order?pdf=1&download=1`
      : undefined);
  const hasDocuments = canShowQuotationAction || canShowInvoiceAction;
  const quotationRequestEligibleStatuses = [
    ORDER_STATUSES.PENDING,
    ORDER_STATUSES.QUOTATION_REQUESTED,
    "address_confirmed",
  ];
  const canRequestUpdatedQuotation =
    newQuotesEnabled &&
    quotationRequestEligibleStatuses.includes(currentOrder.status);
  const showQuotationCard =
    newQuotesEnabled && (quotations.length > 0 || canRequestUpdatedQuotation);
  const canSelectQuotation =
    currentOrder.status === ORDER_STATUSES.QUOTATION_REQUESTED ||
    currentOrder.status === ORDER_STATUSES.PENDING;
  const sortedQuotations = [...quotations].sort((a, b) => {
    const aVersion = typeof a.version === "number" ? a.version : null;
    const bVersion = typeof b.version === "number" ? b.version : null;
    if (aVersion !== null && bVersion !== null && aVersion !== bVersion) {
      return bVersion - aVersion;
    }
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });
  const latestQuotation = sortedQuotations[0] ?? null;
  const latestQuotationId = latestQuotation?._id ?? null;
  const selectedQuotationId = currentOrder.selectedQuotation?._id ?? null;
  const selectedQuotationLabel = currentOrder.selectedQuotation?.number
    ? `Quotation ${currentOrder.selectedQuotation.number}`
    : currentOrder.selectedQuotation
      ? "Quotation"
      : null;
  const selectedQuotationVersionLabel =
    currentOrder.selectedQuotation?.version &&
    currentOrder.selectedQuotation.version > 1
      ? `Version ${currentOrder.selectedQuotation.version}`
      : null;
  const selectedQuotationAtLabel = currentOrder.selectedQuotationAt
    ? format(new Date(currentOrder.selectedQuotationAt), "PPP")
    : null;
  const latestEmailSentAt = sortedQuotations.reduce<string | null>(
    (latest, quotation) => {
      if (!quotation.emailSentAt) return latest;
      if (!latest) return quotation.emailSentAt;
      return new Date(quotation.emailSentAt).getTime() >
        new Date(latest).getTime()
        ? quotation.emailSentAt
        : latest;
    },
    null
  );
  const hasQuotationRequest = Boolean(isQuotation || sortedQuotations.length > 0);
  const quotationFlowSteps = [
    {
      key: "requested",
      label: "Requested",
      done: hasQuotationRequest,
      date:
        currentOrder.quotationRequestedAt ??
        latestQuotation?.createdAt ??
        null,
    },
    {
      key: "emailed",
      label: "Emailed",
      done: Boolean(latestEmailSentAt),
      date: latestEmailSentAt,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      done: Boolean(selectedQuotationId),
      date: currentOrder.selectedQuotationAt ?? null,
    },
  ];
  const quotationDetails =
    currentOrder.quotationDetails ?? currentOrder.address;
  const quotationContactEmail =
    quotationDetails?.contactEmail ||
    quotationDetails?.email ||
    currentOrder.email;
  const shippingContactEmail =
    currentOrder.address.contactEmail ||
    currentOrder.address.email ||
    currentOrder.email;
  const quotationAddressLine = [
    quotationDetails?.address,
    quotationDetails?.subArea,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
  const quotationRegionLine = [
    quotationDetails?.city,
    quotationDetails?.state,
    quotationDetails?.zip,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
  const breadcrumbOrderLabel = currentOrder.orderNumber
    ? `Order #${currentOrder.orderNumber}`
    : currentOrder._id
      ? `Order #${currentOrder._id.slice(-8)}`
      : "Order";
  const cancelOrderLabel = isQuotation ? "Cancel Quotation" : "Cancel Order";
  const cancelDialogTitle = isQuotation
    ? "Cancel Quotation Confirmation"
    : "Cancel Order Confirmation";
  const cancelDialogDescription = isQuotation
    ? "Are you sure you want to cancel this quotation request? Let us know the reason."
    : "Are you sure you want to cancel this order? Let us know the reason.";
  const cancelDialogNote = isQuotation
    ? "This will cancel the quotation immediately."
    : "Your request will be sent to our team for review.";

  const buildUnavailableNote = (
    items: ReorderSkippedItem[]
  ) => {
    if (!items.length) return "";
    const names = items.map(
      (item) => item.productName ?? item.productId ?? "Unknown product"
    );
    const uniqueNames = Array.from(new Set(names.filter(Boolean)));
    const preview = uniqueNames.slice(0, 3).join(", ");
    const suffix = uniqueNames.length > 3 ? "..." : "";
    const itemCount = items.length;
    const verb = itemCount === 1 ? "was" : "were";
    const base = `${itemCount} item${itemCount === 1 ? "" : "s"} ${verb} skipped because they are unavailable or out of stock.`;
    return preview ? `${base} ${preview}${suffix}` : base;
  };

  const buildAdjustedNote = (items: ReorderAdjustment[]) => {
    if (!items.length) return "";
    const details = items.map((item) => {
      const name = item.productName ?? item.productId ?? "Unknown product";
      return `${name} (${item.available} of ${item.requested} available)`;
    });
    const uniqueDetails = Array.from(new Set(details.filter(Boolean)));
    const preview = uniqueDetails.slice(0, 2).join(", ");
    const suffix = uniqueDetails.length > 2 ? "..." : "";
    const base = "Some quantities were adjusted to match available stock.";
    return preview ? `${base} ${preview}${suffix}` : base;
  };

  const resolveReorderItems = (products: OrderProductItem[]) => {
    const requestItems: Array<{
      productId: string;
      quantity: number;
      productName?: string;
      productSlug?: string;
    }> = [];
    const skippedItems: ReorderSkippedItem[] = [];
    const adjustedItems: ReorderAdjustment[] = [];

    products.forEach(({ product, quantity }) => {
      const requested =
        typeof quantity === "number" && quantity > 0 ? quantity : 1;

      if (!product?._id) {
        skippedItems.push({
          productName: product?.name ?? "Unknown product",
          reason: "Product unavailable",
        });
        return;
      }

      const stock = typeof product.stock === "number" ? product.stock : null;
      if (typeof stock === "number" && Number.isFinite(stock)) {
        if (stock <= 0) {
          skippedItems.push({
            productId: product._id,
            productName: product.name ?? "Unknown product",
            reason: "Out of stock",
          });
          return;
        }

        if (requested > stock) {
          adjustedItems.push({
            productId: product._id,
            productName: product.name ?? "Unknown product",
            requested,
            available: stock,
          });
          if (stock > 0) {
            requestItems.push({
              productId: product._id,
              quantity: stock,
              productName: product.name ?? undefined,
              productSlug: product.slug?.current ?? undefined,
            });
          }
          return;
        }
      }

      requestItems.push({
        productId: product._id,
        quantity: requested,
        productName: product.name ?? undefined,
        productSlug: product.slug?.current ?? undefined,
      });
    });

    return { requestItems, skippedItems, adjustedItems };
  };

  const handleReorder = async () => {
    if (!currentOrder.products?.length) {
      toast.error("This order has no items to reorder.");
      return;
    }

    const hadExistingItems = cartItemsInStore.length > 0;

    const { requestItems, skippedItems, adjustedItems } =
      resolveReorderItems(currentOrder.products);

    if (!requestItems.length) {
      const unavailableNote = buildUnavailableNote(skippedItems);
      const adjustedNote = buildAdjustedNote(adjustedItems);

      if (unavailableNote) {
        toast.warning("Some items were skipped.", {
          description: unavailableNote,
        });
      }

      if (adjustedNote) {
        toast.warning("Limited stock detected.", {
          description: adjustedNote,
        });
      }

      toast.error("No available items to reorder.", {
        description: "These items are no longer available.",
      });
      return;
    }

    setIsReordering(true);
    try {
      const response = await apiReorder({ items: requestItems });
      syncCartSnapshot(response);

      const combinedSkippedItems = [
        ...skippedItems,
        ...response.skippedItems,
      ];
      const addedCount = response.addedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const unavailableNote = buildUnavailableNote(combinedSkippedItems);
      const adjustedNote = buildAdjustedNote(adjustedItems);

      if (unavailableNote) {
        toast.warning("Some items were skipped.", {
          description: unavailableNote,
        });
      }

      if (adjustedNote) {
        toast.warning("Limited stock detected.", {
          description: adjustedNote,
        });
      }

      if (addedCount === 0) {
        toast.error("No available items to reorder.", {
          description: "These items are no longer available.",
        });
        return;
      }

      if (hadExistingItems) {
        toast.info("Cart already has items.", {
          description: "Review your cart for duplicates.",
        });
      }

      const itemLabel = addedCount === 1 ? "item" : "items";
      toast.success(`${addedCount} ${itemLabel} added to cart.`, {
        description: "Redirecting to cart...",
      });

      setTimeout(() => {
        router.push("/cart");
      }, 800);
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to reorder items. Please try again.");
    } finally {
      setIsReordering(false);
    }
  };

  const handleAcceptQuotation = async () => {
    if (!currentOrder._id) {
      toast.error("Unable to accept quotation: missing order ID.");
      return;
    }

    const hasItems = currentOrder.products?.some(({ product }) =>
      Boolean(product)
    );
    if (!hasItems) {
      toast.error("Unable to accept quotation. Items are unavailable.");
      return;
    }

    setIsAcceptingQuotation(true);
    try {
      const nextUrl = `/checkout?orderId=${currentOrder._id}&step=payment`;
      toast.success("Proceeding to checkout...");

      setTimeout(() => {
        router.push(nextUrl);
      }, 800);
    } catch (error) {
      console.error("Error accepting quotation:", error);
      toast.error("Failed to accept quotation. Please try again.");
    } finally {
      setIsAcceptingQuotation(false);
    }
  };

  const handleUpdateQuotationDetails = async (values: AddressFormValues) => {
    if (!currentOrder._id) {
      toast.error("Unable to update quotation details.");
      return;
    }

    setIsUpdatingQuotationDetails(true);
    try {
      const payload: Partial<AddressFormValues> = { ...values };
      delete payload.customerCode;
      const response = await fetch(
        `/api/orders/${currentOrder._id}/quotation-details`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quotationDetails: payload,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update quotation details."
        );
      }

      const nextAddress = data?.quotationDetails ?? values;
      setCurrentOrder((prev) => ({
        ...prev,
        quotationDetails: nextAddress,
      }));
      toast.success("Quotation details updated.");
      setShowQuotationDetailsDialog(false);
    } catch (error) {
      console.error("Failed to update quotation details:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update quotation details."
      );
    } finally {
      setIsUpdatingQuotationDetails(false);
    }
  };

  const handleUpdateShippingDetails = async (values: AddressFormValues) => {
    if (!currentOrder._id) {
      toast.error("Unable to update shipping address.");
      return;
    }

    setIsUpdatingShippingDetails(true);
    try {
      const payload: Partial<AddressFormValues> = { ...values };
      delete payload.customerCode;
      const response = await fetch(
        `/api/orders/${currentOrder._id}/shipping-details`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: payload,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update shipping address."
        );
      }

      const nextAddress = data?.address ?? values;
      setCurrentOrder((prev) => ({
        ...prev,
        address: nextAddress,
      }));
      toast.success("Shipping address updated.");
      setShowShippingDetailsDialog(false);
    } catch (error) {
      console.error("Failed to update shipping address:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update shipping address."
      );
    } finally {
      setIsUpdatingShippingDetails(false);
    }
  };

  const handleOpenPaymentMethodDialog = () => {
    const isValidMethod = Object.values(PAYMENT_METHODS).includes(
      currentOrder.paymentMethod as PaymentMethod
    );
    const resolvedMethod = isValidMethod
      ? (currentOrder.paymentMethod as PaymentMethod)
      : PAYMENT_METHODS.STRIPE;
    let defaultMethod = resolvedMethod;

    if (defaultMethod === PAYMENT_METHODS.CREDIT && !canSelectCreditPayment) {
      defaultMethod = PAYMENT_METHODS.STRIPE;
    }

    if (defaultMethod === PAYMENT_METHODS.CLERK && !isDealerAccount) {
      defaultMethod = PAYMENT_METHODS.STRIPE;
    }

    setNextPaymentMethod(defaultMethod);
    setShowPaymentMethodDialog(true);
  };

  const handleChangePaymentMethod = async () => {
    if (!currentOrder._id) {
      toast.error("Unable to update payment method.");
      return;
    }

    setIsUpdatingPaymentMethod(true);
    try {
      const response = await fetch(
        `/api/orders/${currentOrder._id}/payment-method`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentMethod: nextPaymentMethod }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update payment method.");
      }

      setCurrentOrder((prev) => ({
        ...prev,
        paymentMethod: data?.paymentMethod || nextPaymentMethod,
        paymentStatus: data?.paymentStatus || PAYMENT_STATUSES.PENDING,
      }));

      toast.success("Payment method updated.");
      setShowPaymentMethodDialog(false);

      if (nextPaymentMethod === PAYMENT_METHODS.STRIPE) {
        setTimeout(() => {
          router.push(`/checkout?orderId=${currentOrder._id}&step=payment`);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to update payment method:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update payment method."
      );
    } finally {
      setIsUpdatingPaymentMethod(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!currentOrder._id) {
      toast.error("Unable to generate invoice: missing order ID.");
      return;
    }

    setGeneratingInvoice(true);
    try {
      const response = await fetch(
        `/api/orders/${currentOrder._id}/generate-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || "Invoice generated successfully!");
        // Update the current order with the new invoice data
        setCurrentOrder((prev) => ({
          ...prev,
          invoice: data.invoice,
        }));
      } else {
        console.error("Invoice generation failed:", data);
        const errorMessage = data.error || "Failed to generate invoice";
        const details = data.details ? ` Details: ${data.details}` : "";
        toast.error(errorMessage + details);
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      toast.error(
        "Network error: Failed to generate invoice. Please try again."
      );
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleInvoiceAction = async () => {
    if (generatingInvoice) {
      return;
    }

    if (hasInvoiceUrl) {
      if (!invoiceDownloadUrl) {
        toast.error("Invoice URL is not available yet.");
        return;
      }
      openPdf(invoiceDownloadUrl);
      return;
    }

    await handleGenerateInvoice();
  };

  const handleGeneratePurchaseOrder = async () => {
    if (!legacyQuotesEnabled) {
      return;
    }

    if (!currentOrder._id) {
      toast.error("Unable to generate quotation: missing order ID.");
      return;
    }

    setGeneratingPurchaseOrder(true);
    try {
      const response = await fetch(
        `/api/orders/${currentOrder._id}/purchase-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        const purchaseOrderNumber =
          data.purchaseOrderNumber || data.purchaseOrder?.number;
        const purchaseOrderCreatedAt =
          data.purchaseOrder?.createdAt || new Date().toISOString();

        setCurrentOrder((prev) => ({
          ...prev,
          purchaseOrder: purchaseOrderNumber
            ? {
                number: purchaseOrderNumber,
                createdAt: purchaseOrderCreatedAt,
              }
            : prev.purchaseOrder,
        }));

        const pdfUrl = data?.pdfUrl ?? undefined;
        const pdfDownloadUrl = data?.pdfDownloadUrl ?? undefined;
        const actionUrl = pdfUrl ?? pdfDownloadUrl;

        setQuotationDelivery({
          pdfUrl,
          pdfDownloadUrl,
          emailSent: data?.emailSent,
          emailError: data?.emailError,
        });

        if (actionUrl) {
          toast.success(
            "Quotation ready! Check your email or download the PDF.",
            {
              action: {
                label: "Download PDF",
                onClick: () => openPdf(actionUrl),
              },
            }
          );
        } else {
          toast.success("Quotation ready! Check your email or download the PDF.");
        }
      } else {
        console.error("Quotation generation failed:", data);
        const errorMessage = data.error || "Failed to generate quotation";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Quotation generation error:", error);
      toast.error("Network error: Failed to generate quotation");
    } finally {
      setGeneratingPurchaseOrder(false);
    }
  };

  const handleQuotationAction = async () => {
    if (!legacyQuotesEnabled) {
      return;
    }

    if (generatingPurchaseOrder) {
      return;
    }

    if (hasLegacyQuotation) {
      if (!quotationActionUrl) {
        toast.error("Quotation PDF is not available yet.");
        return;
      }
      openPdf(quotationActionUrl);
      return;
    }

    await handleGeneratePurchaseOrder();
  };

  const handleRequestUpdatedQuotation = async () => {
    if (!newQuotesEnabled) {
      return;
    }

    if (!currentOrder._id) {
      toast.error("Unable to request quotation: missing order ID.");
      return;
    }

    setGeneratingPurchaseOrder(true);
    try {
      const response = await fetch(
        `/api/orders/${currentOrder._id}/purchase-order?forceNewVersion=1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ forceNewVersion: true }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to generate quotation."
        );
      }

      const downloadUrl = data?.pdfDownloadUrl ?? data?.pdfUrl;
      if (downloadUrl) {
        toast.success("Quotation updated.", {
          action: {
            label: "Download PDF",
            onClick: () => openPdf(downloadUrl),
          },
        });
      } else {
        toast.success("Quotation updated.");
      }

      try {
        const refreshResponse = await fetch(
          `/api/orders/${currentOrder._id}/quotations`
        );
        if (refreshResponse.ok) {
          const refreshed = await refreshResponse.json();
          setQuotations(
            Array.isArray(refreshed?.quotations)
              ? refreshed.quotations
              : []
          );
        }
      } catch (refreshError) {
        console.error("Failed to refresh quotations:", refreshError);
      }

      setCurrentOrder((prev) => ({
        ...prev,
        status: ORDER_STATUSES.QUOTATION_REQUESTED,
        quotationRequestedAt:
          prev.quotationRequestedAt ?? new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Quotation request failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate quotation."
      );
    } finally {
      setGeneratingPurchaseOrder(false);
    }
  };

  const handleSelectQuotation = async (quoteId: string) => {
    if (!currentOrder._id) {
      toast.error("Unable to confirm quotation: missing order ID.");
      return;
    }

    if (!canSelectQuotation) {
      toast.error("Quotation selection is locked after checkout.");
      return;
    }

    setSelectingQuotationId(quoteId);
    try {
      const response = await fetch(
        `/api/orders/${currentOrder._id}/select-quotation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quoteId }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to select quotation.");
      }

      const selectedQuotation =
        data?.selectedQuotation ??
        sortedQuotations.find((quote) => quote._id === quoteId) ??
        null;
      const selectedQuotationAt =
        data?.selectedQuotationAt ?? new Date().toISOString();

      setCurrentOrder((prev) => ({
        ...prev,
        selectedQuotation:
          selectedQuotation ??
          (quoteId
            ? {
                _id: quoteId,
              }
            : null),
        selectedQuotationAt,
      }));

      toast.success("Quotation confirmed.");
    } catch (error) {
      console.error("Quotation selection failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to confirm quotation."
      );
    } finally {
      setSelectingQuotationId(null);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const resolvedReason =
        cancellationReason.trim() ||
        selectedCancellationReason ||
        "Cancelled by customer";

      if (isQuotation) {
        const response = await fetch(
          `/api/orders/${currentOrder._id}/cancel-quotation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason: resolvedReason }),
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Failed to cancel quotation."
          );
        }

        toast.success("Quotation cancelled.", {
          description: data?.message || undefined,
        });
        setCurrentOrder((prev) => ({
          ...prev,
          status: ORDER_STATUSES.CANCELLED,
          paymentStatus: PAYMENT_STATUSES.CANCELLED,
          cancelledAt: new Date().toISOString(),
          cancellationRequested: false,
        }));
        setShowCancelDialog(false);
        setCancellationReason("");
        setSelectedCancellationReason(null);
        router.refresh();
        return;
      }

      const result = await requestOrderCancellation(
        currentOrder._id,
        resolvedReason
      );

      if (result.success) {
        toast.success("Your order has been canceled", {
          description: result.message,
        });
        // Update the current order to show cancellation request pending
        setCurrentOrder(
          (prev) => ({
            ...prev,
            cancellationRequested: true,
            cancellationRequestedAt: new Date().toISOString(),
            cancellationRequestReason: resolvedReason,
          })
        );
        setShowCancelDialog(false);
        setCancellationReason("");
        setSelectedCancellationReason(null);

        // Refresh the page to show updated status
        router.refresh();
      } else {
        toast.error(result.message || "Failed to submit cancellation request");
      }
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      toast.error(
        "An error occurred while submitting the cancellation request"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Check if order can be cancelled (before order is confirmed)
  const canCancelOrder = () => {
    const cancellableStatuses = [
      "pending",
      "address_confirmed",
      ORDER_STATUSES.QUOTATION_REQUESTED,
    ];
    return (
      cancellableStatuses.includes(currentOrder.status) &&
      currentOrder.status !== "cancelled" &&
      !currentOrder.cancellationRequested
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <DynamicBreadcrumb
        customItems={[
          { label: "Orders", href: "/user/orders" },
          { label: breadcrumbOrderLabel },
        ]}
      />
      {statusMessage && (
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}
      {/* Header */}
      <div className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-semibold uppercase tracking-wide">
                {isQuotation ? "Quotation" : "Order"}
              </span>
              {isQuotation && (
                <Badge className="bg-blue-100 text-blue-800">Quotation</Badge>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 break-all sm:text-2xl sm:break-words">
                  Order #{currentOrder.orderNumber}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <CalendarDays className="w-4 h-4" />
                  {format(new Date(currentOrder.orderDate), "PPP")}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <OrderStatusBadge status={currentOrder.status} />
                {cancellationPending && (
                  <Badge className="bg-amber-50 text-amber-700">
                    Cancellation Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="md:hidden">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Quick Actions
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {isQuotation ? (
                  <Button
                    onClick={handleAcceptQuotation}
                    disabled={isAcceptingQuotation}
                    className="h-12"
                  >
                    {isAcceptingQuotation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparing Checkout...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Proceed to Checkout
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleReorder}
                    disabled={
                      isReordering || (currentOrder.products?.length ?? 0) === 0
                    }
                    className="h-12"
                  >
                    {isReordering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding to Cart...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Reorder
                      </>
                    )}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 w-full justify-between"
                    >
                      More actions
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {isQuotation ? (
                      <DropdownMenuItem
                        onSelect={() => {
                          if (!isReordering) {
                            void handleReorder();
                          }
                        }}
                        disabled={
                          isReordering || (currentOrder.products?.length ?? 0) === 0
                        }
                      >
                        {isReordering ? "Adding to cart..." : "Reorder"}
                      </DropdownMenuItem>
                    ) : null}
                    {canCancelOrder() ? (
                      <DropdownMenuItem
                        onSelect={() => setShowCancelDialog(true)}
                        disabled={isCancelling || cancellationPending}
                        className="text-red-600 focus:text-red-600"
                      >
                        {isCancelling
                          ? "Submitting cancellation..."
                          : cancellationPending
                            ? "Cancellation Pending"
                            : cancelOrderLabel}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push("/user/orders")}>
                      Back to Orders
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {hasDocuments ? (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Documents
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {canShowQuotationAction ? (
                    <Button
                      onClick={() => void handleQuotationAction()}
                      disabled={generatingPurchaseOrder}
                      variant="outline"
                      className="h-11"
                    >
                      {generatingPurchaseOrder ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          {quotationActionLabel}
                        </>
                      )}
                    </Button>
                  ) : null}
                  {canShowInvoiceAction ? (
                    <Button
                      onClick={() => void handleInvoiceAction()}
                      disabled={!hasInvoiceUrl && generatingInvoice}
                      variant="outline"
                      className="h-11"
                    >
                      {generatingInvoice && !hasInvoiceUrl ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          {invoiceActionLabel}
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="hidden md:block">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Purchase Actions
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {isQuotation && (
                  <Button
                    onClick={handleAcceptQuotation}
                    disabled={isAcceptingQuotation}
                    className="h-11"
                  >
                    {isAcceptingQuotation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparing Checkout...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Proceed to Checkout
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleReorder}
                  disabled={
                    isReordering || (currentOrder.products?.length ?? 0) === 0
                  }
                  variant="outline"
                  className="h-11"
                >
                  {isReordering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding to Cart...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Reorder
                    </>
                  )}
                </Button>
                {canCancelOrder() && (
                  <Button
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isCancelling || cancellationPending}
                    variant="destructive"
                    className="h-11"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : cancellationPending ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        Cancellation Pending
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        {cancelOrderLabel}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <Button asChild variant="ghost" className="h-11 px-4">
                <Link href="/user/orders">Back to Orders</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {legacyQuotesEnabled && quotationDelivery && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-medium text-blue-900">Quotation ready</p>
                <p className="text-xs text-blue-700">
                  Download the PDF or check your email for a copy.
                </p>
                {quotationDelivery.emailSent === false &&
                  quotationDelivery.emailError && (
                    <p className="mt-2 text-xs text-amber-700">
                      Email not sent: {quotationDelivery.emailError}
                    </p>
                  )}
              </div>
              {legacyQuotationDownloadUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="h-11 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <a
                    href={legacyQuotationDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download PDF
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cancellation Request Notice */}
          {currentOrder.cancellationRequested &&
            currentOrder.status !== "cancelled" && (
            <Card className="border-brand-red-accent/30 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-brand-red-accent flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Cancellation Requested
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-brand-red-accent">
                  {currentOrder.cancellationRequestedAt
                    ? `Cancellation requested on ${format(
                        new Date(currentOrder.cancellationRequestedAt),
                        "MMM dd, yyyy 'at' h:mm a"
                      )}. We will notify you once it's processed.`
                    : "Cancellation requested. We will notify you once it's processed."}
                </p>
                {currentOrder.cancellationRequestReason && (
                  <p className="text-xs text-brand-red-accent mt-1">
                    Reason: {currentOrder.cancellationRequestReason}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {creditNotice && (
            <Card
              className={cn(
                "border",
                creditNotice.tone === "pending" &&
                  "border-amber-200 bg-amber-50",
                creditNotice.tone === "approved" &&
                  "border-emerald-200 bg-emerald-50",
                creditNotice.tone === "rejected" &&
                  "border-red-200 bg-red-50"
              )}
            >
              <CardHeader>
                <CardTitle
                  className={cn(
                    "flex items-center gap-2",
                    creditNotice.tone === "pending" && "text-amber-900",
                    creditNotice.tone === "approved" && "text-emerald-900",
                    creditNotice.tone === "rejected" && "text-red-900"
                  )}
                >
                  {creditNotice.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p
                  className={cn(
                    "text-sm",
                    creditNotice.tone === "pending" && "text-amber-800",
                    creditNotice.tone === "approved" && "text-emerald-800",
                    creditNotice.tone === "rejected" && "text-red-800"
                  )}
                >
                  {creditNotice.description}
                </p>
                {hasSalesContact && (
                  <div className="rounded-md border border-white/60 bg-white/70 p-3 text-xs text-gray-700">
                    <p className="font-semibold text-gray-900">
                      Sales Contact
                    </p>
                    <p>{currentOrder.salesContact?.name || "Sales team"}</p>
                    {salesContactDetails.map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Status</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={currentOrder.status} />
                    {cancellationPending && (
                      <Badge className="bg-amber-50 text-amber-700">
                        Cancellation Pending
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <Badge
                    className={`${getPaymentStatusColor(
                      paymentStatusDisplay.status
                    )} mt-1 flex items-center gap-1 w-fit`}
                  >
                    {getPaymentStatusIcon(paymentStatusDisplay.status)}
                    {paymentStatusDisplay.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium capitalize flex items-center gap-2">
                    <PaymentMethodIcon className="w-4 h-4" />
                    {paymentMethodLabel}
                  </p>
                  {canChangePaymentMethod && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenPaymentMethodDialog}
                      className="mt-2"
                    >
                      Change Payment Method
                    </Button>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    {format(new Date(currentOrder.orderDate), "PPP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {showQuotationCard ? (
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    Quotations
                    {quotations.length > 0 && (
                      <Badge variant="secondary">{quotations.length}</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Request an updated quotation if your details change.
                  </p>
                  {selectedQuotationLabel ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-success-highlight/40 bg-success-highlight/10 px-3 py-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-success-base" />
                      <span className="font-medium text-foreground">
                        Confirmed
                      </span>
                      <span className="text-foreground">
                        {selectedQuotationLabel}
                        {selectedQuotationVersionLabel
                          ? ` ${selectedQuotationVersionLabel}`
                          : ""}
                      </span>
                      {selectedQuotationAtLabel && (
                        <span className="text-muted-foreground">
                          on {selectedQuotationAtLabel}
                        </span>
                      )}
                    </div>
                  ) : null}
                  {(isQuotation || sortedQuotations.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {quotationFlowSteps.map((step, index) => {
                        const dateLabel = step.date
                          ? format(new Date(step.date), "MMM d")
                          : null;
                        return (
                          <React.Fragment key={step.key}>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  step.done
                                    ? "bg-success-base"
                                    : "bg-muted-foreground/30"
                                )}
                              />
                              <span
                                className={cn(
                                  step.done
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {step.label}
                              </span>
                              {dateLabel && (
                                <span className="text-muted-foreground">
                                  ({dateLabel})
                                </span>
                              )}
                            </div>
                            {index < quotationFlowSteps.length - 1 && (
                              <span className="text-muted-foreground/50">
                                &gt;
                              </span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
                {canRequestUpdatedQuotation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRequestUpdatedQuotation()}
                    disabled={generatingPurchaseOrder}
                    className="sm:self-start"
                  >
                    {generatingPurchaseOrder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Request Updated Quotation
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {sortedQuotations.length > 0 ? (
                  <ul className="space-y-4">
                    {sortedQuotations.map((quotation) => {
                      const createdAtLabel = quotation.createdAt
                        ? format(new Date(quotation.createdAt), "PPP")
                        : "Unknown date";
                      const numberLabel = quotation.number?.trim();
                      const versionLabel =
                        quotation.version && quotation.version > 1
                          ? `Version ${quotation.version}`
                          : null;
                      const title = numberLabel
                        ? `Quotation ${numberLabel}`
                        : "Quotation";
                      const isLatest = quotation._id === latestQuotationId;
                      const isSelected =
                        quotation._id === selectedQuotationId;
                      const isSelecting =
                        selectingQuotationId === quotation._id;
                      const emailStatusLabel = quotation.emailSentAt
                        ? "Emailed"
                        : "Email pending";
                      const emailDetailLabel = quotation.emailSentAt
                        ? `Sent ${format(new Date(quotation.emailSentAt), "PPP")}`
                        : "Not sent yet";
                      const previewLink = `/api/orders/${currentOrder._id}/purchase-order?pdf=1&quoteId=${quotation._id}`;
                      const downloadLink =
                        quotation.pdfUrl?.trim() ||
                        `/api/orders/${currentOrder._id}/purchase-order?pdf=1&download=1&quoteId=${quotation._id}`;

                      return (
                        <li
                          key={quotation._id}
                          className={cn(
                            "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
                            isSelected
                              ? "border-success-highlight/50 bg-success-highlight/10"
                              : "border-border/70"
                          )}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-foreground">
                                  {title}
                                </p>
                                {versionLabel && (
                                  <Badge variant="outline">{versionLabel}</Badge>
                                )}
                                {isLatest && (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground"
                                  >
                                    Latest
                                  </Badge>
                                )}
                                {isSelected && (
                                  <Badge className="bg-success-highlight text-success-base">
                                    Confirmed
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={
                                    quotation.emailSentAt
                                      ? "border-success-highlight bg-success-highlight text-success-base"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {emailStatusLabel}
                                </Badge>
                              </div>
                              <dl className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                                <div>
                                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Created
                                  </dt>
                                  <dd className="font-medium text-foreground">
                                    {createdAtLabel}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Email
                                  </dt>
                                  <dd className="font-medium text-foreground">
                                    {emailDetailLabel}
                                  </dd>
                                </div>
                                {isSelected && selectedQuotationAtLabel && (
                                  <div>
                                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Confirmed
                                    </dt>
                                    <dd className="font-medium text-foreground">
                                      {selectedQuotationAtLabel}
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:justify-start">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openPdf(previewLink)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Preview PDF
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPdf(downloadLink)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                              </Button>
                              {canSelectQuotation && (
                                <Button
                                  variant={isSelected ? "secondary" : "outline"}
                                  size="sm"
                                  disabled={isSelected || Boolean(selectingQuotationId)}
                                  onClick={() =>
                                    void handleSelectQuotation(quotation._id)
                                  }
                                >
                                  {isSelecting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Confirming...
                                    </>
                                  ) : isSelected ? (
                                    "Confirmed"
                                  ) : (
                                    "Confirm Quotation"
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No quotations generated yet.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Order Timeline */}
          {!isQuotation && <OrderTimeline order={currentOrder} />}

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items ({currentOrder.products.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentOrder.products?.map(
                  (
                    item: {
                      product?: {
                        _id: string;
                        name?: string;
                        slug?: { current: string };
                        image?: { asset: { url: string } };
                        images?: Array<{ asset?: { url?: string } }>;
                        price?: number;
                        currency?: string;
                        categories?: Array<{ title: string }>;
                      } | null;
                      quantity: number;
                      priceOptionLabel?: string | null;
                      priceOptionId?: string | null;
                    },
                    index: number
                  ) => {
                    const productHref = item.product ? buildProductPath(item.product) : "/products";
                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                      >
                        {!item.product ? (
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700">
                              Product no longer available
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        ) : (
                          <>
                            {item.product.image && (
                              <div className="relative w-16 h-16 shrink-0">
                                <Image
                                  src={urlFor(item.product.image).url()}
                                  alt={item.product.name || "Product"}
                                  fill
                                  className="object-cover rounded-md"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 break-words sm:line-clamp-2">
                                <Link
                                  href={productHref}
                                  className="hover:text-brand-black-strong transition-colors"
                                >
                                  {item.product.name || "Unknown product"}
                                </Link>
                              </h3>
                            {item.product.categories && (
                              <p className="text-sm text-gray-500 mt-1">
                                {item.product.categories
                                  .map((cat) => cat.title)
                                  .join(", ")}
                              </p>
                            )}
                            {item.priceOptionLabel ? (
                              <p className="text-xs text-gray-500 mt-1">
                                Price: {item.priceOptionLabel}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <span className="text-sm text-gray-600">
                                Qty: {item.quantity}
                              </span>
                              <PriceFormatter
                                amount={(item as { unitPrice?: number }).unitPrice ?? item.product?.price ?? 0}
                                className="font-medium"
                              />
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <PriceFormatter
                              amount={
                                (item as { lineTotal?: number }).lineTotal ??
                                ((item as { unitPrice?: number }).unitPrice ?? item.product?.price ?? 0) *
                                  item.quantity
                              }
                              className="font-medium text-base sm:text-lg"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                }
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary & Address */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal</span>
                  <PriceFormatter amount={currentOrder.subtotal} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax</span>
                  <PriceFormatter amount={currentOrder.tax} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Shipping</span>
                  <PriceFormatter amount={currentOrder.shipping} />
                </div>
                {currentOrder.amountDiscount > 0 && (
                  <div className="flex justify-between text-success-base">
                    <span>Discount</span>
                    <span>
                      -<PriceFormatter amount={currentOrder.amountDiscount} />
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <PriceFormatter amount={currentOrder.totalPrice} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </CardTitle>
              {isQuotation && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShippingDetailsDialog(true)}
                >
                  Edit Address
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p className="font-medium">{currentOrder.address.name}</p>
                <p className="text-gray-700">
                  {currentOrder.address.address}
                  {currentOrder.address.subArea
                    ? `, ${currentOrder.address.subArea}`
                    : ""}
                </p>
                <p className="text-gray-700">
                  {currentOrder.address.city}, {currentOrder.address.state}{" "}
                  {currentOrder.address.zip}
                </p>
                {currentOrder.address.country && (
                  <p className="text-gray-700">{currentOrder.address.country}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {isQuotation && (
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Quotation Details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Review and update the details used on your quotation.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuotationDetailsDialog(true)}
                >
                  Edit Details
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Contact Name
                    </p>
                    <p className="font-medium">
                      {quotationDetails?.name ||
                        currentOrder.customerName ||
                        "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Branch
                    </p>
                    <p className="font-medium">
                      {quotationDetails?.branch || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {quotationDetails?.phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fax</p>
                    <p className="font-medium">
                      {quotationDetails?.fax || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Line</p>
                    <p className="font-medium">
                      {quotationDetails?.lineId || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">
                      {quotationDetails?.company || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Customer Code
                    </p>
                    <p className="font-medium">
                      {quotationDetails?.customerCode || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">WIN Code</p>
                    <p className="font-medium">
                      {quotationDetails?.winCode || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tax ID</p>
                    <p className="font-medium">
                      {quotationDetails?.taxId || "-"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {quotationAddressLine || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      City / State / ZIP
                    </p>
                    <p className="font-medium">
                      {quotationRegionLine || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="font-medium">
                      {quotationDetails?.country || "-"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Contact Email
                    </p>
                    <p className="font-medium break-words">
                      {quotationContactEmail || "-"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="font-medium">
                      {currentOrder.salesContact?.name || "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div>
                  <p className="font-medium">{currentOrder.customerName}</p>
                  <p className="text-gray-700">{currentOrder.email}</p>
                </div>
                {currentOrder.paymentCompletedAt && (
                  <div className="pt-2 border-t">
                    <p className="text-gray-600">Payment Completed</p>
                    <p className="font-medium">
                      {format(new Date(currentOrder.paymentCompletedAt), "PPp")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quotation Details Dialog */}
      <Dialog
        open={showQuotationDetailsDialog}
        onOpenChange={setShowQuotationDetailsDialog}
      >
        <DialogContent className="max-w-3xl">
          <div className="space-y-1">
            <DialogTitle>Quotation Details</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update the contact and company details for your quotation.
            </p>
          </div>
          <AddressForm
            initialValues={{
              ...quotationDetails,
              email:
                quotationDetails?.email ||
                currentOrder.email ||
                quotationDetails?.contactEmail ||
                "",
            }}
            defaultContactEmail={quotationContactEmail}
            onSubmit={handleUpdateQuotationDetails}
            onCancel={() => setShowQuotationDetailsDialog(false)}
            submitLabel="Save Details"
            cancelLabel="Cancel"
            isSubmitting={isUpdatingQuotationDetails}
            showDefaultToggle={false}
            showLineIdField={true}
          />
        </DialogContent>
      </Dialog>

      {/* Shipping Address Dialog */}
      <Dialog
        open={showShippingDetailsDialog}
        onOpenChange={setShowShippingDetailsDialog}
      >
        <DialogContent className="max-w-3xl">
          <div className="space-y-1">
            <DialogTitle>Shipping Address</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update the shipping address for this order.
            </p>
          </div>
          <AddressForm
            initialValues={{
              ...currentOrder.address,
              email:
                currentOrder.address.email ||
                currentOrder.email ||
                "",
            }}
            defaultContactEmail={shippingContactEmail}
            onSubmit={handleUpdateShippingDetails}
            onCancel={() => setShowShippingDetailsDialog(false)}
            submitLabel="Save Address"
            cancelLabel="Cancel"
            isSubmitting={isUpdatingShippingDetails}
            showDefaultToggle={false}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPaymentMethodDialog}
        onOpenChange={setShowPaymentMethodDialog}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change payment method</DialogTitle>
            <DialogDescription>
              Select a new payment method to continue your order.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={nextPaymentMethod}
            onValueChange={(value) =>
              setNextPaymentMethod(value as PaymentMethod)
            }
            className="space-y-3"
          >
            <Label
              htmlFor="change-payment-stripe"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
            >
              <RadioGroupItem
                value={PAYMENT_METHODS.STRIPE}
                id="change-payment-stripe"
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <CreditCard className="w-4 h-4" />
                  Credit/Debit Card
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pay securely with your card via Stripe
                </p>
              </div>
            </Label>

            <Label
              htmlFor="change-payment-cod"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
            >
              <RadioGroupItem
                value={PAYMENT_METHODS.CASH_ON_DELIVERY}
                id="change-payment-cod"
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Wallet className="w-4 h-4" />
                  Cash on Delivery
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pay when your order is delivered
                </p>
              </div>
            </Label>

            {canSelectCreditPayment && (
              <Label
                htmlFor="change-payment-credit"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
              >
                <RadioGroupItem
                  value={PAYMENT_METHODS.CREDIT}
                  id="change-payment-credit"
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <BadgeDollarSign className="w-4 h-4" />
                    Credit Payment (Request Approval)
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submit a credit request and we&apos;ll review it with our team
                  </p>
                </div>
              </Label>
            )}

            {isDealerAccount && (
              <Label
                htmlFor="change-payment-clerk"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
              >
                <RadioGroupItem
                  value={PAYMENT_METHODS.CLERK}
                  id="change-payment-clerk"
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <FileText className="w-4 h-4" />
                    Invoice (Clerk)
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Receive an invoice and pay within 30 days
                  </p>
                </div>
              </Label>
            )}
          </RadioGroup>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowPaymentMethodDialog(false)}
              className="h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePaymentMethod}
              disabled={isUpdatingPaymentMethod}
              className="h-11"
            >
              {isUpdatingPaymentMethod ? "Updating..." : "Update Payment Method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-md max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border bg-background p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
            )}
          >
            <VisuallyHidden.Root>
              <DialogTitle>{cancelDialogTitle}</DialogTitle>
            </VisuallyHidden.Root>
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-4 border-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {cancelOrderLabel}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {cancelDialogDescription}
                </p>
                <p className="text-xs text-gray-500">
                  {cancelDialogNote}
                </p>

                <div className="mt-4 text-left space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Common reasons (optional)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CANCELLATION_REASONS.map((reason) => {
                        const isSelected =
                          selectedCancellationReason === reason;
                        return (
                          <Button
                            key={reason}
                            type="button"
                            variant={isSelected ? "destructive" : "outline"}
                            size="sm"
                            aria-pressed={isSelected}
                            className="h-11 px-3"
                            onClick={() => {
                              setSelectedCancellationReason(reason);
                              setCancellationReason(reason);
                            }}
                          >
                            {reason}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="cancellationReason"
                      className="mb-2 block text-sm font-medium text-foreground"
                    >
                      Additional details (optional)
                    </Label>
                    <Textarea
                      id="cancellationReason"
                      value={cancellationReason}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCancellationReason(value);
                        if (
                          selectedCancellationReason &&
                          value.trim() !== selectedCancellationReason
                        ) {
                          setSelectedCancellationReason(null);
                        }
                      }}
                      placeholder="Share any details that can help us improve."
                      className="resize-none"
                      aria-describedby="cancellationReasonHint"
                      rows={3}
                    />
                    <p
                      id="cancellationReasonHint"
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      Optional details help us improve future service.
                    </p>
                  </div>
                </div>

                {currentOrder.paymentStatus === "paid" && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        <Wallet className="h-5 w-5 text-blue-600 mt-0.5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-blue-900">
                          Refund Information
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          If approved, your payment of{" "}
                          <span className="font-bold">
                            <PriceFormatter amount={currentOrder.totalPrice} />
                          </span>{" "}
                          will be added to your wallet balance.
                        </p>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                          <li>Use it for future orders</li>
                          <li>Request withdrawal anytime</li>
                          <li>View balance in your dashboard</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancellationReason("");
                  setSelectedCancellationReason(null);
                }}
                disabled={isCancelling}
                className="flex-1 h-11"
              >
                {isQuotation ? "Keep Quotation" : "Keep Order"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 h-11 font-semibold"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isQuotation ? "Cancelling..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    {cancelOrderLabel}
                  </>
                )}
              </Button>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default OrderDetailsPage;
