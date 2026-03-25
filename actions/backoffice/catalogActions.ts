"use server";

import {
  ActionResult,
  PaginatedResult,
  PaginationParams,
  backofficeReadClient,
  normalizePagination,
  nowIso,
  withActionAuth,
  normalizeDocumentIds,
} from "./common";
import { backendClient } from "@/sanity/lib/backendClient";

type DocumentType = "catalog" | "download";

export type CatalogFilters = PaginationParams & {
  status?: string;
  search?: string;
  category?: string;
};

export type CatalogInput = {
  _id?: string;
  status?: string;
  title?: string;
  slug?: { current: string };
  description?: string;
  publishDate?: string;
  file?: { _type: "file"; asset: { _ref: string } };
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    fileSize?: number;
    fileType?: string;
  };
  relatedDownloads?: { _type: "reference"; _ref: string }[];
  coverImage?: {
    useAutoGeneration?: boolean;
    customCover?: { _type: "image"; asset?: { _ref?: string } };
    generatedFromFile?: string;
    placeholderPath?: string;
  };
  publishedAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type DownloadInput = {
  _id?: string;
  status?: string;
  title?: string;
  slug?: { current: string };
  summary?: string;
  file?: { _type: "file"; asset: { _ref: string } };
  relatedProducts?: { _type: "reference"; _ref: string }[];
  publishedAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type CatalogRecord = {
  _id: string;
  _type: string;
  title?: string;
  slug?: { current?: string };
  description?: string;
  publishDate?: string;
  status?: string;
  file?: { _type?: "file"; asset?: { _ref?: string } };
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    fileSize?: number;
    fileType?: string;
  };
  relatedDownloads?: { _id?: string; title?: string; slug?: { current?: string } }[];
  coverImage?: {
    useAutoGeneration?: boolean;
    customCover?: { asset?: { _ref?: string } };
    generatedFromFile?: string;
    placeholderPath?: string;
  };
  publishedAt?: string;
  updatedAt?: string;
  _updatedAt?: string;
  _createdAt?: string;
};

export type DownloadRecord = {
  _id: string;
  _type: string;
  title?: string;
  slug?: { current?: string };
  summary?: string;
  status?: string;
  file?: { _type?: "file"; asset?: { _ref?: string } };
  relatedProducts?: { _id?: string; name?: string; slug?: { current?: string } }[];
  publishedAt?: string;
  updatedAt?: string;
  _updatedAt?: string;
  _createdAt?: string;
};

const CATALOG_PROJECTION = `{
  _id,
  _type,
  title,
  slug,
  description,
  publishDate,
  status,
  file,
  metadata{
    category,
    tags,
    version,
    fileSize,
    fileType
  },
  relatedDownloads[]->{_id, title, slug},
  coverImage{
    useAutoGeneration,
    customCover,
    generatedFromFile,
    placeholderPath
  },
  publishedAt,
  updatedAt,
  _updatedAt,
  _createdAt
}`;

const DOWNLOAD_PROJECTION = `{
  _id,
  _type,
  title,
  slug,
  summary,
  status,
  file,
  relatedProducts[]->{_id, name, slug},
  publishedAt,
  updatedAt,
  _updatedAt,
  _createdAt
}`;

const buildFilter = (type: DocumentType, filters: CatalogFilters) => {
  const clauses = [`(_type == "${type}" || _id in path("drafts.${type}.**"))`];
  const params: Record<string, unknown> = {};

  if (filters.status) {
    clauses.push("status == $status");
    params.status = filters.status;
  }

  if (type === "catalog" && filters.category) {
    clauses.push("metadata.category == $category");
    params.category = filters.category;
  }

  const searchTerm = typeof filters.search === "string" ? filters.search.trim() : "";
  if (searchTerm) {
    const searchFields =
      type === "catalog"
        ? "(title match $search || description match $search || slug.current match $search)"
        : "(title match $search || summary match $search || slug.current match $search)";
    clauses.push(searchFields);
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  return { filter: clauses.join(" && "), params };
};

const listDocuments = async <T>(
  type: DocumentType,
  filters: CatalogFilters,
  permission: "content.catalogs.read" | "content.downloads.read",
  projection: string,
): Promise<ActionResult<PaginatedResult<T>>> => {
  return withActionAuth(permission, async () => {
    const { filter, params } = buildFilter(type, filters);
    const { limit, offset, end } = normalizePagination(filters);
    const queryParams = { ...params, offset, end };

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<T[]>(
        `*[${filter}] | order(coalesce(updatedAt, publishDate, _updatedAt) desc, _createdAt desc) [$offset...$end] ${projection}`,
        queryParams,
      ),
      backofficeReadClient.fetch<number>(`count(*[${filter}])`, params),
    ]);

    return { items, total, limit, offset };
  }, { actionName: `list-${type}` });
};

const upsertDocument = async (
  type: DocumentType,
  input: CatalogInput | DownloadInput,
  permission: "content.catalogs.write" | "content.downloads.write",
): Promise<ActionResult<{ _id: string }>> => {
  return withActionAuth(permission, async () => {
    const { _id, ...payload } = input;
    const now = nowIso();
    const statusValue = typeof payload.status === "string" ? payload.status : undefined;
    const baseData: Record<string, unknown> = {
      ...payload,
      updatedAt: now,
      _type: type,
    };

    if (statusValue === "published" && !payload.publishedAt) {
      Object.assign(baseData, { publishedAt: now });
    }

    if (_id) {
      const updated = await backendClient.patch(_id).set(baseData).commit<{ _id: string }>();
      return { _id: updated._id };
    }

    const created = await backendClient.create<{ _id?: string; createdAt?: string; _type: string; status?: string }>(
      {
        ...baseData,
        ...(statusValue ? { status: statusValue } : {}),
        createdAt: now,
      } as { _id?: string; createdAt?: string; _type: string; status?: string }
    );

    return { _id: created._id };
  }, { actionName: `upsert-${type}` });
};

const deleteDocument = async (
  type: DocumentType,
  id: string,
  permission: "content.catalogs.publish" | "content.downloads.publish",
): Promise<ActionResult<{ deletedId: string }>> => {
  const normalized = normalizeDocumentIds(
    id,
    type === "catalog" ? "Catalog" : "Download",
  );
  if (!normalized) {
    return {
      success: false,
      message: `${type === "catalog" ? "Catalog" : "Download"} ID is required`,
    };
  }

  return withActionAuth(permission, async () => {
    const { id: normalizedId, draftId } = normalized;

    await Promise.allSettled([backendClient.delete(normalizedId), backendClient.delete(draftId)]);

    return { deletedId: normalizedId };
  }, { actionName: `delete-${type}` });
};

export const listCatalogs = async (filters: CatalogFilters = {}) => {
  return listDocuments<CatalogRecord>("catalog", filters, "content.catalogs.read", CATALOG_PROJECTION);
};

export const listDownloads = async (filters: CatalogFilters = {}) => {
  return listDocuments<DownloadRecord>("download", filters, "content.downloads.read", DOWNLOAD_PROJECTION);
};

export const getCatalogById = async (id: string): Promise<ActionResult<CatalogRecord | null>> => {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "Catalog id is required" };
  }

  return withActionAuth("content.catalogs.read", async () => {
    const draftId = normalizedId.startsWith("drafts.") ? normalizedId : `drafts.${normalizedId}`;

    const catalog = await backofficeReadClient.fetch<CatalogRecord | null>(
      `coalesce(
        *[_type == "catalog" && _id == $draftId][0],
        *[_type == "catalog" && _id == $id][0]
      ) ${CATALOG_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return catalog;
  }, { actionName: "getCatalogById" });
};

export const getDownloadById = async (
  id: string,
): Promise<ActionResult<DownloadRecord | null>> => {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return { success: false, message: "Download id is required" };
  }

  return withActionAuth("content.downloads.read", async () => {
    const draftId = normalizedId.startsWith("drafts.") ? normalizedId : `drafts.${normalizedId}`;

    const download = await backofficeReadClient.fetch<DownloadRecord | null>(
      `coalesce(
        *[_type == "download" && _id == $draftId][0],
        *[_type == "download" && _id == $id][0]
      ) ${DOWNLOAD_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return download;
  }, { actionName: "getDownloadById" });
};

export const upsertCatalog = async (input: CatalogInput) => {
  return upsertDocument("catalog", input, "content.catalogs.write");
};

export const upsertDownload = async (input: DownloadInput) => {
  return upsertDocument("download", input, "content.downloads.write");
};

export const deleteCatalog = async (id: string) => {
  return deleteDocument("catalog", id, "content.catalogs.publish");
};

export const deleteDownload = async (id: string) => {
  return deleteDocument("download", id, "content.downloads.publish");
};
