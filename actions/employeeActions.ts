"use server";

import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { isBackofficeStaffRole } from "@/config/authz";
import {
  Employee,
  EmployeeRole,
  EmployeeStatus,
  ROLE_PERMISSIONS,
} from "@/types/employee";
import { requirePermission, type BackofficeRole } from "@/lib/authz";
import { recordAuditLog } from "@/lib/auditLogger";

const normalizeStaffRoles = (roles: unknown): BackofficeRole[] => {
  if (!Array.isArray(roles)) return [];
  return Array.from(
    new Set(
      roles.filter((role): role is BackofficeRole => isBackofficeStaffRole(role)),
    ),
  );
};

// Assign employee role to a user
export async function assignEmployeeRole(
  userId: string,
  role: EmployeeRole
): Promise<{ success: boolean; message: string; employee?: Employee }> {
  try {
    const authz = await requirePermission("access.staff.manage");
    const adminUser =
      authz.sanityUser && authz.sanityUser._id
        ? authz.sanityUser
        : authz.clerkUserId
          ? await backendClient.fetch(
              `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
              { clerkUserId: authz.clerkUserId }
            )
          : null;

    // Get user to assign role to
    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const actorEmail = adminUser?.email ?? authz.email ?? "system";
    const assignedAt = new Date().toISOString();

    // Update user with employee fields
    const updatedUser = await backendClient
      .patch(userId)
      .set({
        isEmployee: true,
        employeeRole: role,
        employeeStatus: "active",
        employeeAssignedBy: actorEmail,
        employeeAssignedAt: assignedAt,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    if (role === "callcenter") {
      const email =
        typeof updatedUser.email === "string"
          ? updatedUser.email.trim().toLowerCase()
          : "";
      const fallbackName =
        `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim() ||
        updatedUser.email ||
        "Sales";
      const emailFilter = email ? " || lower(email) == $email" : "";

      const existingContact = await backendClient.fetch<{
        _id: string;
        name?: string;
        email?: string;
        user?: { _ref?: string };
      } | null>(
        `*[_type == "salesContact" && (user._ref == $userId${emailFilter})][0]{
          _id,
          name,
          email,
          user
        }`,
        { userId: updatedUser._id, email }
      );

      if (existingContact?._id) {
        const patch: Record<string, unknown> = {};
        if (!existingContact.user?._ref) {
          patch.user = { _type: "reference", _ref: updatedUser._id };
        }
        if (!existingContact.email && updatedUser.email) {
          patch.email = updatedUser.email;
        }
        if (!existingContact.name && fallbackName) {
          patch.name = fallbackName;
        }

        if (Object.keys(patch).length > 0) {
          await backendClient.patch(existingContact._id).set(patch).commit();
        }
      } else {
        await backendClient.create({
          _type: "salesContact",
          name: fallbackName,
          email: updatedUser.email || "",
          user: { _type: "reference", _ref: updatedUser._id },
        });
      }
    }

    await recordAuditLog({
      action: "assignEmployeeRole",
      entityType: "user",
      entityId: userId,
      before: {
        isEmployee: Boolean(user.isEmployee),
        employeeRole: user.employeeRole ?? null,
        employeeStatus: user.employeeStatus ?? null,
      },
      after: {
        isEmployee: true,
        employeeRole: role,
        employeeStatus: "active",
        employeeAssignedBy: actorEmail,
        employeeAssignedAt: assignedAt,
      },
    });

    return {
      success: true,
      message: `Successfully assigned ${role} role to ${user.firstName} ${user.lastName}`,
      employee: {
        _id: updatedUser._id,
        userId: updatedUser._id,
        clerkUserId: updatedUser.clerkUserId,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role,
        status: "active",
        assignedBy: actorEmail,
        assignedAt,
        permissions: ROLE_PERMISSIONS[role],
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error assigning employee role:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to assign employee role",
    };
  }
}

// Remove employee role from user
export async function removeEmployeeRole(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requirePermission("access.staff.manage");

    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    await backendClient
      .patch(userId)
      .set({
        isEmployee: false,
        employeeRole: undefined,
        employeeStatus: "inactive",
        updatedAt: new Date().toISOString(),
      })
      .commit();

    await recordAuditLog({
      action: "removeEmployeeRole",
      entityType: "user",
      entityId: userId,
      before: {
        isEmployee: Boolean(user.isEmployee),
        employeeRole: user.employeeRole ?? null,
        employeeStatus: user.employeeStatus ?? null,
      },
      after: {
        isEmployee: false,
        employeeRole: null,
        employeeStatus: "inactive",
      },
    });

    return { success: true, message: "Employee role removed successfully" };
  } catch (error) {
    console.error("Error removing employee role:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to remove employee role",
    };
  }
}

export async function assignStaffRole(
  userId: string,
  role: BackofficeRole
): Promise<{ success: boolean; message: string; staffRoles?: BackofficeRole[] }> {
  try {
    const authz = await requirePermission("access.staff.manage");

    if (!isBackofficeStaffRole(role)) {
      return { success: false, message: "Invalid staff role" };
    }

    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0]{
        _id,
        email,
        firstName,
        lastName,
        staffRoles,
        staffStatus
      }`,
      { userId }
    );

    if (!user?._id) {
      return { success: false, message: "User not found" };
    }

    const currentRoles = normalizeStaffRoles(user.staffRoles);
    const updatedRoles = Array.from(new Set([...currentRoles, role]));
    const now = new Date().toISOString();
    const actorEmail = authz.email ?? authz.sanityUser?.email ?? "system";
    const targetName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.email ||
      user._id;

    await backendClient
      .patch(userId)
      .set({
        staffRoles: updatedRoles,
        staffStatus: "active",
        staffAssignedBy: actorEmail,
        staffAssignedAt: now,
        updatedAt: now,
      })
      .commit();

    await recordAuditLog({
      action: "assignStaffRole",
      entityType: "user",
      entityId: userId,
      before: {
        staffRoles: currentRoles,
        staffStatus: user.staffStatus ?? null,
      },
      after: {
        staffRoles: updatedRoles,
        staffStatus: "active",
        staffAssignedBy: actorEmail,
        staffAssignedAt: now,
      },
    });

    return {
      success: true,
      message: `Assigned ${role} role to ${targetName}`,
      staffRoles: updatedRoles,
    };
  } catch (error) {
    console.error("Error assigning staff role:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to assign staff role",
    };
  }
}

export async function removeStaffRole(
  userId: string,
  role: BackofficeRole
): Promise<{ success: boolean; message: string; staffRoles?: BackofficeRole[] }> {
  try {
    const authz = await requirePermission("access.staff.manage");

    if (!isBackofficeStaffRole(role)) {
      return { success: false, message: "Invalid staff role" };
    }

    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0]{
        _id,
        email,
        firstName,
        lastName,
        staffRoles,
        staffStatus
      }`,
      { userId }
    );

    if (!user?._id) {
      return { success: false, message: "User not found" };
    }

    const currentRoles = normalizeStaffRoles(user.staffRoles);
    const updatedRoles = currentRoles.filter((value) => value !== role);
    const now = new Date().toISOString();
    const actorEmail = authz.email ?? authz.sanityUser?.email ?? "system";
    const staffStatus = updatedRoles.length > 0 ? user.staffStatus ?? "active" : "inactive";
    const targetName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.email ||
      user._id;

    await backendClient
      .patch(userId)
      .set({
        staffRoles: updatedRoles,
        staffStatus,
        staffAssignedBy: actorEmail,
        staffAssignedAt: now,
        updatedAt: now,
      })
      .commit();

    await recordAuditLog({
      action: "removeStaffRole",
      entityType: "user",
      entityId: userId,
      before: {
        staffRoles: currentRoles,
        staffStatus: user.staffStatus ?? null,
      },
      after: {
        staffRoles: updatedRoles,
        staffStatus,
        staffAssignedBy: actorEmail,
        staffAssignedAt: now,
      },
    });

    return {
      success: true,
      message: `Removed ${role} role from ${targetName}`,
      staffRoles: updatedRoles,
    };
  } catch (error) {
    console.error("Error removing staff role:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove staff role",
    };
  }
}

export async function setStaffRoles(
  userId: string,
  roles: BackofficeRole[]
): Promise<{ success: boolean; message: string; staffRoles?: BackofficeRole[] }> {
  try {
    const authz = await requirePermission("access.staff.manage");

    if (!Array.isArray(roles) || roles.some((role) => !isBackofficeStaffRole(role))) {
      return { success: false, message: "Invalid staff roles provided" };
    }

    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0]{
        _id,
        email,
        firstName,
        lastName,
        staffRoles,
        staffStatus
      }`,
      { userId }
    );

    if (!user?._id) {
      return { success: false, message: "User not found" };
    }

    const normalizedRoles = normalizeStaffRoles(roles);
    const now = new Date().toISOString();
    const actorEmail = authz.email ?? authz.sanityUser?.email ?? "system";
    const staffStatus = normalizedRoles.length > 0 ? "active" : "inactive";
    const targetName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.email ||
      user._id;

    await backendClient
      .patch(userId)
      .set({
        staffRoles: normalizedRoles,
        staffStatus,
        staffAssignedBy: actorEmail,
        staffAssignedAt: now,
        updatedAt: now,
      })
      .commit();

    await recordAuditLog({
      action: "setStaffRoles",
      entityType: "user",
      entityId: userId,
      before: {
        staffRoles: normalizeStaffRoles(user.staffRoles),
        staffStatus: user.staffStatus ?? null,
      },
      after: {
        staffRoles: normalizedRoles,
        staffStatus,
        staffAssignedBy: actorEmail,
        staffAssignedAt: now,
      },
    });

    return {
      success: true,
      message:
        normalizedRoles.length > 0
          ? `Updated staff roles for ${targetName}`
          : `Cleared staff roles for ${targetName}`,
      staffRoles: normalizedRoles,
    };
  } catch (error) {
    console.error("Error setting staff roles:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update staff roles",
    };
  }
}

// Update employee status
export async function updateEmployeeStatus(
  userId: string,
  status: EmployeeStatus,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const authz = await requirePermission("access.staff.manage");
    const adminUser =
      authz.sanityUser && authz.sanityUser._id
        ? authz.sanityUser
        : authz.clerkUserId
          ? await backendClient.fetch(
              `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
              { clerkUserId: authz.clerkUserId }
            )
          : null;
    const actorEmail = adminUser?.email ?? authz.email ?? "system";

    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const updateData: any = {
      employeeStatus: status,
      updatedAt: new Date().toISOString(),
    };

    if (status === "suspended") {
      updateData.employeeSuspendedBy = adminUser.email;
      updateData.employeeSuspendedAt = new Date().toISOString();
      if (reason) {
        updateData.employeeSuspensionReason = reason;
      }
    }

    await backendClient.patch(userId).set(updateData).commit();

    await recordAuditLog({
      action: "updateEmployeeStatus",
      entityType: "user",
      entityId: userId,
      before: {
        isEmployee: Boolean(user.isEmployee),
        employeeRole: user.employeeRole ?? null,
        employeeStatus: user.employeeStatus ?? null,
      },
      after: {
        ...updateData,
        isEmployee: Boolean(user.isEmployee),
        employeeRole: user.employeeRole ?? null,
        employeeSuspendedBy: updateData.employeeSuspendedBy ?? user.employeeSuspendedBy ?? null,
        employeeSuspendedAt: updateData.employeeSuspendedAt ?? user.employeeSuspendedAt ?? null,
        employeeSuspensionReason:
          updateData.employeeSuspensionReason ?? user.employeeSuspensionReason ?? null,
      },
    });

    return { success: true, message: `Employee status updated to ${status}` };
  } catch (error) {
    console.error("Error updating employee status:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update employee status",
    };
  }
}

// Get all employees
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const employees = await backendClient.fetch(
      `*[_type == "user" && isEmployee == true] | order(employeeAssignedAt desc) {
        _id,
        "userId": _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        employeeRole,
        employeeStatus,
        staffRoles,
        employeeAssignedBy,
        employeeAssignedAt,
        employeeSuspendedBy,
        employeeSuspendedAt,
        employeeSuspensionReason,
        employeePerformance,
        createdAt,
        updatedAt
      }`
    );

    return employees.map((emp: any) => ({
      ...emp,
      role: emp.employeeRole,
      staffRoles: normalizeStaffRoles(emp.staffRoles),
      status: emp.employeeStatus,
      assignedBy: emp.employeeAssignedBy,
      assignedAt: emp.employeeAssignedAt,
      suspendedBy: emp.employeeSuspendedBy,
      suspendedAt: emp.employeeSuspendedAt,
      suspensionReason: emp.employeeSuspensionReason,
      permissions: ROLE_PERMISSIONS[emp.employeeRole as EmployeeRole],
      performance: emp.employeePerformance,
    }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}

// Get employees by role
export async function getEmployeesByRole(
  role: EmployeeRole
): Promise<Employee[]> {
  try {
    const employees = await backendClient.fetch(
      `*[_type == "user" && isEmployee == true && employeeRole == $role && employeeStatus == "active"] | order(firstName asc) {
        _id,
        "userId": _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        employeeRole,
        employeeStatus,
        staffRoles,
        employeeAssignedBy,
        employeeAssignedAt,
        employeePerformance,
        createdAt,
        updatedAt
      }`,
      { role }
    );

    return employees.map((emp: any) => ({
      ...emp,
      role: emp.employeeRole,
      staffRoles: normalizeStaffRoles(emp.staffRoles),
      status: emp.employeeStatus,
      assignedBy: emp.employeeAssignedBy,
      assignedAt: emp.employeeAssignedAt,
      permissions: ROLE_PERMISSIONS[emp.employeeRole as EmployeeRole],
      performance: emp.employeePerformance,
    }));
  } catch (error) {
    console.error("Error fetching employees by role:", error);
    return [];
  }
}

// Get current employee info
export async function getCurrentEmployee(): Promise<Employee | null> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return null;
    }

    const user = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true][0] {
        _id,
        "userId": _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        employeeRole,
        employeeStatus,
        staffRoles,
        employeeAssignedBy,
        employeeAssignedAt,
        employeePerformance,
        createdAt,
        updatedAt
      }`,
      { clerkUserId }
    );

    if (!user || !user.employeeRole) {
      return null;
    }

    return {
      ...user,
      role: user.employeeRole,
      staffRoles: normalizeStaffRoles(user.staffRoles),
      status: user.employeeStatus,
      assignedBy: user.employeeAssignedBy,
      assignedAt: user.employeeAssignedAt,
      permissions: ROLE_PERMISSIONS[user.employeeRole as EmployeeRole],
      performance: user.employeePerformance,
    };
  } catch (error) {
    console.error("Error fetching current employee:", error);
    return null;
  }
}

// Get all users (potential employees)
export async function getAllUsers() {
  try {
    const users = await backendClient.fetch(
      `*[_type == "user"] | order(createdAt desc) {
        _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        isEmployee,
        employeeRole,
        employeeStatus,
        staffRoles,
        isActive,
        createdAt
      }`
    );

    return users.map((user: any) => ({
      ...user,
      staffRoles: normalizeStaffRoles(user.staffRoles),
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Update employee performance
export async function updateEmployeePerformance(
  userId: string,
  performanceData: Partial<{
    ordersProcessed: number;
    ordersConfirmed: number;
    ordersPacked: number;
    ordersAssignedForDelivery: number;
    ordersDelivered: number;
    cashCollected: number;
    paymentsReceived: number;
  }>
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0] { employeePerformance }`,
      { userId }
    );

    const currentPerformance = user?.employeePerformance || {};

    await backendClient
      .patch(userId)
      .set({
        employeePerformance: {
          ...currentPerformance,
          ...performanceData,
          lastActiveAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return { success: true, message: "Performance updated successfully" };
  } catch (error) {
    console.error("Error updating employee performance:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update performance",
    };
  }
}
