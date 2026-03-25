"use client";

import EmployeeDownloadDetail from "@/components/employee/EmployeeDownloadDetail";

const DownloadDetailClient = ({ downloadId }: { downloadId: string }) => {
  return <EmployeeDownloadDetail downloadId={downloadId} />;
};

export default DownloadDetailClient;
