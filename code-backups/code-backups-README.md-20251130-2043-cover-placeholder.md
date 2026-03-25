# Code backups

This folder holds backups taken before targeted fixes.

## Catalog pagination backup
- `sanity-queries-catalog.ts_2025-11-30_fix-pagination.txt`: full copy of `sanity/queries/catalog.ts` before fixing the catalog pagination slice off-by-one.
- Restore:
  ```
  cp code-backups/sanity-queries-catalog.ts_2025-11-30_fix-pagination.txt sanity/queries/catalog.ts
  ```

## Resources page access control backup
- `app_(client)_news_resources_page.tsx-20251130-wire-userid.tsx`: copy of `app/(client)/news/resources/page.tsx` before wiring `userId` into `getAllResources` to enforce attendee-only access.
- Restore:
  ```
  cp code-backups/app_(client)_news_resources_page.tsx-20251130-wire-userid.tsx app/(client)/news/resources/page.tsx
  ```

## Resource queries error handling backup
- `sanity-queries-resources.ts-20251130-1830-error-handling.ts`: full copy of `sanity/queries/resources.ts` before adding try/catch logging around resource query fetches.
- `code-backups-README.md-20251130-1830-error-handling.md`: copy of this README before documenting the resource query backup entries.
- Restore:
  ```
  cp code-backups/sanity-queries-resources.ts-20251130-1830-error-handling.ts sanity/queries/resources.ts
  cp code-backups/code-backups-README.md-20251130-1830-error-handling.md code-backups/README.md
  ```

## Catalog metadata derivation backup
- `sanity-schemaTypes-catalogType.ts-2025-11-30-auto-metadata.ts`: copy of `sanity/schemaTypes/catalogType.ts` before auto-deriving metadata.fileSize and metadata.fileType from the uploaded catalog asset.
- `code-backups-README.md-2025-11-30-auto-metadata.md`: copy of this README before documenting the catalog metadata backup entry.
- Restore:
  ```
  cp code-backups/sanity-schemaTypes-catalogType.ts-2025-11-30-auto-metadata.ts sanity/schemaTypes/catalogType.ts
  cp code-backups/code-backups-README.md-2025-11-30-auto-metadata.md code-backups/README.md
  ```
