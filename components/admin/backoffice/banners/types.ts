import { HERO_PLACEMENTS } from "@/constants/bannerConfig";

export type BannerPlacementValue = (typeof HERO_PLACEMENTS)[number]["value"];

export type BannerAnnounceState = {
  publishAsBanner: boolean;
  bannerSettings: {
    bannerPlacement: BannerPlacementValue | string;
    heroVariant?: "light" | "dark";
    startDate?: string;
    endDate?: string;
    titleOverride?: string;
    descriptionOverride?: string;
    ctaLabel?: string;
    ctaUrlOverride?: string;
    ctaStyle?: "primary" | "secondary" | "ghost";
  };
};

export const DEFAULT_BANNER_ANNOUNCE_STATE: BannerAnnounceState = {
  publishAsBanner: false,
  bannerSettings: {
    bannerPlacement: "sitewidepagehero",
    heroVariant: "light",
  },
};

export const BANNER_PLACEMENT_OPTIONS = HERO_PLACEMENTS;
