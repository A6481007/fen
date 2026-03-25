# Backfill promotion analytics

**When to use:** Nightly analytics missed a window or historical dates need regeneration.

## Preconditions
- Firebase admin credentials available locally (`.env.production` pulled or service key exported).
- Firestore indexes deployed (see `firestore.indexes.json`), especially `promotions/*/interactions` timestamp index.
- Confirm target date range and campaignId (or run for all active/ended campaigns).

## Steps
1. Pull production env locally if needed: `vercel env pull .env.production.local`.
2. Run the backfill using the analytics script (TS-Node with ESM):
   - All campaigns:  
     `pnpm ts-node --esm scripts/aggregateAnalytics.ts --backfill --start YYYY-MM-DD --end YYYY-MM-DD`
   - Single campaign:  
     `pnpm ts-node --esm scripts/aggregateAnalytics.ts --backfill --start YYYY-MM-DD --end YYYY-MM-DD --campaign <campaignId>`
   - Add `--force` to overwrite existing rollups if needed.
3. Monitor output for `written/skipped/failed` counts and capture the `runId` from logs.
4. Verify Firestore writes under `promotions/{campaignId}/analytics/daily/days/{date}` for the backfilled dates.
5. Publish results: add a note in the incident/ticket with `runId`, date range, and failures (if any).

## Validation
- Admin analytics dashboard shows expected metrics for the backfilled dates.
- `aggregationLogs` contains the new entry with status `success` or `partial` and zero unexpected failures.
- Spot-check one promotion’s daily doc to confirm `aggregatedAt` is recent and metrics are non-zero.

## Rollback / Escalation
- If the run introduced bad data, rerun with `--force` after fixing the source interactions; no direct delete needed.
- For repeated failures (index missing, permissions), halt and escalate to platform SRE before retrying.
