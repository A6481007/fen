Backups for event detail query updates (20251130-1450):
- sanity/queries/index.ts -> code-backups/sanity__queries__index.ts__20251130-1450__event-detail-queries.ts (legacy events wrapper removed, new events helpers wired).

New file created (no prior version to backup): sanity/queries/events.ts. Delete it if you need to roll back the new events helpers entirely.

Restore instructions:
- To restore the indexed query file: cp code-backups/sanity__queries__index.ts__20251130-1450__event-detail-queries.ts sanity/queries/index.ts
- Remove sanity/queries/events.ts if reverting to the pre-change state without the new module.
