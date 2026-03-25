"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  MapPin,
  ShoppingBag,
  Loader2,
  Wallet,
  FileText,
  Plus,
  BadgeDollarSign,
} from "lucide-react";
import useCartStore, { CartItem } from "@/store";
import PriceFormatter from "@/components/PriceFormatter";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { toast } from "sonner";
import { ORDER_STATUSES, PAYMENT_METHODS, PaymentMethod } from "@/lib/orderStatus";
import { REQUEST_QUOTE_FROM_CART_ENABLED } from "@/lib/featureFlags";
import { AddressForm, AddressFormValues } from "@/components/addresses/AddressForm";
import { useOrderPlacement } from "@/hooks/useOrderPlacement";
import { CheckoutSkeleton } from "@/components/checkout/CheckoutSkeleton";
import { OrderPlacementOverlay } from "@/components/cart/OrderPlacementSkeleton";
import { cn } from "@/lib/utils";
import { useCartAbandonmentSync } from "@/hooks/useCartAbandonmentSync";
import { AppliedPromotionBadge } from "@/components/cart/AppliedPromotionBadge";
import { apiClearCart } from "@/lib/cart/client";
import {
  buildDiscountBreakdown,
  buildPromotionSummaries,
} from "@/lib/cart/discountBreakdown";
import { useTaxRate } from "@/lib/hooks/useTaxRate";
import { usePricingSettings } from "@/lib/hooks/usePricingSettings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Address } from "@/lib/address";

export type CheckoutStep = "address" | "payment" | "review";

interface CheckoutOrderProduct {
  product?: {
    _id: string;
    name?: string;
    slug?: { current: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images?: any[];
    price?: number;
    stock?: number | null;
  } | null;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  discountAmount?: number;
  priceOptionId?: string | null;
  priceOptionLabel?: string | null;
  promotionName?: string | null;
  promotionType?: string | null;
  promotionId?: string | null;
}

export interface CheckoutOrder {
  _id: string;
  orderNumber?: string;
  orderKind?: "order" | "quotation";
  status?: string;
  paymentMethod?: PaymentMethod;
  products: CheckoutOrderProduct[];
  subtotal: number;
  tax: number;
  shipping: number;
  totalPrice: number;
  currency?: string;
  amountDiscount?: number;
  grossSubtotal?: number;
  businessDiscount?: number;
  address?: Address;
  quotationDetails?: Address;
}

type CheckoutLineItem = {
  id: string;
  product?: CartItem["product"] | CheckoutOrderProduct["product"] | null;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  appliedPromotion?: CartItem["appliedPromotion"];
  priceOptionLabel?: string | null;
};

interface CheckoutContentProps {
  onActiveStepChange?: (step: CheckoutStep) => void;
  order?: CheckoutOrder | null;
}

export function CheckoutContent({ onActiveStepChange, order }: CheckoutContentProps) {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const {
    items: cart,
    resetCart,
    getSubTotalPrice,
    getTotalDiscount,
    setOrderPlacementState,
  } = useCartStore();
  const { placeOrder, isPlacingOrder, orderStep } = useOrderPlacement({
    user: user!,
  });
  const orderIdFromParam =
    searchParams.get("orderId") ?? searchParams.get("order_id");
  const paymentMethodFromParam =
    searchParams.get("paymentMethod") ?? searchParams.get("payment_method");
  const resolvedPaymentMethodFromParam = Object.values(PAYMENT_METHODS).includes(
    paymentMethodFromParam as PaymentMethod
  )
    ? (paymentMethodFromParam as PaymentMethod)
    : undefined;
  const isQuoteOrder =
    order?.orderKind === "quotation" ||
    order?.status === ORDER_STATUSES.QUOTATION_REQUESTED;
  const isQuotationCheckout = Boolean(
    (orderIdFromParam || order?._id) && isQuoteOrder
  );
  const canRequestQuotation = REQUEST_QUOTE_FROM_CART_ENABLED;
  const quotationAddress = order?.quotationDetails ?? order?.address ?? null;
  const resolvedOrderPaymentMethod = Object.values(PAYMENT_METHODS).includes(
    order?.paymentMethod as PaymentMethod
  )
    ? (order?.paymentMethod as PaymentMethod)
    : undefined;
  const defaultPaymentMethod = isQuotationCheckout
    ? resolvedOrderPaymentMethod ?? PAYMENT_METHODS.CASH_ON_DELIVERY
    : resolvedPaymentMethodFromParam ?? PAYMENT_METHODS.STRIPE;
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>(defaultPaymentMethod);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(
    isQuotationCheckout ? quotationAddress : null
  );
  const [selectedQuotationDetails, setSelectedQuotationDetails] =
    useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressIdFromParam, setAddressIdFromParam] = useState<string | null>(
    null
  );
  const [quotationAddressIdFromParam, setQuotationAddressIdFromParam] =
    useState<string | null>(null);
  const [addressFromParam, setAddressFromParam] = useState<Address | null>(
    null
  );
  const [addressFormSeed, setAddressFormSeed] =
    useState<Partial<AddressFormValues> | null>(null);
  const [pendingAddress, setPendingAddress] = useState<Address | null>(null);
  const [hasAutoSelectedAddress, setHasAutoSelectedAddress] = useState(
    Boolean(isQuotationCheckout && quotationAddress)
  );
  const [actionType, setActionType] = useState<
    "place" | "quotation" | null
  >(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isAcceptingQuotation, setIsAcceptingQuotation] = useState(false);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [quotationResult, setQuotationResult] = useState<{
    purchaseOrderNumber?: string;
    pdfUrl?: string;
    pdfDownloadUrl?: string;
    emailSent?: boolean;
    emailError?: string;
  } | null>(null);
  const openPdf = useCallback((url: string) => {
    const nextWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!nextWindow) {
      window.location.assign(url);
    }
  }, []);
  const [showDiscountDetails, setShowDiscountDetails] = useState(false);
  const [hasInitialCart, setHasInitialCart] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<{
    isBusiness: boolean;
    businessStatus?: string;
    membershipType?: string;
    premiumStatus?: string;
  } | null>(null);
  const [selectedSalesContactId, setSelectedSalesContactId] = useState<
    string | null
  >(null);
  const { markRecovered } = useCartAbandonmentSync();
  const [activeStep, setActiveStep] = useState<CheckoutStep>(() =>
    searchParams.get("step") === "payment" || isQuotationCheckout
      ? "payment"
      : "address"
  );
  const [hasAppliedStepOverride, setHasAppliedStepOverride] = useState(false);

  const checkoutItems = useMemo<CheckoutLineItem[]>(() => {
    if (isQuotationCheckout && order?.products?.length) {
      return order.products.map((item, index) => {
        const quantity = item.quantity ?? 0;
        const unitPrice =
          typeof item.unitPrice === "number"
            ? item.unitPrice
            : item.product?.price ?? 0;
        const lineTotal =
          typeof item.lineTotal === "number"
            ? item.lineTotal
            : unitPrice * quantity;

        return {
          id: item.product?._id ?? `order-item-${index}`,
          product: item.product ?? null,
          quantity,
          unitPrice,
          lineTotal,
          priceOptionLabel: item.priceOptionLabel ?? null,
        };
      });
    }

    return cart.map((item) => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      appliedPromotion: item.appliedPromotion,
      priceOptionLabel: item.priceOptionLabel ?? null,
    }));
  }, [cart, order, isQuotationCheckout]);
  const itemCount = checkoutItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const isBusinessAccount = Boolean(
    userProfile?.isBusiness ||
      userProfile?.businessStatus === "active" ||
      userProfile?.membershipType === "business"
  );
  const isPremiumAccount = Boolean(
    userProfile?.membershipType === "premium" ||
      userProfile?.premiumStatus === "active"
  );
  const isInvoiceEligible = isBusinessAccount;

  const discountBreakdown = useMemo(
    () => (isQuotationCheckout ? [] : buildDiscountBreakdown(cart ?? [])),
    [cart, isQuotationCheckout]
  );
  const promotionSummaries = useMemo(
    () => (isQuotationCheckout ? [] : buildPromotionSummaries(cart ?? [])),
    [cart, isQuotationCheckout]
  );
  const taxRate = useTaxRate();
  const {
    dealerDiscountPercent,
    showDealerDiscount,
    dealerFreeShippingEnabled,
    premiumFreeShippingEnabled,
  } = usePricingSettings();

  const orderGrossSubtotal = order
    ? order.grossSubtotal ??
      order.subtotal +
        (order.amountDiscount ?? 0) +
        (order.businessDiscount ?? 0)
    : 0;
  const grossSubtotal = isQuotationCheckout
    ? orderGrossSubtotal
    : getSubTotalPrice();
  const totalDiscount = isQuotationCheckout
    ? order?.amountDiscount ?? 0
    : getTotalDiscount();
  const currentSubtotal = grossSubtotal - totalDiscount;
  const dealerDiscountRate =
    dealerDiscountPercent > 0 ? dealerDiscountPercent / 100 : 0;
  const dealerDiscountLabel = Number.isInteger(dealerDiscountPercent)
    ? dealerDiscountPercent.toFixed(0)
    : dealerDiscountPercent.toFixed(2);

  const businessDiscount = isQuotationCheckout
    ? order?.businessDiscount ?? 0
    : isBusinessAccount
      ? currentSubtotal * dealerDiscountRate
      : 0;
  const finalSubtotal = isQuotationCheckout
    ? order?.subtotal ?? currentSubtotal - businessDiscount
    : currentSubtotal - businessDiscount;

  const hasMemberFreeShipping =
    (dealerFreeShippingEnabled && isBusinessAccount) ||
    (premiumFreeShippingEnabled && isPremiumAccount);
  const shipping = isQuotationCheckout
    ? order?.shipping ?? 0
    : hasMemberFreeShipping
      ? 0
      : finalSubtotal >= 100
        ? 0
        : 10;
  const tax = isQuotationCheckout
    ? order?.tax ?? 0
    : finalSubtotal * taxRate;
  const total = isQuotationCheckout
    ? order?.totalPrice ?? finalSubtotal + shipping + tax
    : finalSubtotal + shipping + tax;
  const hasDiscountBreakdown =
    !isQuotationCheckout && totalDiscount > 0 && discountBreakdown.length > 0;
  const hasCheckoutItems = checkoutItems.length > 0;
  const quotationDownloadUrl =
    quotationResult?.pdfDownloadUrl ?? quotationResult?.pdfUrl;
  const hasOutOfStockItems =
    !isQuotationCheckout &&
    cart.some(
      (item) =>
        typeof item.product.stock === "number" && item.product.stock === 0
    );
  const hasInsufficientStockItems =
    !isQuotationCheckout &&
    cart.some(
      (item) =>
        typeof item.product.stock === "number" &&
        item.quantity > item.product.stock
    );
  const hasStockIssues = hasOutOfStockItems || hasInsufficientStockItems;
  const cancelledCheckout =
    searchParams.get("cancelled") === "1" ||
    searchParams.get("cancelled") === "true";
  const stepParam = searchParams.get("step");
  const shouldSkipToPayment = stepParam === "payment" || isQuotationCheckout;

  useEffect(() => {
    if (!isInvoiceEligible && selectedPaymentMethod === PAYMENT_METHODS.CLERK) {
      setSelectedPaymentMethod(
        isQuotationCheckout
          ? PAYMENT_METHODS.CASH_ON_DELIVERY
          : PAYMENT_METHODS.STRIPE
      );
    }
  }, [isInvoiceEligible, selectedPaymentMethod, isQuotationCheckout]);

  useEffect(() => {
    onActiveStepChange?.(activeStep);
  }, [activeStep, onActiveStepChange]);

  useEffect(() => {
    if (!isQuotationCheckout || !quotationAddress) return;
    if (!selectedAddress) {
      setSelectedAddress(quotationAddress);
    }
    if (!hasAutoSelectedAddress) {
      setHasAutoSelectedAddress(true);
    }
  }, [
    isQuotationCheckout,
    quotationAddress,
    selectedAddress,
    hasAutoSelectedAddress,
  ]);

  useEffect(() => {
    if (!shouldSkipToPayment || hasAppliedStepOverride) return;
    if (!selectedAddress) return;
    setActiveStep("payment");
    setHasAppliedStepOverride(true);
  }, [shouldSkipToPayment, hasAppliedStepOverride, selectedAddress]);

  // Fetch user profile for dealer account status
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
              premiumStatus: profile.premiumStatus ?? "none",
            });
          } else {
            setUserProfile({
              isBusiness: false,
              businessStatus: "none",
              membershipType: "standard",
              premiumStatus: "none",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (user && isLoaded) {
      fetchUserProfile();
    }
  }, [user, isLoaded]);

  const refreshAddresses = useCallback(async (): Promise<Address[]> => {
    if (!user) return [];
    try {
      setIsLoadingAddresses(true);
      const response = await fetch("/api/user/addresses");
      if (response.ok) {
        const data = await response.json();
        const nextAddresses = data.addresses || [];
        setAddresses(nextAddresses);
        return nextAddresses;
      } else {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to load addresses");
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch addresses"
      );
      return [];
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [user]);

  const findMatchingAddress = useCallback(
    (candidate: Address, list: Address[]) => {
      if (!candidate) return null;
      if (candidate._id) {
        const matchById = list.find((addr) => addr._id === candidate._id);
        if (matchById) return matchById;
      }

      const normalize = (value?: string) =>
        (value ?? "").trim().toLowerCase();
      return (
        list.find(
          (addr) =>
            normalize(addr.address) === normalize(candidate.address) &&
            normalize(addr.city) === normalize(candidate.city) &&
            normalize(addr.state) === normalize(candidate.state) &&
            normalize(addr.zip) === normalize(candidate.zip) &&
            normalize(addr.name) === normalize(candidate.name)
        ) ?? null
      );
    },
    []
  );

  useEffect(() => {
    if (isQuotationCheckout) return;
    if (isLoaded && user) {
      refreshAddresses();
    }
  }, [isLoaded, user, refreshAddresses, isQuotationCheckout]);

  useEffect(() => {
    const addressIdParam = searchParams.get("addressId");
    setAddressIdFromParam(addressIdParam);
    const quotationIdParam = searchParams.get("quotationAddressId");
    setQuotationAddressIdFromParam(quotationIdParam);
    const salesContactIdParam = searchParams.get("salesContactId");
    setSelectedSalesContactId(salesContactIdParam);

    const addressParam = searchParams.get("address");
    if (!addressParam) {
      setAddressFromParam(null);
      return;
    }

    try {
      const decodedAddress = JSON.parse(decodeURIComponent(addressParam));
      const normalizedAddress: Address = {
        _id: decodedAddress._id,
        name: decodedAddress.name ?? "",
        email:
          decodedAddress.email ??
          user?.emailAddresses?.[0]?.emailAddress ??
          "",
        address: decodedAddress.address ?? "",
        city: decodedAddress.city ?? "",
        state: decodedAddress.state ?? "",
        zip: decodedAddress.zip ?? "",
        country: decodedAddress.country ?? "United States",
        countryCode: decodedAddress.countryCode ?? "",
        stateCode: decodedAddress.stateCode ?? "",
        subArea: decodedAddress.subArea ?? "",
        phone: decodedAddress.phone ?? "",
        fax: decodedAddress.fax ?? "",
        contactEmail:
          decodedAddress.contactEmail ??
          decodedAddress.email ??
          user?.emailAddresses?.[0]?.emailAddress ??
          "",
        company: decodedAddress.company ?? "",
        taxId: decodedAddress.taxId ?? "",
        branch: decodedAddress.branch ?? "",
        type: decodedAddress.type ?? "home",
        default: Boolean(decodedAddress.default),
        createdAt: decodedAddress.createdAt,
        lastUsedAt: decodedAddress.lastUsedAt,
      };
      setAddressFromParam(normalizedAddress);
    } catch (error) {
      console.error("Error parsing address from URL:", error);
      toast.error("Error loading address from cart");
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (isQuotationCheckout) return;
    if (isLoadingAddresses || hasAutoSelectedAddress) return;

    let nextAddress: Address | null = selectedAddress;

    if (addressIdFromParam) {
      const matchById = addresses.find(
        (addr) => addr._id === addressIdFromParam
      );
      if (matchById) {
        nextAddress = matchById;
        setPendingAddress(null);
      }
    }

    if (!nextAddress && addressFromParam) {
      const matched = findMatchingAddress(addressFromParam, addresses);
      if (matched) {
        nextAddress = matched;
        setPendingAddress(null);
      } else {
        setPendingAddress(addressFromParam);
      }
    } else if (!nextAddress) {
      setPendingAddress(null);
    }

    if (!nextAddress) {
      const defaultAddress =
        addresses.find((addr) => addr.default) ?? addresses[0];
      if (defaultAddress) {
        nextAddress = defaultAddress;
      }
    }

    if (nextAddress && nextAddress !== selectedAddress) {
      setSelectedAddress(nextAddress);
    }

    setHasAutoSelectedAddress(true);
  }, [
    isLoadingAddresses,
    hasAutoSelectedAddress,
    addressIdFromParam,
    addressFromParam,
    addresses,
    selectedAddress,
    findMatchingAddress,
    isQuotationCheckout,
  ]);

  useEffect(() => {
    if (isQuotationCheckout) return;
    if (!quotationAddressIdFromParam) {
      setSelectedQuotationDetails(null);
      return;
    }
    if (quotationAddressIdFromParam === "shipping") {
      setSelectedQuotationDetails(null);
      return;
    }
    const match = addresses.find(
      (addr) => addr._id === quotationAddressIdFromParam
    );
    setSelectedQuotationDetails(match ?? null);
  }, [isQuotationCheckout, quotationAddressIdFromParam, addresses]);

  // Track initial cart state and redirect if empty
  useEffect(() => {
    if (isQuotationCheckout) return;
    if (hasInitialCart === null && isLoaded && cart !== undefined) {
      setHasInitialCart(cart.length > 0);

      // If cart is empty on initial load, redirect to cart
      if (cart.length === 0) {
        window.location.href = "/cart";
        return;
      }
    }
  }, [cart, hasInitialCart, isLoaded, isQuotationCheckout]);

  useEffect(() => {
    if (!selectedAddress && activeStep !== "address") {
      setActiveStep("address");
    }
  }, [activeStep, selectedAddress]);

  const isStripePayment = selectedPaymentMethod === PAYMENT_METHODS.STRIPE;
  const isInvoicePayment = selectedPaymentMethod === PAYMENT_METHODS.CLERK;
  const isCodPayment =
    selectedPaymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY;
  const isCreditPayment = selectedPaymentMethod === PAYMENT_METHODS.CREDIT;
  const placeOrderLabel = isQuotationCheckout
    ? isStripePayment
      ? "Confirm Order & Pay Now"
      : isInvoicePayment
        ? "Confirm Order – Request Invoice"
        : isCreditPayment
          ? "Confirm Order – Request Credit"
          : "Confirm Order – Pay on Delivery"
    : isStripePayment
      ? "Checkout & Pay Now"
      : isInvoicePayment
        ? "Add to Order – Request Invoice"
        : isCreditPayment
          ? "Add to Order – Request Credit"
          : "Add to Order – Pay on Delivery";
  const hasRequiredAddress = isQuotationCheckout
    ? Boolean(quotationAddress)
    : Boolean(selectedAddress);
  const sectionClassName = (step: CheckoutStep) =>
    cn(activeStep === step ? "block" : "hidden md:block");
  const formatAddressType = (value?: string) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : "Address";
  const buildAddressLabel = (address: Address) =>
    `${formatAddressType(address.type)} - ${address.address}, ${address.city}`;
  const getItemUnitPrice = (item: CheckoutLineItem) =>
    typeof item.unitPrice === "number"
      ? item.unitPrice
      : item.product?.price ?? 0;
  const getItemLineTotal = (item: CheckoutLineItem) =>
    typeof item.lineTotal === "number"
      ? item.lineTotal
      : getItemUnitPrice(item) * item.quantity;
  const addressFormDefaults =
    addressFormSeed ?? {
      email: user?.emailAddresses?.[0]?.emailAddress ?? "",
      contactEmail: user?.emailAddresses?.[0]?.emailAddress ?? "",
      default: addresses.length === 0,
      country: "United States",
      countryCode: "",
      stateCode: "",
      subArea: "",
    };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
    if (activeStep === "address") {
      setActiveStep("payment");
    }
  };

  const handleCreateAddress = async (values: AddressFormValues) => {
    setIsSavingAddress(true);
    try {
      const payload: Partial<AddressFormValues> = {
        ...values,
        email: values.email || user?.emailAddresses?.[0]?.emailAddress || "",
      };
      delete payload.customerCode;
      const response = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to save address");
      }

      const data = await response.json();
      const nextAddresses = await refreshAddresses();
      if (data?.address) {
        if (data.address._id) {
          const matched = nextAddresses.find(
            (address) => address._id === data.address._id
          );
          setSelectedAddress(matched ?? data.address);
        } else {
          setSelectedAddress(data.address);
        }
      } else if (values.default) {
        const defaultAddress = nextAddresses.find((addr) => addr.default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        }
      }
      setIsAddressFormOpen(false);
      setActiveStep("payment");
      toast.success("Address saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save address"
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSavePendingAddress = async () => {
    if (!pendingAddress) return;
    const payload: AddressFormValues = {
      ...pendingAddress,
      _id: undefined,
      name: pendingAddress.name || "",
      address: pendingAddress.address || "",
      city: pendingAddress.city || "",
      state: pendingAddress.state || "",
      zip: pendingAddress.zip || "",
      email:
        pendingAddress.email || user?.emailAddresses?.[0]?.emailAddress || "",
      contactEmail: pendingAddress.contactEmail || "",
      phone: pendingAddress.phone || "",
      fax: pendingAddress.fax || "",
      company: pendingAddress.company || "",
      customerCode: pendingAddress.customerCode || "",
      winCode: pendingAddress.winCode || "",
      lineId: pendingAddress.lineId || "",
      taxId: pendingAddress.taxId || "",
      branch: pendingAddress.branch || "",
      country: pendingAddress.country || "United States",
      countryCode: pendingAddress.countryCode || "",
      stateCode: pendingAddress.stateCode || "",
      subArea: pendingAddress.subArea || "",
      type: pendingAddress.type || "home",
      default: pendingAddress.default ?? addresses.length === 0,
    };
    await handleCreateAddress(payload);
    setPendingAddress(null);
  };

  const openAddressForm = (seed?: Partial<AddressFormValues>) => {
    const fallbackSeed = {
      email: user?.emailAddresses?.[0]?.emailAddress ?? "",
      contactEmail: user?.emailAddresses?.[0]?.emailAddress ?? "",
      default: addresses.length === 0,
      country: "United States",
      countryCode: "",
      stateCode: "",
      subArea: "",
    };
    setAddressFormSeed(seed ?? fallbackSeed);
    setIsAddressFormOpen(true);
  };

  const redirectMessage = isStripePayment
    ? "Redirecting to payment..."
    : isQuotationCheckout
      ? "Redirecting to your order..."
      : "Redirecting to your order details...";
  const statusMessage = isRedirecting
    ? redirectMessage
    : isAcceptingQuotation
      ? "Confirming your quotation..."
      : isPlacingOrder && actionType === "place"
        ? "Placing your order..."
        : isPlacingOrder && actionType === "quotation"
          ? "Creating quotation..."
          : null;

  const PaymentMethodSelector = ({
    idPrefix,
    className,
  }: {
    idPrefix: string;
    className?: string;
  }) => {
    return (
      <RadioGroup
        value={selectedPaymentMethod}
        onValueChange={(value) =>
          setSelectedPaymentMethod(value as PaymentMethod)
        }
        className={cn("space-y-3", className)}
      >
        <Label
          htmlFor={`${idPrefix}-stripe`}
          className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
        >
          <RadioGroupItem
            value={PAYMENT_METHODS.STRIPE}
            id={`${idPrefix}-stripe`}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4" />
              Credit Card (Pay Now)
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay now with card via Stripe
            </p>
          </div>
        </Label>

        <Label
          htmlFor={`${idPrefix}-cod`}
          className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
        >
          <RadioGroupItem
            value={PAYMENT_METHODS.CASH_ON_DELIVERY}
            id={`${idPrefix}-cod`}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium">
              <Wallet className="h-4 w-4" />
              Cash on Delivery
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay with cash when your order arrives
            </p>
          </div>
        </Label>
        <Label
          htmlFor={`${idPrefix}-credit`}
          className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
        >
          <RadioGroupItem
            value={PAYMENT_METHODS.CREDIT}
            id={`${idPrefix}-credit`}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium">
              <BadgeDollarSign className="h-4 w-4" />
              Credit Payment (Request Approval)
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit a credit request and we&apos;ll review it with our team
            </p>
          </div>
        </Label>
        {isInvoiceEligible && (
          <Label
            htmlFor={`${idPrefix}-clerk`}
            className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
          >
            <RadioGroupItem
              value={PAYMENT_METHODS.CLERK}
              id={`${idPrefix}-clerk`}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4" />
                Invoice (Clerk)
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Receive an invoice and pay within 30 days.
              </p>
            </div>
          </Label>
        )}
      </RadioGroup>
    );
  };

  const handlePlaceOrder = async () => {
    if (isQuotationCheckout) {
      if (!order?._id) {
        toast.error("Unable to accept quotation: missing order.");
        return;
      }

      if (!quotationAddress) {
        toast.error("Quotation address is missing.");
        return;
      }

      if (!hasCheckoutItems) {
        toast.error("Quotation has no items to confirm.");
        return;
      }

      if (
        selectedPaymentMethod === PAYMENT_METHODS.CLERK &&
        !isInvoiceEligible
      ) {
        toast.error(
          "Invoice payment is available for dealer accounts only."
        );
        return;
      }

      setActionType("place");
      setIsAcceptingQuotation(true);

      try {
        const response = await fetch(
          `/api/orders/${order._id}/accept-quotation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentMethod: selectedPaymentMethod }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to accept quotation");
        }

        if (selectedPaymentMethod === PAYMENT_METHODS.STRIPE) {
          const paymentResponse = await fetch(
            `/api/orders/${order._id}/pay`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );

          const paymentData = await paymentResponse.json();

          if (paymentResponse.ok && paymentData.success && paymentData.url) {
            setIsRedirecting(true);
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

        setIsRedirecting(true);
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
        setIsAcceptingQuotation(false);
        setActionType(null);
      }
      return;
    }

    if (!selectedAddress) {
      toast.error("Please select a shipping address");
      return;
    }

    if (hasStockIssues) {
      toast.error(
        "Some items are out of stock or exceed available inventory."
      );
      return;
    }

    setActionType("place");

    const effectiveQuotationDetails =
      selectedQuotationDetails ?? selectedAddress ?? undefined;
    const result = await placeOrder(
      selectedAddress,
      selectedPaymentMethod,
      finalSubtotal, // Pass final subtotal (includes business discount)
      shipping,
      tax,
      total,
      false,
      {
        ...(effectiveQuotationDetails
          ? { quotationDetails: effectiveQuotationDetails }
          : {}),
        ...(selectedSalesContactId
          ? { salesContactId: selectedSalesContactId }
          : {}),
      }
    );

    if (result?.success) {
      await markRecovered(result.orderId);
    }

    try {
      const redirectUrl = result?.redirectTo;
      if (result?.success && redirectUrl) {
        setIsRedirecting(true);
        const redirectDelay = result.isStripeRedirect ? 0 : 1500;
        setTimeout(() => {
          void apiClearCart({ keepalive: true }).catch((error) => {
            console.error("Failed to clear cart after checkout:", error);
          });
          resetCart();
          window.location.href = redirectUrl;
        }, redirectDelay);
      } else {
        setOrderPlacementState(false, "validating");
      }
    } finally {
      setActionType(null);
    }
  };

  const handleRequestQuotation = () => {
    if (!canRequestQuotation) {
      toast.error("Quotation requests are currently unavailable.");
      return;
    }

    if (!selectedAddress) {
      toast.error("Please select a shipping address");
      return;
    }

    if (hasStockIssues) {
      toast.error(
        "Some items are out of stock or exceed available inventory."
      );
      return;
    }

    if (!hasCheckoutItems) {
      toast.error("Your cart is empty");
      return;
    }

    setShowQuotationDialog(true);
  };

  const handleConfirmQuotation = async () => {
    if (!selectedAddress) {
      toast.error("Please select a shipping address");
      setShowQuotationDialog(false);
      return;
    }

    setShowQuotationDialog(false);
    setActionType("quotation");
    setQuotationResult(null);

    try {
      const effectiveQuotationDetails =
        selectedQuotationDetails ?? selectedAddress ?? undefined;
      const result = await placeOrder(
        selectedAddress,
        PAYMENT_METHODS.CASH_ON_DELIVERY,
        finalSubtotal,
        shipping,
        tax,
        total,
        false,
        {
          skipEmail: true,
          suppressRedirect: true,
          suppressSuccessToast: true,
          orderKind: "quotation",
          ...(effectiveQuotationDetails
            ? { quotationDetails: effectiveQuotationDetails }
            : {}),
          ...(selectedSalesContactId
            ? { salesContactId: selectedSalesContactId }
            : {}),
        }
      );

      if (result?.success) {
        await markRecovered(result.orderId);
      }

      if (result?.success && result.orderId) {
        try {
          await apiClearCart({ keepalive: true });
        } catch (error) {
          console.error("Failed to clear cart after quotation:", error);
        }
        resetCart();

        const quotation = result.quotation;
        if (!quotation) {
          toast.success("Quotation requested!");
          return;
        }

        const pdfUrl = quotation.pdfUrl ?? undefined;
        const pdfDownloadUrl = quotation.pdfDownloadUrl ?? undefined;
        const actionUrl = pdfDownloadUrl ?? pdfUrl;

        setQuotationResult({
          purchaseOrderNumber: quotation.purchaseOrderNumber,
          pdfUrl,
          pdfDownloadUrl,
          emailSent: quotation.emailSent,
          emailError: quotation.emailError,
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
          toast.success("Quotation ready! Check your email for a copy.");
        }
      }
    } catch (error) {
      console.error("Quotation creation failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create quotation"
      );
    } finally {
      setOrderPlacementState(false, "validating");
      setActionType(null);
    }
  };

  if (!isLoaded) {
    return <CheckoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">
          Please sign in to proceed with checkout.
        </p>
      </div>
    );
  }

  // Show loading during redirect process
  if (isRedirecting) {
    return (
      <div className="text-center py-10" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
        <h2 className="text-xl font-semibold mb-2">Processing your order...</h2>
        <p className="text-muted-foreground">
          Please wait while we finalize your checkout.
        </p>
      </div>
    );
  }

  // If cart is empty and we had an initial cart, show loading (likely during order processing)
  if (
    !isQuotationCheckout &&
    (!cart || cart.length === 0) &&
    hasInitialCart &&
    !quotationResult
  ) {
    return <CheckoutSkeleton />;
  }

  // If cart is empty and no initial cart, this shouldn't happen due to redirect
  // But show fallback just in case
  if (!isQuotationCheckout && (!cart || cart.length === 0) && !quotationResult) {
    return (
      <div className="text-center py-10 animate-in fade-in-0 duration-500">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-4">
          Add some products to continue with checkout
        </p>
        <Button asChild className="h-11">
          <a href="/shop">Continue Shopping</a>
        </Button>
      </div>
    );
  }

  if (isQuotationCheckout && !hasCheckoutItems) {
    return (
      <div className="text-center py-10 animate-in fade-in-0 duration-500">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">
          Quotation items unavailable
        </h2>
        <p className="text-muted-foreground mb-4">
          We couldn&apos;t load the items for this quotation.
        </p>
        <Button asChild className="h-11">
          <a href="/user/orders">Back to Orders</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {statusMessage && (
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}
      {cancelledCheckout && (
        <div className="lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Payment was cancelled. You can review your details and try again.
        </div>
      )}
      {hasStockIssues && (
        <div className="lg:col-span-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Some items are out of stock or exceed available inventory. Please
          update your cart to continue.
        </div>
      )}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className={sectionClassName("address")}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {isQuotationCheckout ? "Quotation Address" : "Shipping Address"}
                </CardTitle>
                {!isQuotationCheckout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 px-3 text-xs font-medium sm:h-9"
                    asChild
                  >
                    <a href="/cart">Change</a>
                  </Button>
                )}
                {isQuotationCheckout && order?._id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 px-3 text-xs font-medium sm:h-9"
                    asChild
                  >
                    <a href={`/user/orders/${order._id}`}>View Quotation</a>
                  </Button>
                )}
                <span className="text-xs font-medium text-muted-foreground md:hidden">
                  Step 1 of 3
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {isQuotationCheckout ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm font-medium">
                      Address confirmed from your quotation.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {quotationAddress
                        ? buildAddressLabel(quotationAddress)
                        : "Quotation address is unavailable."}
                    </p>
                    {quotationAddress?.name && (
                      <p className="text-xs text-muted-foreground">
                        {quotationAddress.name}
                        {quotationAddress.company
                          ? ` - ${quotationAddress.company}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              ) : isLoadingAddresses ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse mt-1"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-48"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-40"></div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse mt-1"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-52"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-36"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAddress && (
                    <div className="rounded-lg border border-dashed bg-muted/40 p-4">
                      <p className="text-sm font-medium">
                        Address from cart (not saved yet)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {buildAddressLabel(pendingAddress)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={handleSavePendingAddress}
                          disabled={isSavingAddress}
                          className="h-11"
                        >
                          Save &amp; Use
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddressForm(pendingAddress)}
                          className="h-11"
                        >
                          Edit &amp; Save
                        </Button>
                      </div>
                    </div>
                  )}

                  {addresses.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No saved addresses yet.
                      </p>
                      <Button
                        onClick={() => openAddressForm()}
                        className="mt-4 h-11 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Address
                      </Button>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedAddress?._id || ""}
                      onValueChange={(value) => {
                        const address = addresses.find(
                          (addr) => addr._id === value
                        );
                        if (address) handleSelectAddress(address);
                      }}
                      className="space-y-3"
                    >
                      {addresses.map((address) => (
                        <Label
                          key={address._id}
                          htmlFor={`address-${address._id}`}
                          className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
                        >
                          <RadioGroupItem
                            value={address._id ?? ""}
                            id={`address-${address._id ?? "unknown"}`}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium break-words">
                                {buildAddressLabel(address)}
                              </span>
                              {address.default && (
                                <Badge variant="outline">Default</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {address.name}
                              {address.company
                                ? ` - ${address.company}`
                                : ""}
                            </div>
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}

                  <Button
                    variant="outline"
                    className="w-full h-11 gap-2"
                    onClick={() => openAddressForm()}
                  >
                    <Plus className="h-4 w-4" />
                    Add New Address
                  </Button>
                </div>
              )}
              {!isQuotationCheckout && (
                <div className="mt-4 md:hidden">
                  <Button
                    onClick={() => setActiveStep("payment")}
                    disabled={
                      !selectedAddress || isLoadingAddresses || hasStockIssues
                    }
                    className="w-full h-11"
                  >
                    Continue to Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className={cn(sectionClassName("payment"), "md:hidden")}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
                <span className="text-xs font-medium text-muted-foreground md:hidden">
                  Step 2 of 3
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <PaymentMethodSelector
                idPrefix="checkout-payment"
                className="md:hidden"
              />
              <div className="mt-4 flex gap-2 md:hidden">
                {!isQuotationCheckout && (
                  <Button
                    variant="ghost"
                    onClick={() => setActiveStep("address")}
                    className="w-full h-11"
                  >
                    Back to Address
                  </Button>
                )}
                <Button
                  onClick={() => setActiveStep("review")}
                  disabled={!hasRequiredAddress || hasStockIssues}
                  className="w-full h-11"
                >
                  Continue to Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={sectionClassName("review")}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Review Items ({itemCount})</CardTitle>
                <span className="text-xs font-medium text-muted-foreground md:hidden">
                  Step 3 of 3
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkoutItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                >
                  <div className="h-16 w-16 shrink-0">
                    <Image
                      src={
                        item.product?.images?.[0]
                          ? urlFor(item.product.images[0]).url()
                          : "/placeholder.jpg"
                      }
                      alt={item.product?.name || "Product"}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium break-words">
                      {item.product?.name || "Product"}
                    </h4>
                    {item.priceOptionLabel ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Price: {item.priceOptionLabel}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Qty: {item.quantity}</span>
                      {item.appliedPromotion ? (
                        <AppliedPromotionBadge
                          promotion={item.appliedPromotion}
                          className="text-[11px]"
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-medium">
                      <PriceFormatter amount={getItemLineTotal(item)} />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <PriceFormatter amount={getItemUnitPrice(item)} /> each
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className={cn("flex flex-col gap-6", sectionClassName("review"))}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodSelector idPrefix="checkout-summary" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal ({itemCount} items)</span>
              <PriceFormatter amount={grossSubtotal} />
            </div>
            {promotionSummaries.length > 0 && (
              <div className="space-y-1">
                {promotionSummaries.map((summary) => (
                  <div
                    key={`${summary.type}:${summary.id}`}
                    className="flex justify-between text-sm text-success-base"
                  >
                    <span>{summary.name}</span>
                    <span>
                      -<PriceFormatter amount={summary.discountAmount} />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="flex justify-between text-success-base">
                <span>Discount</span>
                <span>
                  -<PriceFormatter amount={totalDiscount} />
                </span>
              </div>
            )}
            {hasDiscountBreakdown && (
              <div className="rounded-md border border-emerald-100/80 bg-emerald-50/50 p-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowDiscountDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 py-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {showDiscountDetails ? "Hide details" : "View details"}
                </button>
                {showDiscountDetails && (
                  <div className="mt-2 space-y-2">
                    {discountBreakdown.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <AppliedPromotionBadge
                            promotion={entry.promotion}
                            variant="type"
                          />
                          <span className="font-medium text-foreground">
                            {entry.promotion.name}
                          </span>
                        </div>
                        <span className="font-semibold text-emerald-700">
                          -{" "}
                          <PriceFormatter
                            amount={entry.savings}
                            className="text-xs font-semibold text-emerald-700"
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {showDealerDiscount && businessDiscount > 0 && (
              <div className="flex justify-between text-blue-600">
                <span title="Dealer accounts receive an additional discount.">
                  Dealer Account Discount ({dealerDiscountLabel}%)
                </span>
                <span>
                  -<PriceFormatter amount={businessDiscount} />
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              {shipping === 0 ? (
                <span className="text-success-base font-medium">Free</span>
              ) : (
                <PriceFormatter amount={shipping} />
              )}
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <PriceFormatter amount={tax} />
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <PriceFormatter amount={total} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 pb-16 sm:pb-0">
          <Button
            variant="ghost"
            onClick={() => setActiveStep("payment")}
            className="w-full h-11 md:hidden"
          >
            Back to Payment
          </Button>
          <Button
            onClick={handlePlaceOrder}
            disabled={
              isPlacingOrder ||
              isAcceptingQuotation ||
              !hasRequiredAddress ||
              !hasCheckoutItems ||
              hasStockIssues
            }
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {((isPlacingOrder && actionType === "place") ||
              isAcceptingQuotation) ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isStripePayment ? (
                  <CreditCard className="w-5 h-5" />
                ) : isCreditPayment ? (
                  <BadgeDollarSign className="w-5 h-5" />
                ) : isInvoicePayment ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <Wallet className="w-5 h-5" />
                )}
                {placeOrderLabel}
              </div>
            )}
          </Button>
          {!isQuotationCheckout && canRequestQuotation && (
            <>
              <Button
                onClick={handleRequestQuotation}
                disabled={
                  isPlacingOrder ||
                  !selectedAddress ||
                  !hasCheckoutItems ||
                  hasStockIssues
                }
                variant="outline"
                className="w-full h-11"
              >
                {isPlacingOrder && actionType === "quotation" ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating quotation...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Request Quotation
                  </div>
                )}
              </Button>
              {quotationResult && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                  <p className="font-medium text-green-800">Quotation ready!</p>
                  <p className="text-xs text-green-700">
                    Download the PDF or check your email for a copy.
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
                        Download PDF
                      </a>
                    </Button>
                  )}
                  {quotationResult.emailSent === false &&
                    quotationResult.emailError && (
                      <p className="mt-2 text-xs text-amber-700">
                        Email not sent: {quotationResult.emailError}
                      </p>
                    )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          {isStripePayment ? (
            <>
              <p>🔒 Pay now with card via Stripe</p>
              <p>Your payment information is encrypted and secure</p>
            </>
          ) : isInvoicePayment ? (
            <>
              <p>🧾 Invoice will be sent shortly after checkout</p>
              <p>Please follow the payment instructions within 30 days</p>
            </>
          ) : isCreditPayment ? (
            <>
              <p>💳 Credit request submitted for review</p>
              <p>We&apos;ll contact you once it&apos;s approved or rejected</p>
            </>
          ) : isCodPayment ? (
            <>
              <p>💵 Pay with cash on delivery</p>
              <p>We&apos;ll collect payment when your order arrives</p>
            </>
          ) : null}
        </div>
      </div>

      <Dialog
        open={isAddressFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddressFormSeed(null);
          }
          setIsAddressFormOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
            <DialogDescription>
              Save an address for faster checkout.
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            initialValues={addressFormDefaults}
            defaultContactEmail={user?.emailAddresses?.[0]?.emailAddress ?? ""}
            onSubmit={handleCreateAddress}
            onCancel={() => setIsAddressFormOpen(false)}
            submitLabel="Save Address"
            isSubmitting={isSavingAddress}
          />
        </DialogContent>
      </Dialog>

      {!isQuotationCheckout && canRequestQuotation && (
        <Dialog
          open={showQuotationDialog}
          onOpenChange={setShowQuotationDialog}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Generate an official quotation for the items in your cart?
              </DialogTitle>
              <DialogDescription asChild className="space-y-2">
                <div>
                  <p>
                    This will create a quotation PDF you can download or receive
                    via email.
                  </p>
                  <p>We'll show a download link here once it's ready.</p>
                  <p>No payment is required at this stage.</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowQuotationDialog(false)}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmQuotation}
                disabled={isPlacingOrder}
                className="h-11"
              >
                Generate Quotation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Order Placement Overlay */}
      {isPlacingOrder &&
        (actionType === "place" || actionType === "quotation") && (
          <div className="fixed inset-0 z-50">
            <OrderPlacementOverlay step={orderStep} isCheckoutRedirect={false} />
          </div>
        )}
    </div>
  );
}
