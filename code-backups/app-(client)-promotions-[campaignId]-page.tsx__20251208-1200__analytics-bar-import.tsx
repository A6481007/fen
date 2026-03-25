import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Container from "@/components/Container";
import PromotionHero from "@/components/promotions/PromotionHero";
import PromotionAnalyticsBar from "@/components/promotions/PromotionAnalyticsBar";
import PromotionGrid from "@/components/promotions/PromotionGrid";
import PromotionTerms from "@/components/promotions/PromotionTerms";
import RelatedPromotions from "@/components/promotions/RelatedPromotions";
import PersonalizedOffers, { type PersonalizedOffer } from "@/components/promotions/PersonalizedOffers";
import PromotionViewTracker from "@/components/promotions/PromotionViewTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPromotionAnalytics, type PromotionAnalytics } from "@/lib/promotions/analytics";
import { promotionEngine } from "@/lib/promotions/promotionEngine";
import {
  getActivePromotions,
  getPromotionByCampaignId,
  getPromotionsByType,
} from "@/sanity/queries";
import type {
  PROMOTION_BY_CAMPAIGN_ID_QUERYResult,
  PROMOTIONS_LIST_QUERYResult,
} from "@/sanity.types";
import { Timestamp } from "@/lib/firebaseAdmin";

type Promotion = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>;
type PromotionState = "active" | "scheduled" | "ended" | "paused";

const getImageUrl = (promotion: Promotion) => {
  const hero = promotion.heroImage as { asset?: { url?: string }; url?: string } | undefined;
  const thumb = promotion.thumbnailImage as { asset?: { url?: string }; url?: string } | undefined;
  return hero?.asset?.url || hero?.url || thumb?.asset?.url || thumb?.url || undefined;
};

const deriveState = (promotion: Promotion): PromotionState => {
  const now = Date.now();
  const startMs = promotion.startDate ? new Date(promotion.startDate).getTime() : NaN;
  const endMs = promotion.endDate ? new Date(promotion.endDate).getTime() : NaN;
  const hasEnded =
    promotion.status === "ended" ||
    promotion.isExpired === true ||
    (Number.isFinite(endMs) && endMs < now);
  const isPaused = promotion.status === "paused";
  const isScheduled =
    promotion.status === "scheduled" ||
    promotion.isUpcoming === true ||
    (!hasEnded && Number.isFinite(startMs) && startMs > now);

  if (hasEnded) return "ended";
  if (isPaused) return "paused";
  if (isScheduled) return "scheduled";
  return "active";
};

const buildPersonalOffer = (eligibleOffer: unknown): PersonalizedOffer | null => {
  if (!eligibleOffer || typeof eligibleOffer !== "object") return null;

  const offer = eligibleOffer as {
    promotion?: Promotion;
    discount?: { discountAmount?: number };
    eligibility?: { reason?: string; matchedCriteria?: string[] };
    assignedVariant?: { variant?: string | null };
  };

  const promotion = offer.promotion;
  if (!promotion) return null;

  const discountSummary =
    promotion.discountType === "percentage"
      ? `${Math.round(promotion.discountValue ?? 0)}% OFF`
      : promotion.discountType === "fixed"
        ? `$${(promotion.discountValue ?? 0).toFixed(2)} OFF`
        : promotion.discountType === "freeShipping"
          ? "Free shipping"
          : null;

  return {
    campaignId: promotion.campaignId || "",
    name: promotion.name || "Personalized promotion",
    description: promotion.shortDescription || promotion.heroMessage,
    ctaText: promotion.ctaText,
    ctaLink: promotion.ctaLink,
    discountSummary: discountSummary ?? undefined,
    eligibilityReason:
      offer.eligibility?.reason ||
      (offer.eligibility?.matchedCriteria?.length
        ? `Matched: ${offer.eligibility.matchedCriteria.join(", ")}`
        : undefined),
    variant: offer.assignedVariant?.variant || null,
  };
};

export async function generateMetadata({ params }: { params: { campaignId: string } }): Promise<Metadata> {
  const promotion = await getPromotionByCampaignId(params.campaignId);

  if (!promotion || promotion.status === "draft") {
    return { title: "Promotion Not Found" };
  }

  const state = deriveState(promotion);
  const siteName = "ShopCart";
  const description =
    promotion.shortDescription ||
    promotion.heroMessage ||
    "Explore limited-time offers and exclusive deals.";
  const imageUrl = getImageUrl(promotion);

  return {
    title: `${promotion.name} | ${siteName}`,
    description,
    openGraph: {
      title: promotion.name || `${siteName} Promotion`,
      description: promotion.heroMessage || description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: state === "ended" || state === "paused" ? "noindex" : "index",
  };
}

export async function generateStaticParams() {
  const promotions = await getActivePromotions();
  return promotions
    .filter((promotion) => promotion?.campaignId)
    .map((promotion) => ({ campaignId: promotion.campaignId as string }));
}

const getDefaultAnalytics = (): PromotionAnalytics => ({
  impressions: 0,
  clicks: 0,
  addToCarts: 0,
  conversions: 0,
  totalDiscountSpent: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
  conversionRate: 0,
  lastUpdated: Timestamp.fromMillis(0),
});

const StateNotice = ({ state }: { state: PromotionState }) => {
  const messages: Record<PromotionState, { title: string; body: string; tone: string }> = {
    active: { title: "Live now", body: "This promotion is currently active.", tone: "text-emerald-700" },
    scheduled: { title: "Coming soon", body: "This promotion is scheduled and will begin shortly.", tone: "text-amber-700" },
    paused: { title: "Temporarily paused", body: "We are updating this promotion. Please check back soon.", tone: "text-blue-700" },
    ended: { title: "Ended", body: "This promotion has ended. Explore related offers below.", tone: "text-gray-700" },
  };

  const message = messages[state];

  return (
    <Card className="border border-dashed border-gray-200 bg-gray-50/80">
      <CardContent className="flex items-start gap-3 p-4">
        <Badge variant="outline" className="mt-0.5 border-gray-200 bg-white text-gray-700">
          {message.title}
        </Badge>
        <p className={`text-sm font-medium ${message.tone}`}>{message.body}</p>
      </CardContent>
    </Card>
  );
};

const PromotionPage = async ({ params }: { params: { campaignId: string } }) => {
  const promotion = await getPromotionByCampaignId(params.campaignId);

  if (!promotion || promotion.status === "draft" || promotion.status === "archived") {
    return notFound();
  }

  const state = deriveState(promotion);
  const { userId } = await auth();

  const [analyticsRaw, relatedByType] = await Promise.all([
    getPromotionAnalytics(promotion.campaignId),
    promotion.type ? getPromotionsByType(promotion.type) : Promise.resolve([] as PROMOTIONS_LIST_QUERYResult),
  ]);

  const analytics = analyticsRaw ?? getDefaultAnalytics();
  const relatedPromotions =
    (relatedByType || []).filter((promo) => promo?.campaignId && promo.campaignId !== promotion.campaignId) ?? [];

  let userOffer: PersonalizedOffer | null = null;
  if (userId) {
    try {
      const eligibleOffers = await promotionEngine.getEligiblePromotions(userId, {
        page: "homepage",
      });
      const matchingOffer = eligibleOffers.find(
        (offer) => offer?.promotion?.campaignId === promotion.campaignId
      );
      userOffer = buildPersonalOffer(matchingOffer);
    } catch (error) {
      console.error("[promotions] Failed to resolve personalized eligibility", error);
    }
  }

  return (
    <main className="promotion-detail bg-gradient-to-b from-white via-slate-50 to-white">
      <PromotionViewTracker
        campaignId={promotion.campaignId}
        userId={userId}
      />

      <Container className="space-y-6 py-10">
        <PromotionHero
          promotion={promotion}
          analytics={analytics}
          personalOffer={userOffer || undefined}
          state={state}
        />

        <StateNotice state={state} />

        <PromotionAnalyticsBar analytics={analytics} showPublicStats />

        {userOffer ? <PersonalizedOffers offers={[userOffer]} context="promotion-page" /> : null}

        {state === "active" ? (
          <PromotionGrid
            products={promotion.products}
            campaignId={promotion.campaignId}
            discountType={promotion.discountType}
            discountValue={promotion.discountValue}
          />
        ) : null}

        <PromotionTerms promotion={promotion} />

        <RelatedPromotions
          currentId={promotion.campaignId}
          type={promotion.type}
          promotions={relatedPromotions}
        />
      </Container>
    </main>
  );
};

export default PromotionPage;
