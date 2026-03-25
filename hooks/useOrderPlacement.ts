"use client";

import { useCallback, useState } from "react";
import useCartStore, { CartItem } from "@/store";
import { PAYMENT_METHODS, PaymentMethod } from "@/lib/orderStatus";
import { toast } from "sonner";
import { OrderConfirmationData } from "@/lib/emailService";
import type { Address } from "@/lib/address";

// Extended interface for email preparation that can handle Sanity images
interface EmailOrderItem {
  name: string;
  price: number;
  quantity: number;
  image?: any; // Can be string URL or Sanity image object
}

interface EmailOrderData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderDate: string;
  items: EmailOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  estimatedDelivery?: string;
}

interface UseOrderPlacementProps {
  user: {
    id?: string;
    emailAddresses: Array<{ emailAddress: string }>;
  } | null;
}

interface OrderPlacementOptions {
  skipEmail?: boolean;
  suppressRedirect?: boolean;
  suppressSuccessToast?: boolean;
  successMessage?: string;
  successDescription?: string;
  orderKind?: "order" | "quotation";
  quotationDetails?: Address;
  salesContactId?: string;
  forceNewVersion?: boolean;
}

interface QuotationResult {
  quotationId?: string;
  purchaseOrderNumber?: string;
  pdfUrl?: string;
  pdfDownloadUrl?: string;
  emailSent?: boolean;
  emailError?: string;
}

interface PlaceOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  redirectTo?: string;
  isCheckoutRedirect?: boolean;
  isStripeRedirect?: boolean;
  isInvoice?: boolean;
  isCOD?: boolean;
  paymentSetupFailed?: boolean;
  quotation?: QuotationResult;
  error?: string;
}

export function useOrderPlacement({ user }: UseOrderPlacementProps) {
  const {
    items: cart,
    getTotalPrice,
    getSubTotalPrice,
    resetCart,
    isPlacingOrder,
    orderStep,
    setOrderPlacementState,
    refreshSegment,
  } = useCartStore();

  const triggerSegmentRefresh = useCallback(() => {
    refreshSegment()
      .catch((error) =>
        console.error("Segment refresh after purchase failed:", error)
      );
  }, [refreshSegment]);

  const buildQuotationRequest = (forceNewVersion?: boolean): RequestInit => {
    if (forceNewVersion) {
      return {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceNewVersion: true }),
      };
    }
    return { method: "POST" };
  };

  const placeOrder = async (
    selectedAddress: Address,
    selectedPaymentMethod: PaymentMethod,
    subtotal: number,
    shipping: number,
    tax: number,
    total: number,
    redirectToCheckout: boolean = false,
    options?: OrderPlacementOptions
  ): Promise<PlaceOrderResult> => {
    if (!selectedAddress) {
      toast.error("Address Required", {
        description: "Please select a shipping address",
        duration: 4000,
      });
      return { success: false };
    }

    if (cart.length === 0) {
      toast.error("Cart is empty", {
        description: "Add some products to your cart first",
        duration: 4000,
      });
      return { success: false };
    }

    // Create a snapshot of the cart before any modifications
    const cartSnapshot: CartItem[] = JSON.parse(JSON.stringify(cart));

    // Check stock availability
    const outOfStockItems = cartSnapshot.filter(
      (item) => typeof item.product.stock === "number" && item.product.stock === 0
    );
    if (outOfStockItems.length > 0) {
      const outOfStockNames = outOfStockItems
        .map((item) => item.product?.name || item.productName || "Item")
        .filter(Boolean);
      toast.error("Insufficient Stock", {
        description: `${outOfStockNames.join(", ")} ${
          outOfStockNames.length > 1 ? "are" : "is"
        } out of stock`,
        duration: 5000,
      });
      return { success: false };
    }

    // Check if any item quantity exceeds available stock
    const insufficientStockItems = cartSnapshot.filter(
      (item) =>
        typeof item.product.stock === "number" &&
        item.quantity > item.product.stock
    );
    if (insufficientStockItems.length > 0) {
      const insufficientNames = insufficientStockItems
        .map((item) => item.product?.name || item.productName || "Item")
        .filter(Boolean);
      toast.error("Stock Limit Exceeded", {
        description: `${insufficientNames.join(", ")} ${
          insufficientNames.length > 1 ? "have" : "has"
        } insufficient stock`,
        duration: 5000,
      });
      return { success: false };
    }

    setOrderPlacementState(true, "validating");

    try {
      // Step 1: Validate and prepare order data
      setOrderPlacementState(true, "creating");

      const amountDiscount = cartSnapshot.reduce((sum, item) => {
        const unitPrice =
          typeof item.unitPrice === "number"
            ? item.unitPrice
            : item.product.price ?? 0;
        const lineTotal =
          typeof item.lineTotal === "number"
            ? item.lineTotal
            : unitPrice * item.quantity;
        const lineDiscount = Math.max(0, unitPrice * item.quantity - lineTotal);
        return sum + lineDiscount;
      }, 0);

      const isClerkPayment = selectedPaymentMethod === PAYMENT_METHODS.CLERK;
      const isQuotationRequest = options?.orderKind === "quotation";
      const resolvedOrderKind =
        options?.orderKind ?? (isClerkPayment ? "quotation" : "order");
      const shouldSkipEmail =
        options?.skipEmail ?? (isClerkPayment || isQuotationRequest);

      const orderData = {
        items: cartSnapshot,
        shippingAddress: selectedAddress,
        paymentMethod: selectedPaymentMethod,
        totalAmount: total,
        subtotal,
        shipping,
        tax,
        amountDiscount,
        orderKind: resolvedOrderKind,
        ...(options?.quotationDetails && {
          quotationDetails: options.quotationDetails,
        }),
        ...(options?.salesContactId && {
          salesContactId: options.salesContactId,
        }),
      };

      // Create order in Sanity first (without email sending)
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const orderResult = await orderResponse.json();
      const orderId = orderResult.order._id;
      const orderNumber = orderResult.order.orderNumber;

      // Step 2: Send confirmation email
      setOrderPlacementState(true, "emailing");

      if (!shouldSkipEmail) {
        const emailData: EmailOrderData = {
          customerName: "Customer", // Will be filled from order data in API
          customerEmail: user?.emailAddresses[0]?.emailAddress || "",
          orderId: orderNumber,
          orderDate: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          items: cartSnapshot.map((item) => ({
            name: item.priceOptionLabel
              ? `${item.product.name || "Unknown Product"} (${item.priceOptionLabel})`
              : item.product.name || "Unknown Product",
            price: item.unitPrice ?? item.product.price ?? 0,
            quantity: item.quantity,
            image: item.product.images?.[0] || undefined,
          })),
          subtotal,
          shipping,
          tax,
          total,
          shippingAddress: {
            name: selectedAddress.name,
            street: selectedAddress.address,
            city: selectedAddress.city,
            state: selectedAddress.state,
            zipCode: selectedAddress.zip,
            country: selectedAddress.country || "United States",
          },
          estimatedDelivery: (() => {
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + 5);
            return deliveryDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          })(),
        };

        // Send email via separate API
        try {
          const emailResponse = await fetch("/api/orders/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderData: emailData }),
          });

          if (emailResponse.ok) {
            console.log("Order confirmation email sent successfully");
          } else {
            console.error("Failed to send email, but order was created");
          }
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
          // Don't fail the order if email fails
        }
      }

      // Step 3: Prepare for redirect (don't clear cart yet)
      setOrderPlacementState(true, "redirecting");

      triggerSegmentRefresh();

      if (isQuotationRequest) {
        const quotationResponse = await fetch(
          `/api/orders/${orderId}/purchase-order`,
          buildQuotationRequest(options?.forceNewVersion)
        );
        const quotationData = await quotationResponse.json();

        if (!quotationResponse.ok) {
          throw new Error(quotationData?.error || "Failed to create quotation");
        }

        const quotationResult: QuotationResult = {
          quotationId: quotationData?.quotationId,
          purchaseOrderNumber:
            quotationData?.purchaseOrderNumber ??
            quotationData?.purchaseOrder?.number,
          pdfUrl: quotationData?.pdfUrl,
          pdfDownloadUrl: quotationData?.pdfDownloadUrl,
          emailSent: quotationData?.emailSent,
          emailError: quotationData?.emailError,
        };

        return { success: true, orderId, orderNumber, quotation: quotationResult };
      }

      if (options?.suppressRedirect) {
        return { success: true, orderId, orderNumber };
      }

      if (selectedPaymentMethod === PAYMENT_METHODS.STRIPE) {
        if (redirectToCheckout) {
          // For "Proceed to Checkout" - redirect to checkout page with order details
          if (!options?.suppressSuccessToast) {
            toast.success("Order Created! Redirecting to Checkout 🛒", {
              description: "Taking you to the checkout page...",
              duration: 3000,
            });
          }
          return {
            success: true,
            orderId,
            orderNumber,
            redirectTo: `/checkout?orderId=${orderId}&orderNumber=${orderNumber}`,
            isCheckoutRedirect: true,
          };
        } else {
          // For "Place Order" - create Stripe session and redirect to payment
          const stripeResponse = await fetch("/api/checkout/stripe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              orderNumber,
              items: cartSnapshot,
              email: user?.emailAddresses[0]?.emailAddress,
              shippingAddress: selectedAddress,
              orderAmount: total,
            }),
          });

          if (!stripeResponse.ok) {
            toast.error(
              "Order created but payment setup failed. Check your orders."
            );
            return {
              success: true,
              orderId,
              orderNumber,
              redirectTo: `/user/orders`,
              paymentSetupFailed: true,
            };
          }

          const stripeResult = await stripeResponse.json();

          const redirectTo = stripeResult.redirectTo ?? stripeResult.url;
          if (redirectTo) {
            if (!options?.suppressSuccessToast) {
              toast.success("Redirecting to Payment...", {
                duration: 3000,
              });
            }
            return {
              success: true,
              orderId,
              orderNumber,
              redirectTo,
              isStripeRedirect: true,
            };
          } else {
            toast.error("Payment Setup Failed", {
              description:
                "Order created but payment setup failed. Check your orders.",
              duration: 5000,
            });
            return {
              success: true,
              orderId,
              orderNumber,
              redirectTo: `/user/orders`,
              paymentSetupFailed: true,
            };
          }
        }
      } else if (selectedPaymentMethod === PAYMENT_METHODS.CLERK) {
        try {
          await fetch(
            `/api/orders/${orderId}/purchase-order`,
            buildQuotationRequest(options?.forceNewVersion)
          );
        } catch (quotationError) {
          console.error(
            "Failed to generate quotation for clerk order:",
            quotationError
          );
        }

        if (!options?.suppressSuccessToast) {
          toast.success("Order placed", {
            description:
              "Invoice will be sent shortly. Redirecting to your order details...",
            duration: 4000,
          });
        }
        return {
          success: true,
          orderId,
          orderNumber,
          redirectTo: `/user/orders/${orderId}`,
          isInvoice: true,
        };
      } else if (selectedPaymentMethod === PAYMENT_METHODS.CREDIT) {
        if (!options?.suppressSuccessToast) {
          toast.success("Credit request submitted", {
            description:
              "We'll review your request and update you shortly. Redirecting to your order details...",
            duration: 4000,
          });
        }
        return {
          success: true,
          orderId,
          orderNumber,
          redirectTo: `/user/orders/${orderId}`,
        };
      } else {
        if (redirectToCheckout) {
          // For "Proceed to Checkout" with COD - redirect to checkout page
          if (!options?.suppressSuccessToast) {
            toast.success("Order Created! Redirecting to Checkout 🛒", {
              description: "Taking you to the checkout page...",
              duration: 3000,
            });
          }
          return {
            success: true,
            orderId,
            orderNumber,
            redirectTo: `/checkout?orderId=${orderId}&orderNumber=${orderNumber}&payment_method=cod`,
            isCheckoutRedirect: true,
          };
        } else {
          // For "Place Order" with COD - redirect to order details
          if (!options?.suppressSuccessToast) {
            toast.success("Order confirmed", {
              description:
                "You'll pay upon delivery. Redirecting to your order details...",
              duration: 4000,
            });
          }
          return {
            success: true,
            orderId,
            orderNumber,
            redirectTo: `/user/orders/${orderId}`,
            isCOD: true,
          };
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Order placement error:", error);
      toast.error("Order Failed", {
        description: errorMessage || "Please try again",
        duration: 5000,
      });
      // Reset state on error
      setOrderPlacementState(false, "validating");
      return { success: false, error: errorMessage };
    }
  };

  return {
    placeOrder,
    isPlacingOrder,
    orderStep,
    cartSnapshot: cart,
  };
}
