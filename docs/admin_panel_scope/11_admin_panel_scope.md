# Admin and Employee Panel Scope (No Studio)

Goal
- Build internal pages to manage all content and marketing data currently stored in Sanity and Firestore.
- Provide role-based access so non-technical staff can manage insights, news, events, promotions, deals, and other content without entering Sanity Studio.

Roles and access model (current code)
- Admin access is defined by Clerk role metadata and/or `NEXT_PUBLIC_ADMIN_EMAIL` allowlist (see `lib/adminUtils.ts`).
- Employee roles are defined in `types/employee.ts` with permissions per role:
  - callcenter, packer, warehouse, deliveryman, incharge, accounts
- Employee page gates rely on `getCurrentEmployee` and role checks in `app/(employee)/employee/**`.

Required admin modules (content + marketing)
1) Insight/Knowledge Hub
- Manage `insight`, `insightCategory`, `insightAuthor`, `insightSeries` documents.
- Required UI: list, filter by type/status, create/edit form with fieldsets (content, metadata, relationships, SEO, solutions).
- Key fields: title, slug, insightType, mainImage, summary, body, readingTime, author, reviewer, publishedAt, status, categories, primaryCategory, tags, linkedProducts, linkedInsights, pillarPage, SEO fields, solution fields.
- Reference pages: `/insight`, `/insight/knowledge`, `/insight/solutions`, `/insight/author/[slug]`.
- Source files: `sanity/schemaTypes/insightType.ts`, `sanity/queries/insight.ts`.

2) News Hub
- Manage `news` documents with attachments, linked events, SEO metadata.
- Required UI: list, detail, create/edit, file upload management, event link selection, attachment access state (public vs event-locked).
- Key fields: title, slug, publishDate, author, content, featuredImage, category, linkedEvent, attachments with fileType/status.
- Reference pages: `/news`, `/news/[slug]`, `/news/events`, `/news/resources`, `/news/downloads`.
- Source files: `sanity/schemaTypes/newsType.ts`, `sanity/queries/news.ts`, `sanity/queries/resources.ts`.

3) Events and Registrations
- Manage `event` and `eventRsvp` documents plus event resources.
- Required UI: list events, create/edit event details, manage agenda/speakers/resources, view registrations and attendance.
- Key fields: title, slug, description, date, location, image, registrationOpen, maxAttendees, registrationDeadline, earlyBirdDeadline, teamRegistrationEnabled, minTeamSize, maxTeamSize, eventType, targetAudience, registrationFee, currency, agenda, speakers, resources, attendees.
- Reference pages: `/news/events`, `/news/events/[slug]` and event registration APIs.
- Source files: `sanity/schemaTypes/eventType.ts`, `sanity/schemaTypes/eventRsvpType.ts`, `sanity/queries/events.ts`.

4) Promotions
- Manage `promotion` documents and analytics from Firestore.
- Required UI: promotion list, template-guided create/edit, schedule control, targeting, A/B testing, budget/limits, analytics dashboard (impressions/clicks/add-to-cart/purchase).
- Key fields: campaignId, slug, name, type, status, startDate, endDate, timezone, discountType, discountValue, buy/get quantities, segmentType, categories/products, exclusion lists, budgetCap, usageLimit, perCustomerLimit, hero copy, badge, images, CTA, urgency, variantMode, splitPercent, tracking metadata.
- Reference pages: `/admin/promotions/[campaignId]/analytics`, `/promotions`.
- Source files: `sanity/schemaTypes/promotionType.tsx`, `lib/promotions/*`, `app/api/promotions/*`, `components/admin/promotions/*`.

5) Deals
- Manage `deal` documents and enforce limits.
- Required UI: deal list, create/edit with templates, schedule, per-customer limits, and performance summary.
- Key fields: dealType, dealId, title, product reference, status, originalPrice, dealPrice, badge, showOnHomepage, priority, start/end, quantityLimit, perCustomerLimit, soldCount.
- Source files: `sanity/schemaTypes/dealType.ts`, `app/api/deals/quote/route.ts`, `sanity/queries/deals.ts`.

6) Catalogs and Downloads
- Manage `catalog` and `download` documents for gated resource access.
- Required UI: upload and link to products, manage download availability.
- Source files: `sanity/schemaTypes/catalogType.ts`, `sanity/schemaTypes/downloadType.ts`.

7) Blog and Authors (legacy)
- Manage `blog`, `blogCategory`, `post`, and `author` documents if still used.
- Required UI: list and edit content, update SEO metadata.
- Source files: `sanity/schemaTypes/blogType.ts`, `sanity/schemaTypes/blogCategoryType.ts`, `sanity/schemaTypes/postType.ts`, `sanity/schemaTypes/authType.ts`.

8) Communications
- Manage `contact`, `subscription`, `sentNotification` documents; send notifications.
- Required UI: inbox view, status updates, send notifications, and review subscription status.
- Source files: `sanity/schemaTypes/contactType.ts`, `sanity/schemaTypes/subscriptionType.ts`, `sanity/schemaTypes/sentNotificationType.ts`, `app/api/admin/notifications/*`.

9) User and Access Management
- Manage `user`, `address`, `userAccessRequest` documents, plus Clerk metadata.
- Required UI: user list, role assignment, employee status, account approvals, and access requests.
- Source files: `sanity/schemaTypes/userType.ts`, `sanity/schemaTypes/addressType.ts`, `sanity/schemaTypes/userAccessRequestType.ts`, `actions/employeeActions.ts`, `app/api/admin/*`.

10) Orders and Quotation Operations
- Manage `order` and `quotation` documents, plus order lifecycle actions.
- Required UI: order list, status transitions, refunds, cancellations, employee assignment, invoice generation.
- Source files: `sanity/schemaTypes/orderType.ts`, `sanity/schemaTypes/quotationType.ts`, `actions/orderEmployeeActions.ts`, `app/api/admin/orders/*`.

Employee modules (operational)
- Sales/call center: confirm orders, update customer contact, update sales contact profiles (`salesContact`).
- Packer: packing queue and packing notes.
- Warehouse: assign delivery, dispatch, track logistics.
- Delivery: delivery confirmation, cash collection, proof updates.
- Accounts: payment confirmation, cash reconciliation.

UI design notes for the non-Studio admin panel
- Mirror Sanity field validations (required, min/max, enum lists) to avoid publish errors.
- Keep list/detail pages aligned to query shapes in `sanity/queries/*` and API responses in `app/api/*`.
- Provide safe guards for destructive actions: deletion, unpublish, cancelation, refund.
- Provide import/export tools for bulk operations (promotions, deals, products, users).
- Separate access for content editors vs. commerce operators (roles and permissions).

