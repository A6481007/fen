"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  backofficeReadClient,
  withActionAuth,
  type ActionResult,
} from "@/actions/backoffice/common";
import {
  deleteDownload,
  getDownloadById,
  listDownloads,
  upsertDownload,
  type DownloadRecord,
  type DownloadInput,
} from "@/actions/backoffice/catalogActions";
import type { ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import type {
  DownloadFormState,
  DownloadListParams,
  DownloadListRow,
} from "@/components/admin/backoffice/downloads/types";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const DownloadSchema = z.object({
  _id: z.string().optional(),
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().max(96, "Slug must be 96 characters or fewer").optional(),
  summary: z.string().trim().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  fileAssetId: z.string().trim().min(1, "Upload a file before saving"),
  relatedProductIds: z.array(z.string().trim().min(1)).optional(),
});

const normalizePage = (params: DownloadListParams) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const formatListRow = (download: DownloadRecord): DownloadListRow => ({
  id: download._id,
  title: download.title ?? "Untitled download",
  slug: download.slug?.current,
  status: download.status,
  fileRef: download.file?.asset?._ref,
  relatedProductsCount: download.relatedProducts?.length ?? 0,
  updatedAt: download.updatedAt ?? download._updatedAt ?? download._createdAt,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

type DownloadTableResult = { items: DownloadListRow[]; total: number; page: number; pageSize: number };

export async function fetchDownloadsTable(
  params: DownloadListParams = {},
): Promise<ActionResult<DownloadTableResult>> {
  return withActionAuth(
    "content.downloads.read",
    async () => {
      const { page, pageSize, offset } = normalizePage(params);
      const statusValue =
        params.status && params.status !== ("all" as unknown as DownloadListParams["status"])
          ? params.status
          : undefined;
      const result = await listDownloads({
        limit: pageSize,
        offset,
        search: params.search,
        status: statusValue,
      });

      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Failed to load downloads");
      }

      return {
        items: result.data.items.map(formatListRow),
        total: result.data.total,
        page,
        pageSize,
      };
    },
    { actionName: "fetchDownloadsTable" },
  );
}

export async function loadDownload(id: string) {
  return getDownloadById(id);
}

export async function saveDownload(
  values: DownloadFormState,
): Promise<{ success: boolean; id?: string; status?: string; message?: string }> {
  const result = await withActionAuth(
    "content.downloads.write",
    async () => {
      const parsed = DownloadSchema.safeParse(values);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      }

      const data = parsed.data;
      const slugValue = (data.slug && data.slug.trim()) || slugify(data.title);
      if (!slugValue) {
        throw new Error("Slug is required.");
      }

      // Unique slug check (excluding current doc and its draft)
      const existing = await backofficeReadClient.fetch<{ _id?: string } | null>(
        `*[_type == "download" && slug.current == $slug && !(_id in [$currentId, "drafts." + $currentId])][0]{_id}`,
        { slug: slugValue, currentId: data._id ?? "" },
      );
      if (existing?._id) {
        throw new Error("Slug already in use by another download.");
      }

      const payload: DownloadInput = {
        _id: data._id,
        title: data.title.trim(),
        slug: { current: slugValue },
        status: data.status,
        summary: data.summary?.trim() || undefined,
        file: { _type: "file", asset: { _ref: data.fileAssetId } },
        relatedProducts:
          data.relatedProductIds?.map((id) => ({ _type: "reference", _ref: id })) ?? undefined,
      };

      const result = await upsertDownload(payload);

      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Failed to save download");
      }

      const downloadId = result.data._id;

      revalidatePath("/admin/content/downloads");
      revalidatePath(`/admin/content/downloads/${downloadId}`);

      return { id: downloadId, status: payload.status as string };
    },
    { actionName: "saveDownload" },
  );

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return { success: true, ...result.data };
}

export async function deleteDownloadById(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "Missing download id." };
  }

  return withActionAuth(
    "content.downloads.publish",
    async () => {
      const result = await deleteDownload(normalizedId);

      if (!result.success) {
        return { success: false, message: result.message ?? "Failed to delete download" };
      }

      revalidatePath("/admin/content/downloads");
      revalidatePath(`/admin/content/downloads/${normalizedId}`);

      return { success: true };
    },
    { actionName: "deleteDownloadById" },
  );
}

export async function searchDownloadProducts(query: string): Promise<ReferenceOption[]> {
  const term = (query ?? "").trim();
  const searchPattern = term ? `*${term.replace(/\s+/g, " ")}*` : "*";
  const result = await withActionAuth(
    "content.downloads.read",
    async () => {
      const products = await backofficeReadClient.fetch<
        { _id: string; name?: string; slug?: { current?: string } }[]
      >(
        `*[_type == "product" && (name match $search || slug.current match $search)] | order(_updatedAt desc) [0...8] {
          _id,
          name,
          slug
        }`,
        { search: searchPattern },
      );

      return products;
    },
    { actionName: "searchDownloadProducts" },
  );

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "Unable to search products");
  }

  return result.data.map((product) => ({
    id: product._id,
    label: product.name ?? "Product",
    description: product.slug?.current ?? undefined,
  }));
}
