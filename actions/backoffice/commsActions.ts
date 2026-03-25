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
import {
  createNotification,
  sendBulkNotifications,
  type NotificationPriority,
  type NotificationType,
} from "@/lib/notificationService";

export type ContactFilters = PaginationParams & {
  status?: "new" | "read" | "replied" | "closed";
  search?: string;
  priority?: "low" | "medium" | "high" | "urgent";
};

export type ContactRecord = {
  _id: string;
  _type: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  status?: ContactFilters["status"] | "resolved";
  priority?: ContactFilters["priority"];
  submittedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  updatedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  relatedOrder?: { _id: string; orderNumber?: string; orderKind?: string; status?: string };
  user?: { _id: string; email?: string; firstName?: string; lastName?: string };
  _createdAt?: string;
  _updatedAt?: string;
};

type NotificationPayload = {
  title: string;
  message: string;
  recipients: string[];
  type?: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  sentBy?: string;
};

const CONTACT_PROJECTION = `{
  _id,
  _type,
  name,
  email,
  phone,
  subject,
  message,
  status,
  priority,
  submittedAt,
  createdAt,
  resolvedAt,
  resolvedBy,
  updatedAt,
  ipAddress,
  userAgent,
  relatedOrder->{_id, orderNumber, orderKind, status},
  user->{_id, email, firstName, lastName},
  _createdAt,
  _updatedAt
}`;

const buildContactFilter = (filters: ContactFilters) => {
  const clauses = ['(_type == "contact" || _id in path("drafts.contact.**"))'];
  const params: Record<string, unknown> = {};

  if (filters.status) {
    clauses.push("status == $status");
    params.status = filters.status;
  }

  if (filters.priority) {
    clauses.push("priority == $priority");
    params.priority = filters.priority;
  }

  const searchTerm = typeof filters.search === "string" ? filters.search.trim() : "";
  if (searchTerm) {
    clauses.push(
      "(name match $search || email match $search || subject match $search || message match $search)",
    );
    params.search = `*${searchTerm.replace(/\s+/g, " ")}*`;
  }

  return { filter: clauses.join(" && "), params };
};

export const listContacts = async (
  filters: ContactFilters = {},
): Promise<ActionResult<PaginatedResult<ContactRecord>>> => {
  return withActionAuth("comms.contacts.read", async () => {
    const { filter, params } = buildContactFilter(filters);
    const { limit, offset, end } = normalizePagination(filters);
    const queryParams = { ...params, offset, end };

    const query = `*[${filter}] | order(coalesce(submittedAt, _createdAt) desc) [$offset...$end] ${CONTACT_PROJECTION}`;
    const countQuery = `count(*[${filter}])`;

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<ContactRecord[]>(query, queryParams),
      backofficeReadClient.fetch<number>(countQuery, params),
    ]);

    return { items, total, limit, offset };
  }, { actionName: "listContacts" });
};

export const getContactById = async (
  id: string,
): Promise<ActionResult<ContactRecord | null>> => {
  const normalized = normalizeDocumentIds(id, "Contact");
  if (!normalized) {
    return { success: false, message: "Contact ID is required" };
  }

  return withActionAuth("comms.contacts.read", async () => {
    const { id: normalizedId, draftId } = normalized;

    const contact = await backofficeReadClient.fetch<ContactRecord | null>(
      `coalesce(
        *[_type == "contact" && _id == $draftId][0],
        *[_type == "contact" && _id == $id][0]
      ) ${CONTACT_PROJECTION}`,
      { id: normalizedId, draftId },
    );

    return contact;
  }, { actionName: "getContactById" });
};

export const markContactResolved = async (
  id: string,
  resolvedBy?: string,
): Promise<ActionResult<{ _id: string; status: string; resolvedAt?: string; resolvedBy?: string }>> => {
  return withActionAuth("comms.contacts.write", async () => {
    const now = nowIso();
    const updated = await backendClient
      .patch(id)
      .set({
        status: "closed",
        resolvedAt: now,
        resolvedBy: resolvedBy ?? "backoffice",
        updatedAt: now,
      })
      .commit<{ _id: string; status: string; resolvedAt?: string; resolvedBy?: string }>();

    return updated;
  }, { actionName: "markContactResolved" });
};

export const sendNotification = async (
  payload: NotificationPayload,
): Promise<ActionResult<{ total: number; successful: number; failed: number }>> => {
  return withActionAuth("comms.notifications.send", async () => {
    const { recipients, ...rest } = payload;

    if (!recipients || recipients.length === 0) {
      throw new Error("Recipients are required");
    }

    const normalizedPayload = {
      ...rest,
      type: rest.type ?? "general",
      priority: rest.priority ?? "medium",
    };

    const result = await sendBulkNotifications(recipients, normalizedPayload);
    if (!result.success) {
      throw new Error(result.error || "Failed to send notifications");
    }

    return {
      total: result.total ?? 0,
      successful: result.successful ?? 0,
      failed: result.failed ?? 0,
    };
  }, { actionName: "sendNotification" });
};

export const sendSingleNotification = async (
  clerkUserId: string,
  payload: Omit<NotificationPayload, "recipients">,
): Promise<ActionResult<{ id?: string }>> => {
  return withActionAuth("comms.notifications.send", async () => {
    const result = await createNotification({
      clerkUserId,
      title: payload.title,
      message: payload.message,
      type: payload.type ?? "general",
      priority: payload.priority ?? "medium",
      actionUrl: payload.actionUrl,
      sentBy: payload.sentBy,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send notification");
    }

    return { id: result.notification?.id };
  }, { actionName: "sendSingleNotification" });
};

export const exportSubscriptions = async (): Promise<
  ActionResult<{ subscriptions: unknown[] }>
> => {
  return withActionAuth("comms.subscriptions.manage", async () => {
    const subscriptions = await backofficeReadClient.fetch<unknown[]>(
      `*[_type == "subscription"] | order(_createdAt desc){
        _id,
        email,
        name,
        preferences,
        createdAt,
        _createdAt
      }`,
    );

    return { subscriptions };
  }, { actionName: "exportSubscriptions" });
};
