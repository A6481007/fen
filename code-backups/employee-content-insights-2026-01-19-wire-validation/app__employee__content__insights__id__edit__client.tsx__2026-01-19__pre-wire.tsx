"use client";

import EmployeeInsightEdit from "@/components/employee/EmployeeInsightEdit";

const InsightEditClient = ({ insightId }: { insightId: string }) => {
  return <EmployeeInsightEdit insightId={insightId} />;
};

export default InsightEditClient;
