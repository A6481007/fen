import type { PromotionStatus } from "@/actions/backoffice/promotionsActions";
import type { BannerAnnounceState } from "@/components/admin/backoffice/banners/types";

export type PromotionReferenceSelection = {
  id: string;
  label?: string;
  quantity?: number;
};

export type PromotionTargetProductNode = {
  id: string;
  label: string;
  slug?: string;
  imageUrl?: string;
};

export type PromotionTargetCategoryNode = {
  id: string;
  title: string;
  slug?: string;
  productCount: number;
  children: PromotionTargetCategoryNode[];
  products: PromotionTargetProductNode[];
};

export type PromotionFormState = {
  _id?: string;
  name: string;
  campaignId: string;
  slug: string;
  locale: string;
  status: PromotionStatus;
  type: string;
  priority?: number;
  discountType: string;
  discountValue?: number;
  buyQuantity?: number;
  getQuantity?: number;
  minimumOrderValue?: number;
  startDate: string;
  endDate: string;
  timezone?: string;
  segmentType?: string;
  heroMessage?: string;
  shortDescription?: string;
  badgeLabel?: string;
  badgeColor?: string;
  ctaText?: string;
  ctaLink?: string;
  budgetCap?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  trackingPixelId?: string;
  internalNotes?: string;
  targetProducts: PromotionReferenceSelection[];
  targetCategories: PromotionReferenceSelection[];
  defaultProducts: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
    productLabel?: string;
  }>;
  defaultBundleItems: Array<{
    productId: string;
    quantity: number;
    isFree?: boolean;
    variantId?: string;
    productLabel?: string;
  }>;
  publishAsBanner?: boolean;
  bannerSettings?: BannerAnnounceState["bannerSettings"];
};
