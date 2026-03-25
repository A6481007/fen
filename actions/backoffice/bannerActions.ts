"use server";

import { z } from "zod";
import {
  ActionResult,
  PaginatedResult,
  backofficeReadClient,
  handleActionError,
  normalizePagination,
  nowIso,
  withActionAuth,
} from "./common";
import { backendClient } from "@/sanity/lib/backendClient";

const urlish = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      !value ||
      /^https?:\/\//i.test(value) ||
      value.startsWith("/") ||
      value.startsWith("mailto:"),
    { message: "Use an absolute URL or a site-relative path." },
  );

const bannerSchema = z
  .object({
    _id: z.string().optional(),
    title: z.string().trim().min(1, "Title is required."),
    description: z.string().trim().max(500).optional(),
    kicker: z.string().trim().optional(),
    metaLine: z.string().trim().optional(),
    layout: z.string().trim().optional(),
    linkUrl: urlish,
    mediaPosition: z.string().trim().optional(),
    mediaAspect: z.string().trim().optional(),
    imageOnly: z.boolean().optional(),
    badge: z.string().trim().optional(),
    discountAmount: z.number().optional(),
    heroVariant: z.enum(["light", "dark"]).optional(),
    heroBadges: z
      .array(
        z.object({
          _key: z.string().optional(),
          label: z.string().trim().optional(),
          tone: z.string().trim().optional(),
        }),
      )
      .optional(),
    heroCtas: z
      .array(
        z.object({
          _key: z.string().optional(),
          label: z.string().trim().optional(),
          href: urlish,
          style: z.enum(["primary", "secondary", "ghost"]).optional(),
        }),
      )
      .optional(),
    image: z.unknown().optional(),
    imageAlt: z.string().trim().max(140).optional(),
    placement: z.string().trim().min(3, "Placement is required."),
    textColor: z.string().trim().optional(),
    badgeColor: z.string().trim().optional(),
    primaryCtaColor: z.string().trim().optional(),
    secondaryCtaColor: z.string().trim().optional(),
    appearance: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.image && !value.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a description or an image so the hero has visible content.",
        path: ["image"],
      });
    }
    if (value.startDate && value.endDate) {
      const start = new Date(value.startDate).getTime();
      const end = new Date(value.endDate).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be after start date.",
          path: ["endDate"],
        });
      }
    }
  });

export type BannerInput = z.input<typeof bannerSchema>;
export type BannerRecord = z.output<typeof bannerSchema> & {
  _createdAt?: string;
  _updatedAt?: string;
  _type?: "banner";
};

const BANNER_PROJECTION = `{
  _id,
  title,
  description,
  kicker,
  metaLine,
  layout,
  linkUrl,
  mediaPosition,
  mediaAspect,
  imageOnly,
  badge,
  discountAmount,
  heroVariant,
  heroBadges,
  heroCtas,
  image,
  imageAlt,
  placement,
  textColor,
  badgeColor,
  primaryCtaColor,
  secondaryCtaColor,
  appearance,
  isActive,
  startDate,
  endDate,
  _createdAt,
  _updatedAt
}`;

export type BannerFilters = {
  placement?: string;
} & Parameters<typeof normalizePagination>[0];

export const listBanners = async (
  filters: BannerFilters = {},
): Promise<ActionResult<PaginatedResult<BannerRecord>>> => {
  return withActionAuth("marketing.promotions.read", async () => {
    const { limit, offset, end } = normalizePagination(filters);
    const placement = typeof filters.placement === "string" ? filters.placement.trim() : "";

    const placementClause = placement ? ' && placement == $placement' : "";
    const params = placement ? { placement, offset, end } : { offset, end };

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<BannerRecord[]>(
        `*[_type == "banner"${placementClause}] | order(_updatedAt desc, _createdAt desc) [$offset...$end] ${BANNER_PROJECTION}`,
        params,
      ),
      backofficeReadClient.fetch<number>(
        `count(*[_type == "banner"${placementClause}])`,
        placement ? { placement } : {},
      ),
    ]);

    return { items, total, limit, offset };
  }, { actionName: "listBanners" });
};

export const getBannerById = async (id: string): Promise<ActionResult<BannerRecord | null>> => {
  const normalizedId = typeof id === "string" ? id.trim() : "";
  if (!normalizedId) {
    return { success: true, data: null };
  }

  return withActionAuth("marketing.promotions.read", async () => {
    const draftId = normalizedId.startsWith("drafts.") ? normalizedId : `drafts.${normalizedId}`;
    const banner = await backofficeReadClient.fetch<BannerRecord | null>(
      `coalesce(
        *[_type == "banner" && _id == $draftId][0],
        *[_type == "banner" && _id == $id][0]
      ) ${BANNER_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return banner;
  }, { actionName: "getBannerById" });
};

export const upsertBanner = async (input: BannerInput): Promise<ActionResult<{ _id: string }>> => {
  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid banner payload",
    };
  }

  const payload = parsed.data;
  const now = nowIso();

  return withActionAuth("marketing.promotions.write", async () => {
    const base: BannerRecord = {
      ...payload,
      _type: "banner",
      _updatedAt: now,
    };

    if (payload._id) {
      const updated = await backendClient.patch(payload._id).set(base).commit<{ _id: string }>();
      return { _id: updated._id };
    }

    const created = await backendClient.create<{ _id: string }>(base as any);
    return { _id: created._id };
  }, { actionName: "upsertBanner" });
};

export const deleteBanner = async (id: string): Promise<ActionResult<{ _id: string }>> => {
  const normalizedId = typeof id === "string" ? id.trim() : "";
  if (!normalizedId) {
    return { success: false, message: "Banner id is required." };
  }

  return withActionAuth("marketing.promotions.write", async () => {
    await backendClient.delete(normalizedId);
    return { _id: normalizedId };
  }, { actionName: "deleteBanner" });
};
