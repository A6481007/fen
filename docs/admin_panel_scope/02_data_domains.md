# Data Domains and Sources

This file maps business domains to their primary storage system and schema types. It should be used when planning admin/employee UI modules.

Commerce core (Sanity)
- Products: `product` (catalog entries, pricing, variants, inventory)
- Categories: `category` (hierarchical catalog taxonomy)
- Brands: `brand` (brand metadata used for filtering)
- Product type options: `productTypeOption` (variants/options definitions)
- Orders: `order` (order data, status history, line items)
- Pricing settings: `pricingSettings` (global pricing/VAT/markup config)
- Purchase order settings: `purchaseOrderSettings` (PO configuration)
- Quotations: `quotation` (quotation workflow records)

Marketing (Sanity + Firestore)
- Promotions: `promotion` (campaign configuration, targeting, budget, A/B testing)
- Deals: `deal` (price drop, featured, limited quantity, daily, clearance)
- Banners: `banner` (homepage or campaign banners)
- Promotion analytics: Firestore collections under `promotions/*`
- Deal analytics: Firestore collections under `deals/*`

Content (Sanity)
- News: `news` (articles with attachments and linked events)
- Events: `event` (event metadata, agenda, resources, speakers, attendees)
- Event registrations: `eventRsvp` (registration and team details)
- Insights: `insight` (knowledge and solution articles)
- Insight categories: `insightCategory`
- Insight authors: `insightAuthor`
- Insight series: `insightSeries`
- Blog (legacy): `blog`, `blogCategory`, `post`
- Downloads (legacy): `download`
- Catalog resources: `catalog`

Users and access (Sanity + Clerk)
- Users: `user` (profile, wishlist, addresses, employee fields)
- Addresses: `address`
- User access requests: `userAccessRequest`
- Sales contacts: `salesContact` (call center profiles)
- Auth/author: `auth` or `author` (content author records)

Communications (Sanity + Firestore)
- Contact messages: `contact`
- Subscriptions: `subscription`
- Sent notifications: `sentNotification`
- Email and SMS logs: Firestore collections `messageHistory`, `smsHistory`, etc.

Operational and analytics (Firestore)
- Cart abandonment records: `cartAbandonments`
- Customer segmentation: `users/*` subcollections, `promotions/*` interactions
- Fraud/anomaly logging: `fraudLogs`, `anomalyLogs`, `blocklist`

