# Employee content insight authors scaffolding backups (2026-01-19)

Reason: scaffold employee insight authors list/detail routes and add a nav entry.

Backups
- components/employee/EmployeeNav.tsx -> components__employee__EmployeeNav.tsx__2026-01-19__pre-insight-authors-nav.tsx

New files (no prior version)
- app/(employee)/employee/content/insight-authors/layout.tsx
- app/(employee)/employee/content/insight-authors/page.tsx
- app/(employee)/employee/content/insight-authors/client.tsx
- app/(employee)/employee/content/insight-authors/[id]/layout.tsx
- app/(employee)/employee/content/insight-authors/[id]/page.tsx
- app/(employee)/employee/content/insight-authors/[id]/client.tsx
- components/employee/EmployeeInsightAuthorsList.tsx
- components/employee/EmployeeInsightAuthorDetail.tsx

Restore
- cp code-backups/employee-content-insight-authors-2026-01-19-scaffold/components__employee__EmployeeNav.tsx__2026-01-19__pre-insight-authors-nav.tsx components/employee/EmployeeNav.tsx
- delete the new files listed above if rollback is needed
