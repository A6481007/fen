Backups for event detail query updates (20251130-1450):
- sanity/queries/index.ts -> code-backups/sanity__queries__index.ts__20251130-1450__event-detail-queries.ts (legacy events wrapper removed, new events helpers wired).

New file created (no prior version to backup): sanity/queries/events.ts. Delete it if you need to roll back the new events helpers entirely.

Restore instructions:
- To restore the indexed query file: cp code-backups/sanity__queries__index.ts__20251130-1450__event-detail-queries.ts sanity/queries/index.ts
- Remove sanity/queries/events.ts if reverting to the pre-change state without the new module.

Backups for catalog queries scaffolding (20251130-1526):
- sanity/queries/index.ts -> code-backups/sanity__queries__index.ts__20251130-1526__catalog-queries.ts (wired catalog query exports).
- code-backups/readme.txt -> code-backups/code-backups__readme.txt__20251130-1526__catalog-queries.txt (pre-update log snapshot).
New file created (no prior version to backup): sanity/queries/catalog.ts (catalog queries + cover resolution helper).

Backups for news cache tag parity (20251130-1549):
- sanity/queries/index.ts -> code-backups/sanity__queries__index.ts__20251130-1549__news-cache-tags.ts (added slug-specific tag for single news cache).
- code-backups/readme.txt -> code-backups/code-backups__readme.txt__20251130-1550__news-cache-tags.txt (pre-update log snapshot).

Restore instructions:
- To restore the news query file: cp code-backups/sanity__queries__index.ts__20251130-1549__news-cache-tags.ts sanity/queries/index.ts
- To restore this log entry: cp code-backups/code-backups__readme.txt__20251130-1550__news-cache-tags.txt code-backups/readme.txt
