# Production Launch Checklist

## Pre-Launch Verification

### Environment & Configuration
- [ ] All environment variables set in Vercel/production
  - [ ] FIREBASE_* variables configured
  - [ ] TWILIO_* variables configured
  - [ ] VAPID_* keys generated and set
  - [ ] FB_CONVERSIONS_API_TOKEN set
  - [ ] All Sanity variables configured
- [ ] Firestore security rules deployed
- [ ] Firestore indexes created
- [ ] Firebase Admin SDK initialized correctly

### Feature Verification
- [ ] Promotion creation in Sanity works
- [ ] Eligibility API returns correct promotions
- [ ] Tracking API logs events
- [ ] Discount calculation is accurate
- [ ] A/B variant assignment is deterministic
- [ ] Cart abandonment detection works
- [ ] Win-back emails trigger correctly

### Security
- [ ] Rate limiting active on all endpoints
- [ ] Fraud detection enabled
- [ ] Anomaly auto-pause configured
- [ ] Blocklist functionality verified
- [ ] CORS configured correctly
- [ ] API routes require authentication where needed

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

## Monitoring Setup

### Alerts to Configure

1. **Critical Alerts (Page immediately)**
   - Promotion auto-paused due to anomaly
   - Fraud score > 90 on any request
   - Error rate > 5% on eligibility API
   - Eligibility API p95 > 1s

2. **Warning Alerts (Slack notification)**
   - Budget usage > 80%
   - Usage limit > 90%
   - Anomaly flagged for review
   - SMS delivery failure rate > 10%
   - Push delivery failure rate > 20%

3. **Info Alerts (Daily digest)**
   - Daily redemption summary
   - Top performing promotions
   - A/B test significance reached
   - Churn prediction summary

### Dashboards to Create

1. **Real-time Operations**
   - Active promotions count
   - Redemptions per minute
   - Fraud blocks per hour
   - API latency percentiles

2. **Business Metrics**
   - Revenue by promotion
   - Discount spend vs budget
   - Conversion rates by segment
   - A/B test results

3. **System Health**
   - API error rates
   - Firestore read/write usage
   - Message queue depth
   - Background job status

### Log Aggregation

Configure logging for:
- [ ] All API requests with timing
- [ ] Fraud check results
- [ ] Anomaly detections
- [ ] Message send results
- [ ] Background job executions

### Runbooks

Create runbooks for:
- [ ] Manually pausing a promotion
- [ ] Adding user to blocklist
- [ ] Investigating fraud alert
- [ ] Resending failed messages
- [ ] Backfilling analytics data
- [ ] Rolling back bad promotion

## Post-Launch

### Day 1
- [ ] Monitor all critical alerts
- [ ] Check first redemptions succeed
- [ ] Verify analytics flowing
- [ ] Confirm messaging working

### Week 1
- [ ] Review fraud false positive rate
- [ ] Tune rate limit thresholds if needed
- [ ] Analyze A/B test results
- [ ] Check aggregation job health

### Month 1
- [ ] Review promotion ROI
- [ ] Optimize discount levels
- [ ] Tune churn prediction model
- [ ] Assess messaging effectiveness
