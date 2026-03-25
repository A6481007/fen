"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  X,
  ShieldCheck,
  Lock,
  Sparkles,
} from "lucide-react";
import PriceFormatter from "./PriceFormatter";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  orderNumber: string;
}

const DirectPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  orderNumber,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayNow = async () => {
    if (!orderId) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/pay-now`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process payment");
      }

      if (data.success && data.checkoutUrl) {
        // Redirect directly to Stripe Checkout
        toast.success("Redirecting to secure payment...");
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Payment initialization failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Payment failed";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 border-2 border-brand-black-strong/20 bg-white p-8 shadow-2xl duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "sm:rounded-2xl mx-4"
          )}
        >
          <VisuallyHidden.Root>
            <DialogTitle>Secure Payment</DialogTitle>
          </VisuallyHidden.Root>

          {/* Header with Icon */}
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-brand-black-strong to-brand-text-main shadow-lg ring-4 ring-brand-black-strong/10 animate-scale-in">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-brand-black-strong flex items-center justify-center gap-2">
                Secure Payment
                <Sparkles className="w-5 h-5 text-brand-red-accent animate-pulse" />
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Complete your payment securely with Stripe
              </p>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="relative p-6 bg-linear-to-br from-brand-border to-white rounded-xl border-2 border-brand-black-strong/10 shadow-md animate-fade-in">
            <div className="absolute -top-3 -right-3">
              <div className="flex items-center gap-1 bg-brand-text-main text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-brand-black-strong/10">
                <span className="text-sm font-medium text-gray-700">
                  Order Number
                </span>
                <span className="font-bold text-brand-black-strong bg-white px-4 py-1.5 rounded-full text-sm border-2 border-brand-black-strong/20 shadow-sm">
                  #{orderNumber?.slice(-8) || "N/A"}
                </span>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-700">
                    Total Amount
                  </span>
                  <PriceFormatter
                    amount={orderTotal}
                    className="text-3xl font-bold text-brand-black-strong"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 p-4 bg-brand-black-strong/5 rounded-lg border border-brand-black-strong/10 animate-fade-in">
            <Lock className="w-4 h-4 text-brand-black-strong" />
            <span className="text-sm text-brand-black-strong font-semibold">
              Protected by 256-bit SSL encryption
            </span>
          </div>

          {/* Payment Flow Steps */}
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500 animate-fade-in">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-brand-black-strong rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <span className="font-medium">Secure</span>
            </div>
            <div className="w-8 h-0.5 bg-brand-black-strong/30"></div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-brand-red-accent rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="font-medium">Pay</span>
            </div>
            <div className="w-8 h-0.5 bg-brand-black-strong/30"></div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-brand-text-main rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="flex-1 h-12 bg-linear-to-r from-brand-black-strong to-brand-text-main hover:from-brand-red-accent hover:to-brand-black-strong text-white font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Pay Securely Now</span>
                </div>
              )}
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400 border-t border-gray-100 pt-4 animate-fade-in">
            <div className="flex items-center gap-1">
              <span className="text-brand-text-main">🔒</span>
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-brand-red-accent">⚡</span>
              <span>Instant</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-brand-black-strong">🛡️</span>
              <span>Protected</span>
            </div>
          </div>

          {/* Close Button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-gray-100 focus:outline-hidden focus:ring-2 focus:ring-brand-black-strong focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4 text-gray-600" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default DirectPaymentModal;
