import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import EmployeeManagement from "@/components/admin/EmployeeManagement";
import AccessDeniedContent from "@/components/admin/AccessDeniedContent";
import { getBackofficeContext } from "@/lib/authz";

const METADATA_BY_LOCALE = {
  en: {
    title: "Employee Management",
    description: "Manage employee roles and permissions",
  },
  th: {
    title: "จัดการพนักงาน",
    description: "จัดการบทบาทและสิทธิ์ของพนักงาน",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function EmployeeManagementPage() {
  const ctx = await getBackofficeContext();
  const canManageAccess =
    ctx.isAdmin || (ctx.permissions ?? []).includes("access.staff.manage");

  if (!canManageAccess) {
    return <AccessDeniedContent />;
  }

  return <EmployeeManagement canManageAccess={canManageAccess} />;
}
