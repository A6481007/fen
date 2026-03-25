import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PromotionAnalytics } from "@/lib/promotions/analytics";
import type { PROMOTION_BY_CAMPAIGN_ID_QUERYResult } from "@/sanity.types";
import { PromotionCountdown } from "./PromotionCountdown";
import type { PersonalizedOffer } from "./PersonalizedOffers";

type Promotion = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;

type PromotionHeroProps = {
  promotion: Promotion;
  analytics?: PromotionAnalytics | null;
  personalOffer?: PersonalizedOffer | null;
  state: "active" | "scheduled" | "ended" | "paused";
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getHeroImageUrl = (promotion: Promotion) => {
  const hero = promotion.heroImage as { asset?: { url?: string }; url?: string } | undefined;
  const thumb = promotion.thumbnailImage as { asset?: { url?: string }; url?: string } | undefined;
  return hero?.asset?.url || hero?.url || thumb?.asset?.url || thumb?.url || "";
};

export function PromotionHero({ promotion, analytics, personalOffer, state }: PromotionHeroProps) {
  const heroImageUrl = getHeroImageUrl(promotion);
  const isActive = state === "active";
  const isScheduled = state === "scheduled";
  const statusLabel =
    state === "active"
      ? "Active now"
      : state === "scheduled"
        ? "Coming soon"
        : state === "paused"
          ? "Temporarily paused"
          : "Ended";

  const countdownTarget = isScheduled ? promotion.startDate : promotion.endDate;
  const comingDate = isScheduled ? formatDate(promotion.startDate) : null;

  return (
    <Card className="overflow-hidden border border-gray-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.4fr,1fr]">
        <CardContent className="space-y-4 p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              {statusLabel}
            </Badge>
            {promotion.badgeLabel ? (
              <Badge variant="secondary" className="bg-gray-900 text-white">
                {promotion.badgeLabel}
              </Badge>
            ) : null}
            {personalOffer ? (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                Personalized
              </Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{promotion.name}</h1>
            {promotion.heroMessage ? (
              <p className="text-lg text-gray-700">{promotion.heroMessage}</p>
            ) : promotion.shortDescription ? (
              <p className="text-lg text-gray-700">{promotion.shortDescription}</p>
            ) : null}
          </div>

          <PromotionCountdown
            targetDate={countdownTarget || undefined}
            label={isScheduled ? "Starts in" : "Ends in"}
          />
          {isScheduled && comingDate ? (
            <p className="text-sm font-medium text-amber-700">Starts on {comingDate}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {typeof promotion.discountValue === "number" ? (
              <span className="font-semibold text-emerald-700">
                {promotion.discountType === "percentage"
                  ? `${Math.round(promotion.discountValue)}% off`
                  : `$${promotion.discountValue.toFixed(2)} off`}
              </span>
            ) : null}
            {promotion.type ? <span>Type: {promotion.type}</span> : null}
            {promotion.campaignId ? <span>Campaign: {promotion.campaignId}</span> : null}
            {analytics?.impressions !== undefined ? (
              <span>{(analytics.impressions || 0).toLocaleString()} views</span>
            ) : null}
          </div>

          {isActive && promotion.ctaLink ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={promotion.ctaLink}>{promotion.ctaText || "Shop the deal"}</Link>
              </Button>
              {promotion.ctaText ? (
                <p className="text-sm text-gray-600">Limited-time offer. Don&apos;t miss out.</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        <div className="relative h-72 bg-gradient-to-br from-gray-900 to-slate-800 lg:h-full">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={promotion.name || "Promotion"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
                Creative coming soon
              </p>
            </div>
          )}
          {personalOffer ? (
            <div className="absolute bottom-4 right-4 rounded-lg bg-white/90 p-3 shadow-lg backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">You qualify</p>
              <p className="text-sm font-bold text-gray-900">{personalOffer.discountSummary || "Personal offer"}</p>
              {personalOffer.eligibilityReason ? (
                <p className="text-xs text-gray-600">{personalOffer.eligibilityReason}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default PromotionHero;
