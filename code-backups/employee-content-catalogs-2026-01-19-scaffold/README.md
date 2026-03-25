# Employee content catalogs scaffolding backups (2026-01-19)

Reason: scaffold employee catalogs list/detail routes and add a nav entry.

Backups
- components/employee/EmployeeNav.tsx -> components__employee__EmployeeNav.tsx__2026-01-19__pre-catalogs-nav.tsx

New files (no prior version)
- app/(employee)/employee/content/catalogs/layout.tsx
- app/(employee)/employee/content/catalogs/page.tsx
- app/(employee)/employee/content/catalogs/client.tsx
- app/(employee)/employee/content/catalogs/[id]/layout.tsx
- app/(employee)/employee/content/catalogs/[id]/page.tsx
- app/(employee)/employee/content/catalogs/[id]/client.tsx
- components/employee/EmployeeCatalogsList.tsx
- components/employee/EmployeeCatalogDetail.tsx

Restore
- cp code-backups/employee-content-catalogs-2026-01-19-scaffold/components__employee__EmployeeNav.tsx__2026-01-19__pre-catalogs-nav.tsx components/employee/EmployeeNav.tsx
- delete the new files listed above if rollback is needed
