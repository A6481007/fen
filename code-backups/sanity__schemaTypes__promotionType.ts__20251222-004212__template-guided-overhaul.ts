import { defineArrayMember, defineField, defineType } from "sanity";
import DiscountCalculator from "../components/DiscountCalculator";
import { PromotionStatusInput } from "../components/ScheduleStatusCard";

const PROMOTION_TYPE_NAME = "promotion";

const PROMOTION_TYPE_OPTIONS = [
  { title: "Flash Sale", value: "flashSale" },
  { title: "Seasonal", value: "seasonal" },
  { title: "Bundle", value: "bundle" },
  { title: "Loyalty", value: "loyalty" },
  { title: "Clearance", value: "clearance" },
  { title: "Win-Back", value: "winBack" },
  { title: "Early Access", value: "earlyAccess" },
] as const;

const PROMOTION_STATUS_OPTIONS = [
  { title: "Draft", value: "draft" },
  { title: "Scheduled", value: "scheduled" },
  { title: "Active", value: "active" },
  { title: "Paused", value: "paused" },
  { title: "Ended", value: "ended" },
  { title: "Archived", value: "archived" },
] as const;

const DISCOUNT_TYPE_OPTIONS = [
  { title: "Percentage", value: "percentage" },
  { title: "Fixed Amount", value: "fixed" },
  { title: "Buy X Get Y", value: "bxgy" },
  { title: "Free Shipping", value: "freeShipping" },
  { title: "Points", value: "points" },
] as const;

const SEGMENT_TYPE_OPTIONS = [
  { title: "First Time", value: "firstTime" },
  { title: "Returning", value: "returning" },
  { title: "VIP", value: "vip" },
  { title: "Cart Abandoner", value: "cartAbandoner" },
  { title: "Inactive", value: "inactive" },
  { title: "All Customers", value: "allCustomers" },
] as const;

const TIMEZONE_OPTIONS = [
  { title: "UTC", value: "UTC" },
  { title: "Asia/Bangkok", value: "Asia/Bangkok" },
  { title: "America/New_York", value: "America/New_York" },
  { title: "America/Los_Angeles", value: "America/Los_Angeles" },
  { title: "Europe/London", value: "Europe/London" },
] as const;

const VARIANT_MODE_OPTIONS = [
  { title: "Control", value: "control" },
  { title: "Variant A", value: "variantA" },
  { title: "Variant B", value: "variantB" },
  { title: "Split", value: "split" },
] as const;

const VARIANT_DESIGN_OPTIONS = [
  { title: "Default", value: "default" },
  { title: "Minimal", value: "minimal" },
  { title: "Bold", value: "bold" },
] as const;

type PromotionDoc = {
  _id?: string;
  status?: string;
  type?: string;
  discountType?: string;
  discountValue?: number;
  startDate?: string;
  endDate?: string;
  targetAudience?: {
    segmentType?: string;
    cartAbandonmentThreshold?: number;
    inactivityDays?: number;
    minLTVThreshold?: number;
    maxLTVThreshold?: number;
    categories?: unknown[];
    products?: { _ref?: string }[];
    excludedProducts?: { _ref?: string }[];
  };
  variantMode?: string;
};

const getDoc = (context: { document?: unknown }): PromotionDoc =>
  (context.document || {}) as PromotionDoc;

const getDiscountType = (doc?: PromotionDoc) => doc?.discountType;
const getPromotionType = (doc?: PromotionDoc) => doc?.type;
const getSegmentType = (doc?: PromotionDoc) => doc?.targetAudience?.segmentType;
const getVariantMode = (doc?: PromotionDoc) => doc?.variantMode;

const requiresDiscountValue = (discountType?: string) =>
  ["percentage", "fixed", "points"].includes(discountType || "");

const isBxgyMode = (doc?: PromotionDoc) =>
  getDiscountType(doc) === "bxgy" || getPromotionType(doc) === "bundle";

const supportsDefaultProducts = (doc?: PromotionDoc) =>
  ["percentage", "fixed", "freeShipping"].includes(getDiscountType(doc) || "");

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
};

export const promotionType = defineType({
  name: PROMOTION_TYPE_NAME,
  title: "Promotion",
  type: "document",
  groups: [
    { name: "setup", title: "1. Setup", default: true },
    { name: "discount", title: "2. Discount" },
    { name: "targeting", title: "3. Targeting" },
    { name: "creative", title: "4. Creative" },
    { name: "advanced", title: "5. Advanced" },
  ],
  fieldsets: [
    { name: "identifiers", title: "Identifiers", options: { collapsible: true, collapsed: false } },
    { name: "classification", title: "Classification", options: { collapsible: true, collapsed: false } },
    { name: "schedule", title: "Schedule", options: { collapsible: true, collapsed: false } },
    { name: "discountCore", title: "Discount Core", options: { collapsible: true, collapsed: false } },
    { name: "thresholdsCaps", title: "Thresholds & Caps", options: { collapsible: true, collapsed: true } },
    { name: "bxgy", title: "Bundle / BXGY", options: { collapsible: true, collapsed: false } },
    { name: "badge", title: "Badge", options: { collapsible: true, collapsed: false } },
    { name: "hero", title: "Hero & Messaging", options: { collapsible: true, collapsed: false } },
    { name: "cta", title: "Call to Action", options: { collapsible: true, collapsed: false } },
    { name: "urgency", title: "Urgency", options: { collapsible: true, collapsed: false } },
    { name: "limits", title: "Limits", options: { collapsible: true, collapsed: false } },
    { name: "attribution", title: "Attribution & Tracking", options: { collapsible: true, collapsed: true } },
    { name: "experiment", title: "Experiment / Variants", options: { collapsible: true, collapsed: false } },
    { name: "admin", title: "Admin", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: "campaignId",
      title: "Campaign ID",
      type: "string",
      description: 'Unique identifier, e.g., "bf-2025-flash-001".',
      group: "setup",
      fieldset: "identifiers",
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
      group: "setup",
      fieldset: "identifiers",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: 'Display name, e.g., "Black Friday Flash Sale".',
      group: "setup",
      fieldset: "identifiers",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "type",
      title: "Promotion Type",
      type: "string",
      options: { list: PROMOTION_TYPE_OPTIONS, layout: "dropdown" },
      group: "setup",
      fieldset: "classification",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: { list: PROMOTION_STATUS_OPTIONS, layout: "dropdown" },
      initialValue: "draft",
      group: "setup",
      fieldset: "classification",
      validation: (Rule) => [
        Rule.required(),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          const start = parseDate(doc.startDate);
          if (value === "active" && start && start > new Date()) {
            return "Active but start date is in the future";
          }
          return true;
        }).warning("Active but start date is in the future"),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          const start = parseDate(doc.startDate);
          if (value === "scheduled" && start && start < new Date()) {
            return "Scheduled but start date is in the past";
          }
          return true;
        }).warning("Scheduled but start date is in the past"),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          const end = parseDate(doc.endDate);
          if (value === "ended" && end && end > new Date()) {
            return "Ended but end date is in the future";
          }
          return true;
        }).warning("Ended but end date is in the future"),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          const start = parseDate(doc.startDate);
          const end = parseDate(doc.endDate);
          const now = new Date();
          const withinRange =
            start && end ? start <= now && end >= now : start ? start <= now : end ? end >= now : false;
          if (value === "archived" && withinRange) {
            return "Archived but promotion dates are still in range";
          }
          return true;
        }).warning("Archived but promotion dates are still in range"),
      ],
    }),
    defineField({
      name: "priority",
      title: "Priority",
      type: "number",
      description: "Higher numbers win when multiple promotions are active.",
      group: "setup",
      fieldset: "classification",
      validation: (Rule) => Rule.min(1).max(100),
    }),
    defineField({
      name: "startDate",
      title: "Start Date",
      type: "datetime",
      group: "setup",
      fieldset: "schedule",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "End Date",
      type: "datetime",
      group: "setup",
      fieldset: "schedule",
      validation: (Rule) => [
        Rule.required(),
        Rule.custom((endDate, context) => {
          const startDate = (context.document as { startDate?: string } | undefined)?.startDate;

          if (startDate && endDate && new Date(endDate as string) <= new Date(startDate)) {
            return "End date must be after start date";
          }

          return true;
        }),
        Rule.custom((endDate, context) => {
          const status = (context.document as { status?: string } | undefined)?.status;

          if (status === "active" && endDate) {
            const parsedEndDate = new Date(endDate as string);
            if (!Number.isNaN(parsedEndDate.valueOf()) && parsedEndDate < new Date()) {
              return "End date is in the past for an active promotion";
            }
          }

          return true;
        }).warning("End date is in the past for an active promotion"),
      ],
    }),
    defineField({
      name: "timezone",
      title: "Timezone",
      type: "string",
      options: { list: TIMEZONE_OPTIONS, layout: "dropdown" },
      initialValue: "UTC",
      group: "setup",
      fieldset: "schedule",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "statusOverview",
      title: "Schedule & Guardrails",
      type: "string",
      group: "setup",
      fieldset: "schedule",
      components: { input: PromotionStatusInput },
      readOnly: true,
      description: "Preview of the live state using status, schedule, and timezone.",
    }),
    defineField({
      name: "discountType",
      title: "Discount Type",
      type: "string",
      options: { list: DISCOUNT_TYPE_OPTIONS, layout: "dropdown" },
      group: "discount",
      fieldset: "discountCore",
      validation: (Rule) => [
        Rule.required(),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (getPromotionType(doc) === "bundle" && value !== "bxgy") {
            return "Bundle promotions must use Buy X Get Y";
          }
          return true;
        }),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (value === "bxgy" && getPromotionType(doc) !== "bundle") {
            return "Buy X Get Y discounts typically use Promotion Type 'Bundle'";
          }
          return true;
        }).warning("Buy X Get Y discounts typically use Promotion Type 'Bundle'"),
      ],
    }),
    defineField({
      name: "discountValue",
      title: "Discount Value",
      type: "number",
      description: "Percentage, fixed amount, or points based on discount type.",
      group: "discount",
      fieldset: "discountCore",
      components: { input: DiscountCalculator },
      hidden: ({ document }) => !requiresDiscountValue(getDiscountType(document as PromotionDoc)),
      validation: (Rule) => [
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          const discountType = getDiscountType(doc);

          if (requiresDiscountValue(discountType)) {
            if (typeof value !== "number") {
              return "Discount value is required for this discount type";
            }

            if (discountType === "percentage" && (value < 0 || value > 100)) {
              return "Percentage discounts must be between 0 and 100";
            }

            if (discountType === "fixed" && value <= 0) {
              return "Fixed discounts must be greater than 0";
            }

            if (discountType === "points" && value < 1) {
              return "Points discounts must be at least 1 point";
            }
          }

          return true;
        }),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (getDiscountType(doc) === "percentage" && typeof value === "number" && value > 50) {
            return "High percentage discount may impact margin";
          }
          return true;
        }).warning("High percentage discount may impact margin"),
      ],
    }),
    defineField({
      name: "minimumOrderValue",
      title: "Minimum Order Value",
      type: "number",
      group: "discount",
      fieldset: "thresholdsCaps",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "maximumDiscount",
      title: "Maximum Discount",
      type: "number",
      description: "Cap on total discount amount.",
      group: "discount",
      fieldset: "thresholdsCaps",
      hidden: ({ document }) => getDiscountType(document as PromotionDoc) !== "percentage",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "buyQuantity",
      title: "Buy Quantity (X)",
      type: "number",
      group: "discount",
      fieldset: "bxgy",
      hidden: ({ document }) => !isBxgyMode(document as PromotionDoc),
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = getDoc(context);

          if (isBxgyMode(doc)) {
            if (typeof value !== "number") {
              return "Buy quantity is required for bundle/BXGY promotions";
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
      group: "discount",
      fieldset: "bxgy",
      hidden: ({ document }) => !isBxgyMode(document as PromotionDoc),
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = getDoc(context);

          if (isBxgyMode(doc)) {
            if (typeof value !== "number") {
              return "Get quantity is required for bundle/BXGY promotions";
            }

            if (value < 1) {
              return "Get quantity must be at least 1";
            }
          }

          return true;
        }),
    }),
    defineField({
      name: "defaultBundleItems",
      title: "Default Bundle Items",
      description: "Auto-add bundle items for one-click BXGY offers.",
      type: "array",
      group: "discount",
      fieldset: "bxgy",
      hidden: ({ document }) => !isBxgyMode(document as PromotionDoc),
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
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: {
            select: {
              title: "product.name",
              quantity: "quantity",
              media: "product.images.0",
            },
            prepare(selection) {
              const { title, quantity, media } = selection as {
                title?: string;
                quantity?: number;
                media?: unknown;
              };
              return {
                title: title || "Bundle item",
                subtitle: quantity ? `Qty ${quantity}` : undefined,
                media,
              };
            },
          },
        }),
      ],
      validation: (Rule) => [
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (!isBxgyMode(doc) || !Array.isArray(value)) return true;

          const hasInvalid = value.some((item) => {
            const productRef =
              (item as { product?: { _ref?: string; _id?: string } } | undefined)?.product?._ref ||
              (item as { product?: { _ref?: string; _id?: string } } | undefined)?.product?._id;
            const qty = (item as { quantity?: number } | undefined)?.quantity;
            return !productRef || typeof qty !== "number" || qty < 1;
          });

          return hasInvalid ? "Each bundle item needs a product and quantity of at least 1" : true;
        }),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (!isBxgyMode(doc)) return true;
          const hasBundleItems = Array.isArray(value) && value.length > 0;
          return hasBundleItems ? true : "Add default bundle items to enable one-click BXGY adds";
        }).warning(),
      ],
    }),
    defineField({
      name: "defaultProducts",
      title: "Default Products (One-Click)",
      description: "Optional default items for quick add on percentage/fixed/free-shipping promos.",
      type: "array",
      group: "discount",
      fieldset: "discountCore",
      hidden: ({ document }) => !supportsDefaultProducts(document as PromotionDoc),
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
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: {
            select: {
              title: "product.name",
              quantity: "quantity",
              media: "product.images.0",
            },
            prepare(selection) {
              const { title, quantity, media } = selection as {
                title?: string;
                quantity?: number;
                media?: unknown;
              };
              return {
                title: title || "Product",
                subtitle: quantity ? `Qty ${quantity}` : undefined,
                media,
              };
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (!supportsDefaultProducts(doc) || !Array.isArray(value)) return true;

          const invalid = value.some((item) => {
            const productRef = (item as { product?: { _ref?: string } } | undefined)?.product?._ref;
            const qty = (item as { quantity?: number } | undefined)?.quantity;
            return !productRef || typeof qty !== "number" || qty < 1;
          });

          return invalid ? "Each default product needs a product and quantity of at least 1" : true;
        }),
    }),
    defineField({
      name: "targetAudience",
      title: "Target Audience",
      type: "object",
      group: "targeting",
      initialValue: { segmentType: "allCustomers" },
      fieldsets: [
        { name: "segment", title: "Segment", options: { collapsible: true, collapsed: false } },
        { name: "valueFilters", title: "Value Filters", options: { collapsible: true, collapsed: true } },
        { name: "catalogFilters", title: "Catalog Filters", options: { collapsible: true, collapsed: true } },
      ],
      fields: [
        defineField({
          name: "segmentType",
          title: "Segment Type",
          type: "string",
          options: { list: SEGMENT_TYPE_OPTIONS },
          fieldset: "segment",
        }),
        defineField({
          name: "cartAbandonmentThreshold",
          title: "Cart Abandonment Threshold (hours)",
          type: "number",
          fieldset: "segment",
          hidden: ({ parent }) => (parent as { segmentType?: string } | undefined)?.segmentType !== "cartAbandoner",
          validation: (Rule) =>
            Rule.custom((value, context) => {
              const doc = getDoc(context);
              if (getSegmentType(doc) === "cartAbandoner") {
                if (typeof value !== "number") {
                  return "Cart abandonment threshold is required for cart abandoners";
                }
                if (value < 1) {
                  return "Threshold must be at least 1 hour";
                }
              }
              return true;
            }),
        }),
        defineField({
          name: "inactivityDays",
          title: "Inactivity (days)",
          type: "number",
          fieldset: "segment",
          hidden: ({ parent }) => (parent as { segmentType?: string } | undefined)?.segmentType !== "inactive",
          validation: (Rule) =>
            Rule.custom((value, context) => {
              const doc = getDoc(context);
              if (getSegmentType(doc) === "inactive") {
                if (typeof value !== "number") {
                  return "Inactivity days are required for inactive segment";
                }
                if (value < 1) {
                  return "Inactivity days must be at least 1";
                }
              }
              return true;
            }),
        }),
        defineField({
          name: "minLTVThreshold",
          title: "Min Lifetime Value",
          type: "number",
          fieldset: "valueFilters",
          validation: (Rule) => [
            Rule.min(0),
            Rule.custom((value, context) => {
              const segment = getSegmentType(getDoc(context));
              if (segment === "firstTime" && typeof value === "number") {
                return "LTV thresholds usually aren't needed for first-time segments";
              }
              return true;
            }).warning("LTV thresholds usually aren't needed for first-time segments"),
          ],
        }),
        defineField({
          name: "maxLTVThreshold",
          title: "Max Lifetime Value",
          type: "number",
          fieldset: "valueFilters",
          validation: (Rule) => [
            Rule.min(0),
            Rule.custom((value, context) => {
              const doc = getDoc(context);
              const min = doc.targetAudience?.minLTVThreshold;
              if (typeof value === "number" && typeof min === "number" && min > value) {
                return "Max LTV must be greater than or equal to Min LTV";
              }
              return true;
            }),
            Rule.custom((value, context) => {
              const doc = getDoc(context);
              const min = doc.targetAudience?.minLTVThreshold;
              if (typeof value === "number" && (min === null || typeof min === "undefined")) {
                return "Consider setting a Min LTV threshold too";
              }
              return true;
            }).warning("Consider setting a Min LTV threshold too"),
            Rule.custom((value, context) => {
              const doc = getDoc(context);
              const segment = getSegmentType(doc);
              const hasAnyLtv =
                typeof value === "number" || typeof (doc.targetAudience?.minLTVThreshold ?? undefined) === "number";
              if (segment === "firstTime" && hasAnyLtv) {
                return "LTV thresholds usually aren't needed for first-time segments";
              }
              return true;
            }).warning("LTV thresholds usually aren't needed for first-time segments"),
          ],
        }),
        defineField({
          name: "categories",
          title: "Categories",
          description:
            "Leave empty to apply to all categories. Add categories to limit where the promotion applies.",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "category" }],
            }),
          ],
          fieldset: "catalogFilters",
        }),
        defineField({
          name: "products",
          title: "Products",
          description:
            "Leave empty to apply to all products; add specific products to constrain the promotion.",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "product" }],
            }),
          ],
          fieldset: "catalogFilters",
        }),
        defineField({
          name: "excludedProducts",
          title: "Excluded Products",
          description: "Use to carve out exceptions from selected categories/products.",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "product" }],
            }),
          ],
          fieldset: "catalogFilters",
          validation: (Rule) =>
            Rule.custom((value, context) => {
              const doc = getDoc(context);
              const products = Array.isArray(doc.targetAudience?.products) ? doc.targetAudience?.products : [];
              const excluded = Array.isArray(value) ? value : [];

              if (excluded.length && products.length) {
                const productRefs = new Set(
                  products.map((item) => (typeof item === "object" ? (item as { _ref?: string })._ref : undefined))
                );
                const overlapping = excluded.some((item) => productRefs.has((item as { _ref?: string })._ref));
                if (overlapping) {
                  return "Some products are both targeted and excluded";
                }
              }
              return true;
            }).warning("Some products are both targeted and excluded"),
        }),
      ],
      validation: (Rule) =>
        Rule.custom((value) => {
          const categories = Array.isArray(value?.categories) ? value?.categories : [];
          const products = Array.isArray(value?.products) ? value?.products : [];
          const excluded = Array.isArray(value?.excludedProducts) ? value?.excludedProducts : [];
          const noCatalogFilters = categories.length === 0 && products.length === 0 && excluded.length === 0;
          if (noCatalogFilters) {
            return "No catalog constraints; applies to all products";
          }
          return true;
        }).warning("No catalog constraints; applies to all products"),
    }),
    defineField({
      name: "badgeLabel",
      title: "Badge Label",
      type: "string",
      description: 'e.g., "Flash Sale", "VIP Only".',
      group: "creative",
      fieldset: "badge",
    }),
    defineField({
      name: "badgeColor",
      title: "Badge Color",
      type: "string",
      description: 'Hex color like "#FF5733".',
      group: "creative",
      fieldset: "badge",
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
      group: "creative",
      fieldset: "hero",
    }),
    defineField({
      name: "shortDescription",
      title: "Short Description",
      type: "string",
      description: "For cards/lists (160 characters max).",
      group: "creative",
      fieldset: "hero",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
      group: "creative",
      fieldset: "hero",
    }),
    defineField({
      name: "thumbnailImage",
      title: "Thumbnail Image",
      type: "image",
      group: "creative",
      fieldset: "hero",
    }),
    defineField({
      name: "ctaText",
      title: "CTA Text",
      type: "string",
      group: "creative",
      fieldset: "cta",
      initialValue: "Shop Now",
    }),
    defineField({
      name: "ctaLink",
      title: "CTA Link",
      type: "string",
      description: "Optional custom link for the CTA.",
      group: "creative",
      fieldset: "cta",
    }),
    defineField({
      name: "urgencyTrigger",
      title: "Urgency Triggers",
      type: "object",
      group: "creative",
      fieldset: "urgency",
      initialValue: { showCountdown: true, showStockAlert: false },
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
          hidden: ({ parent }) => !(parent as { showStockAlert?: boolean } | undefined)?.showStockAlert,
          validation: (Rule) => [
            Rule.min(0).max(100),
            Rule.custom((value, context) => {
              const parent = (context.parent || {}) as { showStockAlert?: boolean };
              if (parent?.showStockAlert) {
                if (typeof value !== "number") {
                  return "Stock alert threshold is required when stock alert is enabled";
                }
              }
              return true;
            }),
          ],
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
      name: "budgetCap",
      title: "Budget Cap",
      type: "number",
      description: "Total discount spend limit in dollars.",
      group: "advanced",
      fieldset: "limits",
    }),
    defineField({
      name: "usageLimit",
      title: "Usage Limit",
      type: "number",
      description: "Total redemption count limit.",
      group: "advanced",
      fieldset: "limits",
    }),
    defineField({
      name: "perCustomerLimit",
      title: "Per Customer Limit",
      type: "number",
      description: "Max uses per customer.",
      group: "advanced",
      fieldset: "limits",
      initialValue: 1,
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "utmSource",
      title: "UTM Source",
      type: "string",
      group: "advanced",
      fieldset: "attribution",
    }),
    defineField({
      name: "utmMedium",
      title: "UTM Medium",
      type: "string",
      group: "advanced",
      fieldset: "attribution",
    }),
    defineField({
      name: "utmCampaign",
      title: "UTM Campaign",
      type: "string",
      group: "advanced",
      fieldset: "attribution",
    }),
    defineField({
      name: "utmContent",
      title: "UTM Content",
      type: "string",
      group: "advanced",
      fieldset: "attribution",
    }),
    defineField({
      name: "trackingPixelId",
      title: "Tracking Pixel ID",
      type: "string",
      group: "advanced",
      fieldset: "attribution",
    }),
    defineField({
      name: "variantMode",
      title: "Variant Mode",
      type: "string",
      options: { list: VARIANT_MODE_OPTIONS },
      group: "advanced",
      fieldset: "experiment",
      initialValue: "control",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "splitPercent",
      title: "Split Percent (Variant A)",
      type: "number",
      description: "Percentage for Variant A when split testing.",
      group: "advanced",
      fieldset: "experiment",
      hidden: ({ document }) => getVariantMode(document as PromotionDoc) !== "split",
      validation: (Rule) => [
        Rule.custom((value, context) => {
          const variantMode = getVariantMode(getDoc(context));

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
        Rule.custom((value, context) => {
          const variantMode = getVariantMode(getDoc(context));
          if (variantMode === "split" && typeof value === "number" && (value === 0 || value === 100)) {
            return "0% or 100% makes this effectively not a split test";
          }
          return true;
        }).warning("0% or 100% makes this effectively not a split test"),
      ],
    }),
    defineField({
      name: "variantCopyA",
      title: "Variant Copy A",
      type: "string",
      description: "Shown when testing Variant A (variantA/split modes).",
      group: "advanced",
      fieldset: "experiment",
      hidden: ({ document }) => {
        const mode = getVariantMode(document as PromotionDoc);
        return mode === "control" || mode === "variantB";
      },
    }),
    defineField({
      name: "variantCopyB",
      title: "Variant Copy B",
      type: "string",
      description: "Shown when testing Variant B (variantB/split modes).",
      group: "advanced",
      fieldset: "experiment",
      hidden: ({ document }) => {
        const mode = getVariantMode(document as PromotionDoc);
        return mode === "control" || mode === "variantA";
      },
    }),
    defineField({
      name: "variantCtaA",
      title: "Variant CTA A",
      type: "string",
      description: "CTA for Variant A (variantA/split modes).",
      group: "advanced",
      fieldset: "experiment",
      hidden: ({ document }) => {
        const mode = getVariantMode(document as PromotionDoc);
        return mode === "control" || mode === "variantB";
      },
    }),
    defineField({
      name: "variantCtaB",
      title: "Variant CTA B",
      type: "string",
      description: "CTA for Variant B (variantB/split modes).",
      group: "advanced",
      fieldset: "experiment",
      hidden: ({ document }) => {
        const mode = getVariantMode(document as PromotionDoc);
        return mode === "control" || mode === "variantA";
      },
    }),
    defineField({
      name: "variantDesign",
      title: "Variant Design",
      type: "string",
      options: { list: VARIANT_DESIGN_OPTIONS },
      description: "Optional layout test for active variants.",
      group: "advanced",
      fieldset: "experiment",
      hidden: ({ document }) => getVariantMode(document as PromotionDoc) === "control",
    }),
    defineField({
      name: "internalNotes",
      title: "Internal Notes",
      type: "text",
      rows: 3,
      description: "Admin-only notes.",
      group: "advanced",
      fieldset: "admin",
    }),
    defineField({
      name: "createdBy",
      title: "Created By",
      type: "string",
      group: "advanced",
      fieldset: "admin",
    }),
    defineField({
      name: "lastModifiedBy",
      title: "Last Modified By",
      type: "string",
      group: "advanced",
      fieldset: "admin",
    }),
  ],
  preview: {
    select: {
      title: "name",
      type: "type",
      status: "status",
      discountType: "discountType",
      discountValue: "discountValue",
      buyQuantity: "buyQuantity",
      getQuantity: "getQuantity",
      startDate: "startDate",
      endDate: "endDate",
      variantMode: "variantMode",
      segmentType: "targetAudience.segmentType",
      media: "thumbnailImage",
    },
    prepare(selection) {
      const {
        title,
        type,
        status,
        discountType,
        discountValue,
        buyQuantity,
        getQuantity,
        startDate,
        endDate,
        variantMode,
        segmentType,
        media,
      } = selection as {
        title?: string;
        type?: string;
        status?: string;
        discountType?: string;
        discountValue?: number;
        buyQuantity?: number;
        getQuantity?: number;
        startDate?: string;
        endDate?: string;
        variantMode?: string;
        segmentType?: string;
        media?: unknown;
      };

      const statusPrefix = status ? `[${status.toUpperCase()}] ` : "";
      const resolvedTitle = `${statusPrefix}${title || "Untitled Promotion"}`.trim();

      const discountDisplay =
        discountType === "percentage" && typeof discountValue === "number"
          ? `${discountValue}% off`
          : discountType === "fixed" && typeof discountValue === "number"
          ? `$${discountValue} off`
          : discountType === "bxgy"
          ? `Buy ${typeof buyQuantity === "number" ? buyQuantity : "?"} Get ${
              typeof getQuantity === "number" ? getQuantity : "?"
            }`
          : discountType === "freeShipping"
          ? "Free shipping"
          : discountType === "points" && typeof discountValue === "number"
          ? `${discountValue} points`
          : undefined;

      const formatDate = (value?: string) => {
        if (!value) return undefined;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.valueOf())) return undefined;
        return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed);
      };

      const startLabel = formatDate(startDate);
      const endLabel = formatDate(endDate);
      const dateRange =
        startLabel && endLabel
          ? `${startLabel} -> ${endLabel}`
          : startLabel
          ? `Starts ${startLabel}`
          : endLabel
          ? `Ends ${endLabel}`
          : undefined;

      const segmentDisplay = segmentType ? `Segment: ${segmentType}` : undefined;
      const variantDisplay = variantMode && variantMode !== "control" ? `Variant: ${variantMode}` : undefined;
      const subtitleParts = [discountDisplay, dateRange, type, segmentDisplay, variantDisplay].filter(Boolean);

      return {
        title: resolvedTitle,
        subtitle: subtitleParts.join(" | "),
        media,
      };
    },
  },
});
