"use client";

import "@/app/i18n";
import React, { useEffect, useMemo, useState } from "react";
import useCartStore from "@/store";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EmptyCart from "@/components/EmptyCart";
import PriceFormatter from "@/components/PriceFormatter";
import { CartPromotionGroupCard } from "./CartPromotionGroup";
import { AddressSelector } from "./AddressSelector";
import { CheckoutButton } from "./CheckoutButton";
import { PersonalizedOffers } from "@/components/promotions/PersonalizedOffers";
import { useCart } from "@/hooks/useCart";
import { useTaxRate } from "@/lib/hooks/useTaxRate";
import { usePricingSettings } from "@/lib/hooks/usePricingSettings";
import { buildCartViewModel } from "@/lib/cart/grouping";
import { buildDiscountBreakdown } from "@/lib/cart/discountBreakdown";
import {
  NEW_QUOTE_FEATURE,
  REQUEST_QUOTE_FROM_CART_ENABLED,
} from "@/lib/featureFlags";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/orderStatus";
import {
  CreditCard,
  FileText,
  Sparkles,
  ShoppingBag,
  Tag,
  Trash2,
  Wallet,
  BadgeDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { AppliedPromotionBadge } from "@/components/cart/AppliedPromotionBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Address } from "@/lib/address";
import { useTranslation } from "react-i18next";

interface ServerCartContentProps {
  userEmail: string;
  userAddresses: Address[];
  onAddressesRefresh?: () => Promise<void>;
  abandonmentStatus?: "none" | "at_risk" | "abandoned" | "recovered";
}

export function ServerCartContent({
  userEmail,
  userAddresses,
  onAddressesRefresh,
}: ServerCartContentProps) {
  const { t } = useTranslation();
  const { items } = useCartStore();
  const { cart, clearCart, updateItem, removeItem, applyPromoCode, removePromoCode } = useCart();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedQuotationDetails, setSelectedQuotationDetails] =
    useState<Address | null>(null);
  const [selectedSalesContactId, setSelectedSalesContactId] = useState<
    string | null
  >(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>(PAYMENT_METHODS.STRIPE);
  const [userProfile, setUserProfile] = useState<{
    isBusiness: boolean;
    businessStatus?: string;
    membershipType?: string;
    premiumStatus?: string;
  } | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDiscountDetails, setShowDiscountDetails] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isRemovingPromo, setIsRemovingPromo] = useState(false);
  const newQuotesEnabled = NEW_QUOTE_FEATURE;
  const canRequestQuotation =
    newQuotesEnabled && REQUEST_QUOTE_FROM_CART_ENABLED;
  const taxRate = useTaxRate();
  const {
    dealerDiscountPercent,
    showDealerDiscount,
    dealerFreeShippingEnabled,
    premiumFreeShippingEnabled,
  } = usePricingSettings();

  useEffect(() => {
    if (selectedAddress) return;
    const defaultAddress = userAddresses.find((addr) => addr.default);
    if (defaultAddress) {
      setSelectedAddress(defaultAddress);
      return;
    }
    if (userAddresses.length > 0) {
      setSelectedAddress(userAddresses[0]);
    }
  }, [userAddresses, selectedAddress]);

  useEffect(() => {
    if (!userEmail) return;

    const fetchUserProfile = async () => {
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

    fetchUserProfile();
  }, [userEmail]);

  const isInvoiceEligible = Boolean(
    userProfile?.isBusiness ||
      userProfile?.businessStatus === "active" ||
      userProfile?.membershipType === "business"
  );

  useEffect(() => {
    if (isInvoiceEligible) return;
    if (
      selectedPaymentMethod === PAYMENT_METHODS.CLERK ||
      selectedPaymentMethod === PAYMENT_METHODS.CREDIT
    ) {
      setSelectedPaymentMethod(PAYMENT_METHODS.STRIPE);
    }
  }, [isInvoiceEligible, selectedPaymentMethod]);

  const effectiveQuotationDetails =
    selectedQuotationDetails ?? selectedAddress;
  
  // Build the grouped cart view model
  const cartViewModel = useMemo(() => {
    if (!cart) return null;
    return buildCartViewModel(cart);
  }, [cart]);

  const discountBreakdown = useMemo(
    () => buildDiscountBreakdown(cart?.items ?? []),
    [cart]
  );
  
  // Calculate cart context for personalized offers
  const cartContext = useMemo(
    () => ({
      cartValue: cart?.total ?? 0,
      cartItems:
        cart?.items.map((item) => ({
          productId: item.productId,
          categoryId: item.product?.categories?.[0],
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })) ?? [],
    }),
    [cart]
  );
  
  const handleRemoveGroup = async (groupId: string) => {
    if (!cart) return;
    
    const itemsToRemove = cart.items.filter((item) => {
      const promo = item.appliedPromotion;
      const itemGroupId = promo ? `${promo.type}:${promo.id}` : "ungrouped";
      return itemGroupId === groupId;
    });
    
    try {
      for (const item of itemsToRemove) {
        await removeItem(item.id);
      }
      toast.success(t("client.cart.actions.removeGroupSuccess"));
    } catch {
      toast.error(t("client.cart.actions.removeGroupError"));
    }
  };
  
  const handleUpdateItemQuantity = async (itemId: string, quantity: number) => {
    try {
      await updateItem(itemId, quantity);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("client.cart.actions.updateQuantityError");
      toast.error(message);
    }
  };
  
  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success(t("client.cart.actions.removeItemSuccess"));
    } catch {
      toast.error(t("client.cart.actions.removeItemError"));
    }
  };
  
  const handleClearCart = async () => {
    try {
      await clearCart();
      setShowClearModal(false);
      toast.success(t("client.cart.actions.clearSuccess"));
    } catch {
      toast.error(t("client.cart.actions.clearError"));
    }
  };

  const handleApplyPromo = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const code = promoCode.trim();
    if (!code) {
      setPromoError(t("client.cart.promo.enterCode"));
      return;
    }

    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      await applyPromoCode(code);
      setPromoCode("");
      toast.success(t("client.cart.promo.applied"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("client.cart.promo.applyError");
      setPromoError(message);
      toast.error(message);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromos = async () => {
    setIsRemovingPromo(true);
    setPromoError(null);
    try {
      await removePromoCode();
      toast.success(t("client.cart.promo.removed"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("client.cart.promo.removeError");
      setPromoError(message);
      toast.error(message);
    } finally {
      setIsRemovingPromo(false);
    }
  };
  
  if (!cartViewModel || cartViewModel.groups.length === 0) {
    return <EmptyCart />;
  }
  
  const { summary } = cartViewModel;
  const roundCurrency = (value: number) => Number(value.toFixed(2));
  const isBusinessAccount = Boolean(
    userProfile?.isBusiness ||
      userProfile?.businessStatus === "active" ||
      userProfile?.membershipType === "business"
  );
  const isPremiumAccount = Boolean(
    userProfile?.membershipType === "premium" ||
      userProfile?.premiumStatus === "active"
  );
  const dealerDiscountRate =
    dealerDiscountPercent > 0 ? dealerDiscountPercent / 100 : 0;
  const dealerDiscountLabel = Number.isInteger(dealerDiscountPercent)
    ? dealerDiscountPercent.toFixed(0)
    : dealerDiscountPercent.toFixed(2);
  const totalDiscount = summary.totalDiscount ?? 0;
  const currentSubtotal = Math.max(0, summary.subtotal - totalDiscount);
  const businessDiscount = isBusinessAccount
    ? Math.min(currentSubtotal, currentSubtotal * dealerDiscountRate)
    : 0;
  const finalSubtotal = Math.max(0, currentSubtotal - businessDiscount);
  const hasMemberFreeShipping =
    (dealerFreeShippingEnabled && isBusinessAccount) ||
    (premiumFreeShippingEnabled && isPremiumAccount);
  const shipping = hasMemberFreeShipping
    ? 0
    : finalSubtotal >= 100
      ? 0
      : 10;
  const tax = finalSubtotal * taxRate;
  const total = finalSubtotal + shipping + tax;
  const orderTotals = {
    subtotal: roundCurrency(finalSubtotal),
    shipping: roundCurrency(shipping),
    tax: roundCurrency(tax),
    total: roundCurrency(total),
  };
  const appliedPromotions = summary.appliedPromotions ?? cart?.appliedPromotions ?? [];
  const appliedPromoCodes = appliedPromotions.filter(
    (promotion) => promotion.type === "promotion"
  );
  const hasPromoCodes = appliedPromoCodes.length > 0;
  const appliedPromotionLabels = appliedPromotions
    .filter((promotion) => promotion.discountAmount > 0)
    .map((promotion) => {
      const name = promotion.name || promotion.id;
      if (!name) return null;
      const code = promotion.id && promotion.id !== name ? promotion.id : "";
      return code ? `${name} (${code})` : name;
    })
    .filter((label): label is string => Boolean(label))
    .join(", ");
  const hasDiscountBreakdown =
    summary.totalDiscount > 0 && discountBreakdown.length > 0;
  
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Cart Items - Grouped by Promotion */}
      <div className="lg:col-span-2 space-y-4">
        {/* Cart Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">
              {summary.itemCount === 1
                ? t("client.cart.summary.items.single", {
                    count: summary.itemCount,
                  })
                : t("client.cart.summary.items.plural", {
                    count: summary.itemCount,
                  })}
            </span>
            {summary.promotionCount > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Tag className="w-3 h-3 mr-1" />
                {summary.promotionCount === 1
                  ? t("client.cart.summary.deals.single", {
                      count: summary.promotionCount,
                    })
                  : t("client.cart.summary.deals.plural", {
                      count: summary.promotionCount,
                    })}
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setShowClearModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {t("client.cart.actions.clear")}
          </Button>
        </div>
        
        {/* Promotion Groups */}
        <div className="space-y-4">
          {cartViewModel.groups.map((group) => (
            <CartPromotionGroupCard
              key={group.groupId}
              group={group}
              onRemoveGroup={handleRemoveGroup}
              onUpdateItemQuantity={handleUpdateItemQuantity}
              onRemoveItem={handleRemoveItem}
              defaultExpanded={group.groupType === "ungrouped"}
            />
          ))}
        </div>
        
        {/* Personalized Offers */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <h3 className="font-medium">
              {t("client.cart.promos.addMoreSavings")}
            </h3>
          </div>
          <PersonalizedOffers
            context="cart"
            cartValue={cartContext.cartValue}
            cartItems={cartContext.cartItems}
            variant="card"
            maxOffers={3}
          />
        </div>
      </div>
      
      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">
                {t("client.cart.orderSummary.title")}
              </CardTitle>
              <CardDescription>
                {canRequestQuotation
                  ? t("client.cart.orderSummary.descriptionWithQuote")
                  : t("client.cart.orderSummary.description")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-3">
                <form onSubmit={handleApplyPromo} className="space-y-2">
                  <Label htmlFor="promo-code" className="text-sm font-medium">
                    {t("client.cart.promo.label")}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id="promo-code"
                      name="promo-code"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      placeholder={t("client.cart.promo.placeholder")}
                      className="min-w-[180px] flex-1"
                      disabled={isApplyingPromo || isRemovingPromo}
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      className="h-9"
                      disabled={
                        isApplyingPromo ||
                        isRemovingPromo ||
                        promoCode.trim().length === 0
                      }
                    >
                      {isApplyingPromo
                        ? t("client.cart.promo.applying")
                        : t("client.cart.promo.apply")}
                    </Button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-destructive">{promoError}</p>
                  )}
                  {hasPromoCodes && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("client.cart.promo.appliedLabel")}</span>
                      {appliedPromoCodes.map((promotion) => (
                        <AppliedPromotionBadge
                          key={`promo-${promotion.id}`}
                          promotion={promotion}
                          className="text-[11px]"
                        />
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={handleRemovePromos}
                        disabled={isRemovingPromo}
                      >
                        {isRemovingPromo
                          ? t("client.cart.promo.removing")
                          : t("client.cart.promo.remove")}
                      </Button>
                    </div>
                  )}
                </form>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("client.cart.totals.subtotal")}
                  </span>
                  <PriceFormatter
                    amount={summary.subtotal}
                    className="text-sm font-semibold tabular-nums"
                  />
                </div>

                {summary.totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-emerald-700">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {t("client.cart.totals.discount")}
                    </span>
                    <span className="flex items-center gap-1 font-semibold tabular-nums">
                      -{" "}
                      <PriceFormatter
                        amount={summary.totalDiscount}
                        className="text-sm font-semibold text-emerald-700"
                      />
                    </span>
                  </div>
                )}

                {showDealerDiscount && businessDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-blue-600">
                    <span title={t("client.cart.totals.dealerDiscountHint")}>
                      {t("client.cart.totals.dealerDiscount", {
                        percent: dealerDiscountLabel,
                      })}
                    </span>
                    <span className="font-semibold tabular-nums">
                      -{" "}
                      <PriceFormatter
                        amount={businessDiscount}
                        className="text-sm font-semibold text-blue-600"
                      />
                    </span>
                  </div>
                )}

                {summary.totalDiscount > 0 && appliedPromotionLabels ? (
                  <div className="text-xs text-emerald-700">
                    {t("client.cart.promo.appliedList", {
                      promos: appliedPromotionLabels,
                    })}
                  </div>
                ) : null}

                {hasDiscountBreakdown && (
                  <div className="rounded-md border border-emerald-100/80 bg-emerald-50/60 p-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowDiscountDetails((prev) => !prev)}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      {showDiscountDetails
                        ? t("client.cart.totals.hideDetails")
                        : t("client.cart.totals.viewDetails")}
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

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("client.cart.totals.shipping")}
                  </span>
                  {shipping === 0 ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      {t("client.cart.totals.free")}
                    </span>
                  ) : (
                    <PriceFormatter
                      amount={orderTotals.shipping}
                      className="text-sm font-semibold tabular-nums"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("client.cart.totals.tax")}
                  </span>
                  <PriceFormatter
                    amount={orderTotals.tax}
                    className="text-sm font-semibold tabular-nums"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between text-base font-semibold">
                  <span>{t("client.cart.totals.total")}</span>
                  <PriceFormatter
                    amount={orderTotals.total}
                    className="text-base font-semibold tabular-nums"
                  />
                </div>
              </div>

              {summary.totalDiscount > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-center">
                  <p className="text-sm text-emerald-800">
                    {t("client.cart.totals.savingsPrefix")}{" "}
                    <strong className="font-semibold">
                      <PriceFormatter
                        amount={summary.totalDiscount}
                        className="text-sm font-semibold text-emerald-800"
                      />
                    </strong>{" "}
                    {t("client.cart.totals.savingsSuffix")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <AddressSelector
            userEmail={userEmail}
            addresses={userAddresses}
            selectedAddress={selectedAddress}
            onAddressSelect={setSelectedAddress}
            onAddressesRefresh={onAddressesRefresh}
            selectedQuotationDetails={selectedQuotationDetails}
            onQuotationDetailsSelect={setSelectedQuotationDetails}
            selectedSalesContactId={selectedSalesContactId}
            onSalesContactSelect={setSelectedSalesContactId}
          />

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">
                {t("client.cart.payment.title")}
              </CardTitle>
              <CardDescription>
                {t("client.cart.payment.description")}
              </CardDescription>
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
                  htmlFor="cart-payment-stripe"
                  className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
                >
                  <RadioGroupItem
                    value={PAYMENT_METHODS.STRIPE}
                    id="cart-payment-stripe"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <CreditCard className="h-4 w-4" />
                      {t("client.cart.payment.methods.card.title")}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("client.cart.payment.methods.card.description")}
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="cart-payment-cod"
                  className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
                >
                  <RadioGroupItem
                    value={PAYMENT_METHODS.CASH_ON_DELIVERY}
                    id="cart-payment-cod"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Wallet className="h-4 w-4" />
                      {t("client.cart.payment.methods.cod.title")}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("client.cart.payment.methods.cod.description")}
                    </p>
                  </div>
                </Label>

                {isInvoiceEligible && (
                  <Label
                    htmlFor="cart-payment-credit"
                    className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
                  >
                    <RadioGroupItem
                      value={PAYMENT_METHODS.CREDIT}
                      id="cart-payment-credit"
                      className="mt-1"
                    />
                    <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <BadgeDollarSign className="h-4 w-4" />
                      {t("client.cart.payment.methods.credit.title")}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("client.cart.payment.methods.credit.description")}
                    </p>
                    </div>
                  </Label>
                )}

                {isInvoiceEligible && (
                  <Label
                    htmlFor="cart-payment-clerk"
                    className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 focus-within:ring-2 focus-within:ring-ring/40"
                  >
                    <RadioGroupItem
                      value={PAYMENT_METHODS.CLERK}
                      id="cart-payment-clerk"
                      className="mt-1"
                    />
                    <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4" />
                      {t("client.cart.payment.methods.invoice.title")}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("client.cart.payment.methods.invoice.description")}
                    </p>
                    </div>
                  </Label>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">
                {selectedPaymentMethod === PAYMENT_METHODS.STRIPE
                  ? t("client.cart.checkout.titleCheckout")
                  : t("client.cart.checkout.titleOrder")}
              </CardTitle>
              <CardDescription>
                {selectedPaymentMethod === PAYMENT_METHODS.STRIPE
                  ? canRequestQuotation
                    ? t("client.cart.checkout.descriptionQuote")
                    : t("client.cart.checkout.description")
                  : t("client.cart.checkout.descriptionOrder")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CheckoutButton
                cart={items}
                selectedAddress={selectedAddress}
                quotationDetails={effectiveQuotationDetails}
                selectedQuotationDetails={selectedQuotationDetails}
                salesContactId={selectedSalesContactId}
                selectedPaymentMethod={selectedPaymentMethod}
                orderTotals={orderTotals}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Clear Cart Confirmation Dialog */}
      <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("client.cart.clearDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("client.cart.clearDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearModal(false)}>
              {t("client.cart.clearDialog.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleClearCart}>
              {t("client.cart.clearDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
