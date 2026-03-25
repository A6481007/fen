# Investigate a fraud alert

**When to use:** Critical alerts such as Fraud Score >90, anomaly auto-pause, or elevated eligibility errors.

## Preconditions
- Alert payload captured (timestamp, userId/sessionId/ip/deviceFingerprint, campaignId if present).
- Access to Firestore `fraudLogs`, `blocklist`, and promotion documents.
- On-call and security channels informed that investigation is in progress.

## Steps
1. If active abuse is suspected, follow `pause-promotion.md` for the affected campaign(s) and add temporary blocklist entries for the identifiers.
2. Pull recent `fraudLogs` entries filtered by the identifiers and review `checks` (rateLimit, blocklist, accountAge, velocity, geographic, cartGaming) plus `decision`.
3. Inspect `promotions/{campaignId}/interactions` around the alert window for spikes in `purchase` or abnormal channels/segments.
4. Check rate-limit collections (`rateLimits`, `smsRateLimits`) for the identifiers to confirm throttling is working; adjust Redis configuration if values are missing or stale.
5. Confirm anomaly detection state: promotions with `autoPause` should show `status=paused` and `pausedReason` recorded.
6. Summarize findings and decide next action: keep paused, tighten thresholds, or unblock.

## Validation
- Fraud alerts no longer fire after block/mitigation for at least 15 minutes.
- Eligibility/redeem flows respond with expected decisions (allow/challenge/deny) for test accounts.
- No new spikes in `fraudLogs` or error rates on eligibility API.

## Rollback / Escalation
- If a promotion was paused mistakenly, follow `rollback-promotion.md` after confirming clean traffic.
- If automated checks are failing (empty logs, rate limits not incrementing), page platform SRE immediately.
- For repeated actors despite blocklisting, escalate to security with evidence bundle (fraudLog entries, IP/device, timestamps).
