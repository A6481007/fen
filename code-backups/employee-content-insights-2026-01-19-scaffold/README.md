# Employee content insights scaffolding backups (2026-01-19)

Reason: scaffold employee content insights list/detail routes, add role guard helper, and update nav.

Backups
- components/employee/EmployeeNav.tsx -> components__employee__EmployeeNav.tsx__2026-01-19__pre-insights-nav.tsx

New files (no prior version)
- app/(employee)/employee/content/insights/layout.tsx
- app/(employee)/employee/content/insights/page.tsx
- app/(employee)/employee/content/insights/client.tsx
- app/(employee)/employee/content/insights/[id]/layout.tsx
- app/(employee)/employee/content/insights/[id]/page.tsx
- app/(employee)/employee/content/insights/[id]/client.tsx
- components/employee/EmployeeInsightsList.tsx
- components/employee/EmployeeInsightDetail.tsx
- lib/employeeUtils.ts

Restore
- cp code-backups/employee-content-insights-2026-01-19-scaffold/components__employee__EmployeeNav.tsx__2026-01-19__pre-insights-nav.tsx components/employee/EmployeeNav.tsx
- delete the new files listed above if rollback is needed
