"use server";

import { revalidatePath } from "next/cache";
import {
  backofficeReadClient,
  withActionAuth,
} from "@/actions/backoffice/common";
import {
  deleteCatalog,
  listCatalogs,
  upsertCatalog,
  type CatalogRecord,
  type CatalogInput,
} from "@/actions/backoffice/catalogActions";
import type { ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import type {
  CatalogFormState,
  CatalogListParams,
  CatalogListRow,
  CatalogStatus,
} from "@/components/admin/backoffice/catalogs/types";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const normalizePage = (params: CatalogListParams) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const formatListRow = (catalog: CatalogRecord): CatalogListRow => ({
  id: catalog._id,
  title: catalog.title ?? "Untitled catalog",
  slug: catalog.slug?.current,
  status: catalog.status as CatalogStatus | undefined,
  category: catalog.metadata?.category,
  fileType: catalog.metadata?.fileType,
  publishDate: catalog.publishDate,
  updatedAt: catalog.updatedAt ?? catalog._updatedAt ?? catalog._createdAt,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

export async function fetchCatalogsTable(
  params: CatalogListParams = {},
): Promise<
  | { success: true; data: { items: CatalogListRow[]; total: number; page: number; pageSize: number } }
  | { success: false; message: string }
> {
  const { page, pageSize, offset } = normalizePage(params);
  try {
    const statusValue = params.status && params.status !== ("all" as unknown as CatalogStatus) ? params.status : undefined;
    const categoryValue =
      params.category && params.category !== "all" ? params.category : undefined;

    const result = await listCatalogs({
      limit: pageSize,
      offset,
      search: params.search,
      status: statusValue,
      category: categoryValue,
    });

    if (!result.success || !result.data) {
      return { success: false, message: result.message ?? "Failed to load catalogs" };
    }

    return {
      success: true,
      data: {
        items: result.data.items.map(formatListRow),
        total: result.data.total,
        page,
        pageSize,
      },
    };
  } catch (error) {
    console.error("fetchCatalogsTable failed", error);
    return { success: false, message: "Failed to load catalogs" };
  }
};

export async function saveCatalog(values: CatalogFormState): Promise<{
  success: boolean;
  id?: string;
  status?: string;
  message?: string;
}> {
  const slugValue = values.slug?.trim() || slugify(values.title ?? "");
  if (!slugValue) {
    return { success: false, message: "Slug is required." };
  }

  if (!values.title?.trim()) {
    return { success: false, message: "Title is required." };
  }

  if (!values.fileAssetId) {
    return { success: false, message: "Upload a catalog file before saving." };
  }

  const publishDate = values.publishDate?.trim() || undefined;

  const normalizedId = values._id?.replace(/^drafts\\./, "") ?? "";

  try {
    const slugConflictCount = await backofficeReadClient.fetch<number>(
      `count(*[
        _type == "catalog" &&
        slug.current == $slug &&
        !(_id in path("drafts.**")) &&
        !(_id in [$id, $draftId])
      ])`,
      { slug: slugValue, id: normalizedId, draftId: normalizedId ? `drafts.${normalizedId}` : "" },
    );

    if (slugConflictCount > 0) {
      return { success: false, message: "Slug is already in use. Please choose a unique slug." };
    }
  } catch (error) {
    console.error("Failed to check catalog slug uniqueness", error);
    return { success: false, message: "Unable to validate slug uniqueness. Please try again." };
  }

  const { data: slugConflictCount } = await backofficeReadClient.fetch<
    number
  >(
    `count(*[_type == "catalog" && slug.current == $slug && !(_id in path("drafts.**")) && _id != $id])`,
    { slug: slugValue, id: values._id ?? "" },
  ).then((count) => ({ data: count })).catch(() => ({ data: 0 }));

  if (slugConflictCount && slugConflictCount > 0) {
    return { success: false, message: "Slug is already in use. Please choose a unique slug." };
  }

  const payload: CatalogInput = {
    _id: values._id,
    title: values.title.trim(),
    slug: { current: slugValue },
    description: values.description?.trim() || undefined,
    publishDate,
    status: values.status || "draft",
    file: { _type: "file", asset: { _ref: values.fileAssetId } },
    metadata: {
      category: values.category?.trim() || undefined,
      tags: values.tags?.map((tag) => tag.trim()).filter(Boolean),
      version: values.version?.trim() || undefined,
    },
    relatedDownloads:
      values.relatedDownloadIds?.map((id) => ({ _type: "reference", _ref: id })) ?? undefined,
    coverImage: {
      useAutoGeneration: values.useAutoGeneration !== false,
      ...(values.customCoverAssetId
        ? { customCover: { _type: "image", asset: { _ref: values.customCoverAssetId } } }
        : {}),
    },
  };

  const result = await upsertCatalog(payload);

  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "Failed to save catalog" };
  }

  const catalogId = result.data._id;

  revalidatePath("/admin/content/catalogs");
  revalidatePath(`/admin/content/catalogs/${catalogId}`);

  return { success: true, id: catalogId, status: payload.status as string };
}

export async function deleteCatalogById(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "Missing catalog id." };
  }

  const result = await deleteCatalog(normalizedId);

  if (!result.success) {
    return { success: false, message: result.message ?? "Failed to delete catalog" };
  }

  revalidatePath("/admin/content/catalogs");
  revalidatePath(`/admin/content/catalogs/${normalizedId}`);

  return { success: true };
}

export async function searchCatalogDownloads(query: string): Promise<ReferenceOption[]> {
  const term = (query ?? "").trim();
  const searchPattern = term ? `*${term.replace(/\s+/g, " ")}*` : "*";
  const result = await withActionAuth(
    "content.downloads.read",
    async () => {
      const downloads = await backofficeReadClient.fetch<
        { _id: string; title?: string; slug?: { current?: string } }[]
      >(
        `*[_type == "download" && (title match $search || slug.current match $search)] | order(_updatedAt desc) [0...8] {
          _id,
          title,
          slug
        }`,
        { search: searchPattern },
      );

      return downloads;
    },
    { actionName: "searchCatalogDownloads" },
  );

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "Unable to search downloads");
  }

  return result.data.map((download) => ({
    id: download._id,
    label: download.title ?? "Download",
    description: download.slug?.current ?? undefined,
  }));
}
