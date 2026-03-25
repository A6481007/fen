# Admin and Employee Pages

## Admin Pages

- Route: /admin/access-denied
  File: app/(admin)/admin/access-denied/page.tsx
  Components: @/components/admin/AccessDeniedContent
- Route: /admin/account-requests
  File: app/(admin)/admin/account-requests/page.tsx
  Components: @/components/admin/AccountRequestsClient
- Route: /admin/analytics
  File: app/(admin)/admin/analytics/page.tsx
  Components: @/components/admin/AnalyticsDashboard
- Route: /admin/employees
  File: app/(admin)/admin/employees/page.tsx
  Components: @/components/admin/EmployeeManagement
- Route: /admin/notifications
  File: app/(admin)/admin/notifications/page.tsx
  Components: @/components/admin/AdminNotifications
  Notes: admin guard, redirects
- Route: /admin/orders
  File: app/(admin)/admin/orders/page.tsx
  Components: @/components/admin/AdminOrders
- Route: /admin
  File: app/(admin)/admin/page.tsx
  Components: @/components/admin/AdminDashboardOverview
- Route: /admin/products
  File: app/(admin)/admin/products/page.tsx
  Components: @/components/admin/AdminProducts
  Notes: admin guard, redirects
- Route: /admin/promotions/[campaignId]/analytics
  File: app/(admin)/admin/promotions/[campaignId]/analytics/page.tsx
  Components: @/components/admin/promotions/PromotionAnalyticsDashboard, @/components/admin/DashboardSkeleton, @/components/admin/promotions/types, @/components/admin/promotions/ABTestResults
- Route: /admin/reviews
  File: app/(admin)/admin/reviews/page.tsx
  Components: @/components/admin/AdminReviews
- Route: /admin/subscriptions
  File: app/(admin)/admin/subscriptions/page.tsx
  Components: @/components/admin/AdminSubscriptions
- Route: /admin/users
  File: app/(admin)/admin/users/page.tsx
  Components: @/components/admin/AdminUsers

## Employee Pages

- Route: /employee/accounts
  File: app/(employee)/employee/accounts/page.tsx
  Components: @/components/employee/AccountsOrdersList
  Notes: uses getCurrentEmployee, redirects, role-gated
- Route: /employee/dashboard
  File: app/(employee)/employee/dashboard/page.tsx
  Components: @/components/ui/card
  Notes: uses getCurrentEmployee, redirects, role-gated
- Route: /employee/debug
  File: app/(employee)/employee/debug/page.tsx
  Notes: redirects
- Route: /employee/deliveries
  File: app/(employee)/employee/deliveries/page.tsx
  Components: @/components/employee/DeliveryOrdersList
  Notes: uses getCurrentEmployee, redirects, role-gated
- Route: /employee/orders
  File: app/(employee)/employee/orders/page.tsx
  Components: @/components/employee/OrdersList, @/components/employee/SalesContactProfileCard
  Notes: uses getCurrentEmployee, redirects, role-gated
- Route: /employee/packing
  File: app/(employee)/employee/packing/page.tsx
  Components: @/components/employee/PackingOrdersList
  Notes: uses getCurrentEmployee, redirects, role-gated
- Route: /employee
  File: app/(employee)/employee/page.tsx
  Notes: uses getCurrentEmployee, redirects, role-gated
- Route: /employee/payments
  File: app/(employee)/employee/payments/page.tsx
  Components: @/components/ui/card
  Notes: uses getCurrentEmployee, redirects, role-gated
- Route: /employee/warehouse
  File: app/(employee)/employee/warehouse/page.tsx
  Components: @/components/employee/WarehouseOrdersList
  Notes: uses getCurrentEmployee, redirects, role-gated