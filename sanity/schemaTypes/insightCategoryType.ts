import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

const normalizeId = (id?: string | null) => (typeof id === "string" ? id.replace(/^drafts\./, "") : undefined);

const resolveLocaleRef = (doc: { locale?: { _ref?: string } | string } | null | undefined) =>
  typeof doc?.locale === "string" ? doc?.locale : doc?.locale?._ref;

const isUniquePerLocale = async (
  value: { current?: string } | undefined,
  context: {
    document?: { _id?: string; _type?: string; locale?: { _ref?: string } | string } | null;
    getClient: (options: { apiVersion: string }) => {
      fetch: (query: string, params: Record<string, unknown>) => Promise<boolean>;
    };
    defaultIsUnique?: (value: { current?: string } | undefined, context: any) => boolean | Promise<boolean>;
  }
) => {
  const slug = value?.current;
  if (!slug) return true;

  const localeRef = resolveLocaleRef(context.document ?? null);
  if (!localeRef) {
    return context.defaultIsUnique?.(value, context) ?? true;
  }

  const id = normalizeId(context.document?._id) ?? "";
  const client = context.getClient({ apiVersion: "2023-10-01" });
  const query =
    '!defined(*[_type == $type && slug.current == $slug && locale._ref == $locale && !(_id in [$draftId, $publishedId])][0]._id)';

  return client.fetch(query, {
    type: context.document?._type || "insightCategory",
    slug,
    locale: localeRef,
    draftId: `drafts.${id}`,
    publishedId: id,
  });
};

export const insightCategoryType = defineType({
  name: "insightCategory",
  title: "Insight Category",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Category name",
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
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        isUnique: isUniquePerLocale,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      description: "Category description for SEO",
    }),
    defineField({
      name: "categoryType",
      title: "Category Type",
      type: "string",
      options: {
        list: [
          { title: "Knowledge", value: "knowledge" },
          { title: "Solution", value: "solution" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "parentCategory",
      title: "Parent Category",
      type: "reference",
      to: [{ type: "insightCategory" }],
      options: { disableNew: true },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parentId = normalizeId(value?._ref);
          const docId = normalizeId((context.document as { _id?: string } | undefined)?._id);

          if (docId && parentId && docId === parentId) {
            return "A category cannot reference itself";
          }

          return true;
        }),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      description: "Icon identifier",
    }),
    defineField({
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "For custom ordering",
      initialValue: 0,
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "seoMetadata",
      title: "SEO Metadata",
      type: "reference",
      to: [{ type: "seoMetadata" }],
    }),
  ],
  preview: {
    select: {
      title: "title",
      categoryType: "categoryType",
    },
    prepare({ title, categoryType }) {
      const displayTitle = title || "Untitled Insight Category";
      const typeLabel =
        typeof categoryType === "string" && categoryType.length > 0
          ? categoryType.charAt(0).toUpperCase() + categoryType.slice(1)
          : null;

      return {
        title: typeLabel ? `[${typeLabel}] ${displayTitle}` : displayTitle,
        subtitle: typeLabel ? undefined : "Set category type",
      };
    },
  },
});
