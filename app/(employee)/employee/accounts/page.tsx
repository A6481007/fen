import { getCurrentEmployee } from "@/actions/employeeActions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import AccountsPageClient from "./AccountsPageClient";

export const metadata: Metadata = {
  title: "Accounts - Employee Dashboard",
  description: "Manage cash submissions from deliverymen",
};

export default async function AccountsPage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/");
  }

  // Only accounts and incharge can access
  if (!["accounts", "incharge"].includes(employee.role)) {
    redirect("/employee");
  }

  return <AccountsPageClient />;
}
