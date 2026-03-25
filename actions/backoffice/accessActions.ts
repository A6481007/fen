"use server";

import {
  ActionResult,
  PaginatedResult,
  PaginationParams,
  backofficeReadClient,
  normalizePagination,
  nowIso,
  withActionAuth,
} from "./common";
import {
  BackofficeStaffRole,
  isBackofficeStaffRole,
} from "@/config/authz";
import { backendClient } from "@/sanity/lib/backendClient";

type StaffInput = {
  userId: string;
  role: BackofficeStaffRole;
};

const STAFF_PROJECTION = `{
  _id,
  email,
  firstName,
  lastName,
  isAdmin,
  staffRoles,
  staffStatus,
  staffAssignedBy,
  staffAssignedAt,
  updatedAt,
  _updatedAt,
  _createdAt
}`;

export const listStaff = async (
  pagination: PaginationParams = {},
): Promise<ActionResult<PaginatedResult<unknown>>> => {
  return withActionAuth("access.staff.manage", async () => {
    const { limit, offset, end } = normalizePagination(pagination);

    const [items, total] = await Promise.all([
      backofficeReadClient.fetch<unknown[]>(
        `*[
          _type == "user" &&
          (isAdmin == true || (staffRoles && count(staffRoles) > 0))
        ] | order(_createdAt desc) [$offset...$end] ${STAFF_PROJECTION}`,
        { offset, end },
      ),
      backofficeReadClient.fetch<number>(
        `count(*[_type == "user" && (isAdmin == true || (staffRoles && count(staffRoles) > 0))])`,
      ),
    ]);

    return { items, total, limit, offset };
  }, { actionName: "listStaff" });
};

const fetchUserById = (userId: string) =>
  backendClient.fetch<{
    _id: string;
    email?: string;
    isAdmin?: boolean;
    staffRoles?: unknown;
  } | null>(
    `*[_type == "user" && _id == $userId][0]{_id, email, isAdmin, staffRoles}`,
    { userId },
  );

export const assignStaffRole = async (
  input: StaffInput,
): Promise<ActionResult<{ _id: string; staffRoles: BackofficeStaffRole[] }>> => {
  return withActionAuth("access.staff.manage", async (ctx) => {
    const { userId, role } = input;

    if (!isBackofficeStaffRole(role)) {
      throw new Error("Invalid staff role");
    }

    const user = await fetchUserById(userId);
    if (!user?._id) {
      throw new Error("User not found");
    }

    const currentRoles = Array.isArray(user.staffRoles)
      ? (user.staffRoles as BackofficeStaffRole[])
      : [];

    const updatedRoles = Array.from(new Set([...currentRoles, role]));
    const now = nowIso();

    const updated = await backendClient
      .patch(userId)
      .set({
        staffRoles: updatedRoles,
        staffStatus: "active",
        staffAssignedBy: ctx.email ?? "system",
        staffAssignedAt: now,
        updatedAt: now,
      })
      .commit<{ _id: string; staffRoles: BackofficeStaffRole[] }>();

    return updated;
  }, { actionName: "assignStaffRole" });
};

export const removeStaffRole = async (
  input: StaffInput,
): Promise<ActionResult<{ _id: string; staffRoles: BackofficeStaffRole[] }>> => {
  return withActionAuth("access.staff.manage", async () => {
    const { userId, role } = input;
    if (!isBackofficeStaffRole(role)) {
      throw new Error("Invalid staff role");
    }

    const user = await fetchUserById(userId);
    if (!user?._id) {
      throw new Error("User not found");
    }

    const currentRoles = Array.isArray(user.staffRoles)
      ? (user.staffRoles as BackofficeStaffRole[])
      : [];

    const updatedRoles = currentRoles.filter((value) => value !== role);
    const now = nowIso();

    const updated = await backendClient
      .patch(userId)
      .set({
        staffRoles: updatedRoles,
        staffStatus: updatedRoles.length > 0 ? "active" : "inactive",
        updatedAt: now,
      })
      .commit<{ _id: string; staffRoles: BackofficeStaffRole[] }>();

    return updated;
  }, { actionName: "removeStaffRole" });
};
