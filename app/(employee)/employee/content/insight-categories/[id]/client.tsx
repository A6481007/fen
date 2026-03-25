"use client";

import EmployeeInsightCategoryDetail from "@/components/employee/EmployeeInsightCategoryDetail";

const InsightCategoryDetailClient = ({
  categoryId,
}: {
  categoryId: string;
}) => {
  return <EmployeeInsightCategoryDetail categoryId={categoryId} />;
};

export default InsightCategoryDetailClient;
