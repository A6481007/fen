import { defineArrayMember, defineField, defineType } from "sanity";

const PROMOTION_TYPE_NAME = "promotion";

// ============================================================
// PROMOTION TEMPLATES - Pre-configured for common use cases
// ============================================================
const PROMOTION_TEMPLATES = {
  flashSale: {
    label: "⚡ Flash Sale",
    description: "Limited-time steep discounts. Creates urgency with countdown.",
    defaults: {
      discountType: "percentage",
      discountValue: 25,
      showCountdown: true,
      urgencyMessage: "Ends soon! Don't miss out!",
      badgeLabel: "FLASH SALE",
      badgeColor: "#EF4444",
      ctaText: "Shop Flash Sale",
    },
    requiredFields: ["name", "startDate", "endDate", "discountValue"],
    suggestedDuration: "24-72 hours",
  },
  seasonal: {
    label: "🌸 Seasonal Campaign",
    description: "Holiday or seasonal promotions with themed messaging.",
    defaults: {
      discountType: "percentage",
      discountValue: 20,
      showCountdown: false,
      badgeLabel: "SEASONAL",
      badgeColor: "#10B981",
      ctaText: "Shop the Collection",
    },
    requiredFields: ["name", "startDate", "endDate", "heroMessage"],
    suggestedDuration: "1-4 weeks",
  },
  bundle: {
    label: "📦 Bundle Deal",
    description: "Buy X Get Y free or discounted bundles.",
    defaults: {
      discountType: "bxgy",
      buyQuantity: 2,
      getQuantity: 1,
      badgeLabel: "BUNDLE & SAVE",
      badgeColor: "#8B5CF6",
      ctaText: "Build Your Bundle",
    },
    requiredFields: ["name", "buyQuantity", "getQuantity", "defaultBundleItems"],
    suggestedDuration: "Ongoing or campaign-based",
  },
  loyalty: {
    label: "💎 Loyalty Reward",
    description: "Exclusive offers for returning or VIP customers.",
    defaults: {
      discountType: "percentage",
      discountValue: 15,
      segmentType: "vip",
      badgeLabel: "VIP EXCLUSIVE",
      badgeColor: "#F59E0B",
      ctaText: "Claim Your Reward",
    },
    requiredFields: ["name", "discountValue", "segmentType"],
    suggestedDuration: "Ongoing",
  },
  clearance: {
    label: "🏷️ Clearance",
    description: "Deep discounts on end-of-season or discontinued items.",
    defaults: {
      discountType: "percentage",
      discountValue: 40,
      badgeLabel: "CLEARANCE",
      badgeColor: "#DC2626",
      ctaText: "Shop Clearance",
      urgencyMessage: "While supplies last!",
    },
    requiredFields: ["name", "products", "discountValue"],
    suggestedDuration: "Until sold out",
  },
  winBack: {
    label: "🔄 Win-Back",
    description: "Re-engage inactive customers with special offers.",
    defaults: {
      discountType: "percentage",
      discountValue: 20,
      segmentType: "inactive",
      inactivityDays: 30,
      badgeLabel: "WE MISS YOU!",
      badgeColor: "#EC4899",
      ctaText: "Come Back & Save",
      heroMessage: "We noticed you've been away. Here's a special offer just for you!",
    },
    requiredFields: ["name", "discountValue", "inactivityDays"],
    suggestedDuration: "Ongoing trigger-based",
  },
  firstPurchase: {
    label: "🆕 First Purchase",
    description: "Welcome discount for new customers.",
    defaults: {
      discountType: "percentage",
      discountValue: 15,
      segmentType: "firstTime",
      perCustomerLimit: 1,
      badgeLabel: "NEW CUSTOMER",
      badgeColor: "#06B6D4",
      ctaText: "Get Your Discount",
      heroMessage: "Welcome! Enjoy 15% off your first order.",
    },
    requiredFields: ["name", "discountValue"],
    suggestedDuration: "Ongoing",
  },
  freeShipping: {
    label: "🚚 Free Shipping",
    description: "Waive shipping fees above a minimum order value.",
    defaults: {
      discountType: "freeShipping",
      minimumOrderValue: 50,
      badgeLabel: "FREE SHIPPING",
      badgeColor: "#22C55E",
      ctaText: "Shop Now",
      heroMessage: "Free shipping on orders over $50!",
    },
    requiredFields: ["name", "minimumOrderValue"],
    suggestedDuration: "Ongoing or campaign-based",
  },
} as const;

const PROMOTION_TYPE_OPTIONS = Object.entries(PROMOTION_TEMPLATES).map(([value, template]) => ({
  title: template.label,
  value,
}));

const DISCOUNT_TYPE_OPTIONS = [
  { title: "Percentage Off", value: "percentage" },
  { title: "Fixed Amount Off", value: "fixed" },
  { title: "Buy X Get Y", value: "bxgy" },
  { title: "Free Shipping", value: "freeShipping" },
  { title: "Bonus Points", value: "points" },
];

const SEGMENT_TYPE_OPTIONS = [
  { title: "All Customers", value: "allCustomers" },
  { title: "First-Time Buyers", value: "firstTime" },
  { title: "Returning Customers", value: "returning" },
  { title: "VIP Members", value: "vip" },
  { title: "Cart Abandoners", value: "cartAbandoner" },
  { title: "Inactive Users", value: "inactive" },
];

const STATUS_OPTIONS = [
  { title: "📝 Draft", value: "draft" },
  { title: "📅 Scheduled", value: "scheduled" },
  { title: "✅ Active", value: "active" },
  { title: "⏸️ Paused", value: "paused" },
  { title: "🏁 Ended", value: "ended" },
];

// Helper functions
const getDoc = (context: { document?: unknown }) => context.document as Record<string, any> ?? {};
const getType = (doc: Record<string, any>) => doc?.type;
const getDiscountType = (doc: Record<string, any>) => doc?.discountType;
const isBxgy = (doc: Record<string, any>) => getDiscountType(doc) === "bxgy" || getType(doc) === "bundle";

export const promotionType = defineType({
  name: PROMOTION_TYPE_NAME,
  title: "Promotion",
  type: "document",
  icon: () => "🎯",
  
  // Grouped tabs for guided workflow
  groups: [
    { name: "template", title: "1️⃣ Choose Template", default: true },
    { name: "basics", title: "2️⃣ Basic Info" },
    { name: "discount", title: "3️⃣ Discount Setup" },
    { name: "targeting", title: "4️⃣ Who Gets It" },
    { name: "creative", title: "5️⃣ Look & Feel" },
    { name: "schedule", title: "6️⃣ When to Run" },
    { name: "limits", title: "7️⃣ Budget & Limits" },
    { name: "advanced", title: "⚙️ Advanced" },
  ],
  
  fieldsets: [
    { name: "templateSelection", title: "Choose Your Promotion Type", options: { collapsible: false } },
    { name: "coreIdentity", title: "Core Details", options: { collapsible: true, collapsed: false } },
    { name: "discountConfig", title: "Discount Configuration", options: { collapsible: true, collapsed: false } },
    { name: "bundleConfig", title: "Bundle Setup (Buy X Get Y)", options: { collapsible: true, collapsed: false } },
    { name: "audienceConfig", title: "Target Audience", options: { collapsible: true, collapsed: false } },
    { name: "productScope", title: "Product Selection", options: { collapsible: true, collapsed: false } },
    { name: "visualDesign", title: "Visual Design", options: { collapsible: true, collapsed: false } },
    { name: "messaging", title: "Marketing Copy", options: { collapsible: true, collapsed: false } },
    { name: "seo", title: "SEO & Sharing", options: { collapsible: true, collapsed: true } },
    { name: "timing", title: "Schedule", options: { collapsible: true, collapsed: false } },
    { name: "urgency", title: "Urgency Triggers", options: { collapsible: true, collapsed: true } },
    { name: "caps", title: "Budget & Caps", options: { collapsible: true, collapsed: false } },
    { name: "tracking", title: "Tracking & Analytics", options: { collapsible: true, collapsed: true } },
    { name: "variants", title: "A/B Testing", options: { collapsible: true, collapsed: true } },
  ],
  
  fields: [
    // ============================================================
    // TAB 1: TEMPLATE SELECTION
    // ============================================================
    defineField({
      name: "type",
      title: "Promotion Template",
      type: "string",
      group: "template",
      fieldset: "templateSelection",
      description: "Choose a template to auto-configure your promotion. You can customize after selection.",
      options: {
        list: PROMOTION_TYPE_OPTIONS,
        layout: "radio",
      },
      validation: (Rule) => Rule.required().error("Please select a promotion template"),
    }),
    
    defineField({
      name: "templateInfo",
      title: "Template Guide",
      type: "text",
      group: "template",
      fieldset: "templateSelection",
      readOnly: true,
      description: "This field shows guidance based on your template selection.",
      components: {
        input: (props) => {
          const type = getType(getDoc(props as any));
          const template = PROMOTION_TEMPLATES[type as keyof typeof PROMOTION_TEMPLATES];
          if (!template) return null;
          
          return (
            <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px", marginTop: "8px" }}>
              <strong>{template.label}</strong>
              <p style={{ margin: "8px 0 0" }}>{template.description}</p>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#666" }}>
                <strong>Suggested duration:</strong> {template.suggestedDuration}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#666" }}>
                <strong>Required fields:</strong> {template.requiredFields.join(", ")}
              </p>
            </div>
          );
        },
      },
    }),
    
    // ============================================================
    // TAB 2: BASIC INFO
    // ============================================================
    defineField({
      name: "name",
      title: "Promotion Name",
      type: "string",
      group: "basics",
      fieldset: "coreIdentity",
      description: "Internal name for this promotion (also shown to customers)",
      placeholder: "e.g., Black Friday Flash Sale 2025",
      validation: (Rule) => Rule.required().min(3).max(100),
    }),
    
    defineField({
      name: "campaignId",
      title: "Campaign ID",
      type: "string",
      group: "basics",
      fieldset: "coreIdentity",
      description: "Unique identifier for tracking (auto-generated if empty)",
      placeholder: "e.g., bf-flash-2025-001",
      validation: (Rule) => Rule.custom((value, context) => {
        if (!value) return true; // Will be auto-generated
        if (!/^[a-z0-9-]+$/.test(value)) {
          return "Use only lowercase letters, numbers, and hyphens";
        }
        return true;
      }),
    }),
    
    defineField({
      name: "slug",
      title: "URL Slug",
      type: "slug",
      group: "basics",
      fieldset: "coreIdentity",
      description: "Used in the promotion page URL",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      group: "basics",
      fieldset: "coreIdentity",
      options: { list: STATUS_OPTIONS, layout: "dropdown" },
      initialValue: "draft",
    }),
    
    defineField({
      name: "priority",
      title: "Priority",
      type: "number",
      group: "basics",
      fieldset: "coreIdentity",
      description: "Higher priority promotions are shown first (0-100)",
      initialValue: 50,
      validation: (Rule) => Rule.min(0).max(100),
    }),
    
    // ============================================================
    // TAB 3: DISCOUNT SETUP
    // ============================================================
    defineField({
      name: "discountType",
      title: "Discount Type",
      type: "string",
      group: "discount",
      fieldset: "discountConfig",
      options: { list: DISCOUNT_TYPE_OPTIONS, layout: "radio" },
      description: "How should the discount be calculated?",
      validation: (Rule) => Rule.required(),
    }),
    
    defineField({
      name: "discountValue",
      title: "Discount Value",
      type: "number",
      group: "discount",
      fieldset: "discountConfig",
      description: "Enter percentage (e.g., 25 for 25% off) or fixed amount (e.g., 10 for $10 off)",
      hidden: ({ document }) => {
        const dt = getDiscountType(document as any);
        return dt === "freeShipping" || dt === "bxgy";
      },
      validation: (Rule) => Rule.custom((value, context) => {
        const doc = getDoc(context);
        const dt = getDiscountType(doc);
        if (dt === "freeShipping" || dt === "bxgy") return true;
        if (typeof value !== "number") return "Discount value is required";
        if (dt === "percentage" && (value < 1 || value > 100)) {
          return "Percentage must be between 1 and 100";
        }
        if (dt === "fixed" && value < 0.01) {
          return "Fixed discount must be at least $0.01";
        }
        return true;
      }),
    }),
    
    defineField({
      name: "minimumOrderValue",
      title: "Minimum Order Value",
      type: "number",
      group: "discount",
      fieldset: "discountConfig",
      description: "Customer must spend at least this amount to qualify (0 = no minimum)",
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    
    defineField({
      name: "maximumDiscount",
      title: "Maximum Discount Cap",
      type: "number",
      group: "discount",
      fieldset: "discountConfig",
      description: "Cap the discount amount (0 = no cap). Useful for percentage discounts on high-value carts.",
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    
    // Bundle/BXGY Fields
    defineField({
      name: "buyQuantity",
      title: "Buy Quantity (X)",
      type: "number",
      group: "discount",
      fieldset: "bundleConfig",
      description: "How many items must the customer buy?",
      hidden: ({ document }) => !isBxgy(document as any),
      validation: (Rule) => Rule.custom((value, context) => {
        if (!isBxgy(getDoc(context))) return true;
        if (typeof value !== "number" || value < 1) return "Buy quantity must be at least 1";
        return true;
      }),
    }),
    
    defineField({
      name: "getQuantity",
      title: "Get Quantity (Y)",
      type: "number",
      group: "discount",
      fieldset: "bundleConfig",
      description: "How many free/discounted items do they get?",
      hidden: ({ document }) => !isBxgy(document as any),
      validation: (Rule) => Rule.custom((value, context) => {
        if (!isBxgy(getDoc(context))) return true;
        if (typeof value !== "number" || value < 1) return "Get quantity must be at least 1";
        return true;
      }),
    }),
    
    defineField({
      name: "defaultBundleItems",
      title: "Bundle Products",
      type: "array",
      group: "discount",
      fieldset: "bundleConfig",
      description: "Select the products included in this bundle. These will be auto-added to cart.",
      hidden: ({ document }) => !isBxgy(document as any),
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "product",
              title: "Product",
              type: "reference",
              to: [{ type: "product" }],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "quantity",
              title: "Quantity",
              type: "number",
              initialValue: 1,
              validation: (Rule) => Rule.required().min(1),
            }),
            defineField({
              name: "isFree",
              title: "This is a FREE item",
              type: "boolean",
              initialValue: false,
              description: "Check if this item is given free in the bundle",
            }),
          ],
          preview: {
            select: {
              title: "product.name",
              quantity: "quantity",
              isFree: "isFree",
              media: "product.images.0",
            },
            prepare({ title, quantity, isFree, media }) {
              return {
                title: title || "Select product",
                subtitle: `Qty: ${quantity || 1}${isFree ? " (FREE)" : ""}`,
                media,
              };
            },
          },
        }),
      ],
      validation: (Rule) => Rule.custom((value, context) => {
        if (!isBxgy(getDoc(context))) return true;
        if (!Array.isArray(value) || value.length < 2) {
          return "Bundle must include at least 2 products";
        }
        return true;
      }),
    }),
    
    // ============================================================
    // TAB 4: TARGETING
    // ============================================================
    defineField({
      name: "targetAudience",
      title: "Target Audience",
      type: "object",
      group: "targeting",
      fields: [
        defineField({
          name: "segmentType",
          title: "Customer Segment",
          type: "string",
          options: { list: SEGMENT_TYPE_OPTIONS, layout: "dropdown" },
          initialValue: "allCustomers",
          description: "Which customers can use this promotion?",
        }),
        defineField({
          name: "inactivityDays",
          title: "Inactivity Threshold (Days)",
          type: "number",
          description: "For 'Inactive' segment: days since last purchase",
          hidden: ({ parent }) => parent?.segmentType !== "inactive",
          initialValue: 30,
        }),
        defineField({
          name: "minLTVThreshold",
          title: "Minimum Lifetime Value",
          type: "number",
          description: "For 'VIP' segment: minimum total spent",
          hidden: ({ parent }) => parent?.segmentType !== "vip",
          initialValue: 500,
        }),
        defineField({
          name: "categories",
          title: "Limit to Categories",
          type: "array",
          description: "Leave empty to apply to all categories",
          of: [{ type: "reference", to: [{ type: "category" }] }],
        }),
        defineField({
          name: "products",
          title: "Limit to Products",
          type: "array",
          description: "Leave empty to apply to all products in selected categories",
          of: [{ type: "reference", to: [{ type: "product" }] }],
        }),
        defineField({
          name: "excludedProducts",
          title: "Exclude Products",
          type: "array",
          description: "These products will never receive this discount",
          of: [{ type: "reference", to: [{ type: "product" }] }],
        }),
      ],
    }),
    
    // ============================================================
    // TAB 5: CREATIVE
    // ============================================================
    defineField({
      name: "badgeLabel",
      title: "Badge Text",
      type: "string",
      group: "creative",
      fieldset: "visualDesign",
      description: "Short text shown on product cards (e.g., 'SALE', '20% OFF')",
      placeholder: "e.g., FLASH SALE",
      validation: (Rule) => Rule.max(20),
    }),
    
    defineField({
      name: "badgeColor",
      title: "Badge Color",
      type: "string",
      group: "creative",
      fieldset: "visualDesign",
      description: "Hex color for the badge background",
      placeholder: "#EF4444",
      validation: (Rule) => Rule.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
    }),
    
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      group: "creative",
      fieldset: "visualDesign",
      description: "Main banner image for the promotion page (recommended: 1200x400)",
      options: { hotspot: true },
    }),
    
    defineField({
      name: "thumbnailImage",
      title: "Thumbnail Image",
      type: "image",
      group: "creative",
      fieldset: "visualDesign",
      description: "Small image for cards and lists (recommended: 400x400)",
      options: { hotspot: true },
    }),
    
    defineField({
      name: "heroMessage",
      title: "Hero Message",
      type: "text",
      group: "creative",
      fieldset: "messaging",
      description: "Main headline for the promotion page",
      placeholder: "Don't miss our biggest sale of the year!",
      rows: 2,
    }),
    
    defineField({
      name: "shortDescription",
      title: "Short Description",
      type: "string",
      group: "creative",
      fieldset: "messaging",
      description: "Brief description for cards and SEO (max 160 chars)",
      validation: (Rule) => Rule.max(160),
    }),
    
    defineField({
      name: "ctaText",
      title: "Button Text",
      type: "string",
      group: "creative",
      fieldset: "messaging",
      description: "Text for the main call-to-action button",
      placeholder: "Shop Now",
      initialValue: "Shop Now",
    }),
    
    defineField({
      name: "ctaLink",
      title: "Button Link",
      type: "string",
      group: "creative",
      fieldset: "messaging",
      description: "Where should the button link to? (Leave empty to link to promotion page)",
      placeholder: "/collections/sale",
    }),
    
    // ============================================================
    // TAB 6: SCHEDULE
    // ============================================================
    defineField({
      name: "startDate",
      title: "Start Date & Time",
      type: "datetime",
      group: "schedule",
      fieldset: "timing",
      description: "When should this promotion become active?",
      validation: (Rule) => Rule.required(),
    }),
    
    defineField({
      name: "endDate",
      title: "End Date & Time",
      type: "datetime",
      group: "schedule",
      fieldset: "timing",
      description: "When should this promotion end?",
      validation: (Rule) => Rule.required().custom((endDate, context) => {
        const startDate = getDoc(context).startDate;
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
          return "End date must be after start date";
        }
        return true;
      }),
    }),
    
    defineField({
      name: "timezone",
      title: "Timezone",
      type: "string",
      group: "schedule",
      fieldset: "timing",
      options: {
        list: [
          { title: "UTC", value: "UTC" },
          { title: "Pacific Time (LA)", value: "America/Los_Angeles" },
          { title: "Eastern Time (NY)", value: "America/New_York" },
          { title: "Bangkok", value: "Asia/Bangkok" },
          { title: "London", value: "Europe/London" },
        ],
      },
      initialValue: "UTC",
    }),
    
    defineField({
      name: "urgencyTrigger",
      title: "Urgency Settings",
      type: "object",
      group: "schedule",
      fieldset: "urgency",
      fields: [
        defineField({
          name: "showCountdown",
          title: "Show Countdown Timer",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "urgencyMessage",
          title: "Urgency Message",
          type: "string",
          placeholder: "Ends soon! Don't miss out!",
        }),
        defineField({
          name: "showStockAlert",
          title: "Show Low Stock Alert",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "stockAlertThreshold",
          title: "Stock Alert Threshold",
          type: "number",
          description: "Show alert when stock drops below this number",
          hidden: ({ parent }) => !parent?.showStockAlert,
          initialValue: 10,
        }),
      ],
    }),
    
    // ============================================================
    // TAB 7: BUDGET & LIMITS
    // ============================================================
    defineField({
      name: "budgetCap",
      title: "Total Budget Cap",
      type: "number",
      group: "limits",
      fieldset: "caps",
      description: "Maximum total discount amount to give away (0 = unlimited)",
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    
    defineField({
      name: "usageLimit",
      title: "Total Usage Limit",
      type: "number",
      group: "limits",
      fieldset: "caps",
      description: "Maximum number of times this promotion can be used (0 = unlimited)",
      initialValue: 0,
      validation: (Rule) => Rule.min(0).integer(),
    }),
    
    defineField({
      name: "perCustomerLimit",
      title: "Per Customer Limit",
      type: "number",
      group: "limits",
      fieldset: "caps",
      description: "Maximum times one customer can use this (0 = unlimited)",
      initialValue: 1,
      validation: (Rule) => Rule.min(0).integer(),
    }),
    
    // ============================================================
    // TAB 8: ADVANCED
    // ============================================================
    defineField({
      name: "seoMetadata",
      title: "SEO Metadata",
      type: "seoMetadata",
      group: "advanced",
      fieldset: "seo",
      description: "Controls page title, description, keywords, and social share image for this promotion.",
    }),
    defineField({
      name: "utmSource",
      title: "UTM Source",
      type: "string",
      group: "advanced",
      fieldset: "tracking",
    }),
    defineField({
      name: "utmMedium",
      title: "UTM Medium",
      type: "string",
      group: "advanced",
      fieldset: "tracking",
    }),
    defineField({
      name: "utmCampaign",
      title: "UTM Campaign",
      type: "string",
      group: "advanced",
      fieldset: "tracking",
    }),
    defineField({
      name: "trackingPixelId",
      title: "Tracking Pixel ID",
      type: "string",
      group: "advanced",
      fieldset: "tracking",
    }),
    
    defineField({
      name: "variantMode",
      title: "A/B Test Mode",
      type: "string",
      group: "advanced",
      fieldset: "variants",
      options: {
        list: [
          { title: "No Testing (Control)", value: "control" },
          { title: "Show Variant A", value: "variantA" },
          { title: "Show Variant B", value: "variantB" },
          { title: "Split Test (50/50)", value: "split" },
        ],
      },
      initialValue: "control",
    }),
    
    defineField({
      name: "splitPercent",
      title: "Variant A Percentage",
      type: "number",
      group: "advanced",
      fieldset: "variants",
      description: "Percentage of users who see Variant A (rest see Variant B)",
      hidden: ({ document }) => document?.variantMode !== "split",
      initialValue: 50,
      validation: (Rule) => Rule.min(0).max(100),
    }),
    
    defineField({
      name: "variantCopyA",
      title: "Variant A Copy",
      type: "string",
      group: "advanced",
      fieldset: "variants",
      hidden: ({ document }) => !["variantA", "split"].includes(document?.variantMode as string),
    }),
    
    defineField({
      name: "variantCopyB",
      title: "Variant B Copy",
      type: "string",
      group: "advanced",
      fieldset: "variants",
      hidden: ({ document }) => !["variantB", "split"].includes(document?.variantMode as string),
    }),
    
    defineField({
      name: "internalNotes",
      title: "Internal Notes",
      type: "text",
      group: "advanced",
      description: "Notes for your team (not shown to customers)",
      rows: 3,
    }),
  ],
  
  preview: {
    select: {
      title: "name",
      type: "type",
      status: "status",
      discountValue: "discountValue",
      discountType: "discountType",
      startDate: "startDate",
      endDate: "endDate",
      media: "heroImage",
    },
    prepare({ title, type, status, discountValue, discountType, startDate, endDate, media }) {
      const template = PROMOTION_TEMPLATES[type as keyof typeof PROMOTION_TEMPLATES];
      const statusEmoji = STATUS_OPTIONS.find(s => s.value === status)?.title.split(" ")[0] || "📝";
      
      let discountLabel = "";
      if (discountType === "percentage") discountLabel = `${discountValue}% OFF`;
      else if (discountType === "fixed") discountLabel = `$${discountValue} OFF`;
      else if (discountType === "bxgy") discountLabel = "BXGY";
      else if (discountType === "freeShipping") discountLabel = "Free Shipping";
      
      return {
        title: `${statusEmoji} ${title || "Untitled Promotion"}`,
        subtitle: `${template?.label || type} • ${discountLabel}`,
        media,
      };
    },
  },
  
  // Auto-apply template defaults when type changes
  initialValue: {
    status: "draft",
    priority: 50,
    discountType: "percentage",
    targetAudience: {
      segmentType: "allCustomers",
    },
  },
});
