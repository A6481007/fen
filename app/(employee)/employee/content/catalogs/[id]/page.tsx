import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasRoleAccess } from "@/lib/employeeUtils";
import CatalogDetailClient from "./client";

export const metadata: Metadata = {
  title: "Catalog Details | Content Management",
  description: "View catalog asset details",
};

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { employee, hasAccess } = await hasRoleAccess(["incharge"]);

  if (!employee) {
    redirect("/");
  }

  if (!hasAccess) {
    redirect("/employee");
  }

  const resolvedParams = await params;
  const catalogId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";

  if (!catalogId) {
    redirect("/employee/content/catalogs");
  }

  return <CatalogDetailClient catalogId={catalogId} />;
}
