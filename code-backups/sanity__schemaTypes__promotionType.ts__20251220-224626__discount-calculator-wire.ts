import { defineArrayMember, defineField, defineType } from "sanity";

const PROMOTION_TYPE_NAME = "promotion";

export const promotionType = defineType({
  name: PROMOTION_TYPE_NAME,
  title: "Promotion",
  type: "document",
  fieldsets: [
    { name: "basic", title: "Basic Info", options: { collapsible: true } },
    { name: "schedule", title: "Schedule", options: { collapsible: true, collapsed: true } },
    { name: "discount", title: "Discount", options: { collapsible: true, collapsed: true } },
    { name: "targeting", title: "Targeting", options: { collapsible: true, collapsed: true } },
    { name: "limits", title: "Limits", options: { collapsible: true, collapsed: true } },
    { name: "creative", title: "Creative", options: { collapsible: true, collapsed: true } },
    { name: "urgency", title: "Urgency", options: { collapsible: true, collapsed: true } },
    { name: "tracking", title: "Tracking", options: { collapsible: true, collapsed: true } },
    { name: "testing", title: "A/B Testing", options: { collapsible: true, collapsed: true } },
    { name: "admin", title: "Admin", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: "campaignId",
      title: "Campaign ID",
      type: "string",
      description: 'Unique identifier, e.g., "bf-2025-flash-001".',
      fieldset: "basic",
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          const idValue = (value as string | undefined)?.trim();
          if (!idValue) {
            return "Campaign ID is required";
          }

          const client = context.getClient?.({ apiVersion: "2023-10-01" });
          if (!client) {
            return true;
          }

          const docId = (context.document as { _id?: string } | undefined)?._id || "";
          const baseId = docId.replace(/^drafts\./, "");

          const existingId = await client.fetch<string | null>(
            '*[_type == $type && campaignId == $campaignId && !(_id in [$draftId, $publishedId])][0]._id',
            {
              type: PROMOTION_TYPE_NAME,
              campaignId: idValue,
              draftId: `drafts.${baseId}`,
              publishedId: baseId,
            }
          );

          return existingId ? "Campaign ID must be unique" : true;
        }),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
      fieldset: "basic",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: 'Display name, e.g., "Black Friday Flash Sale".',
      fieldset: "basic",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "type",
      title: "Promotion Type",
      type: "string",
      options: {
        list: [
          { title: "Flash Sale", value: "flashSale" },
          { title: "Seasonal", value: "seasonal" },
          { title: "Bundle", value: "bundle" },
          { title: "Loyalty", value: "loyalty" },
          { title: "Clearance", value: "clearance" },
          { title: "Win-Back", value: "winBack" },
          { title: "Early Access", value: "earlyAccess" },
        ],
        layout: "dropdown",
      },
      fieldset: "basic",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Scheduled", value: "scheduled" },
          { title: "Active", value: "active" },
          { title: "Paused", value: "paused" },
          { title: "Ended", value: "ended" },
          { title: "Archived", value: "archived" },
        ],
        layout: "dropdown",
      },
      initialValue: "draft",
      fieldset: "basic",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "priority",
      title: "Priority",
      type: "number",
      description: "Higher numbers win when multiple promotions are active.",
      fieldset: "basic",
      validation: (Rule) => Rule.min(1).max(100),
    }),
    defineField({
      name: "startDate",
      title: "Start Date",
      type: "datetime",
      fieldset: "schedule",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "End Date",
      type: "datetime",
      fieldset: "schedule",
      validation: (Rule) =>
        Rule.required().custom((endDate, context) => {
          const startDate = (context.document as { startDate?: string } | undefined)?.startDate;

          if (startDate && endDate && new Date(endDate as string) <= new Date(startDate)) {
            return "End date must be after start date";
          }

          return true;
        }),
    }),
    defineField({
      name: "timezone",
      title: "Timezone",
      type: "string",
      options: {
        list: [
          { title: "UTC", value: "UTC" },
          { title: "Asia/Bangkok", value: "Asia/Bangkok" },
          { title: "America/New_York", value: "America/New_York" },
          { title: "America/Los_Angeles", value: "America/Los_Angeles" },
          { title: "Europe/London", value: "Europe/London" },
        ],
        layout: "dropdown",
      },
      initialValue: "UTC",
      fieldset: "schedule",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "discountType",
      title: "Discount Type",
      type: "string",
      options: {
        list: [
          { title: "Percentage", value: "percentage" },
          { title: "Fixed Amount", value: "fixed" },
          { title: "Buy X Get Y", value: "bxgy" },
          { title: "Free Shipping", value: "freeShipping" },
          { title: "Points", value: "points" },
        ],
        layout: "dropdown",
      },
      fieldset: "discount",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "discountValue",
      title: "Discount Value",
      type: "number",
      description: "Percentage or fixed amount based on discount type.",
      fieldset: "discount",
      hidden: ({ document }) =>
        !["percentage", "fixed"].includes((document as { discountType?: string } | undefined)?.discountType || ""),
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const discountType = (context.document as { discountType?: string } | undefined)?.discountType;

          if (discountType === "percentage" || discountType === "fixed") {
            if (typeof value !== "number") {
              return "Discount value is required for percentage or fixed discounts";
            }
          }

          return true;
        }),
    }),
    defineField({
      name: "minimumOrderValue",
      title: "Minimum Order Value",
      type: "number",
      fieldset: "discount",
    }),
    defineField({
      name: "maximumDiscount",
      title: "Maximum Discount",
      type: "number",
      description: "Cap on total discount amount.",
      fieldset: "discount",
    }),
    defineField({
      name: "buyQuantity",
      title: "Buy Quantity (X)",
      type: "number",
      fieldset: "discount",
      hidden: ({ document }) =>
        (document as { discountType?: string } | undefined)?.discountType !== "bxgy",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const discountType = (context.document as { discountType?: string } | undefined)?.discountType;

          if (discountType === "bxgy") {
            if (typeof value !== "number") {
              return "Buy quantity is required for Buy X Get Y promotions";
            }

            if (value < 1) {
              return "Buy quantity must be at least 1";
            }
          }

          return true;
        }),
    }),
    defineField({
      name: "getQuantity",
      title: "Get Quantity (Y)",
      type: "number",
      fieldset: "discount",
      hidden: ({ document }) =>
        (document as { discountType?: string } | undefined)?.discountType !== "bxgy",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const discountType = (context.document as { discountType?: string } | undefined)?.discountType;

          if (discountType === "bxgy") {
            if (typeof value !== "number") {
              return "Get quantity is required for Buy X Get Y promotions";
            }

            if (value < 1) {
              return "Get quantity must be at least 1";
            }
          }

          return true;
        }),
    }),
    defineField({
      name: "targetAudience",
      title: "Target Audience",
      type: "object",
      fieldset: "targeting",
      fields: [
        defineField({
          name: "segmentType",
          title: "Segment Type",
          type: "string",
          options: {
            list: [
              { title: "First Time", value: "firstTime" },
              { title: "Returning", value: "returning" },
              { title: "VIP", value: "vip" },
              { title: "Cart Abandoner", value: "cartAbandoner" },
              { title: "Inactive", value: "inactive" },
              { title: "All Customers", value: "allCustomers" },
            ],
          },
        }),
        defineField({
          name: "cartAbandonmentThreshold",
          title: "Cart Abandonment Threshold (hours)",
          type: "number",
        }),
        defineField({
          name: "inactivityDays",
          title: "Inactivity (days)",
          type: "number",
        }),
        defineField({
          name: "minLTVThreshold",
          title: "Min Lifetime Value",
          type: "number",
        }),
        defineField({
          name: "maxLTVThreshold",
          title: "Max Lifetime Value",
          type: "number",
        }),
        defineField({
          name: "categories",
          title: "Categories",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "category" }],
            }),
          ],
        }),
        defineField({
          name: "products",
          title: "Products",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "product" }],
            }),
          ],
        }),
        defineField({
          name: "excludedProducts",
          title: "Excluded Products",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "product" }],
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "budgetCap",
      title: "Budget Cap",
      type: "number",
      description: "Total discount spend limit in dollars.",
      fieldset: "limits",
    }),
    defineField({
      name: "usageLimit",
      title: "Usage Limit",
      type: "number",
      description: "Total redemption count limit.",
      fieldset: "limits",
    }),
    defineField({
      name: "perCustomerLimit",
      title: "Per Customer Limit",
      type: "number",
      description: "Max uses per customer.",
      fieldset: "limits",
      initialValue: 1,
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "badgeLabel",
      title: "Badge Label",
      type: "string",
      description: 'e.g., "Flash Sale", "VIP Only".',
      fieldset: "creative",
    }),
    defineField({
      name: "badgeColor",
      title: "Badge Color",
      type: "string",
      description: 'Hex color like "#FF5733".',
      fieldset: "creative",
      validation: (Rule) =>
        Rule.regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, { name: "hex color" }).warning(
          "Use a valid hex color (e.g., #FF5733)"
        ),
    }),
    defineField({
      name: "heroMessage",
      title: "Hero Message",
      type: "text",
      rows: 3,
      fieldset: "creative",
    }),
    defineField({
      name: "shortDescription",
      title: "Short Description",
      type: "string",
      description: "For cards/lists (160 characters max).",
      fieldset: "creative",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
      fieldset: "creative",
    }),
    defineField({
      name: "thumbnailImage",
      title: "Thumbnail Image",
      type: "image",
      fieldset: "creative",
    }),
    defineField({
      name: "ctaText",
      title: "CTA Text",
      type: "string",
      fieldset: "creative",
      initialValue: "Shop Now",
    }),
    defineField({
      name: "ctaLink",
      title: "CTA Link",
      type: "string",
      description: "Optional custom link for the CTA.",
      fieldset: "creative",
    }),
    defineField({
      name: "urgencyTrigger",
      title: "Urgency Triggers",
      type: "object",
      fieldset: "urgency",
      fields: [
        defineField({
          name: "showCountdown",
          title: "Show Countdown",
          type: "boolean",
          initialValue: true,
        }),
        defineField({
          name: "showStockAlert",
          title: "Show Stock Alert",
          type: "boolean",
        }),
        defineField({
          name: "stockAlertThreshold",
          title: "Stock Alert Threshold (%)",
          type: "number",
          description: 'Show "Selling Fast" at X% remaining.',
          validation: (Rule) => Rule.min(0).max(100),
        }),
        defineField({
          name: "urgencyMessage",
          title: "Urgency Message",
          type: "string",
          description: 'e.g., "Only 2 hours left!"',
        }),
      ],
    }),
    defineField({
      name: "utmSource",
      title: "UTM Source",
      type: "string",
      fieldset: "tracking",
    }),
    defineField({
      name: "utmMedium",
      title: "UTM Medium",
      type: "string",
      fieldset: "tracking",
    }),
    defineField({
      name: "utmCampaign",
      title: "UTM Campaign",
      type: "string",
      fieldset: "tracking",
    }),
    defineField({
      name: "utmContent",
      title: "UTM Content",
      type: "string",
      fieldset: "tracking",
    }),
    defineField({
      name: "trackingPixelId",
      title: "Tracking Pixel ID",
      type: "string",
      fieldset: "tracking",
    }),
    defineField({
      name: "variantMode",
      title: "Variant Mode",
      type: "string",
      options: {
        list: [
          { title: "Control", value: "control" },
          { title: "Variant A", value: "variantA" },
          { title: "Variant B", value: "variantB" },
          { title: "Split", value: "split" },
        ],
      },
      fieldset: "testing",
      initialValue: "control",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "splitPercent",
      title: "Split Percent (Variant A)",
      type: "number",
      description: "Percentage for Variant A when split testing.",
      fieldset: "testing",
      hidden: ({ document }) =>
        (document as { variantMode?: string } | undefined)?.variantMode !== "split",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const variantMode = (context.document as { variantMode?: string } | undefined)?.variantMode;

          if (variantMode === "split") {
            if (typeof value !== "number") {
              return "Split percent is required when variant mode is split";
            }

            if (value < 0 || value > 100) {
              return "Split percent must be between 0 and 100";
            }

            return true;
          }

          return typeof value === "undefined" || value === null
            ? true
            : "Only set a split percent when variant mode is split";
        }),
    }),
    defineField({
      name: "variantCopyA",
      title: "Variant Copy A",
      type: "string",
      fieldset: "testing",
    }),
    defineField({
      name: "variantCopyB",
      title: "Variant Copy B",
      type: "string",
      fieldset: "testing",
    }),
    defineField({
      name: "variantCtaA",
      title: "Variant CTA A",
      type: "string",
      fieldset: "testing",
    }),
    defineField({
      name: "variantCtaB",
      title: "Variant CTA B",
      type: "string",
      fieldset: "testing",
    }),
    defineField({
      name: "variantDesign",
      title: "Variant Design",
      type: "string",
      options: {
        list: [
          { title: "Default", value: "default" },
          { title: "Minimal", value: "minimal" },
          { title: "Bold", value: "bold" },
        ],
      },
      fieldset: "testing",
    }),
    defineField({
      name: "internalNotes",
      title: "Internal Notes",
      type: "text",
      rows: 3,
      description: "Admin-only notes.",
      fieldset: "admin",
    }),
    defineField({
      name: "createdBy",
      title: "Created By",
      type: "string",
      fieldset: "admin",
    }),
    defineField({
      name: "lastModifiedBy",
      title: "Last Modified By",
      type: "string",
      fieldset: "admin",
    }),
  ],
  preview: {
    select: {
      title: "name",
      type: "type",
      status: "status",
      media: "thumbnailImage",
    },
    prepare(selection) {
      const { title, type, status, media } = selection as {
        title?: string;
        type?: string;
        status?: string;
        media?: unknown;
      };

      return {
        title: title || "Untitled Promotion",
        subtitle: [type, status].filter(Boolean).join(" | "),
        media,
      };
    },
  },
});
