# Cart utils backup (Redis removal)

- Source: app/api/cart/utils.ts
- Backup: code-backups/app__api__cart__utils.ts__20251221-225757__remove-redis-dependency.ts
- Context: Preparing to replace Redis cart persistence with in-memory cache + signed cookie + Firestore sync per 4.11.1.1 task.
- Restore: copy backup over `app/api/cart/utils.ts` if the new implementation misbehaves.
