import "server-only";

import { auth, currentUser, type User } from "@clerk/nextjs/server";
import {
  ALL_BACKOFFICE_PERMISSIONS,
  BackofficePermission as BackofficePermissionConfig,
  BackofficeRole as ConfigBackofficeRole,
  BackofficeStaffRole,
  isBackofficeStaffRole,
  permissionsFromStaffRoles,
} from "@/config/authz";
import { isAdmin as isAdminFromDoc, isUserAdmin } from "@/lib/adminUtils";
import { backendClient } from "@/sanity/lib/backendClient";
import { type EmployeeRole } from "@/types/employee";

export type Permission = BackofficePermissionConfig;
export type BackofficeRole = BackofficeStaffRole;

type BackofficeSanityUser = {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isEmployee?: boolean;
  employeeRole?: EmployeeRole | null;
  employeeStatus?: string | null;
  staffRoles?: BackofficeRole[] | string[];
  staffStatus?: string | null;
  staffAssignedBy?: string | null;
  staffAssignedAt?: string | null;
};

export type BackofficeContext = {
  clerkUserId: string | null;
  clerkUser: User | null;
  email: string | null;
  isAdmin: boolean;
  staffRoles: BackofficeRole[];
  employeeRole: EmployeeRole | null;
  permissions: Permission[];
  roles: ConfigBackofficeRole[];
  hasBackofficeAccess: boolean;
  sanityUser: BackofficeSanityUser | null;
};

const EMPLOYEE_ROLES: EmployeeRole[] = [
  "callcenter",
  "packer",
  "warehouse",
  "deliveryman",
  "incharge",
  "accounts",
];

const SANITY_USER_BY_CLERK_ID_QUERY = `
  *[_type == "user" && clerkUserId == $clerkUserId][0]{
    _id,
    email,
    firstName,
    lastName,
    isAdmin,
    isEmployee,
    employeeRole,
    employeeStatus,
    staffRoles,
    staffStatus,
    staffAssignedBy,
    staffAssignedAt
  }
`;

const isEmployeeRole = (value: unknown): value is EmployeeRole => {
  return typeof value === "string" && EMPLOYEE_ROLES.includes(value as EmployeeRole);
};

const coerceStaffRoles = (roles: unknown): BackofficeRole[] => {
  if (!Array.isArray(roles)) return [];
  return Array.from(
    new Set(
      roles.filter((value): value is BackofficeRole => isBackofficeStaffRole(value)),
    ),
  );
};

const computePermissions = (
  staffRoles: BackofficeRole[],
  isAdmin: boolean,
): Permission[] => {
  if (isAdmin) return ALL_BACKOFFICE_PERMISSIONS;
  return permissionsFromStaffRoles(staffRoles);
};

const fetchSanityUser = async (
  clerkUserId: string,
): Promise<BackofficeSanityUser | null> => {
  try {
    return await backendClient.fetch<BackofficeSanityUser | null>(
      SANITY_USER_BY_CLERK_ID_QUERY,
      { clerkUserId },
    );
  } catch (error) {
    console.error("[authz] Failed to load Sanity user for authz", {
      error,
      clerkUserId,
    });
    return null;
  }
};

const EMPTY_CONTEXT: BackofficeContext = {
  clerkUserId: null,
  clerkUser: null,
  email: null,
  isAdmin: false,
  staffRoles: [],
  employeeRole: null,
  permissions: [],
  roles: [],
  hasBackofficeAccess: false,
  sanityUser: null,
};

const logClerkError = (error: unknown, clerkUserId?: string | null) => {
  const details =
    error && typeof error === "object"
      ? {
          message: (error as { message?: string }).message,
          status: (error as { status?: number }).status,
          code: (error as { code?: string }).code,
          clerkTraceId:
            (error as { clerkTraceId?: string }).clerkTraceId ||
            (error as { traceId?: string }).traceId,
          retryAfter: (error as { retryAfter?: number }).retryAfter,
        }
      : { message: String(error) };

  console.error("[authz] Failed to load Clerk user", {
    clerkUserId,
    ...details,
  });
};

export const getBackofficeContext = async (): Promise<BackofficeContext> => {
  let authResult: Awaited<ReturnType<typeof auth>>;

  try {
    authResult = await auth();
  } catch (error) {
    console.error("[authz] Failed to resolve Clerk auth state", error);
    return { ...EMPTY_CONTEXT };
  }

  const clerkUserId = authResult?.userId ?? null;
  if (!clerkUserId) {
    return { ...EMPTY_CONTEXT };
  }

  let clerk: User | null = null;
  try {
    clerk = await currentUser();
  } catch (error) {
    logClerkError(error, clerkUserId);
  }

  const sanityUser = await fetchSanityUser(clerkUserId);

  const email =
    clerk?.primaryEmailAddress?.emailAddress ??
    clerk?.emailAddresses?.[0]?.emailAddress ??
    sanityUser?.email ??
    null;

  const staffRoles = coerceStaffRoles(sanityUser?.staffRoles);
  const employeeRole = isEmployeeRole(sanityUser?.employeeRole) ? sanityUser?.employeeRole : null;
  const isAdmin =
    isAdminFromDoc({ email: sanityUser?.email, isAdmin: sanityUser?.isAdmin }) ||
    isUserAdmin(email);

  const permissions = computePermissions(staffRoles, isAdmin);
  const hasBackofficeAccess = isAdmin || permissions.length > 0;
  const roles: ConfigBackofficeRole[] = [
    ...(isAdmin ? (["admin"] as ConfigBackofficeRole[]) : []),
    ...staffRoles,
    ...(employeeRole ? ([employeeRole] as ConfigBackofficeRole[]) : []),
  ];

  return {
    clerkUserId,
    clerkUser: clerk,
    email,
    isAdmin,
    staffRoles,
    employeeRole,
    permissions,
    roles,
    hasBackofficeAccess,
    sanityUser,
  };
};

export const hasPermission = (
  ctx: Pick<BackofficeContext, "permissions" | "isAdmin">,
  required: Permission | Permission[],
): boolean => {
  if (ctx.isAdmin) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((permission) => ctx.permissions.includes(permission));
};

export class PermissionError extends Error {
  status: number;
  code: "unauthorized" | "forbidden";

  constructor(code: "unauthorized" | "forbidden", message?: string) {
    super(message ?? (code === "unauthorized" ? "Unauthorized" : "Forbidden"));
    this.code = code;
    this.status = code === "unauthorized" ? 401 : 403;
  }
}

export const requirePermission = async (
  required: Permission | Permission[],
  options: { allowAdminBypass?: boolean } = {},
): Promise<BackofficeContext> => {
  const ctx = await getBackofficeContext();
  const allowAdminBypass = options.allowAdminBypass ?? true;

  if (!ctx.clerkUserId || !ctx.clerkUser) {
    throw new PermissionError("unauthorized");
  }

  if (ctx.isAdmin && allowAdminBypass) {
    return ctx;
  }

  if (!ctx.hasBackofficeAccess) {
    throw new PermissionError("forbidden");
  }

  if (!hasPermission(ctx, required)) {
    throw new PermissionError("forbidden");
  }

  return ctx;
};
