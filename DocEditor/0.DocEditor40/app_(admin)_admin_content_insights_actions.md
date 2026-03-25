"use server";

import { revalidatePath } from "next/cache";
import {
  backofficeReadClient,
  withActionAuth,
} from "@/actions/backoffice/common";
import {
  listInsights,
  setInsightStatus,
  upsertInsight,
  deleteInsight,
  type InsightFilters,
  type InsightRecord,
  type InsightInput,
} from "@/actions/backoffice/insightsActions";
import { slugify } from "@/lib/slugify";
import type {
  InsightFormState,
  InsightReferenceOption,
} from "@/components/admin/backoffice/insights/types";

export type InsightListRow = {
  id: string;
  title: string;
  slug?: string;
  status?: string;
  insightType?: string;
  updatedAt?: string;
  publishedAt?: string;
  authorName?: string;
  primaryCategory?: string;
};

export type InsightListParams = {
  search?: string;
  status?: string;
  insightType?: string;
  page?: number;
  pageSize?: number;
  locale?: string;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const sanitizeMatchTerm = (value?: string) =>
  (value ?? "")
    .replace(/[*?]/g, "")
    .trim()
    .replace(/\s+/g, " ");

const normalizePage = (params: InsightListParams) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const pickUpdatedDate = (record: InsightRecord) =>
  record.updatedAt || record._updatedAt || record._createdAt;

const formatListRow = (insight: InsightRecord): InsightListRow => ({
  id: insight._id,
  title: insight.title ?? "Untitled insight",
  slug: insight.slug?.current,
  status: insight.status,
  insightType: insight.insightType,
  updatedAt: pickUpdatedDate(insight),
  publishedAt: insight.publishedAt,
  authorName: insight.author?.name,
  primaryCategory: insight.primaryCategory?.title,
});

export async function fetchInsightsTable(
  params: InsightListParams = {},
): Promise<{ items: InsightListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, offset } = normalizePage(params);
  const search = sanitizeMatchTerm(params.search);
  const insightTypeValue =
    params.insightType && params.insightType !== "all"
      ? (params.insightType as InsightFilters["insightType"])
      : undefined;
  const result = await listInsights({
    limit: pageSize,
    offset,
    search: search || undefined,
    status:
      params.status && params.status !== "all"
        ? (params.status as InsightFilters["status"])
        : undefined,
    insightType: insightTypeValue,
    locale: params.locale,
  });

  if (!result.success || !result.data) {
    throw new Error("Unable to load insights right now.");
  }

  const items = result.data.items.map(formatListRow);

  return { items, total: result.data.total, page, pageSize };
}

export async function saveInsight(values: InsightFormState): Promise<{
  success: boolean;
  id?: string;
  status?: string;
  message?: string;
}> {
  const slugValue = values.slug?.trim() || slugify(values.title ?? "");
  const titleValue = (values.title ?? "").trim();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const volume = values.primaryKeywordVolume;
  const difficulty = values.primaryKeywordDifficulty;

  if (!titleValue) {
    return { success: false, message: "Title is required." };
  }
  if (!slugValue || !slugPattern.test(slugValue)) {
    return { success: false, message: "Slug must contain lowercase letters, numbers, and hyphens." };
  }
  if (volume != null && (Number.isNaN(volume) || volume < 0)) {
    return { success: false, message: "Search volume must be 0 or greater." };
  }
  if (difficulty != null && (Number.isNaN(difficulty) || difficulty < 0 || difficulty > 100)) {
    return { success: false, message: "Keyword difficulty must be between 0 and 100." };
  }

  const categoriesProvided = Array.isArray(values.categoryIds);
  const categoryIds = categoriesProvided ? (values.categoryIds ?? []).filter(Boolean) : [];

  const payload: InsightInput = {
    _id: values._id,
    title: titleValue || "Untitled insight",
    titleTh: values.titleTh?.trim() || undefined,
    slug: { current: slugValue },
    locale: values.locale?.trim() || undefined,
    status: values.status ?? "draft",
    insightType: values.insightType || undefined,
    summary: values.summary?.trim() || undefined,
    summaryTh: values.summaryTh?.trim() || undefined,
    body: values.body && values.body.length > 0 ? (values.body as any) : undefined,
    bodyTh: values.bodyTh && values.bodyTh.length > 0 ? (values.bodyTh as any) : undefined,
    heroImage: values.heroImageAssetId
      ? {
          _type: "image",
          asset: { _ref: values.heroImageAssetId },
          alt: values.heroImageAlt || undefined,
          caption: values.heroImageCaption || undefined,
        }
      : undefined,
    heroLayout: values.heroLayout || "standard",
    heroTheme: values.heroTheme || "light",
    author: values.authorId ? { _type: "reference", _ref: values.authorId } : undefined,
    primaryCategory: values.primaryCategoryId
      ? { _type: "reference", _ref: values.primaryCategoryId }
      : undefined,
    categories:
      categoriesProvided && categoryIds.length
        ? categoryIds.map((id) => ({ _type: "reference", _ref: id }))
        : undefined,
    primaryKeyword: values.primaryKeyword?.trim() || undefined,
    primaryKeywordVolume:
      typeof values.primaryKeywordVolume === "number" ? values.primaryKeywordVolume : undefined,
    primaryKeywordDifficulty:
      typeof values.primaryKeywordDifficulty === "number" ? values.primaryKeywordDifficulty : undefined,
    publishAsBanner: values.publishAsBanner ?? false,
    bannerSettings: values.bannerSettings
      ? {
          ...values.bannerSettings,
          startDate: values.bannerSettings.startDate
            ? new Date(values.bannerSettings.startDate).toISOString()
            : undefined,
          endDate: values.bannerSettings.endDate ? new Date(values.bannerSettings.endDate).toISOString() : undefined,
        }
      : undefined,
  };

  const result = await upsertInsight(payload);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "Failed to save insight" };
  }

  const insightId = result.data._id;

  revalidatePath("/admin/content/insights");
  revalidatePath(`/admin/content/insights/${insightId}`);

  return { success: true, id: insightId, status: payload.status };
}

export async function updateInsightStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<{ success: boolean; message?: string }> {
  const result = await setInsightStatus(id, status);

  if (!result.success) {
    return { success: false, message: result.message ?? "Failed to update status" };
  }

  revalidatePath("/admin/content/insights");
  revalidatePath(`/admin/content/insights/${id}`);

  return { success: true };
}

export async function deleteInsightById(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "Missing insight id." };
  }

  const result = await deleteInsight(normalizedId);

  if (!result.success) {
    return { success: false, message: result.message ?? "Failed to delete insight" };
  }

  revalidatePath("/admin/content/insights");
  revalidatePath(`/admin/content/insights/${normalizedId}`);

  return { success: true };
}

export async function searchInsightAuthors(query: string): Promise<InsightReferenceOption[]> {
  const term = sanitizeMatchTerm(query);
  const searchPattern = term ? `*${term}*` : "*";
  const result = await withActionAuth(
    "content.insights.read",
    async () => {
      const authors = await backofficeReadClient.fetch<
        { _id: string; name?: string; title?: string }[]
      >(
        `*[_type == "insightAuthor" && name match $search] | order(name asc) [0...8] {
          _id,
          name,
          title
        }`,
        { search: searchPattern },
      );

      return authors;
    },
    { actionName: "searchInsightAuthors" },
  );

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "Unable to search authors");
  }

  return result.data.map((author) => ({
    id: author._id,
    label: author.name ?? "Untitled author",
    description: author.title ?? undefined,
  }));
}

export async function searchInsightCategories(query: string): Promise<InsightReferenceOption[]> {
  const term = sanitizeMatchTerm(query);
  const searchPattern = term ? `*${term}*` : "*";
  const result = await withActionAuth(
    "content.insights.read",
    async () => {
      const categories = await backofficeReadClient.fetch<
        { _id: string; title?: string; categoryType?: string }[]
      >(
        `*[_type == "insightCategory" && title match $search] | order(title asc) [0...8] {
          _id,
          title,
          categoryType
        }`,
        { search: searchPattern },
      );

      return categories;
    },
    { actionName: "searchInsightCategories" },
  );

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "Unable to search categories");
  }

  return result.data.map((category) => ({
    id: category._id,
    label: category.title ?? "Untitled category",
    description: category.categoryType ? category.categoryType : undefined,
  }));
}
