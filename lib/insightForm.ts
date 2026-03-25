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
  mainImageAssetId: string;
  primaryCategoryId: string;
  categoryIds: string;
  tags: string;
  linkedProductIds: string;
  linkedInsightIds: string;
  pillarPageId: string;
  primaryKeyword: string;
  primaryKeywordTh: string;
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
  mainImageAssetId: "",
  primaryCategoryId: "",
  categoryIds: "",
  tags: "",
  linkedProductIds: "",
  linkedInsightIds: "",
  pillarPageId: "",
  primaryKeyword: "",
  primaryKeywordTh: "",
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

  if (values.secondaryKeywords.trim()) {
    const lines = values.secondaryKeywords
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const [keyword, volume, difficulty] = line
        .split("|")
        .map((part) => part.trim());

      if (!keyword) {
        errors.secondaryKeywords =
          "Secondary keywords must start with a keyword.";
        break;
      }

      if (volume) {
        const volumeValue = Number(volume);
        if (!Number.isFinite(volumeValue)) {
          errors.secondaryKeywords =
            "Secondary keyword volume must be a number.";
          break;
        }
      }

      if (difficulty) {
        const difficultyValue = Number(difficulty);
        if (
          !Number.isFinite(difficultyValue) ||
          difficultyValue < INSIGHT_VALIDATION_LIMITS.keywordDifficultyMin ||
          difficultyValue > INSIGHT_VALIDATION_LIMITS.keywordDifficultyMax
        ) {
          errors.secondaryKeywords =
            "Secondary keyword difficulty must be between 0 and 100.";
          break;
        }
      }
    }
  }

  if (values.solutionProducts.trim()) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(values.solutionProducts);
    } catch (error) {
      errors.solutionProducts = "Solution products must be a JSON array.";
    }

    if (!errors.solutionProducts) {
      if (!Array.isArray(parsed)) {
        errors.solutionProducts = "Solution products must be a JSON array.";
      } else {
        for (const entry of parsed) {
          if (!entry || typeof entry !== "object") {
            errors.solutionProducts =
              "Each solution product must be an object.";
            break;
          }

          const typedEntry = entry as {
            productId?: string;
            product?: string;
            quantity?: number | string;
          };
          const productId = typedEntry.productId || typedEntry.product;

          if (!productId || typeof productId !== "string") {
            errors.solutionProducts =
              "Each solution product needs a productId (or product).";
            break;
          }

          if (typedEntry.quantity !== undefined && typedEntry.quantity !== null) {
            const quantityValue = Number(typedEntry.quantity);
            if (!Number.isFinite(quantityValue) || quantityValue < 1) {
              errors.solutionProducts =
                "Solution product quantity must be 1 or more.";
              break;
            }
          }
        }
      }
    }
  }

  return { errors };
};
