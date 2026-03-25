# Roll back a promotion

**When to use:** A promotion causes errors, overspend, or incorrect eligibility after deployment.

## Preconditions
- CampaignId identified and paused (see `pause-promotion.md`).
- Last known good version available (Sanity document history, git commit, or backup export).
- Impact noted in incident/ticket (metrics affected, start time).

## Steps
1. Keep the promotion paused to stop new redemptions.
2. Restore configuration:
   - Sanity: revert the document to the previous revision or reapply the prior values for budget, dates, targeting, and variant copy.
   - Firestore overrides: if any runtime flags were added (e.g., `autoPause`, `pausedReason`), reset to the known-good values.
3. Revalidate caches: trigger revalidation for promotion pages and eligibility caches.
4. Remove temporary mitigations that are no longer needed (blocklist entries specific to this promo, custom rate-limit overrides).
5. Update the incident/ticket with the rollback timestamp, version restored, and owner.

## Validation
- Eligibility API returns expected promotion payload for a test user matching the audience.
- No new fraud/anomaly alerts for the campaign after 15 minutes.
- Budget and redemption counters stabilize and align with pre-incident levels.

## Escalation
- If rollback fails or data is still incorrect, keep the promotion paused and escalate to the tech lead for deeper config/database restore.
