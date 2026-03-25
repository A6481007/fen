import type { PortableTextBlock } from "@/types/portableText";
import type { BannerAnnounceState } from "@/components/admin/backoffice/banners/types";

export type NewsStatus = "draft" | "published";
export type NewsCategory = "announcement" | "partnership" | "event_announcement" | "general";
export type NewsAttachmentFileType = "pdf" | "image" | "document" | "link";
export type NewsAttachmentStatus = "public" | "event_locked";

export type NewsAttachment = {
  _key?: string;
  title?: string;
  description?: string;
  fileType?: NewsAttachmentFileType;
  status?: NewsAttachmentStatus;
  linkUrl?: string;
  href?: string;
  file?: {
    asset?: {
      _ref?: string;
      _id?: string;
      url?: string;
      originalFilename?: string;
      size?: number;
      mimeType?: string;
      extension?: string;
    };
  };
  access?: {
    isVisible?: boolean | null;
    lockReason?: string | null;
    unlockDate?: string | null;
  };
};

export type NewsFormState = {
  _id?: string;
  title: string;
  titleTh?: string;
  slug: string;
  locale: string;
  publishDate: string;
  category: NewsCategory;
  status?: NewsStatus;
  content?: PortableTextBlock[];
  contentTh?: PortableTextBlock[];
  linkedEventId?: string | null;
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

export type NewsReferenceOption = {
  id: string;
  label: string;
  description?: string;
};

// Backoffice reference picker shape
export type ReferenceOption = NewsReferenceOption;
