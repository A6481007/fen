export type InsightStatus = "draft" | "published" | "archived";

export type InsightType =
  | "productKnowledge"
  | "generalKnowledge"
  | "problemKnowledge"
  | "comparison"
  | "caseStudy"
  | "validatedSolution"
  | "theoreticalSolution";

export type InsightFormValues = {
  title: string;
  slug: string;
  insightType: InsightType | "";
  summary: string;
  body: string;
  readingTime: string;
  status: InsightStatus;
  authorId: string;
  reviewerId: string;
  publishedAt: string;
  nextReviewDate: string;
  mainImageUrl: string;
  primaryCategoryId: string;
  categoryIds: string;
  tags: string;
  linkedProductIds: string;
  linkedInsightIds: string;
  pillarPageId: string;
  primaryKeyword: string;
  primaryKeywordVolume: string;
  primaryKeywordDifficulty: string;
  secondaryKeywords: string;
  seoMetadataId: string;
  solutionMaturity: string;
  solutionComplexity: string;
  implementationTimeline: string;
  clientName: string;
  clientIndustry: string;
  clientChallenge: string;
  clientSolution: string;
  metrics: string;
  solutionProducts: string;
};

export type InsightFormErrors = Partial<Record<keyof InsightFormValues, string>>;

export type InsightFormOptions = {
  authors: Array<{ _id: string; name?: string | null; title?: string | null }>;
  categories: Array<{ _id: string; title?: string | null; categoryType?: string | null }>;
  insights: Array<{ _id: string; title?: string | null }>;
  products: Array<{ _id: string; name?: string | null }>;
};

export const INSIGHT_STATUS_OPTIONS: Array<{ value: InsightStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export const INSIGHT_TYPE_OPTIONS: Array<{
  value: InsightType;
  label: string;
  group: "knowledge" | "solution";
}> = [
  { value: "productKnowledge", label: "Product Knowledge", group: "knowledge" },
  { value: "generalKnowledge", label: "General Knowledge", group: "knowledge" },
  { value: "problemKnowledge", label: "Problem Knowledge", group: "knowledge" },
  { value: "comparison", label: "Comparison Article", group: "knowledge" },
  { value: "caseStudy", label: "Case Study (Proven)", group: "solution" },
  { value: "validatedSolution", label: "Validated Solution (Tested)", group: "solution" },
  { value: "theoreticalSolution", label: "Theoretical Solution (Emerging)", group: "solution" },
];

export const INSIGHT_VALIDATION_LIMITS = {
  summaryMax: 300,
  tagsMax: 5,
  keywordDifficultyMin: 0,
  keywordDifficultyMax: 100,
};

export const EMPTY_INSIGHT_FORM_VALUES: InsightFormValues = {
  title: "",
  slug: "",
  insightType: "",
  summary: "",
  body: "",
  readingTime: "",
  status: "draft",
  authorId: "",
  reviewerId: "",
  publishedAt: "",
  nextReviewDate: "",
  mainImageUrl: "",
  primaryCategoryId: "",
  categoryIds: "",
  tags: "",
  linkedProductIds: "",
  linkedInsightIds: "",
  pillarPageId: "",
  primaryKeyword: "",
  primaryKeywordVolume: "",
  primaryKeywordDifficulty: "",
  secondaryKeywords: "",
  seoMetadataId: "",
  solutionMaturity: "",
  solutionComplexity: "",
  implementationTimeline: "",
  clientName: "",
  clientIndustry: "",
  clientChallenge: "",
  clientSolution: "",
  metrics: "",
  solutionProducts: "",
};

export const getInsightTypeLabel = (value?: string | null) => {
  if (!value) return "Unclassified";
  const match = INSIGHT_TYPE_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
};

export const getInsightTypeGroup = (value?: string | null) => {
  if (!value) return "knowledge";
  return INSIGHT_TYPE_OPTIONS.find((option) => option.value === value)?.group ?? "knowledge";
};

export const normalizeSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const parseDelimitedList = (value: string) => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const validateInsightForm = (
  values: InsightFormValues,
  options?: { requirePublishedAt?: boolean }
) => {
  const errors: InsightFormErrors = {};
  const requirePublishedAt = options?.requirePublishedAt ?? values.status === "published";

  if (!values.title.trim()) {
    errors.title = "Title is required.";
  }

  if (!values.slug.trim()) {
    errors.slug = "Slug is required.";
  }

  if (!values.insightType) {
    errors.insightType = "Insight type is required.";
  }

  if (!values.authorId.trim()) {
    errors.authorId = "Author is required.";
  }

  if (!values.primaryCategoryId.trim()) {
    errors.primaryCategoryId = "Primary category is required.";
  }

  if (requirePublishedAt && !values.publishedAt.trim()) {
    errors.publishedAt = "Publish date is required to publish.";
  }

  if (values.summary.length > INSIGHT_VALIDATION_LIMITS.summaryMax) {
    errors.summary = `Summary must be ${INSIGHT_VALIDATION_LIMITS.summaryMax} characters or less.`;
  }

  if (values.readingTime.trim()) {
    const minutes = Number(values.readingTime);
    if (!Number.isFinite(minutes) || minutes < 0) {
      errors.readingTime = "Reading time must be a positive number.";
    }
  }

  if (values.primaryKeywordDifficulty.trim()) {
    const difficulty = Number(values.primaryKeywordDifficulty);
    if (
      !Number.isFinite(difficulty) ||
      difficulty < INSIGHT_VALIDATION_LIMITS.keywordDifficultyMin ||
      difficulty > INSIGHT_VALIDATION_LIMITS.keywordDifficultyMax
    ) {
      errors.primaryKeywordDifficulty =
        "Keyword difficulty must be between 0 and 100.";
    }
  }

  const tags = parseDelimitedList(values.tags);
  if (tags.length > INSIGHT_VALIDATION_LIMITS.tagsMax) {
    errors.tags = `Limit tags to ${INSIGHT_VALIDATION_LIMITS.tagsMax}.`;
  }

  return { errors };
};
