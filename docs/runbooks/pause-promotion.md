# Pause a promotion

**When to use:** Manually halt a promotion because of fraud, anomaly auto-pause, budget overspend, or messaging defects.

## Preconditions
- Campaign ID and name identified.
- Reason for pause captured (alert link or incident ticket).
- Current status and budget/usage reviewed in the admin dashboard.

## Steps
1. Announce intent in on-call channel with campaignId, reason, and expected duration.
2. In Sanity/Admin, set the promotion `status` to `paused` (or `ended` if final). If the admin UI is unavailable, update Firestore `promotions/{campaignId}`: `{ status: "paused", pausedBy: "<email>", pausedReason: "<reason>", pausedAt: <serverTimestamp> }`.
3. Invalidate caches for the promotion page and eligibility responses (`POST /api/admin/revalidate?secret=$REVALIDATE_SECRET&tag=promotions` or redeploy if revalidate is unavailable).
4. Confirm anomaly/alert rules are acknowledged so auto-pause does not continuously re-trigger noise.
5. Document the pause in the incident/ticket with timestamp and owner.

## Validation
- Eligibility API no longer returns the promotion for new requests.
- Admin dashboard shows `paused` status and budget spend stops climbing.
- No new redemptions for the campaign after 5 minutes of traffic.

## Rollback / Resume
- Fix underlying cause, then set `status` back to `active` with updated `lastModifiedBy` and `lastModifiedAt`.
- Revalidate caches again and monitor alert streams for 15 minutes.
- If budget constraints drove the pause, lower caps or enable throttling before resuming.
