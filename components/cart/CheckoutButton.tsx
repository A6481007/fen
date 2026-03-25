"use client";

import "@/app/i18n";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ShieldCheck, ShoppingBag } from "lucide-react";
import useCartStore, { CartItem } from "@/store";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useOrderPlacement } from "@/hooks/useOrderPlacement";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/orderStatus";
import { trackCheckoutStarted } from "@/lib/analytics";
import { apiClearCart } from "@/lib/cart/client";
import {
  NEW_QUOTE_FEATURE,
  REQUEST_QUOTE_FROM_CART_ENABLED,
} from "@/lib/featureFlags";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Address } from "@/lib/address";
import { OrderPlacementOverlay } from "./OrderPlacementSkeleton";
import { useTranslation } from "react-i18next";

interface CheckoutButtonProps {
  cart: CartItem[];
  selectedAddress: Address | null;
  quotationDetails?: Address | null;
  selectedQuotationDetails?: Address | null;
  salesContactId?: string | null;
  selectedPaymentMethod?: PaymentMethod;
  orderTotals?: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
}

export function CheckoutButton({
  cart,
  selectedAddress,
  quotationDetails,
  selectedQuotationDetails,
  salesContactId,
  selectedPaymentMethod,
  orderTotals,
}: CheckoutButtonProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { resetCart, setOrderPlacementState } = useCartStore();
  const { placeOrder, isPlacingOrder, orderStep } = useOrderPlacement({
    user: user ? { emailAddresses: user.emailAddresses } : null,
  });
  const router = useRouter();
  const [actionType, setActionType] = useState<
    "checkout" | "po" | "order" | null
  >(null);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [quotationResult, setQuotationResult] = useState<{
    purchaseOrderNumber?: string;
    pdfUrl?: string;
    pdfDownloadUrl?: string;
    emailSent?: boolean;
    emailError?: string;
  } | null>(null);
  const openPdf = (url: string) => {
    const nextWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!nextWindow) {
      window.location.assign(url);
    }
  };
  const newQuotesEnabled = NEW_QUOTE_FEATURE;
  const canRequestQuotation =
    newQuotesEnabled && REQUEST_QUOTE_FROM_CART_ENABLED;

  const handleCheckout = async () => {
    if (!selectedAddress) {
      toast.error(t("client.cart.checkout.errors.selectAddress"));
      return;
    }

    // Check stock status
    const outOfStockItems = cart.filter(
      (item) => typeof item.product.stock === "number" && item.product.stock === 0
    );
    const insufficientStockItems = cart.filter(
      (item) =>
        typeof item.product.stock === "number" &&
        item.quantity > item.product.stock
    );
    if (outOfStockItems.length > 0 || insufficientStockItems.length > 0) {
      toast.error(t("client.cart.checkout.errors.stockIssue"));
      return;
    }

    // Set loading state for checkout button
    setActionType("checkout");

    // Track checkout started
    const cartValue = cart.reduce(
      (sum, item) =>
        sum + (item.unitPrice ?? item.product.price ?? 0) * item.quantity,
      0
    );
    trackCheckoutStarted({
      userId: user?.id,
      cartValue,
      itemCount: cart.length,
    });

    // Redirect with loading effect
    const addressId = selectedAddress?._id;
    const quotationAddressId = selectedQuotationDetails?._id;
    const params = new URLSearchParams();
    if (addressId) {
      params.set("addressId", addressId);
    }
    if (quotationAddressId && quotationAddressId !== addressId) {
      params.set("quotationAddressId", quotationAddressId);
    }
    if (salesContactId) {
      params.set("salesContactId", salesContactId);
    }
    if (selectedPaymentMethod) {
      params.set("paymentMethod", selectedPaymentMethod);
    }
    const query = params.toString();
    window.location.href = query ? `/checkout?${query}` : "/checkout";
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error(t("client.cart.checkout.errors.selectAddress"));
      return;
    }

    if (hasStockIssues) {
      toast.error(t("client.cart.checkout.errors.stockIssue"));
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error(t("client.cart.checkout.errors.selectPayment"));
      return;
    }

    if (!orderTotals) {
      toast.error(t("client.cart.checkout.errors.totals"));
      return;
    }

    setActionType("order");

    try {
      const result = await placeOrder(
        selectedAddress,
        selectedPaymentMethod,
        orderTotals.subtotal,
        orderTotals.shipping,
        orderTotals.tax,
        orderTotals.total,
        false,
        {
          quotationDetails: quotationDetails ?? undefined,
          salesContactId: salesContactId ?? undefined,
        }
      );

      if (result?.success && result.redirectTo) {
        setTimeout(() => {
          void apiClearCart({ keepalive: true }).catch((error) => {
            console.error("Failed to clear cart after order:", error);
          });
          resetCart();
          window.location.href = result.redirectTo!;
        }, 1000);
        return;
      }

      setOrderPlacementState(false, "validating");
    } catch (error) {
      console.error("Order placement failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.cart.checkout.errors.placeOrder")
      );
      setOrderPlacementState(false, "validating");
    } finally {
      setActionType(null);
    }
  };

  const handleRequestQuotation = () => {
    if (!canRequestQuotation) {
      toast.error(t("client.cart.checkout.errors.quoteUnavailable"));
      return;
    }

    if (!selectedAddress) {
      toast.error(t("client.cart.checkout.errors.selectAddress"));
      return;
    }

    if (hasStockIssues) {
      toast.error(t("client.cart.checkout.errors.stockIssue"));
      return;
    }

    if (cart.length === 0) {
      toast.error(t("client.cart.checkout.errors.empty"));
      return;
    }

    setShowQuotationDialog(true);
  };

  const handleConfirmQuotation = async () => {
    if (!canRequestQuotation) {
      toast.error(t("client.cart.checkout.errors.quoteUnavailable"));
      setShowQuotationDialog(false);
      return;
    }

    if (!selectedAddress) {
      toast.error(t("client.cart.checkout.errors.selectAddress"));
      setShowQuotationDialog(false);
      return;
    }

    setShowQuotationDialog(false);

    if (!orderTotals) {
      toast.error(t("client.cart.checkout.errors.totals"));
      return;
    }

    setActionType("po");
    setQuotationResult(null);

    try {
      const result = await placeOrder(
        selectedAddress,
        PAYMENT_METHODS.CASH_ON_DELIVERY,
        orderTotals.subtotal,
        orderTotals.shipping,
        orderTotals.tax,
        orderTotals.total,
        false,
        {
          skipEmail: true,
          suppressRedirect: true,
          suppressSuccessToast: true,
          orderKind: "quotation",
          quotationDetails: quotationDetails ?? undefined,
          salesContactId: salesContactId ?? undefined,
        }
      );

      if (result?.success && result.orderId) {
        try {
          await apiClearCart({ keepalive: true });
        } catch (error) {
          console.error("Failed to clear cart after quotation:", error);
        }
        resetCart();

        const orderId = result.orderId;
        const quotation = result.quotation;
        if (!quotation) {
          toast.success(t("client.cart.checkout.quoteRequested"));
          router.push(`/user/orders/${orderId}`);
          return;
        }

        const pdfUrl = quotation.pdfUrl ?? undefined;
        const pdfDownloadUrl = quotation.pdfDownloadUrl ?? undefined;
        const activeUrl = pdfDownloadUrl ?? pdfUrl;

        setQuotationResult({
          purchaseOrderNumber: quotation.purchaseOrderNumber,
          pdfUrl,
          pdfDownloadUrl,
          emailSent: quotation.emailSent,
          emailError: quotation.emailError,
        });

        if (activeUrl) {
          toast.success(t("client.cart.checkout.quoteReady"), {
            action: {
              label: t("client.cart.checkout.downloadPdf"),
              onClick: () => openPdf(activeUrl),
            },
          });
        } else {
          toast.success(t("client.cart.checkout.quoteReady"));
        }

        router.push(`/user/orders/${orderId}`);
      }
    } catch (error) {
      console.error("Quotation creation failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.cart.checkout.errors.createQuote")
      );
    } finally {
      setOrderPlacementState(false, "validating");
      setActionType(null);
    }
  };

  const hasOutOfStockItems = cart.some(
    (item) => typeof item.product.stock === "number" && item.product.stock === 0
  );
  const hasInsufficientStockItems = cart.some(
    (item) =>
      typeof item.product.stock === "number" &&
      item.quantity > item.product.stock
  );
  const hasStockIssues = hasOutOfStockItems || hasInsufficientStockItems;
  const quotationDownloadUrl =
    quotationResult?.pdfDownloadUrl ?? quotationResult?.pdfUrl;
  const statusMessage =
    actionType === "checkout"
      ? t("client.cart.checkout.status.redirecting")
      : actionType === "order" && isPlacingOrder
        ? t("client.cart.checkout.status.placingOrder")
        : actionType === "po" && isPlacingOrder
          ? t("client.cart.checkout.status.creatingQuote")
          : null;

  return (
    <>
      {statusMessage && (
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}
      {/* Show overlay skeleton only for quotation action */}
      {isPlacingOrder && (actionType === "po" || actionType === "order") && (
        <div className="fixed inset-0 z-50">
          <OrderPlacementOverlay step={orderStep} isCheckoutRedirect={false} />
        </div>
      )}

      <div className="space-y-4 pb-16 sm:pb-0">
        {hasStockIssues && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              {t("client.cart.checkout.errors.stockIssue")}
            </p>
          </div>
        )}

        {!selectedAddress && (
          <div className="p-3 bg-orange-50 border border-brand-red-accent/20 rounded-md">
            <p className="text-sm text-brand-red-accent">
              {t("client.cart.checkout.errors.selectAddressContinue")}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() =>
              selectedPaymentMethod === PAYMENT_METHODS.STRIPE
                ? handleCheckout()
                : handlePlaceOrder()
            }
            disabled={
              isPlacingOrder ||
              actionType === "checkout" ||
              actionType === "order" ||
              hasStockIssues ||
              !selectedAddress ||
              cart.length === 0
            }
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {actionType === "checkout" || actionType === "order" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {selectedPaymentMethod === PAYMENT_METHODS.STRIPE
                  ? t("client.cart.checkout.status.redirecting")
                  : t("client.cart.checkout.status.addingOrder")}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {selectedPaymentMethod === PAYMENT_METHODS.STRIPE
                  ? t("client.cart.checkout.cta.checkout")
                  : t("client.cart.checkout.cta.addToOrder")}
              </div>
            )}
          </Button>

          {canRequestQuotation && (
            <Button
              onClick={handleRequestQuotation}
              disabled={
                isPlacingOrder ||
                actionType === "po" ||
                hasStockIssues ||
                !selectedAddress ||
                cart.length === 0
              }
              variant="outline"
              className="w-full h-11 text-sm font-medium"
            >
              {isPlacingOrder && actionType === "po" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("client.cart.checkout.status.creatingQuote")}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("client.cart.checkout.cta.requestQuote")}
                </div>
              )}
            </Button>
          )}
        </div>

        {canRequestQuotation && quotationResult && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
            <p className="font-medium text-green-800">
              {t("client.cart.checkout.quoteReady")}
            </p>
            <p className="text-xs text-green-700">
              {t("client.cart.checkout.quoteReadyHint")}
            </p>
            {quotationDownloadUrl && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="mt-2 h-11 border-green-200 text-green-700 hover:bg-green-100"
              >
                <a
                  href={quotationDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("client.cart.checkout.downloadPdf")}
                </a>
              </Button>
            )}
            {quotationResult.emailSent === false && quotationResult.emailError && (
              <p className="mt-2 text-xs text-amber-700">
                {t("client.cart.checkout.emailNotSent", {
                  error: quotationResult.emailError,
                })}
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
          {selectedPaymentMethod === PAYMENT_METHODS.STRIPE ? (
            <>
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {t("client.cart.checkout.securityStripeTitle")}
              </div>
              <p className="mt-1">
                {t("client.cart.checkout.securityStripeDescription")}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {t("client.cart.checkout.securityLaterTitle")}
              </div>
              <p className="mt-1">
                {t("client.cart.checkout.securityLaterDescription")}
              </p>
            </>
          )}
        </div>
      </div>

      {canRequestQuotation && (
        <Dialog
          open={showQuotationDialog}
          onOpenChange={setShowQuotationDialog}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("client.cart.checkout.quoteDialog.title")}
              </DialogTitle>
              <DialogDescription asChild className="space-y-2">
                <div>
                  <p>
                    {t("client.cart.checkout.quoteDialog.description")}
                  </p>
                  <p>{t("client.cart.checkout.quoteDialog.note")}</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowQuotationDialog(false)}
                className="h-11"
              >
                {t("client.cart.checkout.quoteDialog.cancel")}
              </Button>
              <Button
                onClick={handleConfirmQuotation}
                disabled={isPlacingOrder}
                className="h-11"
              >
                {t("client.cart.checkout.quoteDialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
