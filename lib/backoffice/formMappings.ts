/**
 * Static mappings between backoffice UI sections and Sanity schema fields.
 * These mappings mirror fieldsets/groups from docs/admin_panel_scope/03_sanity_schema_inventory.md
 * so designers can reorganize tabs while retaining 1:1 traceability.
 */
export type FormSectionMapping = Record<string, string[]>;

export const insightFormSections: FormSectionMapping = {
  content: ["title", "slug", "insightType", "summary", "mainImage", "body", "readingTime"],
  metadata: [
    "status",
    "publishedAt",
    "nextReviewDate",
    "primaryKeyword",
    "primaryKeywordTh",
    "secondaryKeywords",
  ],
  relationships: [
    "author",
    "reviewer",
    "categories",
    "primaryCategory",
    "tags",
    "linkedProducts",
    "linkedInsights",
    "pillarPage",
    "insightSeries",
  ],
  solutions: [
    "solutionMaturity",
    "solutionComplexity",
    "implementationTimeline",
    "clientContext",
    "metrics",
    "solutionProducts",
  ],
  seo: ["seoMetadata", "ogImage", "canonicalUrl", "noIndex"],
};

export const promotionFormSections: FormSectionMapping = {
  basics: [
    "name",
    "campaignId",
    "slug",
    "type",
    "status",
    "priority",
    "internalNotes",
  ],
  schedule: ["startDate", "endDate", "timezone", "publishedAt"],
  targeting: [
    "targetAudience.segmentType",
    "targetAudience.categories",
    "targetAudience.products",
    "targetAudience.excludedProducts",
    "targetAudience.cartAbandonmentThreshold",
    "targetAudience.inactivityDays",
  ],
  discount: ["discountType", "discountValue", "maximumDiscount", "minimumOrderValue"],
  limits: ["budgetCap", "usageLimit", "perCustomerLimit"],
  messaging: ["badgeLabel", "badgeColor", "heroMessage", "ctaText", "ctaLink", "urgencyTrigger"],
};

export const dealFormSections: FormSectionMapping = {
  setup: ["dealId", "dealType", "title", "status", "priority", "showOnHomepage"],
  pricing: [
    "product",
    "originalPrice",
    "dealPrice",
    "badge",
    "badgeColor",
    "startDate",
    "endDate",
  ],
  limits: ["quantityLimit", "perCustomerLimit", "soldCount"],
};
