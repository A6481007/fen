import { getCurrentEmployee } from "@/actions/employeeActions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import OrdersPageClient from "./OrdersPageClient";

export const metadata: Metadata = {
  title: "Sales - Employee Dashboard",
  description: "Manage quotations and customer orders",
};

export default async function OrdersPage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/");
  }

  // Only sales and incharge can access
  if (!["callcenter", "incharge"].includes(employee.role)) {
    redirect("/employee");
  }

  return <OrdersPageClient employee={employee} />;
}
