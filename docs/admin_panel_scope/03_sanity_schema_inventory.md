# Sanity Schema Inventory

This inventory is derived from `sanity/schemaTypes/*` files. It enumerates document/object schemas and their fields for building admin forms outside Sanity Studio.

---
Schema: address
Title: Addresses
Kind: document
File: sanity/schemaTypes/addressType.ts
Fields:
- lastUsedAt [title="Last Used At"; type="datetime"; description="Most recent time this address was used on an order."]

---
Schema: author
Title: Author
Kind: document
File: sanity/schemaTypes/authType.ts
Fields:
- (unnamed) [title="Normal"; type="block"]

---
Schema: author
Title: Author
Kind: document
File: sanity/schemaTypes/authorType.ts
Fields:
- (unnamed) [title="Normal"; type="block"]

---
Schema: banner
Title: Banner
Kind: document
File: sanity/schemaTypes/bannerType.ts
Fields:
- image [title="Product Image"; type="image"]

---
Schema: blockContent
Title: Block Content
Kind: array
File: sanity/schemaTypes/blockContentType.ts
Fields:
- alt [title="Alternative Text"; type="image"]

---
Schema: blogcategory
Title: Blog Category
Kind: document
File: sanity/schemaTypes/blogCategoryType.ts
Fields:
- description [type="text"]

---
Schema: blog
Title: Blog
Kind: document
File: sanity/schemaTypes/blogType.ts
Fields:
- (unnamed) [type="reference"]
- rsvpLimit [title="RSVP Limit"; type="number"]
- (unnamed) [type="string"]
- body [title="title"; type="blockContent"]

---
Schema: brand
Title: Brand
Kind: document
File: sanity/schemaTypes/brandTypes.ts
Fields:
- image [title="Brand Image"; type="image"]

---
Schema: catalog
Title: Catalog
Kind: document
File: sanity/schemaTypes/catalogType.ts
Fields:
- (unnamed) [type="string"]
- fileType [title="File Type"; type="string"; description="Auto-derived from the uploaded file MIME type; do not edit manually."]
- (unnamed) [type="reference"]
- placeholderPath [title="Placeholder Path"; type="string"; description="Stable fallback used when cover generation fails. Keep this path consistent."]
- generatedFromFile [title="Generated From File"; type="string"]

---
Schema: contact
Title: Contact Messages
Kind: document
File: sanity/schemaTypes/contactType.ts
Fields:
- userAgent [title="User Agent"; type="text"]

---
Schema: setup
Title: Deal
Kind: document
File: sanity/schemaTypes/dealType.ts
Groups: display, limits, pricing, setup
Fields:
- soldCount [title="Units Sold"; type="number"; group="limits"]

---
Schema: download
Title: Download
Kind: document
File: sanity/schemaTypes/downloadType.ts
Fields:
- (unnamed) [type="reference"]

---
Schema: eventRsvp
Title: Event RSVPs
Kind: document
File: sanity/schemaTypes/eventRsvpType.ts
Fields:
- jobTitle [title="Job Title"; type="string"]
- email [title="Email"; type="string"]
- userAgent [title="User Agent"; type="text"]

---
Schema: event
Title: Event
Kind: document
File: sanity/schemaTypes/eventType.ts
Fields:
- (unnamed) [title="Dealers"; type="string"]
- speaker [title="Speaker"; type="string"]
- description [title="Description"; type="text"]
- image [title="Image"; type="image"]
- bio [title="Bio"; type="text"]
- registrationDate [title="Registration Date"; type="datetime"]
- notes [type="text"]
- status [title="Access"; type="string"]
- fileType [title="File Type"; type="string"]
- file [title="File"; type="file"]

---
Schema: seoMetadata
Title: SEO Metadata
Kind: object
File: sanity/schemaTypes/helpers/seoMetadataType.ts
Fields:
- ogImage [title="Social Share Image"; type="image"; description="Image displayed when shared on social media"]

---
Schema: index
Title: index
File: sanity/schemaTypes/index.ts
Fields:
  (No defineField blocks found in this schema file.)

---
Schema: insightAuthor
Title: Insight Author
Kind: document
File: sanity/schemaTypes/insightAuthorType.ts
Fields:
- (unnamed) [type="string"]
- (unnamed) [type="string"]
- website [title="Website"; type="url"]
- isActive [title="Active"; type="boolean"]

---
Schema: insightCategory
Title: Insight Category
Kind: document
File: sanity/schemaTypes/insightCategoryType.ts
Fields:
- seoMetadata [title="SEO Metadata"; type="reference"]

---
Schema: insightSeries
Title: Insight Series
Kind: document
File: sanity/schemaTypes/insightSeriesType.ts
Fields:
- (unnamed) [type="reference"]
- publishedAt [title="Published At"; type="datetime"]

---
Schema: insight
Title: Insight
Kind: document
File: sanity/schemaTypes/insightType.ts
Fieldsets: content, metadata, relationships, seo, solutions
Fields:
- (unnamed) [type="reference"]
- (unnamed) [type="string"]
- (unnamed) [type="reference"; description="Products mentioned or featured in the insight."]
- (unnamed) [type="reference"; description="Manual cross-links to related insights."]
- difficulty [title="Keyword Difficulty"; type="number"]
- volume [title="Search Volume"; type="number"]
- solutionDescription [title="Solution Description"; type="text"]
- metricDescription [title="Metric Description"; type="string"]
- metricValue [title="Metric Value"; type="string"; description="e.g., "]
- notes [title="Notes"; type="string"; description="Implementation notes or special considerations."]
- isRequired [title="Required?"; type="boolean"; description="Required vs optional in the bundle."]
- quantity [title="Quantity"; type="number"]

---
Schema: news
Title: News
Kind: document
File: sanity/schemaTypes/newsType.ts
Fields:
- status [title="Access"; type="string"]
- fileType [title="File Type"; type="string"]
- file [title="File"; type="file"]

---
Schema: order
Title: Order
Kind: document
File: sanity/schemaTypes/orderType.ts
Fields:
- emailSentAt [title="Quotation Email Sent At"; type="datetime"]
- promotionId [title="Promotion/Deal ID"; type="string"]
- promotionType [title="Promotion Type"; type="string"]
- state [title="Province"; type="string"]
- zip [title="Postal Code"; type="string"]
- city [title="District"; type="string"]
- address [title="Address"; type="string"]
- name [title="Name"; type="string"]
- email [title="Email"; type="string"]
- phone [title="Phone"; type="string"]
- fax [title="Fax"; type="string"]
- country [title="Country"; type="string"]
- taxId [title="Tax ID"; type="string"]
- branch [title="Branch"; type="string"]
- type [title="Type"; type="string"]
- default [title="Default"; type="boolean"]
- createdAt [title="Created At"; type="datetime"]
- lastUsedAt [title="Last Used At"; type="datetime"]
- state [title="Province"; type="string"]
- zip [title="Postal Code"; type="string"]
- city [title="District"; type="string"]
- address [title="Address"; type="string"]
- name [title="Name"; type="string"]
- email [title="Email"; type="string"]
- phone [title="Phone"; type="string"]
- fax [title="Fax"; type="string"]
- country [title="Country"; type="string"]
- taxId [title="Tax ID"; type="string"]
- branch [title="Branch"; type="string"]
- type [title="Type"; type="string"]
- default [title="Default"; type="boolean"]
- createdAt [title="Created At"; type="datetime"]
- lastUsedAt [title="Last Used At"; type="datetime"]
- notes [title="Notes"; type="text"]
- changedAt [title="Changed At"; type="datetime"]
- changedByRole [title="Changed By Role"; type="string"]

---
Schema: post
Title: Post
Kind: document
File: sanity/schemaTypes/postType.ts
Fields:
- alt [title="Alternative text"; type="string"]
- (unnamed) [type="reference"]
- body [title="title"; type="blockContent"]

---
Schema: pricingSettings
Title: Pricing Settings
Kind: document
File: sanity/schemaTypes/pricingSettingsType.ts
Fields:
- enabled [title="Enabled"; type="boolean"]
- text [title="Text"; type="string"]
- enabled [title="Enabled"; type="boolean"]
- text [title="Text"; type="string"]
- notes [title="Notes"; type="text"]

---
Schema: product
Title: Products
Kind: document
File: sanity/schemaTypes/productType.ts
Fieldsets: categorization, inventory, media, pricing, reviews, seo
Fields:
- computed [title="Computed Summary (internal)"; type="string"]
- oneStar [title="1 Star"; type="number"]
- twoStars [title="2 Stars"; type="number"]

---
Schema: productTypeOption
Title: Product Type
Kind: document
File: sanity/schemaTypes/productTypeOption.ts
Fields:
- description [title="Description"; type="text"]

---
Schema: purchaseOrderSettings
Title: Quotation Settings
Kind: document
File: sanity/schemaTypes/purchaseOrderSettingsType.ts
Fields:
- headOfficeLabel [title="Head Office Label"; type="string"]
- fax [title="Default Customer Fax"; type="string"]
- name [title="Name"; type="string"]
- phone [title="Phone"; type="string"]
- ext [title="Extension"; type="string"]
- fax [title="Fax"; type="string"]
- mobile [title="Mobile"; type="string"]
- email [title="Email"; type="string"]
- web [title="Website"; type="string"]
- lineExt [title="Line Extension"; type="string"]
- purchaserUrl [title="Purchaser Signature URL"; type="url"]
- warrantyCondition [title="Warranty Condition"; type="text"]
- remark [title="Default Remark"; type="text"]

---
Schema: quotation
Title: Quotation
Kind: document
File: sanity/schemaTypes/quotationType.ts
Fields:
- state [title="Province"; type="string"]
- zip [title="Postal Code"; type="string"]
- city [title="District"; type="string"]
- address [title="Address"; type="string"]
- name [title="Name"; type="string"]
- email [title="Email"; type="string"]
- phone [title="Phone"; type="string"]
- fax [title="Fax"; type="string"]
- country [title="Country"; type="string"]
- taxId [title="Tax ID"; type="string"]
- branch [title="Branch"; type="string"]
- type [title="Type"; type="string"]
- default [title="Default"; type="boolean"]
- createdAt [title="Created At"; type="datetime"]
- lastUsedAt [title="Last Used At"; type="datetime"]
- pdfUrl [title="PDF URL"; type="url"; description="Stored PDF link for this quotation."]

---
Schema: review
Title: Product Reviews
Kind: document
File: sanity/schemaTypes/reviewType.ts
Fields:
- approvedBy [title="Approved By"; type="string"; description="Admin who approved the review"]

---
Schema: salesContact
Title: Sales Contact
Kind: document
File: sanity/schemaTypes/salesContactType.ts
Fields:
- phone [title="Phone"; type="string"]
- ext [title="Extension"; type="string"]
- fax [title="Fax"; type="string"]
- mobile [title="Mobile"; type="string"]
- web [title="Website"; type="url"]
- warrantyCondition [title="Warranty Condition"; type="text"]
- validityCondition [title="Validity Condition"; type="text"]

---
Schema: sentNotification
Title: Sent Notification
Kind: document
File: sanity/schemaTypes/sentNotificationType.ts
Fields:
- readAt [title="Read At"; type="datetime"]
- read [title="Read"; type="boolean"]
- delivered [title="Delivered"; type="boolean"]

---
Schema: subscription
Title: Newsletter Subscriptions
Kind: document
File: sanity/schemaTypes/subscriptionType.ts
Fields:
- userAgent [title="User Agent"; type="string"; description="Browser/device information"]

---
Schema: userAccessRequest
Title: User Access Request
Kind: document
File: sanity/schemaTypes/userAccessRequestType.ts
Fields:
- notes [title="Admin Notes"; type="text"; description="Internal notes for admin review"]

---
Schema: user
Title: User
Kind: document
File: sanity/schemaTypes/userType.ts
Fields:
- (unnamed) [type="reference"; description="User"]
- preferredLanguage [title="Preferred Language"; type="string"]
- (unnamed) [type="reference"; description="User"]
- color [title="Color"; type="string"; description="Selected color if applicable"]
- size [title="Size"; type="string"; description="Selected size if applicable"]
- (unnamed) [type="reference"; description="User"]
- status [title="Status"; type="string"; description="description"]
- createdAt [title="Created At"; type="datetime"; description="History of all wallet transactions"]
- swiftCode [title="SWIFT Code"; type="string"]
- transactionId [title="Transaction ID"; type="string"; description="External transaction ID from payment processor"]
- notes [title="Admin Notes"; type="text"; description="Internal notes for admins"]
- lastActiveAt [title="Last Active At"; type="datetime"]
- actionUrl [title="Action URL"; type="url"; description="Optional URL for notification action"]
- sentBy [title="Sent By"; type="string"; description="Admin email who sent this notification"]
- readAt [title="Read At"; type="datetime"]

---
Schema: category
Title: Category
Kind: document
File: sanity/schemaTypes/categoryType.tsx
Fieldsets: advanced, metadata
Fields:
- (unnamed) [type="string"]
- canonicalUrl [title="Canonical URL"; type="url"; description="For duplicate or multi-regional categories."]
- color [title="Brand Color (hex)"; type="string"]
- image [title="Category Image"; type="image"]

---
Schema: template
Title: Promotion
Kind: document
File: sanity/schemaTypes/promotionType.tsx
Groups: advanced, basics, creative, discount, limits, schedule, targeting, template
Fieldsets: audienceConfig, bundleConfig, caps, coreIdentity, discountConfig, messaging, productScope, seo, templateSelection, timing, tracking, urgency, variants, visualDesign
Fields:
- isFree [title="This is a FREE item"; type="boolean"; description="Check if this item is given free in the bundle"]
- quantity [title="Quantity"; type="number"]
- excludedProducts [title="Exclude Products"; type="array"; description="These products will never receive this discount"]
- stockAlertThreshold [title="Stock Alert Threshold"; type="number"; description="Show alert when stock drops below this number"]
- internalNotes [title="Internal Notes"; type="text"; group="advanced"; description="Notes for your team (not shown to customers)"]
