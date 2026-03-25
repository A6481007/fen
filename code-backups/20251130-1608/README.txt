Backups created for GROQ + helper export refactor and news article loader update.
Files copied:
- sanity/queries/index.ts -> sanity--queries--index.ts__20251130-1608__groq-helper-refactor.ts
- sanity/helpers/index.ts -> sanity--helpers--index.ts__20251130-1608__groq-helper-refactor.ts
- app/(client)/news/[slug]/page.tsx -> app--(client)--news--[slug]--page.tsx__20251130-1608__groq-helper-refactor.tsx
Purpose: preserve pre-change state before adjusting query exports (including deprecated downloads), helper re-exports, and switching news detail to the new GROQ loader.
