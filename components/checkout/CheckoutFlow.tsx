"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import CheckoutBreadcrumb from "@/components/checkout/CheckoutBreadcrumb";
import {
  CheckoutContent,
  type CheckoutOrder,
  type CheckoutStep,
} from "@/components/checkout/CheckoutContent";
import { ORDER_STATUSES } from "@/lib/orderStatus";

interface CheckoutFlowProps {
  order?: CheckoutOrder | null;
}

const CheckoutFlow = ({ order }: CheckoutFlowProps) => {
  const isQuotationCheckout =
    order?.orderKind === "quotation" ||
    order?.status === ORDER_STATUSES.QUOTATION_REQUESTED;
  const [activeStep, setActiveStep] = useState<CheckoutStep>(
    isQuotationCheckout ? "payment" : "address"
  );
  const heading = isQuotationCheckout ? "Accept Quotation" : "Checkout";
  const primaryCta = isQuotationCheckout
    ? { href: "/user/orders", label: "Back to Orders" }
    : { href: "/cart", label: "Back to Cart" };
  const secondaryCta = isQuotationCheckout
    ? { href: "/cart", label: "View Cart" }
    : { href: "/user/orders", label: "View Orders" };

  return (
    <>
      <CheckoutBreadcrumb activeStep={activeStep} className="mb-4 sm:mb-6" />

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
        <ShoppingBag className="w-6 h-6" aria-hidden="true" />
        <h1 className="text-xl font-bold sm:text-2xl">{heading}</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11">
          <Link href={primaryCta.href}>{primaryCta.label}</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
        </Button>
      </div>

      <CheckoutContent onActiveStepChange={setActiveStep} order={order} />
    </>
  );
};

export default CheckoutFlow;
