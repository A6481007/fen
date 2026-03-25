"use client";

import EmployeeInsightSeriesDetail from "@/components/employee/EmployeeInsightSeriesDetail";

const InsightSeriesDetailClient = ({ seriesId }: { seriesId: string }) => {
  return <EmployeeInsightSeriesDetail seriesId={seriesId} />;
};

export default InsightSeriesDetailClient;
