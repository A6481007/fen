// Shared banner configuration used by Sanity schemas and admin UI.
// Keep this lightweight so it can be imported in both app and Studio code.

export type BannerToneOption = {
  value: string;
  label: string;
  description?: string;
  className?: string;
};

export type BannerCtaStyleOption = {
  value: "primary" | "secondary" | "ghost";
  label: string;
  description?: string;
};

export type BannerLayoutOption = {
  value: "split" | "spotlight" | "background" | "stacked";
  label: string;
  description: string;
};

const badgeToneOptions: BannerToneOption[] = [
  {
    value: "accent",
    label: "Accent",
    description: "High-emphasis red badge for primary offers.",
    className: "bg-accent-red text-white border-accent-red",
  },
  {
    value: "ink",
    label: "Ink",
    description: "Neutral dark badge for balanced layouts.",
    className: "bg-ink text-white border-ink",
  },
  {
    value: "muted",
    label: "Muted",
    description: "Soft gray badge for secondary highlights.",
    className: "bg-surface-2 text-ink border-border",
  },
  {
    value: "success",
    label: "Success",
    description: "Positive tone for availability or stock messages.",
    className: "bg-status-success/15 text-status-success border-status-success/30",
  },
];

const ctaStyleOptions: BannerCtaStyleOption[] = [
  { value: "primary", label: "Primary", description: "Solid, accent-forward action." },
  { value: "secondary", label: "Secondary", description: "Outlined neutral action." },
  { value: "ghost", label: "Ghost", description: "Text-first tertiary link." },
];

const layoutOptions: BannerLayoutOption[] = [
  {
    value: "split",
    label: "Split",
    description: "Text and media in two columns. Good for most heroes.",
  },
  {
    value: "spotlight",
    label: "Spotlight",
    description: "Text on the left, media framed in a card on the right.",
  },
  {
    value: "background",
    label: "Background",
    description: "Image as full-bleed backdrop with overlayed copy.",
  },
  {
    value: "stacked",
    label: "Stacked",
    description: "Copy above media for narrow/mobile-first compositions.",
  },
];

export const HERO_PLACEMENTS = [
  { value: "sitewidepagehero", label: "Sitewide (fallback)" },
  { value: "homepagehero", label: "Homepage" },
  { value: "blogpagehero", label: "Blog" },
  { value: "promotionspagehero", label: "Promotions" },
  { value: "dealpagehero", label: "Deals" },
  { value: "catalogpagehero", label: "Catalog" },
  { value: "productspagehero", label: "Products" },
  { value: "insightpagehero", label: "Insight" },
  { value: "insightslandinghero", label: "Insights Landing" },
  { value: "newspagehero", label: "News" },
  { value: "eventspagehero", label: "Events" },
  { value: "resourcespagehero", label: "Resources / Downloads" },
  { value: "shoppagehero", label: "Shop" },
  { value: "supportpagehero", label: "Support / Help / Contact" },
] as const;

export const getBadgeToneOptions = () => badgeToneOptions;
export const getCtaStyleOptions = () => ctaStyleOptions;
export const getLayoutOptions = () => layoutOptions;
