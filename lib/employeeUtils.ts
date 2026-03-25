import { getCurrentEmployee } from "@/actions/employeeActions";
import type { Employee, EmployeeRole } from "@/types/employee";

type RoleAccessResult = {
  employee: Employee | null;
  hasAccess: boolean;
};

export const hasRoleAccess = async (
  allowedRoles: EmployeeRole[] = []
): Promise<RoleAccessResult> => {
  const employee = await getCurrentEmployee();

  if (!employee || employee.status !== "active") {
    return { employee: null, hasAccess: false };
  }

  if (allowedRoles.length === 0) {
    return { employee, hasAccess: true };
  }

  return { employee, hasAccess: allowedRoles.includes(employee.role) };
};
