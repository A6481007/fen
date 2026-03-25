"use server";

import { revalidatePath } from "next/cache";
import {
  getContactById,
  listContacts,
  markContactResolved,
  type ContactFilters,
  type ContactRecord,
} from "@/actions/backoffice/commsActions";

export type ContactListRow = {
  id: string;
  name: string;
  email?: string;
  subject?: string;
  status?: ContactFilters["status"] | "resolved";
  priority?: ContactFilters["priority"];
  submittedAt?: string;
  message?: string;
};

export type ContactListParams = {
  search?: string;
  status?: ContactFilters["status"] | "all" | "";
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const normalizePage = (params: ContactListParams) => {
  const pageSize =
    typeof params.pageSize === "number" && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  const page = typeof params.page === "number" && params.page > 0 ? Math.floor(params.page) : 1;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

const formatListRow = (contact: ContactRecord): ContactListRow => ({
  id: contact._id,
  name: contact.name ?? "Unknown sender",
  email: contact.email,
  subject: contact.subject,
  status: contact.status,
  priority: contact.priority,
  submittedAt: contact.submittedAt ?? contact._createdAt,
  message: contact.message,
});

export async function fetchContactsTable(
  params: ContactListParams = {},
): Promise<{ items: ContactListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, offset } = normalizePage(params);
  const result = await listContacts({
    limit: pageSize,
    offset,
    search: params.search,
    status:
      params.status && params.status !== "all"
        ? (params.status as ContactFilters["status"])
        : undefined,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message ?? "Failed to load contacts");
  }

  return { items: result.data.items.map(formatListRow), total: result.data.total, page, pageSize };
}

export async function loadContactDetail(id: string): Promise<ContactRecord | null> {
  if (!id) {
    throw new Error("Contact ID is required");
  }

  const result = await getContactById(id);

  if (!result.success) {
    throw new Error(result.message ?? "Failed to load contact");
  }

  return result.data ?? null;
}

export async function resolveContact(id: string): Promise<{
  success: boolean;
  status?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  message?: string;
}> {
  if (!id) {
    return { success: false, message: "Contact ID is required" };
  }

  const result = await markContactResolved(id);

  if (!result.success) {
    return { success: false, message: result.message ?? "Failed to update contact" };
  }

  revalidatePath("/admin/comms/contacts");

  const data = result.data;

  return {
    success: true,
    status: data?.status,
    resolvedAt: data?.resolvedAt,
    resolvedBy: data?.resolvedBy,
  };
}
