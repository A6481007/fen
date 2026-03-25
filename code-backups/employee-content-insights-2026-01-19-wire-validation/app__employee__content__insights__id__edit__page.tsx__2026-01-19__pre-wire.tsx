import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import InsightEditClient from "./client";

export const metadata: Metadata = {
  title: "Edit Insight | Content Management",
  description: "Edit insight content",
};

export default async function InsightEditPage({
  params,
}: {
  params: { id: string };
}) {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  return <InsightEditClient insightId={params.id} />;
}
