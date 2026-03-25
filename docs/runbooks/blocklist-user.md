# Blocklist a user/IP/device

**When to use:** Fraud alerts or manual investigations show a repeated abusive actor. Fraud gateway checks the `blocklist` collection for `user`, `ip`, and `device` entries.

## Preconditions
- Confirm identifiers: `userId`, offending IP, device fingerprint (if available).
- Evidence collected (fraud score, logs, session IDs).
- On-call notified that blocklisting will deny promotions for the entity.

## Steps
1. In Firestore, open collection `blocklist`.
2. Add a document with ID `user:{userId}` (or `ip:{ip}` / `device:{fingerprint}`) and fields:  
   - `reason`: short description  
   - `addedBy`: email/owner  
   - `addedAt`: server timestamp  
   - `expiresAt` (optional): timestamp for auto-unblock  
3. If multiple identifiers are involved, add one document per identifier.
4. Log the change in the incident/ticket with a link to the Firestore document(s).

## Validation
- Call the fraud gateway path (e.g., redemption or eligibility flow) for the same identifiers and confirm response `deny` with reason `blocklisted`.
- Check `fraudLogs` collection for the logged denial entry with the new blocklisted identifier.

## Rollback
- Delete the corresponding `blocklist` document(s) or set `expiresAt` to a near-term timestamp.
- Re-run the validation flow to confirm the user is no longer blocked.
- Note the unblock in the ticket and hand off to security if recurring.
