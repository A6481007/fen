# Firestore Collections Inventory

This list is derived from code references to `adminDb.collection("...")` or similar patterns.

Collection: analytics
Usage count: 4
References:
- lib/promotions/promotionEngine.ts:806
- lib/promotions/analytics.ts:199
- lib/promotions/analytics.ts:211
- lib/promotions/analytics.ts:988

Collection: blocklist
Usage count: 5
References:
- lib/promotions/fraudGateway.ts:352
- lib/promotions/fraudGateway.ts:365
- lib/promotions/fraudGateway.ts:546
- lib/promotions/fraudGateway.ts:547
- lib/promotions/fraudGateway.ts:549

Collection: cartAbandonments
Usage count: 4
References:
- app/api/cart-abandonment/route.ts:130
- app/api/cart-abandonment/route.ts:174
- app/api/cart-abandonment/route.ts:232
- app/api/cart-abandonment/route.ts:325

Collection: carts
Usage count: 1
References:
- app/api/cart/utils.ts:863

Collection: churnPredictions
Usage count: 1
References:
- lib/promotions/churnPrediction.ts:262

Collection: days
Usage count: 1
References:
- lib/promotions/analytics.ts:202

Collection: deals
Usage count: 2
References:
- lib/promotions/analytics.ts:208
- lib/promotions/analytics.ts:231

Collection: fraudLogs
Usage count: 1
References:
- lib/promotions/fraudGateway.ts:523

Collection: interactions
Usage count: 1
References:
- lib/promotions/analytics.ts:1105

Collection: messageEvents
Usage count: 1
References:
- lib/promotions/promotionMessaging.ts:975

Collection: messageHistory
Usage count: 2
References:
- lib/promotions/promotionMessaging.ts:747
- lib/promotions/promotionMessaging.ts:953

Collection: messageQueue
Usage count: 1
References:
- lib/promotions/churnPrediction.ts:313

Collection: orders
Usage count: 1
References:
- lib/promotions/churnPrediction.ts:219

Collection: outbound
Usage count: 3
References:
- lib/promotions/pushAdapter.ts:595
- lib/promotions/smsAdapter.ts:368
- lib/promotions/smsAdapter.ts:391

Collection: promotions
Usage count: 14
References:
- lib/promotions/pushAdapter.ts:593
- lib/promotions/sessionAnalytics.ts:34
- lib/promotions/promotionMessaging.ts:973
- lib/promotions/promotionMessaging.ts:1001
- lib/promotions/promotionEngine.ts:789
- lib/promotions/promotionEngine.ts:804
- lib/promotions/smsAdapter.ts:366
- lib/promotions/smsAdapter.ts:389
- lib/promotions/analytics.ts:196
- lib/promotions/analytics.ts:227
- lib/promotions/analytics.ts:986
- lib/promotions/analytics.ts:1060
- lib/promotions/analytics.ts:1103
- app/api/user/segment-data/route.ts:175

Collection: pushDeduplication
Usage count: 2
References:
- lib/promotions/pushAdapter.ts:565
- lib/promotions/pushAdapter.ts:579

Collection: sendLogs
Usage count: 1
References:
- lib/promotions/promotionMessaging.ts:1003

Collection: sessions
Usage count: 1
References:
- lib/promotions/sessionAnalytics.ts:34

Collection: smsHistory
Usage count: 2
References:
- lib/promotions/smsAdapter.ts:200
- lib/promotions/smsAdapter.ts:250

Collection: smsRateLimits
Usage count: 2
References:
- lib/promotions/smsAdapter.ts:194
- lib/promotions/smsAdapter.ts:237

Collection: users
Usage count: 17
References:
- lib/promotions/pushAdapter.ts:296
- lib/promotions/pushAdapter.ts:319
- lib/promotions/pushAdapter.ts:372
- lib/promotions/pushAdapter.ts:543
- lib/promotions/promotionMessaging.ts:745
- lib/promotions/promotionMessaging.ts:951
- lib/promotions/promotionEngine.ts:957
- lib/promotions/churnPrediction.ts:200
- lib/promotions/smsAdapter.ts:198
- lib/promotions/smsAdapter.ts:248
- lib/promotions/fraudGateway.ts:575
- lib/promotions/discountOptimizer.ts:417
- lib/promotions/analytics.ts:225
- lib/promotions/analytics.ts:231
- app/api/user/segment-data/route.ts:154
- app/api/cart-abandonment/route.ts:180
- app/api/promotions/eligibility/route.ts:181

Collection: variantAssignments
Usage count: 1
References:
- lib/promotions/promotionEngine.ts:791
