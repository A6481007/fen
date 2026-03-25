"use client";

import EmployeeNewsEditor from "@/components/employee/EmployeeNewsEditor";

const NewsEditClient = ({ newsId }: { newsId: string }) => {
  return <EmployeeNewsEditor mode="edit" newsId={newsId} />;
};

export default NewsEditClient;
