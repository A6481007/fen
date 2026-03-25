"use server";

import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";

export type EmployeeSalesContact = {
  _id: string;
  name?: string;
  phone?: string;
  ext?: string;
  fax?: string;
  mobile?: string;
  lineId?: string;
  lineExt?: string;
  email?: string;
  web?: string;
};

type EmployeeRecord = {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  employeeRole?: string;
};

type SalesContactRecord = EmployeeSalesContact & {
  user?: { _ref?: string };
};

type SalesContactPayload = Omit<EmployeeSalesContact, "_id">;

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const buildEmployeeName = (employee: EmployeeRecord) =>
  [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();

const getEmployeeByClerkUserId = async (clerkUserId: string) =>
  backendClient.fetch<EmployeeRecord | null>(
    `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true][0]{
      _id,
      email,
      firstName,
      lastName,
      employeeRole
    }`,
    { clerkUserId }
  );

const ensureSalesContactForEmployee = async (
  employee: EmployeeRecord
): Promise<SalesContactRecord | null> => {
  if (employee.employeeRole !== "callcenter") {
    return null;
  }

  const email = normalizeString(employee.email).toLowerCase();
  const emailFilter = email ? " || lower(email) == $email" : "";
  const contact = await backendClient.fetch<SalesContactRecord | null>(
    `*[_type == "salesContact" && (user._ref == $userId${emailFilter})][0]{
      _id,
      name,
      phone,
      ext,
      fax,
      mobile,
      lineId,
      lineExt,
      email,
      web,
      user
    }`,
    { userId: employee._id, email }
  );

  const fallbackName = buildEmployeeName(employee) || employee.email || "Sales";

  if (contact) {
    const patch: Record<string, unknown> = {};
    if (!contact.user?._ref) {
      patch.user = { _type: "reference", _ref: employee._id };
    }
    if (!contact.email && employee.email) {
      patch.email = employee.email;
    }
    if (!contact.name && fallbackName) {
      patch.name = fallbackName;
    }

    if (Object.keys(patch).length > 0) {
      const updated = await backendClient
        .patch(contact._id)
        .set(patch)
        .commit();
      return {
        _id: updated._id,
        name: updated.name,
        phone: updated.phone,
        ext: updated.ext,
        fax: updated.fax,
        mobile: updated.mobile,
        lineId: updated.lineId,
        lineExt: updated.lineExt,
        email: updated.email,
        web: updated.web,
        user: updated.user,
      } as SalesContactRecord;
    }

    return contact;
  }

  const created = await backendClient.create({
    _type: "salesContact",
    name: fallbackName,
    email: employee.email || "",
    user: { _type: "reference", _ref: employee._id },
  });

  return {
    _id: created._id,
    name: created.name,
    email: created.email,
    user: created.user,
  } as SalesContactRecord;
};

export async function getEmployeeSalesContact(): Promise<
  EmployeeSalesContact | null
> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  const employee = await getEmployeeByClerkUserId(clerkUserId);
  if (!employee || employee.employeeRole !== "callcenter") {
    return null;
  }

  const contact = await ensureSalesContactForEmployee(employee);
  return contact ?? null;
}

export async function updateEmployeeSalesContact(
  payload: SalesContactPayload
): Promise<{ success: boolean; message: string; contact?: EmployeeSalesContact }>
{
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const employee = await getEmployeeByClerkUserId(clerkUserId);
    if (!employee || employee.employeeRole !== "callcenter") {
      return {
        success: false,
        message: "Only sales employees can update sales contact details",
      };
    }

    const contact = await ensureSalesContactForEmployee(employee);
    if (!contact?._id) {
      return { success: false, message: "Sales contact not found" };
    }

    const fallbackName = buildEmployeeName(employee) || employee.email || "Sales";

    const updatePayload: Record<string, unknown> = {
      user: { _type: "reference", _ref: employee._id },
      name: normalizeString(payload.name) || fallbackName,
      phone: normalizeString(payload.phone),
      ext: normalizeString(payload.ext),
      fax: normalizeString(payload.fax),
      mobile: normalizeString(payload.mobile),
      lineId: normalizeString(payload.lineId),
      lineExt: normalizeString(payload.lineExt),
      email: normalizeString(payload.email) || employee.email || "",
      web: normalizeString(payload.web),
    };

    const updated = await backendClient
      .patch(contact._id)
      .set(updatePayload)
      .commit();

    return {
      success: true,
      message: "Sales contact updated successfully",
      contact: {
        _id: updated._id,
        name: updated.name,
        phone: updated.phone,
        ext: updated.ext,
        fax: updated.fax,
        mobile: updated.mobile,
        lineId: updated.lineId,
        lineExt: updated.lineExt,
        email: updated.email,
        web: updated.web,
      },
    };
  } catch (error) {
    console.error("Error updating sales contact:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update sales contact",
    };
  }
}
