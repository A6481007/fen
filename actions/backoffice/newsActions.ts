"use server";

import type { PortableTextBlock } from "sanity";
import { z } from "zod";
import {
  ActionResult,
  PaginatedResult,
  PaginationParams,
  backofficeReadClient,
  normalizePagination,
  nowIso,
  withActionAuth,
  normalizeDocumentIds,
  resolveLocaleReference,
} from "./common";
import { backendClient } from "@/sanity/lib/backendClient";
import { NEWS_CATEGORY_OPTIONS } from "@/lib/news/categories";
import { normalizeNewsSlug } from "@/lib/news/slug";
import { ensurePortableTextArrayKeys } from "@/lib/portableTextKeys";

export type NewsFilters = PaginationParams & {
  category?: string;
  linkedEventId?: string;
  search?: string;
  locale?: string;
};

export type NewsAttachmentInput = {
  _key?: string;
  title?: string;
  description?: string;
  fileType?: string;
  status?: string;
  linkUrl?: string;
  file?: { _type?: "file"; asset: { _ref: string } };
};

export type NewsAttachmentRecord = Omit<NewsAttachmentInput, "file"> & {
  file?: {
    _type?: "file";
    asset: {
      _ref?: string;
      _id?: string;
      url?: string;
      originalFilename?: string;
      size?: number;
      mimeType?: string;
      extension?: string;
    };
  };
};

export type NewsInput = {
  _id?: string;
  status?: string;
  title?: string;
  titleTh?: string;
  slug?: { current: string };
  locale?: { _type: "reference"; _ref: string } | string;
  publishDate?: string;
  category?: string;
  content?: PortableTextBlock[];
  contentTh?: PortableTextBlock[];
  author?: { _type: "reference"; _ref: string };
  heroImage?: { _type?: "image"; asset: { _ref: string }; alt?: string; caption?: string };
  heroLayout?: "standard" | "fullBleed" | "imageLeft" | "imageRight" | "banner";
  heroTheme?: "light" | "dark" | "overlay";
  featuredImage?: { _type: "image"; asset: { _ref: string } };
  seoMetadata?: unknown;
  linkedEvent?: { _type: "reference"; _ref: string } | null;
  attachments?: NewsAttachmentInput[];
  [key: string]: unknown;
};

export type NewsRecord = {
  _id: string;
  _type: string;
  title?: string;
  titleTh?: string;
  slug?: { current?: string };
  locale?: { _id?: string; code?: string; title?: string };
  publishDate?: string;
  publishedAt?: string;
  status?: string;
  category?: string;
  content?: PortableTextBlock[];
  contentTh?: PortableTextBlock[];
  heroImage?: { asset?: { _ref?: string } };
  heroLayout?: string;
  heroTheme?: string;
  featuredImage?: { asset?: { _ref?: string } };
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
    noIndex?: boolean;
    ogImage?: { asset?: { _ref?: string } };
  };
  linkedEvent?: {
    _id: string;
    title?: string;
    slug?: { current?: string };
    eventType?: string;
    startDate?: string;
    endDate?: string;
  };
  attachments?: NewsAttachmentRecord[];
  publishAsBanner?: boolean;
  bannerSettings?: {
    bannerPlacement?: string;
    heroVariant?: string;
    startDate?: string;
    endDate?: string;
    titleOverride?: string;
    descriptionOverride?: string;
    ctaLabel?: string;
    ctaUrlOverride?: string;
  };
  updatedAt?: string;
  _updatedAt?: string;
  _createdAt?: string;
};

const NEWS_CATEGORY_VALUES = NEWS_CATEGORY_OPTIONS.map((option) => option.value);
const allowedStatuses = ["draft", "published"] as const;
const allowedAttachmentStatuses = ["public", "event_locked"] as const;

const NEWS_PROJECTION = `{
  _id,
  _type,
  title,
  titleTh,
  slug,
  locale->{_id, code, title},
  publishDate,
  "publishedAt": coalesce(publishDate, publishedAt),
  status,
  category,
  content,
  contentTh,
  heroImage,
  heroLayout,
  heroTheme,
  featuredImage,
  seoMetadata{
    metaTitle,
    metaDescription,
    keywords,
    canonicalUrl,
    noIndex,
    ogImage{
      asset->{_ref}
    }
  },
  linkedEvent->{_id, title, slug, eventType, startDate, endDate},
  attachments[]{
    _key,
    title,
    description,
    linkUrl,
    fileType,
    status,
    file{
      asset->{
        _id,
        _type,
        url,
        originalFilename,
        size,
        mimeType,
        extension,
        _ref
      }
    }
  },
  publishAsBanner,
  bannerSettings,
  updatedAt,
  _updatedAt,
  _createdAt
}`;

const buildNewsFilter = (filters: NewsFilters, _localeRef?: string) => {
  const clauses = ['_type == "news"'];
  const params: Record<string, unknown> = {};

  // locale filter removed; single doc carries both languages

  if (filters.category) {
    clauses.push("category == $category");
    params.category = filters.category;
  }

  if (filters.linkedEventId) {
    clauses.push('linkedEvent._ref == $linkedEventId');
    params.linkedEventId = filters.linkedEventId;
  }

  const searchTerm = typeof filters.search === "string" ? filters.search.trim() : "";
  if (searchTerm) {
    clauses.push(
      "(title match $search || titleTh match $search || pt::text(content) match $search || pt::text(contentTh) match $search)"
    );
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  return { filter: clauses.join(" && "), params };
};

const generateAttachmentKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const attachmentSchema = z
  .object({
    _key: z.string().optional(),
    title: z.string().trim().min(1, "Attachment title is required"),
    description: z.string().trim().optional(),
    fileType: z.string().trim().min(1, "Attachment file type is required"),
    status: z.enum(allowedAttachmentStatuses).default("public"),
    linkUrl: z.string().url().optional(),
    file: z
      .object({
        _type: z.literal("file").optional(),
        asset: z.object({ _ref: z.string().min(1, "File reference is required") }),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const fileType = value.fileType.toLowerCase();
    if (fileType === "link") {
      if (!value.linkUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Link attachments require a URL.",
          path: ["linkUrl"],
        });
      }
      if (value.file) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Link attachments must not include a file upload.",
          path: ["file"],
        });
      }
    } else if (fileType !== "offline") {
      if (!value.file?.asset?._ref) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File upload is required for this attachment.",
          path: ["file", "asset", "_ref"],
        });
      }
    }
  });

const bannerSettingsSchema = z.object({
  bannerPlacement: z.string().optional(),
  heroVariant: z.enum(["light", "dark"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  titleOverride: z.string().optional(),
  descriptionOverride: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrlOverride: z.string().optional(),
});

const newsInputSchema = z.object({
  _id: z.string().optional(),
  status: z.enum(allowedStatuses).default("draft"),
  title: z.string().trim().min(1, "Title is required"),
  titleTh: z.string().trim().optional(),
  slug: z.object({
    current: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and dashes."),
  }),
  locale: z.string().trim().optional(),
  publishDate: z.string().datetime().optional(),
  category: z
    .string()
    .trim()
    .refine((value) => NEWS_CATEGORY_VALUES.includes(value), { message: "Invalid category." })
    .default("general"),
  content: z.any().array().optional(),
  contentTh: z.any().array().optional(),
  heroImage: z
    .object({
      _type: z.literal("image").optional(),
      asset: z.object({ _ref: z.string() }),
      alt: z.string().optional(),
      caption: z.string().optional(),
    })
    .optional(),
  heroLayout: z.enum(["standard", "fullBleed", "imageLeft", "imageRight", "banner"]).optional(),
  heroTheme: z.enum(["light", "dark", "overlay"]).optional(),
  author: z
    .object({
      _type: z.literal("reference"),
      _ref: z.string(),
    })
    .optional(),
  featuredImage: z
    .object({
      _type: z.literal("image").optional(),
      asset: z.object({ _ref: z.string() }),
    })
    .optional(),
  seoMetadata: z.unknown().optional(),
  linkedEvent: z
    .object({
      _type: z.literal("reference"),
      _ref: z.string(),
    })
    .nullable()
    .optional(),
  attachments: z.array(attachmentSchema).optional(),
  publishAsBanner: z.boolean().optional(),
  bannerSettings: bannerSettingsSchema.optional(),
});

const mapAttachmentForWrite = (attachment: NewsAttachmentInput): NewsAttachmentInput => {
  const parsed = attachmentSchema.parse({
    ...attachment,
    title: attachment.title ?? "Attachment",
    status: attachment.status ?? "public",
    fileType: attachment.fileType ?? "document",
  });

  const fileType = parsed.fileType.toLowerCase();
  const assetRef =
    parsed.file?.asset?._ref ||
    (parsed as { file?: { asset?: { _id?: string } } }).file?.asset?._id;

  return {
    _key: parsed._key ?? generateAttachmentKey(),
    title: parsed.title.trim(),
    description: parsed.description?.trim() || undefined,
    fileType,
    status: parsed.status,
    linkUrl: fileType === "link" ? parsed.linkUrl : undefined,
    file:
      fileType === "link" || fileType === "offline"
        ? undefined
        : assetRef
          ? { _type: "file", asset: { _ref: assetRef } }
          : undefined,
  };
};

const fetchNewsAttachments = async (
  id: string,
): Promise<{ _id: string; attachments: NewsAttachmentRecord[] } | null> => {
  const normalized = normalizeDocumentIds(id, "News");
  if (!normalized) return null;

  const { id: normalizedId, draftId } = normalized;
  return backofficeReadClient.fetch<{
    _id: string;
    attachments: NewsAttachmentRecord[];
  } | null>(
    `coalesce(
      *[_type == "news" && _id == $draftId][0],
      *[_type == "news" && _id == $id][0]
    ){
      _id,
      attachments[]{
        _key,
        title,
        description,
        linkUrl,
        fileType,
        status,
        file{
          asset->{
            _id,
            _type,
            url,
            originalFilename,
            size,
            mimeType,
            extension,
            _ref
          }
        }
      }
    }`,
    { id: normalizedId, draftId },
  );
};

export const listNews = async (
  filters: NewsFilters = {},
): Promise<ActionResult<PaginatedResult<NewsRecord>>> => {
  return withActionAuth("content.news.read", async () => {
    const { filter, params } = buildNewsFilter(filters);
    const { limit, offset, end } = normalizePagination(filters);
    const queryParams = { ...params, offset, end };

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<NewsRecord[]>(
        `*[${filter}] | order(coalesce(updatedAt, _updatedAt, publishDate, _createdAt) desc) [$offset...$end] ${NEWS_PROJECTION}`,
        queryParams,
      ),
      backofficeReadClient.fetch<number>(`count(*[${filter}])`, params),
    ]);

    return { items, total, limit, offset };
  }, { actionName: "listNews" });
};

export const getNewsById = async (id: string): Promise<ActionResult<NewsRecord | null>> => {
  const normalizedId = typeof id === "string" ? id.trim() : "";
  if (!normalizedId) {
    return { success: true, data: null };
  }

  return withActionAuth("content.news.read", async () => {
    const draftId = normalizedId.startsWith("drafts.") ? normalizedId : `drafts.${normalizedId}`;

    const article = await backofficeReadClient.fetch<NewsRecord | null>(
      `coalesce(
        *[_type == "news" && _id == $draftId][0],
        *[_type == "news" && _id == $id][0]
      ) ${NEWS_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return article;
  }, { actionName: "getNewsById" });
};

export const upsertNews = async (
  input: NewsInput,
): Promise<ActionResult<{ _id?: string }>> => {
  return withActionAuth("content.news.write", async () => {
    const { _id, ...payload } = input;
    const now = nowIso();
    const incomingSlug = payload.slug?.current ?? "";
    const normalizedSlug = normalizeNewsSlug(incomingSlug);
    if (incomingSlug && normalizedSlug !== incomingSlug) {
      return { success: false, message: "Slug must use lowercase letters, numbers, and dashes." };
    }

    const parsedResult = newsInputSchema.safeParse({
      ...payload,
      title: payload.title?.trim() || "Untitled news",
      titleTh: payload.titleTh?.trim() || undefined,
      status: payload.status ?? "draft",
      category: payload.category ?? "general",
      slug: { current: normalizedSlug },
      locale: payload.locale ?? undefined,
      publishDate: payload.publishDate ?? now,
      attachments: payload.attachments,
    });

    if (!parsedResult.success) {
      return { success: false, message: parsedResult.error.issues[0]?.message ?? "Invalid news payload" };
    }

    if (!normalizedSlug) {
      return { success: false, message: "Slug is required." };
    }

    const parsed = parsedResult.data;
    const { locale, featuredImage, content, contentTh, ...rest } = parsed;
    const localeRef = locale ? await resolveLocaleReference(locale) : null;

    const attachments = (parsed.attachments ?? []).map(mapAttachmentForWrite);
    const hasLockedAttachment = attachments.some((attachment) => attachment.status === "event_locked");
    const linkedEventRef = parsed.linkedEvent?._ref;

    if (hasLockedAttachment && !linkedEventRef) {
      return { success: false, message: "Event-locked attachments require a linked event." };
    }

    const featuredImageValue = featuredImage?.asset?._ref
      ? { _type: "image" as const, asset: featuredImage.asset }
      : undefined;

    const normalizedContent = ensurePortableTextArrayKeys(content);
    const normalizedContentTh = ensurePortableTextArrayKeys(contentTh);

    const baseData: NewsInput = {
      ...rest,
      content:
        (normalizedContent.value as PortableTextBlock[] | undefined) ??
        (Array.isArray(content) ? (content as PortableTextBlock[]) : undefined),
      contentTh:
        (normalizedContentTh.value as PortableTextBlock[] | undefined) ??
        (Array.isArray(contentTh) ? (contentTh as PortableTextBlock[]) : undefined),
      ...(localeRef ? { locale: localeRef } : {}),
      ...(featuredImageValue ? { featuredImage: featuredImageValue } : {}),
      attachments,
      updatedAt: now,
      _type: "news",
    };

    if (_id) {
      const updated = await backendClient.patch(_id).set(baseData).commit<{ _id: string }>();
      return { _id: updated._id };
    }

    const created = await backendClient.create<{ _id?: string; _type: string; status?: string; createdAt?: string }>(
      {
        ...baseData,
        status: parsed.status ?? "draft",
        createdAt: now,
      } as { _id?: string; _type: string; status?: string; createdAt?: string }
    );

    return { _id: created._id };
  }, { actionName: "upsertNews" });
};

export const updateNewsAttachments = async (
  id: string,
  attachments: NewsAttachmentInput[],
): Promise<ActionResult<{ _id?: string; attachments?: NewsAttachmentInput[] }>> => {
  return withActionAuth("content.news.write", async () => {
    const normalizedIds = normalizeDocumentIds(id, "News");
    if (!normalizedIds) {
      throw new Error("News ID is required");
    }

    const { id: baseId, draftId } = normalizedIds;
    const article = await backofficeReadClient.fetch<{
      _id: string;
      linkedEvent?: { _ref?: string } | null;
    } | null>(
      `coalesce(
        *[_type == "news" && _id == $draftId][0],
        *[_type == "news" && _id == $id][0]
      ){
        _id,
        linkedEvent
      }`,
      { id: baseId, draftId },
    );

    if (!article?._id) {
      throw new Error("News article not found");
    }

    const normalizedAttachments = (attachments ?? []).filter(Boolean).map(mapAttachmentForWrite);
    const hasLockedAttachment = normalizedAttachments.some((attachment) => attachment.status === "event_locked");
    if (hasLockedAttachment && !article.linkedEvent?._ref) {
      throw new Error("Event-locked attachments require a linked event.");
    }

    const updated = await backendClient
      .patch(article._id)
      .set({ attachments: normalizedAttachments, updatedAt: nowIso() })
      .commit<{ _id: string; attachments: NewsAttachmentInput[] }>();

    return updated;
  }, { actionName: "updateNewsAttachments" });
};

export const addNewsAttachment = async (
  newsId: string,
  attachmentPayload: NewsAttachmentInput,
): Promise<ActionResult<{ _id: string; attachments: NewsAttachmentRecord[] }>> => {
  const normalized = normalizeDocumentIds(newsId, "News");
  if (!normalized) {
    return { success: false, message: "News ID is required" };
  }

  return withActionAuth("content.news.write", async () => {
    const { id, draftId } = normalized;
    const article = await backofficeReadClient.fetch<{
      _id: string;
      attachments?: NewsAttachmentInput[];
      linkedEvent?: { _ref?: string } | null;
    } | null>(
      `coalesce(
        *[_type == "news" && _id == $draftId][0],
        *[_type == "news" && _id == $id][0]
      ){
        _id,
        attachments[]{_key, title, description, linkUrl, fileType, status, file},
        linkedEvent
      }`,
      { id, draftId },
    );

    if (!article?._id) {
      throw new Error("News article not found");
    }

    const sanitized = mapAttachmentForWrite(attachmentPayload);
    if (sanitized.status === "event_locked" && !article.linkedEvent?._ref) {
      throw new Error("Link an event before adding event-locked attachments.");
    }

    await backendClient
      .patch(article._id)
      .setIfMissing({ attachments: [] })
      .insert("after", "attachments[-1]", [sanitized])
      .set({ updatedAt: nowIso() })
      .commit<{ _id: string }>();

    const snapshot = await fetchNewsAttachments(article._id);
    return snapshot ?? { _id: article._id, attachments: [] };
  }, { actionName: "addNewsAttachment" });
};

export const removeNewsAttachment = async (
  newsId: string,
  attachmentKey: string,
): Promise<ActionResult<{ _id: string; attachments: NewsAttachmentRecord[] }>> => {
  const normalized = normalizeDocumentIds(newsId, "News");
  if (!normalized) {
    return { success: false, message: "News ID is required" };
  }

  return withActionAuth("content.news.write", async () => {
    const { id, draftId } = normalized;
    const article = await backofficeReadClient.fetch<{
      _id: string;
      attachments?: NewsAttachmentInput[];
    } | null>(
      `coalesce(
        *[_type == "news" && _id == $draftId][0],
        *[_type == "news" && _id == $id][0]
      ){
        _id,
        attachments[]{_key, title, description, fileType, status, file}
      }`,
      { id, draftId },
    );

    if (!article?._id) {
      throw new Error("News article not found");
    }

    await backendClient
      .patch(article._id)
      .unset([`attachments[_key=="${attachmentKey}"]`])
      .set({ updatedAt: nowIso() })
      .commit<{ _id: string }>();

    const snapshot = await fetchNewsAttachments(article._id);
    return snapshot ?? { _id: article._id, attachments: [] };
  }, { actionName: "removeNewsAttachment" });
};

export const setNewsStatus = async (
  id: string,
  status: "draft" | "published",
): Promise<ActionResult<{ _id: string; status: string; publishedAt?: string | null }>> => {
  return withActionAuth("content.news.publish", async () => {
    const now = nowIso();
    const patchData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    patchData.publishedAt = status === "published" ? now : null;

    const result = await backendClient
      .patch(id)
      .set(patchData)
      .commit<{ _id: string; status: string; publishedAt?: string | null }>();

    return result;
  }, { actionName: "setNewsStatus" });
};

export const deleteNews = async (id: string): Promise<ActionResult<{ deletedId: string }>> => {
  const normalized = normalizeDocumentIds(id, "News");
  if (!normalized) {
    return { success: false, message: "News ID is required" };
  }

  return withActionAuth("content.news.publish", async () => {
    const { id: normalizedId, draftId } = normalized;

    await Promise.allSettled([backendClient.delete(normalizedId), backendClient.delete(draftId)]);

    return { deletedId: normalizedId };
  }, { actionName: "deleteNews" });
};
