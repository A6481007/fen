"use client";

import EmployeeCatalogDetail from "@/components/employee/EmployeeCatalogDetail";

const CatalogDetailClient = ({ catalogId }: { catalogId: string }) => {
  return <EmployeeCatalogDetail catalogId={catalogId} />;
};

export default CatalogDetailClient;
