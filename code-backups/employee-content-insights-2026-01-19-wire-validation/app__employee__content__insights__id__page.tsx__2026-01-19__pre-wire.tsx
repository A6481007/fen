import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import InsightDetailClient from "./client";

export const metadata: Metadata = {
  title: "Insight Details | Content Management",
  description: "View insight details",
};

export default async function InsightDetailsPage({
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

  return <InsightDetailClient insightId={params.id} />;
}
