# Production Launch Checklist

Owner/Role: Platform SRE + Tech Lead  
Dependencies: All implementations complete  
Estimated Effort: ~8 hours

## Action Items (Critical Path)
| Step | Task | Output | Status |
| --- | --- | --- | --- |
| 1 | Maintain production checklist document | `PRODUCTION_CHECKLIST.md` | [x] |
| 2 | Verify all production environment variables (`.env.production` / Vercel) | Env validation log | [ ] |
| 3 | Deploy Firestore security rules | `firestore.rules` applied | [ ] |
| 4 | Create all required Firestore indexes | `firestore.indexes.json` applied | [ ] |
| 5 | Configure monitoring dashboards (Vercel/GCP) | 3 dashboards live | [ ] |
| 6 | Configure alerting rules | Critical/Warning/Info alerts live | [ ] |
| 7 | Create operational runbooks | `docs/runbooks/*` | [ ] |
| 8 | Execute production smoke tests | Smoke test report | [ ] |

## Environment Variables (Production)
Validate in Vercel → Project Settings → Environment Variables or `.env.production`. Pull locally with `vercel env pull .env.production.local` before deploying.

| Category | Variables | Location | Status |
| --- | --- | --- | --- |
| Firebase | `PROJECT_ID`, `CLIENT_EMAIL`, `PRIVATE_KEY`, `DATABASE_URL` | `.env.production` | [ ] |
| Twilio | `ACCOUNT_SID`, `AUTH_TOKEN`, `PHONE_NUMBER`, `MESSAGING_SERVICE_SID` | `.env.production` | [ ] |
| Push (VAPID) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `.env.production` | [ ] |
| Analytics | `FB_PIXEL_ID`, `FB_CONVERSIONS_API_TOKEN`, `GA_ID` | `.env.production` | [ ] |
| Cache (redis-compatible) | `CACHE_REDIS_URL` | `.env.production` | [ ] |
| App | `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET` | `.env.production` | [ ] |

## Firestore Security Rules
- [ ] Review and deploy `firestore.rules` (`firebase deploy --only firestore:rules`).
- [ ] Confirm read/write coverage for `cartAbandonments`, `promotions/*/variantAssignments`, `promotions/*/interactions`, `rateLimits`, and `smsRateLimits`.
- [ ] Validate requests using custom claims for service/admin roles before enabling client access.

## Firestore Indexes (Required)
Apply with `firebase deploy --only firestore:indexes` or via GCP console.

| Collection | Fields | Query Type | Status |
| --- | --- | --- | --- |
| cartAbandonments | `sessionId`, `status`, `lastUpdatedAt` | Composite | [ ] |
| cartAbandonments | `userId`, `status`, `createdAt` | Composite | [ ] |
| promotions/{id}/variantAssignments | `variant`, `assignedAt` | Composite | [ ] |
| promotions/{id}/interactions | `timestamp`, `action` | Composite | [ ] |
| rateLimits | `key`, `resetAt` | Composite | [ ] |
| smsRateLimits | `userId`, `date` | Composite | [ ] |

## Monitoring Dashboards
- [ ] Real-time Operations: active promotions, redemptions/min, fraud blocks/hr, API latency (p50/p95/p99).
- [ ] Business Metrics: revenue by promotion, discount spend vs budget, conversion by segment, A/B test results.
- [ ] System Health: API error rates by endpoint, Firestore read/write usage, message queue depth, background job status.

## Alerting Rules
| Alert | Condition | Severity | Action | Status |
| --- | --- | --- | --- | --- |
| Anomaly Auto-Pause | Promotion paused by system | Critical | Page on-call | [ ] |
| Fraud Score >90 | Any request with score >90 | Critical | Page security | [ ] |
| Eligibility API Error >5% | Error rate >5% in 5 min | Critical | Page on-call | [ ] |
| Eligibility API p95 >1s | Latency >1s for 5 min | Critical | Page on-call | [ ] |
| Budget Usage >80% | Any promo >80% budget | Warning | Slack notification | [ ] |
| SMS Delivery Failure >10% | Failure rate >10% | Warning | Slack notification | [ ] |
| Daily Redemption Summary | 6am daily | Info | Email digest | [ ] |

## Operational Runbooks
- [ ] `docs/runbooks/pause-promotion.md`
- [ ] `docs/runbooks/blocklist-user.md`
- [ ] `docs/runbooks/investigate-fraud.md`
- [ ] `docs/runbooks/resend-messages.md`
- [ ] `docs/runbooks/backfill-analytics.md`
- [ ] `docs/runbooks/rollback-promotion.md`

## Functional & Security Gates
### Configuration
- [ ] Firebase Admin SDK initialized correctly
- [ ] All Sanity variables configured
- [ ] Rate limiting active on all endpoints
- [ ] Fraud detection enabled and anomaly auto-pause configured
- [ ] Blocklist functionality verified
- [ ] CORS configured correctly

### Feature Verification
- [ ] Promotion creation in Sanity works
- [ ] Eligibility API returns correct promotions
- [ ] Tracking API logs events
- [ ] Discount calculation is accurate
- [ ] A/B variant assignment is deterministic
- [ ] Cart abandonment detection works
- [ ] Win-back emails trigger correctly

### Performance
- [ ] Eligibility API <200ms p95
- [ ] Tracking API <100ms p95
- [ ] Dashboard loads in <3s
- [ ] No N+1 queries in critical paths
- [ ] Caching configured for Sanity queries

### Analytics
- [ ] Facebook Pixel verified
- [ ] GA4 events verified
- [ ] Server-side conversions working
- [ ] Nightly aggregation job scheduled
- [ ] Dashboard metrics accurate

### Messaging
- [ ] SMS delivery verified
- [ ] Push notifications working
- [ ] Email templates tested
- [ ] Frequency caps enforced
- [ ] Quiet hours respected

## Logging & Smoke Tests
- [ ] Log aggregation: API requests with timing, fraud check results, anomaly detections, message send results, background jobs.
- [ ] Smoke tests: eligibility API happy path, redemption/purchase flow, promotion auto-pause trigger, Twilio webhook path, push notification send, admin dashboard load/filters, rate-limit headers on key endpoints.

## Post-Launch Watchlist
- **Day 1:** Monitor critical alerts, confirm first redemptions, verify analytics and messaging flows.
- **Week 1:** Review fraud false positives, tune rate limits, analyze A/B results, check aggregation job health.
- **Month 1:** Review promotion ROI, tune discount levels, adjust churn model, assess messaging effectiveness.

## Verification Criteria
- [ ] All environment variables verified in production
- [ ] Firestore rules deployed and tested
- [ ] All indexes created and active
- [ ] Monitoring dashboards accessible
- [ ] Alert rules configured and tested
- [ ] Runbooks reviewed and approved
- [ ] Production smoke tests pass
