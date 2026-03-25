import { getCurrentEmployee } from "@/actions/employeeActions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DeliveriesPageClient from "./DeliveriesPageClient";

export const metadata: Metadata = {
  title: "Deliveries - Employee Dashboard",
  description: "Manage delivery orders",
};

export default async function DeliveriesPage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/");
  }

  // Only deliveryman and incharge can access
  if (!["deliveryman", "incharge"].includes(employee.role)) {
    redirect("/employee");
  }

  return <DeliveriesPageClient />;
}
