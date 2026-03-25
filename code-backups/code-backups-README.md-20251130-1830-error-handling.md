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
