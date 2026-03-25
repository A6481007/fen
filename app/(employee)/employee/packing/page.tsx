import { getCurrentEmployee } from "@/actions/employeeActions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import PackingPageClient from "./PackingPageClient";

export const metadata: Metadata = {
  title: "Packing - Employee Dashboard",
  description: "Pack confirmed orders for delivery",
};

export default async function PackingPage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/");
  }

  // Only packer and incharge can access
  if (!["packer", "incharge"].includes(employee.role)) {
    redirect("/employee");
  }

  return <PackingPageClient employee={employee} />;
}
