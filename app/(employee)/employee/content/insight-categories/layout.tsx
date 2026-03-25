import type { ReactNode } from "react";

/*
[EXISTING] EmployeeNav is rendered by app/(employee)/employee/layout.tsx.
*/

export default function InsightCategoriesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="space-y-6">{children}</div>;
}
