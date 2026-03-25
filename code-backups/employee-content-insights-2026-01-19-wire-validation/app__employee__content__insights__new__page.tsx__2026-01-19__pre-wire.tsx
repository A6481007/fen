import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import InsightCreateClient from "./client";

export const metadata: Metadata = {
  title: "Create Insight | Content Management",
  description: "Create a new insight draft",
};

export default async function InsightNewPage() {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  return <InsightCreateClient />;
}
