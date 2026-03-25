import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { CategoryTreeInput } from "../components/inputs/CategoryTreeInput";
import { getBadgeToneOptions, getCtaStyleOptions, getLayoutOptions } from "../../constants/bannerConfig";
import { validateCtaLabel } from "./helpers/ctaValidation";

export const bannerType = defineType({
  name: "banner",
  title: "Banner",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().min(3).max(160),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) =>
        Rule.max(500).warning("Keep descriptions concise for hero copy."),
    }),
    defineField({
      name: "badge",
      title: "Discount Badge",
      type: "string",
      description: "Discount Badge Ratio",
    }),
    // Legacy pricing fields retained for backward compatibility
    defineField({
      name: "discountAmount",
      title: "Discount Amount",
      type: "number",
      description: "Amount off in percentage or fixed value",
    }),
    // Hero content (new)
    defineField({
      name: "kicker",
      title: "Kicker",
      type: "string",
      description: "Small label above the title",
    }),
    defineField({
      name: "metaLine",
      title: "Meta line",
      type: "string",
      description: "Optional supporting line beneath the description.",
    }),
    defineField({
      name: "heroVariant",
      title: "Hero Variant",
      type: "string",
      options: {
        list: [
          { title: "Light", value: "light" },
          { title: "Dark", value: "dark" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "light",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "layout",
      title: "Layout",
      type: "string",
      description: "Controls how the hero is composed.",
      options: {
        list: getLayoutOptions().map((opt) => ({
          title: opt.label,
          value: opt.value,
          description: opt.description,
        })),
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "split",
    }),
    defineField({
      name: "mediaPosition",
      title: "Media position",
      type: "string",
      description: "Where the image sits in the layout.",
      options: {
        list: [
          { title: "Right", value: "right" },
          { title: "Left", value: "left" },
          { title: "Background", value: "background" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "right",
    }),
    defineField({
      name: "mediaAspect",
      title: "Media aspect",
      type: "string",
      options: {
        list: [
          { title: "4:3", value: "4/3" },
          { title: "16:9", value: "16/9" },
          { title: "21:9", value: "21/9" },
          { title: "1:1", value: "1/1" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "4/3",
    }),
    defineField({
      name: "imageOnly",
      title: "Image only",
      type: "boolean",
      initialValue: false,
      description: "If enabled, only the uploaded image renders (no text, badges, or CTAs).",
    }),
    defineField({
      name: "heroBadges",
      title: "Hero Badges",
      type: "array",
      of: [
        defineField({
          name: "badge",
          title: "Badge",
          type: "object",
          fields: [
            { name: "label", title: "Label", type: "string" },
            {
              name: "tone",
              title: "Tone",
              type: "string",
              options: {
                list: getBadgeToneOptions().map((opt) => ({
                  title: opt.label,
                  value: opt.value,
                  description: opt.description,
                })),
                layout: "radio",
                direction: "horizontal",
              },
            },
          ],
        }),
      ],
      validation: (Rule) => Rule.max(4),
    }),
    defineField({
      name: "heroCtas",
      title: "Hero CTAs",
      type: "array",
      of: [
        defineField({
          name: "cta",
          title: "CTA",
          type: "object",
          fields: [
            {
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule) =>
                Rule.required().custom((value, context) =>
                  validateCtaLabel(value as string | undefined, {
                    isPrimary:
                      ((context?.parent as { style?: string } | undefined)?.style || "primary") ===
                      "primary",
                  })
                ),
            },
            { name: "href", title: "Link", type: "url" },
            {
              name: "style",
              title: "Style",
              type: "string",
              options: {
                list: getCtaStyleOptions().map((opt) => ({
                  title: opt.label,
                  value: opt.value,
                  description: opt.description,
                })),
                layout: "radio",
                direction: "horizontal",
              },
            },
          ],
        }),
      ],
      validation: (Rule) =>
        Rule.max(3).custom((value) => {
          if (!Array.isArray(value)) return true;
          const primaryCount = value.filter(
            (item) => (item as { style?: string } | undefined)?.style === "primary"
          ).length;
          return primaryCount > 1 ? "Only one primary CTA is allowed to keep the red accent disciplined." : true;
        }),
    }),
    defineField({
      name: "textColor",
      title: "Text color override",
      type: "string",
      options: {
        list: [
          { title: "Black", value: "black" },
          { title: "White", value: "white" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
    }),
    defineField({
      name: "badgeColor",
      title: "Badge color override",
      type: "string",
      description: "Hex or CSS color to apply to all badges.",
    }),
    defineField({
      name: "primaryCtaColor",
      title: "Primary CTA color override",
      type: "string",
      description: "Hex or CSS color for the first CTA.",
    }),
    defineField({
      name: "secondaryCtaColor",
      title: "Secondary CTA color override",
      type: "string",
      description: "Hex or CSS color for the second CTA.",
    }),
    defineField({
      name: "linkedProduct",
      title: "Linked Product",
      type: "reference",
      to: [{ type: "product" }],
      description: "Product this banner promotes (optional)",
    }),
    defineField({
      name: "linkedPromotion",
      title: "Linked Promotion",
      type: "reference",
      to: [{ type: "promotion" }],
      description: "Promotion this banner is for (optional)",
    }),
    defineField({
      name: "linkedCategory",
      title: "Linked Category",
      type: "reference",
      to: [{ type: "category" }],
      components: { input: CategoryTreeInput },
      description: "Category this banner links to (optional)",
    }),
    defineField({
      name: "linkUrl",
      title: "Custom Link URL",
      type: "url",
      description: "Custom URL if not linking to product/promotion/category",
    }),
    defineField({
      name: "startDate",
      title: "Start Date",
      type: "datetime",
      description: "When this banner becomes active",
    }),
    defineField({
      name: "endDate",
      title: "End Date",
      type: "datetime",
      description: "When this banner expires",
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "placement",
      title: "Placement",
      type: "string",
      options: {
        list: [
          { title: "Sitewide (fallback)", value: "sitewidepagehero" },
          { title: "Homepage", value: "homepagehero" },
          { title: "Blog", value: "blogpagehero" },
          { title: "Promotions", value: "promotionspagehero" },
          { title: "Deals", value: "dealpagehero" },
          { title: "Catalog", value: "catalogpagehero" },
          { title: "Insight", value: "insightpagehero" },
          { title: "News", value: "newspagehero" },
          { title: "Events", value: "eventspagehero" },
          { title: "Resources / Downloads", value: "resourcespagehero" },
          { title: "Shop", value: "shoppagehero" },
          { title: "Support / Help / Contact", value: "supportpagehero" },
          // Legacy placements accepted for backward compatibility
          { title: "Sitewide (legacy)", value: "sitewide_page_hero" },
          { title: "Homepage (legacy)", value: "homepage_hero" },
          { title: "Promotions (legacy)", value: "promotions_page_hero" },
          { title: "Deals (legacy)", value: "deal_page_hero" },
          { title: "Catalog (legacy)", value: "catalog_page_hero" },
          { title: "Insight (legacy)", value: "insight_page_hero" },
          { title: "News (legacy)", value: "news_page_hero" },
          { title: "Events (legacy)", value: "events_page_hero" },
          { title: "Shop (legacy)", value: "shop_page_hero" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Product Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "imageAlt",
      title: "Image Alt Text",
      type: "string",
      description: "Short description of the hero image",
      validation: (Rule) => Rule.max(140),
    }),
  ],
  preview: {
    select: {
      title: "title",
      discountAmount: "discountAmount",
      couponCode: "couponCode",
    },
    prepare(select) {
      const { title, discountAmount, couponCode } = select;

      return {
        title,
        subtitle: `${discountAmount}% off - Code: ${couponCode}`,
      };
    },
  },
  validation: (Rule) =>
    Rule.custom((value, context) => {
      const document = (context as any)?.document;
      if (!document?.title) return "Title is required.";
      if (!document?.placement) return "Placement is required.";
      if (!document?.image && !document?.description) {
        return "Add a description or an image so the hero has visible content.";
      }
      return true;
    }),
});
