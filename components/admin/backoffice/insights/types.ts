import type { PortableTextBlock } from "@/types/portableText";
import type { InsightTypeKey } from "@/constants/insightTypes";
import type { BannerAnnounceState } from "@/components/admin/backoffice/banners/types";

export type InsightStatus = "draft" | "published" | "archived";

export type InsightReferenceOption = {
  id: string;
  label: string;
  description?: string;
};

export type InsightFormState = {
  _id?: string;
  thId?: string;
  title: string;
  titleTh?: string;
  slug: string;
  locale: string;
  status: InsightStatus;
  insightType: InsightTypeKey;
  summary: string;
  summaryTh?: string;
  body: PortableTextBlock[];
  bodyTh?: PortableTextBlock[];
  authorId?: string | null;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  primaryKeyword: string;
  primaryKeywordTh?: string;
  primaryKeywordVolume: number | null;
  primaryKeywordDifficulty: number | null;
  heroImageAssetId?: string | null;
  heroImageAlt?: string;
  heroImageCaption?: string;
  heroLayout?: "standard" | "fullBleed" | "imageLeft" | "imageRight" | "banner";
  heroTheme?: "light" | "dark" | "overlay";
  publishAsBanner?: boolean;
  bannerSettings?: BannerAnnounceState["bannerSettings"];
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  seoCanonicalUrl?: string;
  seoKeywords?: string[];
  seoNoIndex?: boolean;
  seoOgImageAssetId?: string | null;
};
