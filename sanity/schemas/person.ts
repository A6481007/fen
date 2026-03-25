import { UserIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

const normalizeId = (id?: string | null) =>
  typeof id === "string" ? id.replace(/^drafts\./, "") : "";

const resolveLocaleRef = (doc: { locale?: { _ref?: string } | string } | null | undefined) =>
  typeof doc?.locale === "string" ? doc?.locale : doc?.locale?._ref;

const isUniquePerLocale = async (
  value: { current?: string } | undefined,
  context: {
    document?: { _id?: string; _type?: string; locale?: { _ref?: string } | string } | null;
    getClient: (options: { apiVersion: string }) => { fetch: (query: string, params: Record<string, unknown>) => Promise<boolean> };
    defaultIsUnique?: (value: { current?: string } | undefined, context: any) => boolean | Promise<boolean>;
  }
) => {
  const slug = value?.current;
  if (!slug) return true;

  const localeRef = resolveLocaleRef(context.document ?? null);
  if (!localeRef) {
    return context.defaultIsUnique?.(value, context) ?? true;
  }

  const id = normalizeId(context.document?._id);
  const client = context.getClient({ apiVersion: "2023-10-01" });
  const query =
    '!defined(*[_type == $type && slug.current == $slug && locale._ref == $locale && !(_id in [$draftId, $publishedId])][0]._id)';

  return client.fetch(query, {
    type: context.document?._type || "person",
    slug,
    locale: localeRef,
    draftId: `drafts.${id}`,
    publishedId: id,
  });
};

export const personType = defineType({
  name: "person",
  title: "Person",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required().min(2),
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
        source: "name",
        isUnique: isUniquePerLocale,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Role / Title",
      type: "string",
    }),
    defineField({
      name: "image",
      title: "Profile Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: "bio",
      title: "Excerpt",
      type: "text",
      rows: 4,
      description: "Short summary shown on cards and previews.",
      validation: (Rule) => Rule.required().min(60),
    }),
    defineField({
      name: "expertise",
      title: "Areas of Expertise",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "credentials",
      title: "Credentials",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "object",
      fields: [
        defineField({ name: "linkedin", title: "LinkedIn", type: "url" }),
        defineField({ name: "twitter", title: "Twitter / X", type: "url" }),
        defineField({ name: "website", title: "Website", type: "url" }),
      ],
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "title",
      media: "image",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || "Untitled Person",
        subtitle: subtitle || "Role missing",
        media,
      };
    },
  },
});
