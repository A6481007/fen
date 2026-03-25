# API Route Inventory

Routes are derived from `app/api/**/route.ts` files. Methods and hints are extracted from file contents.

---
Route: /api/addresses
File: app/api/addresses/route.ts
Methods: None detected

---
Route: /api/admin/account-requests
File: app/api/admin/account-requests/route.ts
Methods: GET

---
Route: /api/admin/account-requests-summary
File: app/api/admin/account-requests-summary/route.ts
Methods: GET

---
Route: /api/admin/analytics
File: app/api/admin/analytics/route.ts
Methods: GET

---
Route: /api/admin/approve-account
File: app/api/admin/approve-account/route.ts
Methods: POST

---
Route: /api/admin/business-accounts/approve
File: app/api/admin/business-accounts/approve/route.ts
Methods: POST

---
Route: /api/admin/business-accounts
File: app/api/admin/business-accounts/route.ts
Methods: GET

---
Route: /api/admin/cancel-account
File: app/api/admin/cancel-account/route.ts
Methods: POST

---
Route: /api/admin/manage-user
File: app/api/admin/manage-user/route.ts
Methods: POST

---
Route: /api/admin/notifications/[id]
File: app/api/admin/notifications/[id]/route.ts
Methods: DELETE

---
Route: /api/admin/notifications
File: app/api/admin/notifications/route.ts
Methods: GET

---
Route: /api/admin/notifications/send
File: app/api/admin/notifications/send/route.ts
Methods: POST

---
Route: /api/admin/notifications/sent
File: app/api/admin/notifications/sent/route.ts
Methods: GET

---
Route: /api/admin/orders/[id]
File: app/api/admin/orders/[id]/route.ts
Methods: PATCH, GET

---
Route: /api/admin/orders
File: app/api/admin/orders/route.ts
Methods: GET, DELETE
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/admin/premium-accounts/approve
File: app/api/admin/premium-accounts/approve/route.ts
Methods: POST

---
Route: /api/admin/premium-accounts
File: app/api/admin/premium-accounts/route.ts
Methods: GET

---
Route: /api/admin/products
File: app/api/admin/products/route.ts
Methods: GET

---
Route: /api/admin/reject-account
File: app/api/admin/reject-account/route.ts
Methods: POST

---
Route: /api/admin/reviews
File: app/api/admin/reviews/route.ts
Methods: PATCH, GET

---
Route: /api/admin/sales-contacts
File: app/api/admin/sales-contacts/route.ts
Methods: GET

---
Route: /api/admin/stats
File: app/api/admin/stats/route.ts
Methods: GET
Route config:
- dynamic = "force-dynamic"
- revalidate = 60

---
Route: /api/admin/subscriptions/[id]
File: app/api/admin/subscriptions/[id]/route.ts
Methods: DELETE

---
Route: /api/admin/subscriptions/cleanup-duplicates
File: app/api/admin/subscriptions/cleanup-duplicates/route.ts
Methods: POST

---
Route: /api/admin/subscriptions
File: app/api/admin/subscriptions/route.ts
Methods: GET

---
Route: /api/admin/users/[userId]/activate
File: app/api/admin/users/[userId]/activate/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/admin/users/[userId]/delete-sanity
File: app/api/admin/users/[userId]/delete-sanity/route.ts
Methods: DELETE

---
Route: /api/admin/users/combined
File: app/api/admin/users/combined/route.ts
Methods: GET
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/admin/users
File: app/api/admin/users/route.ts
Methods: GET, DELETE

---
Route: /api/admin/users/sync-to-sanity
File: app/api/admin/users/sync-to-sanity/route.ts
Methods: POST

---
Route: /api/analytics/best-sellers
File: app/api/analytics/best-sellers/route.ts
Methods: GET

---
Route: /api/analytics/track
File: app/api/analytics/track/route.ts
Methods: POST

---
Route: /api/cart/add
File: app/api/cart/add/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/cart/items/[lineId]
File: app/api/cart/items/[lineId]/route.ts
Methods: PATCH, DELETE
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/cart/reorder
File: app/api/cart/reorder/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/cart
File: app/api/cart/route.ts
Methods: GET, PATCH, DELETE
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/cart/solution
File: app/api/cart/solution/route.ts
Methods: GET, POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/cart-abandonment
File: app/api/cart-abandonment/route.ts
Methods: GET
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/checkout/clerk/complete
File: app/api/checkout/clerk/complete/route.ts
Methods: None detected

---
Route: /api/checkout/clerk
File: app/api/checkout/clerk/route.ts
Methods: None detected

---
Route: /api/checkout/stripe
File: app/api/checkout/stripe/route.ts
Methods: None detected

---
Route: /api/contact
File: app/api/contact/route.ts
Methods: POST

---
Route: /api/cron/aggregate-analytics
File: app/api/cron/aggregate-analytics/route.ts
Methods: GET
Route config:
- dynamic = "force-dynamic"

---
Route: /api/deals/quote
File: app/api/deals/quote/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/debug/calculate-points
File: app/api/debug/calculate-points/route.ts
Methods: GET

---
Route: /api/debug/create-user
File: app/api/debug/create-user/route.ts
Methods: GET

---
Route: /api/debug/update-user
File: app/api/debug/update-user/route.ts
Methods: POST

---
Route: /api/debug/user-status
File: app/api/debug/user-status/route.ts
Methods: GET

---
Route: /api/events/[slug]/register
File: app/api/events/[slug]/register/route.ts
Methods: POST

---
Route: /api/events/[slug]/register-team
File: app/api/events/[slug]/register-team/route.ts
Methods: POST

---
Route: /api/events/registrations
File: app/api/events/registrations/route.ts
Methods: GET, PATCH, DELETE

---
Route: /api/insights/by-product
File: app/api/insights/by-product/route.ts
Methods: GET

---
Route: /api/navigation/categories
File: app/api/navigation/categories/route.ts
Methods: GET
Route config:
- revalidate = 900

---
Route: /api/news/rsvp
File: app/api/news/rsvp/route.ts
Methods: POST

---
Route: /api/newsletter/subscribe
File: app/api/newsletter/subscribe/route.ts
Methods: POST

---
Route: /api/newsletter/unsubscribe
File: app/api/newsletter/unsubscribe/route.ts
Methods: POST

---
Route: /api/orders/[orderId]/accept-quotation
File: app/api/orders/[orderId]/accept-quotation/route.ts
Methods: POST

---
Route: /api/orders/[orderId]/cancel-quotation
File: app/api/orders/[orderId]/cancel-quotation/route.ts
Methods: POST

---
Route: /api/orders/[orderId]/generate-invoice
File: app/api/orders/[orderId]/generate-invoice/route.ts
Methods: POST

---
Route: /api/orders/[orderId]/pay
File: app/api/orders/[orderId]/pay/route.ts
Methods: POST

---
Route: /api/orders/[orderId]/pay-now
File: app/api/orders/[orderId]/pay-now/route.ts
Methods: POST

---
Route: /api/orders/[orderId]/payment-method
File: app/api/orders/[orderId]/payment-method/route.ts
Methods: PATCH

---
Route: /api/orders/[orderId]/purchase-order
File: app/api/orders/[orderId]/purchase-order/route.ts
Methods: GET, POST

---
Route: /api/orders/[orderId]/quotation-details
File: app/api/orders/[orderId]/quotation-details/route.ts
Methods: PATCH

---
Route: /api/orders/[orderId]/quotations
File: app/api/orders/[orderId]/quotations/route.ts
Methods: GET, POST

---
Route: /api/orders/[orderId]/select-quotation
File: app/api/orders/[orderId]/select-quotation/route.ts
Methods: POST

---
Route: /api/orders/[orderId]/shipping-details
File: app/api/orders/[orderId]/shipping-details/route.ts
Methods: PATCH

---
Route: /api/orders/addresses
File: app/api/orders/addresses/route.ts
Methods: None detected

---
Route: /api/orders/count
File: app/api/orders/count/route.ts
Methods: GET

---
Route: /api/orders/refund
File: app/api/orders/refund/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/orders
File: app/api/orders/route.ts
Methods: GET

---
Route: /api/orders/send-email
File: app/api/orders/send-email/route.ts
Methods: POST

---
Route: /api/pricing-settings
File: app/api/pricing-settings/route.ts
Methods: GET

---
Route: /api/promotions/campaigns
File: app/api/promotions/campaigns/route.ts
Methods: None detected

---
Route: /api/promotions/eligibility
File: app/api/promotions/eligibility/route.ts
Methods: None detected
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/promotions/quote
File: app/api/promotions/quote/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/promotions/track
File: app/api/promotions/track/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/push/subscribe
File: app/api/push/subscribe/route.ts
Methods: POST
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/sales-contacts
File: app/api/sales-contacts/route.ts
Methods: GET

---
Route: /api/sanity/webhook
File: app/api/sanity/webhook/route.ts
Methods: POST

---
Route: /api/search/products
File: app/api/search/products/route.ts
Methods: GET

---
Route: /api/shop/products
File: app/api/shop/products/route.ts
Methods: GET

---
Route: /api/tax-rate
File: app/api/tax-rate/route.ts
Methods: GET

---
Route: /api/user/addresses
File: app/api/user/addresses/route.ts
Methods: GET, POST, PUT, DELETE

---
Route: /api/user/business-apply
File: app/api/user/business-apply/route.ts
Methods: POST

---
Route: /api/user/cancel-application
File: app/api/user/cancel-application/route.ts
Methods: POST

---
Route: /api/user/combined-data
File: app/api/user/combined-data/route.ts
Methods: GET
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/user/dashboard/stats
File: app/api/user/dashboard/stats/route.ts
Methods: GET

---
Route: /api/user/employee-status
File: app/api/user/employee-status/route.ts
Methods: GET

---
Route: /api/user/notifications/[id]/read
File: app/api/user/notifications/[id]/read/route.ts
Methods: PATCH

---
Route: /api/user/notifications/[id]
File: app/api/user/notifications/[id]/route.ts
Methods: DELETE

---
Route: /api/user/notifications
File: app/api/user/notifications/route.ts
Methods: GET, PATCH, DELETE

---
Route: /api/user/orders/count
File: app/api/user/orders/count/route.ts
Methods: GET

---
Route: /api/user/orders
File: app/api/user/orders/route.ts
Methods: GET

---
Route: /api/user/points
File: app/api/user/points/route.ts
Methods: POST, GET

---
Route: /api/user/profile
File: app/api/user/profile/route.ts
Methods: PUT

---
Route: /api/user/request-access
File: app/api/user/request-access/route.ts
Methods: POST

---
Route: /api/user/reviews
File: app/api/user/reviews/route.ts
Methods: GET, POST, PATCH

---
Route: /api/user/reward-points
File: app/api/user/reward-points/route.ts
Methods: GET

---
Route: /api/user/segment-data
File: app/api/user/segment-data/route.ts
Methods: GET
Route config:
- dynamic = "force-dynamic"
- revalidate = 0

---
Route: /api/user/settings
File: app/api/user/settings/route.ts
Methods: PATCH

---
Route: /api/user/status
File: app/api/user/status/route.ts
Methods: GET, POST

---
Route: /api/user-data
File: app/api/user-data/route.ts
Methods: GET

---
Route: /api/webhook
File: app/api/webhook/route.ts
Methods: POST

---
Route: /api/webhooks/twilio/status
File: app/api/webhooks/twilio/status/route.ts
Methods: POST
