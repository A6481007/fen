"use server";

import { revalidateTag } from "next/cache";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  EMPLOYEE_INSIGHTS_LIST_QUERY,
  EMPLOYEE_INSIGHT_DETAIL_QUERY,
  INSIGHT_AUTHORS_FOR_OPTIONS_QUERY,
  INSIGHT_CATEGORIES_FOR_OPTIONS_QUERY,
  INSIGHTS_FOR_OPTIONS_QUERY,
  INSIGHT_PRODUCTS_FOR_OPTIONS_QUERY,
} from "@/sanity/queries/insight";
import {
  type InsightFormValues,
  normalizeSlug,
  parseDelimitedList,
  validateInsightForm,
} from "@/lib/insightForm";

type InsightMutationResult = {
  success: boolean;
  message: string;
  insightId?: string;
  errors?: Record<string, string>;
};

const generateKey = () => Math.random().toString(36).slice(2, 10);
const revalidateTagSafe = (tag: string) => (revalidateTag as unknown as (t: string) => void)(tag);

const buildBlockContent = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed.split(/\n{2,}/).map((paragraph) => ({
    _type: "block",
    _key: generateKey(),
    style: "normal",
    children: [
      {
        _type: "span",
        _key: generateKey(),
        text: paragraph.trim(),
      },
    ],
  }));
};

const buildReference = (id?: string | null) => {
  if (!id) return undefined;
  return { _type: "reference", _ref: id };
};

const buildReferenceArray = (ids: string[]) =>
  ids.map((id) => ({
    _type: "reference",
    _ref: id,
    _key: generateKey(),
  }));

const parseDateValue = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const parseSecondaryKeywords = (raw: string) => {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const [keyword, volume, difficulty] = line.split("|").map((value) => value.trim());
      if (!keyword) return null;
      return {
        _type: "secondaryKeyword",
        _key: generateKey(),
        keyword,
        volume: volume ? Number(volume) : undefined,
        difficulty: difficulty ? Number(difficulty) : undefined,
      };
    })
    .filter(Boolean) as Array<{
    _type: "secondaryKeyword";
    _key: string;
    keyword: string;
    volume?: number;
    difficulty?: number;
  }>;
};

const parseJsonArray = (raw: string) => {
  if (!raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch (error) {
    return undefined;
  }
};

const buildInsightPayload = (
  values: InsightFormValues,
  options: { status: string; forcePublishedAt?: boolean }
) => {
  const normalizedSlug = normalizeSlug(values.slug);
  const readingTime = values.readingTime ? Number(values.readingTime) : undefined;
  const keywordVolume = values.primaryKeywordVolume
    ? Number(values.primaryKeywordVolume)
    : undefined;
  const keywordDifficulty = values.primaryKeywordDifficulty
    ? Number(values.primaryKeywordDifficulty)
    : undefined;

  const publishedAt = options.forcePublishedAt
    ? parseDateValue(values.publishedAt) || new Date().toISOString()
    : parseDateValue(values.publishedAt);

  const categories = parseDelimitedList(values.categoryIds);
  const tags = parseDelimitedList(values.tags);
  const linkedProducts = parseDelimitedList(values.linkedProductIds);
  const linkedInsights = parseDelimitedList(values.linkedInsightIds);
  const mainImageAssetId = values.mainImageAssetId.trim();

  const secondaryKeywords = parseSecondaryKeywords(values.secondaryKeywords);
  const metrics = parseJsonArray(values.metrics);
  const solutionProducts = parseJsonArray(values.solutionProducts);

  const payload: Record<string, unknown> = {
    title: values.title.trim(),
    slug: normalizedSlug ? { _type: "slug", current: normalizedSlug } : undefined,
    insightType: values.insightType || undefined,
    summary: values.summary.trim() || undefined,
    body: values.body.trim() ? buildBlockContent(values.body) : undefined,
    readingTime: Number.isFinite(readingTime) ? readingTime : undefined,
    status: options.status,
    author: buildReference(values.authorId.trim()),
    reviewer: buildReference(values.reviewerId.trim()),
    publishedAt,
    nextReviewDate: parseDateValue(values.nextReviewDate),
    updatedAt: new Date().toISOString(),
    primaryCategory: buildReference(values.primaryCategoryId.trim()),
    categories: categories.length ? buildReferenceArray(categories) : undefined,
    tags: tags.length ? tags : undefined,
    mainImage: mainImageAssetId
      ? { _type: "image", asset: { _type: "reference", _ref: mainImageAssetId } }
      : undefined,
    linkedProducts: linkedProducts.length ? buildReferenceArray(linkedProducts) : undefined,
    linkedInsights: linkedInsights.length ? buildReferenceArray(linkedInsights) : undefined,
    pillarPage: buildReference(values.pillarPageId.trim()),
    primaryKeyword: values.primaryKeyword.trim() || undefined,
    primaryKeywordVolume: Number.isFinite(keywordVolume) ? keywordVolume : undefined,
    primaryKeywordDifficulty: Number.isFinite(keywordDifficulty) ? keywordDifficulty : undefined,
    secondaryKeywords: secondaryKeywords.length ? secondaryKeywords : undefined,
    seoMetadata: buildReference(values.seoMetadataId.trim()),
    solutionMaturity: values.solutionMaturity.trim() || undefined,
    solutionComplexity: values.solutionComplexity.trim() || undefined,
    implementationTimeline: values.implementationTimeline.trim() || undefined,
    clientContext:
      values.clientName.trim() ||
      values.clientIndustry.trim() ||
      values.clientChallenge.trim() ||
      values.clientSolution.trim()
        ? {
            clientName: values.clientName.trim() || undefined,
            industry: values.clientIndustry.trim() || undefined,
            challengeDescription: values.clientChallenge.trim() || undefined,
            solutionDescription: values.clientSolution.trim() || undefined,
          }
        : undefined,
    metrics:
      metrics?.length
        ? metrics.map((metric) => ({
            _type: "metric",
            _key: generateKey(),
            metricLabel: metric.metricLabel,
            metricValue: metric.metricValue,
            metricDescription: metric.metricDescription,
          }))
        : undefined,
    solutionProducts:
      solutionProducts?.length
        ? solutionProducts
            .map((entry) => ({
              _type: "solutionProduct",
              _key: generateKey(),
              product: buildReference(entry.productId || entry.product),
              quantity: entry.quantity,
              isRequired: entry.isRequired,
              notes: entry.notes,
            }))
            .filter((entry) => entry.product)
        : undefined,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
};

export async function getEmployeeInsights() {
  try {
    const insights = await backendClient.fetch(EMPLOYEE_INSIGHTS_LIST_QUERY);
    return insights ?? [];
  } catch (error) {
    console.error("Error fetching employee insights:", error);
    return [];
  }
}

export async function getEmployeeInsightById(id: string) {
  try {
    const insight = await backendClient.fetch(EMPLOYEE_INSIGHT_DETAIL_QUERY, { id });
    return insight ?? null;
  } catch (error) {
    console.error("Error fetching insight detail:", error);
    return null;
  }
}

export async function getInsightCategories() {
  try {
    const categories = await backendClient.fetch(INSIGHT_CATEGORIES_FOR_OPTIONS_QUERY);
    return categories ?? [];
  } catch (error) {
    console.error("Error fetching insight categories:", error);
    return [];
  }
}

export async function getInsightFormOptions() {
  try {
    const [authors, categories, insights, products] = await Promise.all([
      backendClient.fetch(INSIGHT_AUTHORS_FOR_OPTIONS_QUERY),
      backendClient.fetch(INSIGHT_CATEGORIES_FOR_OPTIONS_QUERY),
      backendClient.fetch(INSIGHTS_FOR_OPTIONS_QUERY),
      backendClient.fetch(INSIGHT_PRODUCTS_FOR_OPTIONS_QUERY),
    ]);

    return {
      authors: authors ?? [],
      categories: categories ?? [],
      insights: insights ?? [],
      products: products ?? [],
    };
  } catch (error) {
    console.error("Error fetching insight form options:", error);
    return { authors: [], categories: [], insights: [], products: [] };
  }
}

export async function createInsight(
  values: InsightFormValues,
  intent: "draft" | "publish" = "draft"
): Promise<InsightMutationResult> {
  try {
    const { errors } = validateInsightForm(values, {
      requirePublishedAt: intent === "publish",
    });

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Please fix the highlighted fields.",
        errors,
      };
    }

    const payload = buildInsightPayload(values, {
      status: intent === "publish" ? "published" : "draft",
      forcePublishedAt: intent === "publish",
    });

    const created = await backendClient.create({
      _type: "insight",
      ...payload,
    });

    revalidateTagSafe("insights");
    revalidateTagSafe("insight-categories");

    return {
      success: true,
      message:
        intent === "publish"
          ? "Insight published successfully."
          : "Insight draft created.",
      insightId: created?._id,
    };
  } catch (error) {
    console.error("Error creating insight:", error);
    return {
      success: false,
      message: "Failed to create insight.",
    };
  }
}

export async function updateInsight(
  values: InsightFormValues & { id: string },
  intent: "save" | "publish" = "save"
): Promise<InsightMutationResult> {
  try {
    if (!values.id) {
      return { success: false, message: "Missing insight ID." };
    }

    const { errors } = validateInsightForm(values, {
      requirePublishedAt: intent === "publish",
    });

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Please fix the highlighted fields.",
        errors,
      };
    }

    const status =
      intent === "publish"
        ? "published"
        : values.status || "draft";

    const payload = buildInsightPayload(values, {
      status,
      forcePublishedAt: intent === "publish",
    });

    const updated = await backendClient.patch(values.id).set(payload).commit();

    revalidateTagSafe("insights");
    revalidateTagSafe("insight-categories");

    return {
      success: true,
      message:
        intent === "publish"
          ? "Insight published successfully."
          : "Insight updated.",
      insightId: updated?._id ?? values.id,
    };
  } catch (error) {
    console.error("Error updating insight:", error);
    return {
      success: false,
      message: "Failed to update insight.",
    };
  }
}
