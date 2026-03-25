type PromotionLike = {
  slug?: string | { current?: string | null } | null;
  campaignId?: string | null;
};

type BuildOptions = {
  fallback?: string;
};

export const resolvePromotionSlug = (promotion?: PromotionLike | null): string | null => {
  if (!promotion) return null;
  const slugValue =
    typeof promotion.slug === "string"
      ? promotion.slug
      : promotion.slug?.current;
  return slugValue?.trim() || null;
};

export const buildPromotionHref = (promotion?: PromotionLike | null, options: BuildOptions = {}): string => {
  const fallback = options.fallback ?? "/promotions";
  if (!promotion) return fallback;

  const slug = resolvePromotionSlug(promotion);
  if (slug) return `/promotions/${slug}`;

  if (promotion.campaignId) return `/promotions/${promotion.campaignId}`;

  return fallback;
};
