import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import InsightsListClient from "./client";

export const metadata: Metadata = {
  title: "Insights | Content Management",
  description: "Manage insights content for the Insight Hub",
};

export default async function InsightsListPage() {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  return <InsightsListClient />;
}
