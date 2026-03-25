# Resend failed SMS/Push

**When to use:** Customer did not receive a promotion message and delivery logs show failure or no status update.

## Preconditions
- userId, campaignId, channel (SMS/push), and last messageId (if any).
- Access to Firestore (`smsRateLimits`, `users/{userId}/smsHistory/{campaignId}`) and Twilio console/web-push creds.
- Confirm quiet hours and rate limits before attempting a resend.

## Steps
1. Inspect Firestore:
   - `users/{userId}/smsHistory/{campaignId}` for the latest attempt, body, and error.
   - `smsRateLimits/{userId}_{YYYY-MM-DD}` to see daily counters; do **not** reset unless authorized.
   - For push, verify a valid subscription exists and VAPID keys are present in env.
2. Check vendor status:
   - Twilio Console → Monitor → Logs → Messaging for the `messageId` and failure reason.
   - Push: confirm the endpoint is active (no `410 Gone` from prior sends).
3. Prepare the resend:
   - Ensure the original issue (invalid phone, opt-out, rate limit, quiet hours) is resolved.
   - If rate limit is exhausted, wait for the window reset; only override counters with incident commander approval.
4. Resend:
   - SMS: use Twilio Console/CLI to send the same body from `TWILIO_PHONE_NUMBER`/`TWILIO_MESSAGING_SERVICE_SID` to the user. Include campaignId in the body or metadata for traceability.
   - Push: re-trigger the app flow that queues the push (cart recovery or promotion send) or use the push adapter with the stored subscription to send a single retry.
5. Log the resend:
   - Append a new entry to `users/{userId}/smsHistory/{campaignId}` with `status: "resent"`, `messageId`, `sentAt`, `error` (if any), and `actor`.
   - Note the retry in the incident/ticket.

## Validation
- Twilio status moves to `delivered` (or push succeeds) and no additional errors appear in `smsRateLimits` or `fraudLogs`.
- Customer confirms receipt, or monitoring shows the device opened the link.

## Rollback / Escalation
- If resend fails again, stop further attempts, keep the rate-limit entry intact, and escalate to messaging owner.
- For invalid numbers or repeated carrier blocks, mark the user as suppressed in CRM until corrected.
