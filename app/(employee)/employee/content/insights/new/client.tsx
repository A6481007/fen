"use client";

import EmployeeInsightCreate from "@/components/employee/EmployeeInsightCreate";
import type { InsightFormOptions } from "@/lib/insightForm";

const InsightCreateClient = ({ options }: { options: InsightFormOptions }) => {
  return <EmployeeInsightCreate options={options} />;
};

export default InsightCreateClient;
