import { defineField, defineType } from "sanity";

const DEAL_TYPE_NAME = "deal";

// Deal templates with pre-configured defaults
const DEAL_TEMPLATES = {
  featured: {
    label: "⭐ Featured Deal",
    description: "Highlight a specific product with a special price",
    defaults: { badge: "FEATURED", badgeColor: "#F59E0B" },
  },
  priceDrop: {
    label: "📉 Price Drop",
    description: "Permanent or temporary price reduction",
    defaults: { badge: "PRICE DROP", badgeColor: "#EF4444" },
  },
  limitedQty: {
    label: "🔢 Limited Quantity",
    description: "Deal with limited stock availability",
    defaults: { badge: "LIMITED", badgeColor: "#8B5CF6" },
  },
  daily: {
    label: "📅 Daily Deal",
    description: "24-hour special offer",
    defaults: { badge: "TODAY ONLY", badgeColor: "#10B981" },
  },
  clearance: {
    label: "🏷️ Clearance",
    description: "Deep discount on end-of-season items",
    defaults: { badge: "CLEARANCE", badgeColor: "#DC2626" },
  },
} as const;

const DEAL_TYPE_OPTIONS = Object.entries(DEAL_TEMPLATES).map(([value, t]) => ({
  title: t.label,
  value,
}));

export const dealType = defineType({
  name: DEAL_TYPE_NAME,
  title: "Deal",
  type: "document",
  icon: () => "🏷️",

  groups: [
    { name: "setup", title: "1️⃣ Setup", default: true },
    { name: "pricing", title: "2️⃣ Pricing" },
    { name: "display", title: "3️⃣ Display" },
    { name: "limits", title: "4️⃣ Limits" },
  ],

  fields: [
    // SETUP GROUP
    defineField({
      name: "dealType",
      title: "Deal Type",
      type: "string",
      group: "setup",
      options: { list: DEAL_TYPE_OPTIONS, layout: "radio" },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "dealId",
      title: "Deal ID",
      type: "string",
      group: "setup",
      placeholder: "e.g., deal-2025-001",
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "title",
      title: "Deal Title",
      type: "string",
      group: "setup",
      placeholder: "e.g., iPhone 15 Pro - Limited Time Offer",
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "product",
      title: "Product",
      type: "reference",
      to: [{ type: "product" }],
      group: "setup",
      description: "Select the product this deal applies to",
      validation: (Rule) => Rule.required().error("Every deal must have a product"),
    }),

    defineField({
      name: "status",
      title: "Status",
      type: "string",
      group: "setup",
      options: {
        list: [
          { title: "📝 Draft", value: "draft" },
          { title: "✅ Active", value: "active" },
          { title: "🏁 Ended", value: "ended" },
        ],
      },
      initialValue: "draft",
    }),

    // PRICING GROUP
    defineField({
      name: "originalPrice",
      title: "Original Price",
      type: "number",
      group: "pricing",
      description: "Leave empty to use product's current price",
      validation: (Rule) => Rule.min(0.01),
    }),

    defineField({
      name: "dealPrice",
      title: "Deal Price",
      type: "number",
      group: "pricing",
      description: "The special price customers pay",
      validation: (Rule) => Rule.required().min(0.01),
    }),

    // DISPLAY GROUP
    defineField({
      name: "badge",
      title: "Badge Text",
      type: "string",
      group: "display",
      placeholder: "e.g., SALE, 30% OFF",
    }),

    defineField({
      name: "badgeColor",
      title: "Badge Color",
      type: "string",
      group: "display",
      placeholder: "#EF4444",
    }),

    defineField({
      name: "showOnHomepage",
      title: "Show on Homepage",
      type: "boolean",
      group: "display",
      initialValue: false,
    }),

    defineField({
      name: "priority",
      title: "Display Priority",
      type: "number",
      group: "display",
      initialValue: 50,
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: "seoMetadata",
      title: "SEO Metadata",
      type: "seoMetadata",
      group: "display",
      description: "Meta title, description, keywords, and social image for the deal landing experience.",
    }),

    // LIMITS GROUP
    defineField({
      name: "startDate",
      title: "Start Date",
      type: "datetime",
      group: "limits",
    }),

    defineField({
      name: "endDate",
      title: "End Date",
      type: "datetime",
      group: "limits",
    }),

    defineField({
      name: "quantityLimit",
      title: "Total Quantity Limit",
      type: "number",
      group: "limits",
      description: "Leave empty for unlimited",
      validation: (Rule) => Rule.min(1).integer(),
    }),

    defineField({
      name: "perCustomerLimit",
      title: "Per Customer Limit",
      type: "number",
      group: "limits",
      initialValue: 1,
      validation: (Rule) => Rule.min(1).integer(),
    }),

    defineField({
      name: "soldCount",
      title: "Units Sold",
      type: "number",
      group: "limits",
      readOnly: true,
      initialValue: 0,
    }),
  ],

  preview: {
    select: {
      title: "title",
      dealType: "dealType",
      status: "status",
      dealPrice: "dealPrice",
      originalPrice: "originalPrice",
      productPrice: "product.price",
      media: "product.images.0",
    },
    prepare({ title, dealType, status, dealPrice, originalPrice, productPrice, media }) {
      const template = DEAL_TEMPLATES[dealType as keyof typeof DEAL_TEMPLATES];
      const basePrice = originalPrice || productPrice || 0;
      const discount = basePrice > 0 ? Math.round(((basePrice - dealPrice) / basePrice) * 100) : 0;
      const statusEmoji = status === "active" ? "✅" : status === "ended" ? "🏁" : "📝";

      return {
        title: `${statusEmoji} ${title || "Untitled Deal"}`,
        subtitle: `${template?.label || dealType} • $${dealPrice} (${discount}% off)`,
        media,
      };
    },
  },
});
