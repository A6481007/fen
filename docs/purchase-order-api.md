# Purchase Order (Quotation) API

## POST /api/orders/:orderId/purchase-order
- Default behavior is idempotent: calling without `forceNewVersion` returns the latest quote or creates one if none exists.
- To create a new revision, send a JSON body with `{"forceNewVersion": true}` or add `?forceNew=1` (or `forceNewVersion=1`) to the URL.
- Use `forceNewVersion` when the existing quotation is stale (expired or superseded) and you need a fresh version before checkout or acceptance.

Example:

```ts
await fetch(`/api/orders/${orderId}/purchase-order`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ forceNewVersion: true }),
});
```
