"use client";

import { TagIcon } from "@sanity/icons";
import { Stack, Text } from "@sanity/ui";
import { useEffect, useRef } from "react";
import { PatchEvent, defineArrayMember, defineField, defineType, set, useClient, useFormValue } from "sanity";
import { CategoryTreeInput } from "../components/inputs/CategoryTreeInput";

const normalizeId = (id?: string | null) => (typeof id === "string" ? id.replace(/^drafts\./, "") : undefined);

const CategoryDepthInput = (props: any) => {
  const { renderDefault, onChange, value } = props;
  const parentCategory = useFormValue(["parentCategory"]) as { _ref?: string } | null;
  const client = useClient({ apiVersion: "2023-10-01" });
  const previousParentId = useRef<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const parentId = normalizeId(parentCategory?._ref);

    if (previousParentId.current === parentId) {
      return;
    }
    previousParentId.current = parentId;

    const syncDepth = async () => {
      let nextDepth = 0;

      if (parentId) {
        const parentDepth = await client.fetch<number | null>("*[_id == $id][0].depth", { id: parentId }).catch(() => null);
        nextDepth =
          typeof parentDepth === "number" && !Number.isNaN(parentDepth) && parentDepth >= 0 ? parentDepth + 1 : 1;
      }

      const currentDepth = typeof value === "number" && !Number.isNaN(value) ? value : undefined;
      if (!cancelled && currentDepth !== nextDepth) {
        onChange(PatchEvent.from([set(nextDepth)]));
      }
    };

    syncDepth().catch((error) => console.error("Failed to sync category depth", error));

    return () => {
      cancelled = true;
    };
  }, [client, onChange, parentCategory?._ref, value]);

  return (
    <Stack space={2}>
      <Text size={1} muted>
        Auto-calculated from parent (root = 0).
      </Text>
      {renderDefault({ ...props, elementProps: { ...(props.elementProps || {}), readOnly: true } })}
    </Stack>
  );
};

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: TagIcon,
  fieldsets: [
    { name: "metadata", title: "Metadata & SEO", options: { collapsible: true, collapsed: false } },
    { name: "advanced", title: "Advanced Settings", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().min(2).error("Title is required"),
    }),
    defineField({
      name: "locale",
      title: "Locale",
      type: "reference",
      to: [{ type: "locale" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
        isUnique: (value, context) =>
          context?.defaultIsUnique?.(value, context) ?? true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first in lists/menus. Leave empty to auto-sort.",
      initialValue: 0,
      fieldset: "advanced",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "isActive",
      title: "Active / Visible",
      type: "boolean",
      description: "Toggle to show/hide category from frontend.",
      initialValue: true,
      fieldset: "advanced",
    }),
    defineField({
      name: "isParentCategory",
      title: "Is Parent Category",
      type: "boolean",
      description: "Enable for top-level categories that should carry the long intro.",
      initialValue: false,
    }),
    defineField({
      name: "parentCategory",
      title: "Parent Category",
      type: "reference",
      to: [{ type: "category" }],
      options: { disableNew: true },
      components: { input: CategoryTreeInput },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = context.document as { isParentCategory?: boolean; _id?: string } | undefined;
          if (doc?.isParentCategory) {
            return value ? "Parent categories should not reference another parent" : true;
          }

          if (!doc?.isParentCategory && !value) {
            return "Select a parent category for subcategories";
          }

          if (value?._ref && doc?._id && value._ref.replace(/^drafts\./, "") === doc._id.replace(/^drafts\./, "")) {
            return "A category cannot reference itself";
          }

          return true;
        }),
      hidden: ({ document }) => (document as { isParentCategory?: boolean } | undefined)?.isParentCategory === true,
    }),
    defineField({
      name: "depth",
      title: "Depth",
      type: "number",
      description: "Auto-calculated from parent; root categories are 0.",
      readOnly: true,
      fieldset: "advanced",
      initialValue: 0,
      components: { input: CategoryDepthInput },
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "description",
      type: "text",
      description:
        "150–250 words for parent categories (Bangkok, Thailand, distributor, Furukawa, BELDEN, CommScope, Schneider).",
      validation: (Rule) => Rule.max(2000),
    }),
    defineField({
      name: "range",
      type: "number",
      description: "Starting from",
    }),
    defineField({
      name: "featured",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "seoMetadata",
      title: "SEO Settings",
      type: "object",
      fieldset: "metadata",
      fields: [
        defineField({
          name: "seoTitle",
          title: "SEO Title",
          type: "string",
          description: "50-60 chars. Leave empty to auto-use category title.",
          validation: (Rule) => Rule.max(70),
        }),
        defineField({
          name: "seoDescription",
          title: "Meta Description",
          type: "text",
          description: "Up to 400 chars. Target keywords + benefit.",
          rows: 3,
          validation: (Rule) => Rule.max(400),
        }),
        defineField({
          name: "metaKeywords",
          title: "Meta Keywords",
          type: "array",
          description: "Comma-separated keywords for meta tags.",
          of: [defineArrayMember({ type: "string" })],
          validation: (Rule) => Rule.max(30),
        }),
        defineField({
          name: "canonicalUrl",
          title: "Canonical URL",
          type: "url",
          description: "For duplicate or multi-regional categories.",
        }),
      ],
    }),
    defineField({
      name: "metadata",
      title: "Category Metadata",
      type: "object",
      fieldset: "metadata",
      fields: [
        defineField({
          name: "icon",
          type: "string",
          title: "Icon Class (e.g., 'icon-electronics')",
        }),
        defineField({
          name: "color",
          type: "string",
          title: "Brand Color (hex)",
          validation: (Rule) => Rule.regex(/^#[0-9A-F]{6}$/i),
        }),
      ],
    }),
    defineField({
      name: "image",
      title: "Category Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
  ],
  preview: {
    select: {
      title: "title",
      isParent: "isParentCategory",
      parentTitle: "parentCategory.title",
      productCount: "productCount",
    },
    prepare(selection) {
      const { title, isParent, parentTitle, productCount } = selection;
      const icon = isParent ? "🏢" : "📂";
      const parent = parentTitle ? ` (Child of ${parentTitle})` : "";
      return {
        title: `${icon} ${title}${parent}`,
        subtitle: productCount ? `${productCount} products` : "No products",
      };
    },
  },
});
