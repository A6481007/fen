"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CreditCard, X, ExternalLink } from "lucide-react";
import PriceFormatter from "./PriceFormatter";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  orderTotal?: number;
  orderNumber?: string;
  onPaymentSuccess?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
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
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-300">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Confirm Payment
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Order Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 animate-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Order Number</span>
              <span className="font-medium">
                #{orderNumber?.slice(-10) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Amount</span>
              <PriceFormatter
                amount={orderTotal}
                className="font-semibold text-lg"
              />
            </div>
          </div>

          {/* Payment Info */}
          <div className="text-center text-sm text-gray-600 animate-in slide-in-from-bottom-2 duration-200 delay-100">
            <p className="flex items-center justify-center gap-1">
              <ExternalLink className="w-4 h-4" />
              You&apos;ll be redirected to secure checkout
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-200 delay-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 transition-all duration-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
