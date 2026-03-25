# Feature and Capability Inventory

This file aggregates the major product capabilities from README, docs, Sanity schemas, and code paths. It is designed to help plan admin/employee UI coverage without going into implementation.

Core commerce capabilities
- Product catalog with categories, brands, status badges, images, variants, stock and pricing.
- Deals and promotions (flash sales, bundles, loyalty, clearance, win-back, early access) with schedule, targeting, limits, and analytics.
- Cart and checkout flows with promotions/deals enforcement and server-side pricing validation.
- Orders, quotations, order status tracking, and related customer notifications.
- Reviews, ratings, and moderation workflows.

Content and knowledge capabilities
- Insight content hub with knowledge and solution articles, authors, categories, series, and SEO metadata.
- News hub with articles, categories, attachments, linked events, and SEO metadata.
- Events with registration workflows, speakers, agenda, resources, capacity, and status automation.
- Downloads and catalog resources that can be gated by event participation.

Customer and account capabilities
- Clerk-based authentication, user profiles, addresses, and account settings.
- Business and premium account application flows with approval/rejection workflows.
- Employee role assignment and operational dashboards per role.

Marketing and communication capabilities
- Newsletter subscriptions and email notifications.
- Promotion tracking (impressions, clicks, add-to-cart, purchases) and A/B testing.
- Push notifications and SMS messaging adapters.
- Segmentation and cart-abandonment recovery.

Analytics and operational capabilities
- Admin analytics dashboard for sales, orders, and promotion performance.
- Employee performance tracking and order lifecycle metrics.
- Fraud/anomaly detection for promotions and marketing interactions.

External integrations observed in code and dependencies
- Sanity CMS for structured content and commerce metadata.
- Firebase (Firestore + Admin SDK) for analytics, segmentation, cart abandonment, and messaging logs.
- Clerk for authentication and role metadata.
- Stripe and Clerk Payments for checkout.
- Twilio for SMS, Web Push for browser notifications.
- BullMQ + Redis for background queues.

