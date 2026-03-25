"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { DealCountdown } from "@/components/DealCountdown";
import { buildPromotionHref } from "@/lib/promotions/paths";
import "@/app/i18n";

export interface PromotionHeroProps {
  promotion: {
    campaignId: string;
    name: string;
    heroMessage: string;
    heroImage?: { url: string; alt?: string };
    discountType: string;
    discountValue: number;
    badgeLabel: string;
    badgeColor?: string;
    ctaText: string;
    ctaLink?: string;
    startDate: string;
    endDate: string;
    urgencyTrigger?: {
      showCountdown: boolean;
      urgencyMessage?: string;
    };
    assignedVariant?: {
      copy?: string;
      cta?: string;
    };
  };
  analytics?: {
    impressions: number;
    conversions: number;
  };
  personalOffer?: {
    discountDisplay: string;
    eligibilityReason: string;
  };
  state?: "active" | "scheduled" | "ended" | "paused";
  variant?: "default" | "large" | "featured" | "compact";
  showCountdown?: boolean;
  className?: string;
}

const variantStyles: Record<NonNullable<PromotionHeroProps["variant"]>, string> = {
  default: "py-12 px-6",
  large: "py-20 px-8 min-h-[500px]",
  featured: "py-16 px-8 bg-gradient-to-r from-primary to-primary-dark",
  compact: "py-6 px-4",
};

export function PromotionHero({
  promotion,
  analytics,
  personalOffer,
  variant = "default",
  showCountdown = true,
  className = "",
}: PromotionHeroProps) {
  const { t, i18n } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const endTime = new Date(promotion.endDate).getTime();
    if (Number.isNaN(endTime)) {
      setTimeRemaining(null);
      return undefined;
    }

    const updateRemaining = () => {
      const now = Date.now();
      setTimeRemaining(Math.max(0, endTime - now));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [promotion.endDate]);

  const discountDisplay = formatDiscount(t, promotion.discountType, promotion.discountValue);
  const displayMessage = promotion.assignedVariant?.copy || promotion.heroMessage;
  const displayCta = promotion.assignedVariant?.cta || promotion.ctaText;
  const keyCandidates = [
    resolvePromotionContentKey(promotion.campaignId),
    resolvePromotionContentKey(promotion.name),
  ].filter(Boolean) as string[];
  const localizedBadgeLabel = getLocalizedCmsField(
    i18n,
    t,
    keyCandidates,
    "badgeLabel",
    promotion.badgeLabel
  );
  const localizedName = getLocalizedCmsField(
    i18n,
    t,
    keyCandidates,
    "name",
    promotion.name
  );
  const localizedMessage = getLocalizedCmsField(
    i18n,
    t,
    keyCandidates,
    "heroMessage",
    displayMessage
  );
  const localizedCta = getLocalizedCmsField(
    i18n,
    t,
    keyCandidates,
    "ctaText",
    displayCta
  );
  const ctaHref = promotion.ctaLink || buildPromotionHref(promotion);
  const heroImageUrl = promotion.heroImage?.url;
  const shouldShowCountdown =
    showCountdown &&
    promotion.urgencyTrigger?.showCountdown &&
    timeRemaining !== null &&
    timeRemaining > 0;

  return (
    <section
      className={`promotion-hero relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white ${variantStyles[variant]} ${className}`}
    >
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt={promotion.heroImage?.alt || localizedName || t("client.promotions.hero.imageAlt")}
          fill
          priority={variant === "featured"}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
        <span
          className="mb-4 inline-block rounded-full px-4 py-1 text-sm font-bold"
          style={{ backgroundColor: promotion.badgeColor || "#FF5733" }}
        >
          {localizedBadgeLabel}
        </span>

        <div className="mb-4 text-5xl font-black md:text-7xl">{discountDisplay}</div>

        <h1 className="mb-4 text-2xl font-bold md:text-4xl">{localizedName}</h1>
        {localizedMessage ? (
          <p className="mb-6 text-lg opacity-90 md:text-xl">{localizedMessage}</p>
        ) : null}

        {personalOffer ? (
          <div className="mb-6 inline-block rounded-lg bg-white/20 p-4 backdrop-blur">
            <p className="font-bold text-yellow-300">
              {t("client.promotions.personalOffer.title")}: {personalOffer.discountDisplay}
            </p>
            <p className="text-sm opacity-80">{personalOffer.eligibilityReason}</p>
          </div>
        ) : null}

        {shouldShowCountdown ? (
          <div className="mb-6">
            <DealCountdown targetDate={promotion.endDate} />
            {promotion.urgencyTrigger?.urgencyMessage ? (
              <p className="mt-2 font-bold text-yellow-300">
                {promotion.urgencyTrigger.urgencyMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        <Link
          href={ctaHref}
          className="inline-block rounded-lg bg-white px-8 py-4 text-lg font-bold text-gray-900 transition-colors hover:bg-gray-100"
        >
          {localizedCta}
        </Link>

        {analytics && analytics.conversions > 10 ? (
          <p className="mt-4 text-sm opacity-75">
            {t("client.promotions.hero.conversions", { count: analytics.conversions })}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function formatDiscount(
  t: (key: string, options?: Record<string, unknown>) => string,
  type: string,
  value: number
): string {
  switch (type) {
    case "percentage":
      return t("client.promotions.discount.percentage", { value });
    case "fixed":
    case "fixed_amount":
    case "fixedAmount":
      return t("client.promotions.discount.fixed", { value });
    case "freeShipping":
      return t("client.promotions.discount.freeShipping");
    case "bxgy":
      return t("client.promotions.discount.bxgy");
    default:
      return t("client.promotions.discount.percentage", { value });
  }
}

function resolvePromotionContentKey(source?: string) {
  const raw = (source || "").trim().toLowerCase();
  return raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLocalizedCmsField(
  i18n: { exists: (key: string) => boolean },
  t: (key: string, options?: Record<string, unknown>) => string,
  candidates: string[],
  field: "badgeLabel" | "name" | "heroMessage" | "ctaText",
  fallback: string
) {
  for (const key of candidates) {
    const i18nKey = `client.promotions.cms.${key}.${field}`;
    if (i18n.exists(i18nKey)) {
      return t(i18nKey);
    }
  }

  return fallback;
}

export default PromotionHero;
