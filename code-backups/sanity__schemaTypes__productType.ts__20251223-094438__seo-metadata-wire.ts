import { TrolleyIcon } from "@sanity/icons";
import { useEffect, useRef, useState } from "react";
import { PatchEvent, defineField, defineType, set, useClient, useFormValue } from "sanity";
import { ColorPickerInput } from "../components/inputs/ColorPickerInput";
import { PriceDisplayInput } from "../components/inputs/PriceDisplayInput";

const DealerPriceInput = (props: any) => {
  const { renderDefault, value, onChange, readOnly } = props;
  const client = useClient({ apiVersion: "2023-10-01" });
  const userPrice = useFormValue(["price"]) as number | undefined;
  const [markupPercent, setMarkupPercent] = useState<number | null>(null);
  const fetchedRef = useRef(false);
  const lastSyncedPriceRef = useRef<number | null>(null);
  // Avoid patching when the document is rendered read-only (presentation/history views).
  const isReadOnly = Boolean(readOnly || props?.schemaType?.readOnly);

  // Fetch markup once to derive dealer price from user price.
  useEffect(() => {
    if (isReadOnly) return;

    let cancelled = false;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchMarkup = async () => {
      try {
        const percent = await client.fetch<number | null>(
          '*[_type == "pricingSettings"][0].userMarkupPercent'
        );
        if (!cancelled) {
          setMarkupPercent(
            typeof percent === "number" && !Number.isNaN(percent) ? percent : 0
          );
        }
      } catch (error) {
        console.error("Failed to fetch pricing markup", error);
        if (!cancelled) setMarkupPercent(0);
      }
    };

    fetchMarkup();
    return () => {
      cancelled = true;
    };
  }, [client, isReadOnly]);

  // Auto-calc dealer price whenever user price changes (markup-aware).
  useEffect(() => {
    if (isReadOnly || markupPercent === null || !onChange) return;

    const currentUserPrice =
      typeof userPrice === "number" && !Number.isNaN(userPrice) ? userPrice : null;
    if (currentUserPrice === null) return;

    const denominator = 1 + markupPercent / 100;
    if (denominator <= 0) return;

    const nextDealer = Number((currentUserPrice / denominator).toFixed(2));
    const currentDealer = typeof value === "number" && !Number.isNaN(value) ? value : null;
    const lastSyncedPrice = lastSyncedPriceRef.current;

    if (
      lastSyncedPrice !== currentUserPrice &&
      (currentDealer === null || Math.abs(currentDealer - nextDealer) > 0.009)
    ) {
      lastSyncedPriceRef.current = currentUserPrice;
      onChange(PatchEvent.from([set(nextDealer)]));
    } else if (lastSyncedPrice !== currentUserPrice) {
      lastSyncedPriceRef.current = currentUserPrice;
    }
  }, [isReadOnly, markupPercent, userPrice, value, onChange]);

  return renderDefault(props);
};

export const productType = defineType({
  name: "product",
  title: "Products",
  type: "document",
  icon: TrolleyIcon,
  fieldsets: [
    { name: "pricing", title: "💰 Pricing", options: { collapsible: true, collapsed: false } },
    { name: "inventory", title: "📦 Inventory & Shipping", options: { collapsible: true, collapsed: false } },
    { name: "media", title: "🖼️ Media", options: { collapsible: true, collapsed: false } },
    { name: "categorization", title: "🏷️ Categorization", options: { collapsible: true, collapsed: false } },
    { name: "seo", title: "🔍 SEO", options: { collapsible: true, collapsed: true } },
    { name: "reviews", title: "⭐ Reviews", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Product Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "images",
      title: "Product Images",
      type: "array",
      fieldset: "media",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "string",
    }),
    defineField({
      name: "price",
      title: "User Price (Public)",
      type: "number",
      description:
        "Public/user-facing price. Dealer price auto-calculates using the markup from Pricing Settings.",
      fieldset: "pricing",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "dealerPrice",
      title: "Dealer/Premium Price",
      type: "number",
      description:
        "Auto-calculated from User Price using markup defined in Pricing Settings (still editable if needed).",
      fieldset: "pricing",
      validation: (Rule) => Rule.min(0),
      components: { input: DealerPriceInput },
    }),
    defineField({
      name: "discount",
      title: "Discount",
      type: "number",
      fieldset: "pricing",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "priceSummary",
      title: "Price Summary",
      type: "object",
      description:
        "Read-only calculator based on user price, dealer price, markup, and discount.",
      fieldset: "pricing",
      readOnly: true,
      components: { input: PriceDisplayInput },
      fields: [],
    }),
    defineField({
      name: "sku",
      title: "SKU",
      type: "string",
      fieldset: "inventory",
      description: "Stock keeping unit shown on the product page.",
    }),
    defineField({
      name: "collection",
      title: "Collection / Release",
      type: "string",
      fieldset: "categorization",
      description: "e.g., 2025 or Spring 2025. Displayed in characteristics.",
    }),
    defineField({
      name: "weight",
      title: "Weight (kg)",
      type: "number",
      fieldset: "inventory",
      description: "Product weight in kilograms.",
    }),
    defineField({
      name: "dimensions",
      title: "Dimensions",
      type: "object",
      fieldset: "inventory",
      fields: [
        { name: "length", title: "Length", type: "number" },
        { name: "width", title: "Width", type: "number" },
        { name: "height", title: "Height", type: "number" },
        {
          name: "unit",
          title: "Unit",
          type: "string",
          options: { list: ["cm", "mm", "m", "in", "ft"] },
          initialValue: "cm",
        },
      ],
      description: "Numeric dimensions with unit (defaults to cm).",
    }),
    defineField({
      name: "shipping",
      title: "Shipping",
      type: "object",
      fieldset: "inventory",
      fields: [
        {
          name: "freeShipping",
          title: "Free Shipping",
          type: "boolean",
          initialValue: true,
        },
        { name: "estimate", title: "Standard Estimate", type: "string" },
        { name: "expressEstimate", title: "Express Estimate", type: "string" },
      ],
      description: "Shipping badges and estimates shown on the product page.",
    }),
    defineField({
      name: "warranty",
      title: "Warranty",
      type: "string",
      fieldset: "inventory",
      description: "e.g., '1 Year Manufacturer Warranty'.",
    }),
    defineField({
      name: "returnPolicy",
      title: "Return Policy",
      type: "string",
      fieldset: "inventory",
      description: "e.g., '30 Days Return Policy'.",
    }),
    defineField({
      name: "qualityBadges",
      title: "Quality Badges",
      type: "array",
      of: [{ type: "string" }],
      description: "Short bullet badges such as 'Quality Tested', 'Authentic Product'.",
    }),
    defineField({
      name: "additionalInfo",
      title: "Additional Information",
      type: "text",
      rows: 4,
      description: "Optional extra notes shown in the product details.",
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      fieldset: "categorization",
      of: [{ type: "reference", to: { type: "category" }, options: { disableNew: true } }],
      validation: (Rule) =>
        Rule.required()
          .min(1)
          .unique()
          .custom(async (value, context) => {
            const refs = (value as Array<{ _ref?: string }> | undefined) || [];
            if (!refs.length) {
              return "Select at least one category (leaf) and its ancestors.";
            }

            if (refs.some((ref) => ref?._ref?.startsWith("drafts."))) {
              return "Remove draft category references";
            }

            const client = context.getClient?.({ apiVersion: "2023-10-01" });
            if (!client) return true;

            const ids = refs
              .map((ref) => ref?._ref?.replace(/^drafts\./, ""))
              .filter((id): id is string => Boolean(id));

            if (!ids.length) return "Select at least one category (leaf) and its ancestors.";

            const categories = await client.fetch<
              Array<{ _id?: string; isParentCategory?: boolean }>
            >('*[_type == "category" && _id in $ids]{_id,isParentCategory}', {
              ids,
            });

            const leafCount = categories.filter((cat) => cat?.isParentCategory === false).length;
            if (leafCount < 1) {
              return "Include at least one leaf/subcategory for breadcrumbs.";
            }

            const primaryCategoryRef = (context.document as { primaryCategory?: { _ref?: string } } | undefined)
              ?.primaryCategory?._ref;
            const primaryId = primaryCategoryRef?.replace(/^drafts\./, "");

            if (primaryId && !ids.includes(primaryId)) {
              return "Primary category must also be included in categories.";
            }

            // Ensure ancestors of primary are included
            if (primaryId) {
              const primaryWithParents = await client.fetch<{
                _id?: string;
                parentCategory?: { _id?: string; title?: string; parentCategory?: { _id?: string; title?: string } };
              }>(
                '*[_type == "category" && _id == $id][0]{_id,parentCategory->{_id,title,parentCategory->{_id,title}}}',
                { id: primaryId }
              );

              const ancestors: Array<{ _id?: string; title?: string }> = [];
              let current = primaryWithParents?.parentCategory;
              while (current?._id) {
                ancestors.push({ _id: current._id, title: current.title });
                current = current.parentCategory;
              }

              const missingAncestor = ancestors.find(
                (ancestor) => ancestor._id && !ids.includes(ancestor._id.replace(/^drafts\./, ""))
              );

              if (missingAncestor) {
                return `Include ancestor category "${missingAncestor.title || missingAncestor._id}" for breadcrumb consistency.`;
              }
            }

            return true;
          }),
    }),
    defineField({
      name: "primaryCategory",
      title: "Primary Category",
      type: "reference",
      fieldset: "categorization",
      to: [{ type: "category" }],
      options: { disableNew: true },
      description:
        "Determines the breadcrumb path. Choose the most specific category and include its ancestors in Categories.",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const primaryRef = (value as { _ref?: string } | undefined)?._ref;
          if (!primaryRef) {
            return "Select a primary category for breadcrumbs.";
          }

          const categories = (context.document as { categories?: Array<{ _ref?: string }> } | undefined)?.categories || [];
          const normalizedPrimary = primaryRef.replace(/^drafts\./, "");

          const hasPrimaryInCategories = categories.some(
            (cat) => cat?._ref && cat._ref.replace(/^drafts\./, "") === normalizedPrimary
          );

          return hasPrimaryInCategories ? true : "Primary category must also be present in Categories.";
        }),
    }),
    defineField({
      name: "relatedProducts",
      title: "Related Products",
      type: "array",
      fieldset: "categorization",
      of: [{ type: "reference", to: [{ type: "product" }] }],
      description: "Products to show in 'You may also like' section",
      validation: (Rule) => Rule.max(8).unique(),
    }),
    defineField({
      name: "upsellProducts",
      title: "Frequently Bought Together",
      type: "array",
      fieldset: "categorization",
      of: [{ type: "reference", to: [{ type: "product" }] }],
      description: "Products commonly purchased with this item",
      validation: (Rule) => Rule.max(4).unique(),
    }),
    defineField({
      name: "stock",
      title: "Stock",
      type: "number",
      fieldset: "inventory",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "brand",
      title: "Brand",
      type: "reference",
      fieldset: "categorization",
      to: { type: "brand" },
    }),

    defineField({
      name: "status",
      title: "Product Status",
      type: "string",
      fieldset: "categorization",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "Hot", value: "hot" },
          { title: "Sale", value: "sale" },
        ],
      },
    }),
    defineField({
      name: "variant",
      title: "Product Type",
      type: "reference",
      fieldset: "categorization",
      to: [{ type: "productTypeOption" }],
      description: "Select from Product Types. Manage the list via Product Type documents.",
      options: { disableNew: false },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "isFeatured",
      title: "Featured Product",
      type: "boolean",
      fieldset: "categorization",
      description: "Toggle to Featured on or off",
      initialValue: false,
    }),
    defineField({
      name: "seoMetadata",
      title: "SEO Settings",
      type: "object",
      fieldset: "seo",
      fields: [
        defineField({
          name: "metaTitle",
          title: "Meta Title",
          type: "string",
          description: "50-60 characters recommended",
          validation: (Rule) => Rule.max(70),
        }),
        defineField({
          name: "metaDescription",
          title: "Meta Description",
          type: "text",
          rows: 3,
          description: "150-160 characters recommended",
          validation: (Rule) => Rule.max(200),
        }),
        defineField({
          name: "keywords",
          title: "Keywords",
          type: "array",
          of: [{ type: "string" }],
          options: { layout: "tags" },
        }),
      ],
    }),
    defineField({
      name: "averageRating",
      title: "Average Rating",
      type: "number",
      fieldset: "reviews",
      readOnly: true,
      description: "Calculated average rating from approved reviews",
      validation: (Rule) => Rule.min(0).max(5),
    }),
    defineField({
      name: "totalReviews",
      title: "Total Reviews",
      type: "number",
      fieldset: "reviews",
      readOnly: true,
      initialValue: 0,
      description: "Total number of approved reviews",
    }),
    defineField({
      name: "ratingDistribution",
      title: "Rating Distribution",
      type: "object",
      fieldset: "reviews",
      readOnly: true,
      description: "Distribution of ratings (1-5 stars)",
      fields: [
        defineField({
          name: "fiveStars",
          title: "5 Stars",
          type: "number",
          initialValue: 0,
        }),
        defineField({
          name: "fourStars",
          title: "4 Stars",
          type: "number",
          initialValue: 0,
        }),
        defineField({
          name: "threeStars",
          title: "3 Stars",
          type: "number",
          initialValue: 0,
        }),
        defineField({
          name: "twoStars",
          title: "2 Stars",
          type: "number",
          initialValue: 0,
        }),
        defineField({
          name: "oneStar",
          title: "1 Star",
          type: "number",
          initialValue: 0,
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "name",
      media: "images",
      subtitle: "price",
    },
    prepare(selection) {
      const { title, subtitle, media } = selection;
      const image = media && media[0];
      return {
        title: title,
        subtitle: `$${subtitle}`,
        media: image,
      };
    },
  },
});
