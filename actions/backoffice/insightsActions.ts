"use server";

import { randomUUID } from "crypto";
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
import type { InsightStatus, InsightType } from "@/lib/insightForm";
import { ensurePortableTextArrayKeys } from "@/lib/portableTextKeys";

const INSIGHT_STATUS_VALUES = ["draft", "published", "archived"] as const;
const INSIGHT_TYPE_VALUES = [
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
] as const;

const POSITIVE_INTEGER_ERROR = "Must be a positive integer";

type InsightDocument = Record<string, unknown> & {
  _id: string;
  _type?: string;
  publishedAt?: string | null;
  status?: InsightStatus;
};

const stripSystemFields = (doc: InsightDocument): Record<string, unknown> => {
  const { _id: _omitId, _rev, _updatedAt, _createdAt, _type, ...rest } = doc;
  return { ...rest, _type: typeof _type === "string" ? _type : "insight" };
};

export type InsightFilters = PaginationParams & {
  status?: InsightStatus;
  insightType?: InsightType;
  categoryId?: string;
  authorId?: string;
  publishedFrom?: string;
  publishedTo?: string;
  search?: string;
  locale?: string;
};

export type InsightInput = {
  _id?: string;
  status?: InsightStatus;
  title?: string;
  titleTh?: string;
  insightType?: InsightType;
  slug?: { current: string };
  locale?: { _type: "reference"; _ref: string } | string;
  summary?: string;
  summaryTh?: string;
  body?: PortableTextBlock[];
  bodyTh?: PortableTextBlock[];
  heroImage?: {
    _type?: "image";
    asset: { _ref: string };
    alt?: string;
    caption?: string;
  };
  heroLayout?: "standard" | "fullBleed" | "imageLeft" | "imageRight" | "banner";
  heroTheme?: "light" | "dark" | "overlay";
  author?: { _type: "reference"; _ref: string };
  reviewer?: { _type: "reference"; _ref: string };
  primaryCategory?: { _type: "reference"; _ref: string };
  categories?: { _type: "reference"; _ref: string }[];
  primaryKeyword?: string;
  primaryKeywordTh?: string;
  primaryKeywordVolume: number;
  primaryKeywordDifficulty?: number;
  secondaryKeywords?: unknown;
  publishedAt?: string | null;
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
};

export type InsightRecord = {
  _id: string;
  _type: string;
  title?: string;
  titleTh?: string;
  slug?: { current?: string };
  locale?: { _id?: string; code?: string; title?: string };
  insightType?: InsightType;
  status?: InsightStatus;
  summary?: string;
  summaryTh?: string;
  body?: PortableTextBlock[];
  bodyTh?: PortableTextBlock[];
  readingTime?: number;
  heroImage?: { asset?: { _ref?: string } };
  heroLayout?: string;
  heroTheme?: string;
  mainImage?: { asset?: { _ref?: string } };
  publishedAt?: string;
  updatedAt?: string;
  _updatedAt?: string;
  _createdAt?: string;
  author?: { _id: string; name?: string; title?: string };
  reviewer?: { _id: string; name?: string; title?: string };
  primaryCategory?: { _id: string; title?: string; slug?: { current?: string } };
  categories?: { _id: string; title?: string; slug?: { current?: string } }[];
  linkedProducts?: { _id: string; name?: string; slug?: { current?: string } }[];
  linkedInsights?: {
    _id: string;
    title?: string;
    slug?: { current?: string };
    insightType?: string;
    status?: string;
  }[];
  seoMetadata?: {
    _id?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
    ogImage?: unknown;
  };
  primaryKeyword?: string;
  primaryKeywordTh?: string;
  primaryKeywordVolume?: number;
  primaryKeywordDifficulty?: number;
  secondaryKeywords?: unknown;
  tags?: string[];
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
};

const INSIGHT_DETAIL_PROJECTION = `{
  _id,
  _type,
  title,
  titleTh,
  slug,
  locale->{_id, code, title},
  insightType,
  status,
  summary,
  summaryTh,
  body,
  bodyTh,
  readingTime,
  heroImage,
  heroLayout,
  heroTheme,
  mainImage,
  publishedAt,
  updatedAt,
  _updatedAt,
  _createdAt,
  author->{_id, name, title},
  reviewer->{_id, name, title},
  primaryCategory->{_id, title, slug},
  categories[]->{_id, title, slug},
  linkedProducts[]->{_id, name, slug},
  linkedInsights[]->{_id, title, slug, insightType, status},
  seoMetadata->{
    _id,
    metaTitle,
    metaDescription,
    keywords,
    canonicalUrl,
    ogImage
  },
  primaryKeyword,
  primaryKeywordTh,
  primaryKeywordVolume,
  primaryKeywordDifficulty,
  secondaryKeywords,
  tags,
  publishAsBanner,
  bannerSettings
}`;

const INSIGHT_LIST_PROJECTION = `{
  _id,
  title,
  titleTh,
  slug,
  locale->{_id, code, title},
  insightType,
  status,
  publishedAt,
  updatedAt,
  _updatedAt,
  _createdAt,
  author->{name},
  primaryCategory->{title}
}`;

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

const insightInputSchema = z
  .object({
    _id: z.string().optional(),
    status: z.enum(INSIGHT_STATUS_VALUES).default("draft"),
    title: z.string().trim().min(1).max(200),
    titleTh: z.string().trim().max(200).optional(),
    insightType: z.enum(INSIGHT_TYPE_VALUES).optional(),
    slug: z.object({
      current: z
        .string()
        .trim()
        .min(1)
        .max(96)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    }),
    locale: z.string().trim().min(1),
    summary: z.string().optional(),
    summaryTh: z.string().optional(),
    body: z.array(z.any()).optional(),
    bodyTh: z.array(z.any()).optional(),
    heroImage: z
      .object({
        _type: z.literal("image").optional(),
        asset: z.object({ _ref: z.string().min(1) }),
        alt: z.string().optional(),
        caption: z.string().optional(),
      })
      .optional(),
    heroLayout: z.enum(["standard", "fullBleed", "imageLeft", "imageRight", "banner"]).optional(),
    heroTheme: z.enum(["light", "dark", "overlay"]).optional(),
    author: z
      .object({ _type: z.literal("reference"), _ref: z.string().min(1) })
      .optional(),
    reviewer: z
      .object({ _type: z.literal("reference"), _ref: z.string().min(1) })
      .optional(),
    primaryCategory: z
      .object({ _type: z.literal("reference"), _ref: z.string().min(1) })
      .optional(),
    categories: z
      .array(z.object({ _type: z.literal("reference"), _ref: z.string().min(1) }))
      .optional(),
    primaryKeyword: z.string().optional(),
    primaryKeywordTh: z.string().optional(),
    primaryKeywordVolume: z
      .number()
      .refine((value) => Number.isInteger(value) && value > 0, { message: POSITIVE_INTEGER_ERROR }),
    primaryKeywordDifficulty: z.number().finite().min(0).max(100).optional(),
    secondaryKeywords: z.unknown().optional(),
    publishedAt: z.string().nullable().optional(),
    publishAsBanner: z.boolean().optional(),
    bannerSettings: bannerSettingsSchema.optional(),
  })
  .strip();

const buildInsightFilter = (filters: InsightFilters, localeRef?: string) => {
  const clauses = ['_type == "insight"'];
  const params: Record<string, unknown> = {};

  // locale filter removed; single doc holds both languages

  if (filters.status) {
    clauses.push("status == $status");
    params.status = filters.status;
  }

  if (filters.insightType) {
    clauses.push("insightType == $insightType");
    params.insightType = filters.insightType;
  }

  if (filters.categoryId) {
    clauses.push("($categoryId in categories[]._ref) || primaryCategory._ref == $categoryId");
    params.categoryId = filters.categoryId;
  }

  if (filters.authorId) {
    clauses.push('author._ref == $authorId');
    params.authorId = filters.authorId;
  }

  if (filters.publishedFrom) {
    clauses.push("publishedAt >= $publishedFrom");
    params.publishedFrom = filters.publishedFrom;
  }

  if (filters.publishedTo) {
    clauses.push("publishedAt <= $publishedTo");
    params.publishedTo = filters.publishedTo;
  }

  const searchTerm = typeof filters.search === "string" ? filters.search.trim() : "";
  if (searchTerm) {
    clauses.push("(title match $search || pt::text(body) match $search)");
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  // Exclude drafts to avoid duplicate rows (draft + published).
  clauses.push('!(_id in path("drafts.**"))');

  return { filter: clauses.join(" && "), params };
};

export const listInsights = async (
  filters: InsightFilters = {},
): Promise<ActionResult<PaginatedResult<InsightRecord>>> => {
  return withActionAuth("content.insights.read", async () => {
    const { filter, params } = buildInsightFilter(filters);
    const { limit, offset, end } = normalizePagination(filters);
    const queryParams = { ...params, offset, end };

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<InsightRecord[]>(
        `*[${filter}] | order(coalesce(updatedAt, _updatedAt) desc, publishedAt desc, _id asc) [$offset...$end] ${INSIGHT_LIST_PROJECTION}`,
        queryParams,
      ),
      backofficeReadClient.fetch<number>(`count(*[${filter}])`, params),
    ]);

    return { items, total, limit, offset };
  }, { actionName: "listInsights" });
};

export const getInsightById = async (id: string): Promise<ActionResult<InsightRecord | null>> => {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "Insight id is required" };
  }

  return withActionAuth("content.insights.read", async () => {
    const draftId = normalizedId.startsWith("drafts.") ? normalizedId : `drafts.${normalizedId}`;

    const insight = await backofficeReadClient.fetch<InsightRecord | null>(
      `coalesce(
        *[_type == "insight" && _id == $draftId][0],
        *[_type == "insight" && _id == $id][0]
      ) ${INSIGHT_DETAIL_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return insight;
  }, { actionName: "getInsightById" });
};

export const upsertInsight = async (
  input: InsightInput,
): Promise<ActionResult<{ _id?: string }>> => {
  return withActionAuth(["content.insights.write"], async () => {
    let parsed: z.infer<typeof insightInputSchema>;
    try {
      parsed = insightInputSchema.parse(input);
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }

    const localeRef = parsed.locale
      ? await resolveLocaleReference(parsed.locale)
      : undefined;

    const baseId = parsed._id?.replace(/^drafts\./, "") ?? randomUUID();
    const draftId = `drafts.${baseId}`;
    const excludeIds = [baseId, draftId];
    const slugConflict = await backofficeReadClient.fetch<number>(
      `count(*[_type == "insight" && slug.current == $slug && !(_id in $excludeIds)])`,
      { slug: parsed.slug.current, excludeIds },
    );
    if (slugConflict > 0) {
      return { success: false, message: "Slug already exists. Please choose another slug." };
    }

    const { _id, ...payload } = parsed;
    const now = nowIso();
    const shouldPublish = payload.status === "published";

    const { body, bodyTh, ...payloadRest } = payload;
    const normalizedBody = ensurePortableTextArrayKeys(body);
    const normalizedBodyTh = ensurePortableTextArrayKeys(bodyTh);

    const baseData: Record<string, unknown> = {
      ...payloadRest,
      body:
        (normalizedBody.value as PortableTextBlock[] | undefined) ??
        (Array.isArray(body) ? (body as PortableTextBlock[]) : undefined),
      bodyTh:
        (normalizedBodyTh.value as PortableTextBlock[] | undefined) ??
        (Array.isArray(bodyTh) ? (bodyTh as PortableTextBlock[]) : undefined),
      ...(localeRef ? { locale: localeRef } : {}),
      updatedAt: now,
      _type: "insight",
    };

    const existing = await backofficeReadClient.fetch<{
      published?: { _id: string; status?: InsightStatus; publishedAt?: string | null };
      draft?: { _id: string; status?: InsightStatus; publishedAt?: string | null };
    }>(
      `{
        "published": *[_type == "insight" && _id == $id][0]{_id, status, publishedAt},
        "draft": *[_type == "insight" && _id == $draftId][0]{_id, status, publishedAt}
      }`,
      { id: baseId, draftId },
    );

    const publishDate =
      payload.publishedAt ??
      existing?.draft?.publishedAt ??
      existing?.published?.publishedAt ??
      now;

    // Always patch the draft; create it if needed so edits don't mutate published docs directly.
    const tx = backendClient.transaction();
    tx.createIfNotExists({ _id: draftId, _type: "insight", status: payload.status ?? "draft", createdAt: now });
    tx.patch(draftId, (p) => {
      let next = p.set(baseData);
      if (shouldPublish) {
        next = next.setIfMissing({ publishedAt: publishDate });
      } else if (typeof payload.publishedAt === "string") {
        next = next.set({ publishedAt: payload.publishedAt });
      }
      return next;
    });

    // Keep a published/base document in sync when explicitly publishing,
    // or when no published document exists yet (so the row can appear in lists).
    if (shouldPublish || !existing?.published?._id) {
      tx.createIfNotExists({ _id: baseId, _type: "insight", status: payload.status ?? "draft", createdAt: now });
      tx.patch(baseId, (p) => {
        let next = p.set({ ...baseData, status: payload.status ?? "draft" });
        if (shouldPublish) {
          next = next.setIfMissing({ publishedAt: publishDate });
        } else if (typeof payload.publishedAt === "string") {
          next = next.set({ publishedAt: payload.publishedAt });
        }
        return next;
      });
    } else if (payload.status && payload.status !== existing.published.status) {
      // Allow status downgrades (publish -> draft/archived) without mutating published content.
      tx.patch(baseId, (p) => p.set({ status: payload.status, updatedAt: now }));
      if (typeof payload.publishedAt === "string") {
        tx.patch(baseId, (p) => p.set({ publishedAt: payload.publishedAt }));
      }
    }

    await tx.commit();
    // Return the stable base id for routing and cache keys
    return { _id: baseId };
  }, { actionName: "upsertInsight" });
};

export const setInsightStatus = async (
  id: string,
  status: InsightStatus,
): Promise<ActionResult<{ _id?: string; status?: InsightStatus; publishedAt?: string | null }>> => {
  return withActionAuth("content.insights.publish", async () => {
    const normalized = normalizeDocumentIds(id, "Insight");
    if (!normalized) {
      return { success: false, message: "Insight ID is required" };
    }

    const { id: baseId, draftId } = normalized;
    const now = nowIso();

    const existing = await backofficeReadClient.fetch<{
      published?: InsightDocument | null;
      draft?: InsightDocument | null;
    }>(
      `{
        "published": *[_type == "insight" && _id == $id][0]{..., "source": "published"},
        "draft": *[_type == "insight" && _id == $draftId][0]{..., "source": "draft"}
      }`,
      { id: baseId, draftId },
    );

    if (!existing?.published && !existing?.draft) {
      return { success: false, message: "Insight not found" };
    }

    const publishDate =
      existing?.draft?.publishedAt ??
      existing?.published?.publishedAt ??
      now;

    if (status === "published") {
      const source = existing.draft ?? existing.published!;
      const payload = stripSystemFields(source);

      const tx = backendClient.transaction();
      tx.createOrReplace({
        ...payload,
        _id: baseId,
        _type: "insight",
        status,
        updatedAt: now,
        publishedAt: publishDate,
      });
      // Keep draft in sync for further edits while preserving first publish date.
      tx.createIfNotExists({ _id: draftId, _type: "insight" });
      tx.patch(draftId, (p) =>
        p
          .set({ ...payload, status, updatedAt: now })
          .setIfMissing({ publishedAt: publishDate }),
      );

      await tx.commit();

      return { _id: baseId, status, publishedAt: publishDate };
    }

    // Draft or archived: update draft; if no published doc, mirror to base so it still appears in lists.
    const tx = backendClient.transaction();
    tx.createIfNotExists({ _id: draftId, _type: "insight" });
    tx.patch(draftId, (p) => p.set({ status, updatedAt: now }));

    if (!existing?.published) {
      tx.createIfNotExists({ _id: baseId, _type: "insight" });
      tx.patch(baseId, (p) => p.set({ status, updatedAt: now }));
    }

    await tx.commit();

    return { _id: baseId, status, publishedAt: existing?.published?.publishedAt ?? existing?.draft?.publishedAt };
  }, { actionName: "setInsightStatus" });
};

export const deleteInsight = async (id: string): Promise<ActionResult<{ deletedId: string }>> => {
  const normalized = normalizeDocumentIds(id, "Insight");
  if (!normalized) {
    return { success: false, message: "Insight ID is required" };
  }

  return withActionAuth("content.insights.publish", async () => {
    const { id: normalizedId, draftId } = normalized;

    await backendClient
      .transaction()
      .delete(normalizedId)
      .delete(draftId)
      .commit();

    return { deletedId: normalizedId };
  }, { actionName: "deleteInsight" });
};
