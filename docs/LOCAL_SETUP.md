# Local Setup and Secret Hygiene

This guide walks you through getting the app running locally and keeping secrets out of Git.

## Prerequisites
- Node.js 20+ (Next 16 requires >=18.17; Node 20 LTS recommended).
- pnpm (enable via `corepack enable` and `corepack prepare pnpm@latest --activate` if needed).
- Docker (for Redis from `docker-compose.yml`).

## 1) Clone and install
```bash
git clone https://github.com/NCS-Networks-Communication-Solution/ncs-ecom.git
cd ncs-ecom
pnpm install
```

## 2) Environment files
1) Start from the sample:
```bash
cp .env.example .env
cp .env.example .env.local
```
2) Fill in secrets in `.env` / `.env.local` (do **not** commit the filled-in copies):

| Key | Purpose |
| --- | --- |
| `NODE_ENV`, `PORT`, `SITE_URL` | Runtime basics for Next.js API routes. |
| `DATABASE_URL`, `DB_PASSWORD` | Postgres connection string and password. |
| `CACHE_REDIS_URL` | Redis URL (matches `docker-compose.yml`). |
| `JWT_SECRET` | Server-side token signing secret (use a long random string). |
| `REVALIDATE_SECRET`, `REVALIDATE_ENDPOINT` | Revalidation hooks for ISR/stale content. |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_STOREFRONT_API_URL` | Client-side API endpoints. |
| `STOREFRONT_MOCK`, `NEXT_PUBLIC_STOREFRONT_MOCK`, `STATIC_FALLBACK_PATH` | Toggle/mock storefront data. |
| `NEXT_PUBLIC_ENABLE_NEW_QUOTATIONS`, `ENABLE_NEW_QUOTATIONS` | Feature flags for quotations. |
| `WEB_WHATS_NEW_DYNAMIC`, `CONTENT_REVALIDATE_SECONDS` | Content freshness controls. |
| `BACKEND_API_URL` (+ optional `BACKEND_SERVICE_TOKEN*`) | Server-to-server calls from Next.js routes. |
| `TWILIO_*` | SMS sending (account SID, auth token, phone number/service SID). |
| `VAPID_*` | Web-push credentials (generate with `npx web-push generate-vapid-keys`). |

> Keep the authoritative values in a shared password manager or vault; never commit them. `.gitignore` now blocks `.env*`, but you can also run `git update-index --skip-worktree .env .env.local .env.backup` for extra safety on your machine.

## 3) Local services
- Redis: `docker-compose up -d redis`
- Postgres: point `DATABASE_URL` at your local/remote database. If you want local Postgres, run one separately or via Docker.

## 4) Run the app
- Development server: `pnpm dev` (Next.js with Turbopack on port 3000 by default).
- Production build: `pnpm build && pnpm start`.

## 5) Studio and utilities
- Sanity type generation: `pnpm typegen`.
- Sanity Studio (if you need to run it locally): `cd sanity && pnpm install && pnpm run dev` (ensure the Sanity project ID/dataset are set in your env).

## 6) Tests and linting
- Lint: `pnpm lint`
- Unit/integration: `pnpm test`
- E2E (install browsers once): `pnpm exec playwright install --with-deps && pnpm test:e2e`

## 7) Secret rotation (important)
`.env` and `.env.local` were briefly committed in history (commit `01e3325`). Rotate any credentials that were present in those files and update your local `.env` copies with the new values. After rotation, keep secrets only in `.env`/`.env.local` and your vault—not in Git.
