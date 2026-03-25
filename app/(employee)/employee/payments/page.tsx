import { getCurrentEmployee } from "@/actions/employeeActions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import PaymentsPageClient from "./PaymentsPageClient";

export const metadata: Metadata = {
  title: "Payments - Employee Dashboard",
  description: "Manage payments and cash collection",
};

export default async function PaymentsPage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/");
  }

  // Only accounts and incharge can access
  if (!["accounts", "incharge"].includes(employee.role)) {
    redirect("/employee");
  }

  return <PaymentsPageClient />;
}
