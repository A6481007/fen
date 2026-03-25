import { getCurrentEmployee } from "@/actions/employeeActions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardPageClient from "./DashboardPageClient";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Dashboard - Employee Portal",
    description: "Overview of all employee operations",
  },
  th: {
    title: "แดชบอร์ด - พอร์ทัลพนักงาน",
    description: "ภาพรวมการดำเนินงานของพนักงานทั้งหมด",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function DashboardPage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/");
  }

  // Only incharge can access
  if (employee.role !== "incharge") {
    redirect("/employee");
  }

  return <DashboardPageClient />;
}
