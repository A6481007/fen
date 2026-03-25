"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Truck,
  MapPin,
  Package,
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";
import PriceFormatter from "@/components/PriceFormatter";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { toast } from "sonner";
import { ORDER_STATUSES, PAYMENT_METHODS, PaymentMethod } from "@/lib/orderStatus";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Address } from "@/lib/address";

interface OrderProduct {
  product: {
    _id: string;
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images?: any[];
    price: number;
    currency: string;
  };
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  products: OrderProduct[];
  subtotal: number;
  tax: number;
  shipping: number;
  totalPrice: number;
  currency: string;
  address: Address;
  quotationDetails?: Address;
  status: string;
  paymentStatus: string;
  orderDate: string;
}

interface OrderCheckoutContentProps {
  order: Order;
}

export function OrderCheckoutContent({ order }: OrderCheckoutContentProps) {
  const { user, isLoaded } = useUser();
  const isQuotation = order.status === ORDER_STATUSES.QUOTATION_REQUESTED;
  const defaultPaymentMethod = isQuotation
    ? PAYMENT_METHODS.CASH_ON_DELIVERY
    : PAYMENT_METHODS.STRIPE;
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>(defaultPaymentMethod);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    isBusiness: boolean;
    businessStatus?: string;
    membershipType?: string;
  } | null>(null);
  const isInvoiceEligible = Boolean(
    userProfile?.isBusiness ||
      userProfile?.businessStatus === "active" ||
      userProfile?.membershipType === "business"
  );
  const shippingAddress = order.quotationDetails ?? order.address;
  const statusLabel = isQuotation
    ? "Quotation"
    : order.status?.replace(/_/g, " ") || "pending";
  const isStripePayment = selectedPaymentMethod === PAYMENT_METHODS.STRIPE;
  const isClerkPayment = selectedPaymentMethod === PAYMENT_METHODS.CLERK;
  const isCodPayment =
    selectedPaymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY;
  const normalizeValue = (value?: string) =>
    typeof value === "string" ? value.trim() : "";
  const addressLine = [shippingAddress?.address, shippingAddress?.subArea]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .join(", ");
  const regionLine = [
    shippingAddress?.city,
    shippingAddress?.state,
    shippingAddress?.zip,
  ]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .join(" ");
  const statusMessage = isProcessing
    ? isQuotation
      ? selectedPaymentMethod === PAYMENT_METHODS.CLERK
        ? "Submitting invoice request..."
        : selectedPaymentMethod === PAYMENT_METHODS.STRIPE
          ? "Redirecting to Stripe checkout..."
          : "Confirming your order..."
      : selectedPaymentMethod === PAYMENT_METHODS.STRIPE
        ? "Redirecting to Stripe checkout..."
        : "Confirming cash on delivery..."
    : null;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.emailAddresses?.[0]?.emailAddress) return;

      try {
        const response = await fetch("/api/user/status");
        if (response.ok) {
          const data = await response.json();
          const profile = data.userProfile;
          if (profile) {
            setUserProfile({
              isBusiness: Boolean(profile.isBusiness),
              businessStatus: profile.businessStatus ?? "none",
              membershipType: profile.membershipType ?? "standard",
            });
          } else {
            setUserProfile({
              isBusiness: false,
              businessStatus: "none",
              membershipType: "standard",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (user && isLoaded && isQuotation) {
      fetchUserProfile();
    }
  }, [user, isLoaded, isQuotation]);

  useEffect(() => {
    if (!isQuotation) return;
    if (!isInvoiceEligible && selectedPaymentMethod === PAYMENT_METHODS.CLERK) {
      setSelectedPaymentMethod(PAYMENT_METHODS.CASH_ON_DELIVERY);
    }
  }, [isInvoiceEligible, selectedPaymentMethod, isQuotation]);

  const handlePayNow = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/orders/${order._id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create payment session");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCODPayment = async () => {
    setIsProcessing(true);

    try {
      // Here you could implement COD logic if needed
      // For now, just show a message
      toast.success("Order confirmed with Cash on Delivery payment method");

      setTimeout(() => {
        window.location.href = `/user/orders/${order._id}`;
      }, 1500);
    } catch (error) {
      console.error("COD payment error:", error);
      toast.error("Failed to process COD payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptQuotation = async () => {
    if (
      selectedPaymentMethod === PAYMENT_METHODS.CLERK &&
      !isInvoiceEligible
    ) {
      toast.error("Invoice payment is available for dealer accounts only.");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/orders/${order._id}/accept-quotation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentMethod: selectedPaymentMethod }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to accept quotation");
      }

      if (selectedPaymentMethod === PAYMENT_METHODS.STRIPE) {
        const paymentResponse = await fetch(`/api/orders/${order._id}/pay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const paymentData = await paymentResponse.json();

        if (paymentResponse.ok && paymentData.success && paymentData.url) {
          window.location.href = paymentData.url;
          return;
        }

        throw new Error(
          paymentData?.error || "Failed to create payment session"
        );
      }

      toast.success(
        selectedPaymentMethod === PAYMENT_METHODS.CLERK
          ? "Order confirmed. We'll send your invoice shortly."
          : "Order confirmed. Redirecting to your order..."
      );
      setTimeout(() => {
        window.location.href = `/user/orders/${order._id}`;
      }, 1200);
    } catch (error) {
      console.error("Quotation acceptance error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to accept quotation"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (isQuotation) {
      await handleAcceptQuotation();
      return;
    }

    if (selectedPaymentMethod === PAYMENT_METHODS.STRIPE) {
      await handlePayNow();
      return;
    }

    await handleCODPayment();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {statusMessage && (
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}
      {/* Order Details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Order Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order #{order.orderNumber?.slice(-8)}
              </CardTitle>
              <Badge variant="outline" className="capitalize">
                {statusLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-muted-foreground">{order.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Order Date</p>
                <p className="font-medium">
                  {new Date(order.orderDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {isQuotation ? "Quotation Address" : "Shipping Address"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{shippingAddress?.name}</p>
              <p className="text-muted-foreground">{addressLine || "-"}</p>
              <p className="text-muted-foreground">{regionLine || "-"}</p>
              {isQuotation && (
                <p className="text-xs text-muted-foreground">
                  Address confirmed from your quotation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedPaymentMethod}
              onValueChange={(value) =>
                setSelectedPaymentMethod(value as PaymentMethod)
              }
              className="space-y-3"
            >
              <Label
                htmlFor="order-checkout-stripe"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
              >
                <RadioGroupItem
                  value={PAYMENT_METHODS.STRIPE}
                  id="order-checkout-stripe"
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <CreditCard className="w-4 h-4" />
                    Credit/Debit Card
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pay securely with your credit or debit card via Stripe
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="order-checkout-cod"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
              >
                <RadioGroupItem
                  value={PAYMENT_METHODS.CASH_ON_DELIVERY}
                  id="order-checkout-cod"
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Truck className="w-4 h-4" />
                    Cash on Delivery
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pay when your order is delivered to your doorstep
                  </p>
                </div>
              </Label>
              {isQuotation && isInvoiceEligible && (
                <Label
                  htmlFor="order-checkout-clerk"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
                >
                  <RadioGroupItem
                    value={PAYMENT_METHODS.CLERK}
                    id="order-checkout-clerk"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="w-4 h-4" />
                      Invoice (Clerk)
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Receive an invoice and pay via bank transfer
                    </p>
                  </div>
                </Label>
              )}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items ({order.products.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.products.map((item, index) => (
              <div key={index} className="flex gap-3 p-3 border rounded-lg">
                <div className="w-16 h-16 flex-shrink-0">
                  <Image
                    src={
                      item.product.images?.[0]
                        ? urlFor(item.product.images[0]).url()
                        : "/placeholder.jpg"
                    }
                    alt={item.product.name || "Product"}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.product.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    <PriceFormatter
                      amount={
                        typeof item.lineTotal === "number"
                          ? item.lineTotal
                          : (item.unitPrice ?? item.product.price) * item.quantity
                      }
                    />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <PriceFormatter amount={item.unitPrice ?? item.product.price} />{" "}
                    each
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Order Summary & Actions */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal ({order.products.length} items)</span>
              <PriceFormatter amount={order.subtotal} />
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              {order.shipping === 0 ? (
                <span className="text-success-base font-medium">Free</span>
              ) : (
                <PriceFormatter amount={order.shipping} />
              )}
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <PriceFormatter amount={order.tax} />
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <PriceFormatter amount={order.totalPrice} />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => void handlePrimaryAction()}
          disabled={isProcessing}
          className="w-full text-lg font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isStripePayment ? (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay <PriceFormatter amount={order.totalPrice} />
                </>
              ) : isClerkPayment ? (
                <>
                  <FileText className="w-5 h-5" />
                  {isQuotation
                    ? "Confirm Order & Request Invoice"
                    : "Request Invoice"}
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  {isQuotation ? "Confirm Order" : "Confirm COD Order"}
                </>
              )}
            </div>
          )}
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link href="/user/orders" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          {isStripePayment ? (
            <>
              <p>🔒 Secure payment powered by Stripe</p>
              <p>Your payment information is encrypted and secure</p>
            </>
          ) : isClerkPayment ? (
            <>
              <p>🧾 Invoice will be sent after confirmation</p>
              <p>Follow the payment instructions within 30 days</p>
            </>
          ) : isCodPayment ? (
            <>
              <p>💵 Pay when your order arrives</p>
              <p>Cash payment to delivery agent</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
