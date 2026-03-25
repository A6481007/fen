import { CogIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const pricingSettingsType = defineType({
  name: "pricingSettings",
  title: "Pricing Settings",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "userMarkupPercent",
      title: "User Price Markup (%)",
      type: "number",
      description:
        "Markup applied to dealer price to derive the public/user price. Example: 30 means user price = dealer price * 1.30.",
      initialValue: 30,
      validation: (Rule) => Rule.required().min(0).max(500),
    }),
    defineField({
      name: "vatPercent",
      title: "VAT (%)",
      type: "number",
      description: "Default VAT percentage to apply on totals if needed.",
      initialValue: 0,
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: "dealerDiscountPercent",
      title: "Dealer Discount (%)",
      type: "number",
      description:
        "Dealer discount percentage applied to eligible orders. Set to 0 to disable.",
      initialValue: 2,
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: "showDealerDiscount",
      title: "Show Dealer Discount in Order Summary",
      type: "boolean",
      description:
        "Toggle visibility of the dealer discount line item on the storefront.",
      initialValue: false,
    }),
    defineField({
      name: "dealerFreeShippingEnabled",
      title: "Dealer Free Shipping Enabled",
      type: "boolean",
      description:
        "Allow dealer accounts to receive free shipping regardless of order total.",
      initialValue: false,
    }),
    defineField({
      name: "premiumFreeShippingEnabled",
      title: "Premium Free Shipping Enabled",
      type: "boolean",
      description:
        "Allow premium accounts to receive free shipping regardless of order total.",
      initialValue: false,
    }),
    defineField({
      name: "showDealerBenefits",
      title: "Show Dealer Benefits",
      type: "boolean",
      description: "Toggle visibility of dealer benefit lists in the dashboard.",
      initialValue: true,
    }),
    defineField({
      name: "dealerBenefitsTitleApply",
      title: "Dealer Benefits Title (Apply)",
      type: "string",
      initialValue: "Dealer Account Benefits",
    }),
    defineField({
      name: "dealerBenefitsTitlePending",
      title: "Dealer Benefits Title (Pending)",
      type: "string",
      initialValue: "Dealer Account Benefits (Upon Approval)",
    }),
    defineField({
      name: "dealerBenefitsTitleActive",
      title: "Dealer Benefits Title (Active)",
      type: "string",
      initialValue: "Active Dealer Benefits",
    }),
    defineField({
      name: "dealerBenefits",
      title: "Dealer Benefits Items",
      type: "array",
      of: [
        {
          type: "object",
          name: "dealerBenefitItem",
          fields: [
            defineField({
              name: "text",
              title: "Text",
              type: "string",
            }),
            defineField({
              name: "enabled",
              title: "Enabled",
              type: "boolean",
              initialValue: true,
            }),
          ],
          preview: {
            select: { title: "text", enabled: "enabled" },
            prepare({ title, enabled }) {
              return {
                title: title || "Benefit",
                subtitle: enabled === false ? "Hidden" : "Visible",
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: "showPremiumBenefits",
      title: "Show Premium Benefits",
      type: "boolean",
      description: "Toggle visibility of premium benefit lists in the dashboard.",
      initialValue: true,
    }),
    defineField({
      name: "premiumBenefitsTitleActive",
      title: "Premium Benefits Title (Active)",
      type: "string",
      initialValue: "Premium Benefits",
    }),
    defineField({
      name: "premiumBenefits",
      title: "Premium Benefits Items",
      type: "array",
      of: [
        {
          type: "object",
          name: "premiumBenefitItem",
          fields: [
            defineField({
              name: "text",
              title: "Text",
              type: "string",
            }),
            defineField({
              name: "enabled",
              title: "Enabled",
              type: "boolean",
              initialValue: true,
            }),
          ],
          preview: {
            select: { title: "text", enabled: "enabled" },
            prepare({ title, enabled }) {
              return {
                title: title || "Benefit",
                subtitle: enabled === false ? "Hidden" : "Visible",
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
      rows: 3,
      description:
        "Optional notes for finance/ops on how pricing is calculated across the storefront.",
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Pricing Settings (markup & VAT)",
        subtitle: "Singleton",
      };
    },
  },
});
