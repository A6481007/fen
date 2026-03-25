import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/actions/employeeActions";
import WarehouseOrdersList from "@/components/employee/WarehouseOrdersList";
import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Warehouse - Employee Dashboard",
    description: "Assign deliverymen to packed orders and manage dispatching",
  },
  th: {
    title: "คลังสินค้า - แดชบอร์ดพนักงาน",
    description: "มอบหมายพนักงานจัดส่งให้คำสั่งซื้อที่แพ็กแล้วและจัดการการส่งมอบ",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}


export default async function WarehousePage() {
  const employee = await getCurrentEmployee();

  // If not logged in or not an employee, redirect
  if (!employee) {
    redirect("/employee");
  }

  // Only warehouse employees can access this page
  if (employee.role !== "warehouse") {
    redirect("/employee");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <WarehouseOrdersList employee={employee} />
    </div>
  );
}

