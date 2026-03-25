# Backup log - legacy hot products cleanup

Created backups before removing legacy "hot products" code paths and migrating deals page to rely solely on new deal documents.

Backed up files:
- sanity/queries/query.ts -> sanity-queries-query.ts__20251220-234149__legacy-hot-products-cleanup.ts
- sanity/queries/index.ts -> sanity-queries-index.ts__20251220-234149__legacy-hot-products-cleanup.ts
- app/(client)/deal/page.tsx -> app-(client)-deal-page.tsx__20251220-234149__legacy-hot-products-cleanup.tsx

Restore instructions: copy the backup file contents back to the original paths if the new changes cause issues.
