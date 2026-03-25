# Code backups

This folder holds backups taken before targeted fixes.

## News/resource cache tag backups (2025-12-01)
- `sanity_queries_index.ts__20251201-0054__cache-tags.ts`: copy of `sanity/queries/index.ts` before aligning news tag resolution to add slug tags and linked event propagation.
- `sanity_queries_resources.ts__20251201-0054__cache-tags.ts`: copy of `sanity/queries/resources.ts` before propagating linked news and event tags into resource cache tagging.
- `code-backups_README.md__20251201-0054__cache-tags.md`: copy of this README before recording the cache tag backup entries.
- Restore:
  ```
  cp code-backups/sanity_queries_index.ts__20251201-0054__cache-tags.ts sanity/queries/index.ts
  cp code-backups/sanity_queries_resources.ts__20251201-0054__cache-tags.ts sanity/queries/resources.ts
  cp code-backups/code-backups_README.md__20251201-0054__cache-tags.md code-backups/README.md
  ```

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

## Catalog cover placeholder asset backup
- `code-backups-README.md-20251130-2043-cover-placeholder.md`: copy of this README before documenting the catalog cover placeholder asset backup entry.
- Restore:
  ```
  cp code-backups/code-backups-README.md-20251130-2043-cover-placeholder.md code-backups/README.md
  ```

## Event attendee RSVP fallback backup
- `sanity__helpers__accessControl.ts-20251130-2313-rsvp-mapping.ts`: copy of `sanity/helpers/accessControl.ts` before mapping `eventRsvp` docs into attendee checks when event attendee arrays are empty.
- `code-backups__README.md-20251130-2313-rsvp-mapping.md`: copy of this README before documenting the RSVP fallback backup entry.
- Restore:
  ```
  cp code-backups/sanity__helpers__accessControl.ts-20251130-2313-rsvp-mapping.ts sanity/helpers/accessControl.ts
  cp code-backups/code-backups__README.md-20251130-2313-rsvp-mapping.md code-backups/README.md
  ```

## TypeScript and lint tooling backups (2025-11-30)
- `tsconfig.json__20251130-2330__exclude-code-backups`: root `tsconfig.json` before excluding `code-backups/` from compilation.
- `tsconfig.json__20251130-2332__exclude-snapshots`: `tsconfig.json` before excluding the News Hub snapshot folders and `news-hub-backups`.
- `app-(client)-blog-page.tsx__20251130-2339__typing-fix`: `app/(client)/blog/page.tsx` before adding explicit blog types for map callbacks.
- `app-(client)-news-downloads-page.tsx__20251130-2339__typing-fix`: `app/(client)/news/downloads/page.tsx` before typing download items.
- `app-(client)-news-events-page.tsx__20251130-2339__typing-fix`: `app/(client)/news/events/page.tsx` before typing news event entries.
- `app-(client)-news-page.tsx__20251130-2339__typing-fix`: `app/(client)/news/page.tsx` before typing news items and structured data handling.
- `components-LatestBlog.tsx__20251130-2339__typing-fix`: `components/LatestBlog.tsx` before annotating latest blogs.
- `components-NewsHighlight.tsx__20251130-2339__typing-fix`: `components/NewsHighlight.tsx` before annotating news highlights.
- `components-news-ArticleLayout.tsx__20251130-2340__typing-fix`: `components/news/ArticleLayout.tsx` before PortableText typing fixes and sidebar data typing.
- `components-new-Logo.tsx__20251130-2340__color-variant`: `components/new/Logo.tsx` before adding the optional `colorVariant` prop handling.
- `sanity-queries-catalog.ts__20251130-2340__cachekey-string`: `sanity/queries/catalog.ts` before stringifying cache keys for `unstable_cache`.
- `sanity-queries-index.ts__20251130-2340__cachekey-string`: `sanity/queries/index.ts` before stringifying news cache keys.
- `sanity-queries-resources.ts__20251130-2340__status-typing`: `sanity/queries/resources.ts` before normalizing resource/event status types.
- `package.json__20251130-2349__eslint-script`: `package.json` before updating the lint script away from `next lint`.
- `package.json__20251130-2353__lint-deps` and `pnpm-lock.yaml__20251130-2353__lint-deps`: package manifest and lockfile before adding lint-related dependency changes.
- `package.json__20251130-2354__eslint-deps` and `pnpm-lock.yaml__20251130-2354__eslint-deps`: package manifest and lockfile before installing `@eslint/js`, `typescript-eslint`, and `@next/eslint-plugin-next` for flat-config linting.
- Restore examples:
  ```
  cp code-backups/tsconfig.json__20251130-2330__exclude-code-backups tsconfig.json
  cp code-backups/app-(client)-news-page.tsx__20251130-2339__typing-fix app/(client)/news/page.tsx
  cp code-backups/sanity-queries-resources.ts__20251130-2340__status-typing sanity/queries/resources.ts
  cp code-backups/package.json__20251130-2354__eslint-deps package.json
  cp code-backups/pnpm-lock.yaml__20251130-2354__eslint-deps pnpm-lock.yaml
  ```
