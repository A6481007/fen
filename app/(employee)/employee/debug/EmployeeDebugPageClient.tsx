"use client";

import { useTranslation } from "react-i18next";

type EmployeeDebugPageClientProps = {
  clerkUserId: string;
  user: {
    email?: string | null;
    isEmployee?: boolean | null;
    employeeRole?: string | null;
    employeeStatus?: string | null;
  } | null;
};

export default function EmployeeDebugPageClient({
  clerkUserId,
  user,
}: EmployeeDebugPageClientProps) {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">
        {t("employee.debug.title")}
      </h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">
          {t("employee.debug.clerkUserId")}
        </h2>
        <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
          {clerkUserId}
        </pre>

        <h2 className="font-semibold mb-2 mt-4">
          {t("employee.debug.userData")}
        </h2>
        <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(user, null, 2)}
        </pre>

        <div className="mt-4 space-y-2">
          <div>
            <strong>{t("employee.debug.fields.email")}</strong>{" "}
            {user?.email || t("employee.debug.notFound")}
          </div>
          <div>
            <strong>{t("employee.debug.fields.isEmployee")}</strong>{" "}
            {user?.isEmployee
              ? t("employee.debug.yes")
              : t("employee.debug.no")}
          </div>
          <div>
            <strong>{t("employee.debug.fields.role")}</strong>{" "}
            {user?.employeeRole || t("employee.debug.notSet")}
          </div>
          <div>
            <strong>{t("employee.debug.fields.status")}</strong>{" "}
            {user?.employeeStatus || t("employee.debug.notSet")}
          </div>
        </div>

        {!user?.isEmployee && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>{t("employee.debug.issueLabel")}</strong>{" "}
            {t("employee.debug.issue.notEmployee")}
          </div>
        )}

        {user?.isEmployee && !user?.employeeRole && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <strong>{t("employee.debug.issueLabel")}</strong>{" "}
            {t("employee.debug.issue.missingRole")}
          </div>
        )}
      </div>
    </div>
  );
}
