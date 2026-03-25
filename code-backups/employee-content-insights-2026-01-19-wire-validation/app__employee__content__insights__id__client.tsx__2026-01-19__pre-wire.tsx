"use client";

import EmployeeInsightDetail from "@/components/employee/EmployeeInsightDetail";

const InsightDetailClient = ({ insightId }: { insightId: string }) => {
  return <EmployeeInsightDetail insightId={insightId} />;
};

export default InsightDetailClient;
