import { StructureBuilder } from "sanity/desk";
import {
  TrolleyIcon,
  TagIcon,
  UsersIcon,
  DocumentTextIcon,
  CogIcon,
  BellIcon,
  CalendarIcon,
  StarIcon,
  EnvelopeIcon,
  HomeIcon,
  DownloadIcon,
  BasketIcon,
} from "@sanity/icons";

// Custom icons using emojis for visual distinction
const icons = {
  store: () => "🏪",
  content: () => "📝",
  marketing: () => "📢",
  users: () => "👥",
  settings: () => "⚙️",
  analytics: () => "📊",
  orders: () => "📦",
  products: () => "🛍️",
  events: () => "📅",
  reviews: () => "⭐",
};

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title("Admin Dashboard")
    .items([
      // ============================================
      // DASHBOARD - Quick Overview (Custom Tool)
      // ============================================
      S.listItem()
        .title("📊 Dashboard")
        .id("dashboard")
        .child(
          S.component()
            .id("dashboard")
            .title("Dashboard Overview")
            .component(() => import("./components/Dashboard").then((m) => m.default))
        ),

      S.divider(),

      // ============================================
      // STORE MANAGEMENT
      // ============================================
      S.listItem()
        .title("🏪 Store")
        .id("store")
        .child(
          S.list()
            .title("Store Management")
            .items([
              // Products
              S.listItem()
                .title("🛍️ Products")
                .schemaType("product")
                .child(
                  S.documentTypeList("product")
                    .title("All Products")
                    .defaultOrdering([{ field: "name", direction: "asc" }])
                ),

              // Categories with hierarchy view
              S.listItem()
                .title("📂 Categories")
                .child(
                  S.list()
                    .title("Categories")
                    .items([
                      S.listItem()
                        .title("All Categories")
                        .schemaType("category")
                        .child(S.documentTypeList("category").title("All Categories")),
                      S.listItem()
                        .title("Parent Categories Only")
                        .child(
                          S.documentList()
                            .title("Parent Categories")
                            .filter('_type == "category" && isParentCategory == true')
                        ),
                      S.listItem()
                        .title("Subcategories Only")
                        .child(
                          S.documentList()
                            .title("Subcategories")
                            .filter('_type == "category" && isParentCategory != true')
                        ),
                    ])
                ),

              // Brands
              S.listItem()
                .title("🏷️ Brands")
                .schemaType("brand")
                .child(S.documentTypeList("brand").title("All Brands")),

              // Product Types
              S.listItem()
                .title("📋 Product Types")
                .schemaType("productTypeOption")
                .child(S.documentTypeList("productTypeOption").title("Product Types")),

              S.divider(),

              // Inventory Alerts
              S.listItem()
                .title("⚠️ Low Stock Products")
                .child(
                  S.documentList()
                    .title("Low Stock (< 10 units)")
                    .filter('_type == "product" && stock < 10 && stock >= 0')
                    .defaultOrdering([{ field: "stock", direction: "asc" }])
                ),

              S.listItem()
                .title("🚫 Out of Stock")
                .child(
                  S.documentList()
                    .title("Out of Stock Products")
                    .filter('_type == "product" && stock <= 0')
                ),
            ])
        ),

      // ============================================
      // ORDERS & FULFILLMENT
      // ============================================
      S.listItem()
        .title("📦 Orders")
        .id("orders")
        .child(
          S.list()
            .title("Order Management")
            .items([
              // Order Status Views
              S.listItem()
                .title("📋 All Orders")
                .schemaType("order")
                .child(
                  S.documentTypeList("order")
                    .title("All Orders")
                    .defaultOrdering([{ field: "orderDate", direction: "desc" }])
                ),

              S.listItem()
                .title("📝 Quotations")
                .child(
                  S.documentList()
                    .title("Quotations")
                    .filter('_type == "order" && status == "quotation_requested"')
                    .defaultOrdering([{ field: "orderDate", direction: "desc" }])
                ),

              S.listItem()
                .title("Customer Quotations")
                .schemaType("quotation")
                .child(
                  S.documentTypeList("quotation")
                    .title("Customer Quotations")
                    .defaultOrdering([
                      { field: "createdAt", direction: "desc" },
                    ])
                ),

              S.divider(),

              S.listItem()
                .title("🔴 Pending Orders")
                .child(
                  S.documentList()
                    .title("Pending Orders")
                    .filter('_type == "order" && status == "pending"')
                    .defaultOrdering([{ field: "orderDate", direction: "desc" }])
                ),

              S.listItem()
                .title("🟡 Address Confirmed")
                .child(
                  S.documentList()
                    .title("Address Confirmed")
                    .filter('_type == "order" && status == "address_confirmed"')
                ),

              S.listItem()
                .title("🛑 Cancellation Requests")
                .child(
                  S.documentList()
                    .title("Cancellation Requests")
                    .filter(
                      '_type == "order" && cancellationRequested == true && status != "cancelled"'
                    )
                    .defaultOrdering([
                      { field: "cancellationRequestedAt", direction: "desc" },
                    ])
                ),

              S.listItem()
                .title("🟢 Order Confirmed")
                .child(
                  S.documentList()
                    .title("Order Confirmed")
                    .filter('_type == "order" && status == "order_confirmed"')
                ),

              S.listItem()
                .title("📦 Ready to Pack")
                .child(
                  S.documentList()
                    .title("Ready to Pack")
                    .filter('_type == "order" && status == "order_confirmed"')
                ),

              S.listItem()
                .title("🏭 Packed")
                .child(
                  S.documentList()
                    .title("Packed Orders")
                    .filter('_type == "order" && status == "packed"')
                ),

              S.listItem()
                .title("🚚 Out for Delivery")
                .child(
                  S.documentList()
                    .title("Out for Delivery")
                    .filter('_type == "order" && status == "out_for_delivery"')
                ),

              S.listItem()
                .title("✅ Delivered")
                .child(
                  S.documentList()
                    .title("Delivered Orders")
                    .filter('_type == "order" && status == "delivered"')
                ),

              S.listItem()
                .title("❌ Cancelled")
                .child(
                  S.documentList()
                    .title("Cancelled Orders")
                    .filter('_type == "order" && status == "cancelled"')
                ),

              S.divider(),

              // Payment Status
              S.listItem()
                .title("💳 Payment Status")
                .child(
                  S.list()
                    .title("By Payment Status")
                    .items([
                      S.listItem()
                        .title("⏳ Payment Pending")
                        .child(
                          S.documentList()
                            .title("Payment Pending")
                            .filter('_type == "order" && paymentStatus == "pending"')
                        ),
                      S.listItem()
                        .title("✅ Paid")
                        .child(
                          S.documentList()
                            .title("Paid Orders")
                            .filter('_type == "order" && paymentStatus == "paid"')
                        ),
                      S.listItem()
                        .title("❌ Failed Payments")
                        .child(
                          S.documentList()
                            .title("Failed Payments")
                            .filter('_type == "order" && paymentStatus == "failed"')
                        ),
                    ])
                ),

              S.divider(),

              // Cash Collection
              S.listItem()
                .title("💰 Cash Collection")
                .child(
                  S.list()
                    .title("Cash on Delivery Management")
                    .items([
                      S.listItem()
                        .title("Pending Cash Submission")
                        .child(
                          S.documentList()
                            .title("Pending Cash Submission")
                            .filter(
                              '_type == "order" && paymentMethod == "cash_on_delivery" && cashCollected == true && cashSubmittedToAccounts != true'
                            )
                        ),
                      S.listItem()
                        .title("Submitted - Awaiting Confirmation")
                        .child(
                          S.documentList()
                            .title("Awaiting Accounts Confirmation")
                            .filter(
                              '_type == "order" && cashSubmissionStatus == "pending"'
                            )
                        ),
                    ])
                ),
            ])
        ),

      S.divider(),

      // ============================================
      // QUOTATIONS
      // ============================================
      S.listItem()
        .title("📝 Quotations")
        .id("quotations")
        .schemaType("quotation")
        .child(
          S.documentList()
            .title("Quotations")
            .filter('_type == "quotation"')
            .defaultOrdering([{ field: "createdAt", direction: "desc" }])
        ),

      S.divider(),

      // ============================================
      // INSIGHT CONTENT HUB
      // ============================================
      S.listItem()
        .title("💡 Insight")
        .id("insight")
        .child(
          S.list()
            .title("Insight Content Hub")
            .items([
              // Knowledge Section
              S.listItem()
                .title("📚 Knowledge")
                .child(
                  S.list()
                    .title("Knowledge Content")
                    .items([
                      S.listItem()
                        .title("All Knowledge Articles")
                        .child(
                          S.documentList()
                            .title("All Knowledge")
                            .filter(
                              '_type == "insight" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]'
                            )
                            .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
                        ),
                      S.divider(),
                      S.listItem()
                        .title("Product Knowledge")
                        .child(
                          S.documentList()
                            .title("Product Knowledge")
                            .filter('_type == "insight" && insightType == "productKnowledge"')
                        ),
                      S.listItem()
                        .title("General Knowledge")
                        .child(
                          S.documentList()
                            .title("General Knowledge")
                            .filter('_type == "insight" && insightType == "generalKnowledge"')
                        ),
                      S.listItem()
                        .title("Problem Knowledge")
                        .child(
                          S.documentList()
                            .title("Problem Knowledge")
                            .filter('_type == "insight" && insightType == "problemKnowledge"')
                        ),
                      S.listItem()
                        .title("Comparison Articles")
                        .child(
                          S.documentList()
                            .title("Comparisons")
                            .filter('_type == "insight" && insightType == "comparison"')
                        ),
                    ])
                ),

              // Solution Section
              S.listItem()
                .title("🎯 Solutions")
                .child(
                  S.list()
                    .title("Solution Content")
                    .items([
                      S.listItem()
                        .title("All Solutions")
                        .child(
                          S.documentList()
                            .title("All Solutions")
                            .filter(
                              '_type == "insight" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"]'
                            )
                            .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
                        ),
                      S.divider(),
                      S.listItem()
                        .title("✅ Case Studies (Proven)")
                        .child(
                          S.documentList()
                            .title("Case Studies")
                            .filter('_type == "insight" && insightType == "caseStudy"')
                        ),
                      S.listItem()
                        .title("🧪 Validated Solutions (Tested)")
                        .child(
                          S.documentList()
                            .title("Validated Solutions")
                            .filter('_type == "insight" && insightType == "validatedSolution"')
                        ),
                      S.listItem()
                        .title("💡 Theoretical Solutions (Emerging)")
                        .child(
                          S.documentList()
                            .title("Theoretical Solutions")
                            .filter('_type == "insight" && insightType == "theoreticalSolution"')
                        ),
                    ])
                ),

              S.divider(),

              // Content Organization
              S.listItem()
                .title("📂 Categories")
                .schemaType("insightCategory")
                .child(
                  S.list()
                    .title("Insight Categories")
                    .items([
                      S.listItem()
                        .title("All Categories")
                        .child(S.documentTypeList("insightCategory").title("All Categories")),
                      S.listItem()
                        .title("Knowledge Categories")
                        .child(
                          S.documentList()
                            .title("Knowledge Categories")
                            .filter('_type == "insightCategory" && categoryType == "knowledge"')
                        ),
                      S.listItem()
                        .title("Solution Categories")
                        .child(
                          S.documentList()
                            .title("Solution Categories")
                            .filter('_type == "insightCategory" && categoryType == "solution"')
                        ),
                    ])
                ),

              S.listItem()
                .title("✍️ Authors")
                .schemaType("insightAuthor")
                .child(S.documentTypeList("insightAuthor").title("Insight Authors")),

              S.listItem()
                .title("👤 People")
                .schemaType("person")
                .child(S.documentTypeList("person").title("People Profiles")),

              S.listItem()
                .title("📑 Series")
                .schemaType("insightSeries")
                .child(S.documentTypeList("insightSeries").title("Content Series")),

              S.divider(),

              // Status Views
              S.listItem()
                .title("📝 Drafts")
                .child(
                  S.documentList()
                    .title("Draft Insights")
                    .filter('_type == "insight" && status == "draft"')
                ),

              S.listItem()
                .title("✅ Published")
                .child(
                  S.documentList()
                    .title("Published Insights")
                    .filter('_type == "insight" && status == "published"')
                ),

              S.listItem()
                .title("📅 Needs Review")
                .child(
                  S.documentList()
                    .title("Content Needing Review")
                    .filter('_type == "insight" && nextReviewDate < now()')
                    .defaultOrdering([{ field: "nextReviewDate", direction: "asc" }])
                ),
            ])
        ),

      // ============================================
      // USERS & CUSTOMERS
      // ============================================
      S.listItem()
        .title("👥 Users")
        .id("users")
        .child(
          S.list()
            .title("User Management")
            .items([
              S.listItem()
                .title("👤 All Users")
                .schemaType("user")
                .child(S.documentTypeList("user").title("All Users")),

              S.divider(),

              // User Segments
              S.listItem()
                .title("💎 Premium Users")
                .child(
                  S.documentList()
                    .title("Premium Users")
                    .filter('_type == "user" && isActive == true')
                ),

              S.listItem()
                .title("🏢 Dealer Accounts")
                .child(
                  S.documentList()
                    .title("Dealer Accounts")
                    .filter('_type == "user" && isBusiness == true')
                ),

              S.listItem()
                .title("👔 Employees")
                .child(
                  S.documentList()
                    .title("Employees")
                    .filter('_type == "user" && isEmployee == true')
                ),

              S.listItem()
                .title("👑 Admins")
                .child(
                  S.documentList()
                    .title("Admin Users")
                    .filter('_type == "user" && isAdmin == true')
                ),

              S.divider(),

              // Pending Approvals
              S.listItem()
                .title("⏳ Pending Access Requests")
                .child(
                  S.documentList()
                    .title("Pending Access Requests")
                    .filter('_type == "userAccessRequest" && status == "pending"')
                ),

              S.listItem()
                .title("⏳ Pending Premium Requests")
                .child(
                  S.documentList()
                    .title("Pending Premium Requests")
                    .filter('_type == "user" && premiumStatus == "pending"')
                ),

              S.listItem()
                .title("⏳ Pending Dealer Requests")
                .child(
                  S.documentList()
                    .title("Pending Dealer Requests")
                    .filter('_type == "user" && businessStatus == "pending"')
                ),

              S.divider(),

              // Addresses
              S.listItem()
                .title("🏠 Addresses")
                .schemaType("address")
                .child(S.documentTypeList("address").title("All Addresses")),

              // Access Requests Archive
              S.listItem()
                .title("📋 All Access Requests")
                .schemaType("userAccessRequest")
                .child(S.documentTypeList("userAccessRequest")),
            ])
        ),

      // ============================================
      // CONTENT MANAGEMENT
      // ============================================
      S.listItem()
        .title("📝 Content")
        .id("content")
        .child(
          S.list()
            .title("Content Management")
            .items([
              // Blog/Posts
              S.listItem()
                .title("📰 Blog Posts")
                .schemaType("blog")
                .child(
                  S.documentTypeList("blog")
                    .title("All Blog Posts")
                    .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
                ),

              S.listItem()
                .title("📢 News")
                .schemaType("news")
                .child(
                  S.documentTypeList("news")
                    .title("All News")
                    .defaultOrdering([{ field: "publishDate", direction: "desc" }])
                ),

              S.divider(),

              // Content Organization
              S.listItem()
                .title("🏷️ Blog Categories")
                .schemaType("blogcategory")
                .child(S.documentTypeList("blogcategory")),

              S.listItem()
                .title("✍️ Authors")
                .schemaType("author")
                .child(S.documentTypeList("author")),

              S.divider(),

              // Downloads & Catalogs
              S.listItem()
                .title("📥 Downloads")
                .schemaType("download")
                .child(S.documentTypeList("download")),

              S.listItem()
                .title("📚 Catalogs")
                .schemaType("catalog")
                .child(S.documentTypeList("catalog")),
            ])
        ),

      // ============================================
      // EVENTS
      // ============================================
      S.listItem()
        .title("📅 Events")
        .id("events")
        .child(
          S.list()
            .title("Event Management")
            .items([
              S.listItem()
                .title("📅 All Events")
                .schemaType("event")
                .child(
                  S.documentTypeList("event")
                    .title("All Events")
                    .defaultOrdering([{ field: "date", direction: "desc" }])
                ),

              S.listItem()
                .title("🔜 Upcoming Events")
                .child(
                  S.documentList()
                    .title("Upcoming Events")
                    .filter('_type == "event" && status == "upcoming"')
                    .defaultOrdering([{ field: "date", direction: "asc" }])
                ),

              S.listItem()
                .title("🔴 Ongoing Events")
                .child(
                  S.documentList()
                    .title("Ongoing Events")
                    .filter('_type == "event" && status == "ongoing"')
                ),

              S.listItem()
                .title("✅ Past Events")
                .child(
                  S.documentList()
                    .title("Past Events")
                    .filter('_type == "event" && status == "ended"')
                ),

              S.divider(),

              S.listItem()
                .title("📝 Event RSVPs")
                .schemaType("eventRsvp")
                .child(
                  S.documentTypeList("eventRsvp")
                    .title("All RSVPs")
                    .defaultOrdering([{ field: "submittedAt", direction: "desc" }])
                ),

              S.listItem()
                .title("🆕 New RSVPs")
                .child(
                  S.documentList()
                    .title("New RSVPs")
                    .filter('_type == "eventRsvp" && status == "new"')
                    .defaultOrdering([{ field: "submittedAt", direction: "desc" }])
                ),

              S.divider(),

              S.listItem()
                .title("👥 Team Registrations")
                .child(
                  S.documentList()
                    .title("Team Registrations")
                    .filter('_type == "eventRsvp" && registrationType == "team_lead"')
                    .defaultOrdering([{ field: "submittedAt", direction: "desc" }])
                ),

              S.listItem()
                .title("⏳ Pending Confirmations")
                .child(
                  S.documentList()
                    .title("Pending Confirmations")
                    .filter('_type == "eventRsvp" && (status == "new" || status == "waitlisted")')
                    .defaultOrdering([{ field: "submittedAt", direction: "desc" }])
                ),

              S.listItem()
                .title("❌ Cancellations")
                .child(
                  S.documentList()
                    .title("Cancellations")
                    .filter('_type == "eventRsvp" && status == "cancelled"')
                    .defaultOrdering([{ field: "submittedAt", direction: "desc" }])
                ),

              S.divider(),

              S.listItem()
                .title("📊 Registration Stats")
                .child(
                  S.component()
                    .id("registration-stats")
                    .title("Registration Stats")
                    .component(() =>
                      import("./components/EventStatsDashboard").then((module) => module.default)
                    )
                ),
            ])
        ),

      // ============================================
      // MARKETING & PROMOTIONS
      // ============================================
      S.listItem()
        .title("📢 Marketing")
        .id("marketing")
        .child(
          S.list()
            .title("Marketing & Promotions")
            .items([
              // Promotions
              S.listItem()
                .title("🎯 Promotions")
                .schemaType("promotion")
                .child(S.documentTypeList("promotion").title("All Promotions")),

              S.listItem()
                .title("✅ Active Promotions")
                .child(
                  S.documentList()
                    .title("Active Promotions")
                    .filter('_type == "promotion" && status == "active"')
                ),

              S.listItem()
                .title("📅 Scheduled Promotions")
                .child(
                  S.documentList()
                    .title("Scheduled Promotions")
                    .filter('_type == "promotion" && status == "scheduled"')
                ),

              S.divider(),

              // Deals
              S.listItem()
                .title("🏷️ Deals")
                .schemaType("deal")
                .child(S.documentTypeList("deal").title("All Deals")),

              S.listItem()
                .title("✅ Active Deals")
                .child(
                  S.documentList()
                    .title("Active Deals")
                    .filter('_type == "deal" && status == "active"')
                ),

              S.divider(),

              // Banners
              S.listItem()
                .title("🖼️ Banners")
                .schemaType("banner")
                .child(S.documentTypeList("banner").title("All Banners")),

              S.divider(),

              // Subscriptions
              S.listItem()
                .title("📧 Newsletter Subscriptions")
                .schemaType("subscription")
                .child(
                  S.documentTypeList("subscription")
                    .title("Newsletter Subscriptions")
                    .defaultOrdering([{ field: "subscribedAt", direction: "desc" }])
                ),

              S.listItem()
                .title("✅ Active Subscribers")
                .child(
                  S.documentList()
                    .title("Active Subscribers")
                    .filter('_type == "subscription" && status == "active"')
                ),
            ])
        ),

      // ============================================
      // REVIEWS & FEEDBACK
      // ============================================
      S.listItem()
        .title("⭐ Reviews & Feedback")
        .id("reviews")
        .child(
          S.list()
            .title("Reviews & Customer Feedback")
            .items([
              // Reviews
              S.listItem()
                .title("⭐ All Reviews")
                .schemaType("review")
                .child(
                  S.documentTypeList("review")
                    .title("All Reviews")
                    .defaultOrdering([{ field: "createdAt", direction: "desc" }])
                ),

              S.listItem()
                .title("⏳ Pending Reviews")
                .child(
                  S.documentList()
                    .title("Pending Approval")
                    .filter('_type == "review" && status == "pending"')
                    .defaultOrdering([{ field: "createdAt", direction: "desc" }])
                ),

              S.listItem()
                .title("✅ Approved Reviews")
                .child(
                  S.documentList()
                    .title("Approved Reviews")
                    .filter('_type == "review" && status == "approved"')
                ),

              S.listItem()
                .title("❌ Rejected Reviews")
                .child(
                  S.documentList()
                    .title("Rejected Reviews")
                    .filter('_type == "review" && status == "rejected"')
                ),

              S.divider(),

              // Contact Messages
              S.listItem()
                .title("💬 Contact Messages")
                .schemaType("contact")
                .child(
                  S.documentTypeList("contact")
                    .title("All Messages")
                    .defaultOrdering([{ field: "submittedAt", direction: "desc" }])
                ),

              S.listItem()
                .title("🆕 New Messages")
                .child(
                  S.documentList()
                    .title("New Messages")
                    .filter('_type == "contact" && status == "new"')
                ),

              S.listItem()
                .title("🔴 Urgent Messages")
                .child(
                  S.documentList()
                    .title("Urgent Messages")
                    .filter('_type == "contact" && priority == "urgent"')
                ),
            ])
        ),

      // ============================================
      // NOTIFICATIONS
      // ============================================
      S.listItem()
        .title("🔔 Notifications")
        .id("notifications")
        .child(
          S.list()
            .title("Notification Management")
            .items([
              S.listItem()
                .title("📤 Sent Notifications")
                .schemaType("sentNotification")
                .child(
                  S.documentTypeList("sentNotification")
                    .title("All Sent Notifications")
                    .defaultOrdering([{ field: "sentAt", direction: "desc" }])
                ),

              S.listItem()
                .title("📢 Marketing Notifications")
                .child(
                  S.documentList()
                    .title("Marketing")
                    .filter('_type == "sentNotification" && type == "marketing"')
                ),

              S.listItem()
                .title("📦 Order Notifications")
                .child(
                  S.documentList()
                    .title("Order Updates")
                    .filter('_type == "sentNotification" && type == "order"')
                ),
            ])
        ),

      S.divider(),

      // ============================================
      // SETTINGS
      // ============================================
      S.listItem()
        .title("⚙️ Settings")
        .id("settings")
        .child(
          S.list()
            .title("System Settings")
            .items([
              S.listItem()
                .title("🏠 Storefront Settings")
                .child(
                  S.document()
                    .schemaType("storefrontSettings")
                    .documentId("storefrontSettings")
                    .title("Storefront Settings")
                ),
              // Pricing Settings (Singleton)
              S.listItem()
                .title("💰 Pricing Settings")
                .child(
                  S.document()
                    .schemaType("pricingSettings")
                    .documentId("pricingSettings")
                    .title("Pricing Settings")
                ),
              S.listItem()
                .title("📬 Contact Settings")
                .child(
                  S.document()
                    .schemaType("contactSettings")
                    .documentId("contactSettings")
                    .title("Contact Settings")
                ),
              S.listItem()
                .title("🧾 Footer Settings")
                .child(
                  S.document()
                    .schemaType("footerSettings")
                    .documentId("footerSettings")
                    .title("Footer Settings")
                ),
              S.listItem()
                .title("Quotation Settings")
                .child(
                  S.document()
                    .schemaType("purchaseOrderSettings")
                    .documentId("purchaseOrderSettings")
                    .title("Quotation Settings")
                ),
              S.listItem()
                .title("Sales Contacts")
                .child(
                  S.documentTypeList("salesContact")
                    .title("Sales Contacts")
                    .defaultOrdering([{ field: "name", direction: "asc" }])
                ),
              S.listItem()
                .title("🌐 Locales")
                .schemaType("locale")
                .child(
                  S.documentTypeList("locale")
                    .title("Locales")
                    .defaultOrdering([{ field: "title", direction: "asc" }])
                ),
            ])
        ),
    ]);

export default deskStructure;
