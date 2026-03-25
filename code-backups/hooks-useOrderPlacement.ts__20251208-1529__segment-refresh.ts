"use client";

import { useState } from "react";
import useCartStore, { CartItem } from "@/store";
import { PAYMENT_METHODS, PaymentMethod } from "@/lib/orderStatus";
import { toast } from "sonner";
import { OrderConfirmationData } from "@/lib/emailService";

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

interface Address {
  _id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  default: boolean;
  createdAt: string;
}

interface UseOrderPlacementProps {
  user: {
    id?: string;
    emailAddresses: Array<{ emailAddress: string }>;
  } | null;
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
  } = useCartStore();

  const placeOrder = async (
    selectedAddress: Address,
    selectedPaymentMethod: PaymentMethod,
    subtotal: number,
    shipping: number,
    tax: number,
    total: number,
    redirectToCheckout: boolean = false // New parameter to control redirect behavior
  ) => {
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
      (item) => item.product.stock === 0
    );
    if (outOfStockItems.length > 0) {
      toast.error("Insufficient Stock", {
        description: `${outOfStockItems.join(", ")} ${
          outOfStockItems.length > 1 ? "are" : "is"
        } out of stock`,
        duration: 5000,
      });
      return { success: false };
    }

    // Check if any item quantity exceeds available stock
    const insufficientStockItems = cartSnapshot.filter(
      (item) => item.quantity > (item.product.stock || 0)
    );
    if (insufficientStockItems.length > 0) {
      toast.error("Stock Limit Exceeded", {
        description: `${insufficientStockItems.join(", ")} ${
          insufficientStockItems.length > 1 ? "have" : "has"
        } insufficient stock`,
        duration: 5000,
      });
      return { success: false };
    }

    setOrderPlacementState(true, "validating");

    try {
      // Step 1: Validate and prepare order data
      setOrderPlacementState(true, "creating");

      const orderData = {
        items: cartSnapshot,
        shippingAddress: selectedAddress,
        paymentMethod: selectedPaymentMethod,
        totalAmount: total,
        subtotal,
        shipping,
        tax,
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
          name: item.product.name || "Unknown Product",
          price: item.product.price || 0,
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
          country: "United States",
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

      // Step 3: Prepare for redirect (don't clear cart yet)
      setOrderPlacementState(true, "redirecting");

      toast.success("Order Placed Successfully! 🎉", {
        description: "Confirmation email sent",
        duration: 4000,
      });

      if (selectedPaymentMethod === PAYMENT_METHODS.STRIPE) {
        if (redirectToCheckout) {
          // For "Proceed to Checkout" - redirect to checkout page with order details
          toast.success("Order Created! Redirecting to Checkout 🛒", {
            description: "Taking you to the checkout page...",
            duration: 3000,
          });
          return {
            success: true,
            orderId,
            orderNumber,
            redirectTo: `/checkout?order_id=${orderId}&orderNumber=${orderNumber}`,
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

          if (stripeResult.url) {
            toast.success("Redirecting to Payment 💳", {
              description: "Taking you to secure payment gateway...",
              duration: 3000,
            });
            return {
              success: true,
              orderId,
              orderNumber,
              redirectTo: stripeResult.url,
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
        // Handle Clerk payment
        const clerkResponse = await fetch("/api/checkout/clerk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            orderNumber,
            items: cartSnapshot,
            email: user?.emailAddresses[0]?.emailAddress,
            shippingAddress: selectedAddress,
            orderAmount: total,
            clerkUserId: user?.id,
          }),
        });

        if (!clerkResponse.ok) {
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

        const clerkResult = await clerkResponse.json();

        if (clerkResult.url) {
          toast.success("Processing Clerk Payment 💳", {
            description: "Processing your payment...",
            duration: 3000,
          });
          return {
            success: true,
            orderId,
            orderNumber,
            redirectTo: clerkResult.url,
            isClerkRedirect: true,
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
      } else {
        if (redirectToCheckout) {
          // For "Proceed to Checkout" with COD - redirect to checkout page
          toast.success("Order Created! Redirecting to Checkout 🛒", {
            description: "Taking you to the checkout page...",
            duration: 3000,
          });
          return {
            success: true,
            orderId,
            orderNumber,
            redirectTo: `/checkout?order_id=${orderId}&orderNumber=${orderNumber}&payment_method=cod`,
            isCheckoutRedirect: true,
          };
        } else {
          // For "Place Order" with COD - redirect to success page
          toast.success("Order Confirmed! 🚚", {
            description: "You'll pay upon delivery",
            duration: 4000,
          });
          return {
            success: true,
            orderId,
            orderNumber,
            redirectTo: `/success?order_id=${orderId}&orderNumber=${orderNumber}&payment_method=cod`,
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
