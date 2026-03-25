"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { DealCountdown } from "@/components/DealCountdown";
import {
  usePromotionEligibility,
  type EligibilityContext,
  type EligiblePromotion,
} from "@/hooks/usePromotionEligibility";
import { usePromotionTracking } from "@/hooks/usePromotionTracking";
import { buildPromotionHref } from "@/lib/promotions/paths";

export type PersonalizedOffer = {
  campaignId: string;
  name: string;
  description?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  discountSummary?: string;
  eligibilityReason?: string;
  variant?: string | null;
};

export interface PersonalizedOffersProps {
  context: "pdp" | "cart" | "checkout" | "homepage" | "promotion-page";
  offers?: PersonalizedOffer[];
  productId?: string;
  productCategory?: string;
  productPrice?: number;
  cartValue?: number;
  cartItems?: EligibilityContext["cartItems"];
  variant?: "strip" | "card" | "banner" | "inline";
  maxOffers?: number;
  showIfEmpty?: boolean;
  className?: string;
}

export function PersonalizedOffers({
  context,
  offers,
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
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const hasManualOffers = Array.isArray(offers) && offers.length > 0;

  const cartItemsForEligibility = useMemo<EligibilityContext["cartItems"]>(() => {
    if (!cartItems?.length) return undefined;
    const fallbackPrice = productPrice ?? cartValue ?? 0;
    return cartItems.map((item) => ({
      productId: item.productId,
      categoryId: item.categoryId,
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? fallbackPrice,
    }));
  }, [cartItems, cartValue, productPrice]);

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
    enabled: !hasManualOffers,
  });

  const { trackClick, trackView } = usePromotionTracking();

  type NormalizedOffer = {
    campaignId: string;
    name: string;
    discountDisplay: string;
    eligibilityReason?: string;
    badgeLabel?: string;
    ctaText?: string | null;
    ctaLink?: string | null;
    timeRemaining?: number;
    endsAt?: string;
    shortDescription?: string | null;
    assignedVariant?: string | null;
  };

  const normalizeOffer = (offer: EligiblePromotion | PersonalizedOffer): NormalizedOffer | null => {
    if (!offer || typeof offer !== "object" || !offer.campaignId) return null;

    const asEligible = offer as EligiblePromotion;
    const asManual = offer as PersonalizedOffer;

    const discountDisplay =
      (asEligible as { discountDisplay?: string }).discountDisplay ||
      asManual.discountSummary ||
      t("client.promotions.personalized.fallbackDiscount", "Special offer");

    return {
      campaignId: offer.campaignId,
      name: offer.name || t("client.promotions.personalized.fallbackName", "Personalized offer"),
      discountDisplay,
      eligibilityReason: (offer as { eligibilityReason?: string }).eligibilityReason,
      badgeLabel: (asEligible as { badgeLabel?: string }).badgeLabel,
      ctaText: (offer as { ctaText?: string | null }).ctaText ?? null,
      ctaLink: (offer as { ctaLink?: string | null }).ctaLink ?? null,
      timeRemaining: (asEligible as { timeRemaining?: number }).timeRemaining,
      endsAt: (asEligible as { endsAt?: string }).endsAt,
      shortDescription:
        (asEligible as { shortDescription?: string | null }).shortDescription ??
        (asManual as { description?: string | null }).description ??
        null,
      assignedVariant:
        (asEligible as {
          assignedVariant?: "control" | "variantA" | "variantB" | null;
        }).assignedVariant ??
        (asManual as { variant?: string | null }).variant ??
        null,
    };
  };

  const visibleOffers = useMemo(() => {
    const sourceOffers =
      hasManualOffers && offers
        ? offers
        : eligible?.length
          ? eligible
          : bestPromotion
            ? [bestPromotion]
            : [];

    const normalized =
      sourceOffers
        ?.map((offer) => normalizeOffer(offer))
        .filter((offer): offer is NormalizedOffer => Boolean(offer)) || [];

    return normalized.filter((offer) => !dismissed.has(offer.campaignId)).slice(0, maxOffers);
  }, [hasManualOffers, offers, eligible, bestPromotion, dismissed, maxOffers]);

  const resolveHref = (offer: NormalizedOffer) =>
    offer.ctaLink || buildPromotionHref({ campaignId: offer.campaignId });

  const visibleOfferIds = useMemo(
    () => visibleOffers.map((offer) => offer.campaignId).join(","),
    [visibleOffers]
  );

  useEffect(() => {
    if (!visibleOffers.length) return;
    visibleOffers.forEach((offer) => {
      trackView(offer.campaignId, { page: context, variant: offer.assignedVariant || undefined });
    });
  }, [context, trackView, visibleOffers, visibleOfferIds]);

  useEffect(() => {
    const dismissedKey = `promo_dismissed_${context}`;
    try {
      const stored = JSON.parse(sessionStorage.getItem(dismissedKey) || "[]");
      setDismissed(new Set(Array.isArray(stored) ? stored : []));
    } catch {
      setDismissed(new Set());
    }
  }, [context]);

  const handleDismiss = (campaignId: string) => {
    const dismissedKey = `promo_dismissed_${context}`;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(campaignId);
      try {
        const current = JSON.parse(sessionStorage.getItem(dismissedKey) || "[]");
        const updated = Array.isArray(current)
          ? Array.from(new Set([...current, campaignId]))
          : [campaignId];
        sessionStorage.setItem(dismissedKey, JSON.stringify(updated));
      } catch {
        sessionStorage.setItem(dismissedKey, JSON.stringify([campaignId]));
      }
      return next;
    });
  };

  const handleClick = (offer: NormalizedOffer) => {
    trackClick(offer.campaignId, {
      page: context,
      variant: offer.assignedVariant || undefined,
      productId,
    });
  };

  if (!hasManualOffers && isLoading) {
    return variant === "strip" ? (
      <div className={`h-12 animate-pulse rounded-lg bg-gray-100 ${className}`} />
    ) : null;
  }

  if (visibleOffers.length === 0) {
    return showIfEmpty ? (
      <div className={`py-4 text-center text-sm text-gray-400 ${className}`}>
        {t(
          "client.promotions.personalized.empty",
          "No special offers available right now"
        )}
      </div>
    ) : null;
  }

  if (variant === "strip") {
    const offer = visibleOffers[0];
    return (
      <div
        className={`offer-strip relative rounded-lg bg-gradient-to-r from-primary to-primary-dark p-3 text-white ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {offer.discountDisplay} - {offer.name}
              </p>
              <p className="truncate text-xs opacity-90">
                {offer.eligibilityReason ||
                  t(
                    "client.promotions.personalized.qualify",
                    "You qualify for this offer"
                  )}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {offer.timeRemaining && offer.timeRemaining < 86400 ? (
              <span className="rounded bg-white/20 px-2 py-1 text-xs">
                {t("client.promotions.personalized.endsSoon", "Ends soon")}
              </span>
            ) : null}

            <Link
              href={resolveHref(offer)}
              onClick={() => handleClick(offer)}
              className="flex-shrink-0 rounded bg-white px-4 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-gray-100"
            >
              {offer.ctaText || t("client.promotions.personalized.claim", "Claim")}
            </Link>
          </div>

          <button
            onClick={() => handleDismiss(offer.campaignId)}
            className="absolute right-1 top-1 p-1 text-white/60 hover:text-white"
            aria-label={t("client.promotions.personalized.dismissOffer", "Dismiss offer")}
          >
            x
          </button>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`offer-cards space-y-3 ${className}`}>
        <h3 className="text-lg font-bold">
          {t("client.promotions.personalized.cardTitle", "Special offers for you")}
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
                aria-label={t("client.promotions.personalized.dismiss", "Dismiss")}
              >
                x
              </button>

              <span className="mb-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {offer.badgeLabel ||
                  t("client.promotions.personalized.badgeLabel", "Personalized")}
              </span>

              <p className="mb-1 text-2xl font-black text-primary">{offer.discountDisplay}</p>

              <p className="font-medium text-gray-900">{offer.name}</p>
              <p className="mb-3 text-sm text-gray-500">{offer.shortDescription}</p>
              <p className="mt-2 text-center text-xs text-gray-400">
                {offer.eligibilityReason ||
                  t(
                    "client.promotions.personalized.qualify",
                    "You qualify for this offer"
                  )}
              </p>

              {offer.timeRemaining && offer.timeRemaining < 86400 * 3 ? (
                <div className="mb-2 text-xs text-orange-600">
                  <DealCountdown targetDate={offer.endsAt} />
                </div>
              ) : null}

              <Link
                href={resolveHref(offer)}
                onClick={() => handleClick(offer)}
                className="block w-full rounded bg-primary py-2 text-center text-sm font-bold text-white transition-colors hover:bg-primary-dark"
              >
                {offer.ctaText || t("client.promotions.personalized.shopNow", "Shop Now")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    const offer = visibleOffers[0];
    return (
      <div
        className={`offer-banner relative rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-gray-900 ${className}`}
      >
        <button
          onClick={() => handleDismiss(offer.campaignId)}
          className="absolute right-3 top-3 text-gray-700/60 hover:text-gray-900"
          aria-label={t("client.promotions.personalized.dismiss", "Dismiss")}
        >
          x
        </button>

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <span className="mb-2 inline-block rounded-full bg-white/30 px-3 py-1 text-sm font-bold">
              {offer.badgeLabel ||
                t("client.promotions.personalized.badgeLabel", "Personalized")}
            </span>
            <h3 className="mb-2 text-3xl font-black md:text-4xl">{offer.discountDisplay}</h3>
            <p className="text-lg font-medium">{offer.name}</p>
            <p className="text-sm opacity-80">
              {offer.eligibilityReason ||
                t(
                  "client.promotions.personalized.qualify",
                  "You qualify for this offer"
                )}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            {offer.timeRemaining && offer.endsAt ? (
              <DealCountdown targetDate={offer.endsAt} />
            ) : null}
            <Link
              href={resolveHref(offer)}
              onClick={() => handleClick(offer)}
              className="rounded-lg bg-gray-900 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-gray-800"
            >
              {offer.ctaText ||
                t("client.promotions.personalized.claimOffer", "Claim Offer")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    const offer = visibleOffers[0];
    return (
      <div className={`offer-inline flex items-center gap-2 text-sm ${className}`}>
        <span>
          <strong>{offer.discountDisplay}</strong>{" "}
          {t("client.promotions.personalized.inlineAvailable", {
            defaultValue: "available: {{name}}",
            name: offer.name,
          })}
        </span>
        <Link
          href={resolveHref(offer)}
          onClick={() => handleClick(offer)}
          className="font-medium text-primary hover:underline"
        >
          {t("client.promotions.personalized.apply", "Apply")} -&gt;
        </Link>
      </div>
    );
  }

  return null;
}
