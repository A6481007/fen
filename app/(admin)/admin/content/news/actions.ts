"use server";

import { revalidatePath } from "next/cache";
import {
  backofficeReadClient,
  withActionAuth,
} from "@/actions/backoffice/common";
import {
  addNewsAttachment,
  deleteNews,
  listNews,
  removeNewsAttachment,
  upsertNews,
  type NewsRecord,
  type NewsInput,
} from "@/actions/backoffice/newsActions";
import type { NewsAttachment, NewsFormState, NewsReferenceOption } from "@/components/admin/backoffice/news/types";
import { isValidNewsSlug, normalizeNewsSlug } from "@/lib/news/slug";
import { NEWS_CATEGORY_OPTIONS } from "@/lib/news/categories";

export type NewsListRow = {
  id: string;
  title: string;
  slug?: string;
  category?: string;
  publishDate?: string;
  updatedAt?: string;
  status?: string;
  linkedEventTitle?: string;
  attachmentsCount?: number;
};

export type NewsListParams = {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  locale?: string;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const normalizePage = (params: NewsListParams) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const pickUpdatedDate = (record: NewsRecord) =>
  record.updatedAt || record._updatedAt || record.publishDate || record._createdAt;

const formatListRow = (news: NewsRecord): NewsListRow => ({
  id: news._id,
  title: news.title ?? (news as { titleTh?: string }).titleTh ?? "",
  slug: news.slug?.current,
  category: news.category,
  publishDate: news.publishDate ?? news.publishedAt,
  updatedAt: pickUpdatedDate(news),
  status: news.status,
  linkedEventTitle: news.linkedEvent?.title,
  attachmentsCount: Array.isArray(news.attachments) ? news.attachments.length : 0,
});

export async function fetchNewsTable(
  params: NewsListParams = {},
): Promise<{ items: NewsListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, offset } = normalizePage(params);
  const result = await listNews({
    limit: pageSize,
    offset,
    search: params.search,
    category: params.category || undefined,
    locale: params.locale,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "admin.content.news.actions.errors.loadFailed");
  }

  const items = result.data.items.map(formatListRow);

  return { items, total: result.data.total, page, pageSize };
}

export async function saveNews(values: NewsFormState): Promise<{
  success: boolean;
  id?: string;
  status?: string;
  message?: string;
}> {
  const slugValue = normalizeNewsSlug((values.slug?.trim() || values.title) ?? "");
  if (!slugValue || !isValidNewsSlug(slugValue)) {
    return { success: false, message: "admin.news.errors.slugInvalid" };
  }

  const allowedCategories = new Set(NEWS_CATEGORY_OPTIONS.map((option) => option.value));
  const categoryValue = allowedCategories.has(values.category) ? values.category : "general";

  const allowedStatuses = new Set(["draft", "published"]);
  const statusValue = allowedStatuses.has(values.status ?? "") ? values.status : "draft";

  const publishDateIso = values.publishDate
    ? new Date(values.publishDate).toISOString()
    : new Date().toISOString();

  const toIso = (value?: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  const seoKeywords = (values.seoKeywords ?? []).map((keyword) => keyword.trim()).filter(Boolean);
  const hasSeoMetadata =
    Boolean(values.seoMetaTitle) ||
    Boolean(values.seoMetaDescription) ||
    Boolean(values.seoCanonicalUrl) ||
    Boolean(values.seoNoIndex) ||
    Boolean(values.seoOgImageAssetId) ||
    seoKeywords.length > 0;

  const payload: NewsInput = {
    _id: values._id,
    title: values.title?.trim() || slugValue,
    titleTh: values.titleTh?.trim(),
    slug: { current: slugValue },
    locale: values.locale || undefined,
    status: statusValue,
    publishDate: publishDateIso,
    category: categoryValue,
    content: (values.content as any) ?? [],
    contentTh: (values.contentTh as any) ?? [],
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
    linkedEvent: values.linkedEventId ? { _type: "reference", _ref: values.linkedEventId } : null,
    seoMetadata: hasSeoMetadata
      ? {
          metaTitle: values.seoMetaTitle || undefined,
          metaDescription: values.seoMetaDescription || undefined,
          canonicalUrl: values.seoCanonicalUrl || undefined,
          keywords: seoKeywords.length ? seoKeywords : undefined,
          noIndex: values.seoNoIndex ?? false,
          ogImage: values.seoOgImageAssetId
            ? { _type: "image", asset: { _ref: values.seoOgImageAssetId } }
            : undefined,
        }
      : null,
    publishAsBanner: values.publishAsBanner ?? false,
    bannerSettings: values.bannerSettings
      ? {
          ...values.bannerSettings,
          startDate: toIso(values.bannerSettings.startDate),
          endDate: toIso(values.bannerSettings.endDate),
        }
      : undefined,
  };

  const result = await upsertNews(payload);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "admin.news.errors.saveFailed" };
  }

  const newsId = result.data._id;

  revalidatePath("/admin/content/news");
  revalidatePath(`/admin/content/news/${newsId}`);
  revalidatePath("/employee/content/news");
  revalidatePath(`/employee/content/news/${newsId}`);

  return { success: true, id: newsId, status: payload.status };
}

export async function searchNewsEvents(query: string): Promise<NewsReferenceOption[]> {
  const term = (query ?? "").trim();
  const searchPattern = term ? `*${term.replace(/\s+/g, " ")}*` : "*";
  const result = await withActionAuth(
    "content.events.read",
    async () => {
      const events = await backofficeReadClient.fetch<
        { _id: string; title?: string; slug?: { current?: string }; startDate?: string; endDate?: string }[]
      >(
        `*[_type == "event" && title match $search] | order(coalesce(startDate, _createdAt) desc) [0...8] {
          _id,
          title,
          slug,
          startDate,
          endDate
        }`,
        { search: searchPattern },
      );

      return events;
    },
    { actionName: "searchNewsEvents" },
  );

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "admin.content.news.actions.errors.searchEventsFailed");
  }

  return result.data.map((event) => ({
    id: event._id,
    label: event.title ?? "",
    description: event.slug?.current ?? event.startDate ?? undefined,
  }));
}

export async function addNewsAttachmentAction(
  newsId: string,
  payload: { title: string; description?: string; fileType: string; status: string; assetId?: string | null },
): Promise<{ success: boolean; attachments?: NewsAttachment[]; message?: string }> {
  if (!newsId) {
    return { success: false, message: "admin.news.attachments.errors.saveFirst" };
  }

  const allowedStatuses = new Set(["public", "event_locked"]);
  if (!allowedStatuses.has(payload.status)) {
    return { success: false, message: "admin.news.attachments.errors.invalidAccess" };
  }

  const fileType = (payload.fileType || "").toLowerCase();
  if (fileType === "link") {
    return { success: false, message: "admin.news.attachments.errors.linkUnsupported" };
  }

  if (!payload.assetId) {
    return { success: false, message: "admin.news.attachments.errors.fileRequired" };
  }

  const result = await addNewsAttachment(newsId, {
    title: payload.title,
    description: payload.description,
    fileType: payload.fileType,
    status: payload.status,
    file: payload.assetId ? { _type: "file", asset: { _ref: payload.assetId } } : undefined,
  });

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "admin.news.attachments.errors.addFailed" };
  }

  revalidatePath(`/admin/content/news/${newsId}`);
  revalidatePath(`/employee/content/news/${newsId}`);

  return { success: true, attachments: result.data.attachments as NewsAttachment[] };
}

export async function deleteNewsById(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "admin.content.news.errors.missingNewsId" };
  }

  const result = await deleteNews(normalizedId);

  if (!result.success) {
    return { success: false, message: result.message ?? "admin.content.news.errors.deleteFailed" };
  }

  revalidatePath("/admin/content/news");
  revalidatePath(`/admin/content/news/${normalizedId}`);
  revalidatePath("/employee/content/news");
  revalidatePath(`/employee/content/news/${normalizedId}`);

  return { success: true };
}

export async function removeNewsAttachmentAction(
  newsId: string,
  attachmentKey: string,
): Promise<{ success: boolean; attachments?: NewsAttachment[]; message?: string }> {
  if (!newsId || !attachmentKey) {
    return { success: false, message: "admin.content.news.errors.missingAttachmentIdentifier" };
  }

  const result = await removeNewsAttachment(newsId, attachmentKey);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "admin.news.attachments.errors.removeFailed" };
  }

  revalidatePath(`/admin/content/news/${newsId}`);
  revalidatePath(`/employee/content/news/${newsId}`);

  return { success: true, attachments: result.data.attachments as NewsAttachment[] };
}


