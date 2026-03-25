# Employee insights wiring + validation backups (2026-01-19)

Reason: wire insights list/detail/create/edit to Sanity queries + mutation actions and add validation scaffolds aligned to insightType schema.

Backups
- components/employee/EmployeeInsightsList.tsx
- components/employee/EmployeeInsightDetail.tsx
- components/employee/EmployeeInsightCreate.tsx
- components/employee/EmployeeInsightEdit.tsx
- app/(employee)/employee/content/insights/client.tsx
- app/(employee)/employee/content/insights/page.tsx
- app/(employee)/employee/content/insights/[id]/client.tsx
- app/(employee)/employee/content/insights/[id]/page.tsx
- app/(employee)/employee/content/insights/new/client.tsx
- app/(employee)/employee/content/insights/new/page.tsx
- app/(employee)/employee/content/insights/[id]/edit/client.tsx
- app/(employee)/employee/content/insights/[id]/edit/page.tsx
- sanity/queries/insight.ts

New files (no prior version)
- actions/insightActions.ts
- lib/insightForm.ts

Restore
- cp code-backups/employee-content-insights-2026-01-19-wire-validation/<file> <original-path>
- delete the new files listed above if rollback is needed
