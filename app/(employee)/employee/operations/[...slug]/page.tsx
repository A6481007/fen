import { redirect } from "next/navigation";
import OperationsPageClient from "@/app/(employee)/employee/OperationsPageClient";

const redirectMap: Record<string, string> = {
  orders: "/employee/orders",
  packing: "/employee/packing",
  deliveries: "/employee/deliveries",
  warehouse: "/employee/warehouse",
  payments: "/employee/payments",
};

interface OperationsPageProps {
  params: Promise<{ slug?: string[] }> | { slug?: string[] };
}

export default async function OperationsPage({ params }: OperationsPageProps) {
  const resolvedParams = await params;
  const [section] = resolvedParams.slug ?? [];
  const normalizedSection = section?.toLowerCase();

  if (!normalizedSection) {
    redirect("/employee/orders");
  }

  if (normalizedSection && redirectMap[normalizedSection]) {
    redirect(redirectMap[normalizedSection]);
  }

  if (normalizedSection === "quotations") {
    return <OperationsPageClient view="quotations" />;
  }

  if (normalizedSection === "reviews") {
    return <OperationsPageClient view="reviews" />;
  }

  if (normalizedSection === "orders" && (resolvedParams.slug?.length ?? 0) > 1) {
    redirect("/employee/orders");
  }

  return (
    <OperationsPageClient view="placeholder" />
  );
}
