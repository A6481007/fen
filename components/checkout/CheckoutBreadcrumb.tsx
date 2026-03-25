"use client";

import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import type { CheckoutStep } from "@/components/checkout/CheckoutContent";

const CHECKOUT_STEPS = [
  { key: "cart", label: "Cart", href: "/cart" },
  { key: "address", label: "Address" },
  { key: "payment", label: "Payment" },
  { key: "review", label: "Review" },
] as const;

interface CheckoutBreadcrumbProps {
  activeStep: CheckoutStep;
  className?: string;
}

const CheckoutBreadcrumb = ({
  activeStep,
  className = "",
}: CheckoutBreadcrumbProps) => {
  const activeIndex = CHECKOUT_STEPS.findIndex(
    (step) => step.key === activeStep
  );
  const resolvedIndex = activeIndex === -1 ? 1 : activeIndex;

  const items = CHECKOUT_STEPS.map((step, index) => ({
    label: step.label,
    href: "href" in step ? step.href : "#",
    isActive: index === resolvedIndex,
    isComplete: index < resolvedIndex,
  }));

  return <DynamicBreadcrumb items={items} className={className} />;
};

export default CheckoutBreadcrumb;
