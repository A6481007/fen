"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DealCountdown } from "@/components/DealCountdown";
import {
  usePromotionEligibility,
  type EligibilityContext,
  type EligiblePromotion,
} from "@/hooks/usePromotionEligibility";
import { usePromotionTracking } from "@/hooks/usePromotionTracking";

export interface PersonalizedOffersProps {
  // Where the component is displayed
  context: "pdp" | "cart" | "checkout" | "homepage" | "promotion-page";

  // Product context (for PDP)
  productId?: string;
  productCategory?: string;
  productPrice?: number;

  // Cart context
  cartValue?: number;
  cartItems?: Array<{ productId: string; categoryId: string }>;

  // Display options
  variant?: "strip" | "card" | "banner" | "inline";
  maxOffers?: number;
  showIfEmpty?: boolean;
  className?: string;
}

export function PersonalizedOffers({
  context,
  productId,
  productCategory,
  productPrice,
  cartValue,
  cartItems,
  variant = "strip",
  maxOffers = 2,
  showIfEmpty = false,
  className = "",
}: PersonalizedOffersProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const cartItemsForEligibility = useMemo<EligibilityContext["cartItems"]>(() => {
    if (!cartItems?.length) return undefined;
    const fallbackPrice = productPrice ?? cartValue ?? 0;
    return cartItems.map((item) => ({
      productId: item.productId,
      quantity: 1,
      price: fallbackPrice,
    }));
  }, [cartItems, cartValue, productPrice]);

  // Build eligibility context
  const eligibilityContext = useMemo<EligibilityContext>(
    () => ({
      page:
        context === "pdp"
          ? "product"
          : context === "cart" || context === "checkout"
            ? "cart"
            : "homepage",
      productId,
      categoryId: productCategory,
      cartValue: cartValue ?? productPrice,
      cartItems: cartItemsForEligibility,
    }),
    [context, productId, productCategory, cartValue, productPrice, cartItemsForEligibility]
  );

  const { eligible, isLoading, bestPromotion } = usePromotionEligibility({
    context: eligibilityContext,
    enabled: true,
  });

  const { trackClick, trackView } = usePromotionTracking();

  const visibleOffers = useMemo(() => {
    const offers = eligible?.length ? eligible : bestPromotion ? [bestPromotion] : [];
    return offers.filter((offer) => !dismissed.has(offer.campaignId)).slice(0, maxOffers);
  }, [eligible, bestPromotion, dismissed, maxOffers]);

  const visibleOfferIds = useMemo(
    () => visibleOffers.map((offer) => offer.campaignId).join(","),
    [visibleOffers]
  );

  // Track views
  useEffect(() => {
    if (!visibleOffers.length) return;
    visibleOffers.forEach((offer) => {
      trackView(offer.campaignId, { page: context, variant: offer.assignedVariant });
    });
  }, [context, trackView, visibleOffers, visibleOfferIds]);

  // Load dismissed from session storage
  useEffect(() => {
    const dismissedKey = `promo_dismissed_${context}`;
    try {
      const stored = JSON.parse(sessionStorage.getItem(dismissedKey) || "[]");
      setDismissed(new Set(Array.isArray(stored) ? stored : []));
    } catch {
      setDismissed(new Set());
    }
  }, [context]);

  // Handle dismiss
  const handleDismiss = (campaignId: string) => {
    const dismissedKey = `promo_dismissed_${context}`;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(campaignId);
      try {
        const current = JSON.parse(sessionStorage.getItem(dismissedKey) || "[]");
        const updated = Array.isArray(current) ? Array.from(new Set([...current, campaignId])) : [campaignId];
        sessionStorage.setItem(dismissedKey, JSON.stringify(updated));
      } catch {
        sessionStorage.setItem(dismissedKey, JSON.stringify([campaignId]));
      }
      return next;
    });
  };

  // Handle CTA click
  const handleClick = (offer: EligiblePromotion) => {
    trackClick(offer.campaignId, {
      page: context,
      variant: offer.assignedVariant,
      productId,
    });
  };

  // Loading state
  if (isLoading) {
    return variant === "strip" ? (
      <div className={`animate-pulse h-12 rounded-lg bg-gray-100 ${className}`} />
    ) : null;
  }

  // Empty state
  if (visibleOffers.length === 0) {
    return showIfEmpty ? (
      <div className={`text-center py-4 text-sm text-gray-400 ${className}`}>
        No special offers available right now
      </div>
    ) : null;
  }

  // Strip variant (compact, single line)
  if (variant === "strip") {
    const offer = visibleOffers[0];
    return (
      <div
        className={`offer-strip relative rounded-lg bg-gradient-to-r from-primary to-primary-dark p-3 text-white ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                {offer.discountDisplay} — {offer.name}
              </p>
              <p className="text-xs opacity-90 truncate">{offer.eligibilityReason}</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {offer.timeRemaining && offer.timeRemaining < 86400 && (
              <span className="rounded bg-white/20 px-2 py-1 text-xs">⏰ Ends soon</span>
            )}

            <Link
              href={offer.ctaLink || `/promotions/${offer.campaignId}`}
              onClick={() => handleClick(offer)}
              className="flex-shrink-0 rounded bg-white px-4 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-gray-100"
            >
              {offer.ctaText || "Claim"}
            </Link>
          </div>

          <button
            onClick={() => handleDismiss(offer.campaignId)}
            className="absolute right-1 top-1 p-1 text-white/60 hover:text-white"
            aria-label="Dismiss offer"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Card variant (for multiple offers)
  if (variant === "card") {
    return (
      <div className={`offer-cards space-y-3 ${className}`}>
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <span>🎁</span> Special Offers For You
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {visibleOffers.map((offer) => (
            <div
              key={offer.campaignId}
              className="offer-card relative rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
            >
              <button
                onClick={() => handleDismiss(offer.campaignId)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                aria-label="Dismiss"
              >
                ✕
              </button>

              <span className="mb-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {offer.badgeLabel}
              </span>

              <p className="mb-1 text-2xl font-black text-primary">{offer.discountDisplay}</p>

              <p className="font-medium text-gray-900">{offer.name}</p>
              <p className="mb-3 text-sm text-gray-500">{offer.shortDescription}</p>

              {offer.timeRemaining && offer.timeRemaining < 86400 * 3 ? (
                <div className="mb-2 text-xs text-orange-600">
                  <DealCountdown targetDate={offer.endsAt} />
                </div>
              ) : null}

              <Link
                href={offer.ctaLink || `/promotions/${offer.campaignId}`}
                onClick={() => handleClick(offer)}
                className="block w-full rounded bg-primary py-2 text-center text-sm font-bold text-white transition-colors hover:bg-primary-dark"
              >
                {offer.ctaText || "Shop Now"}
              </Link>

              <p className="mt-2 text-center text-xs text-gray-400">{offer.eligibilityReason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Banner variant (full-width, prominent)
  if (variant === "banner") {
    const offer = visibleOffers[0];
    return (
      <div
        className={`offer-banner relative rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-gray-900 ${className}`}
      >
        <button
          onClick={() => handleDismiss(offer.campaignId)}
          className="absolute right-3 top-3 text-gray-700/60 hover:text-gray-900"
          aria-label="Dismiss"
        >
          ✕
        </button>

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <span className="mb-2 inline-block rounded-full bg-white/30 px-3 py-1 text-sm font-bold">
              {offer.badgeLabel}
            </span>
            <h3 className="mb-2 text-3xl font-black md:text-4xl">{offer.discountDisplay}</h3>
            <p className="text-lg font-medium">{offer.name}</p>
            <p className="text-sm opacity-80">{offer.eligibilityReason}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            {offer.timeRemaining ? <DealCountdown targetDate={offer.endsAt} /> : null}
            <Link
              href={offer.ctaLink || `/promotions/${offer.campaignId}`}
              onClick={() => handleClick(offer)}
              className="rounded-lg bg-gray-900 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-gray-800"
            >
              {offer.ctaText || "Claim Offer"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (simple text)
  if (variant === "inline") {
    const offer = visibleOffers[0];
    return (
      <div className={`offer-inline flex items-center gap-2 text-sm ${className}`}>
        <span className="text-green-600">✓</span>
        <span>
          <strong>{offer.discountDisplay}</strong> available: {offer.name}
        </span>
        <Link
          href={offer.ctaLink || `/promotions/${offer.campaignId}`}
          onClick={() => handleClick(offer)}
          className="font-medium text-primary hover:underline"
        >
          Apply →
        </Link>
      </div>
    );
  }

  return null;
}
