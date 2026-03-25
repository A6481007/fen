import { useEffect, useRef } from "react";
import { TagIcon } from "@sanity/icons";
import { PatchEvent, defineField, defineType, set } from "sanity";
import { buildBannerFields } from "./helpers/bannerSettings";

const DEAL_TYPE_NAME = "deal";

const slugifyId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const buildDealId = (title?: string | null) => {
  const base = slugifyId(title || "deal");
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
  const random = Math.random().toString(36).slice(-4);
  return [base || "deal", timestamp, random].filter(Boolean).join("-");
};

const isUnset = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

const readPath = (doc: Record<string, any>, path: (string | number)[]) =>
  path.reduce<any>((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), doc);

// Deal templates with pre-configured defaults
const DEAL_TEMPLATES = {
  featured: {
    label: "⭐ Featured Deal",
    description: "Highlight a specific product with a special price",
    defaults: { badge: "FEATURED", badgeColor: "#F59E0B", priority: 90, showOnHomepage: true },
  },
  priceDrop: {
    label: "📉 Price Drop",
    description: "Permanent or temporary price reduction",
    defaults: { badge: "PRICE DROP", badgeColor: "#EF4444", priority: 70 },
  },
  limitedQty: {
    label: "🔢 Limited Quantity",
    description: "Deal with limited stock availability",
    defaults: { badge: "LIMITED", badgeColor: "#8B5CF6", priority: 80 },
  },
  daily: {
    label: "📅 Daily Deal",
    description: "24-hour special offer",
    defaults: { badge: "TODAY ONLY", badgeColor: "#10B981", priority: 75 },
  },
  clearance: {
    label: "🏷️ Clearance",
    description: "Deep discount on end-of-season items",
    defaults: { badge: "CLEARANCE", badgeColor: "#DC2626", priority: 60 },
  },
} as const;

type DealTemplateKey = keyof typeof DEAL_TEMPLATES;

const DEAL_TYPE_OPTIONS = Object.entries(DEAL_TEMPLATES).map(([value, t]) => ({
  title: t.label,
  value,
}));

const applyDealTemplateDefaults = (
  doc: Record<string, any>,
  templateKey: DealTemplateKey
): PatchEvent | null => {
  const template = DEAL_TEMPLATES[templateKey];
  if (!template) return null;

  const patches: ReturnType<typeof set>[] = [];
  const maybeSet = (path: (string | number)[], value: unknown) => {
    const current = readPath(doc, path);
    if (isUnset(current)) {
      patches.push(set(value, path));
    }
  };

  const { defaults } = template;
  maybeSet(["badge"], defaults.badge);
  maybeSet(["badgeColor"], defaults.badgeColor);
  if (defaults.priority !== undefined) maybeSet(["priority"], defaults.priority);
  if (defaults.showOnHomepage !== undefined) maybeSet(["showOnHomepage"], defaults.showOnHomepage);

  return patches.length ? PatchEvent.from(patches) : null;
};

const DealTypeInput = (props: any) => {
  const typeValue = props.value as DealTemplateKey | undefined;
  const appliedRef = useRef<DealTemplateKey | null>(null);

  useEffect(() => {
    if (!typeValue || appliedRef.current === typeValue) return;
    const patch = applyDealTemplateDefaults((props.document || {}) as Record<string, any>, typeValue);
    if (patch) {
      props.onChange?.(patch);
    }
    appliedRef.current = typeValue;
  }, [typeValue, props.document, props.onChange]);

  return props.renderDefault(props);
};

export const dealType = defineType({
  name: DEAL_TYPE_NAME,
  title: "Deal",
  type: "document",
  icon: TagIcon,

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
      components: { input: DealTypeInput },
      validation: (Rule) => Rule.required(),
      description: "Select a template to auto-fill badge styling and priority. Adjust as needed.",
    }),

    defineField({
      name: "dealId",
      title: "Deal ID",
      type: "string",
      group: "setup",
      placeholder: "e.g., deal-2025-001",
      initialValue: () => buildDealId(),
      validation: (Rule) =>
        Rule.required()
          .regex(/^[a-z0-9-]+$/, {
            name: "slug-safe",
            invert: false,
            message: "Use lowercase letters, numbers, and hyphens only",
          })
          .custom(async (value, context) => {
            if (!value) return "Deal ID is required";
            const client = context.getClient?.({ apiVersion: "2023-10-01" });
            if (!client) return true;
            const currentId = (context.document as { _id?: string })?._id;
            const count = await client.fetch<number>(
              'count(*[_type == "deal" && dealId == $dealId && _id != $currentId])',
              { dealId: value, currentId: currentId ?? "" }
            );
            return count === 0 || "Deal ID must be unique";
          }),
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
      name: "locale",
      title: "Locale",
      type: "reference",
      to: [{ type: "locale" }],
      group: "setup",
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: "product",
      title: "Product",
      type: "reference",
      to: [{ type: "product" }],
      group: "setup",
      description: "Select the product this deal applies to. Used for price + imagery fallbacks.",
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
      validation: (Rule) =>
        Rule.required()
          .min(0.01)
          .custom((dealPrice, context) => {
            if (typeof dealPrice !== "number") return "Deal price is required";
            const basePrice = (context.document as { originalPrice?: number })?.originalPrice;
            if (typeof basePrice === "number" && basePrice > 0 && dealPrice >= basePrice) {
              return "Deal price should be below the original price";
            }
            return true;
          }),
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
      validation: (Rule) => Rule.min(0).max(100).integer(),
    }),
    ...buildBannerFields({ initialPlacement: "dealpagehero", group: "display" }),
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
      description: "When this deal becomes visible. Leave empty to start immediately.",
    }),

    defineField({
      name: "endDate",
      title: "End Date",
      type: "datetime",
      group: "limits",
      description: "When this deal should stop. Leave empty for open-ended.",
      validation: (Rule) =>
        Rule.custom((endDate, context) => {
          const startDate = (context.document as { startDate?: string })?.startDate;
          if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            return "End date must be after start date";
          }
          return true;
        }),
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
